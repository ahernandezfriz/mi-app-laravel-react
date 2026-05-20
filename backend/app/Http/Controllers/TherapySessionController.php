<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TherapySessionController extends Controller
{
    public function today(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['sometimes', 'date'],
        ]);

        $targetDate = $validated['date'] ?? now()->toDateString();

        $sessions = $this->scheduledSessionsForDate($request, $targetDate);

        return response()->json($sessions->values());
    }

    public function calendarCounts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ]);

        $year = (int) $validated['year'];
        $month = (int) $validated['month'];
        $start = sprintf('%04d-%02d-01', $year, $month);
        $end = date('Y-m-t', strtotime($start));

        $rows = $this->scopedSessionsQuery($request)
            ->whereBetween('session_date', [$start, $end])
            ->selectRaw('session_date, COUNT(*) as total')
            ->groupBy('session_date')
            ->orderBy('session_date')
            ->get();

        $counts = [];
        foreach ($rows as $row) {
            $dateKey = $row->session_date instanceof \DateTimeInterface
                ? $row->session_date->format('Y-m-d')
                : (string) $row->session_date;
            $counts[$dateKey] = (int) $row->total;
        }

        return response()->json($counts);
    }

    private function scheduledSessionsForDate(Request $request, string $date)
    {
        return $this->scopedSessionsQuery($request)
            ->with([
                'treatmentPlan:id,student_id,year,diagnosis_snapshot',
                'treatmentPlan.student:id,full_name,rut,current_diagnosis,school_course_id,guardian_name,guardian_phone,guardian_email',
                'treatmentPlan.student.course:id,display_name',
            ])
            ->whereDate('session_date', $date)
            ->orderBy('session_time')
            ->orderBy('id')
            ->get()
            ->map(fn (TherapySession $session): array => $this->mapScheduledSessionItem($session));
    }

    private function scopedSessionsQuery(Request $request): Builder
    {
        $query = TherapySession::query();

        if ($request->user()->role === 'profesional') {
            $query->whereHas('treatmentPlan.student.professionals', function (Builder $builder) use ($request): void {
                $builder->where('users.id', $request->user()->id);
            });
        }

        return $query;
    }

    private function mapScheduledSessionItem(TherapySession $session): array
    {
        return [
            'session' => [
                'id' => $session->id,
                'session_date' => $session->session_date,
                'session_time' => $session->session_time,
                'objective' => $session->objective,
                'status' => $session->status,
                'general_observation' => $session->general_observation,
            ],
            'plan' => [
                'id' => $session->treatmentPlan->id,
                'year' => $session->treatmentPlan->year,
                'diagnosis_snapshot' => $session->treatmentPlan->diagnosis_snapshot,
            ],
            'student' => [
                'id' => $session->treatmentPlan->student->id,
                'full_name' => $session->treatmentPlan->student->full_name,
                'rut' => $session->treatmentPlan->student->rut,
                'current_diagnosis' => $session->treatmentPlan->student->current_diagnosis,
                'guardian_name' => $session->treatmentPlan->student->guardian_name,
                'guardian_phone' => $session->treatmentPlan->student->guardian_phone,
                'guardian_email' => $session->treatmentPlan->student->guardian_email,
                'course' => $session->treatmentPlan->student->course
                    ? ['display_name' => $session->treatmentPlan->student->course->display_name]
                    : null,
            ],
        ];
    }

    public function index(Request $request, Student $student, TreatmentPlan $treatmentPlan): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);

        return response()->json(
            $treatmentPlan->sessions()->orderByDesc('session_date')->get()
        );
    }

    public function store(Request $request, Student $student, TreatmentPlan $treatmentPlan): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);

        $validated = $request->validate([
            'session_date' => ['required', 'date'],
            'session_time' => ['required', 'date_format:H:i'],
            'objective' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'general_observation' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['pendiente', 'finalizada', 'suspendida', 'draft'])],
        ]);

        $this->ensureNoScheduleConflict(
            request: $request,
            sessionDate: $validated['session_date'],
            sessionTime: $validated['session_time']
        );

        $session = TherapySession::create([
            'treatment_plan_id' => $treatmentPlan->id,
            'session_date' => $validated['session_date'],
            'session_time' => $validated['session_time'],
            'objective' => $validated['objective'],
            'description' => $validated['description'] ?? null,
            'general_observation' => $validated['general_observation'] ?? null,
            'status' => ($validated['status'] ?? 'pendiente') === 'draft' ? 'pendiente' : ($validated['status'] ?? 'pendiente'),
        ]);

        return response()->json($session, 201);
    }

    public function update(Request $request, Student $student, TreatmentPlan $treatmentPlan, TherapySession $session): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $this->ensurePlanBelongsToStudent($student, $treatmentPlan);
        $this->ensureSessionBelongsToPlan($treatmentPlan, $session);

        if ($request->filled('session_time')) {
            $request->merge([
                'session_time' => substr((string) $request->input('session_time'), 0, 5),
            ]);
        }

        $validated = $request->validate([
            'session_date' => ['required', 'date'],
            'session_time' => ['required', 'date_format:H:i'],
            'objective' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'general_observation' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['pendiente', 'finalizada', 'suspendida', 'draft'])],
        ]);

        $this->ensureNoScheduleConflict(
            request: $request,
            sessionDate: $validated['session_date'],
            sessionTime: $validated['session_time'],
            ignoreSessionId: $session->id
        );

        if (($validated['status'] ?? null) === 'draft') {
            $validated['status'] = 'pendiente';
        }

        $session->update($validated);

        return response()->json($session->fresh());
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

    private function ensureNoScheduleConflict(
        Request $request,
        string $sessionDate,
        string $sessionTime,
        ?int $ignoreSessionId = null
    ): void {
        if ($request->user()->role !== 'profesional') {
            return;
        }

        $query = TherapySession::query()
            ->whereDate('session_date', $sessionDate)
            ->where('session_time', $sessionTime)
            ->whereHas('treatmentPlan.student.professionals', function (Builder $builder) use ($request): void {
                $builder->where('users.id', $request->user()->id);
            });

        if ($ignoreSessionId !== null) {
            $query->whereKeyNot($ignoreSessionId);
        }

        abort_if(
            $query->exists(),
            422,
            'Ya tienes una sesión agendada para esa fecha y hora.'
        );
    }
}
