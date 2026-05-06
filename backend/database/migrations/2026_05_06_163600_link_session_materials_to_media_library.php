<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('session_materials', function (Blueprint $table) {
            $table->foreignId('media_library_item_id')
                ->nullable()
                ->after('therapy_session_id')
                ->constrained('media_library_items')
                ->cascadeOnDelete();
            $table->string('original_name')->nullable()->change();
            $table->string('storage_path')->nullable()->change();
            $table->string('mime_type', 120)->nullable()->change();
            $table->unsignedBigInteger('size_bytes')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('session_materials', function (Blueprint $table) {
            $table->dropConstrainedForeignId('media_library_item_id');
            $table->string('original_name')->nullable(false)->change();
            $table->string('storage_path')->nullable(false)->change();
            $table->string('mime_type', 120)->nullable(false)->change();
            $table->unsignedBigInteger('size_bytes')->nullable(false)->change();
        });
    }
};
