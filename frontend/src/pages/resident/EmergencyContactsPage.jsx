import { useState } from 'react'
import { Loader2, Pencil, Phone, PhoneCall, Plus, Trash2, UserRound } from 'lucide-react'
import AlertBanner from '../../components/AlertBanner'
import FormField from '../../components/FormField'
import FullPageSpinner from '../../components/FullPageSpinner'
import useResident from '../../hooks/useResident'
import { updateResidentProfile } from '../../services/profileService'
import { HELPLINES, RELATIONSHIPS } from '../../utils/constants'
import { parseApiError } from '../../utils/errors'

const PHONE_RE = /^\+?[0-9]{10,15}$/
const CLEARED = { emergency_contact: null, emergency_contact_name: null, emergency_contact_relationship: null }

/**
 * The resident's primary emergency contact is stored on their profile
 * (no separate table), so add / edit / delete all go through PUT /api/residents/profile.
 */
export default function EmergencyContactsPage() {
  const { profile, profileLoading, profileError, setProfile } = useResident()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', relationship: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ type: null, message: '' })
  const [busy, setBusy] = useState(null)

  if (profileLoading && !profile) return <FullPageSpinner label="Loading contacts…" />
  if (profileError) return <AlertBanner>{profileError}</AlertBanner>
  if (!profile) return null

  const hasContact = Boolean(profile.emergency_contact)

  const startEdit = () => {
    setForm({
      name: profile.emergency_contact_name ?? '',
      phone: profile.emergency_contact ?? '',
      relationship: profile.emergency_contact_relationship ?? '',
    })
    setErrors({})
    setStatus({ type: null, message: '' })
    setEditing(true)
  }

  const save = async (e) => {
    e.preventDefault()
    const found = {}
    if (form.name.trim().length < 2) found.name = 'Enter the contact’s name'
    if (!PHONE_RE.test(form.phone.trim())) found.phone = 'Enter a valid mobile number (10-15 digits, optional +)'
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy('save')
    try {
      const saved = await updateResidentProfile({
        emergency_contact_name: form.name.trim(),
        emergency_contact: form.phone.trim(),
        emergency_contact_relationship: form.relationship || null,
      })
      setProfile(saved)
      setEditing(false)
      setStatus({ type: 'success', message: hasContact ? 'Emergency contact updated.' : 'Emergency contact added.' })
    } catch (err) {
      const parsed = parseApiError(err, 'Could not save the contact.')
      setErrors({
        name: parsed.fieldErrors.emergency_contact_name,
        phone: parsed.fieldErrors.emergency_contact,
      })
      setStatus({ type: 'error', message: parsed.message })
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete this emergency contact?')) return
    setBusy('delete')
    try {
      setProfile(await updateResidentProfile(CLEARED))
      setStatus({ type: 'success', message: 'Emergency contact deleted.' })
    } catch (err) {
      setStatus({ type: 'error', message: parseApiError(err, 'Could not delete the contact.').message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Emergency contacts</h1>
        <p className="mt-1 text-slate-600">The person responders should call if they cannot reach you.</p>
      </header>

      <AlertBanner type={status.type === 'success' ? 'success' : 'error'}>{status.message}</AlertBanner>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-navy-900">Your emergency contact</h2>

        {editing ? (
          <form onSubmit={save} noValidate className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
              <FormField label="Mobile number" name="phone" type="tel" inputMode="tel" placeholder="9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} required />
              <FormField
                label="Relationship"
                name="relationship"
                as="select"
                options={[{ value: '', label: 'Select…' }, ...RELATIONSHIPS.map((r) => ({ value: r, label: r }))]}
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={busy === 'save'} className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-5 py-2.5 font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
                {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Save contact
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        ) : hasContact ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-800">
                <UserRound className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-lg font-semibold">{profile.emergency_contact_name || 'Unnamed contact'}</p>
                <p className="text-sm text-slate-600">
                  {[profile.emergency_contact_relationship, profile.emergency_contact].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${profile.emergency_contact}`} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">
                <Phone className="h-4 w-4" aria-hidden /> Call
              </a>
              <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </button>
              <button type="button" onClick={remove} disabled={busy === 'delete'} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />} Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-orange-300 bg-orange-50 p-5">
            <p className="font-medium text-orange-900">You have not added an emergency contact.</p>
            <button type="button" onClick={startEdit} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 font-semibold text-white hover:bg-navy-800">
              <Plus className="h-4 w-4" aria-hidden /> Add emergency contact
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
          <PhoneCall className="h-5 w-5" aria-hidden /> National emergency helplines
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {HELPLINES.map(({ number, label }) => (
            <li key={number}>
              <a href={`tel:${number}`} className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 hover:border-red-300 hover:bg-red-50">
                <span className="text-2xl font-extrabold text-red-700">{number}</span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Your state may also run its own disaster control room number.</p>
      </section>
    </div>
  )
}
