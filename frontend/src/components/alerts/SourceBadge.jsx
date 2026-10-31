import { FlaskConical, ShieldCheck } from 'lucide-react'

/** Official (SACHET) vs simulated (demo) must never be confusable. */
export default function SourceBadge({ isOfficial, detailed = false }) {
  if (isOfficial) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-navy-600 bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy-800">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Official alert · SACHET
      </span>
    )
  }
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 self-start rounded-full border border-dashed border-violet-500 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800">
        <FlaskConical className="h-3.5 w-3.5" aria-hidden />
        Simulated alert · demo
      </span>
      {detailed && (
        <span className="text-xs text-violet-800">
          Practice alert for demonstration. Not an official government warning.
        </span>
      )}
    </span>
  )
}
