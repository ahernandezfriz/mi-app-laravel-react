<?php

namespace App\Support;

final class PdfChartRenderer
{
    /**
     * @param  list<array{percent?: float|int, color?: string}>  $segments
     */
    public static function donutDataUri(array $segments, int $size = 96): string
    {
        $segments = array_values(array_filter(
            $segments,
            fn (array $segment): bool => (float) ($segment['percent'] ?? 0) > 0
        ));

        if (function_exists('imagecreatetruecolor')) {
            return self::pngDataUri(self::renderDonutPng($segments, $size));
        }

        return self::svgDataUri(self::renderDonutSvg($segments, $size));
    }

    /**
     * @param  list<array<string, mixed>>  $events
     */
    public static function timelineDataUri(array $events, int $width = 640, int $height = 200): ?string
    {
        if ($events === []) {
            return null;
        }

        if (function_exists('imagecreatetruecolor')) {
            return self::pngDataUri(self::renderTimelinePng($events, $width, $height));
        }

        return self::svgDataUri(self::renderTimelineSvg($events, $width, $height), $width, $height);
    }

    /**
     * @param  list<array{percent?: float|int, color?: string}>  $segments
     */
    private static function renderDonutPng(array $segments, int $size): string
    {
        $scale = 4;
        $canvas = $size * $scale;
        $image = imagecreatetruecolor($canvas, $canvas);
        if (function_exists('imageantialias')) {
            imageantialias($image, true);
        }

        $white = imagecolorallocate($image, 255, 255, 255);
        imagefilledrectangle($image, 0, 0, $canvas, $canvas, $white);

        $cx = (int) ($canvas / 2);
        $cy = (int) ($canvas / 2);
        $diameter = (int) ($canvas * 0.92);
        $inner = (int) ($canvas * 0.54);
        $track = self::allocate($image, '#e2e8f0');
        imagefilledellipse($image, $cx, $cy, $diameter, $diameter, $track);

        $angle = -90.0;
        $used = 0.0;
        foreach ($segments as $segment) {
            $percent = max(0.0, min(100.0 - $used, (float) $segment['percent']));
            if ($percent <= 0) {
                continue;
            }

            $color = self::allocate($image, (string) ($segment['color'] ?? '#94a3b8'));
            if ($percent >= 99.5) {
                imagefilledellipse($image, $cx, $cy, $diameter, $diameter, $color);
            } else {
                $start = (int) round($angle);
                $end = (int) round($angle + ($percent * 3.6));
                if ($end > $start) {
                    imagefilledarc($image, $cx, $cy, $diameter, $diameter, $start, $end, $color, IMG_ARC_PIE);
                }
            }

            $angle += $percent * 3.6;
            $used += $percent;
        }

        imagefilledellipse($image, $cx, $cy, $inner, $inner, $white);

        $out = imagecreatetruecolor($size, $size);
        imagecopyresampled($out, $image, 0, 0, 0, 0, $size, $size, $canvas, $canvas);

        ob_start();
        imagepng($out);
        $png = (string) ob_get_clean();
        imagedestroy($image);
        imagedestroy($out);

        return $png;
    }

