import api from './api'

export const registerUser = (payload) => api.post('/api/auth/register', payload).then((res) => res.data)

export const loginUser = (email, password) =>
  api.post('/api/auth/login', { email, password }).then((res) => res.data)

export const getCurrentUser = () => api.get('/api/users/me').then((res) => res.data)
