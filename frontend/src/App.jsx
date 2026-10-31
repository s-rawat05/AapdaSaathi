import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import GuestRoute from './components/GuestRoute'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRoute from './components/RoleBasedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './pages/AdminDashboard'
import VolunteerDashboard from './pages/VolunteerDashboard'
import NotFoundPage from './pages/NotFoundPage'
import ResidentLayout from './layouts/ResidentLayout'
import ResidentDashboard from './pages/resident/ResidentDashboard'
import ResidentProfilePage from './pages/resident/ResidentProfilePage'
import ResidentAlertsPage from './pages/resident/ResidentAlertsPage'
import ResidentNotificationsPage from './pages/resident/ResidentNotificationsPage'
import EmergencyContactsPage from './pages/resident/EmergencyContactsPage'
import ResidentSettingsPage from './pages/resident/ResidentSettingsPage'
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
            <Route path={ROUTES.RESIDENT} element={<ResidentLayout />}>
              <Route index element={<ResidentDashboard />} />
              <Route path="profile" element={<ResidentProfilePage />} />
              <Route path="alerts" element={<ResidentAlertsPage />} />
              <Route path="notifications" element={<ResidentNotificationsPage />} />
              <Route path="contacts" element={<EmergencyContactsPage />} />
              <Route path="settings" element={<ResidentSettingsPage />} />
            </Route>
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
