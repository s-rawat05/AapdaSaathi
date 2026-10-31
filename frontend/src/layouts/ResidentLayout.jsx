import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LayoutDashboard, LogOut, Menu, PhoneCall, Settings, Siren, UserRound, X } from 'lucide-react'
import EmergencyAlertOverlay from '../components/alerts/EmergencyAlertOverlay'
import ResidentProvider from '../context/ResidentProvider'
import useAuth from '../hooks/useAuth'
import useResident from '../hooks/useResident'
import { ROUTES } from '../utils/constants'

const NAV = [
  { to: ROUTES.RESIDENT, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: ROUTES.RESIDENT_PROFILE, label: 'My Profile', icon: UserRound },
  { to: ROUTES.RESIDENT_ALERTS, label: 'Emergency Alerts', icon: Siren, badge: 'alerts' },
  { to: ROUTES.RESIDENT_NOTIFICATIONS, label: 'Notifications', icon: Bell, badge: 'notifications' },
  { to: ROUTES.RESIDENT_CONTACTS, label: 'Emergency Contacts', icon: PhoneCall },
  { to: ROUTES.RESIDENT_SETTINGS, label: 'Settings', icon: Settings },
]

function SidebarNav({ onNavigate }) {
  const { logout } = useAuth()
  const { updates } = useResident()
  const navigate = useNavigate()

  const counts = {
    alerts: updates?.active_alert_ids?.length ?? 0,
    notifications: updates?.unread_notifications ?? 0,
  }

  return (
    <nav aria-label="Resident portal" className="flex h-full flex-col gap-1 p-3">
      {NAV.map(({ to, label, icon: Icon, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
              isActive ? 'bg-white text-navy-900' : 'text-navy-100 hover:bg-navy-800 hover:text-white'
            }`
          }
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1">{label}</span>
          {badge && counts[badge] > 0 && (
            <span
              className={`min-w-6 rounded-full px-1.5 text-center text-xs leading-6 font-bold ${
                badge === 'alerts' ? 'bg-red-600 text-white' : 'bg-amber-400 text-navy-900'
              }`}
            >
              {counts[badge]}
              <span className="sr-only"> {badge === 'alerts' ? 'active alerts' : 'unread'}</span>
            </span>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={() => {
          logout()
          navigate(ROUTES.LOGIN, { replace: true })
        }}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-navy-100 hover:bg-navy-800 hover:text-white"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Logout
      </button>
    </nav>
  )
}

function ResidentShell() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(false))
    return () => cancelAnimationFrame(id)
  }, [location.pathname])

  return (
    <div className="mx-auto flex w-full max-w-7xl lg:gap-6 lg:px-6 lg:py-6">
      <aside className="sticky top-22 hidden h-[calc(100vh-7rem)] w-64 shrink-0 rounded-2xl bg-navy-900 lg:block">
        <SidebarNav />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-slate-200 bg-navy-900 px-4 py-2 text-white lg:hidden">
          <span className="font-semibold">Resident portal</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-navy-800"
            aria-label="Open resident menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" aria-hidden /> Menu
          </button>
        </div>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Resident menu">
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-navy-900">
              <div className="flex items-center justify-between px-4 py-3 text-white">
                <span className="font-semibold">Menu</span>
                <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-navy-800" aria-label="Close menu">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-0 lg:py-0">
          <Outlet />
        </main>
      </div>

      <EmergencyAlertOverlay />
    </div>
  )
}

export default function ResidentLayout() {
  return (
    <ResidentProvider>
      <ResidentShell />
    </ResidentProvider>
  )
}
