<?php

namespace App\Support;

use App\Models\SchoolCourse;
use App\Models\SchoolLevel;

class SchoolCourseProgression
{
    /**
     * @var list<array{0: string, 1: string}>
     */
    public const SEQUENCE = [
        ['prebasica', 'Prekinder'],
        ['prebasica', 'Kinder'],
        ['basica', '1'],
        ['basica', '2'],
        ['basica', '3'],
        ['basica', '4'],
        ['basica', '5'],
        ['basica', '6'],
        ['basica', '7'],
        ['basica', '8'],
        ['media', '1'],
        ['media', '2'],
        ['media', '3'],
        ['media', '4'],
    ];

    public static function next(?SchoolCourse $course): ?SchoolCourse
    {
        if (! $course) {
            return null;
        }

        $course->loadMissing('level');
        $levelName = $course->level?->name;
        if (! $levelName) {
            return null;
        }

        $index = self::indexOf($levelName, (string) $course->grade);
        if ($index === null || $index >= count(self::SEQUENCE) - 1) {
            return null;
        }

        [$nextLevelName, $nextGrade] = self::SEQUENCE[$index + 1];

        $nextLevel = SchoolLevel::query()->where('name', $nextLevelName)->first();
        if (! $nextLevel) {
            return null;
        }

        return SchoolCourse::query()
            ->where('school_level_id', $nextLevel->id)
            ->where('grade', $nextGrade)
            ->where('section', $course->section)
            ->first();
    }

    public static function indexOf(string $levelName, string $grade): ?int
    {
        foreach (self::SEQUENCE as $index => [$sequenceLevel, $sequenceGrade]) {
            if ($sequenceLevel === $levelName && $sequenceGrade === $grade) {
                return $index;
            }
        }

        return null;
    }
}
