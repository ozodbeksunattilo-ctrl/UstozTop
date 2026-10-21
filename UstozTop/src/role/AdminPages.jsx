import { useEffect, useState } from 'react'
import { FiActivity, FiAward, FiBookOpen, FiCalendar, FiEdit2, FiLayers, FiPlus, FiSearch, FiShield, FiUserCheck, FiUsers } from 'react-icons/fi'
import { api, queryString } from '../api.js'
import { Avatar, DAY_ORDER, dayLabel, daysText, Dialog, Empty, ErrorBox, formatDate, Loading, Stars } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { useApi } from '../useApi.js'
import { Card, StatCard } from './parts.jsx'

const ROLE_LABEL = { STUDENT: 'O‘quvchi', TEACHER: 'Ustoz', ADMIN: 'Administrator' }
const STATUS = {
  ACTIVE: ['Faol', 'ui-chip-success'],
  PENDING: ['Tasdiq kutilmoqda', 'ui-chip-warn'],
  REJECTED: ['Rad etilgan', 'ui-chip-muted'],
  BLOCKED: ['Bloklangan', 'ui-chip-danger'],
}

const useDebounced = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function StatusChip({ status, language }) {
  const [label, className] = STATUS[status]
  return <span className={`ui-chip ${className}`}>{t(language, label)}</span>
}

// Xavfli amallar (tasdiqlash, rad etish, bloklash) uchun tasdiqlash oynasi.
function useStatusAction(language, onNotice, reload) {
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const titles = { ACTIVE: 'Akkauntni faollashtirasizmi?', REJECTED: 'So‘rovni rad etasizmi?', BLOCKED: 'Akkauntni bloklaysizmi?' }

  async function confirm() {
    setBusy(true)
    try {
      await api.patch(`/admin/users/${pending.user.id}/status`, { status: pending.status, confirm: true })
      onNotice(t(language, 'Amal bajarildi va audit jurnaliga yozildi.'))
      setPending(null)
      reload()
    } catch (error) {
      onNotice(t(language, error.message), true)
    } finally {
      setBusy(false)
    }
  }

  const dialog = pending && (
    <Dialog
      title={t(language, titles[pending.status])}
      subtitle={`${pending.user.fullName} · ${pending.user.email || pending.user.phone}`}
      onClose={() => setPending(null)}
      actions={<><button type="button" className="ui-btn" onClick={() => setPending(null)}>{t(language, 'Bekor qilish')}</button><button type="button" className={`ui-btn ${pending.status === 'ACTIVE' ? 'ui-btn-success' : 'ui-btn-danger'}`} disabled={busy} onClick={confirm}>{t(language, 'Tasdiqlash')}</button></>}
    >
      <p>{t(language, 'Bu amal audit jurnaliga yoziladi.')}</p>
    </Dialog>
  )
  return { ask: (user, status) => setPending({ user, status }), dialog }
}

function UserActions({ user, language, ask }) {
  if (user.role === 'ADMIN') return null
  return (
    <span className="role-actions">
      {user.status === 'PENDING' && <button type="button" className="ui-btn ui-btn-sm ui-btn-success" onClick={() => ask(user, 'ACTIVE')}>{t(language, 'Tasdiqlash')}</button>}
      {user.status === 'PENDING' && <button type="button" className="ui-btn ui-btn-sm ui-btn-danger" onClick={() => ask(user, 'REJECTED')}>{t(language, 'Rad etish')}</button>}
      {user.status === 'ACTIVE' && <button type="button" className="ui-btn ui-btn-sm ui-btn-danger" onClick={() => ask(user, 'BLOCKED')}>{t(language, 'Bloklash')}</button>}
      {(user.status === 'BLOCKED' || user.status === 'REJECTED') && <button type="button" className="ui-btn ui-btn-sm ui-btn-success" onClick={() => ask(user, 'ACTIVE')}>{t(language, 'Faollashtirish')}</button>}
    </span>
  )
}

