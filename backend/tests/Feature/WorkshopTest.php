<?php

namespace Tests\Feature;

use App\Models\MediaLibraryItem;
use App\Models\SchoolCourse;
use App\Models\SchoolLevel;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkshopTest extends TestCase
{
    use RefreshDatabase;

    public function test_professional_can_create_workshop_and_see_the_course(): void
    {
        Storage::fake('public');
        [$professional, $course] = $this->makeCourseContext();

        Sanctum::actingAs($professional);

        $file = UploadedFile::fake()->create('taller.pdf', 200, 'application/pdf');

        $this->post('/api/workshops', [
            'name' => 'Taller de conciencia fonológica',
            'objective' => 'Reconocer sonidos iniciales',
            'description' => 'Actividad grupal en sala',
            'held_on' => '2026-09-11',
            'school_course_id' => $course->id,
            'file' => $file,
        ])
            ->assertCreated()
            ->assertJsonPath('name', 'Taller de conciencia fonológica')
            ->assertJsonPath('has_material', true)
            ->assertJsonPath('course.id', $course->id);

        $this->getJson('/api/workshop-courses')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $course->id)
            ->assertJsonPath('0.workshops_count', 1);

        $this->getJson("/api/workshops?school_course_id={$course->id}")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Taller de conciencia fonológica');
    }

    public function test_professional_can_update_workshop_with_post_fallback(): void
    {
        Storage::fake('public');
        [$professional, $course] = $this->makeCourseContext();
        Sanctum::actingAs($professional);

        $workshop = Workshop::query()->create([
            'user_id' => $professional->id,
            'school_course_id' => $course->id,
            'name' => 'Taller original',
            'objective' => 'Objetivo inicial',
            'description' => 'Descripción inicial',
            'held_on' => '2026-09-01',
        ]);

        $this->post("/api/workshops/{$workshop->id}", [
            'name' => 'Taller actualizado',
            'objective' => 'Nuevo objetivo',
            'description' => 'Nueva descripción',
            'held_on' => '2026-09-02',
            'school_course_id' => $course->id,
        ])
            ->assertOk()
            ->assertJsonPath('name', 'Taller actualizado')
            ->assertJsonPath('objective', 'Nuevo objetivo');
    }

    public function test_professional_cannot_see_another_users_workshops(): void
    {
        [$owner, $course] = $this->makeCourseContext();
        $other = User::factory()->create([
            'role' => 'profesional',
            'rut' => '22.222.222-2',
        ]);

        Workshop::query()->create([
            'user_id' => $owner->id,
            'school_course_id' => $course->id,
            'name' => 'Taller ajeno',
            'held_on' => '2026-09-01',
        ]);

        Sanctum::actingAs($other);

        $this->getJson('/api/workshop-courses')
            ->assertOk()
            ->assertJsonCount(0);

        $this->getJson("/api/workshops?school_course_id={$course->id}")
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_professional_can_store_and_update_workshop_urls(): void
    {
        [$professional, $course] = $this->makeCourseContext();
        Sanctum::actingAs($professional);

        $created = $this->post('/api/workshops', [
            'name' => 'Taller con enlaces',
            'held_on' => '2026-09-11',
            'school_course_id' => $course->id,
            'urls' => ['https://ejemplo.cl/recurso-1', 'https://ejemplo.cl/recurso-2'],
        ])->assertCreated()->json();

        $this->assertSame(
            ['https://ejemplo.cl/recurso-1', 'https://ejemplo.cl/recurso-2'],
            $created['urls']
        );

        $this->getJson("/api/workshops/{$created['id']}")
            ->assertOk()
            ->assertJsonPath('urls.0', 'https://ejemplo.cl/recurso-1');

        $this->post("/api/workshops/{$created['id']}", [
            'name' => 'Taller con enlaces',
            'held_on' => '2026-09-11',
            'school_course_id' => $course->id,
            'urls' => ['https://ejemplo.cl/actualizado'],
        ])
            ->assertOk()
            ->assertJsonPath('urls.0', 'https://ejemplo.cl/actualizado')
            ->assertJsonCount(1, 'urls');
    }

    public function test_professional_can_download_workshop_file_and_reject_invalid_type(): void
    {
        Storage::fake('public');
        [$professional, $course] = $this->makeCourseContext();
        Sanctum::actingAs($professional);

        $file = UploadedFile::fake()->create('apoyo.pdf', 80, 'application/pdf');

        $created = $this->post('/api/workshops', [
            'name' => 'Taller con archivo',
            'held_on' => '2026-09-11',
            'school_course_id' => $course->id,
            'file' => $file,
        ])->assertCreated()->json();

        $this->get("/api/workshops/{$created['id']}/download")
            ->assertOk()
            ->assertHeader('content-disposition');

        $this->getJson('/api/media-library')
            ->assertOk()
            ->assertJsonFragment(['original_name' => 'apoyo.pdf'])
            ->assertJsonPath('0.workshops_count', 1);

        $invalid = UploadedFile::fake()->create('apoyo.txt', 20, 'text/plain');

        $this->post("/api/workshops/{$created['id']}", [
            'name' => 'Taller con archivo',
            'held_on' => '2026-09-11',
            'school_course_id' => $course->id,
            'file' => $invalid,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }

    public function test_professional_can_delete_workshop_and_file(): void
    {
        Storage::fake('public');
        [$professional, $course] = $this->makeCourseContext();
        Sanctum::actingAs($professional);

        $file = UploadedFile::fake()->create('apoyo.pptx', 120, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');

        $created = $this->post('/api/workshops', [
            'name' => 'Taller con ppt',
            'held_on' => '2026-09-11',
            'school_course_id' => $course->id,
            'file' => $file,
        ])->assertCreated()->json();

        $workshop = Workshop::query()->findOrFail($created['id']);
        Storage::disk('public')->assertExists($workshop->storage_path);
        $this->assertNotNull($workshop->media_library_item_id);
        $this->assertDatabaseHas('media_library_items', ['id' => $workshop->media_library_item_id]);

        $this->deleteJson("/api/workshops/{$workshop->id}")->assertNoContent();

        $this->assertDatabaseMissing('workshops', ['id' => $workshop->id]);
        $this->assertDatabaseHas('media_library_items', ['id' => $workshop->media_library_item_id]);
        Storage::disk('public')->assertExists($workshop->storage_path);
    }

    public function test_professional_can_attach_existing_media_library_item(): void
    {
        Storage::fake('public');
        [$professional, $course] = $this->makeCourseContext();
        Sanctum::actingAs($professional);

        $item = MediaLibraryItem::query()->create([
            'user_id' => $professional->id,
            'title' => 'Guía existente',
            'original_name' => 'guia.pdf',
            'stored_name' => 'guia.pdf',
            'storage_path' => 'media-library/'.$professional->id.'/guia.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 80,
        ]);
        Storage::disk('public')->put($item->storage_path, 'pdf-demo');

        $created = $this->post('/api/workshops', [
            'name' => 'Taller con recurso de biblioteca',
            'held_on' => '2026-09-11',
            'school_course_id' => $course->id,
            'media_library_item_id' => $item->id,
        ])->assertCreated()->json();

        $this->assertSame($item->id, $created['media_library_item_id']);
        $this->assertTrue($created['has_material']);

        $this->get("/api/workshops/{$created['id']}/download")
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    /**
     * @return array{0: User, 1: SchoolCourse}
     */
    private function makeCourseContext(): array
    {
        $professional = User::factory()->create([
            'role' => 'profesional',
            'rut' => '11.111.111-1',
        ]);

        $level = SchoolLevel::query()->create([
            'name' => 'basica',
            'display_name' => 'Basica',
        ]);

        $course = SchoolCourse::query()->create([
            'school_level_id' => $level->id,
            'grade' => '1',
            'section' => 'A',
            'display_name' => '1 Basica A',
        ]);

        return [$professional, $course];
    }
}
