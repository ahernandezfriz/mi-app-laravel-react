# Roadmap - Sistema de Gestion (Laravel + React)

## Objetivo de esta fase
Dejar operativo un entorno de desarrollo reproducible con Docker para backend en Laravel, frontend con Vite y base de datos MySQL, con soporte para crecimiento por etapas.

## Fase 1 - Base de desarrollo (actual)
- [x] Definir stack de contenedores: `backend` (php-fpm), `nginx`, `frontend` (Vite), `db` (MySQL).
- [x] Exponer puertos de desarrollo: API en `8080` y frontend en `5173`.
- [x] Habilitar persistencia de base de datos (`db_data`).
- [x] Configurar red interna de servicios (`gestion-network`).
- [ ] Crear proyecto Laravel en `./backend` (si aun no existe).
- [ ] Crear proyecto React + Vite en `./frontend` (si aun no existe).
- [ ] Levantar entorno y validar endpoints basicos.

## Fase 2 - Fundaciones del backend
- [ ] Configurar `.env` de Laravel para Docker (`DB_HOST=db`, credenciales de app).
- [ ] Instalar dependencias y generar `APP_KEY`.
- [ ] Definir primer modulo de autenticacion y usuarios (alcance por confirmar).
- [ ] Estandarizar estructura de API (`/api/v1`).
- [ ] Definir estrategia de validaciones, errores y logging.

## Fase 3 - Fundaciones del frontend
- [ ] Estructurar proyecto React (router, estado, servicios API).
- [ ] Configurar cliente HTTP con `VITE_API_URL`.
- [ ] Definir layout inicial del sistema de gestion.
- [ ] Implementar manejo de sesiones/tokens segun estrategia de auth.

## Fase 4 - Calidad y productividad
- [ ] Definir linters y formateo (PHP/JS).
- [ ] Incorporar pruebas base (backend + frontend).
- [ ] Definir convenciones de ramas y commits.
- [ ] Agregar scripts de arranque rapido para el equipo.

## Fase 5 - Endurecimiento tecnico
- [ ] Separar `docker-compose.dev.yml` y `docker-compose.prod.yml`.
- [ ] Introducir secretos fuera del compose.
- [ ] Agregar cache/queue (Redis) cuando el dominio lo requiera.
- [ ] Preparar pipeline CI para pruebas y build.
