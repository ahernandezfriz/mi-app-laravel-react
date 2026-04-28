# Tickets de Implementacion (MVP)

## Arranque inmediato (orden recomendado)

### Semana 1 - Ejecucion sugerida
1. `TKT-001` - Modelo de datos inicial y migraciones base.
2. `TKT-002` - Catalogos iniciales (profesiones, niveles, cursos).
3. `TKT-003` - Autenticacion profesional (registro/login/logout).
4. `TKT-005` - Roles y autorizacion base.
5. `TKT-006` - CRUD de estudiantes.

### Definicion de "hecho" para cada ticket (DoD)
- Codigo implementado y versionado en rama del ticket.
- Migraciones/seeders ejecutan sin error en entorno limpio.
- Validaciones backend cubren casos esperados y casos invalidos.
- UI conectada a API (cuando aplique) y manejo de errores visible.
- Prueba manual documentada con pasos y resultado.

### Bloqueadores a resolver antes de iniciar TKT-001
- Confirmar si se utilizara paquete de roles/permisos (ej. Spatie) o implementacion propia.
- Confirmar estrategia de autenticacion API (Sanctum recomendado).
- Confirmar formato definitivo de RUT para validaciones (con o sin puntos/guion).

## Sprint 1 - Base funcional

### TKT-001 - Modelo de datos inicial y migraciones base
**Objetivo**
Crear la base del dominio para soportar profesionales, estudiantes, planes, sesiones y tareas.

**Incluye**
- Migraciones para entidades principales.
- Relaciones N:M estudiantes <-> profesionales.
- Restriccion unica de plan por estudiante+anio.
- Enums base para estado de sesion y calificacion.

**Criterios de aceptacion**
- Existen migraciones ejecutables sin error en entorno limpio.
- Las relaciones y llaves foraneas quedan aplicadas.
- La restriccion de plan anual evita duplicados.

**Dependencias**
- Ninguna.

### TKT-002 - Catalogos iniciales (profesiones, niveles, cursos)
**Objetivo**
Tener catalogos base para formularios y reglas de negocio.

**Incluye**
- Seeders para profesiones.
- Seeders para niveles y cursos (Prebasica, Basica, Media).
- Regla de dependencia nivel -> curso.

**Criterios de aceptacion**
- Los catalogos se cargan correctamente con seeders.
- Cada curso queda asociado a un unico nivel.
- La API puede listar niveles y cursos por nivel.

**Dependencias**
- TKT-001.

### TKT-003 - Autenticacion profesional (registro/login/logout)
**Objetivo**
Habilitar acceso seguro para profesionales.

**Incluye**
- Registro con nombre, RUT, email, profesion y contrasena.
- Login/logout.
- Endpoint de perfil autenticado.

**Criterios de aceptacion**
- Profesional puede registrarse e iniciar sesion.
- No se permiten emails duplicados.
- Solo usuarios autenticados acceden a endpoints protegidos.

**Dependencias**
- TKT-001, TKT-002.

### TKT-004 - Recuperacion y reseteo de contrasena
**Objetivo**
Permitir recuperar acceso de forma segura.

**Incluye**
- Flujo forgot/reset password.
- Pantallas y endpoints necesarios.

**Criterios de aceptacion**
- Usuario puede solicitar link/token de recuperacion.
- Puede definir nueva contrasena y volver a iniciar sesion.

**Dependencias**
- TKT-003.

### TKT-005 - Roles y autorizacion base
**Objetivo**
Separar permisos por rol y ownership de datos.

**Incluye**
- Roles: `super_admin`, `admin_establecimiento`, `profesional`.
- Politicas para acceso a recursos.
- Restriccion para que profesional gestione solo sus asignaciones.

**Criterios de aceptacion**
- Cada rol recibe permisos acordes.
- Un profesional no puede leer/editar recursos ajenos.
- Super admin mantiene acceso global.

**Dependencias**
- TKT-003.

### TKT-006 - CRUD de estudiantes (pacientes)
**Objetivo**
Gestionar estudiantes con datos clinico-escolares.

**Incluye**
- Crear/editar/eliminar/listar estudiantes.
- Campos: identificacion, diagnostico actual, apoderado.
- Validaciones de obligatorios y formato de RUT.

**Criterios de aceptacion**
- CRUD completo funcional desde frontend y backend.
- Errores de validacion se muestran de forma clara.
- Persisten correctamente datos de apoderado.

**Dependencias**
- TKT-002, TKT-005.

### TKT-007 - Asignacion N:M estudiante-profesional
**Objetivo**
Permitir que un estudiante sea atendido por mas de un profesional.

**Incluye**
- Tabla pivote y endpoints de asignacion.
- Pantalla o flujo para asignar/desasignar profesionales.