function Overview({ language, onGo }) {
  const { data, error, loading, reload } = useApi('/admin/stats')
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  const max = Math.max(1, ...data.registrationsPerDay.map((day) => day.count))
  return (
    <>
      <section className="role-stats">
        <StatCard label={t(language, 'O‘quvchilar')} value={data.students} hint={t(language, 'Ro‘yxatdan o‘tgan o‘quvchilar')} icon={FiUsers} accent="#9272ff" />
        <StatCard label={t(language, 'Ustozlar')} value={data.teachers} hint={`${data.pendingTeachers} ${t(language, 'ta tasdiq kutmoqda')}`} icon={FiUserCheck} accent="#40c6d5" />
        <StatCard label={t(language, 'Fanlar')} value={data.subjects} hint={t(language, 'Faol fanlar')} icon={FiBookOpen} accent="#56c995" />
        <StatCard label={t(language, 'Guruhlar')} value={data.groups} hint={t(language, 'Faol guruhlar')} icon={FiLayers} accent="#e7ad5a" />
        <StatCard label={t(language, 'Davomat')} value={`${data.attendancePercent}%`} hint={`${data.assessments} ${t(language, 'ta baho')}`} icon={FiCalendar} accent="#ea8398" />
      </section>
      {data.pendingTeachers > 0 && (
        <div className="role-callout"><FiShield aria-hidden="true" /><span>{data.pendingTeachers} {t(language, 'ta ustoz so‘rovi tasdiqlashni kutmoqda.')}</span><button type="button" className="ui-btn ui-btn-sm ui-btn-primary" onClick={() => onGo('teachers')}>{t(language, 'Ko‘rib chiqish')}</button></div>
      )}
      <div className="role-overview-grid">
        <Card title={t(language, 'Ro‘yxatdan o‘tishlar')} subtitle={t(language, 'Oxirgi 7 kun')} icon={FiActivity}>
          <div className="role-chart" aria-label={t(language, 'Ro‘yxatdan o‘tishlar diagrammasi')}>
            {data.registrationsPerDay.map((day) => <span key={day.date} style={{ height: `${Math.max(6, (day.count / max) * 100)}%` }} title={`${day.date}: ${day.count}`}><i /></span>)}
          </div>
          <div className="role-chart-labels">{data.registrationsPerDay.map((day) => <span key={day.date}>{day.date.slice(5)}</span>)}</div>
        </Card>
        <Card title={t(language, 'So‘nggi foydalanuvchilar')} subtitle={t(language, 'Yangi ro‘yxatdan o‘tganlar')} icon={FiUsers}>
          {data.recentUsers.map((user) => (
            <div className="role-recent" key={user.id}><Avatar name={`${user.firstName} ${user.lastName}`} size={34} /><span><strong>{user.firstName} {user.lastName}</strong><small>{t(language, ROLE_LABEL[user.role])}</small></span><StatusChip status={user.status} language={language} /></div>
          ))}
        </Card>
      </div>
    </>
  )
}

function Users({ language, onNotice, fixedRole }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState(fixedRole || '')
  const [status, setStatus] = useState('')
  const debounced = useDebounced(query)
  const { data, error, loading, reload } = useApi(`/admin/users${queryString({ query: debounced, role: fixedRole || role, status })}`)
  const action = useStatusAction(language, onNotice, reload)

  return (
    <Card title={t(language, fixedRole ? 'Ustozlar' : 'Barcha foydalanuvchilar')} subtitle={data ? `${data.users.length} ${t(language, 'ta akkaunt')}` : ''} icon={FiUsers}>
      <div className="ui-toolbar">
        <label className="ui-search"><FiSearch aria-hidden="true" /><input aria-label={t(language, 'Qidirish')} placeholder={t(language, 'Ism, email yoki telefon...')} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        {!fixedRole && (
          <select className="ui-select" aria-label={t(language, 'Rol')} value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">{t(language, 'Barcha rollar')}</option>
            {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{t(language, label)}</option>)}
          </select>
        )}
        <select className="ui-select" aria-label={t(language, 'Holat')} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t(language, 'Barcha holatlar')}</option>
          {Object.entries(STATUS).map(([value, [label]]) => <option key={value} value={value}>{t(language, label)}</option>)}
        </select>
      </div>
      {loading && !data ? <Loading language={language} /> : error ? <ErrorBox error={error} onRetry={reload} language={language} /> : data.users.length ? (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead><tr><th>{t(language, 'Foydalanuvchi')}</th><th>{t(language, 'Email / telefon')}</th><th>{t(language, 'Rol')}</th><th>{t(language, 'Holat')}</th><th>{t(language, 'Sana')}</th><th /></tr></thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id}>
                  <td><span className="ui-person"><Avatar name={user.fullName} size={34} /><strong>{user.fullName}</strong></span></td>
                  <td>{user.email || user.phone}</td>
                  <td>{t(language, ROLE_LABEL[user.role])}</td>
                  <td><StatusChip status={user.status} language={language} /></td>
                  <td>{formatDate(user.createdAt, language)}</td>
                  <td className="num"><UserActions user={user} language={language} ask={action.ask} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title={t(language, 'Foydalanuvchi topilmadi')} />}
      {action.dialog}
    </Card>
  )
}

