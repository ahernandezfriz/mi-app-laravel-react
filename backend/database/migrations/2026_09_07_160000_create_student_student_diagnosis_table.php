<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_student_diagnosis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('student_diagnosis_id')->constrained('student_diagnoses')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['student_id', 'student_diagnosis_id'], 'student_diagnosis_unique');
        });

        $now = now();

        DB::table('students')
            ->whereNotNull('student_diagnosis_id')
            ->orderBy('id')
            ->get(['id', 'student_diagnosis_id'])
            ->each(function ($student) use ($now): void {
                DB::table('student_student_diagnosis')->insertOrIgnore([
                    'student_id' => $student->id,
                    'student_diagnosis_id' => $student->student_diagnosis_id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_student_diagnosis');
    }
};
