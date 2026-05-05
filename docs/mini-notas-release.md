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
