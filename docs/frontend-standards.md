# Frontend Standards (React)

## Objetivo
Definir reglas obligatorias para construir vistas frontend consistentes, accesibles y mantenibles, siguiendo arquitectura feature-based y buenas practicas modernas de React.

## Stack y principios base
- React con componentes funcionales y hooks.
- Prohibido usar componentes de clase.
- Diseño mobile-first y responsive en todos los modulos.
- Accesibilidad como requisito de salida, no como mejora opcional.

## Convenciones de nombres
- Nombres en ingles para archivos, variables, funciones, componentes y rutas.
- `camelCase` para variables, funciones, props, hooks y utilidades.
- `PascalCase` para componentes React.
- Comentarios en espanol, breves y orientados a contexto.

## Arquitectura feature-based (obligatoria)
- Estructura base recomendada:
  - `src/app/` (entry, providers, router global)
  - `src/shared/` (componentes UI reutilizables, hooks comunes, utilidades, estilos globales)
  - `src/features/auth/`
  - `src/features/students/`
  - `src/features/treatmentPlans/`
  - `src/features/sessions/`
  - `src/features/taskTemplates/`
  - `src/features/reports/`
- Cada feature debe separar, como minimo:
  - `components/`
  - `hooks/`
  - `services/`
  - `pages/` (si aplica)
  - `schemas/` o `validators/` (si aplica)

## Componentes reutilizables
- Crear en `shared/components` todos los bloques transversales:
  - `Button`, `Input`, `Select`, `Textarea`, `FormField`, `Modal`, `Alert`, `Spinner`, `EmptyState`.
- Evitar duplicar markup/estilos entre features.
- Cada componente base debe exponer props de accesibilidad (`aria-*`, `id`, `role`) cuando corresponda.

## Hooks y logica de negocio
- Mantener logica de datos en hooks personalizados por feature.
- Evitar logica de negocio extensa dentro de componentes de vista.
- Hooks comunes (ej. manejo de feedback, debounce, media queries) deben vivir en `shared/hooks`.

## Accesibilidad (ARIA) - criterios obligatorios
- Todos los controles de formulario con etiqueta asociada (`label` + `htmlFor`).
- Campos con error deben usar:
  - `aria-invalid="true"`
  - `aria-describedby` apuntando al mensaje de error.
- Botones icon-only deben tener `aria-label`.
- Modales con:
  - `role="dialog"`, `aria-modal="true"`, foco inicial y retorno de foco al cerrar.
- Navegacion completa por teclado y foco visible en elementos interactivos.

## Responsive design mobile-first
- Diseñar primero para viewport movil.
- Escalar con breakpoints progresivos (`sm`, `md`, `lg`) sin romper jerarquia visual.
- Evitar tablas no adaptables; usar variantes responsivas (cards o scroll horizontal controlado).

## UI/UX visual requerido
- Estilo moderno, limpio y de colores claros.
- Bordes redondeados de `5px` en inputs, botones, tarjetas y modales.
- Formularios simples, con jerarquia clara y campos agrupados por contexto.
- Feedback inmediato al usuario:
  - estados `loading`, `success`, `error`, `empty`.
- Mensajes cortos, accionables y consistentes.

## Validaciones en tiempo real
- Validar campos al escribir o al perder foco, segun criticidad.
- Mostrar errores junto al campo afectado.
- Deshabilitar acciones de submit cuando existan errores bloqueantes.
- Mantener validacion consistente entre frontend y backend.

## Estados y manejo de errores
- Toda vista de datos debe contemplar:
  - estado inicial,
  - carga,
  - error,
  - vacio,
  - exitoso.
- Mostrar mensajes de error amigables; log tecnico solo en consola.

## Definicion de hecho por pagina frontend
- Cumple estructura feature-based.
- Cumple convenciones de nombre.
- Cumple accesibilidad minima ARIA.
- Es responsive mobile-first.
- Usa componentes reutilizables.
- Incluye feedback inmediato y validaciones en tiempo real.
- Sin codigo duplicado evidente ni logica de negocio en vistas.

## Orden recomendado de implementacion de vistas
1. `auth` (login, register, forgot/reset password)
2. `students` (listado + formulario + asignaciones)
3. `treatmentPlans` y `sessions`
4. `taskTemplates` y `sessionTasks`
5. `reports` (PDF sesion, envio correo, consolidado anual)
