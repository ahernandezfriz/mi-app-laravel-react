import { toLocalISODate } from '../../../shared/utils/date'

export default function DashboardScheduledSessions({
  selectedDate,
  formatDisplayDate,
  formatDisplayTime,
  sessions,
  displaySessionStatus,
  displaySessionStatusLabel,
  getSessionEntryActionLabel,
  getSessionEntryActionClass,
  onOpenSession,
}) {
  const isToday = selectedDate === toLocalISODate()

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">
          {isToday ? 'Sesiones para hoy' : 'Sesiones del día'}
        </h2>
        <span className="text-xs text-slate-500">{formatDisplayDate(selectedDate)}</span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-500">
          No hay sesiones agendadas para este día.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[5px] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Estudiante</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Hora</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Curso</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Plan</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Objetivo</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Estado</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sessions.map((item) => {
                const sessionStatus = displaySessionStatus(item.session.status)
                const actionLabel = getSessionEntryActionLabel(item.session.status)
                const icon =
                  sessionStatus === 'pendiente' ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                      <path d="m10 14 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : sessionStatus === 'finalizada' ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 19h16" strokeLinecap="round" />
                      <path d="M7 15l3-3 3 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M2.2 12c1.2-4 4.9-7 9.8-7s8.6 3 9.8 7c-1.2 4-4.9 7-9.8 7s-8.6-3-9.8-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )

                return (
                  <tr key={`${item.student.id}-${item.plan.id}-${item.session.id}`} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{item.student.full_name}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDisplayTime(item.session.session_time)}</td>
                    <td className="px-3 py-2 text-slate-700">{item.student.course?.display_name || 'Sin curso'}</td>
                    <td className="px-3 py-2 text-slate-700">{item.plan.year}</td>
                    <td className="px-3 py-2 text-slate-700">{item.session.objective}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-[5px] px-2 py-1 text-xs font-semibold ${
                          sessionStatus === 'finalizada'
                            ? 'bg-emerald-100 text-emerald-700'
                            : sessionStatus === 'suspendida'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {displaySessionStatusLabel(item.session)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className={getSessionEntryActionClass(item.session.status)}
                        onClick={() => onOpenSession(item)}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {icon}
                          <span>{actionLabel}</span>
                        </span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
