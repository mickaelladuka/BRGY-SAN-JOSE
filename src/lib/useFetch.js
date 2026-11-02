import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from './api'

/** Small GET helper with loading/error state and manual reload. Aborts on unmount. */
export function useFetch(url, params) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const key = JSON.stringify(params ?? {})
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!url) return undefined
    const ctrl = new AbortController()
    setState((s) => ({ ...s, loading: true, error: '' }))
    api.get(url, { params: JSON.parse(key), signal: ctrl.signal })
      .then((r) => setState({ data: r.data, loading: false, error: '' }))
      .catch((err) => { if (err.code !== 'ERR_CANCELED') setState({ data: null, loading: false, error: getErrorMessage(err) }) })
    return () => ctrl.abort()
  }, [url, key, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
