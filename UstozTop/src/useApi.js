import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

// GET so'rovi uchun hook: { data, error, loading, reload }. path null bo'lsa so'rov yuborilmaydi.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) return undefined
    let cancelled = false
    const controller = new AbortController()
    setState((current) => (current.loading && !current.error ? current : { ...current, loading: true, error: null }))
    api.get(path, controller.signal)
      .then((data) => { if (!cancelled) setState({ data, error: null, loading: false }) })
      .catch((error) => { if (!cancelled && error?.name !== 'AbortError') setState((current) => ({ data: current.data, error, loading: false })) })
    return () => { cancelled = true; controller.abort() }
  }, [path, version])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true }))
    setVersion((value) => value + 1)
  }, [])

  // path endi paydo bo'lgan birinchi renderda ham "yuklanmoqda" deb hisoblanadi (data hali yo'q).
  return { ...state, loading: state.loading || Boolean(path && !state.data && !state.error), reload }
}
