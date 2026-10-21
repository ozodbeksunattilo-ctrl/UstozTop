import { useEffect, useState } from 'react'
import {
  FiArrowRight, FiAward, FiBarChart2, FiBell, FiBookOpen, FiCalendar, FiCheckCircle, FiChevronRight, FiClock,
  FiGrid, FiLogOut, FiMenu, FiMoon, FiSun, FiUser, FiUsers, FiX, FiZap,
} from 'react-icons/fi'
import AiChat from '../../../ai/frontend/src/App.jsx'
import { avatarStyle } from '../components/avatar.js'
import { BrandName, LogoMark } from '../components/Brand.jsx'
import Floaters from '../components/Floaters.jsx'
import LanguageSelect from '../components/LanguageSelect.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import { formatClock, formatToday, greetingKey, useNow } from '../components/time.js'
import { Empty, ErrorBox, formatDate, Loading } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import { navigate, usePath } from '../router.js'
import { useApi } from '../useApi.js'
import RatingsPage from './RatingsPage.jsx'
import ResultsPage from './ResultsPage.jsx'
import StudentProfile from './StudentProfile.jsx'
import SubjectBackdrop from './SubjectBackdrop.jsx'
import SubjectsPage from './SubjectsPage.jsx'
import TeachersPage from './TeachersPage.jsx'
import './student.css'
import './studentExtra.css'
import '../components/ui.css'
import '../components/profile.css'

const navItems = [
  { id: 'overview', label: 'Umumiy', icon: FiGrid },
  { id: 'teachers', label: 'Ustozlar', icon: FiUsers },
  { id: 'subjects', label: 'Fanlar', icon: FiBookOpen },
  { id: 'ratings', label: 'Reyting', icon: FiAward },
  { id: 'results', label: 'Natijalar', icon: FiBarChart2 },
  { id: 'ai', label: 'AI yordamchi', icon: FiZap },
  { id: 'profile', label: 'Mening profilim', icon: FiUser },
]

const HEADINGS = {
  teachers: ['Ustoz qidirish', 'Fan, ism va reyting bo‘yicha ustozni toping va guruhga qo‘shilish uchun so‘rov yuboring.'],
  subjects: ['Fanlar', 'Har bir fanning dasturi, jadvali va ustozlari bilan tanishing.'],
  ratings: ['Reyting', 'Har bir fan guruhi bo‘yicha alohida reyting va ustozlar reytingi.'],
  results: ['Davomat va natijalar', 'Fanlar kesimida baholaringiz va darslarga qatnashishingiz.'],
}

// Har bir bo'lim o'z manziliga ega: F5 va "Orqaga" tugmasi ishlaydi, havolani ulashish mumkin.
const SLUG_TO_TAB = { dashboard: 'overview', teachers: 'teachers', subjects: 'subjects', rating: 'ratings', results: 'results', ai: 'ai', profile: 'profile' }
const TAB_TO_SLUG = { overview: 'dashboard', ratings: 'rating' }
const TAB_TITLES = { overview: 'Umumiy', teachers: 'Ustozlar', subjects: 'Fanlar', ratings: 'Reyting', results: 'Natijalar', ai: 'AI yordamchi', profile: 'Mening profilim' }

const FLOATER_SETS = { overview: 'overview', teachers: 'teachers', subjects: 'subjects', ratings: 'ratings', results: 'results', ai: 'ai', profile: 'profile' }

