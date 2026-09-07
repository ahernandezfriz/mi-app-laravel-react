# Roadmap - Sistema de Gestion (Laravel + React)

## Objetivo de esta fase
Dejar operativo un entorno de desarrollo reproducible con Docker para backend en Laravel, frontend con Vite y base de datos MySQL, con soporte para crecimiento por etapas.

## Fase 1 - Base de desarrollo (actual)
- [x] Definir stack de contenedores: `backend` (php-fpm), `nginx`, `frontend` (Vite), `db` (MySQL).
- [x] Exponer puertos de desarrollo: API en `8080` y frontend en `5173`.
- [x] Habilitar persistencia de base de datos (`db_data`).
- [x] Configurar red interna de servicios (`gestion-network`).
- [ ] Crear proyecto Laravel en `./backend` (si aun no existe).
- [ ] Crear proyecto React + Vite en `./frontend` (si aun no existe).
- [ ] Levantar entorno y validar endpoints basicos.

## Fase 2 - Fundaciones del backend
- [ ] Configurar `.env` de Laravel para Docker (`DB_HOST=db`, credenciales de app).
- [ ] Instalar dependencias y generar `APP_KEY`.
- [ ] Definir primer modulo de autenticacion y usuarios (alcance por confirmar).
- [ ] Estandarizar estructura de API (`/api/v1`).
- [ ] Definir estrategia de validaciones, errores y logging.

## Fase 3 - Fundaciones del frontend
- [ ] Estructurar proyecto React (router, estado, servicios API).
- [ ] Configurar cliente HTTP con `VITE_API_URL`.
- [ ] Definir layout inicial del sistema de gestion.
- [ ] Implementar manejo de sesiones/tokens segun estrategia de auth.

## Fase 4 - Calidad y productividad
- [ ] Definir linters y formateo (PHP/JS).
- [ ] Incorporar pruebas base (backend + frontend).
- [ ] Definir convenciones de ramas y commits.
- [ ] Agregar scripts de arranque rapido para el equipo.

## Fase 5 - Endurecimiento tecnico
- [ ] Separar `docker-compose.dev.yml` y `docker-compose.prod.yml`.
- [ ] Introducir secretos fuera del compose.
- [ ] Agregar cache/queue (Redis) cuando el dominio lo requiera.
- [ ] Preparar pipeline CI para pruebas y build.

## Fase 6 - Autenticacion social (futuro, no iniciado)
> Objetivo: permitir ingresar/registrarse con proveedores externos (prioridad Gmail), sin reemplazar el login actual por email/contraseña.

### Alcance propuesto
- [ ] Login / registro con **Google (Gmail)**.
- [ ] Evaluar segundo proveedor (Microsoft o Apple) segun demanda.
- [ ] Mantener flujo actual (email + password + RUT + profesion) como opcion primaria o complementaria.
- [ ] Vincular cuenta social a usuario existente (mismo email) sin duplicar perfiles.
- [ ] Completar datos obligatorios post-OAuth (RUT, profesion) si el proveedor no los entrega.
- [ ] Botones en pantallas `/app/login` y `/app/register`.

### Enfoque tecnico sugerido
- [ ] Backend: Laravel Socialite (+ Sanctum token al finalizar el flujo).
- [ ] Frontend: boton OAuth que redirige al callback del backend y recibe token.
- [ ] Guardar `provider` + `provider_id` en `users` (nullable, unicos por proveedor).
- [ ] Configurar en cPanel/local: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- [ ] Redirect URI produccion: `https://plataformapie.arielhf.cl/api/auth/google/callback` (o ruta equivalente).
- [ ] Revisar CORS, cookies Secure y dominio del subdominio.

### Criterios de aceptacion
- [ ] Usuario nuevo con Google crea cuenta y queda autenticado.
- [ ] Usuario existente con el mismo email puede vincular Google y entrar.
- [ ] Si faltan RUT/profesion, se muestra un paso de completado obligatorio.
- [ ] Logout invalida el token Sanctum igual que hoy.
- [ ] Fallos de OAuth muestran mensaje claro (sin silencio en UI).

### Riesgos / notas
- En hosting sin SSH, la configuracion de secrets va en `.env` de cPanel.
- Google Cloud Console debe autorizar el origen y el callback HTTPS.
- Definir politica si el email de Google ya existe con otra contraseña (vincular vs bloquear).
- No ejecutar esta fase hasta cerrar estabilizacion de auth actual en produccion.

## Fase 7 - Verificacion de email al registrarse (futuro, no iniciado)
> Objetivo: confirmar que el correo del profesional es valido antes de usar (o con restricciones) la plataforma.

### Alcance propuesto
- [ ] Tras registro con email/contraseña, enviar enlace o codigo de verificacion al correo.
- [ ] Marcar `email_verified_at` en `users` (Laravel MustVerifyEmail / notificacion).
- [ ] Pantalla "Revisa tu correo" + reenvio de verificacion (con rate limit).
- [ ] Bloquear o limitar endpoints sensibles hasta verificar (definir politica: total vs parcial).
- [ ] Integrar con auth social: si Google ya verifico el email, marcar como verificado automaticamente.
- [ ] Mensajes claros si el enlace expiro o ya fue usado.

