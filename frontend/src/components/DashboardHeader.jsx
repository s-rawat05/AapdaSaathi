import useAuth from '../hooks/useAuth'
import { ROLE_LABELS } from '../utils/constants'

export default function DashboardHeader({ title, subtitle }) {
  const { user } = useAuth()
  return (
    <div className="mb-8">
      <p className="text-sm font-medium text-brand-700">{ROLE_LABELS[user.role]} dashboard</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title ?? `Welcome, ${user.full_name}`}</h1>
      {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
    </div>
  )
}
