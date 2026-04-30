# Sprint 3 Checklist Operativo

## Preparacion (antes de codificar)
- [ ] Confirmar campos obligatorios del informe PDF de sesion.
- [ ] Confirmar regla de negocio: solo sesion `finalizada` exporta/envia.
- [ ] Confirmar formato esperado para consolidado anual.
- [ ] Verificar configuracion de correo por ambiente (`MAIL_*`).
- [ ] Preparar datos de prueba con sesiones y tareas calificadas.

## TKT-014 - PDF de sesion finalizada
- [ ] Implementar endpoint de descarga PDF de sesion.
- [ ] Crear plantilla PDF con datos de estudiante/plan/sesion/tareas.
- [ ] Bloquear descarga para sesiones no finalizadas.
- [ ] Validar contenido y estructura del PDF.

## TKT-015 - Envio de informe por correo al apoderado
- [ ] Implementar endpoint de envio de informe.
- [ ] Adjuntar PDF generado de la sesion.
- [ ] Enviar al `guardian_email` del estudiante.
- [ ] Manejar errores y responder estado de envio.
- [ ] Probar trazabilidad con mailer de desarrollo.

## TKT-016 - PDF consolidado por plan anual
- [ ] Implementar endpoint de PDF consolidado.
- [ ] Incluir sesiones del plan en orden cronologico.
- [ ] Incluir tareas y calificaciones por sesion.
- [ ] Validar consistencia del consolidado con datos reales.

## TKT-017 - QA funcional y endurecimiento MVP
- [ ] Probar flujo E2E: finalizacion -> PDF sesion -> envio correo -> consolidado.
- [ ] Probar permisos (usuario no autorizado no accede a reportes ajenos).
- [ ] Probar casos de error de negocio (sesion en borrador).
- [ ] Revisar estabilidad de frontend y backend en flujo de reportes.
- [ ] Registrar evidencia de pruebas en `docs/`.

## Cierre de Sprint 3
- [ ] TKT-014, TKT-015, TKT-016 y TKT-017 completados.
- [ ] Sin bloqueantes criticos abiertos.
- [ ] Evidencia E2E registrada.
- [ ] Plan de continuidad (MVP+) actualizado.
