<?php

namespace Tests\Feature;

use App\Models\SchoolCourse;
use App\Models\SchoolLevel;
use App\Models\SessionTask;
use App\Models\Student;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConsolidatedPlanPdfTest extends TestCase
{
    use RefreshDatabase;

    public function test_consolidated_pdf_includes_embedded_chart_images(): void
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
            'rut' => 'TEST-STUDENT-PDF-001',
            'current_diagnosis' => 'Diagnostico demo',
            'school_level_id' => $level->id,
            'school_course_id' => $course->id,
            'guardian_name' => 'Apoderado Demo',
            'guardian_phone' => '+56911111111',
            'guardian_email' => 'apoderado.demo@example.com',
        ]);
        $student->professionals()->attach($professional->id);

        $plan = TreatmentPlan::query()->create([
            'student_id' => $student->id,
            'created_by_user_id' => $professional->id,
            'year' => 2026,
            'diagnosis_snapshot' => 'Diagnostico anual demo',
        ]);

        $finalized = TherapySession::query()->create([
            'treatment_plan_id' => $plan->id,
            'session_date' => '2026-03-01',
            'status' => 'finalizada',
            'objective' => 'Objetivo demo',
            'description' => 'Descripcion demo',
        ]);
        SessionTask::query()->create([
            'therapy_session_id' => $finalized->id,
            'name' => 'Tarea demo',
            'description' => 'Detalle',
            'rating' => 'logrado',
        ]);
        TherapySession::query()->create([
            'treatment_plan_id' => $plan->id,
            'session_date' => '2026-03-08',
            'status' => 'suspendida',
            'objective' => 'Objetivo suspendido',
            'description' => null,
            'general_observation' => 'Motivo de suspensión: estudiante_ausente',
        ]);

        $response = $this->get("/api/students/{$student->id}/treatment-plans/{$plan->id}/consolidated-pdf");

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $pdf = $response->getContent();
        $this->assertStringStartsWith('%PDF', $pdf);
        $this->assertTrue(
            str_contains($pdf, '/XObject') || str_contains($pdf, 'PNG'),
            'El PDF consolidado debe incrustar los gráficos de torta como imagen.'
        );
    }
}
