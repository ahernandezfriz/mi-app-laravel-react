<?php

namespace App\Support;

use Carbon\Carbon;

final class ExactAge
{
    /**
     * Formato: "7 años 3 meses 20 días"
     */
    public static function format(mixed $birthDate, mixed $reference = null): ?string
    {
        if ($birthDate === null || $birthDate === '') {
            return null;
        }

        try {
            $birth = Carbon::parse($birthDate)->startOfDay();
            $ref = $reference
                ? Carbon::parse($reference)->startOfDay()
                : Carbon::now('America/Santiago')->startOfDay();
        } catch (\Throwable) {
            return null;
        }

        if ($birth->greaterThan($ref)) {
            return null;
        }

        $years = $ref->year - $birth->year;
        $months = $ref->month - $birth->month;
        $days = $ref->day - $birth->day;

        if ($days < 0) {
            $months--;
            $previousMonth = $ref->copy()->subMonthNoOverflow();
            $days += $previousMonth->daysInMonth;
        }

        if ($months < 0) {
            $years--;
            $months += 12;
        }

        return sprintf(
            '%d %s %d %s %d %s',
            $years,
            self::plural($years, 'año', 'años'),
            $months,
            self::plural($months, 'mes', 'meses'),
            $days,
            self::plural($days, 'día', 'días')
        );
    }

    private static function plural(int $count, string $one, string $many): string
    {
        return $count === 1 ? $one : $many;
    }
}
