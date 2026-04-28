# TODO - Puesta en marcha de entorno Docker (dev)

## 1) Preparar codigo base
- [x] Crear backend Laravel en `./backend` o copiar proyecto existente.
- [x] Crear frontend React + Vite en `./frontend` o copiar proyecto existente.
- [x] Verificar que existan `composer.json` y `package.json`.

## 2) Levantar infraestructura
- [x] Ejecutar `docker compose up --build`.
- [x] Confirmar contenedores activos: `gestion-backend`, `gestion-nginx`, `gestion-frontend`, `gestion-db`.
- [x] Probar API desde navegador: `http://localhost:8080`.
- [x] Probar frontend: `http://localhost:5173`.

## 3) Inicializar Laravel (manual)
- [x] Entrar al contenedor backend.
- [x] Ejecutar `composer install`.
- [x] Copiar `.env.example` a `.env`.
- [x] Configurar DB en `.env`:
  - `DB_HOST=db`
  - `DB_PORT=3306`
  - `DB_DATABASE=gestion_db`
  - `DB_USERNAME=gestion_user`
  - `DB_PASSWORD=gestion_pass`
- [x] Ejecutar `php artisan key:generate`.
- [x] Ejecutar migraciones manuales cuando aplique: `php artisan migrate`.

## 4) Inicializar frontend (manual)
- [x] Entrar al contenedor frontend.
- [x] Ejecutar `npm install`.
- [x] Verificar que Vite escuche en `0.0.0.0:5173`.
- [x] Crear `.env` frontend con `VITE_API_URL=http://localhost:8080/api`.

## 5) Verificaciones finales
- [x] Confirmar conexion Laravel -> MySQL.
- [x] Confirmar consumo API desde React.
- [x] Confirmar hot reload en backend/frontend.
- [x] Registrar incidencias y ajustes pendientes.

## Notas
- Migraciones quedan manuales por decision del proyecto.
- Se agrego endpoint de salud `GET /api/health` y verificacion desde frontend.
- Se agrego `backend/config/cors.php` para permitir origen `http://localhost:5173`.
- Incidencia detectada: despues de recrear contenedores, Nginx presento 502 hacia PHP-FPM; se resolvio con `docker compose restart nginx`.
- En PowerShell, usar `Invoke-WebRequest` en lugar de `curl -w` para validaciones HTTP.
