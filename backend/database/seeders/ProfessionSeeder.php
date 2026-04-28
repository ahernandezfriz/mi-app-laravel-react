<?php

namespace Database\Seeders;

use App\Models\Profession;
use Illuminate\Database\Seeder;

class ProfessionSeeder extends Seeder
{
    public function run(): void
    {
        $professions = [
            'Fonoaudiologo/a',
            'Kinesiologo/a',
            'Terapeuta ocupacional',
            'Psicologo/a',
        ];

        foreach ($professions as $profession) {
            Profession::query()->firstOrCreate(['name' => $profession]);
        }
    }
}
