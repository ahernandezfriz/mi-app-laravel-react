<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use App\Support\SchoolCourseProgression;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class TreatmentPlanController extends Controller
{
    private const COURSE_COLUMNS = 'course:id,school_level_id,grade,section,display_name';

    public function index(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);

        try {
            return response()->json($this->serializePlans($student));
        } catch (Throwable $exception) {
            report($exception);

            return response()->json($this->serializePlansFallback($student));
        }
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

        $previousPlanQuery = $student->treatmentPlans()
            ->where('year', '<', $validated['year'])
            ->orderByDesc('year');
        if ($this->hasPlanCourseColumn()) {
            $previousPlanQuery->with('course.level');
        }
        $previousPlan = $previousPlanQuery->first();
        $this->safeLoadStudentCourse($student);

        if ($previousPlan) {
            $request->validate([
                'repeats_course' => ['required', 'boolean'],
            ]);
        }

        $student->loadMissing('course.level');
        $previousPlanCourse = ($previousPlan && $this->hasPlanCourseColumn()) ? $previousPlan->course : null;
        $referenceCourse = $previousPlanCourse ?? $student->course;
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

        $planAttributes = [
            'student_id' => $student->id,
            'created_by_user_id' => $request->user()->id,
            'year' => $validated['year'],
            'diagnosis_snapshot' => $student->current_diagnosis,
        ];
        if ($this->hasPlanCourseColumn()) {
            $planAttributes['school_course_id'] = $planCourse->id;
        }
        $plan = TreatmentPlan::create($planAttributes);

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

        return response()->json($this->presentPlan($plan, $student), 201);
    }

    public function update(Request $request, Student $student, TreatmentPlan $treatmentPlan): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);

        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100', Rule::unique('treatment_plans', 'year')
                ->where(fn ($query) => $query->where('student_id', $student->id))
                ->ignore($treatmentPlan->id)],
            'diagnosis_snapshot' => ['sometimes', 'nullable', 'string'],
            'repeats_course' => ['sometimes', 'boolean'],
        ]);

        $updates = [
            'year' => $validated['year'],
        ];

        if (array_key_exists('diagnosis_snapshot', $validated)) {
            $updates['diagnosis_snapshot'] = trim((string) ($validated['diagnosis_snapshot'] ?? '')) ?: $treatmentPlan->diagnosis_snapshot;
        }

        $planCourse = null;
        if ($this->hasPlanCourseColumn() && $request->exists('repeats_course')) {
            $planCourse = $this->resolvePlanCourse(
                $student,
                (int) $validated['year'],
                $request->boolean('repeats_course'),
                $treatmentPlan->id
            );
            if ($planCourse) {
                $updates['school_course_id'] = $planCourse->id;
            }
        }

        $treatmentPlan->update($updates);
        $treatmentPlan->refresh();

        $hasNewerPlan = $student->treatmentPlans()
            ->where('id', '!=', $treatmentPlan->id)
            ->where('year', '>', $treatmentPlan->year)
            ->exists();

        if (! $hasNewerPlan && $planCourse) {
            $student->update([
                'school_course_id' => $planCourse->id,
                'school_level_id' => $planCourse->school_level_id,
            ]);
        }

        return response()->json($this->presentPlan($treatmentPlan, $student));
    }

    public function destroy(Request $request, Student $student, TreatmentPlan $treatmentPlan): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);
        $treatmentPlan->delete();

        return response()->json(status: 204);
    }

    private function serializePlans(Student $student)
    {
        $this->safeLoadStudentCourse($student);

        $query = $student->treatmentPlans()
            ->with(['creator:id,name'])
            ->orderByDesc('year');

        if ($this->hasPlanCourseColumn()) {
            $query->with(self::COURSE_COLUMNS);
        }

        $plans = $query->get();

        return $this->attachSessionCounts($plans, $student);
    }

    private function serializePlansFallback(Student $student)
    {
        $this->safeLoadStudentCourse($student);

        $plans = $student->treatmentPlans()
            ->with(['creator:id,name'])
            ->orderByDesc('year')
            ->get()
            ->map(function (TreatmentPlan $plan) use ($student) {
                try {
                    if ($student->course !== null) {
                        $plan->setRelation('course', $student->course);
                    }
                } catch (Throwable) {
                    // Listar el plan aunque el curso no se pueda resolver.
                }

                return $plan;
            });

        return $this->attachSessionCounts($plans, $student);
    }

    private function attachSessionCounts($plans, Student $student)
    {
        $planIds = $plans->pluck('id');
        $sessionCounts = $this->sessionCountsForPlans($planIds);
        $progressByPlan = $this->progressForPlans($planIds);

        return $plans
            ->map(function (TreatmentPlan $plan) use ($student, $sessionCounts, $progressByPlan) {
                try {
                    $payload = $this->presentPlan($plan, $student)->toArray();
                } catch (Throwable) {
                    $payload = $plan->toArray();
                }
                $payload['sessions_count'] = $this->countForPlan($sessionCounts, $plan->id);
                $progress = $this->progressForPlan($progressByPlan, $plan->id);
                $payload['progress_percent'] = $progress['progress_percent'];
                $payload['rated_tasks_count'] = $progress['rated_tasks_count'];

                return $payload;
            })
            ->values();
    }

    private function resolvePlanCourse(Student $student, int $year, bool $repeatsCourse, ?int $exceptPlanId = null)
    {
        $previousQuery = $student->treatmentPlans()
            ->where('year', '<', $year)
            ->orderByDesc('year');

        if ($exceptPlanId) {
            $previousQuery->where('id', '!=', $exceptPlanId);
        }

        if ($this->hasPlanCourseColumn()) {
            $previousQuery->with('course.level');
        }

        $previousPlan = $previousQuery->first();
        $this->safeLoadStudentCourse($student);
        $student->loadMissing('course.level');

        $previousPlanCourse = ($previousPlan && $this->hasPlanCourseColumn()) ? $previousPlan->course : null;
        $referenceCourse = $previousPlanCourse ?? $student->course;
        if (! $referenceCourse) {
            return null;
        }

        if ($previousPlan && ! $repeatsCourse) {
            return SchoolCourseProgression::next($referenceCourse) ?: $referenceCourse;
        }

        return $referenceCourse;
    }

    private function presentPlan(TreatmentPlan $plan, Student $student): TreatmentPlan
    {
        $this->safeLoadStudentCourse($student);
        $plan->loadMissing(['creator:id,name']);

        if ($this->hasPlanCourseColumn()) {
            $plan->loadMissing([self::COURSE_COLUMNS]);
        }

        $planCourse = $plan->relationLoaded('course') ? $plan->getRelation('course') : null;
        if ($planCourse === null && $student->course !== null) {
            $plan->setRelation('course', $student->course);
        }

        return $plan;
    }

    private function sessionCountsForPlans($planIds): array
    {
        $ids = collect($planIds)->filter()->values();
        if ($ids->isEmpty()) {
            return [];
        }

        try {
            return TherapySession::query()
                ->whereIn('treatment_plan_id', $ids)
                ->selectRaw('treatment_plan_id, COUNT(*) as aggregate')
                ->groupBy('treatment_plan_id')
                ->pluck('aggregate', 'treatment_plan_id')
                ->map(fn ($count) => (int) $count)
                ->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function countForPlan(array $sessionCounts, mixed $planId): int
    {
        foreach ([$planId, (int) $planId, (string) $planId] as $key) {
            if (array_key_exists($key, $sessionCounts)) {
                return (int) $sessionCounts[$key];
            }
        }

        return 0;
    }

    /**
     * @return array<int|string, array{progress_percent: int|null, rated_tasks_count: int}>
     */
    private function progressForPlans($planIds): array
    {
        $ids = collect($planIds)->filter()->values();
        if ($ids->isEmpty()) {
            return [];
        }

        try {
            $rows = TherapySession::query()
                ->join('session_tasks', 'session_tasks.therapy_session_id', '=', 'therapy_sessions.id')
                ->whereIn('therapy_sessions.treatment_plan_id', $ids)
                ->where('therapy_sessions.status', 'finalizada')
                ->whereIn('session_tasks.rating', ['con_dificultad', 'por_lograr', 'logrado'])
                ->select('therapy_sessions.treatment_plan_id as plan_id')
                ->selectRaw("SUM(CASE session_tasks.rating WHEN 'con_dificultad' THEN 1 WHEN 'por_lograr' THEN 2 WHEN 'logrado' THEN 3 ELSE 0 END) as score_sum")
                ->selectRaw('COUNT(*) as rated_count')
                ->groupBy('therapy_sessions.treatment_plan_id')
                ->get();
        } catch (Throwable) {
            return [];
        }

        $result = [];
        foreach ($rows as $row) {
            $count = (int) $row->rated_count;
            $percent = null;
            if ($count > 0) {
                $average = ((float) $row->score_sum) / $count;
                $percent = (int) round((($average - 1) / 2) * 100);
            }
            $result[(int) $row->plan_id] = [
                'progress_percent' => $percent,
                'rated_tasks_count' => $count,
            ];
        }

        return $result;
    }

    /**
     * @param  array<int|string, array{progress_percent: int|null, rated_tasks_count: int}>  $progressByPlan
     * @return array{progress_percent: int|null, rated_tasks_count: int}
     */
    private function progressForPlan(array $progressByPlan, mixed $planId): array
    {
        foreach ([$planId, (int) $planId, (string) $planId] as $key) {
            if (array_key_exists($key, $progressByPlan)) {
                return [
                    'progress_percent' => $progressByPlan[$key]['progress_percent'],
                    'rated_tasks_count' => (int) $progressByPlan[$key]['rated_tasks_count'],
                ];
            }
        }

        return [
            'progress_percent' => null,
            'rated_tasks_count' => 0,
        ];
    }

    private function safeLoadStudentCourse(Student $student): void
    {
        try {
            $student->loadMissing(self::COURSE_COLUMNS);
        } catch (Throwable) {
            // El curso del estudiante es opcional para listar planes.
        }
    }

    private function hasPlanCourseColumn(): bool
    {
        static $cached = null;

        if ($cached !== null) {
            return $cached;
        }

        try {
            $cached = Schema::hasColumn('treatment_plans', 'school_course_id');
        } catch (Throwable) {
            $cached = false;
        }

        return $cached;
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
