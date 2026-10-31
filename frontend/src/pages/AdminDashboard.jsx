import { RefreshCw } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import HelpRequestsPanel from '../components/admin/HelpRequestsPanel'
import DashboardHeader from '../components/DashboardHeader'
import FullPageSpinner from '../components/FullPageSpinner'
import useApiResource from '../hooks/useApiResource'
import { listUsers } from '../services/profileService'
import { ROLE_LABELS, ROLES } from '../utils/constants'

const fetchUsers = () => listUsers({ limit: 200 })

const ROLE_BADGE = {
  [ROLES.ADMIN]: 'bg-slate-900 text-white',
  [ROLES.RESIDENT]: 'bg-sky-100 text-sky-800',
  [ROLES.VOLUNTEER]: 'bg-emerald-100 text-emerald-800',
}

export default function AdminDashboard() {
  const { data: users, error, loading, reload } = useApiResource(fetchUsers)
  const counts = Object.values(ROLES).map((role) => ({
    role,
    count: users?.filter((u) => u.role === role).length ?? 0,
  }))

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader subtitle="Help requests and registered accounts. Full alert management arrives in the admin phase." />
      <HelpRequestsPanel />
      <AlertBanner>{error}</AlertBanner>
      {loading && !users && <FullPageSpinner label="Loading users…" />}

      {users && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {counts.map(({ role, count }) => (
              <div key={role} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">{ROLE_LABELS[role]}s</p>
                <p className="mt-1 text-3xl font-bold">{count}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold">Users</h2>
              <button
                type="button"
                onClick={reload}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-5 py-3 font-medium whitespace-nowrap">{u.full_name}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-600">{u.email}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-600">{u.phone}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-5 py-3">{u.is_active ? 'Active' : 'Disabled'}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
