<?php

namespace Tests\Unit;

use App\Support\SafeApiError;
use PHPUnit\Framework\TestCase;

class SafeApiErrorTest extends TestCase
{
    public function test_detects_sql_and_debug_details_as_technical(): void
    {
        $sql = 'SQLSTATE[42S22]: Column not found: 1054 Unknown column \'deleted_at\' in \'where clause\' (Connection: mysql, Database: gestion_pie, SQL: select * from `therapy_sessions` where `deleted_at` is null)';

        $this->assertTrue(SafeApiError::isTechnical($sql));
        $this->assertTrue(SafeApiError::isTechnical('No query results for model [App\\Models\\Student] 12'));
        $this->assertTrue(SafeApiError::isTechnical('Server Error'));
        $this->assertFalse(SafeApiError::isTechnical('No se pudo generar el PDF consolidado.'));
        $this->assertFalse(SafeApiError::isTechnical('No autenticado.'));
    }

    public function test_sanitize_payload_strips_traces_and_replaces_sql_message(): void
    {
        $payload = SafeApiError::sanitizePayload([
            'message' => 'SQLSTATE[42S22]: Column not found: 1054 Unknown column \'deleted_at\' (Connection: mysql, SQL: select * from `therapy_sessions`)',
            'exception' => 'Illuminate\\Database\\QueryException',
            'file' => '/var/www/app/Http/Controllers/TherapySessionController.php',
            'line' => 118,
            'trace' => [['file' => '/vendor/laravel/framework/src/Illuminate/Database/Connection.php']],
        ], 500);

        $this->assertSame('No se pudo completar la operación. Inténtalo más tarde.', $payload['message']);
        $this->assertArrayNotHasKey('exception', $payload);
        $this->assertArrayNotHasKey('file', $payload);
        $this->assertArrayNotHasKey('trace', $payload);
        $this->assertArrayNotHasKey('line', $payload);
        $this->assertStringNotContainsString('therapy_sessions', json_encode($payload));
        $this->assertStringNotContainsString('SQLSTATE', json_encode($payload));
    }

    public function test_keeps_human_validation_errors(): void
    {
        $payload = SafeApiError::sanitizePayload([
            'message' => 'The given data was invalid.',
            'errors' => [
                'email' => ['El campo email es obligatorio.'],
                'password' => ['El campo password es obligatorio.'],
            ],
        ], 422);

        $this->assertSame('Revisa los datos ingresados e inténtalo de nuevo.', $payload['message']);
        $this->assertSame(['El campo email es obligatorio.'], $payload['errors']['email']);
        $this->assertSame(['El campo password es obligatorio.'], $payload['errors']['password']);
    }

    public function test_keeps_explicit_human_http_messages(): void
    {
        $payload = SafeApiError::sanitizePayload([
            'message' => 'No se pudo generar el PDF consolidado.',
        ], 500);

        $this->assertSame('No se pudo generar el PDF consolidado.', $payload['message']);
    }
}
