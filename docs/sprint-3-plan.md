# Sprint 3 Plan (Reportes y salida MVP)

## Objetivo del sprint
Completar la salida operativa del MVP con reportes PDF por sesion finalizada, envio por correo al apoderado y consolidado anual por plan.

## Duracion sugerida
5 dias habiles.

## Pre-sprint (30-60 min)
- Confirmar formato final de informe PDF (campos obligatorios y orden visual).
- Confirmar politica de envio de correos (mailer por ambiente, asunto, remitente).
- Confirmar reglas de negocio:
  - Solo sesiones `finalizada` generan/envían informe.
  - Consolidado incluye sesiones en orden cronologico.
- Preparar datos de prueba para E2E:
  - 1 estudiante, 1 plan, 2-3 sesiones, tareas calificadas.

## Dia 1 - TKT-014 (PDF de sesion finalizada, parte 1)
**Meta**
- Implementar endpoint de exportacion de PDF para sesion.

**Entregables**
- Endpoint protegido para generar PDF por sesion.
- Carga de datos de estudiante/plan/sesion/tareas.
- Regla de bloqueo para sesiones no finalizadas.

**Checklist**
- [ ] Endpoint devuelve PDF valido.
- [ ] Sesion en `draft` retorna error de negocio controlado.
- [ ] Contenido base coincide con datos persistidos.

**Validacion**
- Probar descarga de PDF para sesion `finalizada` y `draft`.

## Dia 2 - TKT-014 (parte 2) + ajuste de plantilla PDF
**Meta**
- Cerrar formato final del informe por sesion.

**Entregables**
- Vista/plantilla de PDF legible y consistente.
- Normalizacion de campos (fechas, diagnostico, escala).

**Checklist**
- [ ] Estructura de informe aprobada.
- [ ] Tareas y calificaciones visibles en tabla.
- [ ] Nombre de archivo de descarga consistente.

**Validacion**
- Revisar PDF generado con distintos escenarios (con y sin tareas).

## Dia 3 - TKT-015 (Envio de informe por correo)
**Meta**
- Permitir envio del informe de sesion al correo del apoderado.

**Entregables**
- Endpoint de envio con adjunto PDF.
- Mensaje de confirmacion para frontend.
- Manejo de errores de envio.

**Checklist**
- [ ] Correo se envia al `guardian_email` correcto.
- [ ] Adjunta PDF de la sesion finalizada.
- [ ] Respuesta API reporta estado de envio.

**Validacion**
- Probar envio con mailer de desarrollo (`log`) y revisar trazas.

## Dia 4 - TKT-016 (PDF consolidado anual)
**Meta**
- Generar PDF consolidado por plan anual.

**Entregables**
- Endpoint de PDF consolidado del plan.
- Vista de consolidado con sesiones y tareas.
- Orden cronologico correcto.

**Checklist**
- [ ] Incluye todas las sesiones del plan.
- [ ] Incluye tareas y calificaciones por sesion.
- [ ] Descarga con nombre de archivo consistente.

**Validacion**
- Probar consolidado con varias sesiones y tareas.

## Dia 5 - TKT-017 (QA funcional + cierre)
**Meta**
- Ejecutar validacion end-to-end y cerrar sprint sin bloqueantes.

**Entregables**
- Evidencia de prueba E2E de reportes y correo.
- Ajustes finales de UX/API detectados por QA.
- Informe de cierre Sprint 3.

**Checklist**
- [ ] Flujo E2E validado: sesion finalizada -> PDF -> correo -> consolidado.
- [ ] Permisos/ownership respetados en endpoints.
- [ ] Sin errores criticos en backend/frontend.
- [ ] Backlog MVP+ actualizado.

**Validacion**
- Script/manual QA con resultado documentado.

## Riesgos del sprint
- Diferencias entre formato de PDF esperado y generado.
- Entorno de correo no configurado fuera de desarrollo.
- Tiempos de respuesta altos al generar reportes grandes.

## Mitigaciones
- Validar plantilla PDF temprano con casos reales.
- Definir mailer por ambiente y fallback a `log`.
- Mantener consultas y vistas optimizadas para reportes.

## Definicion de cierre de Sprint 3
- TKT-014, TKT-015, TKT-016 y TKT-017 completados.
- Prueba E2E de reportes/correo ejecutada con resultado exitoso.
- Documentacion de cierre y evidencias registradas en `docs/`.
