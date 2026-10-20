import { useEffect, useState } from 'react'
import AuthFooter from './components/AuthFooter.jsx'
import AuthHeader from './components/AuthHeader.jsx'
import Dashboard from './components/Dashboard.jsx'
import LoginForm from './components/LoginForm.jsx'
import WelcomePanel from './components/WelcomePanel.jsx'
import { SESSION_KEY, updateDemoUserProfile } from './demoAuth.js'
import { LANGUAGE_KEY, THEME_KEY } from './i18n.js'

function readPreference(key, allowedValues, fallback) {
  const value = localStorage.getItem(key)
  return allowedValues.includes(value) ? value : fallback
}

function readSession() {
  const storedSession = localStorage.getItem(SESSION_KEY)
  if (!storedSession) return null
  try {
    const session = JSON.parse(storedSession)
    if (session && ['admin', 'teacher', 'student'].includes(session.role)) return session
    localStorage.removeItem(SESSION_KEY)
  } catch {
    localStorage.removeItem(SESSION_KEY)
  }
  return null
}

function App() {
  const [user, setUser] = useState(readSession)
  const [language, setLanguage] = useState(() => readPreference(LANGUAGE_KEY, ['uz', 'ru', 'uz-Cyrl', 'en'], 'uz'))
  const [theme, setTheme] = useState(() => readPreference(THEME_KEY, ['dark', 'light'], 'dark'))

  useEffect(() => {
    document.documentElement.lang = language === 'ru' ? 'ru' : language === 'en' ? 'en' : 'uz'
    document.documentElement.dataset.theme = theme
    localStorage.setItem(LANGUAGE_KEY, language)
    localStorage.setItem(THEME_KEY, theme)
  }, [language, theme])

  function handleAuthenticated(account) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(account))
    setUser(account)
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  function handleProfileUpdate(profile) {
    const savedProfile = updateDemoUserProfile(user.email, profile)
    const updatedUser = { ...user, ...savedProfile }
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  if (user?.role === 'student') {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      />
    )
  }

  return (
    <main data-theme={theme} className="auth-shell flex min-h-screen flex-col bg-[#070811] px-5 py-4 text-[#f0efff] sm:px-8 sm:py-6 xl:px-[5.5vw]">
      <AuthHeader
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      />

      {user ? (
        <div className="mx-auto my-auto flex w-full max-w-[1340px] justify-center py-8 lg:py-7">
          <Dashboard user={user} onLogout={handleLogout} language={language} />
        </div>
      ) : (
        <div className="mx-auto my-auto grid w-full max-w-[1340px] grid-cols-1 items-center gap-8 py-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-[8.5vw] lg:py-7">
          <WelcomePanel language={language} />
          <LoginForm onAuthenticated={handleAuthenticated} language={language} />
        </div>
      )}

      <AuthFooter language={language} />
    </main>
  )
}

export default App
