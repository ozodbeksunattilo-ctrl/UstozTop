import { useEffect, useState } from 'react'

// Yengil router: history API. Dashboard manzillari: /student/dashboard, /teacher/dashboard, /admin/dashboard.
export function navigate(to, { replace = false } = {}) {
  if (window.location.pathname + window.location.search === to) return
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const update = () => setPath(window.location.pathname)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  return path
}

export const roleHome = (role) => `/${String(role).toLowerCase()}/dashboard`
