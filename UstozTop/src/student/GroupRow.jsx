import { useState } from 'react'
import { FiClock, FiSend, FiUsers } from 'react-icons/fi'
import { api } from '../api.js'
import { daysText } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'

// Guruhga qo'shilish: o'quvchi so'rov yuboradi, ustoz tasdiqlagach a'zo bo'ladi (ustoz profili va fan sahifasida ishlatiladi).
function GroupRow({ group, language, onChanged, onNotice, showTeacher = false }) {
  const [busy, setBusy] = useState(false)

  async function act() {
    setBusy(true)
    try {
      if (group.joined || group.requested) await api.del(`/groups/${group.id}/join`)
      else await api.post(`/groups/${group.id}/join`)
      onNotice(t(language, group.joined ? 'Guruhdan chiqdingiz.' : group.requested ? 'So‘rov bekor qilindi.' : 'So‘rov ustozga yuborildi. Tasdiqlangach guruhga qo‘shilasiz.'))
      onChanged()
    } catch (error) {
      onNotice(t(language, error.message), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grow" style={{ '--subject-accent': group.subject.color }}>
      <span className="grow-icon">{group.subject.icon}</span>
      <span className="grow-body">
        <strong>{group.name}</strong>
        <small>
          {showTeacher && group.teacher ? `${group.teacher.fullName} · ` : ''}
          <FiClock aria-hidden="true" /> {group.lessonTime} · {daysText(language, group.daysOfWeek)}
        </small>
        <small><FiUsers aria-hidden="true" /> {group.memberCount}/{group.capacity}</small>
      </span>
      {group.joined ? (
        <span className="grow-actions">
          <span className="join-member">{t(language, 'A‘zosiz')}</span>
          <button type="button" className="ui-btn-link" disabled={busy} onClick={act}>{t(language, 'Guruhdan chiqish')}</button>
        </span>
      ) : group.requested ? (
        <span className="grow-actions">
          <span className="join-pending"><i />{t(language, 'Ustoz javobi kutilmoqda')}</span>
          <button type="button" className="ui-btn-link" disabled={busy} onClick={act}>{t(language, 'So‘rovni bekor qilish')}</button>
        </span>
      ) : (
        <button type="button" className="ui-btn ui-btn-sm ui-btn-primary" disabled={busy || group.full} onClick={act}>
          {group.full ? t(language, 'Joy yo‘q') : <><FiSend aria-hidden="true" /> {t(language, 'So‘rov yuborish')}</>}
        </button>
      )}
    </div>
  )
}

export default GroupRow
