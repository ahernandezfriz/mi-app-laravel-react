# ToDo de Implementacion (MVP)

## Estado actual
- [x] Entorno Docker funcionando (`backend`, `nginx`, `frontend`, `db`).
- [x] Proyecto base Laravel + React levantado.
- [ ] Documentacion funcional consolidada en `docs/requerimientos.md`.

## Sprint 1 - Base funcional (prioridad alta)

### A. Fundaciones del dominio
- [x] Definir modelo de datos inicial (entidades y relaciones).
- [x] Crear catalogos iniciales: profesiones, niveles y cursos.
- [x] Definir enums: estado de sesion y calificacion de tarea.
- [ ] Establecer convenciones API (estructura de respuestas y errores).

### B. Autenticacion y roles
- [x] Implementar auth completa: registro, login, logout.
- [x] Implementar recuperacion y reseteo de contrasena.
- [x] Implementar roles iniciales: `super_admin`, `admin_establecimiento`, `profesional`.
- [x] Implementar autorizacion por rol y ownership de datos.

### C. Estudiantes (pacientes)
- [x] Crear CRUD de estudiantes.
- [x] Validar RUT y datos obligatorios.
- [x] Implementar selector dependiente nivel -> curso.
- [x] Formatear visualizacion de curso (ej: `1 Basico C`, `2 Medio A`).
- [x] Implementar relacion N:M estudiantes <-> profesionales.

### D. Planes de tratamiento anuales
- [x] Crear CRUD de planes por estudiante y anio.
- [x] Restringir duplicidad por estudiante+anio.
- [x] Guardar `diagnosis_snapshot` al crear plan.
- [x] Mostrar historial anual de planes en ficha del estudiante.
- [x] Snapshot de curso escolar al crear plan (`school_course_id`).
- [x] Al crear un plan posterior: elegir si el estudiante avanza de curso o se mantiene (repite), con secuencia institucional y misma sección.

## Sprint 2 - Flujo terapeutico (prioridad alta)

### E. Sesiones
- [x] Crear CRUD de sesiones dentro de un plan.
- [x] Campos minimos: fecha, objetivo, descripcion, estado.
- [x] Permitir finalizar sesion.
- [x] Mostrar historial de sesiones por plan.
- [x] Confirmacion al reabrir una sesion finalizada (`Volver a editar`).
- [x] Edicion de fecha y objetivo de sesiones finalizadas desde el listado.
- [x] Motivos de suspension: estudiante ausente, licencia medica profesional, suspension de clases u otro.
- [x] Listado de sesiones: fecha `28 SEP 2026`, hora debajo y badge de estado (tooltip en Suspendida).
- [x] Confirmacion modal al eliminar un plan anual.

### F. Biblioteca de tareas reutilizables
- [ ] Crear CRUD de tareas por profesional.
- [ ] Permitir seleccionar tareas de biblioteca en una sesion.
- [ ] Permitir tareas libres (opcionales) dentro de sesion.
- [x] Edicion de tareas solo en la sesion (sin alterar el banco).
- [x] Origen visible: Nueva / Banco de tareas / Banco de tareas (editada).
- [x] Advertencia al editar una tarea importada del banco.
- [x] Descripcion de tarea como textarea multilinea.

### G. Calificaciones por tarea
- [ ] Guardar calificacion por tarea dentro de cada sesion.
- [ ] Escala: `Por lograr`, `Lo logra con dificultad`, `Lo logra`.
- [ ] Al revisar sesion, mostrar resultados de cada tarea.
- [ ] Mostrar historial de desempeno por tarea (vista resumida).
- [x] Conservar observacion al cambiar la calificacion de una tarea.

## Sprint 3 - Reportes y salida MVP

### H. Informes y comunicacion
- [ ] Generar PDF por sesion finalizada.
- [ ] Incluir datos de estudiante, diagnostico, plan, sesion y tareas calificadas.
- [x] Incluir observacion general de la sesion en el PDF (despues de las tareas).
- [x] Nombre de PDF de sesion: `nombre-apellido-dd-mmm-yyyy-HHmmss.pdf`.
- [ ] Enviar informe por correo al apoderado.
- [ ] Generar PDF consolidado por plan anual.
- [x] Sesiones suspendidas en el consolidado: solo fecha, estado y motivo.
- [x] Nombre de PDF consolidado: `nombre-apellido-plan-consolidado-{anio}.pdf`.
- [x] Registro secreduc en perfil y firma de informes.

### I. Calidad y estabilizacion
- [ ] Pruebas de permisos y acceso por rol.
- [ ] Pruebas de reglas criticas (nivel/curso, plan unico por anio).
- [ ] Pruebas de reportes (PDF y correo).
- [ ] Checklist de despliegue y operacion.

## Backlog posterior (MVP+)
- [ ] Dashboard con metricas por profesional/establecimiento.
- [ ] Filtros avanzados por curso, anio, profesional, estado.
- [ ] Plantillas de sesiones frecuentes.
- [ ] Auditoria de cambios relevantes.
- [ ] Prueba de actualizacion de tarea de sesion (`SessionTaskUpdateTest`) estable en sqlite (hoy falla por una migracion MySQL `MODIFY`).

### Futuros (orden recomendado: menos → mas invasivo)
- [x] **1. Fecha de nacimiento / edad exacta:** capturar `birth_date` y mostrar edad tipo `7 años 3 meses 20 dias`; ver `docs/roadmap.md` Fase 8.2. (pendiente validación en UI)
- [x] **2. Multi-diagnostico:** cada estudiante con 1+ diagnosticos; ver `docs/roadmap.md` Fase 8.1. (pendiente validación en UI)
- [ ] **3. Verificacion de email:** confirmar correo al registrarse; ver `docs/roadmap.md` Fase 7 (requiere mailer real).
- [ ] **4. Auth social:** login/registro con Gmail; ver `docs/roadmap.md` Fase 6.
