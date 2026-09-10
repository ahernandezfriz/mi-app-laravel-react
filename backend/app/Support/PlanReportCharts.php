<?php

namespace App\Support;

use Illuminate\Support\Collection;

final class PlanReportCharts
{
    private const RATING_SCORE = [
        'con_dificultad' => 1,
        'por_lograr' => 2,
        'logrado' => 3,
    ];

    /**
     * @param  Collection<int, \App\Models\TherapySession>  $sessions
     * @return array<string, mixed>
     */
    public static function build(Collection $sessions): array
    {
        $normalized = $sessions->map(function ($session) {
            $status = $session->status === 'draft' ? 'pendiente' : $session->status;
            $reason = $status === 'suspendida'
                ? SuspensionReason::parse($session->general_observation)
                : null;

            return [
                'id' => $session->id,
                'date' => (string) $session->session_date,
                'status' => $status,
                'reason' => $reason,
                'averageScore' => self::averageScore($session->tasks ?? new Collection()),
            ];
        });

        $finalized = $normalized->where('status', 'finalizada');
        $suspended = $normalized->where('status', 'suspendida');
        $absent = $suspended->where('reason', SuspensionReason::ABSENT);
        $activity = $suspended->where('reason', SuspensionReason::SCHOOL_ACTIVITY);
        $unknown = max($suspended->count() - $absent->count() - $activity->count(), 0);

        $finalizedCount = $finalized->count();
        $absentCount = $absent->count();
        $activityCount = $activity->count();
        $suspendedTotal = $suspended->count();
        $total = $normalized->count();
        $assistanceBase = $finalizedCount + $absentCount;

        $attendancePercent = $assistanceBase > 0 ? (int) round(($finalizedCount / $assistanceBase) * 100) : 0;
        $suspensionPercent = $assistanceBase > 0 ? 100 - $attendancePercent : 0;
        $globalAttendancePercent = $total > 0 ? (int) round(($finalizedCount / $total) * 100) : 0;
        $globalAbsentPercent = $total > 0 ? (int) round(($absentCount / $total) * 100) : 0;
        $globalActivityPercent = $total > 0 ? (int) round(($activityCount / $total) * 100) : 0;

        $globalSegments = self::percentSegments([
            ['key' => 'global_asistencia', 'label' => 'Sesiones realizadas', 'count' => $finalizedCount, 'percent' => $globalAttendancePercent, 'color' => '#10b981', 'value' => $globalAttendancePercent.'%'],
            ['key' => 'global_inasistencia', 'label' => 'Suspensión por inasistencia', 'count' => $absentCount, 'percent' => $globalAbsentPercent, 'color' => '#f59e0b', 'value' => $globalAbsentPercent.'%'],
            ['key' => 'global_actividad', 'label' => 'Suspensión por actividad', 'count' => $activityCount, 'percent' => $globalActivityPercent, 'color' => '#d946ef', 'value' => $globalActivityPercent.'%'],
        ]);

        $attendanceSegments = self::shareSegments([
            ['key' => 'asistencia', 'label' => 'Sesiones realizadas', 'count' => $finalizedCount, 'color' => '#10b981', 'value' => $attendancePercent.'%'],
            ['key' => 'inasistencia', 'label' => 'Inasistencia', 'count' => $absentCount, 'color' => '#f59e0b', 'value' => $suspensionPercent.'%'],
        ], $assistanceBase);

        $suspensionSegments = self::shareSegments([
            ['key' => 'ausente', 'label' => 'Estudiante ausente', 'count' => $absentCount, 'color' => '#ef4444', 'value' => (string) $absentCount],
            ['key' => 'actividad', 'label' => 'Actividad escolar/suspensión', 'count' => $activityCount, 'color' => '#d946ef', 'value' => (string) $activityCount],
            ['key' => 'sin_motivo', 'label' => 'Sin motivo', 'count' => $unknown, 'color' => '#94a3b8', 'value' => (string) $unknown],
        ], $suspendedTotal);

        $line = self::lineChart($normalized);
        $line['image'] = PdfChartRenderer::timelineDataUri(
            self::timelineImageEvents($line['events']),
            $line['width'],
            $line['height']
        );

        return [
            'totals' => [
                'all' => $total,
                'finalized' => $finalizedCount,
                'pending' => $total - $finalizedCount,
                'assistanceBase' => $assistanceBase,
            ],
            'global' => [
                'segments' => $globalSegments,
                'image' => PdfChartRenderer::donutDataUri($globalSegments),
                'attendancePercent' => $globalAttendancePercent,
                'absentPercent' => $globalAbsentPercent,
                'activityPercent' => $globalActivityPercent,
                'total' => $total,
            ],
            'attendance' => [
                'segments' => $attendanceSegments,
                'image' => PdfChartRenderer::donutDataUri($attendanceSegments),
                'attendancePercent' => $attendancePercent,
                'suspensionPercent' => $suspensionPercent,
                'finalized' => $finalizedCount,
                'base' => $assistanceBase,
            ],
            'suspension' => [
                'segments' => $suspensionSegments,
                'image' => PdfChartRenderer::donutDataUri($suspensionSegments),
                'absent' => $absentCount,
                'activity' => $activityCount,
                'unknown' => $unknown,
                'total' => $suspendedTotal,
            ],
            'line' => $line,
        ];
    }

