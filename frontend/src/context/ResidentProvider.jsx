import { useCallback, useMemo, useState } from 'react'
import { ResidentContext } from './residentContext'
import useApiResource from '../hooks/useApiResource'
import useResidentUpdates from '../hooks/useResidentUpdates'
import { getResidentProfile } from '../services/profileService'
import { getMyAlerts } from '../services/residentService'
import { speak, vibrate } from '../utils/accessibility'
import { buildAlertSpeech } from '../utils/alerts'

/**
 * Shared state for the resident portal: profile, polling for new alerts,
 * and the queue of newly arrived alerts shown in the emergency overlay.
 */
export default function ResidentProvider({ children }) {
  const profileResource = useApiResource(getResidentProfile)
  const profile = profileResource.data
  const [incoming, setIncoming] = useState([])
  const [localVersion, setLocalVersion] = useState(0)

  const announce = useCallback(
    (alert) => {
      // Preferences only switch extra channels on/off; the on-screen alert is always shown
      if (profile?.voice_alerts_enabled) speak(buildAlertSpeech(alert, profile.simple_language_enabled))
      if (profile?.vibration_enabled) vibrate()
    },
    [profile],
  )

  const handleNewNotifications = useCallback(
    async (notifications) => {
      const alertIds = new Set(notifications.filter((n) => n.alert).map((n) => n.alert.id))
      if (!alertIds.size) return
      const alerts = (await getMyAlerts()).filter((a) => alertIds.has(a.id))
      if (!alerts.length) return
      setIncoming((queue) => [...queue, ...alerts.filter((a) => !queue.some((q) => q.id === a.id))])
      announce(alerts[0])
    },
    [announce],
  )

  const { updates, refresh } = useResidentUpdates(handleNewNotifications)

  // Bumped after local changes (a response, marking read) so views re-fetch immediately
  const bump = useCallback(() => {
    setLocalVersion((v) => v + 1)
    refresh().catch(() => {})
  }, [refresh])

  const dismissIncoming = useCallback(() => setIncoming((queue) => queue.slice(1)), [])
  const updateIncoming = useCallback(
    (alert) => setIncoming((queue) => queue.map((a) => (a.id === alert.id ? alert : a))),
    [],
  )

  const alertsVersion = `${updates?.active_alert_ids?.join(',') ?? ''}:${localVersion}`
  const notificationsVersion = `${updates?.latest_notification_id ?? 0}:${updates?.unread_notifications ?? 0}:${localVersion}`

  const value = useMemo(
    () => ({
      profile,
      profileLoading: profileResource.loading,
      profileError: profileResource.error,
      setProfile: profileResource.setData,
      reloadProfile: profileResource.reload,
      updates,
      alertsVersion,
      notificationsVersion,
      bump,
      incoming,
      dismissIncoming,
      updateIncoming,
      announce,
    }),
    [profile, profileResource.loading, profileResource.error, profileResource.setData, profileResource.reload,
      updates, alertsVersion, notificationsVersion, bump, incoming, dismissIncoming, updateIncoming, announce],
  )

  return <ResidentContext.Provider value={value}>{children}</ResidentContext.Provider>
}
