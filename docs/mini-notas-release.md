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

## Release - Sesiones, tareas de sesión y curso del plan (2026-10-01)

1. **Volver a editar** una sesión finalizada pide confirmación antes de reabrirla a borrador.
2. Desde el listado se puede editar fecha y objetivo de sesiones finalizadas, sin reabrir el contenido de tareas.
3. Las tareas de una sesión se editan con **Editar** (nombre y descripción); el cambio no altera el banco. La descripción se ingresa en un textarea.
4. Bajo cada tarea se muestra el origen: `Nueva`, `Banco de tareas` o `Banco de tareas (editada)` solo si se modificó una tarea importada (`edited_from_bank`).
5. Al editar una tarea del banco, el sistema advierte que el cambio aplica solo a esa sesión.
6. Cambiar la calificación de una tarea ya no borra la observación escrita.
7. Cada plan anual guarda el curso escolar al crearse. Al crear un plan posterior se pregunta si el estudiante **avanza de curso** o **se mantiene (repite)** (Prekínder → Kínder → 1–8 Básico → 1–4 Medio, misma sección). El PDF consolidado usa el curso histórico del plan.

## Release - Listado de sesiones, PDF y confirmaciones (2026-10-02)

1. Suspender una sesión usa radios fijos: **Estudiante ausente**, **Licencia médica profesional**, **Suspensión de clases** y **Otro** (con texto). Los valores antiguos de actividad escolar se leen como suspensión de clases.
2. En el listado, la columna Fecha muestra el estado sobre la fecha, la fecha en negrita (`28 SEP 2026`) y la hora debajo. **Suspendida** abre un tooltip con el motivo, sin recortar el texto.
3. Cabecera de sesión: ~40 % ficha del estudiante y ~60 % objetivo/descripción. Encabezados de tabla en mayúsculas. **Contenido bloqueado** resaltado en ámbar.
4. El PDF de sesión incluye la **observación general** después de las tareas (sin el marcador interno del motivo). Nombre de archivo: `nombre-apellido-dd-mmm-yyyy-HHmmss.pdf`.
5. El PDF consolidado, en sesiones suspendidas, imprime solo fecha, estado y motivo. Nombre: `nombre-apellido-plan-consolidado-{año}.pdf`.
6. Mientras se genera un PDF aparece un indicador en la esquina inferior derecha.
7. Eliminar un **plan anual** o un **taller** pide confirmación en un modal (ya no `window.confirm`).
8. El perfil del profesional admite **Registro secreduc**; se imprime en la firma de los informes.