    /**
     * @param  Collection<int, mixed>  $tasks
     */
    private static function averageScore(Collection $tasks): ?float
    {
        $scores = $tasks
            ->map(fn ($task) => self::RATING_SCORE[$task->rating ?? ''] ?? null)
            ->filter(fn ($score) => $score !== null)
            ->values();

        if ($scores->isEmpty()) {
            return null;
        }

        return $scores->sum() / $scores->count();
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private static function percentSegments(array $rows): array
    {
        return array_values(array_filter($rows, fn (array $row) => ($row['count'] ?? 0) > 0));
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private static function shareSegments(array $rows, int $base): array
    {
        if ($base <= 0) {
            return [];
        }

        $raw = array_values(array_filter($rows, fn (array $row) => ($row['count'] ?? 0) > 0));
        $used = 0;
        $lastIndex = count($raw) - 1;

        return array_map(function (array $segment, int $index) use ($base, &$used, $lastIndex) {
            $percent = $index === $lastIndex
                ? max(100 - $used, 0)
                : (int) round(($segment['count'] / $base) * 100);
            $used += $percent;

            return [...$segment, 'percent' => $percent];
        }, $raw, array_keys($raw));
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $normalized
     * @return array<string, mixed>
     */
    private static function lineChart(Collection $normalized): array
    {
        $width = 720;
        $height = 200;
        $padding = 28;

        $timeline = $normalized
            ->filter(function (array $entry) {
                $isFinalized = $entry['status'] === 'finalizada' && $entry['averageScore'] !== null;
                $isSuspended = $entry['status'] === 'suspendida';

                return $isFinalized || $isSuspended;
            })
            ->sortBy(fn (array $entry) => sprintf('%s-%010d', $entry['date'], $entry['id']))
            ->values();

        $count = $timeline->count();
        $events = $timeline->values()->map(function (array $entry, int $index) use ($count, $width, $height, $padding) {
            $x = $padding + ($count > 1
                ? ($index / ($count - 1)) * ($width - $padding * 2)
                : ($width - $padding * 2) / 2);

            $dateLabel = self::formatDate($entry['date']);

            if ($entry['status'] === 'suspendida') {
                $color = match ($entry['reason']) {
                    SuspensionReason::ABSENT => '#f59e0b',
                    SuspensionReason::SCHOOL_ACTIVITY => '#d946ef',
                    default => '#f43f5e',
                };

                return [
                    'kind' => 'suspension',
                    'x' => round($x, 2),
                    'y' => $height - $padding,
                    'color' => $color,
                    'label' => $dateLabel,
                    'detail' => SuspensionReason::label($entry['reason']),
                    'percent' => 0,
                ];
            }

            $normalizedScore = (($entry['averageScore'] - 1) / 2) * ($height - $padding * 2);
            $y = $height - $padding - $normalizedScore;
            $percent = (int) round((($entry['averageScore'] - 1) / 2) * 100);

            return [
                'kind' => 'performance',
                'x' => round($x, 2),
                'y' => round($y, 2),
                'color' => '#a21caf',
                'label' => $dateLabel,
                'detail' => $percent.'%',
                'percent' => $percent,
            ];
        });

        $points = $events->where('kind', 'performance')->values();
        $suspensions = $events->where('kind', 'suspension')->values();

        return [
            'width' => $width,
            'height' => $height,
            'padding' => $padding,
            'hasData' => $events->isNotEmpty(),
            'events' => $events->all(),
            'points' => $points->all(),
            'suspensions' => $suspensions->all(),
            'polyline' => $points->map(fn (array $point) => $point['x'].','.$point['y'])->implode(' '),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $events
     * @return list<array<string, mixed>>
     */
    private static function timelineImageEvents(array $events): array
    {
        return array_map(fn (array $event): array => [
            'kind' => $event['kind'],
            'date_label' => $event['label'],
            'percent' => (int) ($event['percent'] ?? 0),
            'color' => $event['color'],
        ], $events);
    }

    private static function formatDate(string $date): string
    {
        $parts = explode('-', substr($date, 0, 10));
        if (count($parts) !== 3) {
            return $date;
        }

        return $parts[2].'-'.$parts[1].'-'.$parts[0];
    }
}
