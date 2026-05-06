<?php

namespace App\Http\Controllers;

use App\Models\MediaLibraryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaLibraryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->mediaLibraryItems()->withCount('sessionMaterials')->orderByDesc('id')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,ppt,pptx,doc,docx,xls,xlsx,jpg,jpeg,png,webp,gif'],
        ]);

        $file = $validated['file'];
        $storedName = $this->resolveUniqueStoredName($request->user()->id, $file->getClientOriginalName());
        $path = $file->storeAs(
            "media-library/{$request->user()->id}",
            $storedName,
            'public'
        );

        $item = MediaLibraryItem::query()->create([
            'user_id' => $request->user()->id,
            'title' => trim($validated['title'] ?? '') ?: pathinfo($storedName, PATHINFO_FILENAME),
            'original_name' => $file->getClientOriginalName(),
            'stored_name' => $storedName,
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize() ?: 0,
        ]);

        return response()->json($item->loadCount('sessionMaterials'), 201);
    }

    public function download(Request $request, MediaLibraryItem $item): StreamedResponse
    {
        abort_unless($item->user_id === $request->user()->id, 403, 'No autorizado para este recurso.');
        abort_unless(Storage::disk('public')->exists($item->storage_path), 404, 'Archivo no encontrado.');

        return Storage::disk('public')->download($item->storage_path, $item->stored_name);
    }

    public function destroy(Request $request, MediaLibraryItem $item): JsonResponse
    {
        abort_unless($item->user_id === $request->user()->id, 403, 'No autorizado para este recurso.');

        if (Storage::disk('public')->exists($item->storage_path)) {
            Storage::disk('public')->delete($item->storage_path);
        }

        $item->delete();

        return response()->json(status: 204);
    }

    private function resolveUniqueStoredName(int $userId, string $originalName): string
    {
        $cleanName = trim($originalName);
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
}
