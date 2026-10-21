import { useEffect, useMemo, useState } from 'react'
import { FiAward, FiBookOpen, FiCalendar, FiCheck, FiClipboard, FiPlus, FiSearch, FiStar, FiTrash2, FiUserPlus, FiUsers, FiX } from 'react-icons/fi'
import { api, queryString } from '../api.js'
import { Avatar, daysText, Dialog, Empty, ErrorBox, formatDate, Loading } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import SubjectBackdrop from '../student/SubjectBackdrop.jsx'
import { useApi } from '../useApi.js'
import { Card, localDateKey, StatCard } from './parts.jsx'

function Overview({ language, onGo }) {
  const { data, error, loading, reload } = useApi('/teacher/overview')
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  return (
    <>
      {data.pendingRequests > 0 && (
        <div className="role-callout"><FiUserPlus aria-hidden="true" /><span>{data.pendingRequests} {t(language, 'ta o‘quvchi guruhingizga qo‘shilishni so‘ramoqda.')}</span><button type="button" className="ui-btn ui-btn-sm ui-btn-primary" onClick={() => onGo('requests')}>{t(language, 'Ko‘rib chiqish')}</button></div>
      )}
      <section className="role-stats">
        <StatCard label={t(language, 'Guruhlarim')} value={data.groupCount} hint={t(language, 'Biriktirilgan faol guruhlar')} icon={FiBookOpen} accent="#40c6d5" />
        <StatCard label={t(language, 'O‘quvchilar')} value={data.studentCount} hint={t(language, 'Guruhlardagi jami o‘quvchi')} icon={FiUsers} accent="#9272ff" />
        <StatCard label={t(language, 'Davomat')} value={`${data.attendancePercent}%`} hint={t(language, 'Kelgan darslar ulushi')} icon={FiCalendar} accent="#56c995" />
        <StatCard label={t(language, 'O‘rtacha ball')} value={data.averageScore} hint={`${data.assessmentCount} ${t(language, 'ta baho · maks. 30')}`} icon={FiClipboard} accent="#e7ad5a" />
        <StatCard label={t(language, 'Mening reytingim')} value={data.rating ? data.rating.toFixed(1) : '—'} hint={`${data.reviewCount} ${t(language, 'ta baho')}`} icon={FiStar} accent="#ea8398" />
      </section>
      <Card title={t(language, 'Bugungi darslar')} subtitle={t(language, 'Bugun dars o‘tadigan guruhlaringiz')} icon={FiCalendar}>
        {data.todayGroups.length ? (
          <div className="role-today">
            {data.todayGroups.map((group) => (
              <div key={group.id}><strong>{group.lessonTime}</strong><span><b>{t(language, group.subject)}</b><small>{group.name}</small></span>{group.memberCount ? <button type="button" className="ui-btn ui-btn-sm ui-btn-primary" onClick={() => onGo('grading')}>{t(language, 'Davomat olish')}</button> : <small>{t(language, 'O‘quvchi yo‘q')}</small>}</div>
            ))}
          </div>
        ) : <Empty title={t(language, 'Bugun dars yo‘q')} detail={t(language, 'Dars kunlari guruh sozlamalarida belgilanadi.')} />}
      </Card>
    </>
  )
}

