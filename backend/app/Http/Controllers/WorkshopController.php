<?php

namespace App\Http\Controllers;

use App\Models\SchoolCourse;
use App\Models\Workshop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkshopController extends Controller
{
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
            ->with(['course:id,display_name,school_level_id', 'course.level:id,display_name'])
            ->where('school_course_id', $validated['school_course_id'])
            ->orderByDesc('held_on')
            ->orderByDesc('id')
            ->get();

        return response()->json($workshops);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->payloadRules());
        $attributes = $this->workshopAttributes($validated);

        if ($request->hasFile('file')) {
            $attributes = [...$attributes, ...$this->storeMaterial($request->user()->id, $request->file('file'))];
        }

        $workshop = $request->user()->workshops()->create($attributes);

        return response()->json(
            $workshop->load(['course:id,display_name,school_level_id', 'course.level:id,display_name']),
            201
        );
    }

    public function update(Request $request, Workshop $workshop): JsonResponse
    {
        $this->authorizeOwnership($request, $workshop);

        $validated = $request->validate($this->payloadRules());
        $attributes = $this->workshopAttributes($validated);

        if ($request->hasFile('file')) {
            $this->deleteMaterial($workshop);
            $attributes = [...$attributes, ...$this->storeMaterial($request->user()->id, $request->file('file'))];
        }

        $workshop->update($attributes);

        return response()->json(
            $workshop->fresh()->load(['course:id,display_name,school_level_id', 'course.level:id,display_name'])
        );
    }

    public function destroy(Request $request, Workshop $workshop): JsonResponse
    {
        $this->authorizeOwnership($request, $workshop);
        $this->deleteMaterial($workshop);
        $workshop->delete();

        return response()->json(status: 204);
    }

    public function download(Request $request, Workshop $workshop): StreamedResponse
    {
        $this->authorizeOwnership($request, $workshop);
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
        return [
            'name' => ['required', 'string', 'max:255'],
            'objective' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'held_on' => ['required', 'date'],
            'school_course_id' => ['required', 'integer', 'exists:school_courses,id'],
            'file' => ['nullable', 'file', 'max:10240', 'mimes:pdf,ppt,pptx'],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function workshopAttributes(array $validated): array
    {
        return [
            'school_course_id' => $validated['school_course_id'],
            'name' => $validated['name'],
            'objective' => filled($validated['objective'] ?? null) ? $validated['objective'] : null,
            'description' => filled($validated['description'] ?? null) ? $validated['description'] : null,
            'held_on' => $validated['held_on'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function storeMaterial(int $userId, UploadedFile $file): array
    {
        $storedName = $this->resolveUniqueStoredName($userId, $file->getClientOriginalName());
        $path = $file->storeAs("workshops/{$userId}", $storedName, 'public');

        return [
            'original_name' => $file->getClientOriginalName(),
            'stored_name' => $storedName,
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize() ?: 0,
        ];
    }

    private function deleteMaterial(Workshop $workshop): void
    {
        if (filled($workshop->storage_path) && Storage::disk('public')->exists($workshop->storage_path)) {
            Storage::disk('public')->delete($workshop->storage_path);
        }
    }

    private function resolveUniqueStoredName(int $userId, string $originalName): string
    {
        $cleanName = trim($originalName) ?: 'material.pdf';
        $extension = pathinfo($cleanName, PATHINFO_EXTENSION);
        $basename = pathinfo($cleanName, PATHINFO_FILENAME);
        $candidate = $cleanName;
        $suffix = 1;

        while (Workshop::query()->where('user_id', $userId)->where('stored_name', $candidate)->exists()) {
            $candidate = $extension !== ''
                ? "{$basename}-{$suffix}.{$extension}"
                : "{$basename}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }

    private function authorizeOwnership(Request $request, Workshop $workshop): void
    {
        abort_unless($workshop->user_id === $request->user()->id, 403, 'No autorizado para este taller.');
    }
}
