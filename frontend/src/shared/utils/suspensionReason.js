export const SUSPENSION_REASON_OPTIONS = [
  { value: 'estudiante_ausente', label: 'Estudiante ausente', token: 'estudiante_ausente' },
  { value: 'licencia_medica_profesional', label: 'Licencia médica profesional', token: 'licencia_medica_profesional' },
  { value: 'suspension_de_clases', label: 'Suspensión de clases', token: 'suspension_de_clases' },
  { value: 'otro', label: 'Otro', token: 'otro' },
]

const TOKEN_ALIASES = {
  estudiante_ausente: 'estudiante_ausente',
  licencia_medica_profesional: 'licencia_medica_profesional',
  suspension_de_clases: 'suspension_de_clases',
  actividad_escolar: 'suspension_de_clases',
  actividad_escolar_suspension: 'suspension_de_clases',
  otro: 'otro',
}

export function buildSuspensionObservation(userNotes, reasonValue, otherDetail = '') {
  const option = SUSPENSION_REASON_OPTIONS.find((item) => item.value === reasonValue)
  const token = option?.token ?? reasonValue
  const cleanedNotes = stripSuspensionMarker(userNotes)
  const cleanedOther = String(otherDetail || '').trim()
  const reasonLine = reasonValue === 'otro' && cleanedOther
    ? `Motivo de suspensión: otro: ${cleanedOther}`
    : `Motivo de suspensión: ${token}`
  const label = reasonValue === 'otro' && cleanedOther
    ? `Otro: ${cleanedOther}`
    : (option?.label ?? reasonValue)

  const parts = []
  if (cleanedNotes) parts.push(cleanedNotes)
  parts.push(reasonLine)

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
  if (!normalized) return null

  const tokenMatch = normalized.match(/motivo de suspensión:\s*([a-z0-9_]+)/i)
  if (tokenMatch?.[1] && TOKEN_ALIASES[tokenMatch[1]]) {
    return TOKEN_ALIASES[tokenMatch[1]]
  }

  if (normalized.includes('actividad escolar') || normalized.includes('actividad_escolar')) {
    return 'suspension_de_clases'
  }

  if (normalized.includes('estudiante ausente') || normalized.includes('estudiante_ausente')) {
    return 'estudiante_ausente'
  }

  if (normalized.includes('licencia medica') || normalized.includes('licencia médica') || normalized.includes('licencia_medica')) {
    return 'licencia_medica_profesional'
  }

  if (normalized.includes('suspension de clases') || normalized.includes('suspensión de clases')) {
    return 'suspension_de_clases'
  }

  return null
}

export function parseSuspensionOtherDetail(generalObservation) {
  const match = String(generalObservation || '').match(/motivo de suspensión:\s*otro:\s*(.+)/i)
  return match?.[1]?.trim() || ''
}

export function getSuspensionReasonShortLabel(generalObservation) {
  const value = parseSuspensionReasonValue(generalObservation)
  if (value === 'estudiante_ausente') return 'ausente'
  if (value === 'licencia_medica_profesional') return 'licencia médica'
  if (value === 'suspension_de_clases') return 'suspensión de clases'
  if (value === 'otro') {
    const detail = parseSuspensionOtherDetail(generalObservation)
    return detail ? `otro (${detail})` : 'otro'
  }
  return ''
}

export function getSuspensionReasonDisplayLabel(generalObservation) {
  const value = parseSuspensionReasonValue(generalObservation)
  if (value === 'otro') {
    const detail = parseSuspensionOtherDetail(generalObservation)
    return detail ? `Otro: ${detail}` : 'Otro'
  }
  const option = SUSPENSION_REASON_OPTIONS.find((item) => item.value === value)
  return option?.label ?? ''
}

export function sessionHasSuspensionReason(generalObservation, reasonValue) {
  return parseSuspensionReasonValue(generalObservation) === reasonValue
}

export function getSuspensionReasonColor(reasonValue) {
  if (reasonValue === 'estudiante_ausente') return '#f59e0b'
  if (reasonValue === 'licencia_medica_profesional') return '#0ea5e9'
  if (reasonValue === 'suspension_de_clases') return '#d946ef'
  if (reasonValue === 'otro') return '#64748b'
  return '#f43f5e'
}
