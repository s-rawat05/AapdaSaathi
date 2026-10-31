const cleanMessage = (msg) => msg.replace(/^Value error, /, '')

/**
 * Turns an Axios error from the FastAPI backend into
 * { message, fieldErrors } where fieldErrors maps "resident_profile.state" -> message.
 */
export function parseApiError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) {
    return {
      message: 'Cannot reach the server. Check that the backend is running and try again.',
      fieldErrors: {},
    }
  }

  const { status, data } = error.response
  const detail = data?.detail

  if (status === 422 && Array.isArray(detail)) {
    const fieldErrors = {}
    const general = []
    for (const item of detail) {
      // loc looks like ["body", "resident_profile", "state"]; model-level errors stop at ["body"]
      const path = item.loc.slice(1).join('.')
      if (path) fieldErrors[path] = cleanMessage(item.msg)
      else general.push(cleanMessage(item.msg))
    }
    return { message: general[0] || 'Please fix the highlighted fields.', fieldErrors }
  }

  if (typeof detail === 'string') return { message: detail, fieldErrors: {} }
  if (status >= 500) return { message: 'The server ran into a problem. Please try again shortly.', fieldErrors: {} }
  return { message: fallback, fieldErrors: {} }
}
