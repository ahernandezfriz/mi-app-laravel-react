<?php

namespace App\Http\Controllers;

use App\Models\Profession;
use App\Models\SchoolLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function professions(): JsonResponse
    {
        return response()->json(Profession::query()->orderBy('name')->get());
    }

    public function levels(): JsonResponse
    {
        return response()->json(
            SchoolLevel::query()
                ->with('courses')
                ->orderBy('id')
                ->get()
        );
    }

    public function coursesByLevel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'level_id' => ['required', 'integer', 'exists:school_levels,id'],
        ]);

        $level = SchoolLevel::with('courses')->findOrFail($validated['level_id']);

        return response()->json($level->courses);
    }
}
