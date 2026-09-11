<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workshops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('school_course_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('objective')->nullable();
            $table->text('description')->nullable();
            $table->date('held_on');
            $table->string('original_name')->nullable();
            $table->string('stored_name')->nullable();
            $table->string('storage_path')->nullable();
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'school_course_id']);
            $table->index(['user_id', 'stored_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workshops');
    }
};
