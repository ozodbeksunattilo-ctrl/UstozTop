import { useMemo, useState } from 'react'
import { FiArrowLeft, FiArrowRight, FiAward, FiBookOpen, FiCalendar, FiCheck, FiClock, FiSearch, FiUsers } from 'react-icons/fi'
import { Avatar, DAY_ORDER, dayLabel, Empty, ErrorBox, Loading } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { useApi } from '../useApi.js'
import GroupRow from './GroupRow.jsx'
import './subjects.css'
import SubjectBackdrop from './SubjectBackdrop.jsx'

const fallbackDescription = (subject) => `${subject.name} bo‘yicha ${subject.topics.length || 'bir necha'} ta asosiy mavzu, ${subject.totalLessons} ta dars. Har dars davomat va ball bilan baholanadi.`

function SubjectCard({ subject, info, language, onOpen }) {
  const status = info.enrolled ? ['is-enrolled', 'Siz o‘qiyapsiz'] : info.requested ? ['is-pending', 'So‘rov yuborilgan'] : null
  return (
    <button type="button" className="sx-card" style={{ '--subject-accent': subject.color }} onClick={onOpen}>
      <span className="sx-card-top">
        <SubjectBackdrop subject={subject} compact />
        <span className="sx-card-icon">{subject.icon}</span>
        <span className="sx-card-category">{t(language, subject.category)}</span>
      </span>
      <span className="sx-card-body">
        <strong>{t(language, subject.name)}</strong>
        <span className="sx-card-text">{t(language, subject.description || fallbackDescription(subject))}</span>
      </span>
      <span className="sx-card-stats">
        <span><FiBookOpen aria-hidden="true" /> {subject.totalLessons} {t(language, 'dars')}</span>
        <span><FiUsers aria-hidden="true" /> {info.groups} {t(language, 'guruh')}</span>
        <span><FiAward aria-hidden="true" /> {info.teachers} {t(language, 'ustoz')}</span>
      </span>
      <span className="sx-card-footer">
        {status ? <span className={`sx-status ${status[0]}`}>{status[0] === 'is-enrolled' && <FiCheck aria-hidden="true" />}{t(language, status[1])}</span> : <span className="sx-status">{info.groups ? t(language, 'Guruhlar ochiq') : t(language, 'Hozircha guruh yo‘q')}</span>}
        <span className="sx-card-open">{t(language, 'Batafsil')} <FiArrowRight aria-hidden="true" /></span>
      </span>
    </button>
  )
}

