import { ClipboardList } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import DashboardHeader from '../components/DashboardHeader'
import DetailList from '../components/DetailList'
import FullPageSpinner from '../components/FullPageSpinner'
import useApiResource from '../hooks/useApiResource'
import { getVolunteerProfile } from '../services/profileService'
import { AVAILABILITY_STATUSES } from '../utils/constants'

const availabilityLabel = (value) => AVAILABILITY_STATUSES.find((s) => s.value === value)?.label ?? value

export default function VolunteerDashboard() {
  const { data: profile, error, loading } = useApiResource(getVolunteerProfile)

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader subtitle="Thank you for volunteering. Your details help us match you to people nearby." />
      {loading && <FullPageSpinner label="Loading your profile…" />}
      <AlertBanner>{error}</AlertBanner>
      {profile && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DetailList
              title="Your volunteer profile"
              items={[
                { label: 'Base location', value: profile.location },
                { label: 'Field contact', value: profile.phone },
                { label: 'Availability', value: availabilityLabel(profile.availability_status) },
                {
                  label: 'Coordinates',
                  value: profile.latitude !== null ? `${profile.latitude}, ${profile.longitude}` : null,
                },
              ]}
            />
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-brand-600" aria-hidden />
            <h2 className="mt-3 font-semibold">Assigned tasks</h2>
            <p className="mt-1 text-sm text-slate-600">Planned for Phase 3.</p>
          </div>
        </div>
      )}
    </section>
  )
}
