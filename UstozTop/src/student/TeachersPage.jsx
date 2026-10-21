import { useEffect, useState } from 'react'
import { FiArrowLeft, FiAward, FiBookOpen, FiSearch, FiUsers } from 'react-icons/fi'
import { api, queryString } from '../api.js'
import { Avatar, Empty, ErrorBox, formatDate, Loading, Stars } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { useApi } from '../useApi.js'
import GroupRow from './GroupRow.jsx'

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function ReviewForm({ teacherId, mine, language, onNotice, onSaved }) {
  const [rating, setRating] = useState(mine?.rating || 5)
  const [comment, setComment] = useState(mine?.comment || '')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post(`/teachers/${teacherId}/reviews`, { rating, comment })
      onNotice(t(language, 'Bahoyingiz saqlandi.'))
      onSaved()
    } catch (error) {
      onNotice(t(language, error.message), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ui-form review-form" onSubmit={submit}>
      <div className="review-stars" role="radiogroup" aria-label={t(language, 'Baho')}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button type="button" key={star} role="radio" aria-checked={rating === star} className={star <= rating ? 'is-on' : ''} onClick={() => setRating(star)}>★</button>
        ))}
      </div>
      <label>{t(language, 'Izoh (ixtiyoriy)')}<textarea value={comment} maxLength={500} onChange={(event) => setComment(event.target.value)} /></label>
      <button type="submit" className="ui-btn ui-btn-primary" disabled={busy}>{t(language, mine ? 'Bahoni yangilash' : 'Baho berish')}</button>
    </form>
  )
}

function TeacherDetail({ id, language, onBack, onNotice }) {
  const { data, error, loading, reload } = useApi(`/teachers/${id}`)
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  const { teacher, groups, reviews, myReview } = data
  return (
    <section className="student-detail">
      <button type="button" className="student-back" onClick={onBack}><FiArrowLeft aria-hidden="true" /> {t(language, 'Ustozlar ro‘yxati')}</button>
      <div className="student-card teacher-profile">
        <Avatar name={teacher.fullName} color={teacher.avatarColor} size={84} />
        <div className="teacher-profile-info">
          <span className="subject-category">{t(language, 'Tasdiqlangan ustoz')}</span>
          <h1>{teacher.fullName}</h1>
          <p>{teacher.qualification || t(language, 'Ma’lumot kiritilmagan')}</p>
          <div className="teacher-profile-stats">
            <Stars value={teacher.rating} count={teacher.reviewCount} language={language} />
            <span><FiAward aria-hidden="true" /> {teacher.experienceYears} {t(language, 'yil tajriba')}</span>
            <span><FiUsers aria-hidden="true" /> {teacher.studentCount} {t(language, 'o‘quvchi')}</span>
          </div>
        </div>
      </div>
      <div className="student-detail-grid">
        <div className="ui-stack">
          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Ustoz haqida')}</h2><p>{t(language, 'Ta’lim uslubi va tajribasi')}</p></div><FiUsers aria-hidden="true" /></div>
            <p className="teacher-about">{teacher.bio || t(language, 'Ustoz hali o‘zi haqida ma’lumot kiritmagan.')}</p>
            <div className="tcard-chips">{teacher.subjects.map((subject) => <span key={subject.id} className="ui-chip" style={{ '--chip': subject.color }}>{subject.icon} {t(language, subject.name)}</span>)}</div>
          </section>
          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Guruhlar')}</h2><p>{groups.length} {t(language, 'ta faol guruh')}</p></div><FiBookOpen aria-hidden="true" /></div>
            {groups.length ? <div className="grow-list">{groups.map((group) => <GroupRow key={group.id} group={group} language={language} onChanged={reload} onNotice={onNotice} />)}</div> : <Empty title={t(language, 'Hozircha guruh yo‘q')} />}
          </section>
        </div>
        <div className="ui-stack">
          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Ustozga baho bering')}</h2><p>{t(language, 'Faqat uning guruhida o‘qigan o‘quvchilar baho bera oladi.')}</p></div></div>
            <ReviewForm key={myReview?.rating ?? 'new'} teacherId={teacher.id} mine={myReview} language={language} onNotice={onNotice} onSaved={reload} />
          </section>
          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Sharhlar')}</h2><p>{reviews.length} {t(language, 'ta sharh')}</p></div></div>
            {reviews.length ? reviews.map((review) => (
              <div className="review" key={review.id}>
                <div><strong>{review.author}</strong><Stars value={review.rating} /></div>
                {review.comment && <p>{review.comment}</p>}
                <small>{formatDate(review.createdAt, language)}</small>
              </div>
            )) : <Empty title={t(language, 'Hali sharh yo‘q')} />}
          </section>
        </div>
      </div>
    </section>
  )
}

