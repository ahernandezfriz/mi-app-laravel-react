<?php

namespace App\Http\Controllers;

use App\Models\MediaLibraryItem;
use App\Models\SessionMaterial;
use App\Models\Student;
use App\Models\TherapySession;
use App\Models\TreatmentPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SessionMaterialController extends Controller
{
    public function index(Request $request, Student $student, TreatmentPlan $treatmentPlan, TherapySession $session): JsonResponse
    {
        $this->authorizeChain($request, $student, $treatmentPlan, $session);

        return response()->json(
            $session->materials()->with(['uploader:id,name', 'mediaItem:id,title,stored_name,size_bytes,mime_type'])->get()
        );
    }

    public function store(Request $request, Student $student, TreatmentPlan $treatmentPlan, TherapySession $session): JsonResponse
    {
        $this->authorizeChain($request, $student, $treatmentPlan, $session);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'media_library_item_id' => ['nullable', 'integer'],
            'file' => ['nullable', 'file', 'max:10240', 'mimes:pdf,ppt,pptx,doc,docx,xls,xlsx,jpg,jpeg,png,webp,gif'],
        ]);

        $mediaItem = null;
        if (! empty($validated['media_library_item_id'])) {
            $mediaItem = MediaLibraryItem::query()->findOrFail($validated['media_library_item_id']);
            abort_unless($mediaItem->user_id === $request->user()->id, 403, 'No autorizado para usar este recurso.');
        } elseif (! empty($validated['file'])) {
            $file = $validated['file'];
            $storedName = $this->resolveUniqueStoredName($request->user()->id, $file->getClientOriginalName());
            $path = $file->storeAs(
                "media-library/{$request->user()->id}",
                $storedName,
                'public'
            );

            $mediaItem = MediaLibraryItem::query()->create([
                'user_id' => $request->user()->id,
                'title' => trim($validated['title'] ?? '') ?: pathinfo($storedName, PATHINFO_FILENAME),
                'original_name' => $file->getClientOriginalName(),
                'stored_name' => $storedName,
                'storage_path' => $path,
                'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
                'size_bytes' => $file->getSize() ?: 0,
            ]);
        }

        abort_unless($mediaItem !== null, 422, 'Debes seleccionar un recurso de la biblioteca o subir un archivo.');

        $material = SessionMaterial::query()->create([
            'therapy_session_id' => $session->id,
            'media_library_item_id' => $mediaItem->id,
            'uploaded_by_user_id' => $request->user()->id,
            'title' => trim($validated['title'] ?? '') ?: $mediaItem->title,
            'original_name' => $mediaItem->stored_name,
            'storage_path' => $mediaItem->storage_path,
            'mime_type' => $mediaItem->mime_type,
            'size_bytes' => $mediaItem->size_bytes,
        ]);

        return response()->json($material->load(['uploader:id,name', 'mediaItem:id,title,stored_name,size_bytes,mime_type']), 201);
    }

    public function download(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session,
        SessionMaterial $material
    ): StreamedResponse {
        $this->authorizeChain($request, $student, $treatmentPlan, $session);
        $this->ensureMaterialBelongsToSession($session, $material);
        $item = $material->mediaItem;
        if ($item !== null) {
            abort_unless($item->user_id === $request->user()->id, 403, 'No autorizado para este recurso.');
            abort_unless(Storage::disk('public')->exists($item->storage_path), 404, 'Archivo no encontrado.');
            return Storage::disk('public')->download($item->storage_path, $item->stored_name);
        }

        abort_unless(Storage::disk('public')->exists((string) $material->storage_path), 404, 'Archivo no encontrado.');

        return Storage::disk('public')->download((string) $material->storage_path, (string) $material->original_name);
    }

    public function destroy(
        Request $request,
        Student $student,
        TreatmentPlan $treatmentPlan,
        TherapySession $session,
        SessionMaterial $material
    ): JsonResponse {
        $this->authorizeChain($request, $student, $treatmentPlan, $session);
        $this->ensureMaterialBelongsToSession($session, $material);

        if ($material->mediaItem === null && ! empty($material->storage_path) && Storage::disk('public')->exists($material->storage_path)) {
            Storage::disk('public')->delete($material->storage_path);
        }

        $material->delete();

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

    private function authorizeChain(Request $request, Student $student, TreatmentPlan $plan, TherapySession $session): void
    {
        if ($request->user()->role === 'profesional') {
            $isAssigned = $student->professionals()->where('users.id', $request->user()->id)->exists();
            abort_unless($isAssigned, 403, 'No autorizado para este estudiante.');
        }

        abort_unless($plan->student_id === $student->id, 404, 'Plan no encontrado para el estudiante.');
        abort_unless($session->treatment_plan_id === $plan->id, 404, 'Sesion no encontrada para el plan.');
    }

    private function ensureMaterialBelongsToSession(TherapySession $session, SessionMaterial $material): void
    {
        abort_unless($material->therapy_session_id === $session->id, 404, 'Material no encontrado para la sesion.');
    }
}
