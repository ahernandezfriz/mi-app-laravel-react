<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('treatment_plans') || Schema::hasColumn('treatment_plans', 'school_course_id')) {
            return;
        }

        Schema::table('treatment_plans', function (Blueprint $table) {
            $table->foreignId('school_course_id')
                ->nullable()
                ->after('diagnosis_snapshot')
                ->constrained('school_courses')
                ->restrictOnDelete();
        });

        $plans = DB::table('treatment_plans')->get(['id', 'student_id']);
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
        if (! Schema::hasTable('treatment_plans') || ! Schema::hasColumn('treatment_plans', 'school_course_id')) {
            return;
        }

        Schema::table('treatment_plans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_course_id');
        });
    }
};