    /**
     * @param  list<array<string, mixed>>  $events
     */
    private static function renderTimelinePng(array $events, int $width, int $height): string
    {
        $image = imagecreatetruecolor($width, $height);
        if (function_exists('imageantialias')) {
            imageantialias($image, true);
        }

        $white = imagecolorallocate($image, 255, 255, 255);
        $axis = self::allocate($image, '#cbd5e1');
        $grid = self::allocate($image, '#fde68a');
        $label = self::allocate($image, '#475569');
        $line = self::allocate($image, '#a21caf');
        imagefilledrectangle($image, 0, 0, $width, $height, $white);

        $padding = 32;
        $left = $padding;
        $right = $width - $padding;
        $top = $padding;
        $bottom = $height - $padding;

        imageline($image, $left, $bottom, $right, $bottom, $axis);
        imageline($image, $left, $top, $left, $bottom, $axis);
        imageline($image, $left, $bottom, $right, $bottom, $grid);
        imageline($image, $left, (int) (($top + $bottom) / 2), $right, (int) (($top + $bottom) / 2), $grid);
        imageline($image, $left, $top, $right, $top, $grid);

        $count = count($events);
        $points = [];
        foreach ($events as $index => $event) {
            $x = (int) round(
                $count > 1
                    ? $left + ($index / ($count - 1)) * ($right - $left)
                    : $left + (($right - $left) / 2)
            );

            if (($event['kind'] ?? '') === 'suspension') {
                $y = $bottom;
                $color = self::allocate($image, (string) ($event['color'] ?? '#f59e0b'));
                imageline($image, $x, $top, $x, $bottom, $color);
                $diamond = [
                    $x, $y - 7,
                    $x + 7, $y,
                    $x, $y + 7,
                    $x - 7, $y,
                ];
                imagefilledpolygon($image, $diamond, $color);
            } else {
                $percent = max(0, min(100, (int) ($event['percent'] ?? 0)));
                $y = (int) round($bottom - (($percent / 100) * ($bottom - $top)));
                $points[] = ['x' => $x, 'y' => $y];
            }

            self::drawText($image, (string) ($event['date_label'] ?? ''), $x - 22, $height - 16, $label, 8);
        }

        if (count($points) > 1) {
            imagesetthickness($image, 3);
            for ($i = 1, $total = count($points); $i < $total; $i++) {
                imageline($image, $points[$i - 1]['x'], $points[$i - 1]['y'], $points[$i]['x'], $points[$i]['y'], $line);
            }
            imagesetthickness($image, 1);
        }

        foreach ($points as $point) {
            imagefilledellipse($image, $point['x'], $point['y'], 11, 11, $line);
            imageellipse($image, $point['x'], $point['y'], 11, 11, $white);
        }

        self::drawText($image, '100%', 4, $top - 2, $label, 8);
        self::drawText($image, '50%', 8, (int) (($top + $bottom) / 2) - 4, $label, 8);
        self::drawText($image, '0%', 12, $bottom - 4, $label, 8);

        ob_start();
        imagepng($image);
        $png = (string) ob_get_clean();
        imagedestroy($image);

        return $png;
    }

