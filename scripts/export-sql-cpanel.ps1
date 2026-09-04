param(
  [switch]$SoloMigraciones
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $projectRoot "backups"
$composeFile = Join-Path $projectRoot "docker-compose.yml"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}

function ConvertTo-CpanelSql {
  param([string]$InputPath, [string]$OutputPath)

  $content = Get-Content $InputPath -Raw -Encoding UTF8
  $content = [regex]::Replace($content, '/\*!\d+\s.*?\*/;?', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $content = [regex]::Replace($content, "(\r?\n){3,}", "`r`n`r`n")

  $header = @"
SET FOREIGN_KEY_CHECKS=0;
SET UNIQUE_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

"@

  $footer = @"

SET UNIQUE_CHECKS=1;
SET FOREIGN_KEY_CHECKS=1;
"@

  ($header + $content.Trim() + $footer) | Set-Content $OutputPath -Encoding UTF8
}

$incrementalSql = @'
-- Actualizacion incremental para phpMyAdmin (sin terminal)
-- Usar si produccion ya tiene datos y solo falta la migracion nueva.

SET FOREIGN_KEY_CHECKS=0;

-- 2026_05_08_111800_add_session_time_to_therapy_sessions_table
ALTER TABLE `therapy_sessions`
  ADD COLUMN `session_time` time NULL AFTER `session_date`;

ALTER TABLE `therapy_sessions`
  ADD INDEX `therapy_sessions_date_time_index` (`session_date`, `session_time`);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT '2026_05_08_111800_add_session_time_to_therapy_sessions_table', 2
WHERE NOT EXISTS (
  SELECT 1 FROM `migrations`
  WHERE `migration` = '2026_05_08_111800_add_session_time_to_therapy_sessions_table'
);

SET FOREIGN_KEY_CHECKS=1;
'@

if ($SoloMigraciones) {
  $incrementalFile = Join-Path $backupDir "migrate-cpanel-$stamp.sql"
  $incrementalSql | Set-Content $incrementalFile -Encoding UTF8
  Write-Host "SQL incremental: $incrementalFile"
  exit 0
}

$rawFile = Join-Path $backupDir "gestion_db-$stamp-raw.sql"
$compatFile = Join-Path $backupDir "gestion_db-$stamp-compat-final.sql"
$incrementalFile = Join-Path $backupDir "migrate-cpanel-$stamp.sql"

Write-Host "Exportando base local desde Docker..."
docker compose -f $composeFile exec -T db `
  mysqldump -ugestion_user -pgestion_pass --single-transaction --routines --triggers --no-tablespaces gestion_db `
  > $rawFile

if (-not (Test-Path $rawFile) -or (Get-Item $rawFile).Length -lt 100) {
  Write-Warning "No se pudo exportar desde Docker (apagado o sin datos). Se omite compat-final."
} else {
  Write-Host "Generando SQL compatible con phpMyAdmin..."
  ConvertTo-CpanelSql -InputPath $rawFile -OutputPath $compatFile
}

$incrementalSql | Set-Content $incrementalFile -Encoding UTF8

Write-Host ""
Write-Host "Listo."
Write-Host "  Completo (reimportar todo): $compatFile"
Write-Host "  Solo migracion nueva:       $incrementalFile"
Write-Host ""
Write-Host "phpMyAdmin -> Importar -> elegir archivo SQL -> Ejecutar"
