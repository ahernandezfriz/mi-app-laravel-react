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

## Sprint 2 - Flujo terapeutico (prioridad alta)

### E. Sesiones
- [x] Crear CRUD de sesiones dentro de un plan.
- [x] Campos minimos: fecha, objetivo, descripcion, estado.
- [x] Permitir finalizar sesion.
- [x] Mostrar historial de sesiones por plan.

### F. Biblioteca de tareas reutilizables
- [ ] Crear CRUD de tareas por profesional.
- [ ] Permitir seleccionar tareas de biblioteca en una sesion.
- [ ] Permitir tareas libres (opcionales) dentro de sesion.

### G. Calificaciones por tarea
- [ ] Guardar calificacion por tarea dentro de cada sesion.
- [ ] Escala: `Por lograr`, `Lo logra con dificultad`, `Lo logra`.
- [ ] Al revisar sesion, mostrar resultados de cada tarea.
- [ ] Mostrar historial de desempeno por tarea (vista resumida).

## Sprint 3 - Reportes y salida MVP

### H. Informes y comunicacion
- [ ] Generar PDF por sesion finalizada.
- [ ] Incluir datos de estudiante, diagnostico, plan, sesion y tareas calificadas.
- [ ] Enviar informe por correo al apoderado.
- [ ] Generar PDF consolidado por plan anual.

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
