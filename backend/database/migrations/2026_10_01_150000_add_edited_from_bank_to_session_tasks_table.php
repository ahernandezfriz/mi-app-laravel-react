<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('session_tasks') || Schema::hasColumn('session_tasks', 'edited_from_bank')) {
            return;
        }

        Schema::table('session_tasks', function (Blueprint $table) {
            $table->boolean('edited_from_bank')->default(false)->after('rating');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('session_tasks') || ! Schema::hasColumn('session_tasks', 'edited_from_bank')) {
            return;
        }

        Schema::table('session_tasks', function (Blueprint $table) {
            $table->dropColumn('edited_from_bank');
        });
    }
};
