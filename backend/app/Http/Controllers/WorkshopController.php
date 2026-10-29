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
    private const FILE_EXTENSIONS = 'pdf,ppt,pptx,doc,docx,xls,xlsx,jpg,jpeg,png,webp,gif';

    public function courses(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $workshops = Workshop::query()
            ->where('user_id', $userId)
            ->get(['school_course_id', 'held_on']);

        $courses = SchoolCourse::query()
            ->with('level:id,display_name')
            ->whereIn('id', $workshops->pluck('school_course_id')->unique()->filter())
            ->get()
            ->keyBy('id');

        $rows = $workshops
            ->groupBy(function (Workshop $workshop): string {
                return $workshop->school_course_id.'-'.$this->heldOnYear($workshop);
            })
            ->map(function ($items) use ($courses) {
                /** @var Workshop $workshop */
                $workshop = $items->first();
                $course = $courses->get($workshop->school_course_id);
                if ($course === null) {
                    return null;
                }

                $lastHeldOn = $items
                    ->map(fn (Workshop $item) => $item->held_on)
                    ->filter()
                    ->sort()
                    ->last();

                $payload = $course->toArray();
                $payload['year'] = $this->heldOnYear($workshop);
                $payload['workshops_count'] = $items->count();
                $payload['last_held_on'] = $lastHeldOn?->format('Y-m-d');

                return $payload;
            })
            ->filter()
            ->sortBy([
                ['last_held_on', 'desc'],
                ['display_name', 'asc'],
            ])
            ->values();

        return response()->json($rows);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_course_id' => ['required', 'integer', 'exists:school_courses,id'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $query = $request->user()
            ->workshops()
            ->with($this->workshopRelations())
            ->where('school_course_id', $validated['school_course_id']);

        if (filled($validated['year'] ?? null)) {
            $query->whereYear('held_on', (int) $validated['year']);
        }

        return response()->json(
            $query->orderByDesc('held_on')->orderByDesc('id')->get()
        );
    }

    public function show(Request $request, Workshop $workshop): JsonResponse
    {
        $this->authorizeOwnership($request, $workshop);

        return response()->json($workshop->load($this->workshopRelations()));
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertMultipartWasParsed($request);
        $this->mergeUrlsFromRequest($request);
        $validated = $request->validate($this->payloadRules(), $this->payloadMessages());
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
        $this->assertMultipartWasParsed($request);
        $this->mergeUrlsFromRequest($request);

        $validated = $request->validate($this->payloadRules(), $this->payloadMessages());
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
            'file' => ['nullable', 'file', 'max:10240', 'extensions:'.self::FILE_EXTENSIONS],
        ];

        if ($this->hasUrlsColumn()) {
            $rules['urls'] = ['nullable', 'array'];
            $rules['urls.*'] = ['required', 'string', 'max:2048', 'regex:/^https?:\/\/.+/i'];
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
        try {
            $path = $file->storeAs("media-library/{$userId}", $storedName, 'public');
        } catch (\Throwable $exception) {
            report($exception);
            abort(500, 'No se pudo guardar el archivo del taller.');
        }

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

    /**
     * @return array<string, string>
     */
    private function payloadMessages(): array
    {
        return [
            'name.required' => 'El nombre del taller es obligatorio.',
            'held_on.required' => 'Selecciona la fecha de realización.',
            'school_course_id.required' => 'Selecciona el curso.',
            'file.extensions' => 'El archivo debe ser un documento o imagen (PDF, PPT, Word, Excel o imagen).',
            'file.max' => 'El archivo no puede superar 10 MB.',
            'urls.*.regex' => 'Cada URL debe comenzar con http:// o https://.',
        ];
    }

    private function assertMultipartWasParsed(Request $request): void
    {
        $contentType = (string) $request->header('Content-Type', '');
        if (! str_contains($contentType, 'multipart/form-data')) {
            return;
        }

        if ($request->filled('name') || $request->hasFile('file')) {
            return;
        }

        $length = (int) $request->header('Content-Length', 0);
        if ($length > 1024) {
            abort(422, 'El archivo es demasiado grande o no se pudo subir. Usa uno de hasta 10 MB.');
        }
    }

    private function mergeUrlsFromRequest(Request $request): void
    {
        $urls = $request->input('urls');
        if (is_string($urls)) {
            $decoded = json_decode($urls, true);
            $request->merge([
                'urls' => json_last_error() === JSON_ERROR_NONE && is_array($decoded) ? $decoded : [],
            ]);

            return;
        }

        if (is_array($urls)) {
            $request->merge([
                'urls' => array_values(array_filter(array_map(
                    static fn ($url) => trim((string) $url),
                    $urls
                ))),
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

    private function heldOnYear(Workshop $workshop): int
    {
        return (int) ($workshop->held_on?->year ?: substr((string) $workshop->held_on, 0, 4));
    }
}
