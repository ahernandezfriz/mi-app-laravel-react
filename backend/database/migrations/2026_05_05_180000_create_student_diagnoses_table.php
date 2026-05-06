<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_diagnoses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 255);
            $table->timestamps();
            $table->unique(['user_id', 'name']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->foreignId('student_diagnosis_id')->nullable()->after('current_diagnosis')->constrained('student_diagnoses')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropConstrainedForeignId('student_diagnosis_id');
        });
        Schema::dropIfExists('student_diagnoses');
    }
};
