<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Mail;

class ReportController extends Controller
{
    public function sessionPdf(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session
    ): Response {
        $sessionData = $this->loadAuthorizedSession($request, $student, $treatmentPlan, $session);
        abort_unless($sessionData->status === 'finalizada', 422, 'Solo sesiones finalizadas pueden exportarse en PDF.');

        $pdf = Pdf::loadView('reports.session', [
            'student' => $student,
            'plan' => $treatmentPlan,
            'session' => $sessionData,
        ]);

        return response(
            $pdf->output(),
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="sesion-'.$sessionData->id.'.pdf"',
            ]
        );
    }

    public function sendSessionReportEmail(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session
    ): JsonResponse {
        $sessionData = $this->loadAuthorizedSession($request, $student, $treatmentPlan, $session);
        abort_unless($sessionData->status === 'finalizada', 422, 'Solo sesiones finalizadas pueden enviarse por correo.');

        $pdf = Pdf::loadView('reports.session', [
            'student' => $student,
            'plan' => $treatmentPlan,
            'session' => $sessionData,
        ]);

        $recipient = $student->guardian_email;
        $fileName = 'sesion-'.$sessionData->id.'.pdf';

        Mail::raw(
            'Adjuntamos informe de sesion de '.$student->full_name.' (plan '.$treatmentPlan->year.').',
            function ($message) use ($recipient, $pdf, $fileName): void {
                $message->to($recipient)
                    ->subject('Informe de sesion terapeutica')
                    ->attachData($pdf->output(), $fileName, ['mime' => 'application/pdf']);
            }
        );

        return response()->json([
            'message' => 'Informe enviado correctamente al apoderado.',
            'recipient' => $recipient,
        ]);
    }

    public function consolidatedPlanPdf(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan
    ): Response {
        $this->authorizeStudent($request, $student);
        abort_unless($treatmentPlan->student_id === $student->id, 404, 'Plan no encontrado para el estudiante.');

        $plan = $treatmentPlan->load([
            'sessions' => fn ($query) => $query->with('tasks')->orderBy('session_date'),
        ]);

        $pdf = Pdf::loadView('reports.plan-consolidated', [
            'student' => $student,
            'plan' => $plan,
        ]);

        return response(
            $pdf->output(),
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="plan-'.$plan->id.'-consolidado.pdf"',
            ]
        );
    }

    private function loadAuthorizedSession(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session
    ): TherapySession {
        $this->authorizeStudent($request, $student);
        abort_unless($treatmentPlan->student_id === $student->id, 404, 'Plan no encontrado para el estudiante.');
        abort_unless($session->treatment_plan_id === $treatmentPlan->id, 404, 'Sesion no encontrada para el plan.');

        return $session->load('tasks');
    }

    private function authorizeStudent(Request $request, Student $student): void
    {
        if ($request->user()->role !== 'profesional') {
            return;
        }

        $isAssigned = $student->professionals()->where('users.id', $request->user()->id)->exists();
        abort_unless($isAssigned, 403, 'No autorizado para este estudiante.');
    }
}
