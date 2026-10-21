import { useState } from 'react'
import { FiArrowRight, FiBarChart2, FiCalendar } from 'react-icons/fi'
import { Empty, ErrorBox, formatDate, Loading } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { useApi } from '../useApi.js'

// Natijalar fanlar kesimida: o'quvchi faqat o'zining baholari va davomatini ko'radi.
function ResultsPage({ language, onGo }) {
  const { data, error, loading, reload } = useApi('/student/results')
  const mine = useApi('/student/dashboard')
  const [subjectId, setSubjectId] = useState('')
  if ((loading && !data) || (mine.loading && !mine.data)) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  if (mine.error && !mine.data) return <ErrorBox error={mine.error} onRetry={mine.reload} language={language} />

  const groups = mine.data?.groups || []
  const assessments = subjectId ? data.assessments.filter((item) => item.subjectId === subjectId) : data.assessments
  const attendances = subjectId ? data.attendances.filter((item) => item.subjectId === subjectId) : data.attendances
  const present = attendances.filter((item) => item.present).length

  if (!groups.length && !data.assessments.length) {
    return (
      <section className="student-card">
        <Empty
          title={t(language, 'Hali baho qo‘yilmagan')}
          detail={t(language, 'Guruhga qo‘shiling — ustoz davomat va baho qo‘ygach natijalar shu yerda ko‘rinadi.')}
          action={<button type="button" className="ui-btn ui-btn-primary" onClick={() => onGo('teachers')}>{t(language, 'Ustoz qidirish')} <FiArrowRight aria-hidden="true" /></button>}
        />
      </section>
    )
  }

  return (
    <div className="ui-stack">
      <div className="result-summary">
        {groups.map((group) => {
          const average = group.averageScore
          return (
            <button type="button" key={group.id} className={`result-tile ${subjectId === group.subject.id ? 'is-active' : ''}`} style={{ '--tab': group.subject.color }} onClick={() => setSubjectId(subjectId === group.subject.id ? '' : group.subject.id)} aria-pressed={subjectId === group.subject.id}>
              <header><i>{group.subject.icon}</i><span><strong>{t(language, group.subject.name)}</strong></span></header>
              <dl>
                <div><dt>{t(language, 'Ball')}</dt><dd>{group.points}</dd></div>
                <div><dt>{t(language, 'O‘rtacha')}</dt><dd>{average}</dd></div>
                <div><dt>{t(language, 'O‘rin')}</dt><dd>{group.rank ? `#${group.rank}` : '—'}</dd></div>
              </dl>
            </button>
          )
        })}
      </div>

      <div className="student-listing-layout">
        <section className="student-card">
          <div className="student-card-heading"><div><h2>{t(language, 'Baholar va natijalar')}</h2><p>{t(language, 'Har bir mezon 10 balldan, jami 30 ball')}{subjectId ? ` · ${t(language, groups.find((group) => group.subject.id === subjectId)?.subject.name || '')}` : ''}</p></div><FiBarChart2 aria-hidden="true" /></div>
          {assessments.length ? (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead><tr><th>{t(language, 'Sana')}</th><th>{t(language, 'Fan')}</th><th className="num">{t(language, 'Qatnashish')}</th><th className="num">{t(language, 'Faollik')}</th><th className="num">{t(language, 'Topshiriq')}</th><th className="num">{t(language, 'Jami')}</th></tr></thead>
                <tbody>
                  {assessments.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.date, language)}</td>
                      <td><strong>{t(language, item.subject)}</strong></td>
                      <td className="num">{item.attendanceScore}</td>
                      <td className="num">{item.activityScore}</td>
                      <td className="num">{item.homeworkScore}</td>
                      <td className="num"><strong>{item.total}</strong><small> / 30</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title={t(language, 'Hali baho qo‘yilmagan')} detail={t(language, 'Ustoz baho qo‘ygach natijalar shu yerda ko‘rinadi.')} />}
        </section>
        <section className="student-card">
          <div className="student-card-heading"><div><h2>{t(language, 'Davomat')}</h2><p>{present} / {attendances.length} {t(language, 'dars')}</p></div><FiCalendar aria-hidden="true" /></div>
          {attendances.length ? (
            <div className="att-list">
              {attendances.map((item) => (
                <div key={item.id} className="att-row">
                  <span>{formatDate(item.date, language)}</span>
                  <strong>{t(language, item.subject)}</strong>
                  <span className={`ui-chip ${item.present ? 'ui-chip-success' : 'ui-chip-danger'}`}>{t(language, item.present ? 'Keldi' : 'Kelmadi')}</span>
                </div>
              ))}
            </div>
          ) : <Empty title={t(language, 'Davomat hali yuritilmagan')} />}
        </section>
      </div>
    </div>
  )
}

export default ResultsPage
