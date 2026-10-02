import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function HoverTooltip({ text, children, className = '', ariaLabel = '' }) {
  const triggerRef = useRef(null)
  const [coords, setCoords] = useState(null)

  const hide = () => setCoords(null)

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setCoords({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    })
  }

  useEffect(() => {
    if (!coords) return undefined
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [coords])

  return (
    <>
      <span
        ref={triggerRef}
        className={className}
        tabIndex={0}
        aria-label={ariaLabel || text}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {coords && text
        ? createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[5px] bg-slate-900 px-2 py-1 text-[11px] font-normal text-white shadow-md"
            style={{ top: coords.top, left: coords.left }}
          >
            {text}
          </span>,
          document.body,
        )
        : null}
    </>
  )
}
