$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "frontend"
$backend = Join-Path $root "backend"
$appPublic = Join-Path $backend "public\app"
$backups = Join-Path $root "backups"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($Path, $Content.TrimStart() + "`n", $utf8)
}

if (-not (Test-Path $backups)) { New-Item -ItemType Directory -Path $backups | Out-Null }

Write-Host ">> [1/4] Compilando frontend..."
Push-Location $frontend
npm ci --silent
npm run build
Pop-Location

Write-Host ">> [2/4] Copiando build a backend/public/app..."
if (Test-Path $appPublic) { Remove-Item $appPublic -Recurse -Force }
New-Item -ItemType Directory -Path $appPublic -Force | Out-Null
Copy-Item (Join-Path $frontend "dist\*") $appPublic -Recurse -Force

$appHtaccess = @'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /app/
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /app/index.html [L]
</IfModule>
'@
Write-Utf8NoBom (Join-Path $appPublic ".htaccess") $appHtaccess

$frontendZip = Join-Path $backups "01-frontend-app-$stamp.zip"
if (Test-Path $frontendZip) { Remove-Item $frontendZip -Force }
Push-Location $appPublic
tar -acf $frontendZip .
Pop-Location

# ZIP para extraer en la RAIZ de public_html (crea carpeta app/ + .htaccess)
# Esto evita el 404 tipico de subir React a sistema_pie/public/app/
Write-Host ">> [2b/4] Empaquetando public_html (app/ + htaccess)..."
$publicHtmlStage = Join-Path $env:TEMP "public-html-app-$stamp"
if (Test-Path $publicHtmlStage) { Remove-Item $publicHtmlStage -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $publicHtmlStage "app") -Force | Out-Null
Copy-Item (Join-Path $appPublic "*") (Join-Path $publicHtmlStage "app") -Recurse -Force
$rootHtaccess = @'
<IfModule mod_rewrite.c>
    RewriteEngine On

    # cPanel/Apache: conservar Bearer token para Sanctum
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirigir URLs legacy sin /app hacia la SPA
    RewriteRule ^dashboard(/.*)?$ /app/dashboard$1 [R=302,L]
    RewriteRule ^login/?$ /app/login [R=302,L]
    RewriteRule ^register/?$ /app/register [R=302,L]
    RewriteRule ^forgot-password/?$ /app/forgot-password [R=302,L]

    # Archivos/carpetas reales (incluye /app/) se sirven directo
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    # Todo lo demas -> Laravel
    RewriteRule ^ index.php [L]
</IfModule>
'@
Write-Utf8NoBom (Join-Path $publicHtmlStage ".htaccess") $rootHtaccess

$publicHtmlZip = Join-Path $backups "05-public_html-extract-aqui-$stamp.zip"
if (Test-Path $publicHtmlZip) { Remove-Item $publicHtmlZip -Force }
Push-Location $publicHtmlStage
tar -acf $publicHtmlZip .
Pop-Location
Remove-Item $publicHtmlStage -Recurse -Force

Write-Host ">> [3/4] Empaquetando backend SIN vendor..."
$stage = Join-Path $env:TEMP "laravel-backend-$stamp"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

robocopy $backend $stage /E /XD node_modules .git tests vendor "storage\logs" "storage\framework\cache" "storage\framework\sessions" "storage\framework\views" "storage\app\public\media-library" "storage\app\public\session-materials" /XF .env .env.backup public.zip vendor.zip .phpunit.result.cache /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy fallo con codigo $LASTEXITCODE" }

$backendZip = Join-Path $backups "02-backend-sin-vendor-$stamp.zip"
if (Test-Path $backendZip) { Remove-Item $backendZip -Force }
Push-Location $stage
tar -acf $backendZip .
Pop-Location
Remove-Item $stage -Recurse -Force

Write-Host ">> [4/4] Exportando SQL..."
& (Join-Path $PSScriptRoot "export-sql-cpanel.ps1") | Out-Null

$sqlMigrate = Get-ChildItem $backups -Filter "migrate-cpanel-*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

