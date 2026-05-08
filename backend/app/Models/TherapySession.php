<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TherapySession extends Model
{
    use HasFactory;

    protected $fillable = [
        'treatment_plan_id',
        'session_date',
        'session_time',
        'status',
        'objective',
        'description',
        'general_observation',
    ];

    public function treatmentPlan(): BelongsTo
    {
        return $this->belongsTo(TreatmentPlan::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(SessionTask::class, 'therapy_session_id');
    }

    public function materials(): HasMany
    {
        return $this->hasMany(SessionMaterial::class, 'therapy_session_id')->latest('id');
    }
}
