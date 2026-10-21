import { FiBarChart2, FiCalendar } from 'react-icons/fi'
import { Empty, ErrorBox, formatDate, Loading } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { useApi } from '../useApi.js'

function ResultsPage({ language }) {
  const { data, error, loading, reload } = useApi('/student/results')
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  const present = data.attendances.filter((item) => item.present).length

  return (
    <div className="student-listing-layout">
      <section className="student-card">
        <div className="student-card-heading"><div><h2>{t(language, 'Baholar va natijalar')}</h2><p>{t(language, 'Har bir mezon 10 balldan, jami 30 ball')}</p></div><FiBarChart2 aria-hidden="true" /></div>
        {data.assessments.length ? (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead><tr><th>{t(language, 'Sana')}</th><th>{t(language, 'Fan')}</th><th className="num">{t(language, 'Qatnashish')}</th><th className="num">{t(language, 'Faollik')}</th><th className="num">{t(language, 'Topshiriq')}</th><th className="num">{t(language, 'Jami')}</th></tr></thead>
              <tbody>
                {data.assessments.map((item) => (
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
        ) : <Empty title={t(language, 'Hali baho qo‘yilmagan')} detail={t(language, 'Guruhga qo‘shiling — ustoz baho qo‘ygach natijalar shu yerda ko‘rinadi.')} />}
      </section>
      <section className="student-card">
        <div className="student-card-heading"><div><h2>{t(language, 'Davomat')}</h2><p>{present} / {data.attendances.length} {t(language, 'dars')}</p></div><FiCalendar aria-hidden="true" /></div>
        {data.attendances.length ? (
          <div className="att-list">
            {data.attendances.map((item) => (
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
  )
}

export default ResultsPage
