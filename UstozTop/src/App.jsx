import { useState } from 'react'
import AuthFooter from './components/AuthFooter.jsx'
import AuthHeader from './components/AuthHeader.jsx'
import Dashboard from './components/Dashboard.jsx'
import LoginForm from './components/LoginForm.jsx'
import WelcomePanel from './components/WelcomePanel.jsx'
import { SESSION_KEY } from './demoAuth.js'

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

  function handleAuthenticated(account) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(account))
    setUser(account)
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#070811] px-5 py-4 text-[#f0efff] sm:px-8 sm:py-6 xl:px-[5.5vw]">
      <AuthHeader />

      {user ? (
        <div className="mx-auto my-auto flex w-full max-w-[1340px] justify-center py-8 lg:py-7">
          <Dashboard user={user} onLogout={handleLogout} />
        </div>
      ) : (
        <div className="mx-auto my-auto grid w-full max-w-[1340px] grid-cols-1 items-center gap-8 py-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-[8.5vw] lg:py-7">
          <WelcomePanel />
          <LoginForm onAuthenticated={handleAuthenticated} />
        </div>
      )}

      <AuthFooter />
    </main>
  )
}

export default App
