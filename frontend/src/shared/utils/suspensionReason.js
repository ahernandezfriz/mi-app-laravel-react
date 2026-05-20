export const SUSPENSION_REASON_OPTIONS = [
  { value: 'estudiante_ausente', label: 'Estudiante ausente', token: 'estudiante_ausente' },
  { value: 'actividad_escolar_suspension', label: 'Actividad escolar/suspensión', token: 'actividad_escolar' },
]

export function buildSuspensionObservation(userNotes, reasonValue) {
  const option = SUSPENSION_REASON_OPTIONS.find((item) => item.value === reasonValue)
  const token = option?.token ?? reasonValue
  const label = option?.label ?? reasonValue
  const cleanedNotes = stripSuspensionMarker(userNotes)
  const parts = []

  if (cleanedNotes) {
    parts.push(cleanedNotes)
  }

  parts.push(`Motivo de suspensión: ${token}`)

  return {
    text: parts.join('\n\n'),
    label,
    token,
  }
}

export function stripSuspensionMarker(text) {
  if (!text) return ''
  return String(text)
    .replace(/\n?\n?Motivo de suspensión:\s*[^\n]+/gi, '')
    .trim()
}

export function parseSuspensionReasonValue(generalObservation) {
  const normalized = (generalObservation || '').toLowerCase()

  const tokenMatch = normalized.match(/motivo de suspensión:\s*([a-z0-9_]+)/i)
  if (tokenMatch?.[1]) {
    const token = tokenMatch[1]
    const byToken = SUSPENSION_REASON_OPTIONS.find((item) => item.token === token)
    if (byToken) return byToken.value
  }

  if (normalized.includes('actividad escolar') || normalized.includes('actividad_escolar')) {
    return 'actividad_escolar_suspension'
  }

  if (normalized.includes('estudiante ausente') || normalized.includes('estudiante_ausente')) {
    return 'estudiante_ausente'
  }

  return null
}

export function getSuspensionReasonShortLabel(generalObservation) {
  const value = parseSuspensionReasonValue(generalObservation)
  if (value === 'estudiante_ausente') return 'ausente'
  if (value === 'actividad_escolar_suspension') return 'actividad escolar'
  return ''
}

export function getSuspensionReasonDisplayLabel(generalObservation) {
  const value = parseSuspensionReasonValue(generalObservation)
  const option = SUSPENSION_REASON_OPTIONS.find((item) => item.value === value)
  return option?.label ?? ''
}

export function sessionHasSuspensionReason(generalObservation, reasonValue) {
  return parseSuspensionReasonValue(generalObservation) === reasonValue
}
