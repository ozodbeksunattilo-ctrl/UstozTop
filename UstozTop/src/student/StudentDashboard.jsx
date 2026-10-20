import { useEffect, useMemo, useState } from 'react'
import {
  FiArrowLeft, FiArrowRight, FiAward, FiBell, FiBookOpen, FiCalendar,
  FiCheckCircle, FiChevronDown, FiChevronRight, FiClock, FiLogOut,
  FiMenu, FiMoon, FiSearch, FiSettings, FiStar, FiSun, FiTrendingUp, FiUser, FiUsers, FiX, FiZap,
} from 'react-icons/fi'
import logo from '../assets/UstozTop.jpg'
import { translate as t } from '../i18n.js'
import SubjectBackdrop from './SubjectBackdrop.jsx'
import { leaderboard, lessons, subjects, teachers } from './studentData.js'
import './student.css'

const navItems = [
  { id: 'overview', label: 'Umumiy', icon: FiTrendingUp },
  { id: 'lessons', label: 'Darslar va fanlar', icon: FiCalendar },
]

const AI_CHAT_URL = import.meta.env.VITE_AI_CHAT_URL || 'http://localhost:5174/'
const ENROLLMENTS_KEY = 'ustoztop-course-enrollments'
const LESSON_TIMES = ['08:00', '10:00', '14:00', '16:00', '18:00']

function getDateLabel(language, date) {
  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'uz-Cyrl' ? 'uz-Cyrl-UZ' : 'uz-UZ'
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function getLocalDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function getGreeting(hour = new Date().getHours()) {
  if (hour < 5) return 'Xayrli tun,'
  if (hour < 11) return 'Xayrli tong,'
  if (hour < 17) return 'Xayrli kun,'
  if (hour < 22) return 'Xayrli kech,'
  return 'Xayrli tun,'
}

function getLessonKey(lesson) {
  return `${lesson.subjectId}|${lesson.time}`
}

function getSubjectMetrics(subject, completedLessonKeys) {
  const extraCompleted = lessons.filter((lesson) => (
    lesson.subjectId === subject.id && completedLessonKeys.has(getLessonKey(lesson))
  )).length
  const completed = Math.min(subject.total, subject.completed + extraCompleted)
  return { completed, progress: Math.min(100, Math.round((completed / subject.total) * 100)) }
}

function getEnrollmentRecords() {
  const stored = localStorage.getItem(ENROLLMENTS_KEY)
  if (!stored) return []
  const parsed = JSON.parse(stored)
  const valid = Array.isArray(parsed) && parsed.every((item) => (
    item && typeof item.email === 'string' && typeof item.fullName === 'string'
    && typeof item.grade === 'string' && LESSON_TIMES.includes(item.time)
    && typeof item.subjectId === 'string'
  ))
  if (!valid) throw new Error('Darsga yozilish ma’lumotlari noto‘g‘ri formatda saqlangan.')
  const current = parsed.filter((item) => subjects.some((subject) => subject.id === item.subjectId))
  if (current.length !== parsed.length) localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(current))
  return current
}

function getEnrolledSubjectIds(email, registrations) {
  const stored = localStorage.getItem(`ustoztop-enrolled-subjects:${email}`)
  if (!stored) return [...new Set(registrations.filter((item) => item.email === email).map((item) => item.subjectId))]
  const parsed = JSON.parse(stored)
  if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== 'string')) {
    throw new Error('Fanlarga yozilish ma’lumotlari noto‘g‘ri formatda saqlangan.')
  }
  const current = [...new Set([
    ...parsed.filter((id) => subjects.some((subject) => subject.id === id)),
    ...registrations.filter((item) => item.email === email).map((item) => item.subjectId),
  ])]
  if (current.length !== parsed.length) localStorage.setItem(`ustoztop-enrolled-subjects:${email}`, JSON.stringify(current))
  return current
}

function ProgressChart() {
  return (
    <svg className="student-chart" viewBox="0 0 620 170" role="img" aria-label="Oxirgi haftalardagi o‘qish faolligi o‘sishi">
      <defs>
        <linearGradient id="student-chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8054ff" stopOpacity=".28" />
          <stop offset="100%" stopColor="#8054ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[28, 68, 108, 148].map((y) => <line key={y} x1="0" y1={y} x2="620" y2={y} stroke="#a6a8c7" strokeOpacity=".09" strokeDasharray="3 5" />)}
      <path d="M0 129 C35 124 38 105 75 111 S122 132 163 102 S213 65 247 77 S300 96 339 62 S388 69 425 46 S481 60 523 33 S575 56 620 26 V170 H0Z" fill="url(#student-chart-fill)" />
      <path d="M0 129 C35 124 38 105 75 111 S122 132 163 102 S213 65 247 77 S300 96 339 62 S388 69 425 46 S481 60 523 33 S575 56 620 26" fill="none" stroke="#a17cff" strokeWidth="2.5" />
      <path d="M0 138 C40 135 65 111 102 119 S147 125 186 111 S230 98 268 105 S323 112 361 86 S412 93 449 71 S501 78 542 56 S588 61 620 47" fill="none" stroke="#42c8d5" strokeWidth="1.5" strokeOpacity=".83" />
    </svg>
  )
}

function TeacherAvatar({ teacher, size = 'normal' }) {
  return (
    <span
      className={`teacher-avatar ${size === 'large' ? 'teacher-avatar-large' : ''}`}
      style={{ '--avatar-color': teacher.color }}
      aria-label={teacher.name}
    >
      {teacher.initials}
    </span>
  )
}

