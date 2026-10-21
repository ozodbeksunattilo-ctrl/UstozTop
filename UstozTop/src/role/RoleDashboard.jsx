import { useEffect, useState } from 'react'
import {
  FiActivity, FiAward, FiBookOpen, FiCalendar, FiClipboard, FiGrid, FiLayers, FiLogOut, FiMenu, FiMoon,
  FiShield, FiSun, FiUserCheck, FiUsers, FiX,
} from 'react-icons/fi'
import logo from '../assets/UstozTop.jpg'
import { avatarStyle } from '../components/avatar.js'
import LanguageSelect from '../components/LanguageSelect.jsx'
import ProfileEditor from '../components/ProfileEditor.jsx'
import { initialsOf } from '../components/ui.jsx'
import { translate as t } from '../i18n.js'
import AdminPages from './AdminPages.jsx'
import TeacherPages from './TeacherPages.jsx'
import TeacherProfileForm from './TeacherProfileForm.jsx'
import './role.css'
import './roleExtra.css'
import '../components/ui.css'
import '../components/profile.css'

const NAVIGATION = {
  ADMIN: [
    { id: 'overview', label: 'Umumiy', icon: FiGrid },
    { id: 'users', label: 'Foydalanuvchilar', icon: FiUsers },
    { id: 'teachers', label: 'Ustozlar', icon: FiUserCheck },
    { id: 'subjects', label: 'Fanlar', icon: FiBookOpen },
    { id: 'groups', label: 'Guruhlar', icon: FiLayers },
    { id: 'ratings', label: 'Reyting', icon: FiAward },
    { id: 'suspicious', label: 'Shubhali baholar', icon: FiShield },
    { id: 'activity', label: 'Faoliyat jurnali', icon: FiActivity },
  ],
  TEACHER: [
    { id: 'overview', label: 'Umumiy', icon: FiGrid },
    { id: 'groups', label: 'Guruhlarim', icon: FiBookOpen },
    { id: 'students', label: 'O‘quvchilar', icon: FiUsers },
    { id: 'grading', label: 'Davomat va ballar', icon: FiClipboard },
    { id: 'ratings', label: 'Reyting', icon: FiAward },
  ],
}

