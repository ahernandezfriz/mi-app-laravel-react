<?php

namespace App\Models;

use App\Support\ExactAge;
use Illuminate\Database\Eloquent\Casts\Attribute;
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
        'birth_date',
        'current_diagnosis',
        'student_diagnosis_id',
        'school_level_id',
        'school_course_id',
        'guardian_name',
        'guardian_phone',
        'guardian_email',
    ];

    protected $appends = [
        'exact_age',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date:Y-m-d',
        ];
    }

    protected function exactAge(): Attribute
    {
        return Attribute::get(fn (): ?string => ExactAge::format($this->birth_date));
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(SchoolLevel::class, 'school_level_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(SchoolCourse::class, 'school_course_id');
    }

    public function studentDiagnosis(): BelongsTo
    {
        return $this->belongsTo(StudentDiagnosis::class);
    }

    public function diagnoses(): BelongsToMany
    {
        return $this->belongsToMany(StudentDiagnosis::class, 'student_student_diagnosis')
            ->withTimestamps();
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
