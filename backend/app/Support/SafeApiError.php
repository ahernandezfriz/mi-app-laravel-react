<?php

namespace App\Support;

final class SafeApiError
{
    private const MAX_SAFE_LENGTH = 180;

    /**
     * @var list<string>
     */
    private const GENERIC_MESSAGES = [
        'Server Error',
        'Unauthenticated.',
        'Unauthenticated',
        'This action is unauthorized.',
        'Too Many Attempts.',
        'The given data was invalid.',
        'Not found.',
        'Whoops, looks like something went wrong.',
        'Bad request.',
    ];

    public static function isTechnical(?string $message): bool
    {
        if ($message === null) {
            return false;
        }

        $trimmed = trim($message);
        if ($trimmed === '') {
            return false;
        }

        if (mb_strlen($trimmed) > self::MAX_SAFE_LENGTH) {
            return true;
        }

        if (in_array($trimmed, self::GENERIC_MESSAGES, true)) {
            return true;
        }

        return (bool) preg_match(
            '/SQLSTATE|SQL:|unknown column|base table or view|integrity constraint|connection:\s*\w+|database:\s*\w+|no query results for model|Illuminate\\\\|App\\\\Models\\\\|PDOException|QueryException|\/vendor\/|\/var\/www|\/home\/|stack trace|on line\s+\d+|select\s+.+\s+from\s+|insert\s+into\s+|update\s+\w+\s+set\s+|delete\s+from\s+|SQLSTATE\[|#\d+\s+|in [A-Z]:\\\\|in \/[\w.\-]+\/.*\.php|mysqli_|pgsql_|sqlite_|access denied for user|using password|Bind address|errorInfo/i',
            $trimmed
        );
    }

    /**
     * @param  array<string, mixed>  $errors
     */
    public static function humanMessage(int $status, ?string $original = null, bool $hasSafeErrors = false): string
    {
        if ($original && ! self::isTechnical($original)) {
            return $original;
        }

        if ($hasSafeErrors) {
            return 'Revisa los datos ingresados e inténtalo de nuevo.';
        }

        return match (true) {
            $status === 401 => 'Sesión expirada. Inicia sesión nuevamente.',
            $status === 403 => 'No tienes permiso para esta acción.',
            $status === 404 => 'No se encontró lo solicitado.',
            $status === 419 => 'La sesión expiró. Recarga la página e inténtalo de nuevo.',
            $status === 422 => 'Revisa los datos ingresados e inténtalo de nuevo.',
            $status === 429 => 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
            $status === 503 => 'El servicio no está disponible. Inténtalo más tarde.',
            default => 'No se pudo completar la operación. Inténtalo más tarde.',
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{message: string, errors?: array<string, list<string>>}
     */
    public static function sanitizePayload(array $payload, int $status): array
    {
        unset(
            $payload['exception'],
            $payload['file'],
            $payload['line'],
            $payload['trace'],
            $payload['previous'],
            $payload['sql'],
            $payload['bindings'],
            $payload['connection'],
            $payload['connectionName'],
            $payload['errorInfo'],
        );

        $errors = [];
        if (isset($payload['errors']) && is_array($payload['errors'])) {
            foreach ($payload['errors'] as $field => $messages) {
                if (! is_string($field) && ! is_int($field)) {
                    continue;
                }

                $clean = [];
                foreach ((array) $messages as $message) {
                    if (is_string($message) && $message !== '' && ! self::isTechnical($message)) {
                        $clean[] = $message;
                    }
                }

                if ($clean !== []) {
                    $errors[(string) $field] = $clean;
                }
            }
        }

        $message = is_string($payload['message'] ?? null) ? $payload['message'] : null;
        $result = [
            'message' => self::humanMessage($status, $message, $errors !== []),
        ];

        if ($errors !== []) {
            $result['errors'] = $errors;
        }

        return $result;
    }
}
