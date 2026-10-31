import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import AlertBanner from '../../components/AlertBanner'
import FormField from '../../components/FormField'
import FullPageSpinner from '../../components/FullPageSpinner'
import LocationPicker from '../../components/location/LocationPicker'
import AlertPreferences from '../../components/resident/AlertPreferences'
import useResident from '../../hooks/useResident'
import { updateResidentProfile } from '../../services/profileService'
import { ASSISTANCE_TYPES, RELATIONSHIPS } from '../../utils/constants'
import { parseApiError } from '../../utils/errors'

const PHONE_RE = /^\+?[0-9]{10,15}$/
const str = (v) => (v === null || v === undefined ? '' : String(v))
const orNull = (v) => (v.trim() === '' ? null : v.trim())

const ASSISTANCE_HELP = {
  NONE: 'I can move and respond on my own.',
  MOBILITY: 'I need help moving, or use a wheelchair or walker.',
  VISUAL: 'I am blind or have low vision.',
  HEARING: 'I am deaf or hard of hearing.',
  ELDERLY: 'I am elderly and may need extra help.',
  OTHER: 'Another need (describe below).',
}

function toForm(p) {
  return {
    full_name: p.user.full_name,
    email: p.user.email,
    phone: p.user.phone,
    age: str(p.age),
    address: str(p.address),
    state: p.state,
    district: p.district,
    city: str(p.city),
    village: str(p.village),
    latitude: str(p.latitude),
    longitude: str(p.longitude),
    assistance_type: p.assistance_type,
    emergency_contact_name: str(p.emergency_contact_name),
    emergency_contact: str(p.emergency_contact),
    emergency_contact_relationship: str(p.emergency_contact_relationship),
    accessibility_preferences: str(p.accessibility_preferences),
    voice_alerts_enabled: p.voice_alerts_enabled,
    visual_alerts_enabled: p.visual_alerts_enabled,
    vibration_enabled: p.vibration_enabled,
    simple_language_enabled: p.simple_language_enabled,
  }
}

function validate(f) {
  const e = {}
  if (f.full_name.trim().length < 2) e.full_name = 'Enter your full name'
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address'
  if (!PHONE_RE.test(f.phone.trim())) e.phone = 'Enter 10-15 digits, optionally starting with +'
  if (f.age !== '' && (Number(f.age) < 0 || Number(f.age) > 120 || !Number.isInteger(Number(f.age)))) e.age = 'Age must be a whole number from 0 to 120'
  if (f.state.trim().length < 2) e.state = 'State is required'
  if (f.district.trim().length < 2) e.district = 'District is required'
  if ((f.latitude === '') !== (f.longitude === '')) e.latitude = 'Enter both latitude and longitude, or neither'
  else if (f.latitude !== '' && (Math.abs(Number(f.latitude)) > 90 || Math.abs(Number(f.longitude)) > 180)) e.latitude = 'Latitude must be within ±90 and longitude within ±180'
  if (f.emergency_contact && !PHONE_RE.test(f.emergency_contact.trim())) e.emergency_contact = 'Enter a valid mobile number (10-15 digits)'
  if (!f.emergency_contact.trim() && (f.emergency_contact_name.trim() || f.emergency_contact_relationship.trim())) e.emergency_contact = 'A phone number is required for the contact'
  return e
}

function toPayload(f) {
  return {
    full_name: f.full_name.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
    age: f.age === '' ? null : Number(f.age),
    address: orNull(f.address),
    state: f.state.trim(),
    district: f.district.trim(),
    city: orNull(f.city),
    village: orNull(f.village),
    latitude: f.latitude === '' ? null : Number(f.latitude),
    longitude: f.longitude === '' ? null : Number(f.longitude),
    assistance_type: f.assistance_type,
    emergency_contact_name: orNull(f.emergency_contact_name),
    emergency_contact: orNull(f.emergency_contact),
    emergency_contact_relationship: orNull(f.emergency_contact_relationship),
    accessibility_preferences: orNull(f.accessibility_preferences),
    voice_alerts_enabled: f.voice_alerts_enabled,
    visual_alerts_enabled: f.visual_alerts_enabled,
    vibration_enabled: f.vibration_enabled,
    simple_language_enabled: f.simple_language_enabled,
  }
}

function Section({ title, description, children }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-lg font-bold text-navy-900" aria-hidden>{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      <div className="mt-4">{children}</div>
    </fieldset>
  )
}

