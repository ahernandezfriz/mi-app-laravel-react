<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\TreatmentPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TreatmentPlanController extends Controller
{
    public function index(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);

        return response()->json(
            $student->treatmentPlans()
                ->with('creator:id,name')
                ->orderByDesc('year')
                ->get()
        );
    }

    public function store(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);

        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100', Rule::unique('treatment_plans', 'year')->where(
                fn ($query) => $query->where('student_id', $student->id)
            )],
        ]);

        $plan = TreatmentPlan::create([
            'student_id' => $student->id,
            'created_by_user_id' => $request->user()->id,
            'year' => $validated['year'],
            'diagnosis_snapshot' => $student->current_diagnosis,
        ]);

        return response()->json($plan->load('creator:id,name'), 201);
    }

    public function update(Request $request, Student $student, TreatmentPlan $treatmentPlan): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);

        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100', Rule::unique('treatment_plans', 'year')
                ->where(fn ($query) => $query->where('student_id', $student->id))
                ->ignore($treatmentPlan->id)],
        ]);

        $treatmentPlan->update([
            'year' => $validated['year'],
        ]);

        return response()->json($treatmentPlan->load('creator:id,name'));
    }

    public function destroy(Request $request, Student $student, TreatmentPlan $treatmentPlan): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);
        $treatmentPlan->delete();

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
}
