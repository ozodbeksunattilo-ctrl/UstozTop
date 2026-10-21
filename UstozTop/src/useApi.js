import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

// GET so'rovi uchun hook: { data, error, loading, reload }. path null bo'lsa so'rov yuborilmaydi.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) return undefined
    let cancelled = false
    setState((current) => (current.loading && !current.error ? current : { ...current, loading: true, error: null }))
    api.get(path)
      .then((data) => { if (!cancelled) setState({ data, error: null, loading: false }) })
      .catch((error) => { if (!cancelled) setState((current) => ({ data: current.data, error, loading: false })) })
    return () => { cancelled = true }
  }, [path, version])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true }))
    setVersion((value) => value + 1)
  }, [])

  return { ...state, reload }
}
