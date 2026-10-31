import { BellRing } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import DashboardHeader from '../components/DashboardHeader'
import DetailList from '../components/DetailList'
import FullPageSpinner from '../components/FullPageSpinner'
import useApiResource from '../hooks/useApiResource'
import { getResidentProfile } from '../services/profileService'
import { ASSISTANCE_TYPES } from '../utils/constants'

const assistanceLabel = (value) => ASSISTANCE_TYPES.find((t) => t.value === value)?.label ?? value

export default function ResidentDashboard() {
  const { data: profile, error, loading } = useApiResource(getResidentProfile)

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader subtitle="Your registered details are used to target alerts and send help." />
      {loading && <FullPageSpinner label="Loading your profile…" />}
      <AlertBanner>{error}</AlertBanner>
      {profile && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DetailList
              title="Your profile"
              items={[
                { label: 'State', value: profile.state },
                { label: 'District', value: profile.district },
                { label: 'City / Town', value: profile.city },
                { label: 'Village', value: profile.village },
                { label: 'Address', value: profile.address },
                { label: 'Age', value: profile.age },
                { label: 'Assistance needed', value: assistanceLabel(profile.assistance_type) },
                { label: 'Emergency contact', value: profile.emergency_contact },
                {
                  label: 'Coordinates',
                  value: profile.latitude !== null ? `${profile.latitude}, ${profile.longitude}` : null,
                },
                { label: 'Accessibility preferences', value: profile.accessibility_preferences },
              ]}
            />
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <BellRing className="mx-auto h-8 w-8 text-brand-600" aria-hidden />
            <h2 className="mt-3 font-semibold">Alerts & safety check-in</h2>
            <p className="mt-1 text-sm text-slate-600">Planned for Phase 3.</p>
          </div>
        </div>
      )}
    </section>
  )
}
