<?php

namespace App\Support;

final class ChileanRut
{
    /** RUT comodín temporal: válido y reutilizable en estudiantes. */
    public const WILDCARD = '1.111.111-1';

    public static function clean(?string $value): string
    {
        $clean = strtoupper(trim((string) $value));
        $clean = str_replace(['.', '-', ' '], '', $clean);

        return $clean;
    }

    public static function isWildcard(?string $value): bool
    {
        return self::clean($value) === self::clean(self::WILDCARD);
    }

    public static function computeDv(string $body): string
    {
        $body = preg_replace('/\D/', '', $body) ?? '';
        if ($body === '') {
            return '';
        }

        $sum = 0;
        $multiplier = 2;
        for ($i = strlen($body) - 1; $i >= 0; $i--) {
            $sum += (int) $body[$i] * $multiplier;
            $multiplier = $multiplier === 7 ? 2 : $multiplier + 1;
        }

        $remainder = 11 - ($sum % 11);
        if ($remainder === 11) {
            return '0';
        }
        if ($remainder === 10) {
            return 'K';
        }

        return (string) $remainder;
    }

    public static function format(?string $value): string
    {
        $clean = self::clean($value);
        if ($clean === '') {
            return '';
        }

        $body = substr($clean, 0, -1);
        $dv = substr($clean, -1);
        $body = preg_replace('/\D/', '', $body) ?? '';
        if ($body === '') {
            return $dv;
        }

        $reversed = strrev($body);
        $chunks = str_split($reversed, 3);
        $withDots = strrev(implode('.', $chunks));

        return $withDots.'-'.$dv;
    }

    public static function isValid(?string $value): bool
    {
        if (self::isWildcard($value)) {
            return true;
        }

        $clean = self::clean($value);
        if (! preg_match('/^\d{7,8}[0-9K]$/', $clean)) {
            return false;
        }

        $body = substr($clean, 0, -1);
        $dv = substr($clean, -1);

        if (preg_match('/^0+$/', $body)) {
            return false;
        }

        return self::computeDv($body) === $dv;
    }
}
