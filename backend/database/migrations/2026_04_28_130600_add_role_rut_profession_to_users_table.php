<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('rut')->nullable()->after('name');
            $table->string('role')->default('profesional')->after('password');
            $table->foreignId('profession_id')->nullable()->after('role')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('profession_id');
            $table->dropColumn(['rut', 'role']);
        });
    }
};
