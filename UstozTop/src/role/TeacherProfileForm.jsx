import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { translate as t } from '../i18n.js'

// Ustoz profili: talabalar ustoz sahifasida shu ma'lumotlarni ko'radi.
function TeacherProfileForm({ language, onNotice }) {
  const [form, setForm] = useState({ bio: '', qualification: '', experienceYears: 0 })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/teacher/profile').then(({ profile }) => {
      if (profile) setForm({ bio: profile.bio, qualification: profile.qualification, experienceYears: profile.experienceYears })
    }).catch(() => {})
  }, [])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.patch('/teacher/profile', { ...form, experienceYears: Number(form.experienceYears) || 0 })
      onNotice(t(language, 'Ustoz profili saqlandi.'))
    } catch (error) {
      onNotice(t(language, error.message), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ui-form teacher-profile-form" onSubmit={submit}>
      <h3>{t(language, 'Ustoz ma’lumotlari')}</h3>
      <label>{t(language, 'Malaka va ta’lim')}<input value={form.qualification} maxLength={200} onChange={(event) => setForm({ ...form, qualification: event.target.value })} /></label>
      <label>{t(language, 'Tajriba (yil)')}<input type="number" min="0" max="70" value={form.experienceYears} onChange={(event) => setForm({ ...form, experienceYears: event.target.value })} /></label>
      <label>{t(language, 'O‘zim haqimda')}<textarea value={form.bio} maxLength={600} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
      <button type="submit" className="ui-btn ui-btn-primary" disabled={busy}>{t(language, 'Saqlash')}</button>
    </form>
  )
}

export default TeacherProfileForm
