import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HandHeart, Loader2, LocateFixed, UserPlus, Users } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import FormField from '../components/FormField'
import useAuth from '../hooks/useAuth'
import { ASSISTANCE_TYPES, AVAILABILITY_STATUSES, ROLE_HOME, ROLES, ROUTES } from '../utils/constants'
import { parseApiError } from '../utils/errors'

// Public registration offers only these two roles; admins are created by other admins or the seed script.
const ROLE_OPTIONS = [
  { value: ROLES.RESIDENT, label: 'Resident', text: 'I may need help during an emergency', icon: Users },
  { value: ROLES.VOLUNTEER, label: 'Volunteer', text: 'I want to help people near me', icon: HandHeart },
]

const PHONE_RE = /^\+?[0-9]{10,15}$/

const EMPTY = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
  // resident
  age: '',
  address: '',
  state: '',
  district: '',
  city: '',
  village: '',
  assistance_type: 'NONE',
  emergency_contact: '',
  accessibility_preferences: '',
  // volunteer
  location: '',
  volunteer_phone: '',
  availability_status: 'AVAILABLE',
  // shared
  latitude: '',
  longitude: '',
}

const orNull = (value) => (value.trim() === '' ? null : value.trim())
const numberOrNull = (value) => (value === '' ? null : Number(value))

function validate(form, role) {
  const e = {}
  if (form.full_name.trim().length < 2) e.full_name = 'Enter your full name'
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address'
  if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Enter 10-15 digits, optionally starting with +'
  if (form.password.length < 8) e.password = 'Use at least 8 characters'
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
    e.password = 'Include at least one letter and one number'
  if (form.confirm_password !== form.password) e.confirm_password = 'Passwords do not match'

  if ((form.latitude === '') !== (form.longitude === '')) {
    e['profile.latitude'] = 'Enter both latitude and longitude, or neither'
  }

  if (role === ROLES.RESIDENT) {
    if (form.state.trim().length < 2) e['resident_profile.state'] = 'State is required'
    if (form.district.trim().length < 2) e['resident_profile.district'] = 'District is required'
    if (form.age !== '' && (Number(form.age) < 0 || Number(form.age) > 120))
      e['resident_profile.age'] = 'Age must be between 0 and 120'
    if (form.emergency_contact && !PHONE_RE.test(form.emergency_contact.trim()))
      e['resident_profile.emergency_contact'] = 'Enter 10-15 digits'
  } else {
    if (form.location.trim().length < 2) e['volunteer_profile.location'] = 'Location is required'
    if (form.volunteer_phone && !PHONE_RE.test(form.volunteer_phone.trim()))
      e['volunteer_profile.phone'] = 'Enter 10-15 digits'
  }
  return e
}

