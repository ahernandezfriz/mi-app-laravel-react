<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TherapySession extends Model
{
    use HasFactory;

    protected $fillable = [
        'treatment_plan_id',
        'session_date',
        'status',
        'objective',
        'description',
    ];

    public function treatmentPlan(): BelongsTo
    {
        return $this->belongsTo(TreatmentPlan::class);
    }
}
