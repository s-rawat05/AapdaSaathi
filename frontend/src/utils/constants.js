export const APP_NAME = 'AapdaSaathi'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RESIDENT: '/resident',
  RESIDENT_PROFILE: '/resident/profile',
  RESIDENT_ALERTS: '/resident/alerts',
  RESIDENT_NOTIFICATIONS: '/resident/notifications',
  RESIDENT_CONTACTS: '/resident/contacts',
  RESIDENT_SETTINGS: '/resident/settings',
  ADMIN: '/admin',
  VOLUNTEER: '/volunteer',
}

// How often the resident portal checks for new alerts (only while the tab is visible)
export const POLL_INTERVAL_MS = 20000

// National numbers that work across India. State control-room numbers vary, so they are not listed.
export const HELPLINES = [
  { number: '112', label: 'National emergency (police, fire, ambulance)' },
  { number: '1078', label: 'NDMA disaster helpline' },
  { number: '108', label: 'Ambulance (most states)' },
  { number: '101', label: 'Fire' },
]

export const RELATIONSHIPS = ['Parent', 'Child', 'Spouse', 'Sibling', 'Relative', 'Neighbour', 'Friend', 'Caregiver', 'Other']

export const ROLES = {
  ADMIN: 'ADMIN',
  RESIDENT: 'RESIDENT',
  VOLUNTEER: 'VOLUNTEER',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.RESIDENT]: 'Resident',
  [ROLES.VOLUNTEER]: 'Volunteer',
}

// Where each role lands after login
export const ROLE_HOME = {
  [ROLES.ADMIN]: ROUTES.ADMIN,
  [ROLES.RESIDENT]: ROUTES.RESIDENT,
  [ROLES.VOLUNTEER]: ROUTES.VOLUNTEER,
}

// Roles allowed on each dashboard route (and everything below it)
export const ROUTE_ROLES = {
  [ROUTES.ADMIN]: [ROLES.ADMIN],
  [ROUTES.RESIDENT]: [ROLES.RESIDENT],
  [ROUTES.VOLUNTEER]: [ROLES.VOLUNTEER],
}

export function rolesForPath(path) {
  const base = Object.keys(ROUTE_ROLES).find((route) => path === route || path?.startsWith(`${route}/`))
  return base ? ROUTE_ROLES[base] : null
}

export const ASSISTANCE_TYPES = [
  { value: 'NONE', label: 'No special assistance' },
  { value: 'MOBILITY', label: 'Mobility' },
  { value: 'VISUAL', label: 'Visual' },
  { value: 'HEARING', label: 'Hearing' },
  { value: 'ELDERLY', label: 'Elderly care' },
  { value: 'OTHER', label: 'Other' },
]

export const AVAILABILITY_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'OFFLINE', label: 'Offline' },
]

// Resident alert-delivery preferences stored on the profile
export const PREFERENCE_KEYS = ['voice_alerts_enabled', 'visual_alerts_enabled', 'vibration_enabled', 'simple_language_enabled']
