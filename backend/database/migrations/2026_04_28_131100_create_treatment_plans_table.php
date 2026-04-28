<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treatment_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->unsignedSmallInteger('year');
            $table->text('diagnosis_snapshot');
            $table->timestamps();

            $table->unique(['student_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_plans');
    }
};
