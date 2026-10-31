import { Clock, MapPin, Volume2 } from 'lucide-react'
import ResponseButtons from './ResponseButtons'
import SeverityBadge from './SeverityBadge'
import SourceBadge from './SourceBadge'
import useResident from '../../hooks/useResident'
import { speak, speechSupported } from '../../utils/accessibility'
import { buildAlertSpeech, severityOf } from '../../utils/alerts'
import { formatDateTime, timeAgo } from '../../utils/format'

export default function AlertCard({ alert, onResponded, showResponse = true }) {
  const { profile } = useResident()
  const { ring } = severityOf(alert.severity)

  return (
    <article
      id={`alert-${alert.id}`}
      aria-labelledby={`alert-${alert.id}-title`}
      className={`overflow-hidden rounded-2xl border-2 bg-white shadow-sm ${ring}`}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={alert.severity} size="lg" />
          <span className="rounded-full bg-navy-900 px-3 py-1 text-sm font-semibold text-white">{alert.disaster_type}</span>
          <SourceBadge isOfficial={alert.is_official} />
        </div>

        <div>
          <h3 id={`alert-${alert.id}-title`} className="text-xl font-bold sm:text-2xl">{alert.event_name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{alert.affected_location}</span>
            <span className="inline-flex items-center gap-1" title={formatDateTime(alert.created_at)}>
              <Clock className="h-4 w-4" aria-hidden />Issued {formatDateTime(alert.created_at)} ({timeAgo(alert.created_at)})
            </span>
          </p>
        </div>

        <p className="text-base leading-relaxed text-slate-800">{alert.description}</p>

        {alert.instructions && (
          <div className="rounded-xl border-l-4 border-navy-700 bg-navy-50 p-4">
            <p className="text-sm font-bold tracking-wide text-navy-800 uppercase">
              {alert.is_official ? 'Official instructions' : 'Instructions (simulated)'}
            </p>
            <p className="mt-1 text-lg leading-relaxed font-medium text-slate-900">{alert.instructions}</p>
          </div>
        )}

        {!alert.is_official && <SourceBadge isOfficial={false} detailed />}

        {speechSupported() && (
          <button
            type="button"
            onClick={() => speak(buildAlertSpeech(alert, profile?.simple_language_enabled))}
            className="inline-flex items-center gap-2 rounded-lg border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50"
          >
            <Volume2 className="h-4 w-4" aria-hidden /> Read aloud
          </button>
        )}
      </div>

      {showResponse && (
        <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6">
          <h4 className="mb-3 text-base font-bold">Are you safe?</h4>
          <ResponseButtons alert={alert} onResponded={onResponded} />
        </div>
      )}
    </article>
  )
}
