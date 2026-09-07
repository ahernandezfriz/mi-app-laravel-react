/**
 * Utilidades de RUT chileno.
 * Formato canónico de almacenamiento/visualización: 12.345.678-9
 */

/** RUT comodín temporal: válido y reutilizable en estudiantes. */
export const WILDCARD_RUT = '1.111.111-1'

export function cleanRut(value) {
  return String(value || '')
    .trim()
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/\s+/g, '')
    .toUpperCase()
}

export function isWildcardRut(value) {
  return cleanRut(value) === cleanRut(WILDCARD_RUT)
}

export function computeRutDv(body) {
  const digits = String(body || '').replace(/\D/g, '')
  if (!digits) return ''

  let sum = 0
  let multiplier = 2
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    sum += Number(digits[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = 11 - (sum % 11)
  if (remainder === 11) return '0'
  if (remainder === 10) return 'K'
  return String(remainder)
}

export function formatRut(value) {
  const clean = cleanRut(value)
  if (!clean) return ''

  const body = clean.slice(0, -1).replace(/\D/g, '')
  const dv = clean.slice(-1)
  if (!body) return dv.match(/^[0-9K]$/) ? dv : ''

  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots}-${dv}`
}

/**
 * Normaliza mientras el usuario escribe: solo dígitos + K, con puntos y guion.
 * Acepta entrada con o sin formato.
 */
export function normalizeRutInput(value) {
  let clean = cleanRut(value).replace(/[^0-9K]/g, '')
  // Solo una K y solo como dígito verificador (al final)
  if (clean.includes('K')) {
    clean = clean.replace(/K/g, '')
    clean = `${clean}K`
  }
  // Máximo 8 dígitos de cuerpo + DV
  if (clean.endsWith('K')) {
    const body = clean.slice(0, -1).slice(0, 8)
    clean = `${body}K`
  } else {
    clean = clean.slice(0, 9)
  }

  if (clean.length <= 1) return clean

  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots}-${dv}`
}

export function isValidChileanRut(value) {
  if (isWildcardRut(value)) return true

  const clean = cleanRut(value)
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false

  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  // Evitar RUTs triviales (todo ceros)
  if (/^0+$/.test(body)) return false

  return computeRutDv(body) === dv
}

export function getRutValidationError(value) {
  const clean = cleanRut(value)
  if (!clean) return 'El RUT es obligatorio.'
  if (isWildcardRut(value)) return ''
  if (clean.length < 8) return 'El RUT esta incompleto.'
  if (!/^\d{7,8}[0-9K]$/.test(clean)) {
    return 'Formato de RUT invalido. Usa 12345678-9 o 12.345.678-9.'
  }
  if (!isValidChileanRut(clean)) {
    return 'El RUT ingresado no es valido (digito verificador incorrecto).'
  }
  return ''
}
