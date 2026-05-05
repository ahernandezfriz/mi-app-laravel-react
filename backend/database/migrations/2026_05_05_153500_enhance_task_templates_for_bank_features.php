<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_templates', function (Blueprint $table) {
            $table->string('category')->nullable()->after('description');
            $table->boolean('is_favorite')->default(false)->after('category');
            $table->timestamp('last_used_at')->nullable()->after('is_favorite');
            $table->timestamp('archived_at')->nullable()->after('last_used_at');
            $table->foreignId('last_edited_by_user_id')->nullable()->after('archived_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('task_templates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('last_edited_by_user_id');
            $table->dropColumn(['category', 'is_favorite', 'last_used_at', 'archived_at']);
        });
    }
};
