<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE therapy_sessions SET status = 'pendiente' WHERE status = 'draft'");
    }

    public function down(): void
    {
        DB::statement("UPDATE therapy_sessions SET status = 'draft' WHERE status = 'pendiente'");
    }
};
