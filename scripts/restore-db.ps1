param(
  [Parameter(Mandatory = $true)]
  [string]$InputFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InputFile)) {
  throw "No existe el archivo de respaldo: $InputFile"
}

$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Restaurando desde: $InputFile"
Get-Content -Raw $InputFile | docker compose -f (Join-Path $projectRoot "docker-compose.yml") exec -T db `
  mysql -ugestion_user -pgestion_pass gestion_db

Write-Host "Restore OK"
