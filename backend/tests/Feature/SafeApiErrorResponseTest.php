<?php

namespace Tests\Feature;

use App\Models\Student;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Route;
use PDOException;
use Tests\TestCase;

class SafeApiErrorResponseTest extends TestCase
{
    public function test_query_exception_does_not_leak_sql_or_debug_when_debug_is_on(): void
    {
        config(['app.debug' => true]);

        Route::middleware('api')->get('/api/__probe/query-error', function () {
            throw new QueryException(
                'mysql',
                'select * from `therapy_sessions` where `deleted_at` is null and `id` = ?',
                [42],
                new PDOException('SQLSTATE[42S22]: Column not found: 1054 Unknown column \'deleted_at\' in \'where clause\'')
            );
        });

        $response = $this->getJson('/api/__probe/query-error');
        $body = $response->getContent();

        $response->assertStatus(500);
        $response->assertJsonPath('message', 'No se pudo completar la operación. Inténtalo más tarde.');
        $response->assertJsonMissingPath('exception');
        $response->assertJsonMissingPath('file');
        $response->assertJsonMissingPath('line');
        $response->assertJsonMissingPath('trace');
        $this->assertStringNotContainsString('SQLSTATE', $body);
        $this->assertStringNotContainsString('therapy_sessions', $body);
        $this->assertStringNotContainsString('deleted_at', $body);
        $this->assertStringNotContainsString('mysql', $body);
        $this->assertStringNotContainsString('QueryException', $body);
        $this->assertStringNotContainsString('/vendor/', $body);
    }

    public function test_missing_model_does_not_reveal_class_or_query(): void
    {
        config(['app.debug' => true]);

        Route::middleware('api')->get('/api/__probe/missing-model', function () {
            throw (new ModelNotFoundException)->setModel(Student::class, [999999]);
        });

        $response = $this->getJson('/api/__probe/missing-model');
        $body = $response->getContent();

        $response->assertStatus(404);
        $response->assertJsonPath('message', 'No se encontró lo solicitado.');
        $this->assertStringNotContainsString('App\\Models\\Student', $body);
        $this->assertStringNotContainsString('No query results', $body);
        $this->assertStringNotContainsString('"exception"', $body);
    }

    public function test_validation_errors_remain_human_and_without_debug_keys(): void
    {
        $response = $this->postJson('/api/auth/login', []);

        $response->assertStatus(422);
        $response->assertJsonMissingPath('exception');
        $response->assertJsonMissingPath('trace');
        $response->assertJsonStructure(['message', 'errors']);
        $this->assertNotEmpty($response->json('errors.email'));
        $this->assertFalse(
            str_contains(strtolower((string) $response->getContent()), 'sqlstate')
        );
    }
}
