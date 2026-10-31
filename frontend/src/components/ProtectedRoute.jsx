import { Navigate, Outlet, useLocation } from 'react-router-dom'
import FullPageSpinner from './FullPageSpinner'
import useAuth from '../hooks/useAuth'
import { ROUTES } from '../utils/constants'

/** Layout route: renders children only for logged-in users, otherwise sends them to /login. */
export default function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner label="Checking your session…" />
  if (status !== 'authenticated') {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
