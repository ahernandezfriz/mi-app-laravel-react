const MAX_SAFE_LENGTH = 180

const GENERIC_MESSAGES = new Set([
  'Server Error',
  'Unauthenticated.',
  'Unauthenticated',
  'This action is unauthorized.',
  'Too Many Attempts.',
  'The given data was invalid.',
  'Not found.',
  'Whoops, looks like something went wrong.',
  'Bad request.',
  'Failed to fetch',
  'NetworkError when attempting to fetch resource.',
  'Load failed',
])

const TECHNICAL_RE = /SQLSTATE|SQL:|unknown column|base table or view|integrity constraint|connection:\s*\w+|database:\s*\w+|no query results for model|Illuminate\\|App\\Models\\|PDOException|QueryException|\/vendor\/|\/var\/www|\/home\/|stack trace|on line\s+\d+|select\s+.+\s+from\s+|insert\s+into\s+|update\s+\w+\s+set\s+|delete\s+from\s+|SQLSTATE\[|#\d+\s+|in [A-Z]:\\|in \/[\w.\-]+\/.*\.php|mysqli_|pgsql_|sqlite_|access denied for user|using password|errorInfo|Error del servidor\s*\(\d+\)/i

export function isTechnicalErrorMessage(message) {
  if (message == null) return false
  const trimmed = String(message).trim()
  if (!trimmed) return false
  if (trimmed.length > MAX_SAFE_LENGTH) return true
  if (GENERIC_MESSAGES.has(trimmed)) return true
  return TECHNICAL_RE.test(trimmed)
}

export function humanMessageForStatus(status) {
  if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.'
  if (status === 403) return 'No tienes permiso para esta acción.'
  if (status === 404) return 'No se encontró lo solicitado.'
  if (status === 413) return 'El archivo es demasiado grande. Usa uno de hasta 10 MB.'
  if (status === 419) return 'La sesión expiró. Recarga la página e inténtalo de nuevo.'
  if (status === 422) return 'Revisa los datos ingresados e inténtalo de nuevo.'
  if (status === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  if (status === 503) return 'El servicio no está disponible. Inténtalo más tarde.'
  return 'No se pudo completar la operación. Inténtalo más tarde.'
}

function flattenValidationErrors(errors) {
  if (!errors || typeof errors !== 'object') return ''
  return Object.values(errors)
    .flat()
    .filter((item) => typeof item === 'string' && item.trim() && !isTechnicalErrorMessage(item))
    .join(' ')
}

export function userFacingApiError(status, payload = {}) {
  const validation = flattenValidationErrors(payload?.errors)
  if (validation) return validation

  const raw = typeof payload?.message === 'string' ? payload.message : ''
  if (raw && !isTechnicalErrorMessage(raw)) return raw

  return humanMessageForStatus(status)
}

export function userFacingCaughtError(error, fallback = 'No se pudo completar la operación. Inténtalo más tarde.') {
  const message = error instanceof Error ? error.message : String(error || '')
  if (message && !isTechnicalErrorMessage(message)) return message
  return fallback
}
