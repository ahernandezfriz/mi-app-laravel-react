# Mini nota de release - Sprint 2 y Sprint 3

## Fecha
2026-04-30

## Resumen
Se completa el flujo terapeutico del MVP (sesiones, tareas y calificaciones) y la salida operativa de reportes (PDF y correo al apoderado).

## Sprint 2 - Flujo terapeutico
- CRUD de sesiones por plan anual (`TKT-011`).
- Biblioteca de tareas reutilizables por profesional (`TKT-012`).
- Calificacion por tarea dentro de cada sesion (`TKT-013`).
- Historico de desempeno por tarea reutilizable.

## Sprint 3 - Reportes y salida MVP
- Generacion de PDF por sesion finalizada (`TKT-014`).
- Envio de informe por correo al apoderado (`TKT-015`).
- Generacion de PDF consolidado anual por plan (`TKT-016`).
- Endpoints y UI conectados para descarga/envio de reportes.

## Validaciones realizadas
- Pruebas API de flujo end-to-end para Sprint 2: OK.
- Pruebas API de flujo end-to-end para Sprint 3: OK.
- `php artisan test`: OK.
- `npm run build` (frontend): OK.

## Notas operativas
- Los reportes de sesion solo se habilitan para sesiones en estado `finalizada`.
- El envio de correo utiliza la configuracion `MAIL_*` del entorno (en desarrollo se puede usar `MAIL_MAILER=log`).
