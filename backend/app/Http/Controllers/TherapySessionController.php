<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TherapySessionController extends Controller
{
    public function index(Request $request, Student $student, TreatmentPlan $treatmentPlan): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);

        return response()->json(
            $treatmentPlan->sessions()->orderBy('session_date')->get()
        );
    }

    public function store(Request $request, Student $student, TreatmentPlan $treatmentPlan): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);

        $validated = $request->validate([
            'session_date' => ['required', 'date'],
            'objective' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['draft', 'finalizada'])],
        ]);

        $session = TherapySession::create([
            'treatment_plan_id' => $treatmentPlan->id,
            'session_date' => $validated['session_date'],
            'objective' => $validated['objective'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'draft',
        ]);

        return response()->json($session, 201);
    }

    public function update(Request $request, Student $student, TreatmentPlan $treatmentPlan, TherapySession $session): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);
        $this->ensureSessionBelongsToPlan($treatmentPlan, $session);

        $validated = $request->validate([
            'session_date' => ['required', 'date'],
            'objective' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['draft', 'finalizada'])],
        ]);

        $session->update($validated);

        return response()->json($session);
    }

    public function destroy(Request $request, Student $student, TreatmentPlan $treatmentPlan, TherapySession $session): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);
        $this->ensureSessionBelongsToPlan($treatmentPlan, $session);
        $session->delete();

        return response()->json(status: 204);
    }

    private function authorizeStudent(Request $request, Student $student): void
    {
        if ($request->user()->role !== 'profesional') {
            return;
        }

        $isAssigned = $student->professionals()->where('users.id', $request->user()->id)->exists();
        abort_unless($isAssigned, 403, 'No autorizado para este estudiante.');
    }

    private function ensurePlanBelongsToStudent(Student $student, TreatmentPlan $treatmentPlan): void
    {
        abort_unless($treatmentPlan->student_id === $student->id, 404, 'Plan no encontrado para el estudiante.');
    }

    private function ensureSessionBelongsToPlan(TreatmentPlan $treatmentPlan, TherapySession $session): void
    {
        abort_unless($session->treatment_plan_id === $treatmentPlan->id, 404, 'Sesion no encontrada para el plan.');
    }
}
