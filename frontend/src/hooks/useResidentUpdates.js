import { useCallback, useEffect, useRef, useState } from 'react'
import { getNotifications, getResidentUpdates } from '../services/residentService'
import { POLL_INTERVAL_MS } from '../utils/constants'

const MAX_BACKOFF_MS = 120000

/**
 * Polls GET /api/residents/updates (a few bytes) while the tab is visible.
 * When the newest notification id increases, fetches only the new unread
 * notifications and hands them to onNew. Backs off exponentially on errors.
 */
export default function useResidentUpdates(onNew) {
  const [updates, setUpdates] = useState(null)
  const lastSeenId = useRef(0)
  const initialised = useRef(false)
  const onNewRef = useRef(onNew)

  useEffect(() => {
    onNewRef.current = onNew
  }, [onNew])

  const poll = useCallback(async () => {
    const data = await getResidentUpdates()
    setUpdates(data)
    const latest = data.latest_notification_id ?? 0
    const previous = lastSeenId.current
    lastSeenId.current = Math.max(previous, latest)

    // The first poll only records a baseline; older alerts are shown on the dashboard instead
    if (initialised.current && latest > previous) {
      const fresh = await getNotifications({ unread_only: true, limit: 20 })
      const newOnes = fresh.filter((n) => n.id > previous)
      if (newOnes.length) onNewRef.current?.(newOnes)
    }
    initialised.current = true
  }, [])

  useEffect(() => {
    let timer
    let delay = POLL_INTERVAL_MS
    let stopped = false

    const schedule = () => {
      if (!stopped) timer = setTimeout(tick, delay)
    }
    async function tick() {
      if (document.visibilityState === 'visible') {
        try {
          await poll()
          delay = POLL_INTERVAL_MS
        } catch {
          delay = Math.min(delay * 2, MAX_BACKOFF_MS)
        }
      }
      schedule()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer)
        tick()
      }
    }

    tick()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [poll])

  return { updates, refresh: poll }
}
