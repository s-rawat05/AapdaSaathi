import api from './api'

export const getMyAlerts = () => api.get('/api/residents/alerts').then((res) => res.data)

export const getNotifications = (params) =>
  api.get('/api/residents/notifications', { params }).then((res) => res.data)

export const markNotificationRead = (id) =>
  api.patch(`/api/residents/notifications/${id}/read`).then((res) => res.data)

export const markAllNotificationsRead = () =>
  api.patch('/api/residents/notifications/read-all').then((res) => res.data)

export const getResidentUpdates = () => api.get('/api/residents/updates').then((res) => res.data)
