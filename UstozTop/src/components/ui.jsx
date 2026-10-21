import { FiAlertCircle, FiInbox, FiStar } from 'react-icons/fi'
import { translate as t } from '../i18n.js'
import { avatarStyle } from './avatar.js'
import './ui.css'

export function initialsOf(name = '') {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function Avatar({ name, color, size = 40 }) {
  return (
    <span className="ui-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36), ...avatarStyle({ avatarColor: color }) }} aria-hidden="true">
      {initialsOf(name)}
    </span>
  )
}

export function Stars({ value = 0, count, language }) {
  const rounded = Math.round(value)
  return (
    <span className="ui-stars" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => <FiStar key={star} className={star <= rounded ? 'is-on' : ''} aria-hidden="true" />)}
      <strong>{value ? value.toFixed(1) : '—'}</strong>
      {count !== undefined && <small>({count}{language ? ` ${t(language, 'baho')}` : ''})</small>}
    </span>
  )
}

export function Loading({ language }) {
  return <div className="ui-state" role="status"><span className="ui-spinner" />{language ? t(language, 'Yuklanmoqda...') : '...'}</div>
}

export function ErrorBox({ error, onRetry, language }) {
  return (
    <div className="ui-state ui-state-error" role="alert">
      <FiAlertCircle aria-hidden="true" />
      <span>{error?.message || 'Xatolik yuz berdi.'}</span>
      {onRetry && <button type="button" onClick={onRetry}>{t(language, 'Qayta urinish')}</button>}
    </div>
  )
}

export function Empty({ title, detail, action }) {
  return (
    <div className="ui-state ui-empty">
      <FiInbox aria-hidden="true" />
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
      {action}
    </div>
  )
}

export function formatDate(value, language) {
  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'uz-Cyrl' ? 'uz-Cyrl-UZ' : 'uz-UZ'
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(value))
}

export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function dayLabel(language, day) {
  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'uz-Cyrl' ? 'uz-Cyrl-UZ' : 'uz-UZ'
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + DAY_ORDER.indexOf(day)))
}

export function daysText(language, days) {
  return DAY_ORDER.filter((day) => days.includes(day)).map((day) => dayLabel(language, day)).join(', ')
}

export function Dialog({ title, subtitle, onClose, children, actions, wide = false }) {
  return (
    <div className="ui-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="ui-dialog" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: 'min(640px, 100%)' } : undefined}>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children}
        {actions && <div className="ui-dialog-actions">{actions}</div>}
      </section>
    </div>
  )
}
