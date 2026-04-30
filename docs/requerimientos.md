# Informe de Requerimientos Mejorado
## Sistema de gestión de terapias (establecimientos educacionales)
## 1. Objetivo
Desarrollar una plataforma web para gestión y administración de terapias de profesionales (fonoaudiología, kinesiología, terapia ocupacional, psicología, etc.) en contexto escolar, para estudiantes desde Prekínder a 4° Medio.
## 2. Actores y roles
### 2.1 Roles del sistema
- `super_admin`: administra plataforma global.
- `admin_establecimiento`: administra su establecimiento (usuarios, asignaciones, estudiantes).
- `profesional`: gestiona estudiantes, planes, sesiones, tareas e informes.
### 2.2 Profesionales
El profesional debe poder:
- Registrarse con: nombre completo, RUT, email, profesión, contraseña.
- Iniciar sesión y cerrar sesión.
- Editar su perfil (incluyendo contraseña).
- Recuperar contraseña.
Profesiones iniciales (catálogo):
- Fonoaudiólogo/a
- Kinesiólogo/a
- Terapeuta ocupacional
- Psicólogo/a
## 3. Gestión de estudiantes (pacientes)
### 3.1 Operaciones
- Crear, editar, eliminar y listar estudiantes.
### 3.2 Datos de estudiante
- Nombre completo
- RUT
- Diagnóstico actual
- Nivel educacional (único)
- Curso (dependiente del nivel)
- Nombre apoderado
- Teléfono apoderado
- Email apoderado
### 3.3 Niveles y cursos
#### Prebásica
- Prekínder A, B, C
- Kínder A, B, C
#### Básica
- 1A, 1B, 1C
- 2A, 2B, 2C
- 3A, 3B, 3C
- 4A, 4B, 4C
- 5A, 5B, 5C
- 6A, 6B, 6C
- 7A, 7B, 7C
- 8A, 8B, 8C
#### Media
- 1A, 1B, 1C
- 2A, 2B, 2C
- 3A, 3B, 3C
- 4A, 4B, 4C
### 3.4 Reglas
- Solo puede elegir un nivel por estudiante.
- El curso se selecciona según el nivel.
- Formato visual esperado: `1 Básico C`, `2 Medio A`, etc.
### 3.5 Asignación de profesionales
- Un estudiante puede estar asociado a **más de un profesional**.
- La relación es muchos-a-muchos.
- Cada profesional ve y gestiona solo estudiantes a los que esté asignado (excepto roles admin).
## 4. Plan de tratamiento anual
### 4.1 Operaciones
- Crear plan de tratamiento anual por estudiante.
- Ver historial de planes por estudiante.
- Consultar planes históricos por año académico.
### 4.2 Reglas
- Un estudiante puede tener múltiples planes históricos (uno por año).
- Debe existir historial visible en ficha del estudiante.
- Sugerido: evitar duplicidad de plan para mismo estudiante+año.
### 4.3 Diagnóstico y cambios en el tiempo
- El estudiante tiene un diagnóstico actual editable.
- El diagnóstico puede cambiar con el tiempo.
- Para conservar historia clínica, cada plan anual debe guardar `diagnosis_snapshot` (copia del diagnóstico al momento de crear el plan).
## 5. Sesiones terapéuticas
### 5.1 Operaciones
- Crear sesiones dentro de un plan.
- Editar sesiones.
- Finalizar sesiones.
- Ver historial de sesiones por plan.
### 5.2 Datos mínimos de sesión
- Fecha de sesión
- Objetivo de la sesión
- Descripción de actividades/tareas
- Estado (borrador/finalizada)
## 6. Tareas y calificaciones
### 6.1 Biblioteca de tareas reutilizables
- Cada profesional tiene su biblioteca de tareas.
- Puede crear, editar, eliminar tareas.
- Puede reutilizar tareas en distintas sesiones y planes.
### 6.2 Tareas por sesión
- Cada sesión puede incluir varias tareas.
- Datos de tarea: nombre, descripción.
- Calificaciones posibles:
  - Por lograr
  - Lo logra con dificultad
  - Lo logra
### 6.3 Regla de registro y visualización
- La calificación se guarda por **tarea en cada sesión**.
- Al revisar una sesión, se deben ver los resultados de cada tarea de esa sesión.
- Debe existir posibilidad de ver histórico de desempeño por tarea.
## 7. Informes y exportación
### 7.1 Informe por sesión
- Una sesión finalizada se puede exportar a PDF con:
  - datos del estudiante
  - diagnóstico
  - plan de tratamiento
  - sesión y objetivo
  - tareas realizadas y calificaciones
### 7.2 Envío por email
- El informe de sesión se puede enviar al correo del apoderado registrado.
### 7.3 Informe consolidado anual
- Exportación PDF consolidada de un plan de tratamiento con:
  - todas las sesiones
  - todas las tareas
  - calificaciones por sesión
### 7.4 Alcance visual inicial de PDF
- En primera versión no se requiere firma ni logo institucional.
## 8. Requerimientos no funcionales (iniciales)
- Seguridad con autenticación y autorización por rol.
- Trazabilidad/historial de planes por año.
- Validaciones de datos obligatorios (RUT, email, curso, etc.).
- Interfaz clara para uso clínico-educativo diario.