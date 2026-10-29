import { toLocalISODate } from '../../shared/utils/date'

export function workshopHeldYear(value) {
  if (value && typeof value === 'object' && value.year != null && value.year !== '') {
    const year = Number(value.year)
    return Number.isFinite(year) ? year : null
  }
  const day = String(value || '').trim().slice(0, 10)
  const year = Number(day.slice(0, 4))
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(year) ? year : null
}

export function resolveWorkshopCourseYear(course, workshops = []) {
  const fromCourse = workshopHeldYear(course)
  if (fromCourse) return fromCourse
  const fromLastHeldOn = workshopHeldYear(course?.last_held_on)
  if (fromLastHeldOn) return fromLastHeldOn
  const datedWorkshop = (workshops || []).find((workshop) => workshopHeldYear(workshop?.held_on))
  return datedWorkshop ? workshopHeldYear(datedWorkshop.held_on) : null
}

export function workshopCourseLabel(course, workshops = []) {
  const name = course?.display_name || 'curso'
  const year = resolveWorkshopCourseYear(course, workshops)
  return year ? `${name} (${year})` : name
}

export function workshopCourseKey(course) {
  return `${course?.id ?? ''}-${course?.year ?? ''}`
}

export function findWorkshopCourseForYear(courses, courseId, year) {
  return (courses || []).find((course) => (
    String(course.id) === String(courseId) && Number(course.year) === Number(year)
  )) || null
}

export function sortNewestFirst(items, dateField, idField = 'id') {
  return [...(items || [])].sort((left, right) => {
    const dateDiff = String(right?.[dateField] || '').slice(0, 10)
      .localeCompare(String(left?.[dateField] || '').slice(0, 10))
    if (dateDiff !== 0) return dateDiff
    return Number(right?.[idField] || 0) - Number(left?.[idField] || 0)
  })
}

export function defaultHeldOnForWorkshopYear(course, today = toLocalISODate()) {
  const year = workshopHeldYear(course)
  const current = String(today || toLocalISODate()).slice(0, 10)
  if (year && current.startsWith(String(year))) {
    return current
  }
  const lastHeldOn = String(course?.last_held_on || '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(lastHeldOn)) {
    return lastHeldOn
  }
  return year ? `${year}-01-01` : current
}
