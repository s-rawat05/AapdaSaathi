import { AlertTriangle } from 'lucide-react'
import { severityOf } from '../../utils/alerts'

export default function SeverityBadge({ severity, size = 'md' }) {
  const { label, badge } = severityOf(severity)
  const sizing = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold tracking-wide uppercase ${sizing} ${badge}`}>
      <AlertTriangle className={size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden />
      <span>{label}<span className="sr-only"> severity</span></span>
    </span>
  )
}
