import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { getToken } from './tokenStorage'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// AuthContext registers a handler so an expired/invalid token logs the user out everywhere.
let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const sentToken = Boolean(error.config?.headers?.Authorization)
    if (error.response?.status === 401 && sentToken && unauthorizedHandler) {
      unauthorizedHandler(error.response.data?.detail)
    }
    return Promise.reject(error)
  },
)

export const getApiRoot = () => api.get('/').then((res) => res.data)

export const getHealth = () => api.get('/health').then((res) => res.data)

export default api
