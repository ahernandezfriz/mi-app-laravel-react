<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('therapy_sessions') || Schema::hasColumn('therapy_sessions', 'deleted_at')) {
            return;
        }

        Schema::table('therapy_sessions', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('therapy_sessions') || ! Schema::hasColumn('therapy_sessions', 'deleted_at')) {
            return;
        }

        Schema::table('therapy_sessions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
