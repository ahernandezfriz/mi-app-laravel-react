function statusBadgeClass(status) {
  if (status === 'finalizada') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (status === 'suspendida') return 'bg-rose-100 text-rose-800 border-rose-200'
  return 'bg-amber-100 text-amber-800 border-amber-200'
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function SessionContextCard({
  session,
  studentName,
  planYear,
  formattedDate,
  formattedTime,
  statusLabel,
  statusKey,
  suspensionReasonLabel = '',
}) {
  if (!session) return null

  const normalizedStatus = statusKey || session.status
  const sessionWhen = [formattedDate, formattedTime].filter(Boolean).join(' · ')

  return (
    <article className="overflow-hidden rounded-[10px] border border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6e62e5] text-base font-semibold text-white"
            aria-hidden="true"
          >
            {getInitials(studentName)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Estudiante</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold leading-tight text-slate-900">{studentName}</h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(normalizedStatus)}`}>
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {planYear ? `Plan ${planYear}` : 'Plan de tratamiento'}
              {sessionWhen ? (
                <>
                  <span className="mx-1.5 text-slate-300" aria-hidden="true">|</span>
                  <span className="text-slate-500">Sesión {sessionWhen}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2">
        <div className="rounded-[5px] border border-slate-200/80 bg-white/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Objetivo</p>
          <p className="mt-1">{session.objective}</p>
        </div>
        <div className="rounded-[5px] border border-slate-200/80 bg-white/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Descripción</p>
          <p className="mt-1">{session.description || 'Sin descripción'}</p>
        </div>
      </div>

      {normalizedStatus === 'suspendida' && (
        <p className="mt-3 border-t border-violet-100 pt-3 text-sm text-rose-900">
          <span className="font-semibold">Motivo de suspensión:</span>{' '}
          {suspensionReasonLabel || 'No registrado'}
        </p>
      )}
    </article>
  )
}
