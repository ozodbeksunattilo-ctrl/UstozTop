import { FiArrowRight, FiAward, FiBookOpen, FiCalendar, FiEdit2, FiMail, FiStar, FiUser, FiUsers } from 'react-icons/fi'
import { avatarStyle } from '../components/avatar.js'
import ProfileEditor from '../components/ProfileEditor.jsx'
import { DAY_ORDER, dayLabel, Empty, ErrorBox, formatDate, Loading } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { useApi } from '../useApi.js'

function StudentProfile({ user, language, editing, onEdit, onCloseEdit, onSave, onNotice, onBrowse, onOpenSubject, onOpenTeacher }) {
  const { data, error, loading, reload } = useApi('/student/dashboard')
  const results = useApi('/student/results')
  const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase()
  const gradeLabel = user.grade ? t(language, user.grade) : '—'
  const todayIndex = new Date().getDay()

  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  const { stats, groups } = data
  const teachers = [...new Map(groups.filter((group) => group.teacher).map((group) => [group.teacher.id, group.teacher])).values()]

  return (
    <div className="sp">
      <section className="sp-hero">
        <span className="sp-avatar" style={avatarStyle(user)}>{initials}</span>
        <div className="sp-hero-info">
          <span className="sp-badges"><em>{t(language, 'O‘quvchi')}</em>{user.grade && <em>{gradeLabel}</em>}</span>
          <h1>{user.fullName}</h1>
          <p><FiMail aria-hidden="true" /> {user.email || user.phone}</p>
          <div className="sp-hero-actions">
            <button type="button" className="sp-primary" onClick={onEdit}><FiEdit2 aria-hidden="true" /> {t(language, 'Profilni tahrirlash')}</button>
          </div>
        </div>
        <dl className="sp-stats">
          <div><dt>{t(language, 'Jami ball')}</dt><dd>{stats.points}</dd></div>
          <div><dt>{t(language, 'Guruhdagi o‘rin')}</dt><dd>#{stats.rank}<small>/{stats.totalStudents}</small></dd></div>
          <div><dt>{t(language, 'Guruhlar')}</dt><dd>{groups.length}</dd></div>
          <div><dt>{t(language, 'Davomat')}</dt><dd>{stats.attendancePercent}%</dd></div>
          <div><dt>{t(language, 'Faollik')}</dt><dd>{stats.activityPercent}%</dd></div>
        </dl>
      </section>

      <div className="sp-grid">
        <div className="sp-col">
          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Mening guruhlarim')}</h2><p>{groups.length} {t(language, 'ta guruh')}</p></div><FiBookOpen aria-hidden="true" /></div>
            {groups.length ? (
              <div className="sp-subjects">
                {groups.map((group) => (
                  <button type="button" key={group.id} className="sp-subject" style={{ '--subject-accent': group.subject.color }} onClick={() => onOpenSubject(group.subject.id)}>
                    <span className="sp-subject-icon">{group.subject.icon}</span>
                    <span className="sp-subject-body">
                      <strong>{group.name}</strong>
                      <small>{group.teacher?.fullName} · {group.lessonTime}</small>
                      <span className="subject-progress-track"><span style={{ width: `${group.progress}%` }} /></span>
                    </span>
                    <span className="sp-subject-meta"><strong>{group.points}</strong><small>{t(language, 'ball')}</small></span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="student-enrollment-empty"><p>{t(language, 'Hozircha guruhga qo‘shilmagansiz.')}</p><button type="button" onClick={onBrowse}>{t(language, 'Ustoz qidirish')} <FiArrowRight aria-hidden="true" /></button></div>
            )}
          </section>

          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Haftalik dars jadvali')}</h2><p>{t(language, 'Siz a’zo bo‘lgan guruhlar bo‘yicha')}</p></div><FiCalendar aria-hidden="true" /></div>
            <div className="sp-week">
              {DAY_ORDER.map((day) => {
                const items = groups.filter((group) => group.daysOfWeek.includes(day))
                return (
                  <div key={day} className={`sp-day ${day === todayIndex ? 'is-today' : ''}`}>
                    <span className="sp-day-name">{dayLabel(language, day)}</span>
                    {items.length ? items.map((group) => (
                      <span key={group.id} className="sp-lesson" style={{ '--subject-accent': group.subject.color }}>
                        <strong>{group.lessonTime}</strong>
                        <small>{t(language, group.subject.name)}</small>
                      </span>
                    )) : <span className="sp-day-empty">—</span>}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="sp-col">
          {editing ? (
            <section className="student-card">
              <div className="student-card-heading"><div><h2>{t(language, 'Profilni tahrirlash')}</h2><p>{t(language, 'Shaxsiy ma’lumotlaringiz va akkaunt sozlamalari')}</p></div><FiUser aria-hidden="true" /></div>
              <ProfileEditor user={user} language={language} withGrade onSave={async (profile) => { await onSave(profile); onCloseEdit() }} onCancel={onCloseEdit} onNotice={onNotice} />
            </section>
          ) : (
            <section className="student-card">
              <div className="student-card-heading"><div><h2>{t(language, 'Shaxsiy ma’lumotlar')}</h2><p>{t(language, 'Akkaunt ma’lumotlari')}</p></div><FiUser aria-hidden="true" /></div>
              <dl className="sp-details">
                <div><dt>{t(language, 'Ism va familiya')}</dt><dd>{user.fullName}</dd></div>
                <div><dt>{t(language, 'Email yoki telefon')}</dt><dd>{user.email || user.phone}</dd></div>
                <div><dt>{t(language, 'Sinf / guruh')}</dt><dd>{gradeLabel}</dd></div>
                <div><dt>{t(language, 'Hisob turi')}</dt><dd>{t(language, 'O‘quvchi')}</dd></div>
              </dl>
            </section>
          )}

          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Ustozlarim')}</h2><p>{teachers.length} {t(language, 'nafar')}</p></div><FiUsers aria-hidden="true" /></div>
            {teachers.length ? teachers.map((teacher) => (
              <button type="button" key={teacher.id} className="sp-teacher" onClick={() => onOpenTeacher(teacher.id)}>
                <span className="ui-avatar" style={{ width: 48, height: 48, ...avatarStyle({ avatarColor: teacher.avatarColor }) }}>{teacher.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                <span><strong>{teacher.fullName}</strong><small><FiStar aria-hidden="true" /> {t(language, 'Profilni ko‘rish')}</small></span>
                <FiArrowRight aria-hidden="true" className="student-muted-icon" />
              </button>
            )) : <p className="student-empty">{t(language, 'Guruhga qo‘shilgach ustozlaringiz shu yerda ko‘rinadi.')}</p>}
          </section>

          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Oxirgi baholar')}</h2><p>{t(language, 'Har bir mezon 10 balldan')}</p></div><FiAward aria-hidden="true" /></div>
            {data.recentResults.length ? data.recentResults.map((item) => (
              <div className="sp-result" key={item.id}>
                <span>{t(language, item.subject)} <small>· {formatDate(item.date, language)}</small></span>
                <strong>{item.total}<small>/{item.max}</small></strong>
              </div>
            )) : results.loading ? <Loading language={language} /> : <Empty title={t(language, 'Hali baho yo‘q')} />}
          </section>
        </div>
      </div>
    </div>
  )
}

export default StudentProfile