function Roadmap({ subject, language, held }) {
  const topics = subject.topics
  if (!topics.length) return <Empty title={t(language, 'Mavzular hali kiritilmagan')} />
  const perTopic = subject.totalLessons / topics.length
  return (
    <ol className="sx-roadmap">
      {topics.map((topic, index) => {
        const start = index * perTopic
        const done = held !== null && held >= start + perTopic
        const current = held !== null && !done && held >= start
        return (
          <li key={topic} className={`${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`} style={{ '--i': index }}>
            <span className="sx-step">{done ? <FiCheck aria-hidden="true" /> : index + 1}</span>
            <span className="sx-step-body">
              <strong>{t(language, topic)}</strong>
              <small>{Math.round(start) + 1}–{Math.round(start + perTopic)}-{t(language, 'darslar')}{current ? ` · ${t(language, 'hozir shu yerdasiz')}` : ''}</small>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function WeekSchedule({ groups, language }) {
  return (
    <div className="sx-week" role="table" aria-label={t(language, 'Haftalik jadval')}>
      {DAY_ORDER.map((day) => {
        const lessons = groups.filter((group) => group.daysOfWeek.includes(day)).sort((a, b) => a.lessonTime.localeCompare(b.lessonTime))
        return (
          <div key={day} className={`sx-day ${lessons.length ? 'has-lessons' : ''} ${new Date().getDay() === day ? 'is-today' : ''}`} role="row">
            <span className="sx-day-name">{dayLabel(language, day)}</span>
            {lessons.length ? lessons.map((group) => <span key={group.id} className="sx-lesson" title={group.name}><FiClock aria-hidden="true" />{group.lessonTime}</span>) : <span className="sx-empty-day">—</span>}
          </div>
        )
      })}
    </div>
  )
}

function SubjectDetail({ subject, language, onBack, onNotice, onOpenTeacher }) {
  const groupsApi = useApi(`/groups?subjectId=${subject.id}`)
  const mine = useApi('/student/dashboard')
  const groups = groupsApi.data?.groups || []
  const teachers = [...new Map(groups.filter((group) => group.teacher).map((group) => [group.teacher.id, group.teacher])).values()]
  const myGroup = mine.data?.groups.find((group) => group.subject.id === subject.id)
  const reloadAll = () => { groupsApi.reload(); mine.reload() }

  return (
    <section className="student-detail sx-detail">
      <button type="button" className="student-back" onClick={onBack}><FiArrowLeft aria-hidden="true" /> {t(language, 'Barcha fanlar')}</button>
      <div className="subject-hero sx-hero" style={{ '--subject-accent': subject.color }}>
        <SubjectBackdrop subject={subject} />
        <div className="subject-hero-copy">
          <span className="subject-category">{t(language, subject.category)}</span>
          <h1>{t(language, subject.name)}</h1>
          <p>{t(language, subject.description || fallbackDescription(subject))}</p>
          <span className="sx-pills">
            <span><FiBookOpen aria-hidden="true" /> {subject.totalLessons} {t(language, 'ta dars')}</span>
            <span><FiUsers aria-hidden="true" /> {groups.length} {t(language, 'ta guruh')}</span>
            <span><FiAward aria-hidden="true" /> {teachers.length} {t(language, 'ta ustoz')}</span>
          </span>
        </div>
      </div>

      {myGroup && (
        <section className="sx-mine" style={{ '--subject-accent': subject.color }}>
          <div><small>{t(language, 'Mening natijam')}</small><strong>{myGroup.points}</strong><span>{t(language, 'ball')}</span></div>
          <div><small>{t(language, 'Guruhdagi o‘rin')}</small><strong>{myGroup.rank ? `#${myGroup.rank}` : '—'}</strong><span>{myGroup.totalStudents} {t(language, 'nafar o‘quvchi')}</span></div>
          <div><small>{t(language, 'O‘rtacha ball')}</small><strong>{myGroup.averageScore}</strong><span>/ 30</span></div>
          <div className="sx-mine-progress"><small>{t(language, 'Dastur bo‘yicha')} · {myGroup.progress}%</small><span className="subject-progress-track"><span style={{ width: `${myGroup.progress}%` }} /></span><span>{myGroup.lessonsHeld}/{myGroup.totalLessons} {t(language, 'ta dars')}</span></div>
        </section>
      )}

      <div className="student-detail-grid">
        <section className="student-card detail-topics">
          <div className="student-card-heading"><div><h2>{t(language, 'O‘quv dasturi')}</h2><p>{t(language, 'Mavzular ketma-ketligi — bosqichma-bosqich yo‘l xaritasi')}</p></div><FiBookOpen aria-hidden="true" /></div>
          <Roadmap subject={subject} language={language} held={myGroup ? myGroup.lessonsHeld : null} />
        </section>
        <div className="ui-stack">
          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Haftalik jadval')}</h2><p>{t(language, 'Barcha guruhlar bo‘yicha dars vaqtlari')}</p></div><FiCalendar aria-hidden="true" /></div>
            {groupsApi.loading && !groupsApi.data ? <Loading language={language} /> : <WeekSchedule groups={groups} language={language} />}
          </section>
          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Guruhlar')}</h2><p>{t(language, 'So‘rov yuboring — ustoz tasdiqlagach darslar boshlanadi.')}</p></div></div>
            {groupsApi.loading && !groupsApi.data ? <Loading language={language} /> : groupsApi.error ? <ErrorBox error={groupsApi.error} onRetry={groupsApi.reload} language={language} /> : groups.length ? (
              <div className="grow-list">{groups.map((group) => <GroupRow key={group.id} group={group} language={language} showTeacher onChanged={reloadAll} onNotice={onNotice} />)}</div>
            ) : <Empty title={t(language, 'Bu fan bo‘yicha guruh yo‘q')} />}
          </section>
          {teachers.length > 0 && (
            <section className="student-card">
              <div className="student-card-heading"><div><h2>{t(language, 'Fan ustozlari')}</h2></div></div>
              {teachers.map((teacher) => <button type="button" className="sp-teacher" key={teacher.id} onClick={() => onOpenTeacher(teacher.id)}><Avatar name={teacher.fullName} size={44} /><strong>{teacher.fullName}</strong><span /></button>)}
            </section>
          )}
        </div>
      </div>
    </section>
  )
}

function SubjectsPage({ language, selectedId, onSelect, onNotice, onOpenTeacher }) {
  const { data, error, loading, reload } = useApi('/subjects')
  const groupsApi = useApi('/groups')
  const mine = useApi('/student/dashboard')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  // Har bir fan uchun: nechta guruh, nechta ustoz, o'quvchi o'qiydimi yoki so'rov yuborganmi.
  const infoBySubject = useMemo(() => {
    const info = new Map()
    for (const group of groupsApi.data?.groups || []) {
      const entry = info.get(group.subject.id) || { groups: 0, teachers: new Set(), enrolled: false, requested: false }
      entry.groups += 1
      if (group.teacher) entry.teachers.add(group.teacher.id)
      if (group.joined) entry.enrolled = true
      if (group.requested) entry.requested = true
      info.set(group.subject.id, entry)
    }
    return info
  }, [groupsApi.data])

  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  const selected = selectedId ? data.subjects.find((subject) => subject.id === selectedId) : null
  if (selected) return <SubjectDetail subject={selected} language={language} onBack={() => onSelect(null)} onNotice={onNotice} onOpenTeacher={onOpenTeacher} />

  const infoOf = (subject) => {
    const entry = infoBySubject.get(subject.id)
    return { groups: entry?.groups ?? subject._count.groups, teachers: entry?.teachers.size ?? 0, enrolled: Boolean(entry?.enrolled), requested: Boolean(entry?.requested) }
  }
  const categories = [...new Set(data.subjects.map((subject) => subject.category))]
  const text = query.trim().toLowerCase()
  const visible = data.subjects.filter((subject) => (!category || subject.category === category) && (!text || subject.name.toLowerCase().includes(text) || subject.topics.some((topic) => topic.toLowerCase().includes(text))))
  const enrolledSubjects = (mine.data?.groups || []).map((group) => data.subjects.find((subject) => subject.id === group.subject.id)).filter(Boolean)

  return (
    <div className="ui-stack sx-page">
      {enrolledSubjects.length > 0 && (
        <section className="student-card">
          <div className="student-card-heading"><div><h2>{t(language, 'Mening fanlarim')}</h2><p>{enrolledSubjects.length} {t(language, 'ta fan')}</p></div></div>
          <div className="sx-mine-strip">
            {mine.data.groups.map((group) => (
              <button type="button" key={group.id} className="sx-mine-chip" style={{ '--subject-accent': group.subject.color }} onClick={() => onSelect(group.subject.id)}>
                <i>{group.subject.icon}</i>
                <span><strong>{t(language, group.subject.name)}</strong><small>{group.lessonTime} · {group.progress}%</small></span>
                <span className="sx-ring" style={{ '--p': group.progress }} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="student-card">
        <div className="student-card-heading"><div><h2>{t(language, 'Barcha fanlar')}</h2><p>{visible.length} {t(language, 'ta fan')}</p></div><FiBookOpen aria-hidden="true" /></div>
        <div className="ui-toolbar">
          <label className="ui-search"><FiSearch aria-hidden="true" /><input aria-label={t(language, 'Qidirish')} placeholder={t(language, 'Fan yoki mavzu nomi...')} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </div>
        <div className="sx-filters" role="tablist" aria-label={t(language, 'Yo‘nalish')}>
          <button type="button" role="tab" aria-selected={!category} className={!category ? 'is-active' : ''} onClick={() => setCategory('')}>{t(language, 'Hammasi')}</button>
          {categories.map((item) => <button type="button" role="tab" aria-selected={category === item} key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{t(language, item)}</button>)}
        </div>
        {visible.length ? (
          <div className="sx-grid">
            {visible.map((subject) => <SubjectCard key={subject.id} subject={subject} info={infoOf(subject)} language={language} onOpen={() => onSelect(subject.id)} />)}
          </div>
        ) : <Empty title={t(language, 'Fan topilmadi')} detail={t(language, 'Boshqa nom yoki yo‘nalish bilan urinib ko‘ring.')} />}
      </section>
    </div>
  )
}

export default SubjectsPage
