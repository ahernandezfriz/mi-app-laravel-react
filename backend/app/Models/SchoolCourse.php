<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolCourse extends Model
{
    use HasFactory;

    protected $fillable = ['school_level_id', 'grade', 'section', 'display_name'];

    public function level(): BelongsTo
    {
        return $this->belongsTo(SchoolLevel::class, 'school_level_id');
    }

    public function workshops(): HasMany
    {
        return $this->hasMany(Workshop::class);
    }
}
