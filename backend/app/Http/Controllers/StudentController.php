<?php

namespace App\Http\Controllers;

use App\Models\SchoolCourse;
use App\Models\Student;
use App\Models\StudentDiagnosis;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Student::query()->with(['level', 'course', 'studentDiagnosis:id,name', 'professionals:id,name']);

        if ($request->user()->role === 'profesional') {
            $query->whereHas('professionals', function ($q) use ($request): void {
                $q->where('users.id', $request->user()->id);
            });
        }

        return response()->json($query->orderBy('full_name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'rut' => ['required', 'string', 'max:20', Rule::unique('students', 'rut')],
            'student_diagnosis_id' => [
                'required',
                'integer',
                Rule::exists('student_diagnoses', 'id')->where('user_id', $request->user()->id),
            ],
            'school_level_id' => ['required', 'integer', 'exists:school_levels,id'],
            'school_course_id' => ['required', 'integer', 'exists:school_courses,id'],
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_phone' => ['required', 'string', 'max:50'],
            'guardian_email' => ['required', 'email', 'max:255'],
        ]);

        $this->ensureCourseBelongsToLevel($validated['school_course_id'], $validated['school_level_id']);
        $diagnosis = StudentDiagnosis::query()->findOrFail($validated['student_diagnosis_id']);
        abort_unless($diagnosis->user_id === $request->user()->id, 403);

        $student = Student::create([
            ...$validated,
            'current_diagnosis' => $diagnosis->name,
        ]);
        $student->professionals()->syncWithoutDetaching([$request->user()->id]);

        return response()->json($student->load(['level', 'course', 'studentDiagnosis:id,name', 'professionals:id,name']), 201);
    }

    public function show(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);

        return response()->json($student->load([
            'level',
            'course',
            'studentDiagnosis:id,name',
            'professionals:id,name',
            'treatmentPlans' => fn ($query) => $query->with('creator:id,name')->orderByDesc('year'),
        ]));
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'rut' => ['required', 'string', 'max:20', Rule::unique('students', 'rut')->ignore($student->id)],
            'student_diagnosis_id' => [
                'required',
                'integer',
                Rule::exists('student_diagnoses', 'id')->where('user_id', $request->user()->id),
            ],
            'school_level_id' => ['required', 'integer', 'exists:school_levels,id'],
            'school_course_id' => ['required', 'integer', 'exists:school_courses,id'],
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_phone' => ['required', 'string', 'max:50'],
            'guardian_email' => ['required', 'email', 'max:255'],
        ]);

        $this->ensureCourseBelongsToLevel($validated['school_course_id'], $validated['school_level_id']);
        $diagnosis = StudentDiagnosis::query()->findOrFail($validated['student_diagnosis_id']);
        abort_unless($diagnosis->user_id === $request->user()->id, 403);

        $student->update([
            ...$validated,
            'current_diagnosis' => $diagnosis->name,
        ]);

        return response()->json($student->load(['level', 'course', 'studentDiagnosis:id,name', 'professionals:id,name']));
    }

    public function destroy(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $student->delete();

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

    private function ensureCourseBelongsToLevel(int $courseId, int $levelId): void
    {
        $isValid = SchoolCourse::query()
            ->whereKey($courseId)
            ->where('school_level_id', $levelId)
            ->exists();

        abort_unless($isValid, 422, 'El curso no pertenece al nivel seleccionado.');
    }
}
