<?php

namespace Database\Seeders;

use App\Models\Profession;
use App\Models\SchoolCourse;
use App\Models\Student;
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

                for ($i = 1; $i <= 10; $i++) {
                    $course = $courses->random();

                    $student = Student::query()->create([
                        'full_name' => fake()->name(),
                        'rut' => sprintf('%s%02d', $studentRutPrefix, $i),
                        'current_diagnosis' => fake()->sentence(8),
                        'school_level_id' => $course->school_level_id,
                        'school_course_id' => $course->id,
                        'guardian_name' => fake()->name(),
                        'guardian_phone' => fake()->numerify('+569########'),
                        'guardian_email' => fake()->unique()->safeEmail(),
                    ]);

                    $professional->students()->attach($student->id);
                }
            }
        });
    }
}
