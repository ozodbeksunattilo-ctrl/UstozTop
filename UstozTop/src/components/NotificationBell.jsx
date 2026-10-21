import { useCallback, useEffect, useRef, useState } from 'react'
import { FiBell, FiBookOpen, FiCheck, FiInfo } from 'react-icons/fi'
import { api } from '../api.js'
import { translate as t } from '../i18n.js'

function timeAgo(value, language) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return t(language, 'hozirgina')
  if (minutes < 60) return `${minutes} ${t(language, 'daqiqa oldin')}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${t(language, 'soat oldin')}`
  return `${Math.round(hours / 24)} ${t(language, 'kun oldin')}`
}

// Xabarnomalar: bugungi dars eslatmalari, so'rovlar natijasi va h.k. Har daqiqada yangilanadi.
function NotificationBell({ language, className = '' }) {
  const [state, setState] = useState({ items: [], unread: 0 })
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  const load = useCallback(() => {
    api.get('/notifications').then((data) => setState({ items: data.notifications, unread: data.unread })).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (box.current && !box.current.contains(event.target)) setOpen(false) }
    const esc = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && state.unread) {
      try {
        await api.post('/notifications/read')
        setState((current) => ({ ...current, unread: 0 }))
      } catch {
        // belgilab bo'lmasa, keyingi yangilanishda qayta uriniladi
      }
    }
  }

  return (
    <div className={`bell ${className}`} ref={box}>
      <button type="button" className="bell-button" onClick={toggle} aria-label={t(language, 'Xabarnomalar')} aria-expanded={open}>
        <FiBell aria-hidden="true" />
        {state.unread > 0 && <b className="bell-badge">{state.unread > 9 ? '9+' : state.unread}</b>}
      </button>
      {open && (
        <div className="bell-panel" role="dialog" aria-label={t(language, 'Xabarnomalar')}>
          <header><strong>{t(language, 'Xabarnomalar')}</strong><span><FiCheck aria-hidden="true" /> {t(language, 'Hammasi o‘qildi')}</span></header>
          {state.items.length ? (
            <ul>
              {state.items.map((item) => (
                <li key={item.id} className={item.title.startsWith('Bugun') ? 'is-lesson' : ''}>
                  <i>{item.title.startsWith('Bugun') ? <FiBookOpen aria-hidden="true" /> : <FiInfo aria-hidden="true" />}</i>
                  <span><strong>{item.title}</strong><small>{item.body}</small><em>{timeAgo(item.createdAt, language)}</em></span>
                </li>
              ))}
            </ul>
          ) : <p className="bell-empty">{t(language, 'Hozircha xabarnoma yo‘q.')}</p>}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
