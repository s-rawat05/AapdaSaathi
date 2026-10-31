import api from './api'

export const createResponse = (alertId, status) =>
  api.post('/api/responses', { alert_id: alertId, status }).then((res) => res.data)

export const updateResponse = (responseId, status) =>
  api.put(`/api/responses/${responseId}`, { status }).then((res) => res.data)

export const getMyResponses = () => api.get('/api/responses/my').then((res) => res.data)

/**
 * Create the response, or update it if one already exists. Handles the case where the
 * resident responded from another tab/device (POST returns 409).
 */
export async function submitResponse(alert, status) {
  if (alert.my_response) return updateResponse(alert.my_response.id, status)
  try {
    return await createResponse(alert.id, status)
  } catch (error) {
    if (error.response?.status !== 409) throw error
    const existing = (await getMyResponses()).find((r) => r.alert_id === alert.id)
    if (!existing) throw error
    return updateResponse(existing.id, status)
  }
}
