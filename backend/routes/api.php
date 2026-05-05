<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SessionTaskController;
use App\Http\Controllers\StudentAssignmentController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\TaskCategoryController;
use App\Http\Controllers\TaskTemplateController;
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
    Route::get('/professionals', [StudentAssignmentController::class, 'professionals']);
    Route::get('/students/{student}/assignments', [StudentAssignmentController::class, 'index']);
    Route::post('/students/{student}/assignments', [StudentAssignmentController::class, 'store']);
    Route::delete('/students/{student}/assignments/{professional}', [StudentAssignmentController::class, 'destroy']);
    Route::get('/students/{student}/treatment-plans', [TreatmentPlanController::class, 'index']);
    Route::post('/students/{student}/treatment-plans', [TreatmentPlanController::class, 'store']);
    Route::put('/students/{student}/treatment-plans/{treatmentPlan}', [TreatmentPlanController::class, 'update']);
    Route::delete('/students/{student}/treatment-plans/{treatmentPlan}', [TreatmentPlanController::class, 'destroy']);
    Route::get('/students/{student}/treatment-plans/{treatmentPlan}/sessions', [TherapySessionController::class, 'index']);
    Route::get('/sessions/today', [TherapySessionController::class, 'today']);
    Route::post('/students/{student}/treatment-plans/{treatmentPlan}/sessions', [TherapySessionController::class, 'store']);
    Route::put('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}', [TherapySessionController::class, 'update']);
    Route::delete('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}', [TherapySessionController::class, 'destroy']);
    Route::get('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}/pdf', [ReportController::class, 'sessionPdf']);
    Route::post('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}/send-report', [ReportController::class, 'sendSessionReportEmail']);
    Route::get('/students/{student}/treatment-plans/{treatmentPlan}/consolidated-pdf', [ReportController::class, 'consolidatedPlanPdf']);
    Route::get('/task-templates', [TaskTemplateController::class, 'index']);
    Route::get('/task-categories', [TaskCategoryController::class, 'index']);
    Route::post('/task-categories', [TaskCategoryController::class, 'store']);
    Route::post('/task-templates', [TaskTemplateController::class, 'store']);
    Route::put('/task-templates/{taskTemplate}', [TaskTemplateController::class, 'update']);
    Route::post('/task-templates/{taskTemplate}/duplicate', [TaskTemplateController::class, 'duplicate']);
    Route::post('/task-templates/{taskTemplate}/restore', [TaskTemplateController::class, 'restore']);
    Route::delete('/task-templates/{taskTemplate}', [TaskTemplateController::class, 'destroy']);
    Route::get('/task-templates/{taskTemplate}/history', [SessionTaskController::class, 'history']);
    Route::get('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}/tasks', [SessionTaskController::class, 'index']);
    Route::post('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}/tasks', [SessionTaskController::class, 'store']);
    Route::put('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}/tasks/{sessionTask}', [SessionTaskController::class, 'update']);
    Route::delete('/students/{student}/treatment-plans/{treatmentPlan}/sessions/{session}/tasks/{sessionTask}', [SessionTaskController::class, 'destroy']);
});
