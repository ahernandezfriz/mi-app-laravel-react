const COURSE_SEQUENCE = [
  { level: 'prebasica', grade: 'Prekinder' },
  { level: 'prebasica', grade: 'Kinder' },
  { level: 'basica', grade: '1' },
  { level: 'basica', grade: '2' },
  { level: 'basica', grade: '3' },
  { level: 'basica', grade: '4' },
  { level: 'basica', grade: '5' },
  { level: 'basica', grade: '6' },
  { level: 'basica', grade: '7' },
  { level: 'basica', grade: '8' },
  { level: 'media', grade: '1' },
  { level: 'media', grade: '2' },
  { level: 'media', grade: '3' },
  { level: 'media', grade: '4' },
]

function findLevelForCourse(levels, course) {
  if (!course || !Array.isArray(levels)) return null
  return levels.find((level) => String(level.id) === String(course.school_level_id))
    || levels.find((level) => (level.courses || []).some((item) => String(item.id) === String(course.id)))
    || null
}

export function getPreviousPlanForYear(plans, year) {
  const targetYear = Number(year)
  if (!Number.isFinite(targetYear) || !Array.isArray(plans)) return null
  return [...plans]
    .filter((plan) => Number(plan.year) < targetYear)
    .sort((a, b) => Number(b.year) - Number(a.year))[0] || null
}

export function getNextSchoolCourse(levels, course) {
  const currentLevel = findLevelForCourse(levels, course)
  if (!course || !currentLevel) return null

  const index = COURSE_SEQUENCE.findIndex(
    (item) => item.level === currentLevel.name && String(item.grade) === String(course.grade),
  )
  if (index < 0 || index >= COURSE_SEQUENCE.length - 1) return null

  const next = COURSE_SEQUENCE[index + 1]
  const nextLevel = levels.find((level) => level.name === next.level)
  if (!nextLevel) return null

  return (nextLevel.courses || []).find(
    (item) => String(item.grade) === String(next.grade) && String(item.section) === String(course.section || ''),
  ) || null
}

export function getPlanCoursePreview(levels, student, plans, year, repeatsCourse) {
  const previousPlan = getPreviousPlanForYear(plans, year)
  const referenceCourse = previousPlan?.course || student?.course || null
  const nextCourse = getNextSchoolCourse(levels, referenceCourse)
  const selectedCourse = previousPlan
    ? (repeatsCourse ? referenceCourse : nextCourse)
    : referenceCourse

  return {
    previousPlan,
    referenceCourse,
    nextCourse,
    selectedCourse,
    isFirstPlan: !previousPlan,
  }
}