// Parol: kamida bitta harf va raqam, 10 ta belgi (o'xshash belgilar chiqarib tashlangan).
function makePassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'
  const digits = '23456789'
  const pool = letters + digits
  const bytes = crypto.getRandomValues(new Uint32Array(10))
  const source = (index) => (index === 0 ? letters : index === 1 ? digits : pool)
  return Array.from(bytes, (value, index) => source(index)[value % source(index).length]).join('')
}

function TeacherDialog({ teacher, subjects, language, onClose, onSaved, onNotice }) {
  const editing = Boolean(teacher)
  const [form, setForm] = useState({
    firstName: teacher?.firstName ?? '',
    lastName: teacher?.lastName ?? '',
    identifier: teacher?.email || teacher?.phone || '',
    password: '',
    qualification: teacher?.qualification ?? '',
    experienceYears: teacher ? String(teacher.experienceYears) : '',
    subjectIds: teacher?.subjects.map((subject) => subject.id) ?? [],
  })
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const toggleSubject = (id) => setForm((current) => ({ ...current, subjectIds: current.subjectIds.includes(id) ? current.subjectIds.filter((item) => item !== id) : [...current.subjectIds, id] }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const common = { qualification: form.qualification || undefined, experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined, subjectIds: form.subjectIds }
      if (editing) {
        await api.patch(`/admin/teachers/${teacher.id}`, { firstName: form.firstName, lastName: form.lastName, ...common, password: form.password || undefined })
        onNotice(t(language, form.password ? 'Ma’lumotlar va yangi parol saqlandi.' : 'Ustoz ma’lumotlari saqlandi.'))
        onSaved()
        if (form.password) setCreated({ identifier: form.identifier, password: form.password, name: `${form.firstName} ${form.lastName}` })
        else onClose()
      } else {
        await api.post('/admin/teachers', { firstName: form.firstName, lastName: form.lastName, identifier: form.identifier, password: form.password, ...common })
        onNotice(t(language, 'Ustoz akkaunti yaratildi.'))
        onSaved()
        setCreated({ identifier: form.identifier, password: form.password, name: `${form.firstName} ${form.lastName}` })
      }
    } catch (error) {
      onNotice(t(language, error.message), true)
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    const text = `UstozTop\nLogin: ${created.identifier}\nParol: ${created.password}`
    return (
      <Dialog title={t(language, 'Kirish ma’lumotlari tayyor')} subtitle={created.name} onClose={onClose} actions={<>
        <button type="button" className="ui-btn" onClick={() => navigator.clipboard?.writeText(text).then(() => onNotice(t(language, 'Nusxalandi.')))}>{t(language, 'Nusxalash')}</button>
        <button type="button" className="ui-btn ui-btn-primary" onClick={onClose}>{t(language, 'Tayyor')}</button>
      </>}>
        <div className="teacher-credentials">
          <div><small>{t(language, 'Login')}</small><strong>{created.identifier}</strong></div>
          <div><small>{t(language, 'Parol')}</small><strong>{created.password}</strong></div>
        </div>
        <p>{t(language, 'Shu ma’lumotlarni ustozga yetkazing. Parol keyinroq ko‘rsatilmaydi — kerak bo‘lsa yangisini o‘rnatasiz.')}</p>
      </Dialog>
    )
  }

  return (
    <Dialog wide title={t(language, editing ? 'Ustozni tahrirlash' : 'Ustoz qo‘shish')} subtitle={t(language, editing ? 'Fanlar va ma’lumotlarni yangilang, kerak bo‘lsa yangi parol bering.' : 'Login va parolni siz berasiz — ustoz shular bilan kiradi.')} onClose={onClose}>
      <form className="ui-form" onSubmit={submit}>
        <div className="ui-form-row">
          <label>{t(language, 'Ism')}<input value={form.firstName} onChange={set('firstName')} required minLength={2} /></label>
          <label>{t(language, 'Familiya')}<input value={form.lastName} onChange={set('lastName')} required minLength={2} /></label>
        </div>
        <label>{t(language, 'Login (email yoki telefon)')}<input value={form.identifier} onChange={set('identifier')} required readOnly={editing} /></label>
        <label>{t(language, editing ? 'Yangi parol (o‘zgartirmasangiz bo‘sh qoldiring)' : 'Parol')}
          <span className="teacher-password">
            <input type="text" autoComplete="new-password" value={form.password} onChange={set('password')} required={!editing} minLength={8} placeholder={t(language, 'Kamida 8 ta belgi, harf va raqam')} />
            <button type="button" className="ui-btn ui-btn-sm" onClick={() => setForm((current) => ({ ...current, password: makePassword() }))}>{t(language, 'Yaratish')}</button>
          </span>
        </label>
        <div className="ui-form-row">
          <label>{t(language, 'Malaka')}<input value={form.qualification} onChange={set('qualification')} /></label>
          <label>{t(language, 'Tajriba (yil)')}<input type="number" min="0" max="70" value={form.experienceYears} onChange={set('experienceYears')} /></label>
        </div>
        <div className="teacher-subjects-field">
          <span>{t(language, 'Qaysi fanlardan dars beradi')}</span>
          <div className="teacher-subject-picks">
            {subjects.map((subject) => (
              <button type="button" key={subject.id} className={form.subjectIds.includes(subject.id) ? 'is-on' : ''} style={{ '--tile': subject.color }} onClick={() => toggleSubject(subject.id)} aria-pressed={form.subjectIds.includes(subject.id)}>
                <i>{subject.icon}</i>{t(language, subject.name)}
              </button>
            ))}
          </div>
        </div>
        <div className="ui-dialog-actions"><button type="button" className="ui-btn" onClick={onClose}>{t(language, 'Bekor qilish')}</button><button type="submit" className="ui-btn ui-btn-primary" disabled={busy}>{t(language, editing ? 'Saqlash' : 'Ustozni qo‘shish')}</button></div>
      </form>
    </Dialog>
  )
}

function Teachers({ language, onNotice }) {
  const { data, error, loading, reload } = useApi('/admin/teachers')
  const subjects = useApi('/admin/subjects')
  const [dialog, setDialog] = useState(null)
  const action = useStatusAction(language, onNotice, reload)

  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  return (
    <Card title={t(language, 'Ustozlar')} subtitle={`${data.teachers.length} ${t(language, 'ta ustoz')} · ${t(language, 'hisobni faqat administrator yaratadi')}`} icon={FiUserCheck}
      action={<button type="button" className="ui-btn ui-btn-primary ui-btn-sm" disabled={!subjects.data} onClick={() => setDialog({})}><FiPlus aria-hidden="true" /> {t(language, 'Ustoz qo‘shish')}</button>}>
      {data.teachers.length ? (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead><tr><th>{t(language, 'Ustoz')}</th><th>{t(language, 'Login')}</th><th>{t(language, 'Fanlari')}</th><th className="num">{t(language, 'Guruh')}</th><th>{t(language, 'Holat')}</th><th /></tr></thead>
            <tbody>
              {data.teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td><span className="ui-person"><Avatar name={teacher.fullName} size={36} /><span><strong>{teacher.fullName}</strong><small>{teacher.qualification || '—'}</small></span></span></td>
                  <td>{teacher.email || teacher.phone}</td>
                  <td>{teacher.subjects.length ? <span className="teacher-chips">{teacher.subjects.map((subject) => <span key={subject.id} style={{ '--tile': subject.color }}>{subject.icon} {t(language, subject.name)}</span>)}</span> : <small>{t(language, 'Fan biriktirilmagan')}</small>}</td>
                  <td className="num">{teacher.groupCount}</td>
                  <td><StatusChip status={teacher.status} language={language} /></td>
                  <td className="num">
                    <span className="role-actions">
                      <button type="button" className="ui-btn ui-btn-sm" aria-label={t(language, 'Tahrirlash')} onClick={() => setDialog(teacher)}><FiEdit2 aria-hidden="true" /></button>
                      <UserActions user={{ ...teacher, role: 'TEACHER' }} language={language} ask={action.ask} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title={t(language, 'Hali ustoz qo‘shilmagan')} detail={t(language, 'Ustoz qo‘shing: login, parol va fanlarni belgilang.')} />}
      {dialog && subjects.data && <TeacherDialog teacher={dialog.id ? dialog : null} subjects={subjects.data.subjects.filter((subject) => subject.active)} language={language} onClose={() => setDialog(null)} onSaved={reload} onNotice={onNotice} />}
      {action.dialog}
    </Card>
  )
}

function SubjectDialog({ subject, language, onClose, onSaved, onNotice }) {
  const [form, setForm] = useState({ name: subject?.name ?? '', category: subject?.category ?? 'Aniq fanlar', icon: subject?.icon ?? '✦', color: subject?.color ?? '#8b6cff', totalLessons: subject?.totalLessons ?? 24, description: subject?.description ?? '', topics: (subject?.topics ?? []).join(', ') })
  const [busy, setBusy] = useState(false)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const body = { name: form.name, description: form.description, category: form.category, icon: form.icon, color: form.color, totalLessons: Number(form.totalLessons), topics: form.topics.split(',').map((item) => item.trim()).filter(Boolean) }
    try {
      if (subject) await api.patch(`/admin/subjects/${subject.id}`, body)
      else await api.post('/admin/subjects', body)
      onNotice(t(language, 'Fan saqlandi.'))
      onSaved()
      onClose()
    } catch (error) {
      onNotice(t(language, error.message), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog title={t(language, subject ? 'Fanni tahrirlash' : 'Fan qo‘shish')} onClose={onClose}>
      <form className="ui-form" onSubmit={submit}>
        <label>{t(language, 'Fan nomi')}<input value={form.name} onChange={set('name')} required minLength={2} /></label>
        <div className="ui-form-row">
          <label>{t(language, 'Yo‘nalish')}<input value={form.category} onChange={set('category')} required /></label>
          <label>{t(language, 'Darslar soni')}<input type="number" min="1" max="200" value={form.totalLessons} onChange={set('totalLessons')} required /></label>
        </div>
        <div className="ui-form-row">
          <label>{t(language, 'Belgi')}<input value={form.icon} onChange={set('icon')} maxLength={8} required /></label>
          <label>{t(language, 'Rang')}<input type="color" value={form.color} onChange={set('color')} /></label>
        </div>
        <label>{t(language, 'Qisqa tavsif')}<textarea value={form.description} onChange={set('description')} maxLength={600} /></label>
        <label>{t(language, 'Mavzular (vergul bilan)')}<textarea value={form.topics} onChange={set('topics')} /></label>
        <div className="ui-dialog-actions"><button type="button" className="ui-btn" onClick={onClose}>{t(language, 'Bekor qilish')}</button><button type="submit" className="ui-btn ui-btn-primary" disabled={busy}>{t(language, 'Saqlash')}</button></div>
      </form>
    </Dialog>
  )
}

function Subjects({ language, onNotice }) {
  const { data, error, loading, reload } = useApi('/admin/subjects')
  const [editing, setEditing] = useState(null)
  const [toggle, setToggle] = useState(null)

  async function confirmToggle() {
    try {
      await api.patch(`/admin/subjects/${toggle.id}`, { active: !toggle.active })
      onNotice(t(language, 'Amal bajarildi va audit jurnaliga yozildi.'))
      setToggle(null)
      reload()
    } catch (err) {
      onNotice(t(language, err.message), true)
    }
  }

  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  return (
    <Card title={t(language, 'Fanlar')} subtitle={`${data.subjects.length} ${t(language, 'ta fan')}`} icon={FiBookOpen} action={<button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setEditing({})}><FiPlus aria-hidden="true" /> {t(language, 'Fan qo‘shish')}</button>}>
      <div className="role-subject-grid">
        {data.subjects.map((subject) => (
          <article key={subject.id} className={`role-subject-tile ${subject.active ? '' : 'is-off'}`} style={{ '--tile': subject.color }}>
            <span className="tile-icon">{subject.icon}</span>
            <span className="tile-body"><strong>{t(language, subject.name)}</strong><small>{t(language, subject.category)} · {subject.totalLessons} {t(language, 'dars')} · {subject._count.groups} {t(language, 'guruh')}</small></span>
            <span className="role-actions">
              <button type="button" className="ui-btn ui-btn-sm" aria-label={t(language, 'Tahrirlash')} onClick={() => setEditing(subject)}><FiEdit2 aria-hidden="true" /></button>
              <button type="button" className={`ui-btn ui-btn-sm ${subject.active ? 'ui-btn-danger' : 'ui-btn-success'}`} onClick={() => setToggle(subject)}>{t(language, subject.active ? 'Faolsizlantirish' : 'Faollashtirish')}</button>
            </span>
          </article>
        ))}
      </div>
      {editing && <SubjectDialog subject={editing.id ? editing : null} language={language} onClose={() => setEditing(null)} onSaved={reload} onNotice={onNotice} />}
      {toggle && <Dialog title={t(language, toggle.active ? 'Fanni faolsizlantirasizmi?' : 'Fanni faollashtirasizmi?')} subtitle={t(language, toggle.name)} onClose={() => setToggle(null)} actions={<><button type="button" className="ui-btn" onClick={() => setToggle(null)}>{t(language, 'Bekor qilish')}</button><button type="button" className="ui-btn ui-btn-primary" onClick={confirmToggle}>{t(language, 'Tasdiqlash')}</button></>}><p>{t(language, 'Bu amal audit jurnaliga yoziladi.')}</p></Dialog>}
    </Card>
  )
}

// Ustoz faqat o'zi dars beradigan fan guruhiga biriktiriladi (fan biriktirilmagan ustoz — hamma fanga).
function teachersFor(teachers = [], subjectId, currentId) {
  return teachers.filter((teacher) => teacher.id === currentId || (teacher.status === 'ACTIVE' && (!teacher.subjects.length || teacher.subjects.some((subject) => subject.id === subjectId))))
}

const teacherLabel = (teacher, language) => (teacher.status === 'ACTIVE' ? teacher.fullName : `${teacher.fullName} (${t(language, 'bloklangan')})`)

function GroupDialog({ language, subjects, teachers, onClose, onSaved, onNotice }) {
  const [form, setForm] = useState({ name: '', subjectId: subjects[0]?.id ?? '', lessonTime: '14:00', daysOfWeek: [1, 3, 5], capacity: 20, teacherId: '' })
  const [busy, setBusy] = useState(false)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const toggleDay = (day) => setForm((current) => ({ ...current, daysOfWeek: current.daysOfWeek.includes(day) ? current.daysOfWeek.filter((item) => item !== day) : [...current.daysOfWeek, day] }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post('/admin/groups', { ...form, capacity: Number(form.capacity), teacherId: form.teacherId || undefined })
      onNotice(t(language, 'Guruh yaratildi.'))
      onSaved()
      onClose()
    } catch (error) {
      onNotice(t(language, error.message), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog title={t(language, 'Guruh yaratish')} onClose={onClose}>
      <form className="ui-form" onSubmit={submit}>
        <label>{t(language, 'Guruh nomi')}<input value={form.name} onChange={set('name')} required minLength={2} /></label>
        <div className="ui-form-row">
          <label>{t(language, 'Fan')}<select value={form.subjectId} onChange={set('subjectId')} required>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{t(language, subject.name)}</option>)}</select></label>
          <label>{t(language, 'Ustoz')}<select value={form.teacherId} onChange={set('teacherId')}><option value="">{t(language, 'Biriktirilmagan')}</option>{teachersFor(teachers, form.subjectId).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}</select></label>
        </div>
        <div className="ui-form-row">
          <label>{t(language, 'Dars vaqti')}<input type="time" value={form.lessonTime} onChange={set('lessonTime')} required /></label>
          <label>{t(language, 'Sig‘im')}<input type="number" min="1" max="200" value={form.capacity} onChange={set('capacity')} required /></label>
        </div>
        <label>{t(language, 'Dars kunlari')}<span className="ui-days">{DAY_ORDER.map((day) => <button type="button" key={day} className={form.daysOfWeek.includes(day) ? 'is-on' : ''} onClick={() => toggleDay(day)}>{dayLabel(language, day)}</button>)}</span></label>
        <div className="ui-dialog-actions"><button type="button" className="ui-btn" onClick={onClose}>{t(language, 'Bekor qilish')}</button><button type="submit" className="ui-btn ui-btn-primary" disabled={busy || !form.daysOfWeek.length}>{t(language, 'Yaratish')}</button></div>
      </form>
    </Dialog>
  )
}

function Groups({ language, onNotice }) {
  const { data, error, loading, reload } = useApi('/admin/groups')
  const subjects = useApi('/admin/subjects')
  const teachers = useApi('/admin/teachers')
  const [adding, setAdding] = useState(false)
  const [toggle, setToggle] = useState(null)

  async function assign(group, teacherId) {
    try {
      await api.put(`/admin/groups/${group.id}/teacher`, { teacherId: teacherId || null })
      onNotice(t(language, 'Ustoz biriktirildi.'))
      reload()
    } catch (err) {
      onNotice(t(language, err.message), true)
    }
  }

  async function confirmToggle() {
    try {
      await api.patch(`/admin/groups/${toggle.id}`, { active: !toggle.active })
      onNotice(t(language, 'Amal bajarildi va audit jurnaliga yozildi.'))
      setToggle(null)
      reload()
    } catch (err) {
      onNotice(t(language, err.message), true)
    }
  }

  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  return (
    <Card title={t(language, 'Guruhlar')} subtitle={`${data.groups.length} ${t(language, 'ta guruh')}`} icon={FiLayers} action={<button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setAdding(true)} disabled={!subjects.data}><FiPlus aria-hidden="true" /> {t(language, 'Guruh yaratish')}</button>}>
      {data.groups.length ? (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead><tr><th>{t(language, 'Guruh')}</th><th>{t(language, 'Ustoz')}</th><th>{t(language, 'Jadval')}</th><th className="num">{t(language, 'O‘quvchi')}</th><th>{t(language, 'Holat')}</th><th /></tr></thead>
            <tbody>
              {data.groups.map((group) => (
                <tr key={group.id} className={group.active ? '' : 'is-off'}>
                  <td><strong>{group.name}</strong><br /><small>{t(language, group.subject.name)}</small></td>
                  <td>
                    <select className="ui-select ui-select-sm" aria-label={t(language, 'Ustoz biriktirish')} value={group.teacher?.id ?? ''} onChange={(event) => assign(group, event.target.value)}>
                      <option value="">{t(language, 'Biriktirilmagan')}</option>
                      {teachersFor(teachers.data?.teachers, group.subject.id, group.teacher?.id).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacherLabel(teacher, language)}</option>)}
                    </select>
                  </td>
                  <td>{group.lessonTime}<br /><small>{daysText(language, group.daysOfWeek)}</small></td>
                  <td className="num">{group.memberCount}/{group.capacity}</td>
                  <td><span className={`ui-chip ${group.active ? 'ui-chip-success' : 'ui-chip-muted'}`}>{t(language, group.active ? 'Faol' : 'Faol emas')}</span></td>
                  <td className="num"><button type="button" className={`ui-btn ui-btn-sm ${group.active ? 'ui-btn-danger' : 'ui-btn-success'}`} onClick={() => setToggle(group)}>{t(language, group.active ? 'Faolsizlantirish' : 'Faollashtirish')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title={t(language, 'Guruhlar yo‘q')} />}
      {adding && <GroupDialog language={language} subjects={subjects.data.subjects.filter((subject) => subject.active)} teachers={(teachers.data?.teachers || []).filter((teacher) => teacher.status === 'ACTIVE')} onClose={() => setAdding(false)} onSaved={reload} onNotice={onNotice} />}
      {toggle && <Dialog title={t(language, toggle.active ? 'Guruhni faolsizlantirasizmi?' : 'Guruhni faollashtirasizmi?')} subtitle={toggle.name} onClose={() => setToggle(null)} actions={<><button type="button" className="ui-btn" onClick={() => setToggle(null)}>{t(language, 'Bekor qilish')}</button><button type="button" className="ui-btn ui-btn-primary" onClick={confirmToggle}>{t(language, 'Tasdiqlash')}</button></>}><p>{t(language, 'Bu amal audit jurnaliga yoziladi.')}</p></Dialog>}
    </Card>
  )
}

function Ratings({ language }) {
  const { data, error, loading, reload } = useApi('/admin/ratings')
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  return (
    <div className="role-stack">
      <Card title={t(language, 'Eng faol o‘quvchilar')} subtitle={t(language, 'Umumiy ball bo‘yicha')} icon={FiAward}>
        {data.students.length ? (
          <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>#</th><th>{t(language, 'O‘quvchi')}</th><th className="num">{t(language, 'Kelgan')}</th><th className="num">{t(language, 'Ball')}</th></tr></thead>
            <tbody>{data.students.map((student) => <tr key={student.id}><td>{String(student.rank).padStart(2, '0')}</td><td><span className="ui-person"><Avatar name={student.name} size={32} /><strong>{student.name}</strong></span></td><td className="num">{student.presentCount}</td><td className="num"><strong>{student.points}</strong></td></tr>)}</tbody></table></div>
        ) : <Empty title={t(language, 'Reyting hali shakllanmagan')} />}
      </Card>
      <Card title={t(language, 'Ustozlar reytingi')} subtitle={t(language, 'O‘quvchilar bergan baholar bo‘yicha')} icon={FiUsers}>
        {data.teachers.length ? (
          <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>#</th><th>{t(language, 'Ustoz')}</th><th>{t(language, 'Baho')}</th><th className="num">{t(language, 'O‘quvchilar')}</th></tr></thead>
            <tbody>{data.teachers.map((teacher) => <tr key={teacher.id}><td>{String(teacher.rank).padStart(2, '0')}</td><td><span className="ui-person"><Avatar name={teacher.fullName} size={32} /><strong>{teacher.fullName}</strong></span></td><td><Stars value={teacher.rating} count={teacher.reviewCount} language={language} /></td><td className="num">{teacher.studentCount}</td></tr>)}</tbody></table></div>
        ) : <Empty title={t(language, 'Ustozlar yo‘q')} />}
      </Card>
    </div>
  )
}

function Suspicious({ language }) {
  const { data, error, loading, reload } = useApi('/admin/suspicious')
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  return (
    <Card title={t(language, 'Shubhali baholashlar')} subtitle={t(language, 'Tizim avtomatik aniqlagan g‘ayrioddiy baholar')} icon={FiShield}>
      {data.items.length ? (
        <div className="ui-table-wrap"><table className="ui-table"><thead><tr><th>{t(language, 'Sabab')}</th><th>{t(language, 'Sana')}</th><th>{t(language, 'O‘quvchi')}</th><th>{t(language, 'Ustoz')}</th><th>{t(language, 'Guruh')}</th><th className="num">{t(language, 'Ball')}</th></tr></thead>
          <tbody>{data.items.map((item) => <tr key={item.id}><td><span className="ui-chip ui-chip-warn">{t(language, item.reason)}</span></td><td>{formatDate(item.date, language)}</td><td>{item.student}</td><td>{item.teacher}</td><td>{item.group}</td><td className="num">{item.total}</td></tr>)}</tbody></table></div>
      ) : <Empty title={t(language, 'Shubhali baholash topilmadi')} detail={t(language, 'Barcha baholar belgilangan qoidalarga mos.')} />}
    </Card>
  )
}

function AdminPages({ page, language, onNotice, onGo }) {
  if (page === 'users') return <Users language={language} onNotice={onNotice} />
  if (page === 'teachers') return <Teachers language={language} onNotice={onNotice} />
  if (page === 'subjects') return <Subjects language={language} onNotice={onNotice} />
  if (page === 'groups') return <Groups language={language} onNotice={onNotice} />
  if (page === 'ratings') return <Ratings language={language} />
  if (page === 'suspicious') return <Suspicious language={language} />
  return <Overview language={language} onGo={onGo} />
}

export default AdminPages
