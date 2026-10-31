import { useCallback, useState } from 'react'
import { BellOff, CheckCheck, Loader2 } from 'lucide-react'
import AlertBanner from '../../components/AlertBanner'
import SeverityBadge from '../../components/alerts/SeverityBadge'
import SourceBadge from '../../components/alerts/SourceBadge'
import EmptyState from '../../components/EmptyState'
import FullPageSpinner from '../../components/FullPageSpinner'
import useApiResource from '../../hooks/useApiResource'
import useResident from '../../hooks/useResident'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/residentService'
import { parseApiError } from '../../utils/errors'
import { formatDateTime } from '../../utils/format'

const PAGE = 50

export default function ResidentNotificationsPage() {
  const { notificationsVersion, bump } = useResident()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const fetchNotes = useCallback(() => getNotifications({ unread_only: unreadOnly, limit: PAGE }), [unreadOnly])
  const notes = useApiResource(fetchNotes, notificationsVersion)
  const unreadCount = notes.data?.filter((n) => !n.is_read).length ?? 0

  const markOne = async (id) => {
    setBusy(id)
    setError('')
    try {
      const updated = await markNotificationRead(id)
      notes.setData(notes.data.map((n) => (n.id === id ? updated : n)).filter((n) => !unreadOnly || !n.is_read))
      bump()
    } catch (err) {
      setError(parseApiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  const markAll = async () => {
    setBusy('all')
    setError('')
    try {
      await markAllNotificationsRead()
      notes.setData(unreadOnly ? [] : notes.data.map((n) => ({ ...n, is_read: true })))
      bump()
    } catch (err) {
      setError(parseApiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-slate-600">Every alert and update sent to you.</p>
        </div>
        <button
          type="button"
          onClick={markAll}
          disabled={busy === 'all' || unreadCount === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {busy === 'all' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCheck className="h-4 w-4" aria-hidden />}
          Mark all as read
        </button>
      </header>

      <div role="tablist" aria-label="Filter notifications" className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
        {[
          [false, 'All'],
          [true, 'Unread'],
        ].map(([value, label]) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={unreadOnly === value}
            onClick={() => setUnreadOnly(value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${unreadOnly === value ? 'bg-navy-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <AlertBanner>{error || notes.error}</AlertBanner>
      {notes.loading && !notes.data && <FullPageSpinner label="Loading notifications…" />}
      {notes.data?.length === 0 && (
        <EmptyState icon={BellOff} title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}>
          Alerts for your area will appear here.
        </EmptyState>
      )}

      <ul className="space-y-3">
        {notes.data?.map((n) => (
          <li
            key={n.id}
            className={`rounded-2xl border bg-white p-4 sm:p-5 ${n.is_read ? 'border-slate-200' : 'border-l-4 border-red-600 shadow-sm'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  {!n.is_read && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white uppercase">New</span>}
                  <span className={`text-base ${n.is_read ? 'font-medium' : 'font-bold'}`}>{n.title}</span>
                </p>
                <p className="mt-1 text-slate-700">{n.message}</p>
                {n.alert && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500">Related alert:</span>
                    <span className="font-medium">{n.alert.event_name}</span>
                    <SeverityBadge severity={n.alert.severity} />
                    <SourceBadge isOfficial={n.alert.is_official} />
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(n.created_at)}</p>
              </div>
              {n.is_read ? (
                <span className="text-xs font-medium text-slate-500">Read</span>
              ) : (
                <button
                  type="button"
                  onClick={() => markOne(n.id)}
                  disabled={busy === n.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === n.id && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                  Mark as read
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
