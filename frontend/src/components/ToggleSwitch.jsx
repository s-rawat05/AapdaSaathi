import { useId } from 'react'

/** Accessible on/off switch (role="switch") with label and helper text. */
export default function ToggleSwitch({ label, description, checked, onChange, disabled = false, note }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="font-medium text-slate-900">{label}</label>
        {description && <p id={`${id}-desc`} className="text-sm text-slate-600">{description}</p>}
        {note && <p className="mt-0.5 text-xs text-amber-700">{note}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:ring-4 focus-visible:ring-navy-200 focus-visible:outline-none disabled:opacity-50 ${
          checked ? 'bg-navy-700' : 'bg-slate-300'
        }`}
      >
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
        <span
          aria-hidden
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  )
}
