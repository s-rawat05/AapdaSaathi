import { Navigate, Outlet } from 'react-router-dom'
import FullPageSpinner from './FullPageSpinner'
import useAuth from '../hooks/useAuth'
import { ROLE_HOME } from '../utils/constants'

/** Layout route for /login and /register: logged-in users go straight to their dashboard. */
export default function GuestRoute() {
  const { status, user } = useAuth()

  if (status === 'loading') return <FullPageSpinner label="Checking your session…" />
  if (status === 'authenticated') return <Navigate to={ROLE_HOME[user.role]} replace />
  return <Outlet />
}
