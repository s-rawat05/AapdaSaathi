import { Construction } from 'lucide-react'

/**
 * Temporary page shell used until each route is built out.
 * Makes it explicit that the feature is not implemented yet.
 */
export default function PagePlaceholder({ icon: Icon = Construction, title, description, phase }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-3 text-slate-600">{description}</p>}
        {phase && (
          <p className="mt-6 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Planned for {phase}
          </p>
        )}
      </div>
    </section>
  )
}
