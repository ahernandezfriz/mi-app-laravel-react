<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $levelId = DB::table('school_levels')->where('name', 'media')->value('id');

        if (! $levelId) {
            return;
        }

        DB::table('school_courses')
            ->where('school_level_id', $levelId)
            ->orderBy('id')
            ->get(['id', 'grade', 'section'])
            ->each(function ($course): void {
                DB::table('school_courses')->where('id', $course->id)->update([
                    'display_name' => trim($course->grade.' Medio '.$course->section),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        $level = DB::table('school_levels')->where('name', 'media')->first();

        if (! $level) {
            return;
        }

        DB::table('school_courses')
            ->where('school_level_id', $level->id)
            ->orderBy('id')
            ->get(['id', 'grade', 'section'])
            ->each(function ($course) use ($level): void {
                DB::table('school_courses')->where('id', $course->id)->update([
                    'display_name' => trim($course->grade.' '.$level->display_name.' '.$course->section),
                    'updated_at' => now(),
                ]);
            });
    }
};