**Criterios de aceptacion**
- Un estudiante puede tener multiples profesionales.
- Un profesional puede tener multiples estudiantes.
- El control de acceso respeta las asignaciones.

**Dependencias**
- TKT-005, TKT-006.

### TKT-008 - Selector nivel->curso y formato de curso
**Objetivo**
Aplicar la regla academica en UI y backend.

**Incluye**
- Selector dependiente de curso segun nivel.
- Formateo visual: `1 Basico C`, `2 Medio A`, etc.

**Criterios de aceptacion**
- No se pueden seleccionar cursos fuera del nivel elegido.
- El formato de despliegue cumple el estandar definido.

**Dependencias**
- TKT-002, TKT-006.

### TKT-009 - Planes de tratamiento anuales
**Objetivo**
Gestionar planes por anio y mantener historial del estudiante.

**Incluye**
- Crear/listar/editar planes por estudiante.
- Campo de anio academico.
- Historial visible por estudiante.

**Criterios de aceptacion**
- Se visualizan planes historicos por anio.
- No se permite duplicar plan para mismo estudiante+anio.

**Dependencias**
- TKT-001, TKT-006.

### TKT-010 - Snapshot de diagnostico por plan
**Objetivo**
Conservar trazabilidad de cambios de diagnostico en el tiempo.

**Incluye**
- Guardar `diagnosis_snapshot` al crear plan.
- Mantener `diagnostico actual` editable en estudiante.

**Criterios de aceptacion**
- Cambiar diagnostico actual no altera snapshots historicos.
- Cada plan conserva el diagnostico vigente al momento de su creacion.

**Dependencias**
- TKT-009.

## Sprint 2 - Flujo terapeutico

### TKT-011 - CRUD de sesiones por plan
**Objetivo**
Registrar sesiones terapeuticas dentro del plan anual.

**Incluye**
- Crear/editar/listar sesiones.
- Campos: fecha, objetivo, descripcion, estado.
- Cambio de estado a `finalizada`.

**Criterios de aceptacion**
- Sesiones quedan asociadas al plan correcto.
- Se puede listar historial de sesiones por plan.

**Dependencias**
- TKT-009.

### TKT-012 - Biblioteca de tareas reutilizables
**Objetivo**
Permitir reutilizar tareas entre distintas sesiones y planes.

**Incluye**
- CRUD de tareas por profesional.
- Selector de tareas en sesion.

**Criterios de aceptacion**
- Profesional reutiliza tareas previamente creadas.
- Un profesional no edita biblioteca de otro profesional.

**Dependencias**
- TKT-005, TKT-011.

### TKT-013 - Calificacion de tareas por sesion
**Objetivo**
Registrar desempeno por tarea dentro de cada sesion.

**Incluye**
- Relacion sesion-tarea con calificacion.
- Escala fija: `Por lograr`, `Lo logra con dificultad`, `Lo logra`.
- Visualizacion de resultados en detalle de sesion.

**Criterios de aceptacion**
- Cada tarea de la sesion muestra su calificacion.
- Se puede consultar historico por tarea en sesiones previas.

**Dependencias**
- TKT-011, TKT-012.

## Sprint 3 - Reportes y salida MVP

### TKT-014 - PDF de sesion finalizada
**Objetivo**
Generar informe formal por sesion para seguimiento.

**Incluye**
- Exportar PDF de sesion finalizada.
- Datos: estudiante, diagnostico, plan, sesion, tareas y calificaciones.

**Criterios de aceptacion**
- Solo sesiones finalizadas generan PDF.
- Contenido del PDF coincide con datos guardados.

**Dependencias**
- TKT-013.

### TKT-015 - Envio de informe por correo al apoderado
**Objetivo**
Compartir informe de sesion con el apoderado.

**Incluye**
- Envio de PDF por email al correo registrado.
- Manejo de errores de envio.

**Criterios de aceptacion**
- Se envia al email del apoderado del estudiante.
- El sistema reporta estado de envio correctamente.

**Dependencias**
- TKT-014.

### TKT-016 - PDF consolidado por plan anual
**Objetivo**
Generar consolidado anual para revision integral.

**Incluye**
- Exportacion PDF con todas las sesiones y tareas de un plan.
- Orden cronologico de sesiones.

**Criterios de aceptacion**
- El consolidado incluye todas las sesiones del plan.
- Se visualizan tareas y calificaciones por sesion.

**Dependencias**
- TKT-013.

### TKT-017 - QA funcional y endurecimiento MVP
**Objetivo**
Asegurar calidad operativa antes del piloto.

**Incluye**
- Pruebas de permisos y ownership.
- Pruebas de reglas criticas.
- Pruebas de reportes y correos.

**Criterios de aceptacion**
- Checklist QA completo sin bloqueantes criticos.
- Flujo end-to-end validado con datos de prueba.

**Dependencias**
- TKT-001 a TKT-016.