    /**
     * @param  list<array{percent?: float|int, color?: string}>  $segments
     */
    private static function renderDonutSvg(array $segments, int $size): string
    {
        $cx = $size / 2;
        $cy = $size / 2;
        $outer = $size * 0.42;
        $inner = $size * 0.26;
        $parts = [self::ringPolygon($cx, $cy, $outer, $inner, -90, 270, '#e2e8f0')];

        $start = -90.0;
        $used = 0.0;
        foreach ($segments as $segment) {
            $percent = max(0.0, min(100.0 - $used, (float) $segment['percent']));
            if ($percent <= 0) {
                continue;
            }
            $end = $start + ($percent * 3.6);
            $color = htmlspecialchars((string) ($segment['color'] ?? '#94a3b8'), ENT_QUOTES, 'UTF-8');
            $parts[] = self::ringPolygon($cx, $cy, $outer, $inner, $start, $end, $color);
            $start = $end;
            $used += $percent;
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" width="'.$size.'" height="'.$size.'" viewBox="0 0 '.$size.' '.$size.'">'.implode('', $parts).'</svg>';
    }

    /**
     * @param  list<array<string, mixed>>  $events
     */
    private static function renderTimelineSvg(array $events, int $width, int $height): string
    {
        $padding = 32;
        $left = $padding;
        $right = $width - $padding;
        $top = $padding;
        $bottom = $height - $padding;
        $count = count($events);
        $markup = [];
        $markup[] = '<rect width="'.$width.'" height="'.$height.'" fill="#ffffff"/>';
        $markup[] = '<line x1="'.$left.'" y1="'.$bottom.'" x2="'.$right.'" y2="'.$bottom.'" stroke="#cbd5e1" stroke-width="1"/>';
        $markup[] = '<line x1="'.$left.'" y1="'.$top.'" x2="'.$left.'" y2="'.$bottom.'" stroke="#cbd5e1" stroke-width="1"/>';
        $markup[] = '<line x1="'.$left.'" y1="'.$top.'" x2="'.$right.'" y2="'.$top.'" stroke="#fde68a" stroke-width="1"/>';
        $markup[] = '<line x1="'.$left.'" y1="'.(($top + $bottom) / 2).'" x2="'.$right.'" y2="'.(($top + $bottom) / 2).'" stroke="#fde68a" stroke-width="1"/>';

        $performance = [];
        foreach ($events as $index => $event) {
            $x = $count > 1
                ? $left + ($index / ($count - 1)) * ($right - $left)
                : $left + (($right - $left) / 2);

            if (($event['kind'] ?? '') === 'suspension') {
                $color = htmlspecialchars((string) ($event['color'] ?? '#f59e0b'), ENT_QUOTES, 'UTF-8');
                $markup[] = '<line x1="'.$x.'" y1="'.$top.'" x2="'.$x.'" y2="'.$bottom.'" stroke="'.$color.'" stroke-width="1.5"/>';
                $markup[] = '<polygon points="'.$x.','.($bottom - 7).' '.($x + 7).','.$bottom.' '.$x.','.($bottom + 7).' '.($x - 7).','.$bottom.'" fill="'.$color.'"/>';
            } else {
                $percent = max(0, min(100, (int) ($event['percent'] ?? 0)));
                $y = $bottom - (($percent / 100) * ($bottom - $top));
                $performance[] = ['x' => $x, 'y' => $y];
            }

            $label = htmlspecialchars((string) ($event['date_label'] ?? ''), ENT_QUOTES, 'UTF-8');
            $markup[] = '<text x="'.$x.'" y="'.($height - 8).'" text-anchor="middle" font-size="9" fill="#475569">'.$label.'</text>';
        }

        if (count($performance) > 1) {
            $points = implode(' ', array_map(fn (array $point): string => $point['x'].','.$point['y'], $performance));
            $markup[] = '<polyline fill="none" stroke="#a21caf" stroke-width="2.5" points="'.$points.'"/>';
        }

        foreach ($performance as $point) {
            $markup[] = '<circle cx="'.$point['x'].'" cy="'.$point['y'].'" r="5.5" fill="#a21caf" stroke="#ffffff" stroke-width="2"/>';
        }

        $markup[] = '<text x="8" y="'.($top + 2).'" font-size="10" fill="#475569">100%</text>';
        $markup[] = '<text x="8" y="'.((($top + $bottom) / 2) + 2).'" font-size="10" fill="#475569">50%</text>';
        $markup[] = '<text x="8" y="'.($bottom + 2).'" font-size="10" fill="#475569">0%</text>';

        return '<svg xmlns="http://www.w3.org/2000/svg" width="'.$width.'" height="'.$height.'" viewBox="0 0 '.$width.' '.$height.'">'.implode('', $markup).'</svg>';
    }

    private static function ringPolygon(float $cx, float $cy, float $outer, float $inner, float $startDeg, float $endDeg, string $color): string
    {
        $steps = max(8, (int) ceil(abs($endDeg - $startDeg) / 4));
        $points = [];
        for ($i = 0; $i <= $steps; $i++) {
            $angle = deg2rad($startDeg + (($endDeg - $startDeg) * $i / $steps));
            $points[] = ($cx + $outer * cos($angle)).','.($cy + $outer * sin($angle));
        }
        for ($i = $steps; $i >= 0; $i--) {
            $angle = deg2rad($startDeg + (($endDeg - $startDeg) * $i / $steps));
            $points[] = ($cx + $inner * cos($angle)).','.($cy + $inner * sin($angle));
        }

        return '<polygon fill="'.$color.'" points="'.implode(' ', $points).'"/>';
    }

    private static function pngDataUri(string $png): string
    {
        return 'data:image/png;base64,'.base64_encode($png);
    }

    private static function svgDataUri(string $svg, int $width = 96, int $height = 96): string
    {
        unset($width, $height);

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    private static function allocate(\GdImage $image, string $hex): int
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }

        $red = hexdec(substr($hex, 0, 2));
        $green = hexdec(substr($hex, 2, 2));
        $blue = hexdec(substr($hex, 4, 2));
        $color = imagecolorallocate($image, $red, $green, $blue);

        return $color === false ? imagecolorallocate($image, 148, 163, 184) : $color;
    }

    private static function drawText(\GdImage $image, string $text, int $x, int $y, int $color, int $size): void
    {
        $font = self::fontPath();
        if ($font !== null && function_exists('imagettftext')) {
            imagettftext($image, $size, 0, $x, $y + $size, $color, $font, $text);

            return;
        }

        imagestring($image, 2, max($x, 0), max($y, 0), $text, $color);
    }

    private static function fontPath(): ?string
    {
        $path = dirname(__DIR__, 2).'/vendor/dompdf/dompdf/lib/fonts/DejaVuSans.ttf';

        return is_file($path) ? $path : null;
    }
}
