<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'full_name',
        'rut',
        'current_diagnosis',
        'school_level_id',
        'school_course_id',
        'guardian_name',
        'guardian_phone',
        'guardian_email',
    ];

    public function level(): BelongsTo
    {
        return $this->belongsTo(SchoolLevel::class, 'school_level_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(SchoolCourse::class, 'school_course_id');
    }

    public function professionals(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    public function treatmentPlans(): HasMany
    {
        return $this->hasMany(TreatmentPlan::class);
    }
}
