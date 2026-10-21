import { useEffect, useState } from 'react'
import { FiClock, FiLogOut, FiXCircle } from 'react-icons/fi'
import { api } from './api.js'
import './components/auth.css'
import AuthFooter from './components/AuthFooter.jsx'
import AuthHeader from './components/AuthHeader.jsx'
import Floaters from './components/Floaters.jsx'
import Dashboard from './components/Dashboard.jsx'
import LoginForm from './components/LoginForm.jsx'
import WelcomePanel from './components/WelcomePanel.jsx'
import { LANGUAGE_KEY, THEME_KEY, translate as t } from './i18n.js'
import { navigate, roleHome, usePath } from './router.js'

function readPreference(key, allowedValues, fallback) {
  try {
    const value = localStorage.getItem(key)
    return allowedValues.includes(value) ? value : fallback
  } catch {
    return fallback
  }
}

function AuthBackground() {
  return (
    <div className="auth-bg" aria-hidden="true">
      <span className="auth-blob auth-blob-1" />
      <span className="auth-blob auth-blob-2" />
      <span className="auth-blob auth-blob-3" />
      <span className="auth-grid-bg" />
      <Floaters variant="auth" />
    </div>
  )
}

// Ustoz akkaunti admin tasdig'ini kutayotgan yoki rad etilgan holat.
function RestrictedScreen({ user, language, onLogout }) {
  const rejected = user.status === 'REJECTED'
  const Icon = rejected ? FiXCircle : FiClock
  return (
    <div className="auth-main auth-restricted">
      <section className="auth-card" role="status">
        <span className={`auth-status-icon ${rejected ? 'is-rejected' : ''}`}><Icon aria-hidden="true" size={30} /></span>
        <h2>{t(language, rejected ? 'So‘rovingiz rad etildi' : 'Tasdiq kutilmoqda')}</h2>
        <p>
          {t(language, rejected
            ? 'Ustoz akkauntingiz administrator tomonidan tasdiqlanmadi. Savollar bo‘lsa administrator bilan bog‘laning.'
            : 'Ustoz akkauntingiz administrator tomonidan tasdiqlangach, dashboard ochiladi. Odatda bu bir necha soat oladi.')}
        </p>
        <button type="button" className="auth-submit" onClick={onLogout}><FiLogOut aria-hidden="true" size={18} /> {t(language, 'Chiqish')}</button>
      </section>
    </div>
  )
}

function App() {
  const path = usePath()
  // undefined — sessiya tekshirilmoqda, null — kirmagan
  const [user, setUser] = useState(undefined)
  const [language, setLanguage] = useState(() => readPreference(LANGUAGE_KEY, ['uz', 'ru', 'uz-Cyrl', 'en'], 'uz'))
  const [theme, setTheme] = useState(() => readPreference(THEME_KEY, ['dark', 'light'], 'dark'))

  useEffect(() => {
    document.documentElement.lang = language === 'ru' ? 'ru' : language === 'en' ? 'en' : 'uz'
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(LANGUAGE_KEY, language)
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // saqlash imkoni bo'lmasa, tanlov faqat joriy sessiya uchun amal qiladi
    }
  }, [language, theme])

  useEffect(() => {
    api.get('/auth/me').then((data) => setUser(data.user)).catch(() => setUser(null))
  }, [])

  // Rol bo'yicha yo'naltirish: har bir rol faqat o'z dashboardida bo'la oladi.
  useEffect(() => {
    if (user === undefined) return
    if (user) {
      if (!path.startsWith(`/${user.role.toLowerCase()}/`)) navigate(roleHome(user.role), { replace: true })
    } else if (!['/', '/login', '/register', '/reset-password'].includes(path)) {
      navigate('/', { replace: true })
    }
  }, [user, path])

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
      navigate('/', { replace: true })
    }
  }

  function handleAuthenticated(account) {
    setUser(account)
    navigate(roleHome(account.role), { replace: true })
  }

  async function handleProfileUpdate(profile) {
    const data = await api.patch('/auth/profile', profile)
    setUser(data.user)
    return data.user
  }

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')

  if (user === undefined) {
    return <main data-theme={theme} className="auth"><AuthBackground /><div className="auth-loading" role="status" aria-label="Yuklanmoqda"><span className="auth-spinner" /></div></main>
  }

  if (user && user.status === 'ACTIVE') {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeToggle={toggleTheme}
      />
    )
  }

  return (
    <main data-theme={theme} className="auth">
      <AuthBackground />
      <AuthHeader language={language} onLanguageChange={setLanguage} theme={theme} onThemeToggle={toggleTheme} />
      {user ? (
        <RestrictedScreen user={user} language={language} onLogout={handleLogout} />
      ) : (
        <div className="auth-main">
          <WelcomePanel language={language} />
          <LoginForm onAuthenticated={handleAuthenticated} language={language} path={path} />
        </div>
      )}
      <AuthFooter language={language} />
    </main>
  )
}

export default App
