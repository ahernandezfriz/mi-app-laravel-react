<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentAssignmentController extends Controller
{
    public function professionals(): JsonResponse
    {
        $professionals = User::query()
            ->where('role', 'profesional')
            ->with('profession:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'profession_id']);

        return response()->json($professionals);
    }

    public function index(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudentContext($request, $student);

        return response()->json(
            $student->professionals()
                ->with('profession:id,name')
                ->orderBy('name')
                ->get(['users.id', 'users.name', 'users.email', 'users.profession_id'])
        );
    }

    public function store(Request $request, Student $student): JsonResponse
    {
        $this->authorizeManagement($request);

        $validated = $request->validate([
            'professional_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $professional = User::query()
            ->whereKey($validated['professional_user_id'])
            ->where('role', 'profesional')
            ->first();

        abort_unless($professional, 422, 'El usuario seleccionado no es un profesional.');

        $student->professionals()->syncWithoutDetaching([$professional->id]);

        return response()->json(
            $student->professionals()
                ->with('profession:id,name')
                ->orderBy('name')
                ->get(['users.id', 'users.name', 'users.email', 'users.profession_id'])
        );
    }

    public function destroy(Request $request, Student $student, User $professional): JsonResponse
    {
        $this->authorizeManagement($request);
        abort_unless($professional->role === 'profesional', 422, 'El usuario seleccionado no es un profesional.');

        $assignedCount = $student->professionals()->count();
        $isAssigned = $student->professionals()->where('users.id', $professional->id)->exists();

        abort_unless($isAssigned, 404, 'El profesional no esta asignado a este estudiante.');
        abort_if($assignedCount <= 1, 422, 'El estudiante debe mantener al menos un profesional asignado.');

        $student->professionals()->detach($professional->id);

        return response()->json(status: 204);
    }

    private function authorizeStudentContext(Request $request, Student $student): void
    {
        if ($request->user()->role !== 'profesional') {
            return;
        }

        $isAssigned = $student->professionals()->where('users.id', $request->user()->id)->exists();
        abort_unless($isAssigned, 403, 'No autorizado para este estudiante.');
    }

    private function authorizeManagement(Request $request): void
    {
        $role = $request->user()->role;
        abort_unless(in_array($role, ['admin_establecimiento', 'super_admin'], true), 403, 'No autorizado para gestionar asignaciones.');
    }
}
