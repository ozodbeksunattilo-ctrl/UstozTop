import { useState } from 'react'
import { FiAward, FiUsers } from 'react-icons/fi'
import { Avatar, Empty, ErrorBox, Loading, Stars } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { useApi } from '../useApi.js'

function StudentsBoard({ language }) {
  const mine = useApi('/student/dashboard')
  const [groupId, setGroupId] = useState('')
  const { data, error, loading, reload } = useApi(`/ratings/students${groupId ? `?groupId=${groupId}` : ''}`)
  const groups = mine.data?.groups || []

  return (
    <div className="student-ranking-layout">
      <section className="student-card">
        <div className="student-card-heading"><div><h2>{t(language, 'O‘quvchilar reytingi')}</h2><p>{data ? `${data.total} ${t(language, 'nafar o‘quvchi')}` : ''}</p></div><FiAward aria-hidden="true" /></div>
        <div className="ui-toolbar">
          <select className="ui-select" aria-label={t(language, 'Guruh')} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">{t(language, 'Umumiy reyting')}</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>
        {loading && !data ? <Loading language={language} /> : error ? <ErrorBox error={error} onRetry={reload} language={language} /> : data.students.length ? (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead><tr><th>#</th><th>{t(language, 'O‘quvchi')}</th><th className="num">{t(language, 'Kelgan darslar')}</th><th className="num">{t(language, 'Ball')}</th></tr></thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.id} className={student.me ? 'me' : ''}>
                    <td>{String(student.rank).padStart(2, '0')}</td>
                    <td><span className="ui-person"><Avatar name={student.name} size={34} /><strong>{student.name}{student.me ? ` · ${t(language, 'Siz')}` : ''}</strong></span></td>
                    <td className="num">{student.presentCount}</td>
                    <td className="num"><strong>{student.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title={t(language, 'Reyting hali shakllanmagan')} detail={t(language, 'Ustoz baho qo‘ygach ballar shu yerda ko‘rinadi.')} />}
      </section>
      <aside className="student-current-rank student-card">
        <span className="ranking-period-label">{t(language, 'Mening reytingim')}</span>
        <strong className="student-rank-number">{data?.me ? `#${data.me.rank}` : '—'}</strong>
        <p>{data?.me ? `${data.me.points} ${t(language, 'ball')} · ${data.total} ${t(language, 'nafar o‘quvchi')}` : t(language, 'Siz hali reytingda emassiz.')}</p>
        <small className="ranking-demo-caption">{t(language, 'Reyting umumiy ball, kelgan darslar soni va ro‘yxatdan o‘tgan sana bo‘yicha hisoblanadi.')}</small>
      </aside>
    </div>
  )
}

function TeachersBoard({ language, onOpenTeacher }) {
  const { data, error, loading, reload } = useApi('/ratings/teachers')
  return (
    <section className="student-card">
      <div className="student-card-heading"><div><h2>{t(language, 'Ustozlar reytingi')}</h2><p>{t(language, 'O‘quvchilar bergan baholar asosida')}</p></div><FiUsers aria-hidden="true" /></div>
      {loading && !data ? <Loading language={language} /> : error ? <ErrorBox error={error} onRetry={reload} language={language} /> : data.teachers.length ? (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead><tr><th>#</th><th>{t(language, 'Ustoz')}</th><th>{t(language, 'Baho')}</th><th className="num">{t(language, 'O‘quvchilar')}</th></tr></thead>
            <tbody>
              {data.teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>{String(teacher.rank).padStart(2, '0')}</td>
                  <td><button type="button" className="ui-person ui-linkish" onClick={() => onOpenTeacher(teacher.id)}><Avatar name={teacher.fullName} color={teacher.avatarColor} size={34} /><span><strong>{teacher.fullName}</strong><small>{teacher.subjects.map((subject) => t(language, subject.name)).join(', ')}</small></span></button></td>
                  <td><Stars value={teacher.rating} count={teacher.reviewCount} language={language} /></td>
                  <td className="num">{teacher.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title={t(language, 'Ustozlar topilmadi')} />}
    </section>
  )
}

function RatingsPage({ language, onOpenTeacher }) {
  const [tab, setTab] = useState('students')
  return (
    <div className="ui-stack">
      <div className="ui-seg" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'students'} className={tab === 'students' ? 'is-active' : ''} onClick={() => setTab('students')}>{t(language, 'O‘quvchilar')}</button>
        <button type="button" role="tab" aria-selected={tab === 'teachers'} className={tab === 'teachers' ? 'is-active' : ''} onClick={() => setTab('teachers')}>{t(language, 'Ustozlar')}</button>
      </div>
      {tab === 'students' ? <StudentsBoard language={language} /> : <TeachersBoard language={language} onOpenTeacher={onOpenTeacher} />}
    </div>
  )
}

export default RatingsPage
