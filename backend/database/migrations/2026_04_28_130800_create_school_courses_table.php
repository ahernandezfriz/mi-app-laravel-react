<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_level_id')->constrained()->cascadeOnDelete();
            $table->string('grade');
            $table->string('section')->nullable();
            $table->string('display_name');
            $table->timestamps();

            $table->unique(['school_level_id', 'grade', 'section']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_courses');
    }
};