function SubjectCard({ subject, teacher, onClick, language, completed, progress, enrolled }) {
  return (
    <button type="button" className="subject-card" onClick={() => onClick(subject)} style={{ '--subject-accent': subject.color }}>
      <span className="subject-card-icon">{subject.icon}</span>
      <span className="subject-card-title">{t(language, subject.name)}</span>
      <span className="subject-card-meta">{completed}/{subject.total} {t(language, 'ta dars')} · {progress}%</span>
      <span className="subject-progress-track"><span style={{ width: `${progress}%` }} /></span>
      <span className="subject-card-footer"><span>{teacher.name}</span><span className={enrolled ? 'subject-enrollment-status is-enrolled' : 'subject-enrollment-status'}>{t(language, enrolled ? 'Yozilgansiz' : 'Yozilish')} <FiArrowRight aria-hidden="true" /></span></span>
    </button>
  )
}

function LessonRow({ lesson, subject, teacher, language, completed, onToggleComplete }) {
  return (
    <div className={`lesson-row ${completed ? 'lesson-row-completed' : ''}`} style={{ '--subject-accent': subject.color }}>
      <span className="lesson-accent" />
      <span className="lesson-time"><strong>{t(language, lesson.time)}</strong><span>{t(language, lesson.duration)}</span></span>
      <span className="lesson-description">
        <strong>{t(language, lesson.topic)}</strong>
        <span>{teacher.name} · {t(language, subject.name)}</span>
      </span>
      <span className={`lesson-status ${completed || lesson.status === 'Keyingi dars' ? 'lesson-status-next' : ''}`}>{t(language, completed ? 'Bajarildi' : lesson.status)}</span>
      <button type="button" className="lesson-complete-button" onClick={() => onToggleComplete(lesson)} aria-label={t(language, completed ? 'Darsni bajarilmagan deb belgilash' : 'Darsni bajarildi deb belgilash')} title={t(language, completed ? 'Darsni bajarilmagan deb belgilash' : 'Darsni bajarildi deb belgilash')}>
        <FiCheckCircle aria-hidden="true" />
      </button>
    </div>
  )
}