function TeachersPage({ language, selectedId, onSelect, onNotice }) {
  const [query, setQuery] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [sort, setSort] = useState('rating')
  const debounced = useDebounced(query)
  const subjects = useApi('/subjects')
  const { data, error, loading, reload } = useApi(selectedId ? null : `/teachers${queryString({ query: debounced, subjectId, sort })}`)

  if (selectedId) return <TeacherDetail id={selectedId} language={language} onBack={() => onSelect(null)} onNotice={onNotice} />

  return (
    <section className="student-card">
      <div className="student-card-heading"><div><h2>{t(language, 'Ustoz qidirish')}</h2><p>{t(language, 'Fan, ism va reyting bo‘yicha qidiring.')}</p></div><FiUsers aria-hidden="true" /></div>
      <div className="ui-toolbar">
        <label className="ui-search"><FiSearch aria-hidden="true" /><input aria-label={t(language, 'Ustoz ismi')} placeholder={t(language, 'Ustoz ismi...')} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select className="ui-select" aria-label={t(language, 'Fan')} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
          <option value="">{t(language, 'Barcha fanlar')}</option>
          {(subjects.data?.subjects || []).map((subject) => <option key={subject.id} value={subject.id}>{t(language, subject.name)}</option>)}
        </select>
        <select className="ui-select" aria-label={t(language, 'Saralash')} value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="rating">{t(language, 'Reyting bo‘yicha')}</option>
          <option value="name">{t(language, 'Ism bo‘yicha')}</option>
          <option value="experience">{t(language, 'Tajriba bo‘yicha')}</option>
        </select>
      </div>
      {loading && !data ? <Loading language={language} /> : error ? <ErrorBox error={error} onRetry={reload} language={language} /> : data.teachers.length ? (
        <div className="ui-grid">
          {data.teachers.map((teacher) => (
            <button type="button" key={teacher.id} className="tcard" onClick={() => onSelect(teacher.id)}>
              <span className="tcard-head"><Avatar name={teacher.fullName} color={teacher.avatarColor} size={52} /><span><strong>{teacher.fullName}</strong><Stars value={teacher.rating} count={teacher.reviewCount} language={language} /></span></span>
              <span className="tcard-qual">{teacher.qualification || t(language, 'Ma’lumot kiritilmagan')}</span>
              <span className="tcard-chips">{teacher.subjects.slice(0, 4).map((subject) => <span key={subject.id} className="ui-chip" style={{ '--chip': subject.color }}>{t(language, subject.name)}</span>)}</span>
              <span className="tcard-meta"><span><FiAward aria-hidden="true" /> {teacher.experienceYears} {t(language, 'yil')}</span><span><FiBookOpen aria-hidden="true" /> {teacher.groupCount} {t(language, 'guruh')}</span><span><FiUsers aria-hidden="true" /> {teacher.studentCount}</span></span>
            </button>
          ))}
        </div>
      ) : <Empty title={t(language, 'Ustoz topilmadi')} detail={t(language, 'Qidiruv shartlarini o‘zgartirib ko‘ring.')} />}
    </section>
  )
}

export default TeachersPage
