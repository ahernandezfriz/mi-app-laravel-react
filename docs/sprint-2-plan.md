# Sprint 2 Plan (Flujo terapeutico)

## Objetivo del sprint
Implementar el flujo terapeutico operativo dentro del plan anual: sesiones por plan, biblioteca de tareas reutilizables y calificacion por tarea en cada sesion.

## Duracion sugerida
5 dias habiles.

## Pre-sprint (30-60 min)
- Confirmar reglas funcionales de sesion:
  - Estado permitido (`borrador`, `finalizada`) y regla de cierre.
  - Campos obligatorios de sesion (fecha, objetivo, descripcion).
- Confirmar biblioteca de tareas:
  - Alcance por profesional (ownership estricto).
  - Campos minimos de una tarea reutilizable.
- Confirmar regla de calificacion:
  - Escala fija: `Por lograr`, `Lo logra con dificultad`, `Lo logra`.
- Definir datos de prueba base:
  - 1 profesional, 1 estudiante, 1 plan anual, 3 sesiones, 5 tareas.

## Dia 1 - TKT-011 (CRUD de sesiones por plan, parte 1)
**Meta**
- Construir backend de sesiones asociado a `treatment_plans`.

**Entregables**
- Endpoints para crear/listar/editar/eliminar sesiones.
- Validaciones de entrada y relacion correcta `plan -> sesiones`.
- Modelo de datos y recursos API consistentes.

**Checklist**
- [ ] Crear sesion vinculada al plan correcto.
- [ ] Listar sesiones por plan en orden cronologico.
- [ ] Validar campos obligatorios y formatos de fecha.
- [ ] Manejar errores con respuestas claras.

**Validacion**
- Probar `POST/GET/PUT/DELETE` de sesiones desde cliente HTTP.

## Dia 2 - TKT-011 (parte 2) + regla de estado
**Meta**
- Cerrar flujo de estados y robustecer reglas de sesion.

**Entregables**
- Cambio de estado de sesion a `finalizada`.
- Restricciones de edicion cuando la sesion ya esta finalizada (si aplica).
- Cobertura de casos invalidos en validacion backend.

**Checklist**
- [ ] Estado de sesion persiste correctamente.
- [ ] No se permiten transiciones invalidas.
- [ ] Sesion finalizada mantiene integridad de datos.

**Validacion**
- Caso de prueba: crear sesion -> editar -> finalizar -> validar comportamiento.

## Dia 3 - TKT-012 (Biblioteca de tareas reutilizables)
**Meta**
- Crear biblioteca reusable por profesional e integrarla al flujo de sesion.

**Entregables**
- CRUD de `task_templates`.
- Filtro por propietario (profesional autenticado).
- Selector/listado para usar tareas en sesiones.

**Checklist**
- [ ] Profesional crea y reutiliza tareas propias.
- [ ] Profesional no puede editar/ver tareas de otro profesional.
- [ ] Tareas se pueden seleccionar desde una sesion.

**Validacion**
- Probar ownership con dos usuarios de prueba.

## Dia 4 - TKT-013 (Calificacion de tareas por sesion, parte 1)
**Meta**
- Registrar tareas en sesion con calificacion por cada item.

**Entregables**
- Relacion `session_tasks` operativa.
- Guardado de calificacion por tarea con escala fija.
- Endpoints para agregar/actualizar tareas de una sesion.

**Checklist**
- [ ] Cada tarea de sesion guarda su calificacion.
- [ ] Solo se aceptan valores validos de escala.
- [ ] Se mantiene trazabilidad tarea-sesion.

**Validacion**
- Crear sesion con multiples tareas y calificar cada una.

## Dia 5 - TKT-013 (parte 2) + cierre sprint
**Meta**
- Completar vistas/consultas y cerrar QA funcional de Sprint 2.

**Entregables**
- Vista de detalle de sesion con tareas y calificaciones.
- Consulta de historico por tarea (entre sesiones previas).
- Informe de cierre de Sprint 2 con hallazgos y pendientes.

**Checklist**
- [ ] Detalle de sesion muestra tareas + calificaciones.
- [ ] Historico por tarea visible y consistente.
- [ ] Prueba end-to-end del flujo terapeutico completada.
- [ ] Backlog de Sprint 3 refinado.

**Validacion**
- Flujo completo: login -> estudiante -> plan -> sesion -> tareas -> calificacion.

## Riesgos del sprint
- Ambiguedad en reglas de cierre de sesion y edicion posterior.
- Deriva de permisos en biblioteca de tareas (fugas entre profesionales).
- Inconsistencia de historico por tarea si no se define bien la relacion de datos.

## Mitigaciones
- Cerrar reglas de estado antes de iniciar Dia 2.
- Probar ownership temprano con dos usuarios reales de prueba.
- Validar modelos y constraints antes de conectar UI.

## Definicion de cierre de Sprint 2
- TKT-011, TKT-012 y TKT-013 completados.
- Flujo terapeutico probado end-to-end sin bloqueantes criticos.
- Evidencia de pruebas manuales registrada en `docs/`.
