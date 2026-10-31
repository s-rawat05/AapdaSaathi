import api from './api'

export const getResidentProfile = () => api.get('/api/residents/profile').then((res) => res.data)

export const updateResidentProfile = (data) => api.put('/api/residents/profile', data).then((res) => res.data)

export const getVolunteerProfile = () => api.get('/api/volunteers/profile').then((res) => res.data)

export const updateVolunteerProfile = (data) => api.put('/api/volunteers/profile', data).then((res) => res.data)

export const listUsers = (params) => api.get('/api/admin/users', { params }).then((res) => res.data)
