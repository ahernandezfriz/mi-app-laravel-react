import { useMemo } from 'react'
import {
  buildCalendarCells,
  isoDateFromParts,
  monthYearFromISODate,
  parseISODate,
  toLocalISODate,
} from '../utils/date'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default function SessionsDayCalendar({
  selectedDate,
  onSelectDate,
  viewMonth,
  onViewMonthChange,
  sessionCountsByDate = {},
}) {
  const todayIso = useMemo(() => toLocalISODate(), [])
  const { year, month } = viewMonth
  const cells = useMemo(() => buildCalendarCells(year, month), [year, month])

  function shiftMonth(delta) {
    const base = new Date(year, month - 1 + delta, 1)
    onViewMonthChange({ year: base.getFullYear(), month: base.getMonth() + 1 })
  }

  function handleSelectDay(day) {
    const iso = isoDateFromParts(year, month, day)
    onSelectDate(iso)
    onViewMonthChange(monthYearFromISODate(iso))
  }

  function handleGoToday() {
    onSelectDate(todayIso)
    onViewMonthChange(monthYearFromISODate(todayIso))
  }

  const selectedParts = monthYearFromISODate(selectedDate)
  const isSelectedInView =
    selectedParts.year === year && selectedParts.month === month

  return (
    <div className="rounded-[5px] border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-[5px] border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => shiftMonth(-1)}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">
            {MONTH_LABELS[month - 1]} {year}
          </p>
        </div>
        <button
          type="button"
          className="rounded-[5px] border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => shiftMonth(1)}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="mb-2 flex justify-end">
        <button
          type="button"
          className="text-xs font-medium text-[#6e62e5] hover:underline"
          onClick={handleGoToday}
        >
          Ir a hoy
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <span key={`empty-${index}`} className="h-9" aria-hidden="true" />
          }

          const iso = isoDateFromParts(year, month, day)
          const isToday = iso === todayIso
          const isSelected = isSelectedInView && selectedDate === iso
          const count = sessionCountsByDate[iso] ?? 0

          return (
            <button
              key={iso}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={`relative flex h-9 flex-col items-center justify-center rounded-[5px] text-sm transition ${
                isSelected
                  ? 'bg-[#6e62e5] font-semibold text-white shadow-sm'
                  : isToday
                    ? 'border border-[#6e62e5]/40 bg-white font-semibold text-[#6e62e5]'
                    : 'bg-white text-slate-700 hover:bg-violet-50'
              }`}
              aria-label={`${day} de ${MONTH_LABELS[month - 1]}, ${count} sesiones`}
              aria-pressed={isSelected}
            >
              <span>{day}</span>
              {count > 0 && (
                <span
                  className={`absolute bottom-0.5 h-1.5 w-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-[#6e62e5]'
                  }`}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Día seleccionado:{' '}
        <span className="font-medium text-slate-700">
          {parseISODate(selectedDate).toLocaleDateString('es-CL', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </p>
    </div>
  )
}