### Enfoque tecnico sugerido
- [ ] Backend: trait `MustVerifyEmail` + rutas `/api/auth/email/verify/{id}/{hash}` y `/api/auth/email/resend`.
- [ ] Frontend: banner/aviso si no verificado; flujo post-registro hacia pantalla de espera.
- [ ] Configurar mailer real en produccion (`MAIL_*` en `.env` de cPanel; hoy suele estar en `log`).
- [ ] Usar cola (`queue`) si el envio de correo se vuelve lento.
- [ ] Tokens firmados con expiracion (comportamiento estandar Laravel).

### Criterios de aceptacion
- [ ] Registro envia correo de verificacion.
- [ ] Sin verificar, el usuario ve aviso y (segun politica) no accede a funciones clinicas.
- [ ] El enlace verifica y redirige a `/app/login` o dashboard autenticado.
- [ ] Reenvio funciona y no permite spam (limite por minuto/hora).
- [ ] Cuenta Google con email verificado no exige un segundo paso de email.

### Riesgos / notas
- En cPanel hace falta SMTP funcional (o API de correo); sin eso la feature no sirve en produccion.
- Coordinar textos del correo (marca Plataforma PIE / Mi App Terapias).
- No iniciar hasta tener mailer de produccion probado (al menos un envio real).

## Fase 8 - Ficha del estudiante: multi-diagnostico y edad exacta (futuro, no iniciado)
> Objetivo: enriquecer la ficha clinica del paciente (estudiante) con diagnosticos multiples y edad precisa a partir de la fecha de nacimiento.

### 8.1 Multiples diagnosticos por estudiante
- [x] Permitir que un estudiante tenga **uno o mas diagnosticos** (hoy: diagnostico unico / principal).
- [x] En crear/editar estudiante: selector multiple (agregar/quitar diagnosticos del catalogo del profesional).
- [x] Definir si hay un diagnostico **principal** (marcado) para planes/reportes, o lista sin jerarquia.
- [x] Migracion: tabla pivote `student_student_diagnosis` (o equivalente) + migrar el diagnostico actual al primer registro.
- [x] Actualizar listados, tarjetas de contexto, planes (`diagnosis_snapshot`) e informes PDF para mostrar todos o el principal + resto.
- [x] Filtros por diagnostico deben considerar pertenencia a la lista (no solo el campo unico actual).

### 8.2 Fecha de nacimiento y edad exacta
- [x] Agregar campo obligatorio `birth_date` (fecha de nacimiento) al crear/editar estudiante.
- [x] Validar fecha coherente (no futura; rango clinico razonable, ej. preescolar a 4 medio).
- [x] Mostrar **edad exacta** en pantallas del estudiante con formato legible, ej.: `7 años 3 meses 20 dias`.
- [x] Calcular edad al dia actual (recalcular en cada vista; no guardar edad estatica).
- [x] Ubicaciones UI: listado, ficha/contexto del estudiante, planes, detalle de sesión.
- [ ] Reportes PDF: incluir edad exacta (a la fecha del informe o a hoy: definir).
- [x] Utilidad compartida frontend + backend (misma regla de calculo) para evitar diferencias.

### Enfoque tecnico sugerido
- [ ] Migraciones: `students.birth_date` (date) + relacion N:M estudiantes <-> diagnosticos.
- [ ] API: aceptar `birth_date` y `diagnosis_ids[]` (o `diagnoses` con `is_primary`).
- [ ] Helper `formatExactAge(birthDate, referenceDate = today)` → años/meses/dias.
- [ ] Compatibilidad: estudiantes antiguos sin `birth_date` muestran "Sin fecha de nacimiento" hasta completar el dato.
- [ ] Snapshot de plan: decidir si guarda texto concatenado de diagnosticos o solo el principal.

### Criterios de aceptacion
- [x] Se puede asignar 2+ diagnosticos a un estudiante y editarlos despues.
- [x] Al crear estudiante se exige fecha de nacimiento.
- [x] En pantallas del estudiante se ve la edad exacta (años, meses y dias).
- [x] Listados/PDF no rompen con datos legacy (null birth_date / un solo diagnostico migrado).
- [x] Unicidad y permisos de diagnosticos por profesional se mantienen.

### Riesgos / notas
- Cambiar de 1 a N diagnosticos impacta filtros, seeders demo, PDF y `diagnosis_snapshot`.
- Definir timezone (Chile) para el calculo de edad al borde de medianoche.
- Multi-diagnostico: lista sin jerarquia visible; el primero queda como referencia en `student_diagnosis_id` y `current_diagnosis` concatena todos con "; " (planes/PDF usan ese texto).

## Orden recomendado de implementacion (menos → mas invasivo)

Prioridad practica para aplicar los items futuros de dominio/auth, sin cambiar aun el codigo:

1. **Fecha de nacimiento + edad exacta (Fase 8.2)** — menos invasivo  
2. **Multiples diagnosticos (Fase 8.1)** — medio  
3. **Verificacion de email (Fase 7)** — alto (infra + flujo auth)  
4. **Auth social / Gmail (Fase 6)** — mas invasivo  

Detalle del criterio: ver conversacion / notas de producto; 8.2 toca un campo nuevo y vistas; 8.1 cambia modelo 1→N; 7 depende de SMTP; 6 suma OAuth, consola Google y vinculacion de cuentas.
