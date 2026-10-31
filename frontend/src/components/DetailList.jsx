/** Read-only key/value card. Empty values render as an em dash. */
export default function DetailList({ title, items }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {items.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-900">{value === null || value === undefined || value === '' ? '—' : value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
