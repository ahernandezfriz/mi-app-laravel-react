<?php

namespace App\Support;

final class SuspensionReason
{
    public const ABSENT = 'estudiante_ausente';

    public const PROFESSIONAL_LEAVE = 'licencia_medica_profesional';

    public const CLASS_SUSPENSION = 'suspension_de_clases';

    public const OTHER = 'otro';

    /** @deprecated Mapped to CLASS_SUSPENSION for stored historical values. */
    public const SCHOOL_ACTIVITY = 'suspension_de_clases';

    public static function parse(?string $generalObservation): ?string
    {
        $normalized = mb_strtolower((string) $generalObservation);

        if ($normalized === '') {
            return null;
        }

        if (preg_match('/motivo de suspensi[oó]n:\s*([a-z0-9_]+)/u', $normalized, $match) === 1) {
            $canonical = self::canonicalize($match[1]);
            if ($canonical !== null) {
                return $canonical;
            }
        }

        if (str_contains($normalized, 'licencia medica') || str_contains($normalized, 'licencia médica') || str_contains($normalized, 'licencia_medica')) {
            return self::PROFESSIONAL_LEAVE;
        }

        if (str_contains($normalized, 'suspension de clases') || str_contains($normalized, 'suspensión de clases')) {
            return self::CLASS_SUSPENSION;
        }

        if (str_contains($normalized, 'actividad escolar') || str_contains($normalized, 'actividad_escolar')) {
            return self::CLASS_SUSPENSION;
        }

        if (str_contains($normalized, 'estudiante ausente') || str_contains($normalized, 'estudiante_ausente')) {
            return self::ABSENT;
        }

        return null;
    }

    public static function otherDetail(?string $generalObservation): string
    {
        if (preg_match('/motivo de suspensi[oó]n:\s*otro:\s*(.+)/iu', (string) $generalObservation, $match) === 1) {
            return trim($match[1]);
        }

        return '';
    }

    public static function notes(?string $generalObservation): string
    {
        $cleaned = preg_replace('/\n?\n?Motivo de suspensi[oó]n:\s*[^\n]+/iu', '', (string) $generalObservation);

        return trim((string) $cleaned);
    }

    public static function label(?string $reason, ?string $generalObservation = null): string
    {
        return match ($reason) {
            self::ABSENT => 'Estudiante ausente',
            self::PROFESSIONAL_LEAVE => 'Licencia médica profesional',
            self::CLASS_SUSPENSION => 'Suspensión de clases',
            self::OTHER => self::otherLabel($generalObservation),
            default => 'Sin motivo',
        };
    }

    public static function color(?string $reason): string
    {
        return match ($reason) {
            self::ABSENT => '#f59e0b',
            self::PROFESSIONAL_LEAVE => '#0ea5e9',
            self::CLASS_SUSPENSION => '#d946ef',
            self::OTHER => '#64748b',
            default => '#f43f5e',
        };
    }

    private static function otherLabel(?string $generalObservation): string
    {
        $detail = self::otherDetail($generalObservation);

        return $detail !== '' ? 'Otro: '.$detail : 'Otro';
    }

    private static function canonicalize(string $token): ?string
    {
        return match ($token) {
            'estudiante_ausente' => self::ABSENT,
            'licencia_medica_profesional' => self::PROFESSIONAL_LEAVE,
            'suspension_de_clases' => self::CLASS_SUSPENSION,
            'actividad_escolar', 'actividad_escolar_suspension' => self::CLASS_SUSPENSION,
            'otro' => self::OTHER,
            default => null,
        };
    }
}
