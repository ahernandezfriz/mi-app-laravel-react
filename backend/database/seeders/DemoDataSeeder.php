<?php

namespace Database\Seeders;

use App\Models\Profession;
use App\Models\SchoolCourse;
use App\Models\SessionTask;
use App\Models\Student;
use App\Models\TaskTemplate;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $courses = SchoolCourse::query()->get();

        if ($courses->isEmpty()) {
            $this->command?->warn('No hay cursos en la base de datos. Ejecuta SchoolCatalogSeeder primero.');
            return;
        }

        $professionIds = Profession::query()->pluck('id');

        if ($professionIds->isEmpty()) {
            $this->command?->warn('No hay profesiones en la base de datos. Ejecuta ProfessionSeeder primero.');
            return;
        }

        DB::transaction(function () use ($courses, $professionIds): void {
            $professionals = [
                [
                    'name' => 'Profesional Demo 1',
                    'email' => 'pro1.demo@miapp.local',
                    'rut' => '21.111.111-1',
                ],
                [
                    'name' => 'Profesional Demo 2',
                    'email' => 'pro2.demo@miapp.local',
                    'rut' => '22.222.222-2',
                ],
            ];

            foreach ($professionals as $index => $data) {
                $professional = User::query()->updateOrCreate(
                    ['email' => $data['email']],
                    [
                        'name' => $data['name'],
                        'rut' => $data['rut'],
                        'role' => 'profesional',
                        'profession_id' => $professionIds->random(),
                        'password' => Hash::make('password'),
                    ]
                );

                $studentRutPrefix = sprintf('DEMO-P%d-', $index + 1);

                $existingDemoStudentIds = Student::query()
                    ->where('rut', 'like', $studentRutPrefix.'%')
                    ->pluck('id');

                if ($existingDemoStudentIds->isNotEmpty()) {
                    Student::query()->whereIn('id', $existingDemoStudentIds)->delete();
                }

                $diagnosisPool = ['TEA', 'TEL expresivo', 'TEL mixto', 'Dislexia', 'TDAH', 'Prematuridad'];
                foreach ($diagnosisPool as $label) {
                    $professional->studentDiagnoses()->firstOrCreate([
                        'name' => $label,
                    ]);
                }

                $diagnoses = $professional->studentDiagnoses()->orderBy('name')->get();

                TaskTemplate::query()
                    ->where('user_id', $professional->id)
                    ->where('name', 'like', 'Demo tarea %')
                    ->delete();

                for ($taskNumber = 1; $taskNumber <= 10; $taskNumber++) {
                    TaskTemplate::query()->create([
                        'user_id' => $professional->id,
                        'name' => sprintf('Demo tarea %02d', $taskNumber),
                        'description' => "Tarea reutilizable demo {$taskNumber} del banco profesional.",
                        'task_category_id' => null,
                        'category' => null,
                        'is_favorite' => $taskNumber <= 3,
                        'last_edited_by_user_id' => $professional->id,
                    ]);
                }

                for ($i = 1; $i <= 30; $i++) {
                    $course = $courses->random();
                    $diagnosis = $diagnoses->random();

                    $student = Student::query()->create([
                        'full_name' => fake()->name(),
                        'rut' => sprintf('%s%02d', $studentRutPrefix, $i),
                        'student_diagnosis_id' => $diagnosis->id,
                        'current_diagnosis' => $diagnosis->name,
                        'school_level_id' => $course->school_level_id,
                        'school_course_id' => $course->id,
                        'guardian_name' => fake()->name(),
                        'guardian_phone' => fake()->numerify('+569########'),
                        'guardian_email' => fake()->unique()->safeEmail(),
                    ]);

                    $professional->students()->attach($student->id);

                    $plan = TreatmentPlan::query()->create([
                        'student_id' => $student->id,
                        'created_by_user_id' => $professional->id,
                        'year' => (int) now()->format('Y'),
                        'diagnosis_snapshot' => $diagnosis->name,
                    ]);

                    for ($sessionIndex = 1; $sessionIndex <= 3; $sessionIndex++) {
                        $session = TherapySession::query()->create([
                            'treatment_plan_id' => $plan->id,
                            'session_date' => now()->subDays(4 - $sessionIndex)->toDateString(),
                            'status' => 'pendiente',
                            'objective' => "Objetivo demo {$sessionIndex}",
                            'description' => "Sesion demo {$sessionIndex} para {$student->full_name}",
                        ]);

                        for ($taskIndex = 1; $taskIndex <= 2; $taskIndex++) {
                            SessionTask::query()->create([
                                'therapy_session_id' => $session->id,
                                'task_template_id' => null,
                                'name' => "Tarea demo {$sessionIndex}.{$taskIndex}",
                                'description' => "Actividad sin categoria {$taskIndex} de la sesion {$sessionIndex}",
                                'rating' => collect(['con_dificultad', 'por_lograr', 'logrado'])->random(),
                            ]);
                        }
                    }
                }
            }
        });
    }
}
