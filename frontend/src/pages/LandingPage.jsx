import { Link } from 'react-router-dom'
import { HandHeart, ShieldCheck, Users } from 'lucide-react'
import ApiStatusBadge from '../components/ApiStatusBadge'
import useAuth from '../hooks/useAuth'
import { APP_NAME, ROLE_HOME, ROUTES } from '../utils/constants'

const ROLES = [
  {
    icon: Users,
    title: 'Residents',
    text: 'Get help and stay informed during emergencies.',
    to: ROUTES.RESIDENT,
  },
  {
    icon: HandHeart,
    title: 'Volunteers',
    text: 'Coordinate on-ground assistance where it is needed.',
    to: ROUTES.VOLUNTEER,
  },
  {
    icon: ShieldCheck,
    title: 'Administrators',
    text: 'Oversee response operations and resources.',
    to: ROUTES.ADMIN,
  },
]

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth()

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <ApiStatusBadge />
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {APP_NAME}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            A disaster management and emergency assistance platform connecting residents,
            volunteers and authorities.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {isAuthenticated ? (
              <Link
                to={ROLE_HOME[user.role]}
                className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Go to my dashboard
              </Link>
            ) : (
              <>
                <Link
                  to={ROUTES.REGISTER}
                  className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                >
                  Get started
                </Link>
                <Link
                  to={ROUTES.LOGIN}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, text, to }) => (
            <Link
              key={title}
              to={to}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold group-hover:text-brand-700">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