function ProfileForm({ profile }) {
  const { setProfile } = useResident()
  const [form, setForm] = useState(() => toForm(profile))
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ type: null, message: '' })
  const [saving, setSaving] = useState(false)

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const patch = (values) => setForm((f) => ({ ...f, ...values }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      setStatus({ type: 'error', message: 'Please fix the highlighted fields.' })
      return
    }
    setSaving(true)
    setStatus({ type: null, message: '' })
    try {
      const saved = await updateResidentProfile(toPayload(form))
      setProfile(saved)
      setForm(toForm(saved))
      setStatus({ type: 'success', message: 'Your profile has been saved.' })
    } catch (err) {
      const parsed = parseApiError(err, 'Could not save your profile.')
      setErrors(err.response?.status === 409 ? { email: parsed.message } : parsed.fieldErrors)
      setStatus({ type: 'error', message: parsed.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <Section title="Personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" name="full_name" autoComplete="name" value={form.full_name} onChange={update} error={errors.full_name} required />
          <FormField label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} error={errors.email} hint="You log in with this email" required />
          <FormField label="Phone number" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={update} error={errors.phone} required />
          <FormField label="Age" name="age" type="number" min="0" max="120" value={form.age} onChange={update} error={errors.age} />
        </div>
      </Section>

      <Section title="Location details" description="Used to send you alerts for your area.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Address" name="address" autoComplete="street-address" value={form.address} onChange={update} error={errors.address} className="sm:col-span-2" />
          <FormField label="State" name="state" autoComplete="address-level1" value={form.state} onChange={update} error={errors.state} required />
          <FormField label="District" name="district" value={form.district} onChange={update} error={errors.district} required />
          <FormField label="City / Town" name="city" autoComplete="address-level2" value={form.city} onChange={update} error={errors.city} />
          <FormField label="Village" name="village" value={form.village} onChange={update} error={errors.village} />
        </div>
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="mb-2 font-semibold text-slate-900">Map location</h3>
          <LocationPicker
            value={{ latitude: form.latitude, longitude: form.longitude }}
            onChange={patch}
            error={errors.latitude || errors.longitude}
          />
        </div>
      </Section>

      <Section title="Assistance requirements" description="Responders use this to bring the right help.">
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Assistance needed">
          {ASSISTANCE_TYPES.map(({ value, label }) => {
            const selected = form.assistance_type === value
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  selected ? 'border-navy-700 bg-navy-50 ring-2 ring-navy-200' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="assistance_type"
                  value={value}
                  checked={selected}
                  onChange={update}
                  className="mt-1 h-4 w-4 accent-navy-700"
                />
                <span>
                  <span className="block font-semibold">{value === 'NONE' ? 'No assistance required' : `${label} assistance`}</span>
                  <span className="block text-sm text-slate-600">{ASSISTANCE_HELP[value]}</span>
                </span>
              </label>
            )
          })}
        </div>
        <FormField
          label="Notes for responders"
          name="accessibility_preferences"
          as="textarea"
          placeholder="e.g. uses a wheelchair, needs medication every 6 hours"
          value={form.accessibility_preferences}
          onChange={update}
          error={errors.accessibility_preferences}
          className="mt-4"
        />
      </Section>

      <Section title="Emergency contact" description="Someone we can call if you cannot be reached.">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Contact name" name="emergency_contact_name" value={form.emergency_contact_name} onChange={update} error={errors.emergency_contact_name} />
          <FormField label="Contact phone number" name="emergency_contact" type="tel" value={form.emergency_contact} onChange={update} error={errors.emergency_contact} />
          <FormField
            label="Relationship"
            name="emergency_contact_relationship"
            as="select"
            options={[{ value: '', label: 'Select…' }, ...RELATIONSHIPS.map((r) => ({ value: r, label: r }))]}
            value={form.emergency_contact_relationship}
            onChange={update}
            error={errors.emergency_contact_relationship}
          />
        </div>
      </Section>

      <Section title="Accessibility preferences" description="Choose how new alerts reach you. Critical alerts always appear on screen.">
        <AlertPreferences values={form} onChange={patch} />
      </Section>

      <div className="sticky bottom-0 -mx-4 space-y-3 border-t border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-6">
        <AlertBanner type={status.type === 'success' ? 'success' : 'error'}>{status.message}</AlertBanner>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-700 px-6 py-3 text-base font-bold text-white hover:bg-navy-800 disabled:opacity-60 sm:w-auto"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Save className="h-5 w-5" aria-hidden />}
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}

export default function ResidentProfilePage() {
  const { profile, profileLoading, profileError } = useResident()
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">My profile</h1>
        {profile && (
          <p className="mt-1 text-slate-600">Profile {profile.completion.percent}% complete.</p>
        )}
      </header>
      {profileLoading && !profile && <FullPageSpinner label="Loading your profile…" />}
      <AlertBanner>{profileError}</AlertBanner>
      {/* Keyed by id, not updated_at: saving must not remount the form and wipe its success message */}
      {profile && <ProfileForm key={profile.id} profile={profile} />}
    </div>
  )
}
