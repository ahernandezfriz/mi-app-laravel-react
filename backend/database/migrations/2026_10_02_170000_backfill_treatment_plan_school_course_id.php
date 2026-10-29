<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('treatment_plans') || ! Schema::hasColumn('treatment_plans', 'school_course_id')) {
            return;
        }

        $plans = DB::table('treatment_plans')
            ->whereNull('school_course_id')
            ->get(['id', 'student_id']);

        foreach ($plans as $plan) {
            $courseId = DB::table('students')->where('id', $plan->student_id)->value('school_course_id');
            if ($courseId) {
                DB::table('treatment_plans')->where('id', $plan->id)->update([
                    'school_course_id' => $courseId,
                ]);
            }
        }
    }

    public function down(): void
    {
        //
    }
};
