<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use App\Models\User;
use App\Support\ExactAge;
use App\Support\PlanReportCharts;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    public function sessionPdf(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session
    ): Response {
        $payload = $this->sessionReportPayload($request, $student, $treatmentPlan, $session);
        abort_unless($payload['session']->status === 'finalizada', 422, 'Solo sesiones finalizadas pueden exportarse en PDF.');

        $pdf = Pdf::loadView('reports.session', $payload);

        return response(
            $pdf->output(),
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="sesion-'.$payload['session']->id.'.pdf"',
            ]
        );
    }

    public function sendSessionReportEmail(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session
    ): JsonResponse {
        $payload = $this->sessionReportPayload($request, $student, $treatmentPlan, $session);
        abort_unless($payload['session']->status === 'finalizada', 422, 'Solo sesiones finalizadas pueden enviarse por correo.');

        $pdf = Pdf::loadView('reports.session', $payload);

        $recipient = $student->guardian_email;
        $fileName = 'sesion-'.$payload['session']->id.'.pdf';

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

        $student->loadMissing('course');
        $plan = $treatmentPlan->load([
            'sessions' => fn ($query) => $query->with('tasks')->orderBy('session_date')->orderBy('id'),
        ]);

        $today = Carbon::now('America/Santiago')->toDateString();
        $age = $this->reportAge($student, $today);
        $charts = PlanReportCharts::build($plan->sessions);

        $pdf = Pdf::loadView('reports.plan-consolidated', [
            'student' => $student,
            'plan' => $plan,
            'exactAge' => $age['exactAge'],
            'ageReference' => $age['ageReference'],
            'charts' => $charts,
            'professional' => $this->reportProfessional($request),
        ])->setPaper('a4', 'portrait')->setOption('isRemoteEnabled', true);

        $fileName = $this->consolidatedPdfFilename($student, $plan);

        return response(
            $pdf->output(),
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
            ]
        );
    }

    /**
     * @return array{student: Student, plan: TreatmentPlan, session: TherapySession, exactAge: string, ageReference: string|null, professional: User}
     */
    private function sessionReportPayload(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session
    ): array {
        $sessionData = $this->loadAuthorizedSession($request, $student, $treatmentPlan, $session);
        $student->loadMissing('course');
        $age = $this->reportAge($student, $sessionData->session_date);

        return [
            'student' => $student,
            'plan' => $treatmentPlan,
            'session' => $sessionData,
            'exactAge' => $age['exactAge'],
            'ageReference' => $age['ageReference'],
            'professional' => $this->reportProfessional($request),
        ];
    }

    private function reportProfessional(Request $request): User
    {
        return $request->user()->loadMissing('profession');
    }

    /**
     * @return array{exactAge: string, ageReference: string|null}
     */
    private function reportAge(Student $student, mixed $referenceDate): array
    {
        $age = ExactAge::format($student->birth_date, $referenceDate);

        return [
            'exactAge' => $age ?? 'Sin fecha de nacimiento',
            'ageReference' => $age ? $this->formatReportDate($referenceDate) : null,
        ];
    }

    private function formatReportDate(mixed $date): string
    {
        try {
            return Carbon::parse($date, 'America/Santiago')->startOfDay()->format('d-m-Y');
        } catch (\Throwable) {
            return (string) $date;
        }
    }

    private function consolidatedPdfFilename(Student $student, TreatmentPlan $plan): string
    {
        $slug = Str::slug((string) $student->full_name);
        if ($slug === '') {
            $slug = 'estudiante';
        }

        return $slug.'-consolidado-'.$plan->year.'.pdf';
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
