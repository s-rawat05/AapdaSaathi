export const APP_NAME = 'AapdaSaathi'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RESIDENT: '/resident',
  ADMIN: '/admin',
  VOLUNTEER: '/volunteer',
}

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

// Roles allowed on each dashboard route
export const ROUTE_ROLES = {
  [ROUTES.ADMIN]: [ROLES.ADMIN],
  [ROUTES.RESIDENT]: [ROLES.RESIDENT],
  [ROUTES.VOLUNTEER]: [ROLES.VOLUNTEER],
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
