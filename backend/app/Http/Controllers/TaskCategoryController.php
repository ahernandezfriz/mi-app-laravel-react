<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->taskCategories()->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $category = $request->user()->taskCategories()->firstOrCreate([
            'name' => trim($validated['name']),
        ]);

        return response()->json($category, 201);
    }
}