function RoleDashboard({ user, onLogout, onProfileUpdate, language, onLanguageChange, theme, onThemeToggle }) {
  const isAdmin = user.role === 'ADMIN'
  const roleName = isAdmin ? 'Administrator' : 'Ustoz'
  const pages = NAVIGATION[user.role]
  const [activePage, setActivePage] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 6000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const showNotice = (text, isError = false) => setNotice({ text, isError })

  function selectPage(page) {
    setActivePage(page)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const currentPage = pages.find((page) => page.id === activePage)
  const themeButton = (
    <button type="button" className="role-icon-button" aria-label={t(language, theme === 'dark' ? 'Yorug‘ mavzuga o‘tish' : 'Qorong‘i mavzuga o‘tish')} onClick={onThemeToggle}>
      {theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
    </button>
  )

  return (
    <main className={`role-app ${isAdmin ? '' : 'role-app-teacher'}`} data-theme={theme}>
      {isAdmin && (
        <aside className={`role-sidebar ${menuOpen ? 'role-sidebar-open' : ''}`}>
          <a className="role-brand" href="#dashboard" onClick={(event) => { event.preventDefault(); selectPage('overview') }}>
            <img src={logo} alt="" /><span>UstozTop<small>{t(language, 'Boshqaruv paneli')}</small></span>
          </a>
          <span className="role-nav-label">{t(language, 'PLATFORMA')}</span>
          <nav className="role-navigation" aria-label={t(language, 'Asosiy menyu')}>
            {pages.map(({ id, label, icon: Icon }) => (
              <button type="button" key={id} onClick={() => selectPage(id)} className={`role-nav-link ${activePage === id ? 'role-nav-active' : ''}`} aria-current={activePage === id ? 'page' : undefined}>
                <Icon aria-hidden="true" /><span>{t(language, label)}</span>
              </button>
            ))}
          </nav>
          <div className="role-sidebar-bottom">
            <button type="button" className="role-profile-link" onClick={() => setProfileOpen(true)} aria-label={t(language, 'Mening profilim')}>
              <span className="role-avatar" style={avatarStyle(user)}>{initialsOf(user.fullName)}</span>
              <span><strong>{user.fullName}</strong><small>{t(language, roleName)}</small></span>
            </button>
            <button type="button" className="role-nav-link role-logout" onClick={onLogout}><FiLogOut aria-hidden="true" /><span>{t(language, 'Chiqish')}</span></button>
          </div>
        </aside>
      )}

      <section className="role-main">
        <header className="role-topbar">
          {isAdmin ? (
            <>
              <button type="button" className="role-menu-toggle" aria-label={t(language, menuOpen ? 'Menyuni yopish' : 'Menyuni ochish')} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <FiX /> : <FiMenu />}</button>
              <div className="role-breadcrumb"><span>{t(language, 'Akademiya')}</span><span>/</span><strong>{t(language, currentPage?.label || 'Umumiy')}</strong></div>
            </>
          ) : (
            <>
              <a className="role-head-brand" href="#dashboard" onClick={(event) => { event.preventDefault(); selectPage('overview') }}><img src={logo} alt="" /><span>UstozTop</span></a>
              <nav className="role-head-nav" aria-label={t(language, 'Asosiy menyu')}>
                {pages.map(({ id, label, icon: Icon }) => (
                  <button type="button" key={id} onClick={() => selectPage(id)} className={`role-head-link ${activePage === id ? 'is-active' : ''}`} aria-current={activePage === id ? 'page' : undefined}><Icon aria-hidden="true" /><span>{t(language, label)}</span></button>
                ))}
              </nav>
            </>
          )}
          <span className="role-top-spacer" />
          <LanguageSelect value={language} onChange={onLanguageChange} label={t(language, 'Interfeys tili')} />
          {themeButton}
          <button type="button" className="role-top-avatar" style={avatarStyle(user)} aria-label={t(language, 'Mening profilim')} onClick={() => setProfileOpen(true)}>{initialsOf(user.fullName)}</button>
          {!isAdmin && <button type="button" className="role-icon-button role-desktop-only" aria-label={t(language, 'Chiqish')} onClick={onLogout}><FiLogOut aria-hidden="true" /></button>}
          {!isAdmin && <button type="button" className="role-icon-button role-teacher-toggle" aria-label={t(language, menuOpen ? 'Menyuni yopish' : 'Menyuni ochish')} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}</button>}
          {!isAdmin && menuOpen && (
            <nav className="role-mobile-menu" aria-label={t(language, 'Asosiy menyu')}>
              {pages.map(({ id, label, icon: Icon }) => (
                <button type="button" key={id} onClick={() => selectPage(id)} className={activePage === id ? 'is-active' : ''}><Icon aria-hidden="true" /><span>{t(language, label)}</span></button>
              ))}
              <button type="button" className="role-mobile-logout" onClick={onLogout}><FiLogOut aria-hidden="true" /><span>{t(language, 'Chiqish')}</span></button>
            </nav>
          )}
        </header>

        <div className="role-content">
          {notice && <div className={`ui-note ${notice.isError ? 'is-error' : ''}`} role="status">{notice.text}<button type="button" aria-label={t(language, 'Yopish')} onClick={() => setNotice(null)}><FiX /></button></div>}
          <div className="role-page-title">
            <div>
              <span className="role-eyebrow">{t(language, roleName)}</span>
              <h1>{activePage === 'overview' ? `${t(language, 'Xush kelibsiz,')} ${user.firstName}` : t(language, currentPage?.label)}</h1>
              <p>{t(language, activePage === 'overview' ? (isAdmin ? 'Platformadagi asosiy ko‘rsatkichlar va so‘nggi faollik.' : 'Guruhlaringiz, o‘quvchilaringiz va dars natijalari.') : 'Ushbu bo‘limning barcha ma’lumotlari shu yerda boshqariladi.')}</p>
            </div>
            <span className="role-date"><FiCalendar aria-hidden="true" /> {new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
          </div>

          {isAdmin
            ? <AdminPages page={activePage} language={language} onNotice={showNotice} onGo={selectPage} />
            : <TeacherPages page={activePage} language={language} user={user} onNotice={showNotice} onGo={selectPage} />}

          <footer className="role-footer"><span>© 2026 UstozTop · {t(language, 'Bilim bilan kelajak sari')}</span><span>{t(language, 'Boshqaruv paneli')}</span></footer>
        </div>
      </section>

      {profileOpen && (
        <div className="role-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false) }}>
          <section className="role-settings role-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="role-profile-title">
            <div className="role-card-heading">
              <div><h2 id="role-profile-title">{t(language, 'Mening profilim')}</h2><p>{user.email || user.phone}</p></div>
              <button type="button" className="role-icon-button" aria-label={t(language, 'Yopish')} onClick={() => setProfileOpen(false)}><FiX /></button>
            </div>
            <ProfileEditor user={user} language={language} onSave={async (profile) => { await onProfileUpdate(profile); setProfileOpen(false) }} onCancel={() => setProfileOpen(false)} onNotice={showNotice} />
            {!isAdmin && <TeacherProfileForm language={language} onNotice={showNotice} />}
          </section>
        </div>
      )}
    </main>
  )
}

export default RoleDashboard
