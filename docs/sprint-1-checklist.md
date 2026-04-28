# Sprint 1 Checklist Operativo

## Preparacion (antes de codificar)
- [ ] Confirmar estrategia auth API (Sanctum).
- [ ] Confirmar estrategia roles/permisos (Spatie o propia).
- [ ] Confirmar formato oficial de RUT (entrada/almacenamiento).
- [ ] Crear rama por ticket (`feature/TKT-001`, etc.).
- [ ] Verificar contenedores arriba y backend accesible.

## TKT-001 - Modelo de datos inicial
- [ ] Crear migraciones de entidades core.
- [ ] Definir relaciones y llaves foraneas.
- [ ] Crear tabla pivote estudiante-profesional (N:M).
- [ ] Aplicar restriccion unica plan por estudiante+anio.
- [ ] Definir enums base (estado sesion, calificacion).
- [ ] Ejecutar `migrate:fresh` sin errores.

## TKT-002 - Catalogos iniciales
- [ ] Seeder profesiones.
- [ ] Seeder niveles.
- [ ] Seeder cursos por nivel.
- [ ] Endpoint niveles/cursos.
- [ ] Validar carga en BD en limpio.

## TKT-003 - Autenticacion
- [ ] Registro profesional.
- [ ] Login profesional.
- [ ] Logout.
- [ ] Perfil autenticado (`/me`).
- [ ] Proteger rutas privadas.

## TKT-005 - Roles y autorizacion
- [ ] Crear roles (`super_admin`, `admin_establecimiento`, `profesional`).
- [ ] Asignar rol por defecto al registro.
- [ ] Definir politicas de acceso por ownership.
- [ ] Verificar que un profesional no vea datos ajenos.

## TKT-006 - CRUD estudiantes
- [ ] Crear migracion/modelo/controlador de estudiantes.
- [ ] Validar RUT y datos obligatorios.
- [ ] CRUD API completo.
- [ ] Integrar nivel->curso en formulario frontend.
- [ ] Formato visual de curso (`1 Basico C`, etc.).
- [ ] Prueba manual end-to-end de CRUD.

## Cierre de Sprint 1
- [ ] Checklist completo sin bloqueantes criticos.
- [ ] Documento de pruebas manuales en `docs/`.
- [ ] Backlog de Sprint 2 refinado con base en hallazgos.
