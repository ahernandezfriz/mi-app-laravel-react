const TYPE_STYLES = {
  info: 'border-[#d9d7f3] bg-[#eaf7fb] text-[#3f357d]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
}

function FeedbackMessage({ message, type = 'info' }) {
  if (!message) return null

  const style = TYPE_STYLES[type] || TYPE_STYLES.info

  return (
    <p className={`rounded-[10px] border px-3 py-2 text-sm ${style}`} role="status" aria-live="polite">
      {message}
    </p>
  )
}

export default FeedbackMessage
