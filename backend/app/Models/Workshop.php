<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Workshop extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'school_course_id',
        'name',
        'objective',
        'description',
        'held_on',
        'original_name',
        'stored_name',
        'storage_path',
        'mime_type',
        'size_bytes',
    ];

    protected $appends = [
        'has_material',
    ];

    protected $hidden = [
        'storage_path',
    ];

    protected function casts(): array
    {
        return [
            'held_on' => 'date:Y-m-d',
            'size_bytes' => 'integer',
        ];
    }

    public function getHasMaterialAttribute(): bool
    {
        return filled($this->storage_path);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(SchoolCourse::class, 'school_course_id');
    }
}
