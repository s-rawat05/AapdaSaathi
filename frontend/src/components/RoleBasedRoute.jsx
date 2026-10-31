import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { ROLE_HOME } from '../utils/constants'

/**
 * Layout route nested inside <ProtectedRoute>: users whose role is not allowed
 * are redirected to their own dashboard. The backend enforces the same rules;
 * this only keeps the UI consistent.
 */
export default function RoleBasedRoute({ allowedRoles }) {
  const { user } = useAuth()

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }
  return <Outlet />
}
