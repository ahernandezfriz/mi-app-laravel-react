<?php

namespace Database\Seeders;

use App\Models\SchoolCourse;
use App\Models\SchoolLevel;
use Illuminate\Database\Seeder;

class SchoolCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $levels = [
            'prebasica' => [
                'display_name' => 'Pre Basica',
                'courses' => ['Prekinder A', 'Prekinder B', 'Prekinder C', 'Kinder A', 'Kinder B', 'Kinder C'],
            ],
            'basica' => [
                'display_name' => 'Basica',
                'courses' => [
                    '1A', '1B', '1C',
                    '2A', '2B', '2C',
                    '3A', '3B', '3C',
                    '4A', '4B', '4C',
                    '5A', '5B', '5C',
                    '6A', '6B', '6C',
                    '7A', '7B', '7C',
                    '8A', '8B', '8C',
                ],
            ],
            'media' => [
                'display_name' => 'Media',
                'courses' => [
                    '1A', '1B', '1C',
                    '2A', '2B', '2C',
                    '3A', '3B', '3C',
                    '4A', '4B', '4C',
                ],
            ],
        ];

        foreach ($levels as $name => $config) {
            $level = SchoolLevel::query()->firstOrCreate([
                'name' => $name,
            ], [
                'display_name' => $config['display_name'],
            ]);

            foreach ($config['courses'] as $rawCourse) {
                [$grade, $section] = $this->parseCourse($rawCourse);

                SchoolCourse::query()->firstOrCreate([
                    'school_level_id' => $level->id,
                    'grade' => $grade,
                    'section' => $section,
                ], [
                    'display_name' => $this->formatCourse($grade, $section, $level->display_name),
                ]);
            }
        }
    }

    private function parseCourse(string $value): array
    {
        if (str_contains($value, ' ')) {
            $parts = explode(' ', $value);
            $section = array_pop($parts);

            return [implode(' ', $parts), $section];
        }

        return [substr($value, 0, -1), substr($value, -1)];
    }

    private function formatCourse(string $grade, ?string $section, string $levelDisplay): string
    {
        return trim(sprintf('%s %s %s', $grade, $levelDisplay, $section));
    }
}
