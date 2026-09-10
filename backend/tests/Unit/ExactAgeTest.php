<?php

namespace Tests\Unit;

use App\Support\ExactAge;
use PHPUnit\Framework\TestCase;

class ExactAgeTest extends TestCase
{
    public function test_formats_age_at_a_session_reference_date(): void
    {
        $this->assertSame(
            '7 años 3 meses 20 días',
            ExactAge::format('2018-01-15', '2025-05-05')
        );
    }

    public function test_returns_null_without_birth_date(): void
    {
        $this->assertNull(ExactAge::format(null, '2025-05-05'));
        $this->assertNull(ExactAge::format('', '2025-05-05'));
    }
}
