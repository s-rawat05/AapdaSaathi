export default function EmptyState({ icon: Icon, title, children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-slate-200 bg-white text-slate-600',
    safe: 'border-green-200 bg-green-50 text-green-800',
  }
  return (
    <div className={`rounded-2xl border border-dashed p-8 text-center ${tones[tone]}`}>
      {Icon && <Icon className="mx-auto h-9 w-9 opacity-80" aria-hidden />}
      <p className="mt-3 text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm">{children}</div>}
    </div>
  )
}
