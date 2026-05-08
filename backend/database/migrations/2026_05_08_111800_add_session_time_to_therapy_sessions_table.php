<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('therapy_sessions', function (Blueprint $table): void {
            $table->time('session_time')->nullable()->after('session_date');
            $table->index(['session_date', 'session_time'], 'therapy_sessions_date_time_index');
        });
    }

    public function down(): void
    {
        Schema::table('therapy_sessions', function (Blueprint $table): void {
            $table->dropIndex('therapy_sessions_date_time_index');
            $table->dropColumn('session_time');
        });
    }
};

