import { useEffect, useRef } from 'react'
import { Siren, Volume2, X } from 'lucide-react'
import ResponseButtons from './ResponseButtons'
import SeverityBadge from './SeverityBadge'
import SourceBadge from './SourceBadge'
import useResident from '../../hooks/useResident'
import { speak, speechSupported, stopSpeaking } from '../../utils/accessibility'
import { buildAlertSpeech } from '../../utils/alerts'

/**
 * Full-screen dialog for alerts that arrive while the resident is using the portal.
 * Always shown for new alerts; the "visual alerts" preference only controls flashing.
 */
export default function EmergencyAlertOverlay() {
  const { incoming, dismissIncoming, updateIncoming, bump, profile } = useResident()
  const alert = incoming[0]
  const closeRef = useRef(null)

  useEffect(() => {
    if (alert) closeRef.current?.focus()
  }, [alert])

  useEffect(() => {
    if (!alert) return
    const onKey = (e) => e.key === 'Escape' && dismissIncoming()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [alert, dismissIncoming])

  if (!alert) return null
  const flashing = profile?.visual_alerts_enabled

  const close = () => {
    stopSpeaking()
    dismissIncoming()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/80 p-3 sm:p-6">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="emergency-title"
        aria-describedby="emergency-body"
        className={`max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border-4 border-red-600 bg-white ${flashing ? 'animate-emergency-flash' : ''}`}
      >
        <div className="flex items-start justify-between gap-3 bg-red-700 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <Siren className="h-9 w-9 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-bold tracking-widest uppercase">
                {alert.is_official ? 'Emergency alert' : 'Simulated emergency alert'}
              </p>
              <h2 id="emergency-title" className="text-2xl leading-tight font-extrabold sm:text-3xl">{alert.event_name}</h2>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="rounded-lg p-2 hover:bg-red-800 focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
            aria-label="Close alert"
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <div id="emergency-body" className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} size="lg" />
            <span className="rounded-full bg-navy-900 px-3 py-1 text-sm font-semibold text-white">{alert.disaster_type}</span>
          </div>
          <SourceBadge isOfficial={alert.is_official} detailed />
          <p className="text-lg font-semibold">{alert.affected_location}</p>
          <p className="text-lg leading-relaxed">{alert.description}</p>
          {alert.instructions && (
            <div className="rounded-xl border-l-4 border-navy-700 bg-navy-50 p-4">
              <p className="text-sm font-bold text-navy-800 uppercase">What to do</p>
              <p className="mt-1 text-xl leading-relaxed font-semibold">{alert.instructions}</p>
            </div>
          )}
          {speechSupported() && (
            <button
              type="button"
              onClick={() => speak(buildAlertSpeech(alert, profile?.simple_language_enabled))}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-200 px-4 py-2 font-semibold text-navy-800 hover:bg-navy-50"
            >
              <Volume2 className="h-5 w-5" aria-hidden /> Read aloud
            </button>
          )}
          <div className="border-t border-slate-200 pt-4">
            <p className="mb-3 text-lg font-bold">Are you safe?</p>
            <ResponseButtons
              alert={alert}
              onResponded={(updated) => {
                updateIncoming(updated)
                bump()
              }}
            />
          </div>
          {incoming.length > 1 && (
            <p className="text-sm text-slate-600">{incoming.length - 1} more new alert(s) after this one.</p>
          )}
        </div>
      </div>
    </div>
  )
}
