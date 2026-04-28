# Sprint 1 Plan (Base funcional)

## Objetivo del sprint
Dejar operativa la base del sistema para: modelo de datos inicial, catalogos, autenticacion, roles/autorizacion y CRUD de estudiantes.

## Duracion sugerida
5 dias habiles.

## Pre-sprint (30-60 min)
- Confirmar decisiones tecnicas:
  - Auth API: Laravel Sanctum.
  - Roles/permisos: Spatie o implementacion propia.
  - Regla de validacion de RUT (formato de entrada y almacenamiento).
- Crear ramas de trabajo por ticket (`feature/TKT-001`, etc.).
- Verificar entorno Docker en estado limpio.

## Dia 1 - TKT-001 (Modelo de datos inicial)
**Meta**
- Crear migraciones de entidades core y relaciones base.

**Entregables**
- Migraciones ejecutables en limpio.
- Restricciones unicas y llaves foraneas.
- Relacion N:M estudiantes <-> profesionales.

**Checklist**
- [ ] Tablas principales creadas.
- [ ] FK y cascadas definidas.
- [ ] Restriccion plan unico por estudiante+anio.
- [ ] Enums base definidos.

**Validacion**
- `php artisan migrate:fresh`
- Verificar estructura final en BD.

## Dia 2 - TKT-002 (Catalogos iniciales)
**Meta**
- Incorporar profesiones, niveles y cursos via seeders.

**Entregables**
- Seeders de profesiones.
- Seeders nivel->curso (Prebasica/Basica/Media).
- Endpoints de consulta de catalogos.

**Checklist**
- [ ] Catalogos cargan en entorno limpio.
- [ ] Cursos quedan asociados a su nivel.
- [ ] Endpoint de cursos por nivel funcionando.

**Validacion**
- `php artisan db:seed`
- Probar endpoint de catalogos desde cliente HTTP.

## Dia 3 - TKT-003 (Auth) + inicio TKT-005 (Roles)
**Meta**
- Habilitar acceso seguro con registro/login/logout y comenzar control por rol.

**Entregables**
- Endpoints auth.
- Flujo frontend minimo de autenticacion.
- Roles base creados y asignables.

**Checklist**
- [ ] Registro profesional operativo.
- [ ] Login/logout operativo.
- [ ] Perfil autenticado (`/me`) operativo.
- [ ] Roles iniciales disponibles.

**Validacion**
- Registro y login de usuario real de prueba.
- Prueba de acceso a endpoint protegido con y sin autenticacion.

## Dia 4 - TKT-005 (Autorizacion) + TKT-006 (CRUD Estudiantes, parte 1)
**Meta**
- Aplicar politicas de acceso y crear backend de estudiantes.

**Entregables**
- Policies/middlewares por rol y ownership.
- Endpoints CRUD estudiantes.
- Validaciones principales (RUT, obligatorios, apoderado).

**Checklist**
- [ ] Profesional no puede acceder a recursos no asignados.
- [ ] Super admin conserva acceso global.
- [ ] CRUD backend de estudiantes completo.

**Validacion**
- Casos cruzados de permisos por rol.
- Casos de validacion invalidos y validos.

## Dia 5 - TKT-006 (CRUD Estudiantes, parte 2) + cierre sprint
**Meta**
- Completar frontend de estudiantes y cerrar QA basico del sprint.

**Entregables**
- Pantallas de listado/formulario de estudiantes.
- Selector nivel->curso integrado (si ya existe endpoint de catalogos).
- Manejo de errores y estados de carga.
- Informe de cierre Sprint 1.

**Checklist**
- [ ] Crear/editar/eliminar estudiante desde UI.
- [ ] Mensajes de error claros en validaciones.
- [ ] Formato de curso visible segun estandar.
- [ ] Prueba end-to-end basica completada.

**Validacion**
- Flujo completo: login -> crear estudiante -> editar -> listar -> eliminar.

## Riesgos del sprint
- Cambios tardios en reglas de negocio (RUT, roles, ownership).
- Subestimar complejidad de autorizacion multirrol.
- Falta de criterios cerrados para validaciones de datos.

## Mitigaciones
- Cerrar decisiones de autenticacion/roles antes del Dia 1.
- Revisiones tecnicas breves diarias (15 min).
- Mantener tickets pequenos y con alcance estricto.

## Definicion de cierre de Sprint 1
- TKT-001, TKT-002, TKT-003, TKT-005 y TKT-006 completados.
- Pruebas manuales basicas registradas.
- Sin bloqueantes criticos abiertos.