function buildPayload(form, role) {
  const base = {
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    password: form.password,
    role,
  }
  const coords = { latitude: numberOrNull(form.latitude), longitude: numberOrNull(form.longitude) }

  if (role === ROLES.RESIDENT) {
    base.resident_profile = {
      age: numberOrNull(form.age),
      address: orNull(form.address),
      state: form.state.trim(),
      district: form.district.trim(),
      city: orNull(form.city),
      village: orNull(form.village),
      assistance_type: form.assistance_type,
      emergency_contact: orNull(form.emergency_contact),
      accessibility_preferences: orNull(form.accessibility_preferences),
      ...coords,
    }
  } else {
    base.volunteer_profile = {
      phone: orNull(form.volunteer_phone),
      location: form.location.trim(),
      availability_status: form.availability_status,
      ...coords,
    }
  }
  return base
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState(ROLES.RESIDENT)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const profileKey = role === ROLES.RESIDENT ? 'resident_profile' : 'volunteer_profile'
  const err = (field) => errors[field]
  const coordError = errors['profile.latitude'] || errors[`${profileKey}.latitude`] || errors[`${profileKey}.longitude`] || errors[profileKey]

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser. Enter coordinates manually or leave them blank.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((f) => ({ ...f, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }))
        setLocating(false)
      },
      () => {
        setError('Could not get your location. You can enter it manually or leave it blank.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const clientErrors = validate(form, role)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) {
      setError('Please fix the highlighted fields.')
      return
    }

    setSubmitting(true)
    try {
      const user = await register(buildPayload(form, role))
      navigate(ROLE_HOME[user.role], { replace: true })
    } catch (apiError) {
      const parsed = parseApiError(apiError, 'Registration failed. Please try again.')
      setError(parsed.message)
      setErrors(
        apiError.response?.status === 409 ? { email: parsed.message } : parsed.fieldErrors,
      )
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <UserPlus className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-slate-600">Join AapdaSaathi as a resident or a volunteer</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">I am registering as</legend>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
              {ROLE_OPTIONS.map(({ value, label, text, icon: Icon }) => {
                const active = role === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setRole(value)
                      setErrors({})
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                      active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`mt-0.5 h-5 w-5 ${active ? 'text-brand-600' : 'text-slate-400'}`} aria-hidden />
                    <span>
                      <span className="block font-semibold">{label}</span>
                      <span className="block text-xs text-slate-600">{text}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-base font-semibold">Account details</legend>
            <FormField label="Full name" name="full_name" autoComplete="name" value={form.full_name} onChange={update} error={err('full_name')} required className="sm:col-span-2" />
            <FormField label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} error={err('email')} required />
            <FormField label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="9876543210" value={form.phone} onChange={update} error={err('phone')} required />
            <FormField label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={update} error={err('password')} hint="At least 8 characters with a letter and a number" required />
            <FormField label="Confirm password" name="confirm_password" type="password" autoComplete="new-password" value={form.confirm_password} onChange={update} error={err('confirm_password')} required />
          </fieldset>

          {role === ROLES.RESIDENT ? (
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 text-base font-semibold">Resident details</legend>
              <FormField label="State" name="state" autoComplete="address-level1" value={form.state} onChange={update} error={err('resident_profile.state')} required />
              <FormField label="District" name="district" value={form.district} onChange={update} error={err('resident_profile.district')} required />
              <FormField label="City / Town" name="city" autoComplete="address-level2" value={form.city} onChange={update} error={err('resident_profile.city')} />
              <FormField label="Village" name="village" value={form.village} onChange={update} error={err('resident_profile.village')} />
              <FormField label="Address" name="address" autoComplete="street-address" value={form.address} onChange={update} error={err('resident_profile.address')} className="sm:col-span-2" />
              <FormField label="Age" name="age" type="number" min="0" max="120" value={form.age} onChange={update} error={err('resident_profile.age')} />
              <FormField label="Emergency contact" name="emergency_contact" type="tel" value={form.emergency_contact} onChange={update} error={err('resident_profile.emergency_contact')} />
              <FormField label="Assistance needed" name="assistance_type" as="select" options={ASSISTANCE_TYPES} value={form.assistance_type} onChange={update} error={err('resident_profile.assistance_type')} className="sm:col-span-2" />
              <FormField label="Accessibility preferences" name="accessibility_preferences" as="textarea" placeholder="e.g. prefers voice calls, uses a wheelchair" value={form.accessibility_preferences} onChange={update} error={err('resident_profile.accessibility_preferences')} className="sm:col-span-2" />
            </fieldset>
          ) : (
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 text-base font-semibold">Volunteer details</legend>
              <FormField label="Base location" name="location" placeholder="Area, city" value={form.location} onChange={update} error={err('volunteer_profile.location')} required className="sm:col-span-2" />
              <FormField label="Field contact number" name="volunteer_phone" type="tel" value={form.volunteer_phone} onChange={update} error={err('volunteer_profile.phone')} hint="Leave blank to use your account phone" />
              <FormField label="Availability" name="availability_status" as="select" options={AVAILABILITY_STATUSES} value={form.availability_status} onChange={update} error={err('volunteer_profile.availability_status')} />
            </fieldset>
          )}

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-1 text-base font-semibold">Location coordinates</legend>
            <p className="-mt-1 text-xs text-slate-500 sm:col-span-2">
              Optional, but helps responders reach you. Only used for emergency coordination.
            </p>
            <FormField label="Latitude" name="latitude" type="number" step="any" value={form.latitude} onChange={update} error={coordError} />
            <FormField label="Longitude" name="longitude" type="number" step="any" value={form.longitude} onChange={update} />
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              Use my current location
            </button>
          </fieldset>

          <AlertBanner>{error}</AlertBanner>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </section>
  )
}
