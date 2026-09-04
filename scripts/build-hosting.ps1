$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "frontend"
$backend = Join-Path $root "backend"
$appPublic = Join-Path $backend "public\app"
$backups = Join-Path $root "backups"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host ">> Compilando frontend..."
Push-Location $frontend
npm ci
npm run build
Pop-Location

Write-Host ">> Copiando build a backend/public/app..."
if (Test-Path $appPublic) { Remove-Item $appPublic -Recurse -Force }
New-Item -ItemType Directory -Path $appPublic -Force | Out-Null
Copy-Item (Join-Path $frontend "dist\*") $appPublic -Recurse -Force

@'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /app/
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /app/index.html [L]
</IfModule>
'@ | Set-Content -Path (Join-Path $appPublic ".htaccess") -Encoding UTF8

if (-not (Test-Path $backups)) { New-Item -ItemType Directory -Path $backups | Out-Null }

$deployToken = [Guid]::NewGuid().ToString("N")
$deployTemplate = Join-Path $PSScriptRoot "deploy.php.template"
$deployPhp = Join-Path $backend "public\deploy.php"
(Get-Content $deployTemplate -Raw).Replace("__DEPLOY_TOKEN__", $deployToken) | Set-Content $deployPhp -Encoding UTF8

$frontendZip = Join-Path $backups "deploy-frontend-app-$stamp.zip"
$backendZip = Join-Path $backups "deploy-backend-$stamp.zip"
$deployInfo = Join-Path $backups "deploy-instrucciones-$stamp.txt"

Write-Host ">> Creando ZIP del frontend (public/app)..."
Compress-Archive -Path "$appPublic\*" -DestinationPath $frontendZip -Force

Write-Host ">> Creando ZIP del backend (sin node_modules ni .env)..."
$stage = Join-Path $env:TEMP "laravel-deploy-$stamp"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

robocopy $backend $stage /E /XD node_modules .git tests "storage\logs" "storage\framework\cache" "storage\framework\sessions" "storage\framework\views" /XF .env .env.backup public.zip /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy fallo con codigo $LASTEXITCODE" }

Compress-Archive -Path "$stage\*" -DestinationPath $backendZip -Force
Remove-Item $stage -Recurse -Force
Remove-Item $deployPhp -Force -ErrorAction SilentlyContinue

$deployUrl = "https://plataformapie.arielhf.cl/deploy.php?token=$deployToken"

@(
    "DESPLIEGUE cPanel (sin terminal)"
    "Generado: $stamp"
    ""
    "FRONTEND (solo React):"
    "  1. Administrador de archivos -> public/app/"
    "  2. Borrar contenido anterior"
    "  3. Subir y extraer: $(Split-Path $frontendZip -Leaf)"
    ""
    "BACKEND (codigo PHP + vendor):"
    "  1. Respaldar .env y storage/app/ en el servidor"
    "  2. Subir y extraer: $(Split-Path $backendZip -Leaf) sobre la carpeta del backend"
    "  3. Verificar que .env de produccion siga en su sitio"
    "  4. Abrir en el navegador (una sola vez):"
    "     $deployUrl"
    "  5. Borrar public/deploy.php desde cPanel"
    ""
    "URLs:"
    "  App: https://plataformapie.arielhf.cl/app/"
    "  API: https://plataformapie.arielhf.cl/api/health"
) | Set-Content $deployInfo -Encoding UTF8

Write-Host ""
Write-Host "Listo."
Write-Host "  Frontend:     $frontendZip"
Write-Host "  Backend:      $backendZip"
Write-Host "  Instrucciones: $deployInfo"
Write-Host ""
Write-Host "Tras subir el backend, abre en el navegador:"
Write-Host "  $deployUrl"
Write-Host ""
Write-Host "Luego borra public/deploy.php en cPanel."
