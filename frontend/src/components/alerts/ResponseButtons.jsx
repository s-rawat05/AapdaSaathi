import { useState } from 'react'
import { CheckCircle2, Loader2, Phone, Siren } from 'lucide-react'
import AlertBanner from '../AlertBanner'
import { submitResponse } from '../../services/responseService'
import { RESPONSE_STATUS } from '../../utils/alerts'
import { parseApiError } from '../../utils/errors'
import { formatDateTime } from '../../utils/format'

const CONFIRMATION = {
  SAFE: 'Thank you. We have recorded that you are safe. You can change this at any time.',
  NEEDS_HELP:
    'Help request sent. Administrators have been notified and a volunteer can be assigned to you. If you are in immediate danger, call 112.',
}

/**
 * The two big I'M SAFE / I NEED HELP buttons for one alert.
 * onResponded receives the alert with its updated my_response.
 */
export default function ResponseButtons({ alert, onResponded, compact = false }) {
  const [sending, setSending] = useState(null)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState('')

  const current = alert.response_status
  const status = RESPONSE_STATUS[current] ?? RESPONSE_STATUS.NO_RESPONSE

  const respond = async (value) => {
    setSending(value)
    setError('')
    setMessage(null)
    try {
      const saved = await submitResponse(alert, value)
      const my_response = { id: saved.id, status: saved.status, responded_at: saved.responded_at }
      setMessage(value)
      onResponded?.({ ...alert, my_response, response_status: saved.status })
    } catch (err) {
      setError(parseApiError(err, 'Could not send your response. Please try again or call 112.').message)
    } finally {
      setSending(null)
    }
  }

  const height = compact ? 'min-h-14 text-lg' : 'min-h-16 text-xl'

  return (
    <div className="space-y-3">
      <p className={`inline-flex flex-wrap items-center gap-x-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${status.classes}`}>
        <span>{status.label}</span>
        {alert.my_response && (
          <span className="font-normal opacity-80">· {formatDateTime(alert.my_response.responded_at)}</span>
        )}
      </p>

      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Tell us your status">
        <button
          type="button"
          onClick={() => respond('SAFE')}
          disabled={Boolean(sending)}
          aria-pressed={current === 'SAFE'}
          className={`flex items-center justify-center gap-3 rounded-xl bg-green-600 px-5 font-extrabold tracking-wide text-white shadow-sm transition hover:bg-green-700 focus-visible:ring-4 focus-visible:ring-green-300 focus-visible:outline-none disabled:opacity-60 ${height} ${
            current === 'SAFE' ? 'ring-4 ring-green-300' : ''
          }`}
        >
          {sending === 'SAFE' ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <CheckCircle2 className="h-7 w-7" aria-hidden />}
          I&apos;M SAFE
        </button>
        <button
          type="button"
          onClick={() => respond('NEEDS_HELP')}
          disabled={Boolean(sending)}
          aria-pressed={current === 'NEEDS_HELP'}
          className={`flex items-center justify-center gap-3 rounded-xl bg-red-600 px-5 font-extrabold tracking-wide text-white shadow-sm transition hover:bg-red-700 focus-visible:ring-4 focus-visible:ring-red-300 focus-visible:outline-none disabled:opacity-60 ${height} ${
            current === 'NEEDS_HELP' ? 'ring-4 ring-red-300' : ''
          }`}
        >
          {sending === 'NEEDS_HELP' ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <Siren className="h-7 w-7" aria-hidden />}
          I NEED HELP
        </button>
      </div>

      <div aria-live="assertive">
        {message && (
          <AlertBanner type={message === 'SAFE' ? 'success' : 'error'}>
            <span className="font-semibold">{CONFIRMATION[message]}</span>
            {message === 'NEEDS_HELP' && (
              <a href="tel:112" className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-700 px-3 py-1.5 font-bold text-white">
                <Phone className="h-4 w-4" aria-hidden /> Call 112
              </a>
            )}
          </AlertBanner>
        )}
        <AlertBanner>{error}</AlertBanner>
      </div>
    </div>
  )
}
