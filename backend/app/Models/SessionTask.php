<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'therapy_session_id',
        'task_template_id',
        'name',
        'description',
        'rating',
        'edited_from_bank',
    ];

    protected $casts = [
        'edited_from_bank' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(TherapySession::class, 'therapy_session_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(TaskTemplate::class, 'task_template_id');
    }
}
