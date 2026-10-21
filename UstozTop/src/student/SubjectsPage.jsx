import { FiArrowLeft, FiBookOpen } from 'react-icons/fi'
import { Empty, ErrorBox, Loading } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { useApi } from '../useApi.js'
import GroupRow from './GroupRow.jsx'
import SubjectBackdrop from './SubjectBackdrop.jsx'

function SubjectDetail({ subject, language, onBack, onNotice, onOpenTeacher }) {
  const { data, error, loading, reload } = useApi(`/groups?subjectId=${subject.id}`)
  const teachers = [...new Map((data?.groups || []).filter((group) => group.teacher).map((group) => [group.teacher.id, group.teacher])).values()]
  return (
    <section className="student-detail">
      <button type="button" className="student-back" onClick={onBack}><FiArrowLeft aria-hidden="true" /> {t(language, 'Barcha fanlar')}</button>
      <div className="subject-hero" style={{ '--subject-accent': subject.color }}>
        <SubjectBackdrop subject={subject} />
        <div className="subject-hero-copy">
          <span className="subject-category">{t(language, subject.category)}</span>
          <h1>{t(language, subject.name)}</h1>
          <p>{subject.totalLessons} {t(language, 'ta dars rejalashtirilgan')} · {subject._count.groups} {t(language, 'ta guruh')}</p>
        </div>
      </div>
      <div className="student-detail-grid">
        <section className="student-card detail-topics">
          <div className="student-card-heading"><div><h2>{t(language, 'O‘quv dasturi')}</h2><p>{t(language, 'Fan bo‘yicha o‘rganiladigan mavzular')}</p></div><FiBookOpen aria-hidden="true" /></div>
          {subject.topics.length ? subject.topics.map((topic, index) => (
            <div className="topic-row" key={topic}>
              <span className="topic-number">{String(index + 1).padStart(2, '0')}</span>
              <span>{t(language, topic)}</span>
              <span />
            </div>
          )) : <Empty title={t(language, 'Mavzular hali kiritilmagan')} />}
        </section>
        <div className="ui-stack">
          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Guruhlar')}</h2><p>{t(language, 'Guruhga qo‘shilib, darslarni boshlang.')}</p></div></div>
            {loading && !data ? <Loading language={language} /> : error ? <ErrorBox error={error} onRetry={reload} language={language} /> : data.groups.length ? (
              <div className="grow-list">{data.groups.map((group) => <GroupRow key={group.id} group={group} language={language} showTeacher onChanged={reload} onNotice={onNotice} />)}</div>
            ) : <Empty title={t(language, 'Bu fan bo‘yicha guruh yo‘q')} />}
          </section>
          {teachers.length > 0 && (
            <section className="student-card">
              <div className="student-card-heading"><div><h2>{t(language, 'Fan ustozlari')}</h2></div></div>
              {teachers.map((teacher) => <button type="button" className="sp-teacher" key={teacher.id} onClick={() => onOpenTeacher(teacher.id)}><span className="ui-avatar" style={{ width: 44, height: 44 }}>{teacher.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><strong>{teacher.fullName}</strong><span /></button>)}
            </section>
          )}
        </div>
      </div>
    </section>
  )
}

function SubjectsPage({ language, selectedId, onSelect, onNotice, onOpenTeacher }) {
  const { data, error, loading, reload } = useApi('/subjects')
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  const selected = selectedId ? data.subjects.find((subject) => subject.id === selectedId) : null
  if (selected) return <SubjectDetail subject={selected} language={language} onBack={() => onSelect(null)} onNotice={onNotice} onOpenTeacher={onOpenTeacher} />

  return (
    <section className="student-card">
      <div className="student-card-heading"><div><h2>{t(language, 'Barcha fanlar')}</h2><p>{data.subjects.length} {t(language, 'ta fan')}</p></div><FiBookOpen aria-hidden="true" /></div>
      {data.subjects.length ? (
        <div className="student-subjects-grid">
          {data.subjects.map((subject) => (
            <button type="button" key={subject.id} className="subject-card" style={{ '--subject-accent': subject.color }} onClick={() => onSelect(subject.id)}>
              <SubjectBackdrop subject={subject} compact />
              <span className="subject-card-icon">{subject.icon}</span>
              <span className="subject-card-title">{t(language, subject.name)}</span>
              <span className="subject-card-meta">{t(language, subject.category)}</span>
              <span className="subject-card-footer"><span>{subject.totalLessons} {t(language, 'ta dars')}</span><span className="subject-enrollment-status">{subject._count.groups} {t(language, 'ta guruh')}</span></span>
            </button>
          ))}
        </div>
      ) : <Empty title={t(language, 'Fanlar hali qo‘shilmagan')} />}
    </section>
  )
}

export default SubjectsPage
