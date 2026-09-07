import { useMemo, useState } from 'react'

/**
 * Donut SVG con stroke-dasharray (se actualiza al cambiar %).
 * @param {{
 *   segments: Array<{ key: string, label: string, value: number|string, percent: number, color: string }>,
 *   size?: number,
 *   emptyLabel?: string,
 * }} props
 */
export default function IndicatorDonut({
  segments = [],
  size = 80,
  emptyLabel = 'Sin datos para graficar',
}) {
  const [tooltip, setTooltip] = useState(null)

  const visibleSegments = useMemo(
    () =>
      segments
        .map((segment) => ({
          ...segment,
          percent: Math.max(0, Math.min(100, Number(segment.percent) || 0)),
        }))
        .filter((segment) => segment.percent > 0),
    [segments],
  )

  const chartSignature = visibleSegments.map((s) => `${s.key}:${s.percent}:${s.color}`).join('|')
  const hasData = visibleSegments.length > 0

  // Radio con circunferencia ≈ 100, para mapear % directo a dasharray.
  const radius = 15.9155
  const center = 18
  const strokeWidth = 3.8

  let usedPercent = 0
  const rings = visibleSegments.map((segment) => {
    const startPercent = usedPercent
    usedPercent += segment.percent
    return {
      ...segment,
      // Parte desde arriba (-90°) y avanza según el acumulado.
      rotate: -90 + startPercent * 3.6,
      strokeDasharray: `${segment.percent} ${Math.max(100 - segment.percent, 0)}`,
    }
  })

  function showTooltip(event, payload) {
    const node = event.currentTarget.closest('svg') || event.currentTarget
    const bounds = node.getBoundingClientRect()
    setTooltip({
      ...payload,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }

  return (
    <div
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
      onMouseLeave={() => setTooltip(null)}
    >
      <svg
        key={chartSignature || 'empty'}
        width={size}
        height={size}
        viewBox="0 0 36 36"
        role="img"
        aria-label="Gráfico de indicadores"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />

        {!hasData ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#cbd5e1"
            strokeWidth={strokeWidth}
            className="cursor-help"
            onMouseEnter={(event) => showTooltip(event, { label: emptyLabel, detail: '' })}
            onMouseMove={(event) => showTooltip(event, { label: emptyLabel, detail: '' })}
          >
            <title>{emptyLabel}</title>
          </circle>
        ) : (
          rings.map((ring) => (
            <circle
              key={`${ring.key}-${ring.percent}-${ring.color}-${ring.rotate}`}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={ring.color}
              strokeWidth={strokeWidth}
              strokeDasharray={ring.strokeDasharray}
              strokeDashoffset={0}
              transform={`rotate(${ring.rotate} ${center} ${center})`}
              className="cursor-pointer"
              onMouseEnter={(event) =>
                showTooltip(event, {
                  label: ring.label,
                  detail: `${ring.value} (${ring.percent}%)`,
                })
              }
              onMouseMove={(event) =>
                showTooltip(event, {
                  label: ring.label,
                  detail: `${ring.value} (${ring.percent}%)`,
                })
              }
            >
              <title>{`${ring.label}: ${ring.value} (${ring.percent}%)`}</title>
            </circle>
          ))
        )}
      </svg>

      {tooltip ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 max-w-[12rem] -translate-x-1/2 -translate-y-full rounded-[5px] bg-slate-900 px-2 py-1 text-left text-[11px] font-normal leading-snug text-white shadow-md"
          style={{
            left: Math.min(Math.max(tooltip.x, 28), size - 28),
            top: Math.max(tooltip.y - 10, 10),
          }}
        >
          <p className="font-semibold">{tooltip.label}</p>
          {tooltip.detail ? <p className="opacity-90">{tooltip.detail}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
