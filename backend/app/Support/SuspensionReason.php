<?php

namespace App\Support;

final class SuspensionReason
{
    public const ABSENT = 'estudiante_ausente';

    public const SCHOOL_ACTIVITY = 'actividad_escolar_suspension';

    public static function parse(?string $generalObservation): ?string
    {
        $normalized = mb_strtolower((string) $generalObservation);

        if ($normalized === '') {
            return null;
        }

        if (preg_match('/motivo de suspensi[oó]n:\s*([a-z0-9_]+)/u', $normalized, $match) === 1) {
            $token = $match[1];
            if ($token === 'estudiante_ausente') {
                return self::ABSENT;
            }
            if ($token === 'actividad_escolar' || $token === 'actividad_escolar_suspension') {
                return self::SCHOOL_ACTIVITY;
            }
        }

        if (str_contains($normalized, 'actividad escolar') || str_contains($normalized, 'actividad_escolar')) {
            return self::SCHOOL_ACTIVITY;
        }

        if (str_contains($normalized, 'estudiante ausente') || str_contains($normalized, 'estudiante_ausente')) {
            return self::ABSENT;
        }

        return null;
    }

    public static function label(?string $reason): string
    {
        return match ($reason) {
            self::ABSENT => 'Estudiante ausente',
            self::SCHOOL_ACTIVITY => 'Actividad escolar/suspensión',
            default => 'Sin motivo',
        };
    }
}
