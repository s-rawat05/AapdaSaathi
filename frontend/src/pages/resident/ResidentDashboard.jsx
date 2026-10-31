import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Accessibility, Bell, ChevronRight, MapPin, Phone, PhoneCall, ShieldCheck, Siren, UserRound } from 'lucide-react'
import AlertBanner from '../../components/AlertBanner'
import AlertCard from '../../components/alerts/AlertCard'
import SeverityBadge from '../../components/alerts/SeverityBadge'
import EmptyState from '../../components/EmptyState'
import FullPageSpinner from '../../components/FullPageSpinner'
import useApiResource from '../../hooks/useApiResource'
import useResident from '../../hooks/useResident'
import { getMyAlerts, getNotifications } from '../../services/residentService'
import { RESPONSE_STATUS } from '../../utils/alerts'
import { ASSISTANCE_TYPES, ROUTES } from '../../utils/constants'
import { timeAgo } from '../../utils/format'

const fetchRecentNotifications = () => getNotifications({ limit: 5 })

const assistanceLabel = (value) => ASSISTANCE_TYPES.find((t) => t.value === value)?.label ?? value

function Card({ title, icon: Icon, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
          <Icon className="h-5 w-5 text-navy-600" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const CardLink = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center text-sm font-semibold text-navy-700 hover:underline">
    {children}
    <ChevronRight className="h-4 w-4" aria-hidden />
  </Link>
)

export default function ResidentDashboard() {
  const { profile, profileLoading, profileError, alertsVersion, notificationsVersion, bump } = useResident()

  // Re-fetch whenever polling (or a local action) reports a change
  const alerts = useApiResource(getMyAlerts, alertsVersion)
  const notes = useApiResource(fetchRecentNotifications, notificationsVersion)
  // Alerts answered during this visit stay in place so their confirmation stays visible
  const [answeredHere, setAnsweredHere] = useState([])

  if (profileLoading && !profile) return <FullPageSpinner label="Loading your dashboard…" />
  if (profileError) return <AlertBanner>{profileError}</AlertBanner>
  if (!profile) return null

  const activeAlerts = alerts.data ?? []
  const unanswered = activeAlerts.filter((a) => a.response_status === 'NO_RESPONSE')
  const pending = activeAlerts.filter((a) => a.response_status === 'NO_RESPONSE' || answeredHere.includes(a.id))
  const needsHelp = activeAlerts.some((a) => a.response_status === 'NEEDS_HELP')
  const place = [profile.village, profile.city, profile.district, profile.state].filter(Boolean).join(', ')

  const onResponded = (updated) => {
    alerts.setData(activeAlerts.map((a) => (a.id === updated.id ? updated : a)))
    setAnsweredHere((ids) => (ids.includes(updated.id) ? ids : [...ids, updated.id]))
    bump()
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-navy-600">Resident dashboard</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Welcome, {profile.user.full_name}</h1>
      </header>

      {/* Critical information first: alerts that still need an answer */}
      {alerts.loading && !alerts.data ? (
        <FullPageSpinner label="Checking for alerts in your area…" />
      ) : alerts.error ? (
        <AlertBanner>{alerts.error}</AlertBanner>
      ) : pending.length > 0 ? (
        <section aria-labelledby="action-needed" className="space-y-4">
          {unanswered.length > 0 ? (
            <h2 id="action-needed" className="flex items-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-lg font-bold text-white">
              <Siren className="h-6 w-6" aria-hidden />
              Action needed: tell us if you are safe ({unanswered.length} alert{unanswered.length > 1 ? 's' : ''})
            </h2>
          ) : (
            <h2 id="action-needed" className="flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-3 text-lg font-bold text-white">
              <ShieldCheck className="h-6 w-6" aria-hidden />
              Thank you. Your responses have been recorded. You can change them below.
            </h2>
          )}
          {pending.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResponded={onResponded} />
          ))}
        </section>
      ) : activeAlerts.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No active alerts for your area" tone="safe">
          We will alert you here, by voice and by vibration (if enabled) as soon as something is issued.
        </EmptyState>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Emergency status" icon={Siren} action={<CardLink to={ROUTES.RESIDENT_ALERTS}>All alerts</CardLink>}>
          {activeAlerts.length === 0 ? (
            <p className="text-slate-600">No active alerts. Nothing to respond to.</p>
          ) : (
            <ul className="space-y-2">
              {activeAlerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.event_name}</span>
                    <SeverityBadge severity={a.severity} />
                  </span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${RESPONSE_STATUS[a.response_status].classes}`}>
                    {RESPONSE_STATUS[a.response_status].short}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {needsHelp && (
            <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-medium text-red-800">
              Your help request is active. Keep your phone nearby. In immediate danger call <a className="underline" href="tel:112">112</a>.
            </p>
          )}
        </Card>

        <Card title="Profile completion" icon={UserRound} action={<CardLink to={ROUTES.RESIDENT_PROFILE}>Edit</CardLink>}>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-navy-900">{profile.completion.percent}%</span>
            <span className="text-sm text-slate-500">complete</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={profile.completion.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
            <div className={`h-full rounded-full ${profile.completion.percent === 100 ? 'bg-green-600' : 'bg-orange-500'}`} style={{ width: `${profile.completion.percent}%` }} />
          </div>
          {profile.completion.missing.length > 0 ? (
            <p className="mt-3 text-sm text-slate-600">Add: {profile.completion.missing.join(', ')}.</p>
          ) : (
            <p className="mt-3 text-sm text-green-700">Your profile is complete. Thank you.</p>
          )}
        </Card>

        <Card title="Current location" icon={MapPin} action={<CardLink to={ROUTES.RESIDENT_PROFILE}>Update</CardLink>}>
          <p className="font-medium">{place}</p>
          {profile.address && <p className="text-sm text-slate-600">{profile.address}</p>}
          <p className="mt-2 text-sm text-slate-600">
            {profile.latitude !== null
              ? `Map location: ${profile.latitude}, ${profile.longitude}`
              : 'No map location shared. Adding one helps rescuers find you.'}
          </p>
        </Card>

        <Card title="Assistance requirements" icon={Accessibility} action={<CardLink to={ROUTES.RESIDENT_PROFILE}>Edit</CardLink>}>
          <p className="text-lg font-semibold">{assistanceLabel(profile.assistance_type)}</p>
          {profile.accessibility_preferences && <p className="mt-1 text-sm text-slate-600">{profile.accessibility_preferences}</p>}
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {[
              ['Voice alerts', profile.voice_alerts_enabled],
              ['Visual alerts', profile.visual_alerts_enabled],
              ['Vibration', profile.vibration_enabled],
              ['Simple language', profile.simple_language_enabled],
            ].map(([label, on]) => (
              <li key={label} className={`rounded-full px-2 py-1 font-medium ${on ? 'bg-navy-100 text-navy-800' : 'bg-slate-100 text-slate-500 line-through'}`}>
                {label}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Emergency contact" icon={PhoneCall} action={<CardLink to={ROUTES.RESIDENT_CONTACTS}>Manage</CardLink>}>
          {profile.emergency_contact ? (
            <>
              <p className="text-lg font-semibold">{profile.emergency_contact_name || 'Unnamed contact'}</p>
              {profile.emergency_contact_relationship && <p className="text-sm text-slate-600">{profile.emergency_contact_relationship}</p>}
              <a href={`tel:${profile.emergency_contact}`} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">
                <Phone className="h-4 w-4" aria-hidden /> {profile.emergency_contact}
              </a>
            </>
          ) : (
            <p className="text-slate-600">
              No emergency contact yet. <Link to={ROUTES.RESIDENT_CONTACTS} className="font-semibold text-navy-700 underline">Add one</Link> so we know who to call.
            </p>
          )}
        </Card>

        <Card title="Recent notifications" icon={Bell} action={<CardLink to={ROUTES.RESIDENT_NOTIFICATIONS}>View all</CardLink>}>
          {notes.loading && !notes.data ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : notes.error ? (
            <p className="text-sm text-red-700">{notes.error}</p>
          ) : notes.data.length === 0 ? (
            <p className="text-slate-600">No notifications yet.</p>
          ) : (
            <ul className="space-y-2">
              {notes.data.map((n) => (
                <li key={n.id} className="flex gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-red-600'}`} aria-label={n.is_read ? undefined : 'Unread'} />
                  <span className="min-w-0">
                    <span className={`block truncate text-sm ${n.is_read ? '' : 'font-semibold'}`}>{n.title}</span>
                    <span className="text-xs text-slate-500">{timeAgo(n.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
