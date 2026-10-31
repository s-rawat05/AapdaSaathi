import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { setUnauthorizedHandler } from '../services/api'
import { getCurrentUser, loginUser, registerUser } from '../services/authService'
import { clearToken, getToken, getTokenExpiry, isTokenExpired, setToken } from '../services/tokenStorage'

const EXPIRED_MESSAGE = 'Your session has expired. Please log in again.'

function initialState() {
  const token = getToken()
  if (!token) return { status: 'anonymous', user: null, token: null, notice: null }
  if (isTokenExpired(token)) {
    clearToken()
    return { status: 'anonymous', user: null, token: null, notice: EXPIRED_MESSAGE }
  }
  // Token present: confirm it with the backend before trusting it
  return { status: 'loading', user: null, token, notice: null }
}

/**
 * status: 'loading' | 'authenticated' | 'anonymous'
 */
export default function AuthProvider({ children }) {
  const [state, setState] = useState(initialState)

  const endSession = useCallback((notice = null) => {
    clearToken()
    setState({ status: 'anonymous', user: null, token: null, notice })
  }, [])

  // Any 401 on an authenticated request ends the session
  useEffect(() => {
    setUnauthorizedHandler((detail) => endSession(detail === 'Token has expired' ? EXPIRED_MESSAGE : null))
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  // Restore the session on page load
  useEffect(() => {
    if (state.status !== 'loading') return
    let ignore = false
    getCurrentUser()
      .then((user) => {
        if (!ignore) setState((s) => ({ ...s, status: 'authenticated', user }))
      })
      .catch((error) => {
        // 401 is already handled by the interceptor; anything else (e.g. backend down) also logs out
        if (!ignore && error.response?.status !== 401) endSession(null)
      })
    return () => {
      ignore = true
    }
  }, [state.status, endSession])

  // Log out automatically the moment the token expires
  useEffect(() => {
    if (!state.token) return
    const expiry = getTokenExpiry(state.token)
    if (!expiry) return
    const timer = setTimeout(() => endSession(EXPIRED_MESSAGE), Math.max(expiry - Date.now(), 0))
    return () => clearTimeout(timer)
  }, [state.token, endSession])

  const login = useCallback(async (email, password) => {
    const data = await loginUser(email, password)
    setToken(data.access_token)
    setState({ status: 'authenticated', user: data.user, token: data.access_token, notice: null })
    return data.user
  }, [])

  const register = useCallback(
    async (payload) => {
      await registerUser(payload)
      return login(payload.email, payload.password)
    },
    [login],
  )

  const logout = useCallback(() => endSession(null), [endSession])

  const clearNotice = useCallback(() => setState((s) => ({ ...s, notice: null })), [])

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user,
      isAuthenticated: state.status === 'authenticated',
      notice: state.notice,
      login,
      register,
      logout,
      clearNotice,
    }),
    [state.status, state.user, state.notice, login, register, logout, clearNotice],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
