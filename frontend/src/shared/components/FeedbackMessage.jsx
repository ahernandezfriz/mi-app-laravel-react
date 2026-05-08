function FeedbackMessage({ message }) {
  if (!message) return null

  return (
    <p className="rounded-[10px] border border-[#d9d7f3] bg-[#eaf7fb] px-3 py-2 text-sm text-[#3f357d]" role="status" aria-live="polite">
      {message}
    </p>
  )
}

export default FeedbackMessage
