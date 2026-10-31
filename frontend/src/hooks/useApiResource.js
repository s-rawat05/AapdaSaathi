import { useCallback, useEffect, useState } from 'react'
import { parseApiError } from '../utils/errors'

/** Loads data from an API call on mount. fetcher must be stable (module-level function or useCallback). */
export default function useApiResource(fetcher) {
  const [state, setState] = useState({ data: null, error: null, loading: true })

  const run = useCallback(
    () =>
      fetcher()
        .then((data) => ({ data, error: null, loading: false }))
        .catch((err) => ({ data: null, error: parseApiError(err).message, loading: false })),
    [fetcher],
  )

  useEffect(() => {
    let ignore = false
    run().then((result) => {
      if (!ignore) setState(result)
    })
    return () => {
      ignore = true
    }
  }, [run])

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    setState(await run())
  }, [run])

  return { ...state, reload }
}
