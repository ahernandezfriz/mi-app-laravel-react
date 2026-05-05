<?php

namespace App\Http\Controllers;

use App\Models\SessionTask;
use App\Models\TaskCategory;
use App\Models\TaskTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'string', 'in:name,created_at'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
            'category_id' => ['nullable', 'integer'],
            'favorites_only' => ['nullable', 'boolean'],
            'recent_only' => ['nullable', 'boolean'],
            'include_archived' => ['nullable', 'boolean'],
        ]);

        $query = $request->user()
            ->taskTemplates()
            ->withCount('sessionTasks')
            ->with(['lastEditor:id,name', 'categoryRef:id,name']);

        if (!empty($validated['q'])) {
            $search = trim($validated['q']);
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (empty($validated['include_archived'])) {
            $query->whereNull('archived_at');
        }

        if (!empty($validated['category_id'])) {
            $query->where('task_category_id', $validated['category_id']);
        }

        if (!empty($validated['favorites_only'])) {
            $query->where('is_favorite', true);
        }

        if (!empty($validated['recent_only'])) {
            $query->whereNotNull('last_used_at')->orderByDesc('last_used_at');
        }

        $sort = $validated['sort'] ?? 'name';
        $direction = $validated['direction'] ?? 'asc';

        $query->orderBy($sort, $direction);

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'task_category_id' => ['nullable', 'integer'],
            'is_favorite' => ['nullable', 'boolean'],
        ]);

        $category = $this->resolveCategory($request, $validated['task_category_id'] ?? null);

        $task = $request->user()->taskTemplates()->create([
            ...$validated,
            'task_category_id' => $category?->id,
            'category' => $category?->name,
            'last_edited_by_user_id' => $request->user()->id,
        ]);

        return response()->json($task, 201);
    }

    public function update(Request $request, TaskTemplate $taskTemplate): JsonResponse
    {
        $this->authorizeOwnership($request, $taskTemplate);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'task_category_id' => ['nullable', 'integer'],
            'is_favorite' => ['nullable', 'boolean'],
            'apply_to_pending_sessions' => ['nullable', 'boolean'],
        ]);

        $category = $this->resolveCategory($request, $validated['task_category_id'] ?? null);

        $taskTemplate->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'task_category_id' => $category?->id,
            'category' => $category?->name,
            'is_favorite' => $validated['is_favorite'] ?? false,
            'last_edited_by_user_id' => $request->user()->id,
        ]);

        $updatedPendingSessionsCount = 0;

        if (!empty($validated['apply_to_pending_sessions'])) {
            $updatedPendingSessionsCount = SessionTask::query()
                ->where('task_template_id', $taskTemplate->id)
                ->whereHas('session', function ($query): void {
                    $query->where('status', 'pendiente');
                })
                ->update([
                    'name' => $taskTemplate->name,
                    'description' => $taskTemplate->description,
                ]);
        }

        return response()->json([
            ...$taskTemplate->toArray(),
            'updated_pending_sessions_count' => $updatedPendingSessionsCount,
        ]);
    }

    public function destroy(Request $request, TaskTemplate $taskTemplate): JsonResponse
    {
        $this->authorizeOwnership($request, $taskTemplate);
        $taskTemplate->update([
            'archived_at' => now(),
            'last_edited_by_user_id' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Tarea archivada',
        ]);
    }

    public function restore(Request $request, TaskTemplate $taskTemplate): JsonResponse
    {
        $this->authorizeOwnership($request, $taskTemplate);

        $taskTemplate->update([
            'archived_at' => null,
            'last_edited_by_user_id' => $request->user()->id,
        ]);

        return response()->json($taskTemplate);
    }

    public function duplicate(Request $request, TaskTemplate $taskTemplate): JsonResponse
    {
        $this->authorizeOwnership($request, $taskTemplate);

        $copy = TaskTemplate::query()->create([
            'user_id' => $request->user()->id,
            'name' => sprintf('%s (copia)', $taskTemplate->name),
            'description' => $taskTemplate->description,
            'category' => $taskTemplate->category,
            'is_favorite' => $taskTemplate->is_favorite,
            'last_edited_by_user_id' => $request->user()->id,
        ]);

        return response()->json($copy, 201);
    }

    private function authorizeOwnership(Request $request, TaskTemplate $taskTemplate): void
    {
        abort_unless($taskTemplate->user_id === $request->user()->id, 403, 'No autorizado para esta tarea.');
    }

    private function resolveCategory(Request $request, ?int $categoryId): ?TaskCategory
    {
        if (empty($categoryId)) {
            return null;
        }

        $category = TaskCategory::query()->findOrFail($categoryId);
        abort_unless($category->user_id === $request->user()->id, 403, 'No autorizado para esta categoría.');

        return $category;
    }
}
