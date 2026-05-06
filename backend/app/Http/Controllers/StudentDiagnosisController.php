<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentDiagnosisController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->studentDiagnoses()->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $diagnosis = $request->user()->studentDiagnoses()->firstOrCreate([
            'name' => mb_substr(trim($validated['name']), 0, 255),
        ]);

        return response()->json($diagnosis, $diagnosis->wasRecentlyCreated ? 201 : 200);
    }
}
