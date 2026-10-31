import { useState } from 'react'
import { BellRing, Info, Loader2, Save } from 'lucide-react'
import AlertBanner from '../../components/AlertBanner'
import FullPageSpinner from '../../components/FullPageSpinner'
import AlertPreferences from '../../components/resident/AlertPreferences'
import useResident from '../../hooks/useResident'
import { updateResidentProfile } from '../../services/profileService'
import { speak, speechSupported, vibrate, vibrationSupported } from '../../utils/accessibility'
import { buildAlertSpeech } from '../../utils/alerts'
import { PREFERENCE_KEYS } from '../../utils/constants'
import { parseApiError } from '../../utils/errors'

const pick = (profile) => Object.fromEntries(PREFERENCE_KEYS.map((k) => [k, profile[k]]))

// Clearly labelled sample used only by the "Test alert" button; never sent to the server
const SAMPLE = {
  is_official: false,
  severity: 'MODERATE',
  disaster_type: 'Test',
  event_name: 'This is a test of your alert settings',
  affected_location: 'your area',
  description: 'No action is needed.',
  instructions: 'No action is needed. This is only a test.',
}

function SettingsForm({ profile }) {
  const { setProfile } = useResident()
  const [values, setValues] = useState(() => pick(profile))
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState({ type: null, message: '' })
  const [flash, setFlash] = useState(false)

  const save = async () => {
    setSaving(true)
    setStatus({ type: null, message: '' })
    try {
      setProfile(await updateResidentProfile(values))
      setStatus({ type: 'success', message: 'Alert settings saved.' })
    } catch (err) {
      setStatus({ type: 'error', message: parseApiError(err, 'Could not save settings.').message })
    } finally {
      setSaving(false)
    }
  }

  const testAlert = () => {
    if (values.voice_alerts_enabled) speak(buildAlertSpeech(SAMPLE, values.simple_language_enabled))
    if (values.vibration_enabled) vibrate()
    if (values.visual_alerts_enabled) {
      setFlash(true)
      setTimeout(() => setFlash(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${flash ? 'animate-emergency-flash border-red-600' : ''}`}>
        <h2 className="text-lg font-bold text-navy-900">How new alerts reach you</h2>
        <AlertPreferences values={values} onChange={setValues} disabled={saving} />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-700 px-5 py-2.5 font-bold text-white hover:bg-navy-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Save className="h-5 w-5" aria-hidden />}
            Save settings
          </button>
          <button
            type="button"
            onClick={testAlert}
            className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-5 py-2.5 font-semibold text-navy-800 hover:bg-navy-50"
          >
            <BellRing className="h-5 w-5" aria-hidden /> Test alert
          </button>
        </div>
        <div className="mt-4" aria-live="polite">
          <AlertBanner type={status.type === 'success' ? 'success' : 'error'}>{status.message}</AlertBanner>
        </div>
      </section>

      <section className="flex gap-3 rounded-2xl border border-navy-200 bg-navy-50 p-5 text-navy-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Critical alerts are never hidden.</p>
          <p>
            Even with every option off, new emergency alerts still appear on screen with their instructions and the
            I&apos;M SAFE / I NEED HELP buttons. These settings only add sound, vibration or flashing.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Voice: {speechSupported() ? 'supported in this browser.' : 'not supported in this browser.'} Some browsers only allow speech after you tap the page once.</li>
            <li>Vibration: {vibrationSupported() ? 'supported on this device.' : 'not supported on this device or browser.'}</li>
            <li>Alerts are checked every 20 seconds while this page is open.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

export default function ResidentSettingsPage() {
  const { profile, profileLoading, profileError } = useResident()
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-slate-600">Alert and accessibility preferences.</p>
      </header>
      {profileLoading && !profile && <FullPageSpinner label="Loading settings…" />}
      <AlertBanner>{profileError}</AlertBanner>
      {profile && <SettingsForm key={profile.id} profile={profile} />}
    </div>
  )
}
