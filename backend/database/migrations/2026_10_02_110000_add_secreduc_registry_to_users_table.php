<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || Schema::hasColumn('users', 'secreduc_registry')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('secreduc_registry', 80)->nullable()->after('profession_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'secreduc_registry')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('secreduc_registry');
        });
    }
};
