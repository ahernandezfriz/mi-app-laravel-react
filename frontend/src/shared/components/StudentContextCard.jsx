import { formatExactAge } from '../utils/exactAge'

function getInitials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

export default function StudentContextCard({ student, planCount = 0, planYear = null }) {
  if (!student) return null

  const course = student.course?.display_name || 'Sin curso'
  const ageLabel = student.exact_age || formatExactAge(student.birth_date) || 'Sin fecha de nacimiento'
  const diagnosisLabel = Array.isArray(student.diagnoses) && student.diagnoses.length > 0
    ? student.diagnoses.map((d) => d.name).join('; ')
    : student.current_diagnosis

  return (
    <article className="overflow-hidden rounded-[10px] border border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6e62e5] text-base font-semibold text-white"
          aria-hidden="true"
        >
          {getInitials(student.full_name)}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Estudiante</p>
          <h3 className="text-2xl font-semibold leading-tight text-slate-900">{student.full_name}</h3>
          <p className="mt-1 text-sm font-medium text-slate-700">{ageLabel}</p>
          {diagnosisLabel ? (
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-semibold text-slate-800">Diagnóstico:</span> {diagnosisLabel}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-slate-500">
            {course}
            {planYear ? (
              <>
                <span className="mx-1.5 text-slate-300" aria-hidden="true">|</span>
                <span>Plan {planYear}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {planCount > 0 && (
        <p className="mt-3 border-t border-violet-100 pt-3 text-xs text-slate-600">
          <strong className="text-slate-800">{planCount}</strong>{' '}
          {planCount === 1 ? 'plan de tratamiento registrado' : 'planes de tratamiento registrados'}
        </p>
      )}
    </article>
  )
}
