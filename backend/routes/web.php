<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/app/');
});

// Si alguien entra o recarga sin el prefijo /app (URL legacy), redirigir a la SPA.
Route::get('/dashboard/{any?}', function (?string $any = null) {
    $target = '/app/dashboard/'.($any ?: 'overview');
    $query = request()->getQueryString();

    return redirect($query ? "{$target}?{$query}" : $target);
})->where('any', '.*');

Route::redirect('/login', '/app/login');
Route::redirect('/register', '/app/register');
Route::redirect('/forgot-password', '/app/forgot-password');
