<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MediaLibraryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'original_name',
        'stored_name',
        'storage_path',
        'mime_type',
        'size_bytes',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sessionMaterials(): HasMany
    {
        return $this->hasMany(SessionMaterial::class);
    }
}
