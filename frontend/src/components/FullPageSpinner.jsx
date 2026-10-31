import { Loader2 } from 'lucide-react'

export default function FullPageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