function SubjectDetail({ subject, teacher, onBack, onTeacherClick, language, completedLessonKeys, enrolled, registrations, userEmail, onRequestEnrollment }) {
  const relatedLessons = lessons.filter((lesson) => lesson.subjectId === subject.id)
  const groupMembers = registrations.filter((registration) => registration.subjectId === subject.id)
  const currentRegistration = registrations.find((registration) => registration.subjectId === subject.id && registration.email === userEmail)
  const metrics = getSubjectMetrics(subject, completedLessonKeys)
  return (
    <section className="student-detail">
      <button type="button" className="student-back" onClick={onBack}><FiArrowLeft aria-hidden="true" /> {t(language, 'Barcha fanlar')}</button>
      <div className="subject-hero" style={{ '--subject-accent': subject.color }}>
        <SubjectBackdrop subject={subject} />
        <div className="subject-hero-copy">
          <span className="subject-category">{t(language, subject.category)}</span>
          <h1>{t(language, subject.name)}</h1>
          <p>{subject.total} {t(language, 'ta dars rejalashtirilgan')} · {metrics.completed} {t(language, 'tasi yakunlangan')}</p>
          <span className="subject-hero-progress"><span style={{ width: `${metrics.progress}%` }} /></span>
          <strong>{metrics.progress}% {t(language, 'o‘zlashtirildi')}</strong>
          <button type="button" className={`subject-enroll-button ${enrolled ? 'subject-enroll-button-active' : ''}`} onClick={() => onRequestEnrollment(subject)}>
            {t(language, enrolled ? 'Yozilishni bekor qilish' : 'Ustoz bilan darsga yozilish')}
            <FiArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="student-detail-grid">
        <section className="student-card detail-topics">
          <div className="student-card-heading"><div><h2>{t(language, 'O‘quv dasturi')}</h2><p>{t(language, 'Fan bo‘yicha o‘rganiladigan mavzular')}</p></div><FiBookOpen aria-hidden="true" /></div>
          {subject.topics.map((topic, index) => (
            <div className="topic-row" key={topic}>
              <span className={`topic-number ${index < 2 ? 'topic-done' : ''}`}>{index < 2 ? <FiCheckCircle aria-label="Yakunlangan" /> : String(index + 1).padStart(2, '0')}</span>
              <span>{t(language, topic)}</span>
              <FiChevronRight aria-hidden="true" className="student-muted-icon" />
            </div>
          ))}
        </section>
        <div className="student-detail-aside">
          <button type="button" className="student-card teacher-detail-card" onClick={() => onTeacherClick(teacher)}>
            <div className="student-card-heading"><div><h2>{t(language, 'Fan ustozi')}</h2><p>{t(language, 'Ustoz haqida ma’lumot')}</p></div><FiUsers aria-hidden="true" /></div>
            <TeacherAvatar teacher={teacher} size="large" />
            <strong className="teacher-detail-name">{teacher.name}</strong>
            <span className="teacher-detail-qualification">{t(language, teacher.qualification)}</span>
            <span className="teacher-detail-stats"><FiStar aria-hidden="true" /> {teacher.rating} <span>·</span> {teacher.experience} {t(language, 'tajriba')}</span>
            <span className="teacher-detail-link">{t(language, 'Profilni ko‘rish')} <FiArrowRight aria-hidden="true" /></span>
          </button>
          <section className="student-card group-roster">
            <div className="student-card-heading"><div><h2>{t(language, 'Guruh a’zolari')}</h2><p>{groupMembers.length} {t(language, 'nafar yozilgan')}</p></div><FiUsers aria-hidden="true" /></div>
            {groupMembers.length ? groupMembers.map((member) => (
              <div className="group-member-row" key={`${member.email}-${member.subjectId}`}>
                <span className="group-member-avatar">{member.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                <span><strong>{member.fullName}</strong><small>{member.grade} · {member.time}</small></span>
              </div>
            )) : <p className="group-roster-empty">{t(language, 'Bu fanga hali hech kim yozilmagan.')}</p>}
          </section>
          <section className="student-card subject-next">
            <div className="student-card-heading"><div><h2>{t(language, 'Keyingi dars')}</h2><p>{t(language, enrolled ? 'Fan jadvalidagi navbatdagi mashg‘ulot' : 'Yozilgandan keyin dars jadvali ko‘rinadi')}</p></div><FiClock aria-hidden="true" /></div>
            <strong>{t(language, relatedLessons[0]?.topic || subject.nextLesson)}</strong>
            <span>{currentRegistration?.time || relatedLessons[0]?.time || t(language, 'Jadvalda belgilanmagan')}</span>
            <span>{teacher.name} · {t(language, subject.name)}</span>
          </section>
        </div>
      </div>
    </section>
  )
}

function TeacherDetail({ teacher, onBack, language }) {
  const taughtSubjects = subjects.filter((subject) => subject.teacherId === teacher.id)
  return (
    <section className="student-detail">
      <button type="button" className="student-back" onClick={onBack}><FiArrowLeft aria-hidden="true" /> {t(language, 'Ustozlar ro‘yxati')}</button>
      <div className="student-card teacher-profile">
        <TeacherAvatar teacher={teacher} size="large" />
        <div className="teacher-profile-info">
          <span className="subject-category">{t(language, 'USTOZ PROFILI · DEMO MA’LUMOT')}</span>
          <h1>{teacher.name}</h1>
          <p>{t(language, teacher.qualification)}</p>
          <div className="teacher-profile-stats"><span><FiStar aria-hidden="true" /> {teacher.rating} {t(language, 'reyting')}</span><span><FiAward aria-hidden="true" /> {teacher.experience} {t(language, 'tajriba')}</span><span><FiUsers aria-hidden="true" /> {teacher.students.toLocaleString(language === 'ru' ? 'ru-RU' : 'uz-UZ')}+ {t(language, 'o‘quvchi')}</span></div>
        </div>
      </div>
      <div className="student-detail-grid">
        <section className="student-card detail-topics"><div className="student-card-heading"><div><h2>{t(language, 'Ustoz haqida')}</h2><p>{t(language, 'Ta’lim uslubi va tajribasi')}</p></div><FiUsers aria-hidden="true" /></div><p className="teacher-about">{t(language, teacher.about)}</p><div className="teacher-qualification"><FiAward aria-hidden="true" /> {t(language, teacher.qualification)}</div></section>
        <section className="student-card detail-topics"><div className="student-card-heading"><div><h2>{t(language, 'O‘qitadigan fanlari')}</h2><p>{t(language, 'Fanlar')}: {taughtSubjects.length}</p></div><FiBookOpen aria-hidden="true" /></div>{taughtSubjects.map((subject) => <div className="topic-row" key={subject.id}><span className="topic-number" style={{ color: subject.color }}>{subject.icon}</span><span>{t(language, subject.name)}</span><span className="topic-progress">{subject.progress}%</span></div>)}</section>
      </div>
    </section>
  )
}

function StudentDashboard({ user, onLogout, onProfileUpdate, language, onLanguageChange, theme, onThemeToggle }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [dismissedLessonNoticeDate, setDismissedLessonNoticeDate] = useState(
    () => localStorage.getItem(`ustoztop-dismissed-lesson-notice:${user.email}`) || '',
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileName, setProfileName] = useState(user.fullName)
  const [profileEditing, setProfileEditing] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [registrations, setRegistrations] = useState(getEnrollmentRecords)
  const [enrolledSubjectIds, setEnrolledSubjectIds] = useState(() => getEnrolledSubjectIds(user.email, registrations))
  const [enrollmentSubject, setEnrollmentSubject] = useState(null)
  const [enrollmentName, setEnrollmentName] = useState(user.fullName)
  const [enrollmentGrade, setEnrollmentGrade] = useState('7-sinf')
  const [enrollmentTime, setEnrollmentTime] = useState('14:00')
  const [completedLessonKeys, setCompletedLessonKeys] = useState(() => {
    const stored = localStorage.getItem(`ustoztop-demo-lessons:${user.email}`)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed) || parsed.some((key) => typeof key !== 'string')) {
      throw new Error('Darslar holati noto‘g‘ri formatda saqlangan.')
    }
    return parsed
  })
  const completedSet = useMemo(() => new Set(completedLessonKeys), [completedLessonKeys])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const filteredSubjects = useMemo(() => subjects.filter((subject) => {
    const searchableText = [subject.name, t(language, subject.name), subject.category, t(language, subject.category), subject.nextLesson, t(language, subject.nextLesson)].join(' ')
    const matchesSearch = searchableText.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    return matchesSearch && (subjectFilter === 'all' || subject.category === subjectFilter)
  }), [language, search, subjectFilter])
  const teacherById = (teacherId) => teachers.find((teacher) => teacher.id === teacherId) || teachers[0]
  const enrolledSubjects = subjects.filter((subject) => enrolledSubjectIds.includes(subject.id))
  const enrolledLessons = enrolledSubjects.map((subject) => {
    const registration = registrations.find((item) => item.email === user.email && item.subjectId === subject.id)
    const scheduledLesson = lessons.find((lesson) => lesson.subjectId === subject.id)
    return scheduledLesson
      ? { ...scheduledLesson, time: registration?.time || scheduledLesson.time }
      : { subjectId: subject.id, topic: subject.nextLesson, teacherId: subject.teacherId, time: registration?.time || 'Jadval belgilanmoqda', duration: '45 daqiqa', status: 'Yangi dars', daysOfWeek: [1, 3, 5] }
  })
  const todayLessons = enrolledLessons.filter((lesson) => lesson.daysOfWeek.includes(now.getDay()))
  const todayLessonNotice = todayLessons.map((lesson) => {
    const subject = subjects.find((item) => item.id === lesson.subjectId)
    return `${t(language, subject.name)} · ${lesson.time}`
  }).join(', ')
  const notificationDate = getLocalDateKey(now)
  const automaticNotice = todayLessonNotice && dismissedLessonNoticeDate !== notificationDate
    ? `${t(language, 'Bugun dars bor')}: ${todayLessonNotice}`
    : ''
  const doneLessons = enrolledSubjects.reduce((sum, subject) => sum + subject.completed, 0) + completedLessonKeys.filter((key) => enrolledSubjectIds.some((id) => key.startsWith(`${id}|`))).length
  const allLessons = enrolledSubjects.reduce((sum, subject) => sum + subject.total, 0)
  const points = 2480 + completedLessonKeys.length * 20
  const numberLocale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ'
  const rankings = [
    ...leaderboard.filter((person) => !person.current).map((person) => ({ ...person, value: Number(person.points.replace(/\s/g, '')) })),
    { name: user.fullName, points: points.toLocaleString(numberLocale), value: points, current: true },
  ].sort((first, second) => second.value - first.value)
  const rank = rankings.findIndex((person) => person.current) + 1

  function openSubject(subject) {
    setSelectedTeacher(null)
    setSelectedSubject(subject)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openTeacher(teacher) {
    setSelectedSubject(null)
    setSelectedTeacher(teacher)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectTab(tab) {
    setActiveTab(tab)
    setMobileMenuOpen(false)
    setSelectedSubject(null)
    setSelectedTeacher(null)
    setSearch('')
    setProfileEditing(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function saveProfile(event) {
    event.preventDefault()
    const fullName = profileName.trim().replace(/\s+/g, ' ')
    if (fullName.length < 2) {
      setNotice(t(language, 'Ism kamida 2 ta belgidan iborat bo‘lsin.'))
      return
    }
    try {
      onProfileUpdate({ fullName })
      setProfileName(fullName)
      setProfileEditing(false)
      setNotice(t(language, 'Profilingiz saqlandi.'))
    } catch (error) {
      setNotice(t(language, error instanceof Error ? error.message : 'Profilni saqlab bo‘lmadi.'))
    }
  }

  function toggleLessonComplete(lesson) {
    const key = getLessonKey(lesson)
    setCompletedLessonKeys((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
      localStorage.setItem(`ustoztop-demo-lessons:${user.email}`, JSON.stringify(next))
      return next
    })
  }

  function requestEnrollment(subject) {
    const isEnrolled = enrolledSubjectIds.includes(subject.id)
    if (!isEnrolled) {
      setEnrollmentName(user.fullName)
      setEnrollmentGrade('7-sinf')
      setEnrollmentTime('14:00')
      setEnrollmentSubject(subject)
      return
    }

    const next = enrolledSubjectIds.filter((id) => id !== subject.id)
    const nextRegistrations = registrations.filter((item) => !(item.email === user.email && item.subjectId === subject.id))
    try {
      localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(nextRegistrations))
      localStorage.setItem(`ustoztop-enrolled-subjects:${user.email}`, JSON.stringify(next))
      setRegistrations(nextRegistrations)
      setEnrolledSubjectIds(next)
      setNotice(t(language, 'Ustoz darsiga yozilish bekor qilindi.'))
    } catch (error) {
      setNotice(t(language, error instanceof Error ? error.message : 'Ustoz darsiga yozib bo‘lmadi.'))
    }
  }

  function submitEnrollment(event) {
    event.preventDefault()
    if (!enrollmentSubject) return
    const fullName = enrollmentName.trim().replace(/\s+/g, ' ')
    if (fullName.split(' ').length < 2) {
      setNotice(t(language, 'Ism va familiyangizni kiriting.'))
      return
    }
    const registration = {
      email: user.email,
      fullName,
      grade: enrollmentGrade,
      time: enrollmentTime,
      subjectId: enrollmentSubject.id,
      teacherId: enrollmentSubject.teacherId,
    }
    const nextRegistrations = [
      ...registrations.filter((item) => !(item.email === user.email && item.subjectId === enrollmentSubject.id)),
      registration,
    ]
    const nextSubjectIds = [...new Set([...enrolledSubjectIds, enrollmentSubject.id])]
    try {
      localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(nextRegistrations))
      localStorage.setItem(`ustoztop-enrolled-subjects:${user.email}`, JSON.stringify(nextSubjectIds))
      setRegistrations(nextRegistrations)
      setEnrolledSubjectIds(nextSubjectIds)
      setEnrollmentSubject(null)
      setNotice(t(language, 'Ustoz darsiga muvaffaqiyatli yozildingiz.'))
    } catch (error) {
      setNotice(t(language, error instanceof Error ? error.message : 'Ustoz darsiga yozib bo‘lmadi.'))
    }
  }

  const today = getDateLabel(language, now)
  const averageProgress = enrolledSubjects.length
    ? Math.round(enrolledSubjects.reduce((sum, subject) => sum + getSubjectMetrics(subject, completedSet).progress, 0) / enrolledSubjects.length)
    : 0

  return (
    <main className="student-app" data-theme={theme}>
      <header className="student-topbar">
        <a className="student-brand" href="#overview" onClick={(event) => { event.preventDefault(); selectTab('overview') }} aria-label={`UstozTop ${t(language, 'Bosh sahifa')}`}>
          <img src={logo} alt="" />
          <span>UstozTop</span>
        </a>
        <button type="button" className="student-mobile-menu-toggle" aria-label={t(language, mobileMenuOpen ? 'Menyuni yopish' : 'Menyuni ochish')} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
        </button>
        <nav className={`student-nav ${mobileMenuOpen ? 'student-nav-open' : ''}`} aria-label={t(language, 'O‘quvchi bo‘limlari')}>
          {navItems.map(({ id, label }) => (
            <button type="button" key={id} onClick={() => selectTab(id)} className={`student-nav-link ${activeTab === id && !selectedSubject && !selectedTeacher ? 'student-nav-active' : ''}`}>
              {t(language, label)}
            </button>
          ))}
          <label className="student-search student-mobile-search"><FiSearch aria-hidden="true" /><input aria-label={t(language, 'Fanlarni qidirish')} placeholder={t(language, 'Qidirish...')} value={search} onChange={(event) => { setSearch(event.target.value); setActiveTab('lessons'); setSelectedSubject(null); setSelectedTeacher(null); setMobileMenuOpen(false) }} /><kbd>⌘ K</kbd></label>
          <button type="button" className="student-mobile-menu-action" onClick={() => selectTab('profile')}><FiUser aria-hidden="true" />{t(language, 'Mening profilim')}</button>
          <button type="button" className="student-mobile-menu-action" onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false) }}><FiSettings aria-hidden="true" />{t(language, 'Sozlamalar')}</button>
          <button type="button" className="student-mobile-menu-action" onClick={onLogout}><FiLogOut aria-hidden="true" />{t(language, 'Chiqish')}</button>
        </nav>
        <label className="student-search student-desktop-search"><FiSearch aria-hidden="true" /><input aria-label={t(language, 'Fanlarni qidirish')} placeholder={t(language, 'Qidirish...')} value={search} onChange={(event) => { setSearch(event.target.value); setActiveTab('lessons'); setSelectedSubject(null); setSelectedTeacher(null) }} /><kbd>⌘ K</kbd></label>
        <div className="student-top-actions">
          <a className="student-ai-launcher" href={AI_CHAT_URL} aria-label={t(language, 'UstozTop AI')} title={t(language, 'AI bilan suhbat')}>
            <span className="student-ai-logo"><FiZap aria-hidden="true" /></span>
            <span className="student-ai-launcher-label">AI<small>{t(language, 'Suhbat')}</small></span>
          </a>
          <button type="button" className="student-icon-button student-notifications" aria-label={t(language, 'Bildirishnomalar')} onClick={() => setNotice(todayLessonNotice ? `${t(language, 'Bugungi darslaringiz')}: ${todayLessonNotice}` : t(language, 'Bugun dars rejalashtirilmagan.'))}><FiBell aria-hidden="true" /></button>
          <label className="student-language-select-wrap"><span className="sr-only">{t(language, 'Til va mavzuni tanlash')}</span><select className="student-language-select" aria-label={t(language, 'Til va mavzuni tanlash')} value={language} onChange={(event) => onLanguageChange(event.target.value)}><option value="uz">{t(language, 'O‘zbekcha')}</option><option value="ru">{t(language, 'Русский')}</option><option value="uz-Cyrl">{t(language, 'O‘zbekcha (kirill)')}</option><option value="en">{t(language, 'English')}</option></select></label>
          <button type="button" className="student-icon-button student-theme-toggle" aria-label={t(language, theme === 'dark' ? 'Yorug‘ mavzuga o‘tish' : 'Qorong‘i mavzuga o‘tish')} onClick={onThemeToggle}>{theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}</button>
          <button type="button" className="student-user-avatar" aria-label={t(language, 'Mening profilim')} onClick={() => selectTab('profile')}>{user.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</button><button type="button" className="student-user-name student-user-name-button" onClick={() => selectTab('profile')}>{user.fullName.split(/\s+/)[0]}<small>{t(language, 'O‘quvchi')}</small></button><button type="button" className="student-icon-button student-settings-button" aria-label={t(language, 'Sozlamalar')} onClick={() => setSettingsOpen(true)}><FiSettings aria-hidden="true" /></button><button type="button" className="student-icon-button student-logout" aria-label={t(language, 'Chiqish')} onClick={onLogout}><FiLogOut aria-hidden="true" /></button>
        </div>
      </header>

      <div className="student-content">
        {(notice || automaticNotice) && <div className="student-notice" role="status">{notice || automaticNotice}<button type="button" aria-label={t(language, 'Yopish')} onClick={() => {
          if (automaticNotice) {
            setDismissedLessonNoticeDate(notificationDate)
            localStorage.setItem(`ustoztop-dismissed-lesson-notice:${user.email}`, notificationDate)
          }
          setNotice('')
        }}><FiX aria-hidden="true" /></button></div>}
        {settingsOpen && (
          <div className="student-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false) }}>
            <section className="student-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="student-settings-title">
              <div className="student-card-heading"><div><h2 id="student-settings-title">{t(language, 'Sozlamalar')}</h2><p>{t(language, 'Til, ko‘rinish va akkaunt sozlamalari')}</p></div><button type="button" className="student-icon-button" aria-label={t(language, 'Yopish')} onClick={() => setSettingsOpen(false)}><FiX aria-hidden="true" /></button></div>
              <label className="settings-field">{t(language, 'Interfeys tili')}<select value={language} onChange={(event) => onLanguageChange(event.target.value)}><option value="uz">{t(language, 'UZ — lotin')}</option><option value="ru">{t(language, 'RU — ruscha')}</option><option value="uz-Cyrl">{t(language, 'ЎЗ — кирилл')}</option><option value="en">{t(language, 'EN — English')}</option></select></label>
              <div className="settings-theme-row"><span>{t(language, 'Ko‘rinish')}</span><button type="button" className="settings-theme-button" onClick={onThemeToggle}>{theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}{t(language, theme === 'dark' ? 'Yorug‘ mavzu' : 'Qorong‘i mavzu')}</button></div>
              <p className="settings-hint">{t(language, 'Sozlamalar ushbu brauzerda saqlanadi.')}</p>
            </section>
          </div>
        )}
        {enrollmentSubject && (
          <div className="student-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEnrollmentSubject(null) }}>
            <section className="student-enrollment-dialog" role="dialog" aria-modal="true" aria-labelledby="student-enrollment-title">
              <div className="student-card-heading">
                <div><h2 id="student-enrollment-title">{t(language, 'Darsga yozilish')}</h2><p>{t(language, enrollmentSubject.name)} · {teacherById(enrollmentSubject.teacherId).name}</p></div>
                <button type="button" className="student-icon-button" aria-label={t(language, 'Yopish')} onClick={() => setEnrollmentSubject(null)}><FiX aria-hidden="true" /></button>
              </div>
              <form className="student-enrollment-form" onSubmit={submitEnrollment}>
                <label>{t(language, 'Ism va familiya')}<input autoComplete="name" value={enrollmentName} onChange={(event) => setEnrollmentName(event.target.value)} required /></label>
                <label>{t(language, 'Sinf / guruh')}<select value={enrollmentGrade} onChange={(event) => setEnrollmentGrade(event.target.value)} required>{Array.from({ length: 11 }, (_, index) => `${index + 1}-sinf`).map((grade) => <option key={grade} value={grade}>{language === 'ru' ? `${grade.replace('-sinf', '')} класс` : language === 'en' ? `Grade ${grade.replace('-sinf', '')}` : t(language, grade)}</option>)}</select></label>
                <label>{t(language, 'Dars vaqti')}<select value={enrollmentTime} onChange={(event) => setEnrollmentTime(event.target.value)} required>{LESSON_TIMES.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
                <div className="student-enrollment-actions">
                  <button type="button" className="profile-cancel" onClick={() => setEnrollmentSubject(null)}>{t(language, 'Bekor qilish')}</button>
                  <button type="submit" className="profile-save">{t(language, 'Darsga yozilish')}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {selectedSubject ? (
          <SubjectDetail subject={selectedSubject} teacher={teacherById(selectedSubject.teacherId)} onBack={() => setSelectedSubject(null)} onTeacherClick={openTeacher} language={language} completedLessonKeys={completedSet} enrolled={enrolledSubjectIds.includes(selectedSubject.id)} registrations={registrations} userEmail={user.email} onRequestEnrollment={requestEnrollment} />
        ) : selectedTeacher ? (
          <TeacherDetail teacher={selectedTeacher} onBack={() => setSelectedTeacher(null)} language={language} />
        ) : (
          <>
            {activeTab !== 'profile' && <div className="student-page-heading">
              <div><span className="student-eyebrow">{t(language, 'O‘quvchi ish maydoni')}</span><h1>{activeTab === 'overview' ? `${t(language, getGreeting(now.getHours()))} ${user.fullName.split(' ')[0]}` : t(language, 'Darslar va fanlar')}</h1><p>{t(language, activeTab === 'overview' ? 'Bugungi kichik qadam — ertangi katta natija. O‘rganishda davom eting.' : 'Fanlarni ko‘rib chiqing, ustozni tanlang va darsga yoziling.')}</p></div>
              <span className="student-date"><FiCalendar aria-hidden="true" /> {today}</span>
            </div>}

            {activeTab === 'overview' && (
              <>
                <section className="student-stats-grid" aria-label={t(language, 'O‘qish natijalari')}>
                  <article className="student-stat"><span>{t(language, 'Jami ball')} <FiZap aria-hidden="true" /></span><strong>{points.toLocaleString(numberLocale)}</strong><small>+{completedLessonKeys.length * 20} {t(language, 'qo‘shimcha ball')}</small></article>
                  <article className="student-stat"><span>{t(language, 'Guruhdagi o‘rin')} <FiAward aria-hidden="true" /></span><strong>{rank} / 10</strong><small>{t(language, 'Darslar bo‘yicha')}</small></article>
                  <article className="student-stat"><span>{t(language, 'Davomat')} <FiCalendar aria-hidden="true" /></span><strong>{enrolledSubjects.length ? '96%' : '—'}</strong><small>{enrolledSubjects.length ? `${doneLessons} / ${allLessons} ${t(language, 'dars')}` : t(language, 'Fanga yozilib dars boshlang')}</small></article>
                  <article className="student-stat"><span>{t(language, 'Topshiriqlar')} <FiCheckCircle aria-hidden="true" /></span><strong>18 / 20</strong><small>90% {t(language, 'bajarildi')}</small></article>
                </section>

                <div className="student-main-grid">
                  <div className="student-main-column">
                    <section className="student-card student-progress-card">
                      <div className="student-card-heading"><div><h2>{t(language, 'O‘sishingiz — raqamlarda')}</h2><p>{t(language, 'O‘qish davomidagi shaxsiy o‘sish natijalaringiz')}</p></div><button type="button" className="student-period" onClick={() => setNotice(t(language, 'Grafik oxirgi 6 oylik demo natijalarni ko‘rsatmoqda.'))}>{t(language, 'Shu oy')} <FiChevronDown aria-hidden="true" /></button></div>
                      <div className="chart-legend"><span><i className="legend-purple" /> {t(language, 'Sizning natijalaringiz')}</span><span><i className="legend-cyan" /> {t(language, 'Guruh o‘rtachasi')}</span><strong>↑ {averageProgress}% {t(language, 'o‘sish')}</strong></div>
                      <ProgressChart />
                      <div className="chart-months"><span>01 okt</span><span>04 okt</span><span>07 okt</span><span>10 okt</span><span>13 okt</span><span>16 okt</span><span>19 okt</span></div>
                    </section>

                    <section className="student-card student-lessons-card">
                      <div className="student-card-heading"><div><h2>{t(language, 'Bugungi darslar')}</h2><p>{t(language, 'Yozilgan fanlaringiz bo‘yicha jadval')}</p></div><button type="button" className="student-text-link" onClick={() => selectTab('lessons')}>{t(language, 'Fanlarni ko‘rish')} <FiArrowRight aria-hidden="true" /></button></div>
                      {todayLessons.length ? (
                        <div className="lesson-list">{todayLessons.map((lesson) => <LessonRow key={`${lesson.subjectId}-${lesson.time}`} lesson={lesson} subject={subjects.find((subject) => subject.id === lesson.subjectId)} teacher={teacherById(lesson.teacherId)} language={language} completed={completedSet.has(getLessonKey(lesson))} onToggleComplete={toggleLessonComplete} />)}</div>
                      ) : (
                        <div className="student-enrollment-empty"><p>{t(language, enrolledLessons.length ? 'Bugun dars rejalashtirilmagan.' : 'Hozircha darsga yozilmagansiz.')}</p>{!enrolledLessons.length && <button type="button" onClick={() => selectTab('lessons')}>{t(language, 'Fan tanlash va yozilish')} <FiArrowRight aria-hidden="true" /></button>}</div>
                      )}
                    </section>

                    <section className="student-card student-subjects-card">
                      <div className="student-card-heading"><div><h2>{t(language, 'Fanlaringiz')}</h2><p>{subjects.length} {t(language, 'ta fan')} · {t(language, 'Fanlarni tanlab ustozga yoziling.')}</p></div><button type="button" className="student-text-link" onClick={() => selectTab('lessons')}>{t(language, 'Barcha fanlar')} <FiArrowRight aria-hidden="true" /></button></div>
                      <div className="student-subjects-grid">{subjects.slice(0, 4).map((subject) => <SubjectCard key={subject.id} subject={subject} teacher={teacherById(subject.teacherId)} onClick={openSubject} language={language} enrolled={enrolledSubjectIds.includes(subject.id)} {...getSubjectMetrics(subject, completedSet)} />)}</div>
                    </section>

                    <section className="student-card student-recent-card">
                      <div className="student-card-heading"><div><h2>{t(language, 'So‘nggi natijalar')}</h2><p>{t(language, 'Fanlar kesimidagi o‘zlashtirish')}</p></div><span className="student-muted-label">{t(language, 'Baholash: 30 ball')}</span></div>
                      <div className="recent-results">{subjects.slice(0, 3).map((subject) => <button type="button" key={subject.id} onClick={() => openSubject(subject)}><i style={{ background: subject.color }} />{t(language, subject.name)}<strong>{Math.round(subject.progress * 0.3)}<span>/30</span></strong></button>)}</div>
                    </section>
                  </div>

                  <aside className="student-side-column">
                    <section className="student-card student-ai-card">
                      <div className="student-card-heading"><div><h2><FiZap aria-hidden="true" /> {t(language, 'UstozTop AI')}</h2><p>{t(language, 'Savol bering yoki rasm yuboring')}</p></div><FiClock aria-hidden="true" /></div>
                      <div className="ai-welcome"><span className="ai-orb" /><span><strong>{t(language, 'Birga tushunamiz.')}</strong><small>{t(language, 'Matn, rasm yoki kamera orqali savol yuboring.')}</small></span></div>
                      <a className="ai-chat-link" href={AI_CHAT_URL}>{t(language, 'AI sahifasini ochish')} <FiArrowRight aria-hidden="true" /></a>
                    </section>

                    <section className="student-card student-leaderboard">
                      <div className="student-card-heading"><div><h2>{t(language, 'Guruh reytingi')}</h2><p>{rankings.length} {t(language, 'nafar o‘quvchi')} · {t(language, 'Yagona reyting')}</p></div><FiAward aria-hidden="true" /></div>
                      <div className="leaderboard-scroll">{rankings.map((person, index) => <div key={person.name} className={`leader-row ${person.current ? 'leader-current' : ''}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{person.name}{person.current ? ` · ${t(language, 'Siz')}` : ''}</strong><span>{person.points}</span></div>)}</div>
                      <small className="leader-caption">{t(language, 'Reyting demo ma’lumotlar asosida ko‘rsatilgan')}</small>
                    </section>
                  </aside>
                </div>
              </>
            )}

            {activeTab === 'lessons' && (
              <div className="student-listing-layout">
                <section className="student-card student-listing-main"><div className="student-card-heading"><div><h2>{t(language, search ? 'Qidiruv natijalari' : 'Barcha fanlar')}</h2><p>{filteredSubjects.length} {t(language, 'ta fan')} · {enrolledSubjectIds.length} {t(language, 'tasiga yozilgansiz')}</p></div><FiBookOpen aria-hidden="true" /></div>
                  <label className="subject-filter">{t(language, 'Fan turini tanlang')}<select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="all">{t(language, 'Barcha fanlar')}</option>{[...new Set(subjects.map((subject) => subject.category))].map((category) => <option key={category} value={category}>{t(language, category)}</option>)}</select></label>
                  {filteredSubjects.length ? <div className="student-subjects-grid student-all-subjects">{filteredSubjects.map((subject) => <SubjectCard key={subject.id} subject={subject} teacher={teacherById(subject.teacherId)} onClick={openSubject} language={language} enrolled={enrolledSubjectIds.includes(subject.id)} {...getSubjectMetrics(subject, completedSet)} />)}</div> : <p className="student-empty">{t(language, 'Bu qidiruv bo‘yicha fan topilmadi.')}</p>}
                </section>
                <section className="student-card student-listing-schedule">
                  <div className="student-card-heading"><div><h2>{t(language, 'Dars jadvali')}</h2><p>{t(language, 'Siz yozilgan fanlar bo‘yicha darslar')}</p></div><FiCalendar aria-hidden="true" /></div>
                  {enrolledSubjects.length ? (
                    <>
                      {enrolledLessons.length > 0 && <div className="lesson-list">{enrolledLessons.map((lesson) => <LessonRow key={`${lesson.subjectId}-${lesson.time}`} lesson={lesson} subject={subjects.find((subject) => subject.id === lesson.subjectId)} teacher={teacherById(lesson.teacherId)} language={language} completed={completedSet.has(getLessonKey(lesson))} onToggleComplete={toggleLessonComplete} />)}</div>}
                    </>
                  ) : (
                    <p className="student-empty">{t(language, 'Hozircha dars jadvalingiz bo‘sh. Fanga kirib darsga yoziling.')}</p>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'profile' && (
              <section className="student-card student-profile-page">
                <div className="student-card-heading"><div><h2>{t(language, 'Mening profilim')}</h2><p>{t(language, 'Shaxsiy ma’lumotlaringiz va akkaunt sozlamalari')}</p></div><button type="button" className="student-text-link" onClick={() => setSettingsOpen(true)}><FiSettings aria-hidden="true" /> {t(language, 'Sozlamalar')}</button></div>
                <div className="student-profile-hero"><span className="profile-avatar">{user.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{t(language, 'O‘quvchi')} · {t(language, 'UstozTop o‘quvchisi')}</small></span></div>
                {profileEditing ? (
                  <form className="student-profile-form" onSubmit={saveProfile}>
                    <label>{t(language, 'Ism va familiya')}<input value={profileName} onChange={(event) => setProfileName(event.target.value)} required minLength={2} autoComplete="name" /></label>
                    <label>{t(language, 'Email manzil')}<input value={user.email} readOnly /></label>
                    <div className="profile-form-actions"><button type="button" className="profile-cancel" onClick={() => { setProfileName(user.fullName); setProfileEditing(false) }}>{t(language, 'Bekor qilish')}</button><button type="submit" className="profile-save">{t(language, 'Saqlash')}</button></div>
                  </form>
                ) : (
                  <div className="student-profile-details"><div><span>{t(language, 'Ism va familiya')}</span><strong>{user.fullName}</strong></div><div><span>{t(language, 'Email manzil')}</span><strong>{user.email}</strong></div><div><span>{t(language, 'Hisob turi')}</span><strong>{t(language, 'O‘quvchi')}</strong></div></div>
                )}
                {!profileEditing && <button type="button" className="profile-edit" onClick={() => { setProfileName(user.fullName); setProfileEditing(true) }}>{t(language, 'Profilni tahrirlash')} <FiArrowRight aria-hidden="true" /></button>}
              </section>
            )}

          </>
        )}

        <footer className="student-footer"><span>© 2026 UstozTop · {t(language, 'Bilim bilan kelajak sari')}</span><span>{t(language, 'O‘quvchi ish maydoni')} · {t(language, 'Natijaga yo‘naltirilgan ta’lim')}</span><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{t(language, 'Yuqoriga')} <FiArrowRight aria-hidden="true" /></button></footer>
      </div>
    </main>
  )
}

export default StudentDashboard
