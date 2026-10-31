import { useCallback, useEffect, useState } from 'react'
import { getHealth } from '../services/api'

async function fetchStatus() {
  try {
    const data = await getHealth()
    return { status: data?.status === 'healthy' ? 'online' : 'offline', error: null }
  } catch (err) {
    return { status: 'offline', error: err.message }
  }
}

/**
 * Pings the backend /health endpoint.
 * status: 'checking' | 'online' | 'offline'
 */
export default function useApiStatus() {
  const [state, setState] = useState({ status: 'checking', error: null })

  useEffect(() => {
    let ignore = false
    fetchStatus().then((result) => {
      if (!ignore) setState(result)
    })
    return () => {
      ignore = true
    }
  }, [])

  const retry = useCallback(async () => {
    setState({ status: 'checking', error: null })
    setState(await fetchStatus())
  }, [])

  return { ...state, retry }
}
