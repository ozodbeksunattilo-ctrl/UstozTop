import { FiBookOpen, FiLogOut, FiShield, FiUsers } from 'react-icons/fi'
import StudentDashboard from '../student/StudentDashboard.jsx'
import { translate as t } from '../i18n.js'

const roleDetails = {
  admin: { label: 'Administrator', description: 'Platformani boshqarish va foydalanuvchilarni kuzatish paneli.', icon: FiShield },
  teacher: { label: 'Ustoz', description: 'Darslaringiz va o‘quvchilaringiz uchun ish maydoni.', icon: FiUsers },
  student: { label: 'O‘quvchi', description: 'O‘qish rejangiz va ustozlaringiz uchun shaxsiy ish maydoni.', icon: FiBookOpen },
}

function Dashboard({ user, onLogout, onProfileUpdate, language, onLanguageChange, theme, onThemeToggle }) {
  if (user.role === 'student') {
    return (
      <StudentDashboard
        user={user}
        onLogout={onLogout}
        onProfileUpdate={onProfileUpdate}
        language={language}
        onLanguageChange={onLanguageChange}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />
    )
  }

  const details = roleDetails[user.role]
  const RoleIcon = details.icon

  return (
    <section className="mx-auto w-full max-w-[760px] rounded-[22px] border border-[#9c9acd]/15 bg-[linear-gradient(143deg,rgba(20,22,43,.96),rgba(12,15,31,.98))] p-6 shadow-[0_22px_70px_rgba(0,0,0,.2)] sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#8054ff]/15 text-[#c2aaff]">
            <RoleIcon aria-hidden="true" size={22} />
          </span>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#c2adff]">{t(language, `${details.label} paneli`)}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#f1f0ff] sm:text-3xl">{t(language, 'Xush kelibsiz,')} {user.fullName}!</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-lg border border-[#969abf]/20 px-3 py-2 text-xs text-[#c1c4d8] transition hover:border-[#b49bff]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b49bff]"
        >
          <FiLogOut aria-hidden="true" size={15} />           {t(language, 'Chiqish')}
        </button>
      </div>

      <p className="mb-7 mt-5 text-sm leading-relaxed text-[#989cb8]">{t(language, details.description)}</p>
      <div className="rounded-xl border border-[#9da1cb]/10 bg-[#101322]/80 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[#858aa9]">{t(language, 'Akkaunt')}</p>
        <p className="mt-1 text-sm text-[#e6e7f4]">{user.email}</p>
      </div>
      <p className="mt-5 text-[10px] leading-relaxed text-[#767d9d]">
        {t(language, 'Bu demo paneldir. Ma’lumotlar shu brauzerda saqlanadi; haqiqiy foydalanuvchi ma’lumotlari va qurilmalararo kirish uchun backend kerak.')}
      </p>
    </section>
  )
}

export default Dashboard