$indexPublic = Join-Path $backups "index-public_html-$stamp.php"
Write-Utf8NoBom $indexPublic @'
<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// cPanel: Apache a menudo mueve Authorization a REDIRECT_HTTP_AUTHORIZATION
if (
    empty($_SERVER['HTTP_AUTHORIZATION'])
    && !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])
) {
    $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

$laravel = '/home/arielhfc/apps_laravel/sistema_pie';

if (file_exists($maintenance = $laravel.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $laravel.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $laravel.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
'@

$guia = Join-Path $backups "PASO-A-PASO-CPANEL-$stamp.txt"
@(
    "DESPLIEGUE CPANEL - DESDE CERO"
    "Generado: $stamp"
    "Dominio: https://plataformapie.arielhf.cl"
  "Laravel: /home/arielhfc/apps_laravel/sistema_pie"
  "Public:  /home/arielhfc/public_html/plataformapie.arielhf.cl"
    ""
    "=================================================="
    "PASO 1 - BASE DE DATOS (phpMyAdmin)"
    "=================================================="
    "1. cPanel -> phpMyAdmin"
    "2. Seleccionar base: arielhfc_plataformapie"
    "3. Importar: $($sqlMigrate.Name)"
    "   (solo agrega la migracion nueva session_time)"
    "4. Si la base esta vacia o quieres reemplazar TODO,"
    "   usa en su lugar: gestion_db-*-compat-final.sql"
    ""
    "=================================================="
    "PASO 2 - BACKEND (codigo PHP, sin vendor)"
    "=================================================="
    "1. Respaldar en servidor: .env y storage/app/"
    "2. Ir a /home/arielhfc/apps_laravel/sistema_pie/"
    "3. Subir y extraer: $(Split-Path $backendZip -Leaf)"
    "   (ZIP compatible Linux, sin barras invertidas)"
    "4. Si falla la extraccion: subir carpetas por FTP"
    "5. NO borrar .env de produccion"
    ""
    "=================================================="
    "PASO 3 - VENDOR (dependencias PHP) POR FTP"
    "=================================================="
    "IMPORTANTE: no uses ZIP para vendor (se corrompe/incompleto)."
    "1. Borrar carpeta vendor en servidor (o renombrar a vendor_old)"
    "2. Por FTP subir carpeta completa desde tu PC:"
    "   laravel-react-base\backend\vendor"
    "   destino: /home/arielhfc/apps_laravel/sistema_pie/vendor"
    "3. Debe existir:"
    "   vendor/symfony/deprecation-contracts/function.php"
    "4. Permisos:"
    "   - carpetas: 755"
    "   - archivos: 644"
    ""
    "Alternativa: cPanel -> Software -> Composer"
    "Ruta: apps_laravel/sistema_pie -> composer install --no-dev"
    ""
    "=================================================="
    "PASO 4 - FRONTEND (causa tipica del 404)"
    "=================================================="
    "IMPORTANTE: la web NO se sirve desde sistema_pie/public/app/"
    "Debe vivir en el documento publico del subdominio:"
    "  public_html/plataformapie.arielhf.cl/app/"
    ""
    "Opcion A (recomendada, arregla 404):"
    "1. Ir a public_html/plataformapie.arielhf.cl/  (RAIZ del subdominio)"
    "2. Subir y EXTRAER AHI: $(Split-Path $publicHtmlZip -Leaf)"
    "   -> crea carpeta app/ y deja .htaccess en la raiz"
    "3. Si ya existia app/, borrar primero su contenido o la carpeta"
    ""
    "Opcion B (manual):"
    "1. Crear/ir a public_html/plataformapie.arielhf.cl/app/"
    "2. Borrar contenido anterior"
    "3. Extraer dentro: $(Split-Path $frontendZip -Leaf)"
    "4. Asegurar .htaccess en la raiz del subdominio (ver backups/htaccess-public_html-root.txt)"
    ""
    "=================================================="
    "PASO 5 - INDEX PUBLICO"
    "=================================================="
    "1. Reemplazar index.php en public_html/plataformapie.arielhf.cl/"
    "   con: $(Split-Path $indexPublic -Leaf)"
    "2. Renombrar a index.php al subir"
    "3. Verificar que exista tambien .htaccess en esa misma raiz"
    ""
    "=================================================="
    "PASO 6 - .ENV DE PRODUCCION"
    "=================================================="
    "Verificar en /home/arielhfc/apps_laravel/sistema_pie/.env:"
    "  APP_ENV=production"
    "  APP_DEBUG=false"
    "  APP_URL=https://plataformapie.arielhf.cl"
    "  DB_DATABASE=arielhfc_plataformapie"
    "  DB_USERNAME=arielhfc_pie"
    "  DB_HOST=localhost"
    ""
    "=================================================="
    "PASO 7 - PERMISOS"
    "=================================================="
    "En sistema_pie:"
    "  vendor/           -> carpetas 755, archivos 644"
    "  storage/          -> carpetas 775, archivos 664"
    "  bootstrap/cache/  -> carpetas 775, archivos 664"
    "  apps_laravel/     -> 755"
    "  sistema_pie/      -> 755"
    ""
    "=================================================="
    "PASO 8 - PROBAR"
    "=================================================="
    "  App:  https://plataformapie.arielhf.cl/app/"
    "  API:  https://plataformapie.arielhf.cl/api/health"
    ""
    "Si API=ok y /app/ = 404:"
    "  - Falta la carpeta app/ en public_html (no en sistema_pie)"
    "  - O falta .htaccess en la raiz del subdominio"
    "  - Extrae de nuevo: $(Split-Path $publicHtmlZip -Leaf)"
    ""
    "ARCHIVOS GENERADOS:"
    "  $(Split-Path $frontendZip -Leaf)"
    "  $(Split-Path $backendZip -Leaf)"
    "  $(Split-Path $publicHtmlZip -Leaf)   << usa este para el 404"
    "  $($sqlMigrate.Name)"
    "  $(Split-Path $indexPublic -Leaf)"
) | Set-Content $guia -Encoding UTF8

Write-Host ""
Write-Host "LISTO - Lee la guia:"
Write-Host "  $guia"
