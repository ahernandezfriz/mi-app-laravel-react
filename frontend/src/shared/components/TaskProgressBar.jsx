export default function TaskProgressBar({ percent, taskCount = null, className = '' }) {
  if (percent == null || Number.isNaN(Number(percent))) {
    return <span className={`text-sm text-slate-400 ${className}`}>—</span>
  }

  const value = Math.min(100, Math.max(0, Math.round(Number(percent))))
  const countLabel = Number.isFinite(Number(taskCount)) && Number(taskCount) > 0
    ? `${taskCount} ${Number(taskCount) === 1 ? 'tarea' : 'tareas'}`
    : null

  return (
    <div
      className={`flex min-w-[10rem] items-center gap-3 ${className}`}
      title={countLabel ? `${value}% · ${countLabel}` : `${value}%`}
    >
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-[#6e62e5] transition-[width]"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-slate-800">
        {value}%
      </span>
    </div>
  )
}
