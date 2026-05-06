param(
  [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $projectRoot "backups"

if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}

if ([string]::IsNullOrWhiteSpace($OutputFile)) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputFile = Join-Path $backupDir "gestion_db-$timestamp.sql"
}

Write-Host "Creando respaldo en: $OutputFile"

docker compose -f (Join-Path $projectRoot "docker-compose.yml") exec -T db `
  mysqldump -ugestion_user -pgestion_pass --single-transaction --routines --triggers --no-tablespaces gestion_db `
  > $OutputFile

Write-Host "Backup OK"
