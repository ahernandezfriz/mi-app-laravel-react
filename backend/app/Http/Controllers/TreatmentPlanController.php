<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\TreatmentPlan;
use App\Support\SchoolCourseProgression;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TreatmentPlanController extends Controller
{
    private const COURSE_COLUMNS = 'course:id,school_level_id,grade,section,display_name';

    public function index(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);

        return response()->json(
            $student->treatmentPlans()
                ->with(['creator:id,name', self::COURSE_COLUMNS])
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
            'repeats_course' => ['sometimes', 'boolean'],
        ]);

        $previousPlan = $student->treatmentPlans()
            ->with('course.level')
            ->where('year', '<', $validated['year'])
            ->orderByDesc('year')
            ->first();

        if ($previousPlan) {
            $request->validate([
                'repeats_course' => ['required', 'boolean'],
            ]);
        }

        $student->loadMissing('course.level');
        $referenceCourse = $previousPlan?->course ?? $student->course;
        if (! $referenceCourse) {
            throw ValidationException::withMessages([
                'repeats_course' => 'El estudiante no tiene un curso asignado.',
            ]);
        }

        $repeatsCourse = $previousPlan ? $request->boolean('repeats_course') : true;
        $planCourse = $repeatsCourse
            ? $referenceCourse
            : SchoolCourseProgression::next($referenceCourse);

        if (! $planCourse) {
            throw ValidationException::withMessages([
                'repeats_course' => 'No hay un curso siguiente en el catálogo. Indica que el estudiante se mantiene en el mismo curso.',
            ]);
        }

        $plan = TreatmentPlan::create([
            'student_id' => $student->id,
            'created_by_user_id' => $request->user()->id,
            'year' => $validated['year'],
            'diagnosis_snapshot' => $student->current_diagnosis,
            'school_course_id' => $planCourse->id,
        ]);

        $hasNewerPlan = $student->treatmentPlans()
            ->where('id', '!=', $plan->id)
            ->where('year', '>', $plan->year)
            ->exists();

        if (! $hasNewerPlan) {
            $student->update([
                'school_course_id' => $planCourse->id,
                'school_level_id' => $planCourse->school_level_id,
            ]);
        }

        return response()->json($plan->load(['creator:id,name', self::COURSE_COLUMNS]), 201);
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

        return response()->json($treatmentPlan->load(['creator:id,name', self::COURSE_COLUMNS]));
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
