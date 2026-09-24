<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('workshops') || Schema::hasColumn('workshops', 'media_library_item_id')) {
            return;
        }

        Schema::table('workshops', function (Blueprint $table) {
            $table->foreignId('media_library_item_id')
                ->nullable()
                ->after('school_course_id')
                ->constrained('media_library_items')
                ->nullOnDelete();
        });

        $this->backfillExistingFiles();
    }

    public function down(): void
    {
        if (! Schema::hasTable('workshops') || ! Schema::hasColumn('workshops', 'media_library_item_id')) {
            return;
        }

        Schema::table('workshops', function (Blueprint $table) {
            $table->dropConstrainedForeignId('media_library_item_id');
        });
    }

    private function backfillExistingFiles(): void
    {
        if (! Schema::hasTable('media_library_items')) {
            return;
        }

        $workshops = DB::table('workshops')
            ->whereNull('media_library_item_id')
            ->whereNotNull('storage_path')
            ->where('storage_path', '!=', '')
            ->get();

        foreach ($workshops as $workshop) {
            $storedName = $this->uniqueStoredName(
                (int) $workshop->user_id,
                (string) ($workshop->stored_name ?: $workshop->original_name ?: 'taller')
            );

            $itemId = DB::table('media_library_items')->insertGetId([
                'user_id' => $workshop->user_id,
                'title' => $workshop->name ?: pathinfo($storedName, PATHINFO_FILENAME),
                'original_name' => $workshop->original_name,
                'stored_name' => $storedName,
                'storage_path' => $workshop->storage_path,
                'mime_type' => $workshop->mime_type,
                'size_bytes' => $workshop->size_bytes ?: 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('workshops')->where('id', $workshop->id)->update([
                'media_library_item_id' => $itemId,
            ]);
        }
    }

    private function uniqueStoredName(int $userId, string $originalName): string
    {
        $cleanName = trim($originalName) ?: 'taller';
        $extension = pathinfo($cleanName, PATHINFO_EXTENSION);
        $basename = pathinfo($cleanName, PATHINFO_FILENAME);
        $candidate = $cleanName;
        $suffix = 1;

        while (DB::table('media_library_items')->where('user_id', $userId)->where('stored_name', $candidate)->exists()) {
            $candidate = $extension !== ''
                ? "{$basename}-{$suffix}.{$extension}"
                : "{$basename}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }
};
