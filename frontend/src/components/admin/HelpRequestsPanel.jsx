import { useEffect, useState } from 'react'
import { MapPin, Phone, Siren } from 'lucide-react'
import SeverityBadge from '../alerts/SeverityBadge'
import SourceBadge from '../alerts/SourceBadge'
import useApiResource from '../../hooks/useApiResource'
import { getHelpRequests } from '../../services/adminService'
import { ASSISTANCE_TYPES, POLL_INTERVAL_MS } from '../../utils/constants'
import { formatDateTime, timeAgo } from '../../utils/format'

const assistanceLabel = (value) => ASSISTANCE_TYPES.find((t) => t.value === value)?.label ?? value

/** Live list of residents who pressed I NEED HELP on an active alert. */
export default function HelpRequestsPanel() {
  const [tick, setTick] = useState(0)
  const { data, error, loading } = useApiResource(getHelpRequests, tick)

  // Refresh periodically, but only while the tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border-2 border-red-200 bg-white">
      <div className="flex items-center justify-between bg-red-700 px-5 py-3 text-white">
        <h2 className="flex items-center gap-2 font-bold">
          <Siren className="h-5 w-5" aria-hidden /> Residents needing help
        </h2>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-bold text-red-700">{data?.length ?? 0}</span>
      </div>
      {loading && !data ? (
        <p className="p-5 text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="p-5 text-sm text-red-700">{error}</p>
      ) : data.length === 0 ? (
        <p className="p-5 text-slate-600">No open help requests.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.map((r) => (
            <li key={r.response_id} className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0 space-y-1">
                <p className="text-lg font-bold">{r.resident_name}</p>
                <p className="flex items-center gap-1 text-sm text-slate-700">
                  <MapPin className="h-4 w-4" aria-hidden />
                  {[r.address, r.village, r.city, r.district, r.state].filter(Boolean).join(', ')}
                  {r.latitude !== null && ` (${r.latitude}, ${r.longitude})`}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Assistance:</span> {assistanceLabel(r.assistance_type)}
                  {r.accessibility_preferences && ` · ${r.accessibility_preferences}`}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-500">Alert:</span> {r.alert.event_name}
                  <SeverityBadge severity={r.alert.severity} />
                  <SourceBadge isOfficial={r.alert.is_official} />
                </div>
                <p className="text-xs text-slate-500" title={formatDateTime(r.responded_at)}>Requested {timeAgo(r.responded_at)}</p>
              </div>
              <a href={`tel:${r.resident_phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                <Phone className="h-4 w-4" aria-hidden /> {r.resident_phone}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
