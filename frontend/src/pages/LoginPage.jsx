import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import FormField from '../components/FormField'
import useAuth from '../hooks/useAuth'
import { ROLE_HOME, ROUTE_ROLES, ROUTES } from '../utils/constants'
import { parseApiError } from '../utils/errors'

function destinationFor(user, from) {
  // Return to the page the user originally asked for, but only if their role may see it
  if (from && ROUTE_ROLES[from]?.includes(user.role)) return from
  return ROLE_HOME[user.role]
}

export default function LoginPage() {
  const { login, notice, clearNotice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const validate = () => {
    const errors = {}
    if (!form.email.trim()) errors.email = 'Email is required'
    if (!form.password) errors.password = 'Password is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    clearNotice()
    if (!validate()) return

    setSubmitting(true)
    try {
      const user = await login(form.email.trim(), form.password)
      navigate(destinationFor(user, location.state?.from), { replace: true })
    } catch (err) {
      const parsed = parseApiError(err, 'Login failed. Please try again.')
      setError(parsed.message)
      setFieldErrors(parsed.fieldErrors)
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <LogIn className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Log in</h1>
          <p className="mt-1 text-sm text-slate-600">Access your AapdaSaathi dashboard</p>
        </div>

        <div className="mb-4 space-y-3">
          <AlertBanner type="info">{notice}</AlertBanner>
          <AlertBanner>{error}</AlertBanner>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update}
            error={fieldErrors.email}
            required
          />
          <div className="relative">
            <FormField
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={update}
              error={fieldErrors.password}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-7 right-2 rounded p-1 text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to AapdaSaathi?{' '}
          <Link to={ROUTES.REGISTER} className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  )
}
