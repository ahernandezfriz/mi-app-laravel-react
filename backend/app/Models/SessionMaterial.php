<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'therapy_session_id',
        'media_library_item_id',
        'uploaded_by_user_id',
        'title',
        'original_name',
        'storage_path',
        'mime_type',
        'size_bytes',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(TherapySession::class, 'therapy_session_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function mediaItem(): BelongsTo
    {
        return $this->belongsTo(MediaLibraryItem::class, 'media_library_item_id');
    }
}
