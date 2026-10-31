import api from './api'

export const getHelpRequests = () => api.get('/api/admin/help-requests').then((res) => res.data)
