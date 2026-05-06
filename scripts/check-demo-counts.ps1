$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

docker compose -f (Join-Path $projectRoot "docker-compose.yml") exec db `
  mysql -ugestion_user -pgestion_pass gestion_db `
  -e "SELECT COUNT(*) AS users FROM users; SELECT COUNT(*) AS students FROM students; SELECT COUNT(*) AS plans FROM treatment_plans; SELECT COUNT(*) AS sessions FROM therapy_sessions; SELECT COUNT(*) AS session_tasks FROM session_tasks; SELECT COUNT(*) AS task_templates FROM task_templates; SELECT COUNT(*) AS media_library_items FROM media_library_items;"
