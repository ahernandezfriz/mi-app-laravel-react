<?php

namespace App\Http\Controllers;

use App\Models\TaskTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->taskTemplates()->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $task = $request->user()->taskTemplates()->create($validated);

        return response()->json($task, 201);
    }

    public function update(Request $request, TaskTemplate $taskTemplate): JsonResponse
    {
        $this->authorizeOwnership($request, $taskTemplate);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $taskTemplate->update($validated);

        return response()->json($taskTemplate);
    }

    public function destroy(Request $request, TaskTemplate $taskTemplate): JsonResponse
    {
        $this->authorizeOwnership($request, $taskTemplate);
        $taskTemplate->delete();

        return response()->json(status: 204);
    }

    private function authorizeOwnership(Request $request, TaskTemplate $taskTemplate): void
    {
        abort_unless($taskTemplate->user_id === $request->user()->id, 403, 'No autorizado para esta tarea.');
    }
}
