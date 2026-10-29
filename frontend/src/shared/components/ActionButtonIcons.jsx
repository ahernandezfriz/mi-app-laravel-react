export function PlusIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

export function BackIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M19 12H5" strokeLinecap="round" />
      <path d="m12 19-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DownloadIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M12 4v12" strokeLinecap="round" />
      <path d="m7 11 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" strokeLinecap="round" />
    </svg>
  )
}

export function ViewIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EditIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" strokeLinejoin="round" />
    </svg>
  )
}

export function DeleteIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinejoin="round" />
    </svg>
  )
}

const ICON_ACTION_VARIANTS = {
  edit: {
    icon: <EditIcon />,
    className: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 hover:bg-fuchsia-100',
  },
  download: {
    icon: <DownloadIcon />,
    className: 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100',
  },
  delete: {
    icon: <DeleteIcon />,
    className: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  },
}

export function IconActionButton({
  variant,
  label,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}) {
  const config = ICON_ACTION_VARIANTS[variant]
  if (!config) return null

  return (
    <button
      type={type}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border transition disabled:cursor-not-allowed disabled:opacity-60 ${config.className} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {config.icon}
    </button>
  )
}

export function ButtonLabel({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span>{children}</span>
    </span>
  )
}
