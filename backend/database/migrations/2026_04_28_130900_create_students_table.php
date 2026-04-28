<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('rut')->unique();
            $table->text('current_diagnosis');
            $table->foreignId('school_level_id')->constrained()->restrictOnDelete();
            $table->foreignId('school_course_id')->constrained()->restrictOnDelete();
            $table->string('guardian_name');
            $table->string('guardian_phone');
            $table->string('guardian_email');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
