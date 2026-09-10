<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (! in_array(\Illuminate\Foundation\Testing\RefreshDatabase::class, class_uses_recursive(static::class), true)) {
            return;
        }

        $connection = (string) config('database.default');
        $database = (string) config("database.connections.{$connection}.database");

        if ($connection !== 'sqlite' || $database !== ':memory:') {
            throw new \RuntimeException(
                "RefreshDatabase blocked: tests must use sqlite :memory:, got {$connection}/{$database}."
            );
        }
    }
}
