<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Si este archivo se copia por error a /app/, no cargar Laravel:
// ahi no hay vendor y open_basedir bloquea __DIR__/../vendor.
if (basename(__DIR__) === 'app') {
    $html = __DIR__.'/index.html';
    if (is_file($html)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($html);
        exit;
    }

    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "index.php de Laravel no debe estar en /app/.\n";
    echo "Usa el de la RAIZ del dominio (public_html) y deja en /app/ solo React.\n";
    exit;
}

if (
    empty($_SERVER['HTTP_AUTHORIZATION'])
    && ! empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])
) {
    $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

$candidates = [
    dirname(__DIR__),
    '/home/arielhfc/apps_laravel/sistema_pie',
];

$laravel = null;
foreach ($candidates as $root) {
    if (is_file($root.'/vendor/autoload.php') && is_file($root.'/bootstrap/app.php')) {
        $laravel = $root;
        break;
    }
}

if ($laravel === null) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "No se encontro vendor/autoload.php.\n";
    echo "Este archivo debe estar en la RAIZ del dominio, no dentro de /app/.\n";
    echo "Laravel en cPanel: /home/arielhfc/apps_laravel/sistema_pie\n";
    exit;
}

if (file_exists($maintenance = $laravel.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $laravel.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $laravel.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
