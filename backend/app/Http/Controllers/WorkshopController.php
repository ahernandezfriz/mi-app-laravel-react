<?php

namespace App\Http\Controllers;

use App\Models\MediaLibraryItem;
use App\Models\SchoolCourse;
use App\Models\Workshop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkshopController extends Controller
{
    private const FILE_MIMES = 'pdf,ppt,pptx,doc,docx,xls,xlsx,jpg,jpeg,png,webp,gif';

    public function courses(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $courses = SchoolCourse::query()
            ->with('level:id,display_name')
            ->whereHas('workshops', function ($query) use ($userId): void {
                $query->where('user_id', $userId);
            })
            ->withCount(['workshops as workshops_count' => function ($query) use ($userId): void {
                $query->where('user_id', $userId);
            }])
            ->withMax(['workshops as last_held_on' => function ($query) use ($userId): void {
                $query->where('user_id', $userId);
            }], 'held_on')
            ->orderBy('display_name')
            ->get();

        return response()->json($courses);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_course_id' => ['required', 'integer', 'exists:school_courses,id'],
        ]);

        $workshops = $request->user()
            ->workshops()
            ->with($this->workshopRelations())
            ->where('school_course_id', $validated['school_course_id'])
            ->orderByDesc('held_on')
            ->orderByDesc('id')
            ->get();

        return response()->json($workshops);
    }

    public function show(Request $request, Workshop $workshop): JsonResponse
    {
        $this->authorizeOwnership($request, $workshop);

        return response()->json($workshop->load($this->workshopRelations()));
    }

    public function store(Request $request): JsonResponse
    {
        $this->mergeUrlsFromRequest($request);
        $validated = $request->validate($this->payloadRules());
        $attributes = $this->workshopAttributes($validated);
        $mediaItem = $this->resolveMediaItem($request, $validated);

        if ($mediaItem !== null) {
            $attributes = [...$attributes, ...$this->materialAttributesFromMedia($mediaItem)];
        }

        $workshop = $request->user()->workshops()->create($attributes);

        return response()->json(
            $workshop->load($this->workshopRelations()),
            201
        );
    }

    public function update(Request $request, Workshop $workshop): JsonResponse
    {
        $this->authorizeOwnership($request, $workshop);
        $this->mergeUrlsFromRequest($request);

        $validated = $request->validate($this->payloadRules());
        $attributes = $this->workshopAttributes($validated);
        $mediaItem = $this->resolveMediaItem($request, $validated);

        if ($mediaItem !== null) {
            $this->deleteLegacyMaterial($workshop);
            $attributes = [...$attributes, ...$this->materialAttributesFromMedia($mediaItem)];
        }

        $workshop->update($attributes);

        return response()->json(
            $workshop->fresh()->load($this->workshopRelations())
        );
    }

    public function destroy(Request $request, Workshop $workshop): JsonResponse
    {
        $this->authorizeOwnership($request, $workshop);
        $this->deleteLegacyMaterial($workshop);
        $workshop->delete();

        return response()->json(status: 204);
    }

    public function download(Request $request, Workshop $workshop): StreamedResponse
    {
        $this->authorizeOwnership($request, $workshop);

        $item = $this->hasMediaLibraryItemColumn() ? $workshop->mediaItem : null;
        if ($item !== null) {
            abort_unless(Storage::disk('public')->exists($item->storage_path), 404, 'Archivo no encontrado.');

            return Storage::disk('public')->download(
                $item->storage_path,
                $item->stored_name ?: $item->original_name ?: 'taller'
            );
        }

        abort_unless(filled($workshop->storage_path), 404, 'Este taller no tiene material adjunto.');
        abort_unless(Storage::disk('public')->exists($workshop->storage_path), 404, 'Archivo no encontrado.');

        return Storage::disk('public')->download(
            $workshop->storage_path,
            $workshop->stored_name ?: $workshop->original_name ?: 'taller'
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadRules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'objective' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'held_on' => ['required', 'date'],
            'school_course_id' => ['required', 'integer', 'exists:school_courses,id'],
            'file' => ['nullable', 'file', 'max:10240', 'mimes:'.self::FILE_MIMES],
        ];

        if ($this->hasUrlsColumn()) {
            $rules['urls'] = ['nullable', 'array'];
            $rules['urls.*'] = ['required', 'url', 'max:2048'];
        }

        if ($this->hasMediaLibraryItemColumn()) {
            $rules['media_library_item_id'] = ['nullable', 'integer', 'exists:media_library_items,id'];
        }

        return $rules;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function workshopAttributes(array $validated): array
    {
        $attributes = [
            'school_course_id' => $validated['school_course_id'],
            'name' => $validated['name'],
            'objective' => filled($validated['objective'] ?? null) ? $validated['objective'] : null,
            'description' => filled($validated['description'] ?? null) ? $validated['description'] : null,
            'held_on' => $validated['held_on'],
        ];

        if ($this->hasUrlsColumn()) {
            $urls = collect($validated['urls'] ?? [])
                ->map(fn ($url) => trim((string) $url))
                ->filter()
                ->unique()
                ->values()
                ->all();
            $attributes['urls'] = $urls;
        }

        return $attributes;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveMediaItem(Request $request, array $validated): ?MediaLibraryItem
    {
        if ($this->hasMediaLibraryItemColumn() && filled($validated['media_library_item_id'] ?? null)) {
            $mediaItem = MediaLibraryItem::query()->findOrFail($validated['media_library_item_id']);
            abort_unless($mediaItem->user_id === $request->user()->id, 403, 'No autorizado para usar este recurso.');

            return $mediaItem;
        }

        if (! $request->hasFile('file')) {
            return null;
        }

        return $this->createMediaLibraryItem(
            $request->user()->id,
            $request->file('file'),
            $validated['name'] ?? null
        );
    }

    private function createMediaLibraryItem(int $userId, UploadedFile $file, ?string $title): MediaLibraryItem
    {
        $storedName = $this->resolveUniqueLibraryName($userId, $file->getClientOriginalName());
        $path = $file->storeAs("media-library/{$userId}", $storedName, 'public');

        return MediaLibraryItem::query()->create([
            'user_id' => $userId,
            'title' => trim((string) $title) ?: pathinfo($storedName, PATHINFO_FILENAME),
            'original_name' => $file->getClientOriginalName(),
            'stored_name' => $storedName,
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize() ?: 0,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function materialAttributesFromMedia(MediaLibraryItem $mediaItem): array
    {
        $attributes = [
            'original_name' => $mediaItem->original_name ?: $mediaItem->stored_name,
            'stored_name' => $mediaItem->stored_name,
            'storage_path' => $mediaItem->storage_path,
            'mime_type' => $mediaItem->mime_type,
            'size_bytes' => $mediaItem->size_bytes ?: 0,
        ];

        if ($this->hasMediaLibraryItemColumn()) {
            $attributes['media_library_item_id'] = $mediaItem->id;
        }

        return $attributes;
    }

    private function deleteLegacyMaterial(Workshop $workshop): void
    {
        $isLinkedToLibrary = $this->hasMediaLibraryItemColumn() && filled($workshop->media_library_item_id);
        if ($isLinkedToLibrary) {
            return;
        }

        $path = (string) $workshop->storage_path;
        if ($path !== '' && str_starts_with($path, 'workshops/') && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function resolveUniqueLibraryName(int $userId, string $originalName): string
    {
        $cleanName = trim($originalName) ?: 'material.pdf';
        $extension = pathinfo($cleanName, PATHINFO_EXTENSION);
        $basename = pathinfo($cleanName, PATHINFO_FILENAME);
        $candidate = $cleanName;
        $suffix = 1;

        while (MediaLibraryItem::query()->where('user_id', $userId)->where('stored_name', $candidate)->exists()) {
            $candidate = $extension !== ''
                ? "{$basename}-{$suffix}.{$extension}"
                : "{$basename}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }

    /**
     * @return array<int, string|array<string, mixed>>
     */
    private function workshopRelations(): array
    {
        $relations = [
            'course:id,display_name,school_level_id',
            'course.level:id,display_name',
        ];

        if ($this->hasMediaLibraryItemColumn()) {
            $relations[] = 'mediaItem:id,title,stored_name,original_name,mime_type,size_bytes';
        }

        return $relations;
    }

    private function mergeUrlsFromRequest(Request $request): void
    {
        $urls = $request->input('urls');
        if (is_string($urls)) {
            $decoded = json_decode($urls, true);
            $request->merge([
                'urls' => json_last_error() === JSON_ERROR_NONE && is_array($decoded) ? $decoded : [],
            ]);
        }
    }

    private function hasUrlsColumn(): bool
    {
        return Schema::hasColumn('workshops', 'urls');
    }

    private function hasMediaLibraryItemColumn(): bool
    {
        return Schema::hasColumn('workshops', 'media_library_item_id');
    }

    private function authorizeOwnership(Request $request, Workshop $workshop): void
    {
        abort_unless($workshop->user_id === $request->user()->id, 403, 'No autorizado para este taller.');
    }
}