function Requests({ language, onNotice }) {
  const { data, error, loading, reload } = useApi('/teacher/join-requests')
  const [busyId, setBusyId] = useState(null)

  async function decide(request, decision) {
    setBusyId(request.id)
    try {
      await api.post(`/teacher/join-requests/${request.id}/${decision}`)
      onNotice(t(language, decision === 'approve' ? 'O‘quvchi guruhga qabul qilindi.' : 'So‘rov rad etildi.'))
      reload()
    } catch (err) {
      onNotice(t(language, err.message), true)
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  return (
    <Card title={t(language, 'Qo‘shilish so‘rovlari')} subtitle={t(language, 'O‘quvchi sizning tasdig‘ingizdan keyingina guruhga qo‘shiladi.')} icon={FiUserPlus}>
      {data.requests.length ? (
        <div className="request-list">
          {data.requests.map((request) => (
            <article key={request.id} className="request-row" style={{ '--subject-accent': request.group.color }}>
              <Avatar name={request.student.fullName} color={request.student.avatarColor} size={44} />
              <span className="request-body">
                <strong>{request.student.fullName}</strong>
                <small>{request.student.email || request.student.phone}{request.student.grade ? ` · ${t(language, request.student.grade)}` : ''}</small>
                <small className="request-group"><i />{t(language, request.group.subject)} · {request.group.name} · {request.group.memberCount}/{request.group.capacity}</small>
              </span>
              <span className="request-actions">
                <button type="button" className="ui-btn ui-btn-sm ui-btn-success" disabled={busyId === request.id} onClick={() => decide(request, 'approve')}><FiCheck aria-hidden="true" /> {t(language, 'Qabul qilish')}</button>
                <button type="button" className="ui-btn ui-btn-sm ui-btn-danger" disabled={busyId === request.id} onClick={() => decide(request, 'reject')}><FiX aria-hidden="true" /> {t(language, 'Rad etish')}</button>
              </span>
            </article>
          ))}
        </div>
      ) : <Empty title={t(language, 'Yangi so‘rov yo‘q')} detail={t(language, 'O‘quvchilar guruhingizga qo‘shilishni so‘rasa, shu yerda ko‘rinadi.')} />}
    </Card>
  )
}

function GroupDetail({ id, language, onBack, onNotice }) {
  const { data, error, loading, reload } = useApi(`/teacher/groups/${id}`)
  const [identifier, setIdentifier] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(null)

  async function addStudent(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post(`/teacher/groups/${id}/students`, { identifier })
      setIdentifier('')
      onNotice(t(language, 'O‘quvchi guruhga qo‘shildi.'))
      reload()
    } catch (err) {
      onNotice(t(language, err.message), true)
    } finally {
      setBusy(false)
    }
  }

  async function removeStudent() {
    try {
      await api.del(`/teacher/groups/${id}/students/${removing.id}`)
      onNotice(t(language, 'O‘quvchi guruhdan chiqarildi.'))
      setRemoving(null)
      reload()
    } catch (err) {
      onNotice(t(language, err.message), true)
    }
  }

  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  return (
    <div className="role-stack">
      <button type="button" className="role-back" onClick={onBack}>← {t(language, 'Guruhlarim')}</button>
      <Card title={data.group.name} subtitle={`${t(language, data.group.subject)} · ${data.group.lessonTime} · ${daysText(language, data.group.daysOfWeek)}`} icon={FiUsers}>
        <form className="role-inline-form" onSubmit={addStudent}>
          <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={t(language, 'O‘quvchi emaili yoki telefoni')} aria-label={t(language, 'O‘quvchi emaili yoki telefoni')} required />
          <button type="submit" className="ui-btn ui-btn-primary" disabled={busy}><FiPlus aria-hidden="true" /> {t(language, 'O‘quvchi qo‘shish')}</button>
        </form>
        {data.students.length ? (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead><tr><th>#</th><th>{t(language, 'O‘quvchi')}</th><th>{t(language, 'Sinf')}</th><th className="num">{t(language, 'Kelgan')}</th><th className="num">{t(language, 'Ball')}</th><th /></tr></thead>
              <tbody>
                {[...data.students].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).map((student) => (
                  <tr key={student.id}>
                    <td>{student.rank ? String(student.rank).padStart(2, '0') : '—'}</td>
                    <td><span className="ui-person"><Avatar name={student.fullName} color={student.avatarColor} size={34} /><span><strong>{student.fullName}</strong><small>{student.email || student.phone}</small></span></span></td>
                    <td>{student.grade ? t(language, student.grade) : '—'}</td>
                    <td className="num">{student.presentCount}</td>
                    <td className="num"><strong>{student.points}</strong></td>
                    <td className="num"><button type="button" className="ui-btn ui-btn-sm ui-btn-danger" aria-label={t(language, 'Guruhdan chiqarish')} onClick={() => setRemoving(student)}><FiTrash2 aria-hidden="true" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title={t(language, 'Guruhda o‘quvchi yo‘q')} detail={t(language, 'Yuqoridagi forma orqali o‘quvchi qo‘shing yoki o‘quvchilar o‘zlari qo‘shilishadi.')} />}
      </Card>
      {removing && (
        <Dialog title={t(language, 'O‘quvchini chiqarasizmi?')} subtitle={`${removing.fullName} — ${data.group.name}`} onClose={() => setRemoving(null)} actions={<><button type="button" className="ui-btn" onClick={() => setRemoving(null)}>{t(language, 'Bekor qilish')}</button><button type="button" className="ui-btn ui-btn-danger" onClick={removeStudent}>{t(language, 'Chiqarish')}</button></>} />
      )}
    </div>
  )
}

function Groups({ language, onNotice }) {
  const { data, error, loading, reload } = useApi('/teacher/groups')
  const [selected, setSelected] = useState(null)
  if (selected) return <GroupDetail id={selected} language={language} onBack={() => setSelected(null)} onNotice={onNotice} />
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  if (!data.groups.length) return <Card title={t(language, 'Guruhlarim')}><Empty title={t(language, 'Hali guruh biriktirilmagan')} detail={t(language, 'Administrator sizga guruh biriktirgach, shu yerda ko‘rinadi.')} /></Card>
  return (
    <section className="role-group-grid">
      {data.groups.map((group) => (
        <button type="button" key={group.id} className="role-card role-group-card role-clickable" style={{ '--subject-accent': group.subject.color }} onClick={() => setSelected(group.id)}>
          <SubjectBackdrop subject={{ ...group.subject, symbols: [group.subject.name, group.lessonTime, 'UstozTop'] }} compact />
          <div><span className="role-group-icon" style={{ '--role-accent': group.subject.color }}>{group.subject.icon}</span><span className="role-status">{group.memberCount}/{group.capacity} {t(language, 'o‘quvchi')}</span></div>
          <h2>{group.name}</h2>
          <p>{t(language, group.subject.name)}</p>
          <div className="role-group-footer"><span>{group.lessonTime}</span><span>{daysText(language, group.daysOfWeek)}</span></div>
        </button>
      ))}
    </section>
  )
}

function Students({ language }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [openId, setOpenId] = useState(null)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 300)
    return () => window.clearTimeout(timer)
  }, [query])
  const { data, error, loading, reload } = useApi(`/teacher/students${queryString({ query: debounced })}`)
  const detail = useApi(openId ? `/teacher/students/${openId}` : null)

  return (
    <Card title={t(language, 'O‘quvchilar ro‘yxati')} subtitle={t(language, 'Faqat sizga biriktirilgan guruhlar')} icon={FiUsers}>
      <div className="ui-toolbar"><label className="ui-search"><FiSearch aria-hidden="true" /><input aria-label={t(language, 'Qidirish')} placeholder={t(language, 'Ism yoki email...')} value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      {loading && !data ? <Loading language={language} /> : error ? <ErrorBox error={error} onRetry={reload} language={language} /> : data.students.length ? (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead><tr><th>{t(language, 'O‘quvchi')}</th><th>{t(language, 'Guruh')}</th><th>{t(language, 'Dars vaqti')}</th></tr></thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.key}>
                  <td><button type="button" className="ui-person ui-linkish" onClick={() => setOpenId(student.id)}><Avatar name={student.fullName} size={34} /><span><strong>{student.fullName}</strong><small>{student.email || student.phone}</small></span></button></td>
                  <td>{student.group}</td>
                  <td>{student.lessonTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title={t(language, 'O‘quvchilar topilmadi')} />}
      {openId && (
        <Dialog wide title={detail.data?.student.fullName || '...'} subtitle={detail.data ? `${detail.data.student.email || detail.data.student.phone || ''} · ${t(language, 'Davomat')}: ${detail.data.attendance.present}/${detail.data.attendance.total}` : ''} onClose={() => setOpenId(null)} actions={<button type="button" className="ui-btn" onClick={() => setOpenId(null)}>{t(language, 'Yopish')}</button>}>
          {detail.loading && !detail.data ? <Loading language={language} /> : detail.error ? <ErrorBox error={detail.error} language={language} /> : detail.data.assessments.length ? (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead><tr><th>{t(language, 'Sana')}</th><th>{t(language, 'Fan')}</th><th className="num">{t(language, 'Qatn.')}</th><th className="num">{t(language, 'Faol.')}</th><th className="num">{t(language, 'Topsh.')}</th><th className="num">{t(language, 'Jami')}</th></tr></thead>
                <tbody>{detail.data.assessments.map((item) => <tr key={item.id}><td>{formatDate(item.date, language)}</td><td>{t(language, item.subject)}</td><td className="num">{item.attendanceScore}</td><td className="num">{item.activityScore}</td><td className="num">{item.homeworkScore}</td><td className="num"><strong>{item.total}</strong></td></tr>)}</tbody>
              </table>
            </div>
          ) : <Empty title={t(language, 'Hali baho qo‘yilmagan')} />}
        </Dialog>
      )}
    </Card>
  )
}

function Grading({ language, onNotice }) {
  const groups = useApi('/teacher/groups')
  const [groupId, setGroupId] = useState('')
  const [date, setDate] = useState(() => localDateKey())
  const activeGroupId = groupId || (groups.data?.groups.find((group) => group.memberCount > 0) ?? groups.data?.groups[0])?.id || ''
  const roster = useApi(activeGroupId ? `/teacher/groups/${activeGroupId}` : null)
  const attendance = useApi(activeGroupId ? `/teacher/groups/${activeGroupId}/attendance?date=${date}` : null)
  const assessments = useApi(activeGroupId ? `/teacher/groups/${activeGroupId}/assessments?date=${date}` : null)
  const [rows, setRows] = useState({})
  const [saving, setSaving] = useState(false)

  const students = useMemo(() => roster.data?.students ?? [], [roster.data])

  // Server ma'lumotlari kelganda jadval qatorlarini to'ldirish
  useEffect(() => {
    if (!roster.data || !attendance.data || !assessments.data) return
    const present = new Map(attendance.data.records.map((item) => [item.studentId, item.present]))
    const scored = new Map(assessments.data.items.map((item) => [item.studentId, item]))
    setRows(Object.fromEntries(students.map((student) => {
      const saved = scored.get(student.id)
      return [student.id, { present: present.get(student.id) ?? true, activityScore: saved?.activityScore ?? 0, homeworkScore: saved?.homeworkScore ?? 0, note: saved?.note ?? '' }]
    })))
  }, [roster.data, attendance.data, assessments.data, students])

  const update = (studentId, patch) => setRows((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }))
  const clamp = (value) => {
    const number = Number.parseInt(value, 10)
    if (Number.isNaN(number)) return 0
    if (number < 0 || number > 10) onNotice(t(language, 'Ball 0 dan 10 gacha bo‘lishi kerak.'), true)
    return Math.max(0, Math.min(10, number))
  }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/teacher/groups/${activeGroupId}/attendance`, { date, records: students.map((student) => ({ studentId: student.id, present: rows[student.id].present })) })
      await api.put(`/teacher/groups/${activeGroupId}/assessments`, { date, items: students.map((student) => ({ studentId: student.id, activityScore: rows[student.id].activityScore, homeworkScore: rows[student.id].homeworkScore, note: rows[student.id].note || undefined })) })
      onNotice(t(language, 'Davomat va ballar saqlandi. Reyting yangilandi.'))
    } catch (error) {
      onNotice(t(language, error.message), true)
    } finally {
      setSaving(false)
    }
  }

  if (groups.loading && !groups.data) return <Loading language={language} />
  if (groups.error) return <ErrorBox error={groups.error} onRetry={groups.reload} language={language} />
  if (!groups.data.groups.length) return <Card title={t(language, 'Davomat va ballar')}><Empty title={t(language, 'Hali guruh biriktirilmagan')} /></Card>

  return (
    <Card title={t(language, 'Davomat va baholash')} subtitle={t(language, 'Qatnashish: keldi = 10 ball. Faollik va topshiriq — har biri 0 dan 10 gacha.')} icon={FiClipboard}>
      <div className="ui-toolbar">
        <select className="ui-select" aria-label={t(language, 'Guruh')} value={activeGroupId} onChange={(event) => setGroupId(event.target.value)}>
          {groups.data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        <input type="date" className="ui-select" aria-label={t(language, 'Sana')} value={date} max={localDateKey()} onChange={(event) => setDate(event.target.value || localDateKey())} />
        <button type="button" className="ui-btn ui-btn-primary" disabled={saving || !students.length} onClick={save}><FiCheck aria-hidden="true" /> {t(language, saving ? 'Saqlanmoqda...' : 'Saqlash')}</button>
      </div>
      {roster.loading && !roster.data ? <Loading language={language} /> : !students.length ? <Empty title={t(language, 'Guruhda o‘quvchi yo‘q')} /> : (
        <div className="ui-table-wrap">
          <table className="ui-table grade-table">
            <thead><tr><th>{t(language, 'O‘quvchi')}</th><th>{t(language, 'Keldi')}</th><th>{t(language, 'Faollik (0–10)')}</th><th>{t(language, 'Topshiriq (0–10)')}</th><th>{t(language, 'Izoh')}</th><th className="num">{t(language, 'Jami / 30')}</th></tr></thead>
            <tbody>
              {students.map((student) => {
                const row = rows[student.id]
                if (!row) return null
                const total = row.present ? 10 + row.activityScore + row.homeworkScore : row.homeworkScore
                return (
                  <tr key={student.id}>
                    <td><span className="ui-person"><Avatar name={student.fullName} color={student.avatarColor} size={32} /><strong>{student.fullName}</strong></span></td>
                    <td>
                      <span className="att-toggle" role="group" aria-label={`${student.fullName}: ${t(language, 'Davomat')}`}>
                        <button type="button" className={`att-btn att-yes${row.present ? ' on' : ''}`} aria-pressed={row.present} title={t(language, 'Keldi')} aria-label={`${student.fullName}: ${t(language, 'Keldi')}`} onClick={() => update(student.id, { present: true })}><FiCheck aria-hidden="true" /></button>
                        <button type="button" className={`att-btn att-no${!row.present ? ' on' : ''}`} aria-pressed={!row.present} title={t(language, 'Kelmadi')} aria-label={`${student.fullName}: ${t(language, 'Kelmadi')}`} onClick={() => update(student.id, { present: false, activityScore: 0 })}><FiX aria-hidden="true" /></button>
                      </span>
                    </td>
                    <td><input className="score-input" type="number" min="0" max="10" value={row.present ? row.activityScore : 0} disabled={!row.present} title={row.present ? undefined : t(language, 'Kelmagan o‘quvchiga faollik bali qo‘yilmaydi')} onChange={(event) => update(student.id, { activityScore: clamp(event.target.value) })} aria-label={`${student.fullName}: ${t(language, 'Faollik')}`} /></td>
                    <td><input className="score-input" type="number" min="0" max="10" value={row.homeworkScore} onChange={(event) => update(student.id, { homeworkScore: clamp(event.target.value) })} aria-label={`${student.fullName}: ${t(language, 'Topshiriq')}`} /></td>
                    <td><input className="note-input" value={row.note} maxLength={300} onChange={(event) => update(student.id, { note: event.target.value })} aria-label={`${student.fullName}: ${t(language, 'Izoh')}`} /></td>
                    <td className="num"><strong>{total}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function Ratings({ language }) {
  const { data, error, loading, reload } = useApi('/teacher/ratings')
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  if (!data.boards.length) return <Card title={t(language, 'Reyting')}><Empty title={t(language, 'Hali guruh biriktirilmagan')} /></Card>
  return (
    <div className="role-stack">
      {data.boards.map((board) => (
        <Card key={board.groupId} title={board.group} subtitle={t(language, board.subject)} icon={FiAward}>
          {board.students.length ? (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead><tr><th>#</th><th>{t(language, 'O‘quvchi')}</th><th className="num">{t(language, 'Kelgan')}</th><th className="num">{t(language, 'Ball')}</th></tr></thead>
                <tbody>{board.students.map((student) => <tr key={student.id}><td>{String(student.rank).padStart(2, '0')}</td><td><span className="ui-person"><Avatar name={student.name} size={32} /><strong>{student.name}</strong></span></td><td className="num">{student.presentCount}</td><td className="num"><strong>{student.points}</strong></td></tr>)}</tbody>
              </table>
            </div>
          ) : <Empty title={t(language, 'Guruhda o‘quvchi yo‘q')} />}
        </Card>
      ))}
    </div>
  )
}

function TeacherPages({ page, language, onNotice, onGo }) {
  if (page === 'requests') return <Requests language={language} onNotice={onNotice} />
  if (page === 'groups') return <Groups language={language} onNotice={onNotice} />
  if (page === 'students') return <Students language={language} />
  if (page === 'grading') return <Grading language={language} onNotice={onNotice} />
  if (page === 'ratings') return <Ratings language={language} />
  return <Overview language={language} onGo={onGo} />
}

export default TeacherPages
