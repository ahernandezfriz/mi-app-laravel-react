<?php

namespace App\Http\Controllers;

use App\Models\SessionTask;
use App\Models\Student;
use App\Models\TaskTemplate;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SessionTaskController extends Controller
{
    private const RATINGS = ['por_lograr', 'con_dificultad', 'logrado'];

    public function index(Request $request, Student $student, TreatmentPlan $treatmentPlan, TherapySession $session): JsonResponse
    {
        $this->authorizeChain($request, $student, $treatmentPlan, $session);

        return response()->json(
            $session->tasks()->with('template:id,name')->orderBy('id')->get()
        );
    }

    public function store(Request $request, Student $student, TreatmentPlan $treatmentPlan, TherapySession $session): JsonResponse
    {
        $this->authorizeChain($request, $student, $treatmentPlan, $session);

        $validated = $request->validate([
            'task_template_id' => ['nullable', 'integer', 'exists:task_templates,id'],
            'name' => ['required_without:task_template_id', 'nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'rating' => ['nullable', Rule::in(self::RATINGS)],
        ]);

        if (!empty($validated['task_template_id'])) {
            $template = TaskTemplate::query()->findOrFail($validated['task_template_id']);
            abort_unless($template->user_id === $request->user()->id, 403, 'No autorizado para usar esta tarea.');
            $validated['name'] = $template->name;
            $validated['description'] = $validated['description'] ?? $template->description;
        }

        $task = $session->tasks()->create($validated);

        return response()->json($task->load('template:id,name'), 201);
    }

    public function update(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session,
        SessionTask $sessionTask
    ): JsonResponse {
        $this->authorizeChain($request, $student, $treatmentPlan, $session);
        $this->ensureTaskBelongsToSession($session, $sessionTask);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'rating' => ['nullable', Rule::in(self::RATINGS)],
        ]);

        $sessionTask->update($validated);

        return response()->json($sessionTask->load('template:id,name'));
    }

    public function destroy(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session,
        SessionTask $sessionTask
    ): JsonResponse {
        $this->authorizeChain($request, $student, $treatmentPlan, $session);
        $this->ensureTaskBelongsToSession($session, $sessionTask);
        $sessionTask->delete();

        return response()->json(status: 204);
    }

    public function history(Request $request, TaskTemplate $taskTemplate): JsonResponse
    {
        abort_unless($taskTemplate->user_id === $request->user()->id, 403, 'No autorizado para esta tarea.');

        $history = SessionTask::query()
            ->where('task_template_id', $taskTemplate->id)
            ->with([
                'session:id,treatment_plan_id,session_date,status,objective',
                'session.treatmentPlan:id,student_id,year',
                'session.treatmentPlan.student:id,full_name',
            ])
            ->orderByDesc('id')
            ->get();

        return response()->json($history);
    }

    private function authorizeChain(Request $request, Student $student, TreatmentPlan $plan, TherapySession $session): void
    {
        if ($request->user()->role === 'profesional') {
            $isAssigned = $student->professionals()->where('users.id', $request->user()->id)->exists();
            abort_unless($isAssigned, 403, 'No autorizado para este estudiante.');
        }

        abort_unless($plan->student_id === $student->id, 404, 'Plan no encontrado para el estudiante.');
        abort_unless($session->treatment_plan_id === $plan->id, 404, 'Sesion no encontrada para el plan.');
    }

    private function ensureTaskBelongsToSession(TherapySession $session, SessionTask $task): void
    {
        abort_unless($task->therapy_session_id === $session->id, 404, 'Tarea no encontrada para la sesion.');
    }
}
