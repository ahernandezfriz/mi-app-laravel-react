function FeedbackMessage({ message }) {
  if (!message) return null

  return (
    <p className="rounded-[5px] border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800" role="status" aria-live="polite">
      {message}
    </p>
  )
}

export default FeedbackMessage
