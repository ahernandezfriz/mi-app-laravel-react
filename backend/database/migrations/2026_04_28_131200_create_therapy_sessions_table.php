<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('therapy_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('treatment_plan_id')->constrained()->cascadeOnDelete();
            $table->date('session_date');
            $table->string('status')->default('draft');
            $table->text('objective');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('therapy_sessions');
    }
};
