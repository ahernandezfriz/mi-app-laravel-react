# Mini notas de release

## Release - Sprint Front y Sesiones (2026-04-30)

- Se consolidó el flujo de **planes de tratamiento y sesiones** con navegación más clara: listado de sesiones, vista de sesión activa y retorno entre pantallas.
- Se mejoró la gestión clínica de sesión: **finalizar**, **suspender con motivo**, bloqueo de edición cuando está finalizada y opción de volver a editar.
- Se separaron correctamente los campos de **descripción de sesión** y **observación general**, evitando mezcla de datos.
- Se rediseñó la sección de sesiones con visualizaciones: **gráfico de rendimiento por sesión (%)**, métricas de asistencia y motivos de suspensión.
- Se agregó en dashboard el bloque **Sesiones para hoy** y se optimizó con endpoint dedicado `sessions/today`.
- Se estandarizaron textos y estados: uso de **plan de tratamiento**, estado **pendiente/finalizada/suspendida**, etiquetas visuales y formato de fecha `día-mes-año`.
- Se aplicaron migraciones para soportar los cambios de datos (`rating` nullable, renombre de estado `draft` -> `pendiente`, y `general_observation` en sesiones).

---

> Sugerencia: agregar una nueva sección por fecha para cada mini nota futura.

## Release - Banco de tareas y usabilidad (2026-05-05)

- Se modularizó la sección de **Banco de tareas** en frontend y se alineó la UX con el patrón de sesiones: listado principal, botón de creación y formulario en modal.
- Se agregaron filtros avanzados del banco: búsqueda por texto, orden, categorías, favoritas, recientes e inclusión de archivadas.
- Se implementó contador de uso por plantilla con tooltip accesible, además de metadatos de edición (fecha y último editor).
- Se incorporó **archivado** en vez de eliminación física, con opción de restaurar, manteniendo trazabilidad y relaciones históricas.
- Se habilitó **duplicación de tareas**, favoritos y propagación opcional de cambios hacia tareas en sesiones pendientes.
- Se creó soporte de **categorías persistentes por profesional** (tipo WordPress): selección de categorías existentes y creación de nuevas desde el mismo modal de tarea.
- Se mejoró importación en sesión con selección múltiple de plantillas y vista previa antes de guardar.
- Se añadió vista de **Mi perfil** y menú de usuario en barra superior con submenú (editar perfil/cerrar sesión), optimizando acceso sin recargar el layout.
- Se aplicó regla global de usabilidad: cursor tipo “manito” en elementos interactivos y `not-allowed` en controles deshabilitados.
- Se agregó `DemoDataSeeder` y rutina de repoblado para mantener 2 profesionales demo y 20 estudiantes de prueba durante el desarrollo.

## Release - Biblioteca de medios, perfil y paginación (2026-05-06)

1. Se habilitó edición completa de **Mi perfil** (nombre, RUT, email, profesión y cambio opcional de contraseña) desde una vista formulario integrada al dashboard.
2. Se reforzó el cliente API del frontend para autenticación: soporte de `skipAuth` en rutas públicas, manejo de respuestas no JSON y errores de validación más claros.
3. Se mejoró la experiencia de login con opción de **mostrar contraseña mientras se mantiene presionado** y se refinó el ícono para una apariencia profesional y centrada.
4. Se añadió paginación de **10 elementos por página** en listados clave: banco de tareas, estudiantes, planes y sesiones.
5. Se ajustó la paginación para que no se muestre cuando el total del listado sea **menor o igual a 10**.
6. Se incorporó gestión de diagnósticos reutilizables por profesional al crear/editar estudiantes, con opción de elegir existente o crear uno nuevo.
7. Se amplió el `DemoDataSeeder` para escenarios de prueba más reales: 2 profesionales, 30 estudiantes por profesional, 1 plan por estudiante, 3 sesiones por plan, 2 tareas por sesión y 10 plantillas de banco por profesional.
8. Se implementó **Material complementario en sesión**: carga de archivo, listado, descarga y eliminación dentro del detalle de sesión.
9. Se evolucionó esa función a una **Biblioteca de medios reutilizable por profesional** para evitar subir el mismo archivo varias veces.
10. Se agregó regla de nombres duplicados en biblioteca: si un archivo ya existe, se guarda con sufijo incremental (`-1`, `-2`, ...).
11. Se incorporó advertencia explícita al eliminar desde biblioteca y eliminación en cascada de referencias en sesiones vinculadas.
12. Se mejoró el listado de biblioteca con **vista previa**: miniatura para imágenes e íconos por tipo para PPT y DOC.
13. Se detectó y corrigió bug de miniaturas por rutas con espacios/caracteres especiales, codificando correctamente la URL pública de `storage`.
14. Se añadieron scripts operativos para resguardo y recuperación de datos en desarrollo:
    - `scripts/backup-db.ps1`
    - `scripts/restore-db.ps1`
    - `scripts/check-demo-counts.ps1`
