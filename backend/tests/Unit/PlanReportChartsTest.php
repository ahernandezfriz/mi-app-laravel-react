<?php

namespace Tests\Unit;

use App\Support\PlanReportCharts;
use App\Support\SuspensionReason;
use Illuminate\Support\Collection;
use PHPUnit\Framework\TestCase;

class PlanReportChartsTest extends TestCase
{
    public function test_parses_suspension_reason_from_observation(): void
    {
        $this->assertSame(
            SuspensionReason::ABSENT,
            SuspensionReason::parse("Notas\n\nMotivo de suspensión: estudiante_ausente")
        );
        $this->assertSame(
            SuspensionReason::SCHOOL_ACTIVITY,
            SuspensionReason::parse('Motivo de suspensión: actividad_escolar')
        );
        $this->assertNull(SuspensionReason::parse(null));
    }

    public function test_builds_attendance_percent_from_finalized_and_absent_sessions(): void
    {
        $sessions = new Collection([
            $this->session(1, '2026-03-01', 'finalizada', null, ['logrado', 'logrado']),
            $this->session(2, '2026-03-08', 'suspendida', "Motivo de suspensión: estudiante_ausente", []),
            $this->session(3, '2026-03-15', 'pendiente', null, []),
        ]);

        $charts = PlanReportCharts::build($sessions);

        $this->assertSame(50, $charts['attendance']['attendancePercent']);
        $this->assertSame(50, $charts['attendance']['suspensionPercent']);
        $this->assertTrue($charts['line']['hasData']);
        $this->assertStringStartsWith('data:image/', $charts['global']['image']);
        $this->assertStringStartsWith('data:image/', $charts['attendance']['image']);
        $this->assertNotNull($charts['line']['image']);
        $this->assertStringStartsWith('data:image/', $charts['line']['image']);
    }

    /**
     * @param  array<int, string>  $ratings
     */
    private function session(int $id, string $date, string $status, ?string $observation, array $ratings): object
    {
        $tasks = new Collection(array_map(
            fn (string $rating) => (object) ['rating' => $rating],
            $ratings
        ));

        return new class($id, $date, $status, $observation, $tasks)
        {
            public function __construct(
                public int $id,
                public string $session_date,
                public string $status,
                public ?string $general_observation,
                public Collection $tasks,
            ) {}
        };
    }
}
