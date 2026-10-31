import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import useApiStatus from '../hooks/useApiStatus'
import { API_BASE_URL } from '../utils/constants'

const STYLES = {
  checking: 'border-slate-200 bg-white text-slate-600',
  online: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  offline: 'border-red-200 bg-red-50 text-red-700',
}

const LABELS = {
  checking: 'Checking backend…',
  online: 'Backend connected',
  offline: 'Backend unreachable',
}

export default function ApiStatusBadge() {
  const { status, error, retry } = useApiStatus()
  const Icon = status === 'checking' ? Loader2 : status === 'online' ? Wifi : WifiOff

  return (
    <div
      data-testid="api-status"
      data-status={status}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${STYLES[status]}`}
      title={error ? `${API_BASE_URL}: ${error}` : API_BASE_URL}
    >
      <Icon className={`h-4 w-4 ${status === 'checking' ? 'animate-spin' : ''}`} aria-hidden />
      <span>{LABELS[status]}</span>
      {status === 'offline' && (
        <button
          type="button"
          onClick={retry}
          className="ml-1 rounded-full p-0.5 hover:bg-red-100"
          aria-label="Retry backend connection"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}
