<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'task_category_id',
        'name',
        'description',
        'category',
        'is_favorite',
        'last_used_at',
        'archived_at',
        'last_edited_by_user_id',
    ];

    protected $casts = [
        'is_favorite' => 'boolean',
        'last_used_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sessionTasks(): HasMany
    {
        return $this->hasMany(SessionTask::class);
    }

    public function categoryRef(): BelongsTo
    {
        return $this->belongsTo(TaskCategory::class, 'task_category_id');
    }

    public function lastEditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_edited_by_user_id');
    }
}
