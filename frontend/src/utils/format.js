const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export const formatDateTime = (iso) => (iso ? dateTime.format(new Date(iso)) : '—')

export function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return relative.format(seconds, 'second')
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  return relative.format(Math.round(seconds / 86400), 'day')
}
