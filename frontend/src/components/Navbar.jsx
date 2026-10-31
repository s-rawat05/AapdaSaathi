import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LifeBuoy, LogOut, Menu, X } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import { APP_NAME, ROLE_HOME, ROLE_LABELS, ROUTES } from '../utils/constants'

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const links = [{ label: 'Home', to: ROUTES.HOME }]
  if (isAuthenticated) links.push({ label: 'Dashboard', to: ROLE_HOME[user.role] })

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to={ROUTES.HOME} className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <LifeBuoy className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <span className="text-right text-sm leading-tight">
                <span className="block font-medium">{user.full_name}</span>
                <span className="block text-xs text-slate-500">{ROLE_LABELS[user.role]}</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Log in
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {isAuthenticated && (
              <p className="px-3 pb-2 text-sm">
                <span className="font-medium">{user.full_name}</span>
                <span className="text-slate-500"> · {ROLE_LABELS[user.role]}</span>
              </p>
            )}
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end className={linkClass} onClick={() => setOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <button type="button" onClick={handleLogout} className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
                Log out
              </button>
            ) : (
              <>
                <NavLink to={ROUTES.LOGIN} className={linkClass} onClick={() => setOpen(false)}>
                  Log in
                </NavLink>
                <NavLink to={ROUTES.REGISTER} className={linkClass} onClick={() => setOpen(false)}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
