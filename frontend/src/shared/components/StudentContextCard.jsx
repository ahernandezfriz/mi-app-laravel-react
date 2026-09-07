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

function MetaItem({ label, value, wrap = false }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-sm text-slate-800 ${wrap ? 'whitespace-normal' : 'truncate'}`}>{value}</p>
    </div>
  )
}

export default function StudentContextCard({ student, planCount = 0 }) {
  if (!student) return null

  const course = student.course?.display_name || 'Sin curso'
  const ageLabel = student.exact_age || formatExactAge(student.birth_date) || 'Sin fecha de nacimiento'
  const diagnosisLabel = Array.isArray(student.diagnoses) && student.diagnoses.length > 0
    ? student.diagnoses.map((d) => d.name).join('; ')
    : student.current_diagnosis

  return (
    <article className="overflow-hidden rounded-[10px] border border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#6e62e5] text-lg font-semibold text-white"
            aria-hidden="true"
          >
            {getInitials(student.full_name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Estudiante</p>
            <h3 className="truncate text-xl font-semibold text-slate-900">{student.full_name}</h3>
            <p className="mt-0.5 text-sm text-slate-600">{course}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-700">{ageLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
          <MetaItem label="RUT" value={student.rut} />
          <MetaItem label="Edad" value={ageLabel} />
          <MetaItem label="Diagnóstico" value={diagnosisLabel} wrap />
          <MetaItem label="Apoderado" value={student.guardian_name} />
          <MetaItem label="Contacto" value={student.guardian_email || student.guardian_phone} />
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