function Overview({ language, user, onGo, onOpenSubject }) {
  const { data, error, loading, reload } = useApi('/student/dashboard')
  const [boardGroup, setBoardGroup] = useState('')
  // Vidjet kartadagi eng yaxshi o'rin bilan bir xil guruhdan boshlanadi — raqamlar doim mos keladi.
  const bestId = [...(data?.groups || [])].filter((group) => group.rank).sort((a, b) => a.rank - b.rank)[0]?.id
  const groupId = boardGroup || bestId || data?.groups[0]?.id || ''
  const board = useApi(groupId ? `/ratings/students?groupId=${groupId}` : null)
  if (loading && !data) return <Loading language={language} />
  if (error && !data) return <ErrorBox error={error} onRetry={reload} language={language} />
  const { stats, groups, todayLessons, recentResults, pendingRequests = [] } = data
  const top = (board.data?.students || []).slice(0, 5)
  const boardSubject = groups.find((group) => group.id === groupId)

  return (
    <>
      <div>
        {todayLessons.map((group) => (
          <div className="today-banner" key={group.id} style={{ '--accent': group.subject.color }} role="status">
            <span className="today-banner-icon"><FiBell aria-hidden="true" /></span>
            <span className="today-banner-text">
              <strong>{t(language, 'Bugun')} {t(language, group.subject.name)} {t(language, 'darsi bor')}</strong>
              <span>{group.teacher?.fullName ? `${group.teacher.fullName} · ` : ''}{group.name}</span>
            </span>
            <span className="today-banner-time">{group.lessonTime}</span>
          </div>
        ))}
      </div>

      <section className="student-stats-grid student-stats-five" aria-label={t(language, 'O‘qish natijalari')}>
        <article className="student-stat"><span>{t(language, 'Jami ball')} <FiZap aria-hidden="true" /></span><strong>{stats.points}</strong><small>{stats.assessmentCount} {t(language, 'ta baho')}</small></article>
        <article className="student-stat"><span>{t(language, 'Eng yaxshi o‘rin')} <FiAward aria-hidden="true" /></span><strong>{stats.rank ? `#${stats.rank}` : '—'}</strong><small>{bestId ? `${t(language, groups.find((group) => group.id === bestId).subject.name)} · ${groups.find((group) => group.id === bestId).totalStudents} ${t(language, 'nafar o‘quvchi')}` : t(language, 'Guruhga qo‘shiling')}</small></article>
        <article className="student-stat"><span>{t(language, 'Davomat')} <FiCalendar aria-hidden="true" /></span><strong>{stats.attendancePercent}%</strong><small>{t(language, 'Kelgan darslar ulushi')}</small></article>
        <article className="student-stat"><span>{t(language, 'Faollik')} <FiBarChart2 aria-hidden="true" /></span><strong>{stats.activityPercent}%</strong><small>{t(language, 'Darsdagi faollik')}</small></article>
        <article className="student-stat"><span>{t(language, 'Topshiriqlar')} <FiCheckCircle aria-hidden="true" /></span><strong>{stats.homeworkPercent}%</strong><small>{t(language, 'Topshiriqlar natijasi')}</small></article>
      </section>

      <div className="student-main-grid">
        <div className="student-main-column">
          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Bugungi darslar')}</h2><p>{t(language, 'Guruhlaringiz bo‘yicha jadval')}</p></div><FiClock aria-hidden="true" /></div>
            {todayLessons.length ? (
              <div className="lesson-list">
                {todayLessons.map((group) => (
                  <div className="lesson-row" key={group.id} style={{ '--subject-accent': group.subject.color, gridTemplateColumns: '88px minmax(0, 1fr) auto' }}>
                    <span className="lesson-accent" />
                    <span className="lesson-time"><strong>{group.lessonTime}</strong></span>
                    <span className="lesson-description"><strong>{t(language, group.subject.name)}</strong><span>{group.teacher?.fullName} · {group.name}</span></span>
                    <span className="lesson-status lesson-status-next">{t(language, 'Bugun')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="student-enrollment-empty">
                <p>{t(language, groups.length ? 'Bugun dars rejalashtirilmagan.' : 'Hozircha guruhga qo‘shilmagansiz.')}</p>
                {!groups.length && <button type="button" onClick={() => onGo('teachers')}>{t(language, 'Ustoz qidirish')} <FiArrowRight aria-hidden="true" /></button>}
              </div>
            )}
          </section>

          {pendingRequests.length > 0 && (
            <section className="student-card">
              <div className="student-card-heading"><div><h2>{t(language, 'Ustoz javobini kutayotgan so‘rovlar')}</h2><p>{t(language, 'Ustoz tasdiqlagach guruhga qo‘shilasiz.')}</p></div><FiClock aria-hidden="true" /></div>
              <div className="lesson-list">
                {pendingRequests.map((request) => (
                  <div className="lesson-row" key={request.id} style={{ '--subject-accent': request.color, gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                    <span className="lesson-accent" />
                    <span className="lesson-description"><strong>{t(language, request.subject)}</strong><span>{request.groupName}</span></span>
                    <span className="join-pending"><i />{t(language, 'Kutilmoqda')}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'Mening guruhlarim')}</h2><p>{groups.length} {t(language, 'ta guruh')}</p></div><button type="button" className="student-text-link" onClick={() => onGo('subjects')}>{t(language, 'Barcha fanlar')} <FiArrowRight aria-hidden="true" /></button></div>
            {groups.length ? (
              <div className="student-subjects-grid">
                {groups.map((group) => (
                  <button type="button" key={group.id} className="subject-card" style={{ '--subject-accent': group.subject.color }} onClick={() => onOpenSubject(group.subject.id)}>
                    <SubjectBackdrop subject={group.subject} compact />
                    <span className="subject-card-icon">{group.subject.icon}</span>
                    <span className="subject-card-title">{t(language, group.subject.name)}</span>
                    <span className="subject-card-meta">{group.lessonsHeld}/{group.totalLessons} {t(language, 'ta dars')} · {group.progress}%{group.rank ? ` · #${group.rank}` : ''}</span>
                    <span className="subject-progress-track"><span style={{ width: `${group.progress}%` }} /></span>
                    <span className="subject-card-footer"><span>{group.teacher?.fullName}</span><span className="subject-enrollment-status is-enrolled">{group.points} {t(language, 'ball')}</span></span>
                  </button>
                ))}
              </div>
            ) : <Empty title={t(language, 'Guruh yo‘q')} detail={t(language, 'Ustozni tanlab, guruhga qo‘shilish uchun so‘rov yuboring.')} />}
          </section>

          <section className="student-card">
            <div className="student-card-heading"><div><h2>{t(language, 'So‘nggi natijalar')}</h2><p>{t(language, 'Har bir mezon 10 balldan, jami 30')}</p></div><button type="button" className="student-text-link" onClick={() => onGo('results')}>{t(language, 'Barchasi')} <FiArrowRight aria-hidden="true" /></button></div>
            {recentResults.length ? (
              <div className="recent-results">
                {recentResults.map((item) => (
                  <div className="recent-row" key={item.id}>
                    <i style={{ background: item.color }} />
                    <span><strong>{t(language, item.subject)}</strong><small>{formatDate(item.date, language)} · {item.attendanceScore}+{item.activityScore}+{item.homeworkScore}</small></span>
                    <span className="ui-bar" style={{ '--bar': item.color }}><i style={{ width: `${(item.total / item.max) * 100}%` }} /></span>
                    <strong>{item.total}<small>/{item.max}</small></strong>
                  </div>
                ))}
              </div>
            ) : <Empty title={t(language, 'Hali baho qo‘yilmagan')} />}
          </section>
        </div>

        <aside className="student-side-column">
          <section className="student-card student-ai-card">
            <div className="student-card-heading"><div><h2><FiZap aria-hidden="true" /> {t(language, 'UstozTop AI')}</h2><p>{t(language, 'Savol bering yoki rasm yuboring')}</p></div></div>
            <div className="ai-welcome"><span className="ai-orb" /><span><strong>{t(language, 'Birga tushunamiz.')}</strong><small>{t(language, 'Matn yoki rasm orqali savol yuboring.')}</small></span></div>
            <button type="button" className="ai-chat-link" onClick={() => onGo('ai')}>{t(language, 'AI sahifasini ochish')} <FiArrowRight aria-hidden="true" /></button>
          </section>
          <section className="student-card student-leaderboard">
            <div className="student-card-heading"><div><h2>{t(language, 'Reyting')}{boardSubject ? ` · ${t(language, boardSubject.subject.name)}` : ''}</h2><p>{board.data ? `${board.data.total} ${t(language, 'nafar o‘quvchi')}` : ''}</p></div><button type="button" className="student-text-link" onClick={() => onGo('ratings')}>{t(language, 'Barchasi')}</button></div>
            {groups.length > 1 && (
              <div className="subject-tabs" role="tablist">
                {groups.map((group) => (
                  <button type="button" role="tab" aria-selected={group.id === groupId} key={group.id} className={`subject-tab ${group.id === groupId ? 'is-active' : ''}`} style={{ '--tab': group.subject.color }} onClick={() => setBoardGroup(group.id)}><i>{group.subject.icon}</i>{t(language, group.subject.name)}</button>
                ))}
              </div>
            )}
            {top.length ? (
              <div className="leaderboard-scroll">
                {top.map((person) => <div key={person.id} className={`leader-row ${person.me ? 'leader-current' : ''}`}><span>{String(person.rank).padStart(2, '0')}</span><strong>{person.name}{person.me ? ` · ${t(language, 'Siz')}` : ''}</strong><span>{person.points}</span></div>)}
                {board.data.me && board.data.me.rank > 5 && <div className="leader-row leader-current"><span>{String(board.data.me.rank).padStart(2, '0')}</span><strong>{user.fullName} · {t(language, 'Siz')}</strong><span>{board.data.me.points}</span></div>}
              </div>
            ) : <Empty title={t(language, groups.length ? 'Reyting hali shakllanmagan' : 'Guruhga qo‘shilgach reyting shu yerda ko‘rinadi')} />}
          </section>
        </aside>
      </div>
    </>
  )
}

function StudentDashboard({ user, onLogout, onProfileUpdate, language, onLanguageChange, theme, onThemeToggle }) {
  const path = usePath()
  const [, , slug = 'dashboard', pathId = null] = path.split('/')
  const activeTab = SLUG_TO_TAB[slug] || 'overview'
  const selectedTeacher = activeTab === 'teachers' ? pathId : null
  const selectedSubject = activeTab === 'subjects' ? pathId : null
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileEditing, setProfileEditing] = useState(false)
  const [notice, setNotice] = useState(null)
  const now = useNow()

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 6000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const showNotice = (text, isError = false) => setNotice({ text, isError })

  const go = (tab, id) => {
    navigate(`/student/${TAB_TO_SLUG[tab] || tab}${id ? `/${id}` : ''}`)
    setMenuOpen(false)
    setProfileEditing(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const selectTab = (tab) => go(tab)
  const openTeacher = (id) => go('teachers', id)
  const openSubject = (id) => go('subjects', id)

  useEffect(() => {
    document.title = `${t(language, TAB_TITLES[activeTab])} · UstozTop`
  }, [activeTab, language])

  const heading = activeTab === 'overview'
    ? [`${t(language, greetingKey(now.getHours()))} ${user.firstName}`, 'Bugungi kichik qadam — ertangi katta natija. O‘rganishda davom eting.']
    : HEADINGS[activeTab]
  const isActive = (id) => activeTab === id && !selectedTeacher && !selectedSubject
  const floaterSet = selectedTeacher ? 'teachers' : selectedSubject ? 'subjects' : FLOATER_SETS[activeTab]
  const pageKey = `${activeTab}:${selectedTeacher || ''}:${selectedSubject || ''}`

  return (
    <main className="student-app" data-theme={theme}>
      <Floaters variant={floaterSet} />
      <header className="student-topbar">
        <div className="student-topbar-inner">
          <a className="student-brand" href="#overview" onClick={(event) => { event.preventDefault(); selectTab('overview') }} aria-label={`UstozTop ${t(language, 'Bosh sahifa')}`}>
            <LogoMark size={44} />
            <BrandName />
          </a>
          <nav className="student-nav" aria-label={t(language, 'O‘quvchi bo‘limlari')}>
            {navItems.filter((item) => item.id !== 'profile').map(({ id, label, icon: Icon }) => (
              <button type="button" key={id} onClick={() => selectTab(id)} className={`student-nav-link ${isActive(id) ? 'student-nav-active' : ''}`}>
                <Icon aria-hidden="true" /><span>{t(language, label)}</span>
              </button>
            ))}
          </nav>
          <div className="student-top-actions">
            <NotificationBell language={language} />
            <LanguageSelect value={language} onChange={onLanguageChange} label={t(language, 'Til va mavzuni tanlash')} />
            <button type="button" className="student-icon-button" aria-label={t(language, theme === 'dark' ? 'Yorug‘ mavzuga o‘tish' : 'Qorong‘i mavzuga o‘tish')} onClick={onThemeToggle}>{theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}</button>
            <button type="button" className={`student-desktop-only student-profile-chip ${activeTab === 'profile' ? 'is-active' : ''}`} onClick={() => selectTab('profile')} aria-label={t(language, 'Mening profilim')}>
              <span className="student-user-avatar" style={avatarStyle(user)}>{`${user.firstName[0]}${user.lastName[0]}`.toUpperCase()}</span>
              <span className="student-profile-chip-text"><strong>{user.firstName}</strong><small>{t(language, 'O‘quvchi')}</small></span>
            </button>
            <button type="button" className="student-icon-button student-desktop-only" aria-label={t(language, 'Chiqish')} onClick={onLogout}><FiLogOut aria-hidden="true" /></button>
            <button type="button" className="student-icon-button student-menu-toggle" aria-label={t(language, menuOpen ? 'Menyuni yopish' : 'Menyuni ochish')} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}</button>
          </div>
        </div>
        {menuOpen && (
          <nav className="student-mobile-menu" aria-label={t(language, 'O‘quvchi bo‘limlari')}>
            {navItems.map(({ id, label, icon: Icon }) => (
              <button type="button" key={id} onClick={() => selectTab(id)} className={`student-mobile-link ${isActive(id) ? 'is-active' : ''}`}>
                <Icon aria-hidden="true" /><span>{t(language, label)}</span><FiChevronRight aria-hidden="true" />
              </button>
            ))}
            <button type="button" className="student-mobile-link student-mobile-logout" onClick={onLogout}><FiLogOut aria-hidden="true" /><span>{t(language, 'Chiqish')}</span></button>
          </nav>
        )}
      </header>

      <div className="student-content">
        {notice && <div className={`ui-note ${notice.isError ? 'is-error' : ''}`} role="status">{notice.text}<button type="button" aria-label={t(language, 'Yopish')} onClick={() => setNotice(null)}><FiX aria-hidden="true" /></button></div>}

        <div key={pageKey} className="page-enter">
          {heading && !selectedTeacher && !selectedSubject && (
            <div className="student-page-heading">
              <div><span className="student-eyebrow">{t(language, 'O‘quvchi ish maydoni')}</span><h1>{activeTab === 'overview' ? heading[0] : t(language, heading[0])}</h1><p>{t(language, heading[1])}</p></div>
              {activeTab === 'overview' && <span className="student-date"><FiCalendar aria-hidden="true" /> {formatToday(language, now)} · {formatClock(now)}</span>}
            </div>
          )}

          {activeTab === 'overview' && <Overview language={language} user={user} onGo={selectTab} onOpenSubject={openSubject} />}
          {activeTab === 'teachers' && <TeachersPage language={language} selectedId={selectedTeacher} onSelect={(id) => go('teachers', id)} onNotice={showNotice} />}
          {activeTab === 'subjects' && <SubjectsPage language={language} selectedId={selectedSubject} onSelect={(id) => go('subjects', id)} onNotice={showNotice} onOpenTeacher={openTeacher} />}
          {activeTab === 'ratings' && <RatingsPage language={language} onOpenTeacher={openTeacher} onGo={selectTab} />}
          {activeTab === 'results' && <ResultsPage language={language} onGo={selectTab} />}
          {activeTab === 'ai' && <AiChat embedded onBack={() => selectTab('overview')} />}
          {activeTab === 'profile' && (
            <StudentProfile
              user={user}
              language={language}
              editing={profileEditing}
              onEdit={() => setProfileEditing(true)}
              onCloseEdit={() => setProfileEditing(false)}
              onSave={onProfileUpdate}
              onNotice={showNotice}
              onBrowse={() => selectTab('teachers')}
              onOpenSubject={openSubject}
              onOpenTeacher={openTeacher}
            />
          )}
        </div>

        <footer className="student-footer"><span>© 2026 UstozTop · {t(language, 'Bilim bilan kelajak sari')}</span></footer>
      </div>
    </main>
  )
}

export default StudentDashboard
