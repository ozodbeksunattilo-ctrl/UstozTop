import { useState } from 'react'
import { FiArrowRight, FiAward, FiUsers } from 'react-icons/fi'
import { Avatar, Empty, ErrorBox, Loading, Stars } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { useApi } from '../useApi.js'

// Reyting har bir fan guruhi ichida alohida: o'quvchi faqat o'zi o'qiydigan guruhlar reytingini ko'radi.
function StudentsBoard({ language, onGo }) {
  const mine = useApi('/student/dashboard')
  const [groupId, setGroupId] = useState('')
  const groups = mine.data?.groups || []
  const bestId = [...groups].filter((group) => group.rank).sort((a, b) => a.rank - b.rank)[0]?.id
  const activeId = groups.some((group) => group.id === groupId) ? groupId : bestId || groups[0]?.id || ''
  const active = groups.find((group) => group.id === activeId)
  const { data, error, loading, reload } = useApi(activeId ? `/ratings/students?groupId=${activeId}` : null)

  if (mine.loading && !mine.data) return <Loading language={language} />
  if (mine.error && !mine.data) return <ErrorBox error={mine.error} onRetry={mine.reload} language={language} />
  if (!groups.length) {
    return (
      <section className="student-card">
        <Empty
          title={t(language, 'Reyting guruhga qo‘shilgach paydo bo‘ladi')}
          detail={t(language, 'Har bir fan uchun alohida reyting yuritiladi. Ustozga so‘rov yuboring — tasdiqlangach shu yerda o‘zingizni ko‘rasiz.')}
          action={<button type="button" className="ui-btn ui-btn-primary" onClick={() => onGo('teachers')}>{t(language, 'Ustoz qidirish')} <FiArrowRight aria-hidden="true" /></button>}
        />
      </section>
    )
  }

  const color = active.subject.color
  return (
    <div className="ui-stack">
      <div className="subject-tabs" role="tablist" aria-label={t(language, 'Fan guruhlari')}>
        {groups.map((group) => (
          <button type="button" role="tab" aria-selected={group.id === activeId} key={group.id} className={`subject-tab ${group.id === activeId ? 'is-active' : ''}`} style={{ '--tab': group.subject.color }} onClick={() => setGroupId(group.id)}>
            <i>{group.subject.icon}</i>{t(language, group.subject.name)}
          </button>
        ))}
      </div>
      <div className="student-ranking-layout" style={{ '--tab': color }}>
        <section className="student-card">
          <div className="student-card-heading"><div><h2>{t(language, active.subject.name)} · {t(language, 'guruh reytingi')}</h2><p>{active.name}{data ? ` · ${data.total} ${t(language, 'nafar o‘quvchi')}` : ''}</p></div><FiAward aria-hidden="true" /></div>
          {loading && !data ? <Loading language={language} /> : error ? <ErrorBox error={error} onRetry={reload} language={language} /> : data.students.length ? (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead><tr><th>#</th><th>{t(language, 'O‘quvchi')}</th><th className="num">{t(language, 'Kelgan darslar')}</th><th className="num">{t(language, 'Ball')}</th></tr></thead>
                <tbody>
                  {data.students.map((student) => (
                    <tr key={student.id} className={student.me ? 'me' : ''}>
                      <td><span className={`rank-medal ${student.rank <= 3 ? `medal-${student.rank}` : ''}`}>{student.rank}</span></td>
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
        <aside className="student-current-rank student-card rank-hero">
          <span className="ranking-period-label">{t(language, 'Mening o‘rnim')} · {t(language, active.subject.name)}</span>
          <strong className="student-rank-number">{data?.me ? `#${data.me.rank}` : '—'}</strong>
          <p>{data?.me ? `${data.me.points} ${t(language, 'ball')} · ${data.total} ${t(language, 'nafar o‘quvchi')}` : t(language, 'Siz hali reytingda emassiz.')}</p>
          <small className="ranking-demo-caption">{t(language, 'Bu reytingda faqat shu fan guruhidagi o‘quvchilar bor. Ball, kelgan darslar soni va qo‘shilgan sana hisobga olinadi.')}</small>
        </aside>
      </div>
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
                  <td><span className={`rank-medal ${teacher.rank <= 3 ? `medal-${teacher.rank}` : ''}`}>{teacher.rank}</span></td>
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

function RatingsPage({ language, onOpenTeacher, onGo }) {
  const [tab, setTab] = useState('students')
  return (
    <div className="ui-stack">
      <div className="ui-seg" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'students'} className={tab === 'students' ? 'is-active' : ''} onClick={() => setTab('students')}>{t(language, 'Mening guruhlarim')}</button>
        <button type="button" role="tab" aria-selected={tab === 'teachers'} className={tab === 'teachers' ? 'is-active' : ''} onClick={() => setTab('teachers')}>{t(language, 'Ustozlar')}</button>
      </div>
      {tab === 'students' ? <StudentsBoard language={language} onGo={onGo} /> : <TeachersBoard language={language} onOpenTeacher={onOpenTeacher} />}
    </div>
  )
}

export default RatingsPage
