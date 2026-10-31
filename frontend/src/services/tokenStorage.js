/**
 * Access-token storage.
 *
 * The token lives in sessionStorage: it survives page reloads but is cleared
 * when the tab closes, and only the token is stored (user details are always
 * re-fetched from /api/users/me). Like any Web Storage it is readable by
 * JavaScript on this origin, so an XSS bug could steal it; the short token
 * lifetime limits the damage. See README "Authentication & token storage".
 */

const TOKEN_KEY = 'aapdasaathi.access_token'

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage unavailable (private mode / blocked): session lasts until reload
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

/** Expiry time in ms since epoch, read from the JWT payload (not verified: the server does that). */
export function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function isTokenExpired(token) {
  const expiry = getTokenExpiry(token)
  return expiry !== null && expiry <= Date.now()
}
