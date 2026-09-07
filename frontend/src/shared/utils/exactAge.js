/**
 * Edad exacta a partir de fecha de nacimiento (YYYY-MM-DD).
 * Ejemplo: "7 años 3 meses 20 días"
 */

function parseLocalDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  const raw = String(value).slice(0, 10)
  const [year, month, day] = raw.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function plural(count, one, many) {
  return count === 1 ? one : many
}

export function formatExactAge(birthDate, referenceDate = new Date()) {
  const birth = parseLocalDate(birthDate)
  const ref = parseLocalDate(referenceDate) || new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  )

  if (!birth || Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) {
    return null
  }
  if (birth > ref) {
    return null
  }

  let years = ref.getFullYear() - birth.getFullYear()
  let months = ref.getMonth() - birth.getMonth()
  let days = ref.getDate() - birth.getDate()

  if (days < 0) {
    months -= 1
    const prevMonth = ref.getMonth() === 0 ? 11 : ref.getMonth() - 1
    const prevMonthYear = ref.getMonth() === 0 ? ref.getFullYear() - 1 : ref.getFullYear()
    days += daysInMonth(prevMonthYear, prevMonth)
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  return `${years} ${plural(years, 'año', 'años')} ${months} ${plural(months, 'mes', 'meses')} ${days} ${plural(days, 'día', 'días')}`
}

export function getBirthDateValidationError(value, { required = true } = {}) {
  if (!value) {
    return required ? 'La fecha de nacimiento es obligatoria.' : ''
  }

  const birth = parseLocalDate(value)
  if (!birth || Number.isNaN(birth.getTime())) {
    return 'Ingresa una fecha de nacimiento válida.'
  }

  const today = new Date()
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (birth > todayLocal) {
    return 'La fecha de nacimiento no puede ser futura.'
  }

  const min = new Date(todayLocal.getFullYear() - 25, todayLocal.getMonth(), todayLocal.getDate())
  if (birth < min) {
    return 'La fecha de nacimiento está fuera del rango esperado para estudiantes escolares.'
  }

  return ''
}
