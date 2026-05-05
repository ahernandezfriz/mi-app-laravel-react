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

class TaskTemplateDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleting_task_template_does_not_delete_session_task(): void
    {
        $professional = User::factory()->create([
            'role' => 'profesional',
        ]);

        Sanctum::actingAs($professional);

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
            'rut' => 'TEST-STUDENT-001',
            'current_diagnosis' => 'Diagnostico demo',
            'school_level_id' => $level->id,
            'school_course_id' => $course->id,
            'guardian_name' => 'Apoderado Demo',
            'guardian_phone' => '+56911111111',
            'guardian_email' => 'apoderado.demo@example.com',
        ]);

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

        $template = TaskTemplate::query()->create([
            'user_id' => $professional->id,
            'name' => 'Discriminacion auditiva',
            'description' => 'Actividad para fonemas',
        ]);

        $sessionTask = SessionTask::query()->create([
            'therapy_session_id' => $session->id,
            'task_template_id' => $template->id,
            'name' => $template->name,
            'description' => $template->description,
            'rating' => 'por_lograr',
        ]);

        $this->deleteJson("/api/task-templates/{$template->id}")
            ->assertOk();

        $this->assertDatabaseHas('task_templates', ['id' => $template->id]);
        $this->assertDatabaseHas('session_tasks', [
            'id' => $sessionTask->id,
            'therapy_session_id' => $session->id,
            'name' => 'Discriminacion auditiva',
            'description' => 'Actividad para fonemas',
        ]);
        $this->assertNotNull($template->fresh()->archived_at);
        $this->assertEquals($template->id, $sessionTask->fresh()->task_template_id);
    }
}
