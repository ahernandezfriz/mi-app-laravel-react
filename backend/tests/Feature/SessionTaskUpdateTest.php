<?php

namespace Tests\Feature;

use App\Models\SchoolCourse;
use App\Models\SchoolLevel;
use App\Models\SessionTask;
use App\Models\Student;
use App\Models\TaskTemplate;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SessionTaskUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_updating_bank_session_task_does_not_change_template_or_other_sessions(): void
    {
        [$professional, $student, $plan, $session, $otherSession, $template] = $this->makeSessionContext();

        $sessionTask = SessionTask::query()->create([
            'therapy_session_id' => $session->id,
            'task_template_id' => $template->id,
            'name' => $template->name,
            'description' => $template->description,
            'rating' => 'por_lograr',
        ]);

        $otherTask = SessionTask::query()->create([
            'therapy_session_id' => $otherSession->id,
            'task_template_id' => $template->id,
            'name' => $template->name,
            'description' => $template->description,
            'rating' => 'por_lograr',
        ]);

        Sanctum::actingAs($professional);

        $this->putJson(
            "/api/students/{$student->id}/treatment-plans/{$plan->id}/sessions/{$session->id}/tasks/{$sessionTask->id}",
            [
                'name' => 'Nombre solo en esta sesion',
                'description' => 'Descripcion solo en esta sesion',
                'rating' => 'logrado',
            ]
        )
            ->assertOk()
            ->assertJsonPath('name', 'Nombre solo en esta sesion')
            ->assertJsonPath('description', 'Descripcion solo en esta sesion')
            ->assertJsonPath('task_template_id', $template->id);

        $this->assertDatabaseHas('task_templates', [
            'id' => $template->id,
            'name' => 'Discriminacion auditiva',
            'description' => 'Actividad para fonemas',
        ]);

        $this->assertDatabaseHas('session_tasks', [
            'id' => $otherTask->id,
            'name' => 'Discriminacion auditiva',
            'description' => 'Actividad para fonemas',
        ]);
    }

    public function test_professional_can_update_a_new_session_task(): void
    {
        [$professional, $student, $plan, $session] = $this->makeSessionContext();

        $sessionTask = SessionTask::query()->create([
            'therapy_session_id' => $session->id,
            'task_template_id' => null,
            'name' => 'Tarea nueva',
            'description' => 'Creada en la sesion',
            'rating' => null,
        ]);

        Sanctum::actingAs($professional);

        $this->putJson(
            "/api/students/{$student->id}/treatment-plans/{$plan->id}/sessions/{$session->id}/tasks/{$sessionTask->id}",
            [
                'name' => 'Tarea nueva editada',
                'description' => 'Descripcion actualizada',
                'rating' => null,
            ]
        )
            ->assertOk()
            ->assertJsonPath('name', 'Tarea nueva editada')
            ->assertJsonPath('task_template_id', null);
    }

    /**
     * @return array{0: User, 1: Student, 2: TreatmentPlan, 3: TherapySession, 4: TherapySession, 5: TaskTemplate}
     */
    private function makeSessionContext(): array
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
            'full_name' => 'Estudiante Demo',
            'rut' => 'TEST-SESSION-TASK-001',
            'current_diagnosis' => 'Diagnostico demo',
            'school_level_id' => $level->id,
            'school_course_id' => $course->id,
            'guardian_name' => 'Apoderado Demo',
            'guardian_phone' => '+56911111111',
            'guardian_email' => 'apoderado.demo@example.com',
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
            'status' => 'pendiente',
            'objective' => 'Objetivo demo',
            'description' => 'Descripcion demo',
        ]);

        $otherSession = TherapySession::query()->create([
            'treatment_plan_id' => $plan->id,
            'session_date' => now()->addDay()->toDateString(),
            'status' => 'pendiente',
            'objective' => 'Otra sesion',
            'description' => 'Otra descripcion',
        ]);

        $template = TaskTemplate::query()->create([
            'user_id' => $professional->id,
            'name' => 'Discriminacion auditiva',
            'description' => 'Actividad para fonemas',
        ]);

        return [$professional, $student, $plan, $session, $otherSession, $template];
    }
}
