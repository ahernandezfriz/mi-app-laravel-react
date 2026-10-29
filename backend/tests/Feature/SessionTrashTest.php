<?php

namespace Tests\Feature;

use App\Models\SchoolCourse;
use App\Models\SchoolLevel;
use App\Models\Student;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SessionTrashTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleting_a_session_moves_it_to_trash_and_can_be_restored(): void
    {
        [$professional, $student, $plan, $session] = $this->makeContext();
        Sanctum::actingAs($professional);

        $this->deleteJson("/api/students/{$student->id}/treatment-plans/{$plan->id}/sessions/{$session->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('therapy_sessions', ['id' => $session->id]);

        $this->getJson("/api/students/{$student->id}/treatment-plans/{$plan->id}/sessions")
            ->assertOk()
            ->assertJsonCount(0);

        $this->getJson("/api/students/{$student->id}/treatment-plans/{$plan->id}/sessions/trash")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $session->id);

        $this->postJson("/api/students/{$student->id}/treatment-plans/{$plan->id}/sessions/{$session->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $session->id);

        $this->assertDatabaseHas('therapy_sessions', [
            'id' => $session->id,
            'deleted_at' => null,
        ]);
    }

    public function test_force_delete_removes_a_trashed_session(): void
    {
        [$professional, $student, $plan, $session] = $this->makeContext();
        Sanctum::actingAs($professional);
        $session->delete();

        $this->deleteJson("/api/students/{$student->id}/treatment-plans/{$plan->id}/sessions/{$session->id}/force")
            ->assertNoContent();

        $this->assertDatabaseMissing('therapy_sessions', ['id' => $session->id]);
    }

    /**
     * @return array{0: User, 1: Student, 2: TreatmentPlan, 3: TherapySession}
     */
    private function makeContext(): array
    {
        $professional = User::factory()->create([
            'role' => 'profesional',
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

        $student = Student::query()->create([
            'full_name' => 'Estudiante Papelera',
            'rut' => 'TEST-SESSION-TRASH-001',
            'current_diagnosis' => 'Diagnostico demo',
            'school_level_id' => $level->id,
            'school_course_id' => $course->id,
            'guardian_name' => 'Apoderado Demo',
            'guardian_phone' => '+56911111111',
            'guardian_email' => 'apoderado.trash@example.com',
        ]);
        $student->professionals()->syncWithoutDetaching([$professional->id]);

        $plan = TreatmentPlan::query()->create([
            'student_id' => $student->id,
            'created_by_user_id' => $professional->id,
            'year' => 2026,
            'diagnosis_snapshot' => 'Diagnostico anual demo',
        ]);

        $session = TherapySession::query()->create([
            'treatment_plan_id' => $plan->id,
            'session_date' => now()->toDateString(),
            'session_time' => '09:00',
            'status' => 'pendiente',
            'objective' => 'Objetivo demo',
            'description' => 'Descripcion demo',
        ]);

        return [$professional, $student, $plan, $session];
    }
}
