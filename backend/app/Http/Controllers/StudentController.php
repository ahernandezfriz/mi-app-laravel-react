<?php

namespace App\Http\Controllers;

use App\Models\SchoolCourse;
use App\Models\Student;
use App\Models\StudentDiagnosis;
use App\Rules\ChileanRutRule;
use App\Support\ChileanRut;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Student::query()->with($this->studentRelations());

        if ($request->user()->role === 'profesional') {
            $query->whereHas('professionals', function ($q) use ($request): void {
                $q->where('users.id', $request->user()->id);
            });
        }

        return response()->json($query->orderBy('full_name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'rut' => ChileanRut::format($request->input('rut')),
            'diagnosis_ids' => $this->normalizeDiagnosisIds($request),
        ]);

        $minBirthDate = now()->subYears(25)->toDateString();
        $rutRules = ['required', 'string', 'max:20', new ChileanRutRule];
        if (! ChileanRut::isWildcard($request->input('rut'))) {
            $rutRules[] = Rule::unique('students', 'rut');
        }

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'rut' => $rutRules,
            'birth_date' => ['required', 'date', 'before_or_equal:today', 'after_or_equal:'.$minBirthDate],
            'diagnosis_ids' => ['required', 'array', 'min:1'],
            'diagnosis_ids.*' => [
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
        $diagnosisPayload = $this->resolveDiagnoses($validated['diagnosis_ids'], $request->user()->id);

        $student = DB::transaction(function () use ($validated, $diagnosisPayload, $request) {
            $student = Student::create([
                'full_name' => $validated['full_name'],
                'rut' => $validated['rut'],
                'birth_date' => $validated['birth_date'],
                'student_diagnosis_id' => $diagnosisPayload['primary_id'],
                'current_diagnosis' => $diagnosisPayload['label'],
                'school_level_id' => $validated['school_level_id'],
                'school_course_id' => $validated['school_course_id'],
                'guardian_name' => $validated['guardian_name'],
                'guardian_phone' => $validated['guardian_phone'],
                'guardian_email' => $validated['guardian_email'],
            ]);

            $student->diagnoses()->sync($diagnosisPayload['ids']);
            $student->professionals()->syncWithoutDetaching([$request->user()->id]);

            return $student;
        });

        return response()->json($student->load($this->studentRelations()), 201);
    }

    public function show(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);

        return response()->json($student->load([
            ...$this->studentRelations(),
            'treatmentPlans' => fn ($query) => $query->with('creator:id,name')->orderByDesc('year'),
        ]));
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);

        $request->merge([
            'rut' => ChileanRut::format($request->input('rut')),
            'diagnosis_ids' => $this->normalizeDiagnosisIds($request),
        ]);

        $minBirthDate = now()->subYears(25)->toDateString();
        $rutRules = ['required', 'string', 'max:20', new ChileanRutRule];
        if (! ChileanRut::isWildcard($request->input('rut'))) {
            $rutRules[] = Rule::unique('students', 'rut')->ignore($student->id);
        }

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'rut' => $rutRules,
            'birth_date' => ['required', 'date', 'before_or_equal:today', 'after_or_equal:'.$minBirthDate],
            'diagnosis_ids' => ['required', 'array', 'min:1'],
            'diagnosis_ids.*' => [
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
        $diagnosisPayload = $this->resolveDiagnoses($validated['diagnosis_ids'], $request->user()->id);

        DB::transaction(function () use ($student, $validated, $diagnosisPayload): void {
            $student->update([
                'full_name' => $validated['full_name'],
                'rut' => $validated['rut'],
                'birth_date' => $validated['birth_date'],
                'student_diagnosis_id' => $diagnosisPayload['primary_id'],
                'current_diagnosis' => $diagnosisPayload['label'],
                'school_level_id' => $validated['school_level_id'],
                'school_course_id' => $validated['school_course_id'],
                'guardian_name' => $validated['guardian_name'],
                'guardian_phone' => $validated['guardian_phone'],
                'guardian_email' => $validated['guardian_email'],
            ]);

            $student->diagnoses()->sync($diagnosisPayload['ids']);
        });

        return response()->json($student->fresh()->load($this->studentRelations()));
    }

    public function destroy(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $student->delete();

        return response()->json(status: 204);
    }

    /**
     * @return list<string>
     */
    private function studentRelations(): array
    {
        return [
            'level',
            'course',
            'diagnoses:id,name',
            'studentDiagnosis:id,name',
            'professionals:id,name',
        ];
    }

    /**
     * @return list<int>
     */
    private function normalizeDiagnosisIds(Request $request): array
    {
        $ids = $request->input('diagnosis_ids');

        if (! is_array($ids) || $ids === []) {
            $legacy = $request->input('student_diagnosis_id');
            $ids = $legacy !== null && $legacy !== '' ? [$legacy] : [];
        }

        return collect($ids)
            ->filter(fn ($id) => $id !== null && $id !== '' && $id !== '__new__')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $ids
     * @return array{ids: list<int>, primary_id: int, label: string}
     */
    private function resolveDiagnoses(array $ids, int $userId): array
    {
        $uniqueIds = collect($ids)->map(fn ($id) => (int) $id)->unique()->values();

        if ($uniqueIds->isEmpty()) {
            throw ValidationException::withMessages([
                'diagnosis_ids' => 'Selecciona al menos un diagnóstico.',
            ]);
        }

        $diagnoses = StudentDiagnosis::query()
            ->where('user_id', $userId)
            ->whereIn('id', $uniqueIds->all())
            ->get()
            ->keyBy('id');

        if ($diagnoses->count() !== $uniqueIds->count()) {
            throw ValidationException::withMessages([
                'diagnosis_ids' => 'Uno o más diagnósticos no son válidos.',
            ]);
        }

        $orderedIds = $uniqueIds->all();
        $label = $uniqueIds
            ->map(fn (int $id) => $diagnoses->get($id)?->name)
            ->filter()
            ->implode('; ');

        return [
            'ids' => $orderedIds,
            'primary_id' => $orderedIds[0],
            'label' => $label,
        ];
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
