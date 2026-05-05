<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->unique(['user_id', 'name']);
        });

        Schema::table('task_templates', function (Blueprint $table) {
            $table->foreignId('task_category_id')->nullable()->after('user_id')->constrained('task_categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('task_templates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('task_category_id');
        });

        Schema::dropIfExists('task_categories');
    }
};
