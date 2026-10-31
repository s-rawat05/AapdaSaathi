import { History, ShieldCheck } from 'lucide-react'
import AlertBanner from '../../components/AlertBanner'
import AlertCard from '../../components/alerts/AlertCard'
import SourceBadge from '../../components/alerts/SourceBadge'
import EmptyState from '../../components/EmptyState'
import FullPageSpinner from '../../components/FullPageSpinner'
import useApiResource from '../../hooks/useApiResource'
import useResident from '../../hooks/useResident'
import { getMyAlerts } from '../../services/residentService'
import { getMyResponses } from '../../services/responseService'
import { RESPONSE_STATUS } from '../../utils/alerts'
import { formatDateTime } from '../../utils/format'

export default function ResidentAlertsPage() {
  const { alertsVersion, bump } = useResident()
  // Re-fetch whenever polling (or a local action) reports a change
  const alerts = useApiResource(getMyAlerts, alertsVersion)
  const history = useApiResource(getMyResponses, alertsVersion)

  const onResponded = (updated) => {
    alerts.setData(alerts.data.map((a) => (a.id === updated.id ? updated : a)))
    bump()
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Emergency alerts</h1>
        <p className="mt-1 text-slate-600">Active alerts for your area. This page updates automatically.</p>
      </header>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
        <SourceBadge isOfficial /> <span>comes from the verified SACHET (NDMA) feed.</span>
        <SourceBadge isOfficial={false} /> <span>is a practice alert created in demo mode.</span>
      </div>

      {alerts.loading && !alerts.data && <FullPageSpinner label="Loading alerts…" />}
      <AlertBanner>{alerts.error}</AlertBanner>
      {alerts.data?.length === 0 && (
        <EmptyState icon={ShieldCheck} title="No active alerts for your area" tone="safe">
          You will be notified here as soon as an alert is issued.
        </EmptyState>
      )}
      <div className="space-y-5">
        {alerts.data?.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onResponded={onResponded} />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
          <History className="h-5 w-5" aria-hidden /> My response history
        </h2>
        {history.loading && !history.data ? (
          <p className="mt-3 text-sm text-slate-500">Loading…</p>
        ) : history.error ? (
          <p className="mt-3 text-sm text-red-700">{history.error}</p>
        ) : history.data.length === 0 ? (
          <p className="mt-3 text-slate-600">You have not responded to any alerts yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {history.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{r.alert.event_name}</span>
                  <span className="block text-xs text-slate-500">{formatDateTime(r.responded_at)} · {r.alert.status === 'ACTIVE' ? 'alert active' : 'alert ended'}</span>
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${RESPONSE_STATUS[r.status].classes}`}>
                  {RESPONSE_STATUS[r.status].short}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
