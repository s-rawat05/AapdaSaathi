import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import GuestRoute from './components/GuestRoute'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRoute from './components/RoleBasedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResidentDashboard from './pages/ResidentDashboard'
import AdminDashboard from './pages/AdminDashboard'
import VolunteerDashboard from './pages/VolunteerDashboard'
import NotFoundPage from './pages/NotFoundPage'
import { ROLES, ROUTES } from './utils/constants'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path={ROUTES.HOME} element={<LandingPage />} />

        <Route element={<GuestRoute />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleBasedRoute allowedRoles={[ROLES.RESIDENT]} />}>
            <Route path={ROUTES.RESIDENT} element={<ResidentDashboard />} />
          </Route>
          <Route element={<RoleBasedRoute allowedRoles={[ROLES.VOLUNTEER]} />}>
            <Route path={ROUTES.VOLUNTEER} element={<VolunteerDashboard />} />
          </Route>
          <Route element={<RoleBasedRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
