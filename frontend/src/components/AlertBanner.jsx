import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

const STYLES = {
  error: { box: 'border-red-200 bg-red-50 text-red-800', Icon: AlertCircle },
  info: { box: 'border-amber-200 bg-amber-50 text-amber-800', Icon: Info },
  success: { box: 'border-green-200 bg-green-50 text-green-800', Icon: CheckCircle2 },
}

export default function AlertBanner({ type = 'error', children }) {
  if (!children) return null
  const { box, Icon } = STYLES[type]
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${box}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
