<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\TherapySessionController;
use App\Http\Controllers\TreatmentPlanController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'backend',
    ]);
});

Route::get('/professions', [CatalogController::class, 'professions']);
Route::get('/school-levels', [CatalogController::class, 'levels']);
Route::get('/school-courses', [CatalogController::class, 'coursesByLevel']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::apiResource('/students', StudentController::class);
    Route::get('/students/{student}/treatment-plans', [TreatmentPlanController::class, 'index']);
    Route::post('/students/{student}/treatment-plans', [TreatmentPlanController::class, 'store']);
    Route::put('/students/{student}/treatment-plans/{treatmentPlan}', [TreatmentPlanController::class, 'update']);
    Route::delete('/students/{student}/treatment-plans/{treatmentPlan}', [TreatmentPlanController::class, 'destroy']);
    Route::get('/students/{student}/treatment-plans/{treatmentPlan}/sessions', [TherapySessionController::class, 'index']);
    Route::post('/students/{student}/treatment-plans/{treatmentPlan}/sessions', [TherapySessionController::class, 'store']);
    Route::put('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}', [TherapySessionController::class, 'update']);
    Route::delete('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}', [TherapySessionController::class, 'destroy']);
});
