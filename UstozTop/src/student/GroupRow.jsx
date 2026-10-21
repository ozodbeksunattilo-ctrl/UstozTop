import { useState } from 'react'
import { FiClock, FiUsers } from 'react-icons/fi'
import { api } from '../api.js'
import { daysText } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'

// Guruhga qo'shilish/chiqish qatori (ustoz profili va fan sahifasida ishlatiladi).
function GroupRow({ group, language, onChanged, onNotice, showTeacher = false }) {
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      if (group.joined) await api.del(`/groups/${group.id}/join`)
      else await api.post(`/groups/${group.id}/join`)
      onNotice(t(language, group.joined ? 'Guruhdan chiqdingiz.' : 'Guruhga muvaffaqiyatli qo‘shildingiz.'))
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
      <button type="button" className={`ui-btn ui-btn-sm ${group.joined ? 'ui-btn-danger' : 'ui-btn-primary'}`} disabled={busy || (!group.joined && group.full)} onClick={toggle}>
        {t(language, group.joined ? 'Chiqish' : group.full ? 'To‘lgan' : 'Qo‘shilish')}
      </button>
    </div>
  )
}

export default GroupRow
