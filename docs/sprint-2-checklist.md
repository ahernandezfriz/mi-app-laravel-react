# Sprint 2 Checklist Operativo

## Preparacion (antes de codificar)
- [ ] Confirmar regla de estado de sesion (`borrador`/`finalizada`).
- [ ] Confirmar restricciones de edicion de sesiones finalizadas.
- [ ] Confirmar campos obligatorios de sesion.
- [ ] Confirmar ownership de biblioteca de tareas por profesional.
- [ ] Confirmar escala fija de calificacion.
- [ ] Preparar datos de prueba (profesional, estudiante, plan, sesiones, tareas).

## TKT-011 - CRUD de sesiones por plan
- [ ] Crear/listar/editar/eliminar sesiones asociadas a plan anual.
- [ ] Validar fecha, objetivo y descripcion.
- [ ] Implementar cambio de estado de sesion.
- [ ] Evitar transiciones de estado invalidas.
- [ ] Listar sesiones por plan de forma cronologica.
- [ ] Probar CRUD completo desde API.

## TKT-012 - Biblioteca de tareas reutilizables
- [ ] Crear CRUD de tareas reutilizables por profesional.
- [ ] Limitar acceso por ownership (no leer/editar tareas ajenas).
- [ ] Integrar selector de tareas en el flujo de sesion.
- [ ] Permitir reutilizacion de tarea en multiples sesiones.
- [ ] Validar mensajes de error en acciones no autorizadas.

## TKT-013 - Calificacion de tareas por sesion
- [ ] Implementar relacion sesion-tarea (`session_tasks`).
- [ ] Guardar calificacion por tarea en la escala definida.
- [ ] Bloquear valores fuera de escala.
- [ ] Mostrar tareas y calificaciones en detalle de sesion.
- [ ] Habilitar consulta de historico por tarea.
- [ ] Probar caso con multiples tareas y multiples sesiones.

## QA de Sprint 2 (funcional)
- [ ] Caso E2E: login -> estudiante -> plan -> sesion -> tareas -> calificar.
- [ ] Caso permisos: profesional A no accede a recursos de profesional B.
- [ ] Caso integridad: sesion finalizada mantiene datos consistentes.
- [ ] Caso historico: tarea conserva evaluaciones en sesiones diferentes.

## Cierre de Sprint 2
- [ ] TKT-011, TKT-012 y TKT-013 marcados como completados.
- [ ] Sin bloqueantes criticos abiertos.
- [ ] Evidencia de pruebas manuales registrada en `docs/`.
- [ ] Sprint 3 refinado con pendientes reales detectados.
