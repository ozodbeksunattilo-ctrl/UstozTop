import { useState } from 'react'
import { FiCheck, FiLock } from 'react-icons/fi'
import { api } from '../api.js'
import { translate as t } from '../i18n.js'
import { AVATAR_COLORS } from './avatar.js'

function ProfileEditor({ user, language, onSave, onCancel, onNotice, withGrade = false }) {
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [grade, setGrade] = useState(user.grade || '')
  const [avatarColor, setAvatarColor] = useState(user.avatarColor || AVATAR_COLORS[0])
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitProfile(event) {
    event.preventDefault()
    try {
      await onSave({ firstName: firstName.trim(), lastName: lastName.trim(), avatarColor, ...(withGrade ? { grade } : {}) })
      onNotice(t(language, 'Profilingiz saqlandi.'))
    } catch (error) {
      onNotice(t(language, error instanceof Error ? error.message : 'Profilni saqlab bo‘lmadi.'), true)
    }
  }

  async function submitPassword(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      onNotice(t(language, 'Parol yangilandi.'))
    } catch (error) {
      onNotice(t(language, error instanceof Error ? error.message : 'Parolni almashtirib bo‘lmadi.'), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pe">
      <form className="pe-form" onSubmit={submitProfile}>
        <div className="pe-row">
          <label>
            <span>{t(language, 'Ism')}</span>
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required minLength={2} autoComplete="given-name" />
          </label>
          <label>
            <span>{t(language, 'Familiya')}</span>
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} required minLength={2} autoComplete="family-name" />
          </label>
        </div>
        <label>
          <span>{t(language, 'Email manzil')}</span>
          <input value={user.email || user.phone || ''} readOnly disabled />
        </label>
        {withGrade && (
          <label>
            <span>{t(language, 'Sinf / guruh')}</span>
            <select value={grade} onChange={(event) => setGrade(event.target.value)}>
              <option value="">{t(language, 'Tanlanmagan')}</option>
              {Array.from({ length: 11 }, (_, index) => `${index + 1}-sinf`).map((item) => (
                <option key={item} value={item}>{language === 'ru' ? `${item.replace('-sinf', '')} класс` : language === 'en' ? `Grade ${item.replace('-sinf', '')}` : t(language, item)}</option>
              ))}
            </select>
          </label>
        )}
        <fieldset className="pe-colors">
          <legend>{t(language, 'Avatar rangi')}</legend>
          {AVATAR_COLORS.map((color) => (
            <button
              type="button"
              key={color}
              className={avatarColor === color ? 'is-active' : ''}
              style={{ background: color }}
              aria-label={color}
              aria-pressed={avatarColor === color}
              onClick={() => setAvatarColor(color)}
            >
              {avatarColor === color && <FiCheck aria-hidden="true" />}
            </button>
          ))}
        </fieldset>
        <div className="pe-actions">
          {onCancel && <button type="button" className="pe-ghost" onClick={onCancel}>{t(language, 'Bekor qilish')}</button>}
          <button type="submit" className="pe-primary">{t(language, 'Saqlash')}</button>
        </div>
      </form>

      <form className="pe-form pe-password" onSubmit={submitPassword}>
        <h3><FiLock aria-hidden="true" /> {t(language, 'Parolni almashtirish')}</h3>
        <label>
          <span>{t(language, 'Joriy parol')}</span>
          <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        <label>
          <span>{t(language, 'Yangi parol')}</span>
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required placeholder={t(language, 'Kamida 8 ta belgi')} />
        </label>
        <div className="pe-actions">
          <button type="submit" className="pe-primary" disabled={busy}>{t(language, 'Parolni yangilash')}</button>
        </div>
      </form>
    </div>
  )
}

export default ProfileEditor
