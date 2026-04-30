<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE session_tasks MODIFY rating VARCHAR(255) NULL DEFAULT NULL");
    }

    public function down(): void
    {
        DB::statement("UPDATE session_tasks SET rating = 'por_lograr' WHERE rating IS NULL");
        DB::statement("ALTER TABLE session_tasks MODIFY rating VARCHAR(255) NOT NULL DEFAULT 'por_lograr'");
    }
};
