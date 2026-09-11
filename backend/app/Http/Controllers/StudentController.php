<?php

namespace App\Http\Controllers;

use App\Models\SchoolCourse;
use App\Models\Student;
use App\Models\StudentDiagnosis;
use App\Rules\ChileanRutRule;
use App\Support\ChileanRut;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
        $rutRules = $this->rutValidationRules();

        $validated = $request->validate(
            $this->studentPayloadRules($rutRules, $minBirthDate),
            $this->studentValidationMessages(),
        );

        $this->ensureCourseBelongsToLevel($validated['school_course_id'], $validated['school_level_id']);
        $diagnosisPayload = $this->resolveDiagnoses($validated['diagnosis_ids'], $request->user()->id);

        $student = $this->persistStudent(function () use ($validated, $diagnosisPayload, $request) {
            $student = Student::create($this->studentAttributes($validated, $diagnosisPayload));

            $this->syncStudentDiagnoses($student, $diagnosisPayload['ids']);
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
        $rutRules = $this->rutValidationRules($student->id);

        $attachedDiagnosisIds = $this->attachedDiagnosisIds($student);

        $validated = $request->validate(
            array_merge(
                $this->studentPayloadRules($rutRules, $minBirthDate, false),
                [
                    'diagnosis_ids.*' => [
                        'integer',
                        function (string $attribute, mixed $value, \Closure $fail) use ($request, $attachedDiagnosisIds): void {
                            if (! $this->diagnosisIsAllowed((int) $value, $request->user()->id, $attachedDiagnosisIds)) {
                                $fail('Uno o más diagnósticos no son válidos.');
                            }
                        },
                    ],
                ],
            ),
            $this->studentValidationMessages(),
        );

        $this->ensureCourseBelongsToLevel($validated['school_course_id'], $validated['school_level_id']);
        $diagnosisPayload = $this->resolveDiagnoses(
            $validated['diagnosis_ids'],
            $request->user()->id,
            $attachedDiagnosisIds,
        );

        $this->persistStudent(function () use ($student, $validated, $diagnosisPayload) {
            $student->update($this->studentAttributes($validated, $diagnosisPayload));
            $this->syncStudentDiagnoses($student, $diagnosisPayload['ids']);

            return $student;
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
        $relations = [
            'level',
            'course',
            'studentDiagnosis:id,name',
            'professionals:id,name',
        ];

        if (Schema::hasTable('student_student_diagnosis') && method_exists(Student::class, 'diagnoses')) {
            $relations[] = 'diagnoses:id,name';
        }

        return $relations;
    }

    /**
     * @return list<mixed>
     */
    private function rutValidationRules(?int $ignoreStudentId = null): array
    {
        $unique = Rule::unique('students', 'rut');
        if ($ignoreStudentId !== null) {
            $unique = $unique->ignore($ignoreStudentId);
        }

        return ['required', 'string', 'max:20', new ChileanRutRule, $unique];
    }

    /**
     * @return array<string, string>
     */
    private function studentValidationMessages(): array
    {
        return [
            'rut.unique' => 'El RUT no es válido.',
        ];
    }

    /**
     * @template T
     * @param  callable(): T  $callback
     * @return T
     */
    private function persistStudent(callable $callback): mixed
    {
        try {
            return DB::transaction($callback);
        } catch (UniqueConstraintViolationException $e) {
            $this->throwIfDuplicateStudentRut($e);
            throw $e;
        } catch (QueryException $e) {
            $this->throwIfDuplicateStudentRut($e);
            throw $e;
        }
    }

    private function throwIfDuplicateStudentRut(\Throwable $e): void
    {
        $message = $e->getMessage();
        if (
            ! str_contains($message, 'students_rut_unique')
            && ! str_contains($message, "for key 'students.rut'")
            && ! str_contains($message, 'students_rut')
        ) {
            return;
        }

        throw ValidationException::withMessages([
            'rut' => 'El RUT no es válido.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function studentPayloadRules(array $rutRules, string $minBirthDate, bool $ownedDiagnoses = true): array
    {
        $rules = [
            'full_name' => ['required', 'string', 'max:255'],
            'rut' => $rutRules,
            'birth_date' => Schema::hasColumn('students', 'birth_date')
                ? ['required', 'date', 'before_or_equal:today', 'after_or_equal:'.$minBirthDate]
                : ['nullable'],
            'diagnosis_ids' => ['required', 'array', 'min:1'],
            'school_level_id' => ['required', 'integer', 'exists:school_levels,id'],
            'school_course_id' => ['required', 'integer', 'exists:school_courses,id'],
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_phone' => ['required', 'string', 'max:50'],
            'guardian_email' => ['required', 'email', 'max:255'],
        ];

        if ($ownedDiagnoses) {
            $rules['diagnosis_ids.*'] = [
                'integer',
                Rule::exists('student_diagnoses', 'id')->where('user_id', request()->user()->id),
            ];
        } else {
            $rules['diagnosis_ids.*'] = ['integer'];
        }

        return $rules;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array{ids: list<int>, primary_id: int, label: string}  $diagnosisPayload
     * @return array<string, mixed>
     */
    private function studentAttributes(array $validated, array $diagnosisPayload): array
    {
        $attributes = [
            'full_name' => $validated['full_name'],
            'rut' => $validated['rut'],
            'student_diagnosis_id' => $diagnosisPayload['primary_id'],
            'current_diagnosis' => $diagnosisPayload['label'],
            'school_level_id' => $validated['school_level_id'],
            'school_course_id' => $validated['school_course_id'],
            'guardian_name' => $validated['guardian_name'],
            'guardian_phone' => $validated['guardian_phone'],
            'guardian_email' => $validated['guardian_email'],
        ];

        if (Schema::hasColumn('students', 'birth_date')) {
            $attributes['birth_date'] = $validated['birth_date'] ?? null;
        }

        return $attributes;
    }

    /**
     * @param  list<int>  $ids
     */
    private function syncStudentDiagnoses(Student $student, array $ids): void
    {
        if (! method_exists($student, 'diagnoses') || ! Schema::hasTable('student_student_diagnosis')) {
            return;
        }

        $student->diagnoses()->sync($ids);
    }

    /**
     * @return list<int>
     */
    private function attachedDiagnosisIds(Student $student): array
    {
        if (method_exists($student, 'diagnoses') && Schema::hasTable('student_student_diagnosis')) {
            return $student->diagnoses()->pluck('student_diagnoses.id')->map(fn ($id) => (int) $id)->all();
        }

        return $student->student_diagnosis_id ? [(int) $student->student_diagnosis_id] : [];
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
     * @param  list<int>  $allowedExtraIds
     * @return array{ids: list<int>, primary_id: int, label: string}
     */
    private function resolveDiagnoses(array $ids, int $userId, array $allowedExtraIds = []): array
    {
        $uniqueIds = collect($ids)->map(fn ($id) => (int) $id)->unique()->values();

        if ($uniqueIds->isEmpty()) {
            throw ValidationException::withMessages([
                'diagnosis_ids' => 'Selecciona al menos un diagnóstico.',
            ]);
        }

        $diagnoses = StudentDiagnosis::query()
            ->whereIn('id', $uniqueIds->all())
            ->where(function ($query) use ($userId, $allowedExtraIds): void {
                $query->where('user_id', $userId);
                if ($allowedExtraIds !== []) {
                    $query->orWhereIn('id', $allowedExtraIds);
                }
            })
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

    /**
     * @param  list<int>  $attachedDiagnosisIds
     */
    private function diagnosisIsAllowed(int $diagnosisId, int $userId, array $attachedDiagnosisIds = []): bool
    {
        if (in_array($diagnosisId, $attachedDiagnosisIds, true)) {
            return true;
        }

        return StudentDiagnosis::query()
            ->whereKey($diagnosisId)
            ->where('user_id', $userId)
            ->exists();
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
