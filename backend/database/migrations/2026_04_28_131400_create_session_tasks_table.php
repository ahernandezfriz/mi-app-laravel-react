<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('therapy_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_template_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('rating')->default('por_lograr');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_tasks');
    }
};
