<?php

namespace Tests\Feature;

use App\Models\SchoolCourse;
use App\Models\SchoolLevel;
use App\Models\Student;
use App\Models\StudentDiagnosis;
use App\Models\User;
use App\Support\ChileanRut;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_professional_can_update_student_with_put(): void
    {
        [$professional, $student, $payload] = $this->makeStudentContext();

        Sanctum::actingAs($professional);

        $this->putJson("/api/students/{$student->id}", [
            ...$payload,
            'full_name' => 'Estudiante Editado',
        ])
            ->assertOk()
            ->assertJsonPath('full_name', 'Estudiante Editado');

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'full_name' => 'Estudiante Editado',
        ]);
    }

    public function test_professional_can_update_student_with_post_fallback(): void
    {
        [$professional, $student, $payload] = $this->makeStudentContext();

        Sanctum::actingAs($professional);

        $this->postJson("/api/students/{$student->id}", [
            ...$payload,
            'guardian_phone' => '+56911112222',
        ])
            ->assertOk()
            ->assertJsonPath('guardian_phone', '+56911112222');
    }

    public function test_assigned_professional_can_keep_diagnoses_created_by_another_user(): void
    {
        [$owner, $student, $payload] = $this->makeStudentContext();

        $colleague = User::factory()->create([
            'role' => 'profesional',
            'rut' => '22.222.222-2',
        ]);
        $student->professionals()->syncWithoutDetaching([$colleague->id]);

        Sanctum::actingAs($colleague);

        $this->putJson("/api/students/{$student->id}", [
            ...$payload,
            'full_name' => 'Ficha compartida',
        ])
            ->assertOk()
            ->assertJsonPath('full_name', 'Ficha compartida');

        $this->assertEquals($owner->id, StudentDiagnosis::query()->find($payload['diagnosis_ids'][0])?->user_id);
    }

    /**
     * @return array{0: User, 1: Student, 2: array<string, mixed>}
     */
    private function makeStudentContext(): array
    {
        $professional = User::factory()->create([
            'role' => 'profesional',
            'rut' => '11.111.111-1',
        ]);

        $level = SchoolLevel::query()->create([
            'name' => 'basica',
            'display_name' => 'Basica',
        ]);

        $course = SchoolCourse::query()->create([
            'school_level_id' => $level->id,
            'grade' => '1',
            'section' => 'A',
            'display_name' => '1 Basica A',
        ]);

        $diagnosis = StudentDiagnosis::query()->create([
            'user_id' => $professional->id,
            'name' => 'TEA',
        ]);

        $rutBody = '12345678';
        $rut = ChileanRut::format($rutBody.ChileanRut::computeDv($rutBody));

        $student = Student::query()->create([
            'full_name' => 'Estudiante Original',
            'rut' => $rut,
            'birth_date' => '2018-03-10',
            'student_diagnosis_id' => $diagnosis->id,
            'current_diagnosis' => $diagnosis->name,
            'school_level_id' => $level->id,
            'school_course_id' => $course->id,
            'guardian_name' => 'Apoderado Demo',
            'guardian_phone' => '+56911111111',
            'guardian_email' => 'apoderado.demo@example.com',
        ]);

        $student->diagnoses()->sync([$diagnosis->id]);
        $student->professionals()->syncWithoutDetaching([$professional->id]);

        $payload = [
            'full_name' => $student->full_name,
            'rut' => $student->rut,
            'birth_date' => '2018-03-10',
            'diagnosis_ids' => [$diagnosis->id],
            'school_level_id' => $level->id,
            'school_course_id' => $course->id,
            'guardian_name' => $student->guardian_name,
            'guardian_phone' => $student->guardian_phone,
            'guardian_email' => $student->guardian_email,
        ];

        return [$professional, $student, $payload];
    }
}
