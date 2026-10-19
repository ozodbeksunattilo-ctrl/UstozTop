import { useEffect, useState } from 'react'
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail, FiShield, FiUser } from 'react-icons/fi'
import { authenticateDemoUser, initializeDemoUsers, registerDemoUser } from '../demoAuth.js'

function LoginForm({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [ready, setReady] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [message, setMessage] = useState('')
  const isRegister = mode === 'register'

  useEffect(() => {
    initializeDemoUsers()
      .then(() => setReady(true))
      .catch(() => {
        setMessage('Demo akkauntlarini tayyorlab bo‘lmadi. Brauzeringizda localStorage va Web Crypto yoqilganini tekshiring.')
      })
  }, [])

  function changeMode(nextMode) {
    setMode(nextMode)
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    try {
      if (isRegister) {
        const user = await registerDemoUser({ fullName, email, password, role })
        onAuthenticated(user)
        return
      }

      const user = await authenticateDemoUser(email, password)
      if (!user) {
        setMessage('Email yoki parol noto‘g‘ri.')
        return
      }
      onAuthenticated(user)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Amalni bajarib bo‘lmadi.')
    }
  }

  return (
    <section aria-labelledby="login-heading" className="mx-auto w-full max-w-[410px] py-4 lg:justify-self-center">
      <span className="inline-block rounded border border-[#9974ff]/10 bg-[#7f53ff]/10 px-2 py-[5px] text-[9px] font-semibold tracking-[.055em] text-[#c2adff]">
        SIZNING BILIM MAYDONINGIZ
      </span>
      <h2 id="login-heading" className="mb-1 mt-3.5 text-[29px] font-semibold tracking-[-.035em] text-[#f1f0ff] sm:text-[32px]">
        {isRegister ? 'Yangi hisob yarating.' : 'Yana xush kelibsiz.'}
      </h2>
      <p className="mb-6 text-xs text-[#858aa9]">
        {isRegister ? 'UstozTop’da o‘zingizga mos rolni tanlang.' : 'Davom etish uchun hisobingizga kiring.'}
      </p>

      <div className="mb-5 grid grid-cols-2 rounded-[9px] border border-[#969abf]/[.14] bg-[#101322] p-1 text-[11px]">
        <button
          type="button"
          onClick={() => changeMode('login')}
          aria-pressed={!isRegister}
          className={`rounded-md px-3 py-2.5 transition ${!isRegister ? 'bg-[#7650dc] font-semibold text-white' : 'text-[#a5a9c2] hover:text-white'}`}
        >
          Kirish
        </button>
        <button
          type="button"
          onClick={() => changeMode('register')}
          aria-pressed={isRegister}
          className={`rounded-md px-3 py-2.5 transition ${isRegister ? 'bg-[#7650dc] font-semibold text-white' : 'text-[#a5a9c2] hover:text-white'}`}
        >
          Hisob yaratish
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <>
            <label htmlFor="fullName" className="mb-2 block text-[11px] font-medium text-[#ecebfa]">Ism va familiya</label>
            <div className="mb-4 flex h-[46px] items-center gap-3 rounded-[9px] border border-[#969abf]/[.17] bg-[#101322] px-3 text-[#a7acc8] transition focus-within:border-[#936fff]/80 focus-within:ring-4 focus-within:ring-[#8054ff]/[.13]">
              <FiUser aria-hidden="true" size={16} className="shrink-0" />
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ismingiz Familiyangiz"
                autoComplete="name"
                required
                minLength={2}
                className="w-full min-w-0 bg-transparent text-xs text-[#eeedff] outline-none placeholder:text-[#777d9c]"
              />
            </div>
          </>
        )}

        <label htmlFor="email" className="mb-2 block text-[11px] font-medium text-[#ecebfa]">Email manzil</label>
        <div className="flex h-[46px] items-center gap-3 rounded-[9px] border border-[#969abf]/[.17] bg-[#101322] px-3 text-[#a7acc8] transition focus-within:border-[#936fff]/80 focus-within:ring-4 focus-within:ring-[#8054ff]/[.13]">
          <FiMail aria-hidden="true" size={16} className="shrink-0" />
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="sizning@email.com"
            autoComplete="email"
            required
            className="w-full min-w-0 bg-transparent text-xs text-[#eeedff] outline-none placeholder:text-[#777d9c]"
          />
        </div>

        {isRegister && (
          <>
            <label htmlFor="role" className="mb-2 mt-[17px] block text-[11px] font-medium text-[#ecebfa]">Platformadagi rolingiz</label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-[46px] w-full rounded-[9px] border border-[#969abf]/[.17] bg-[#101322] px-3 text-xs text-[#eeedff] outline-none focus:border-[#936fff]/80 focus:ring-4 focus:ring-[#8054ff]/[.13]"
            >
              <option value="student">O‘quvchi</option>
              <option value="teacher">Ustoz</option>
            </select>
            <p className="mt-2 text-[10px] leading-relaxed text-[#858aa9]">Admin hisobi ochiq ro‘yxatdan o‘tishda mavjud emas.</p>
          </>
        )}

        <label htmlFor="password" className="mb-2 mt-[17px] block text-[11px] font-medium text-[#ecebfa]">Parol</label>
        <div className="flex h-[46px] items-center gap-3 rounded-[9px] border border-[#969abf]/[.17] bg-[#101322] px-3 text-[#a7acc8] transition focus-within:border-[#936fff]/80 focus-within:ring-4 focus-within:ring-[#8054ff]/[.13]">
          <FiLock aria-hidden="true" size={16} className="shrink-0" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegister ? 'Kamida 8 ta belgi' : 'Parolingizni kiriting'}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={isRegister ? 8 : undefined}
            className="w-full min-w-0 bg-transparent text-xs text-[#eeedff] outline-none placeholder:text-[#777d9c]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
            className="grid shrink-0 place-items-center rounded p-1 text-[#9297b2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b49bff]"
          >
            {showPassword ? <FiEyeOff aria-hidden="true" size={16} /> : <FiEye aria-hidden="true" size={16} />}
          </button>
        </div>

        {!isRegister && (
          <div className="my-[15px] flex items-center justify-between gap-2 text-[10px]">
            <span className="text-[#a5a9c2]">Demo akkauntlar faqat shu brauzerda ishlaydi.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!ready}
          className="mt-5 flex h-[47px] w-full items-center justify-center gap-3 rounded-[9px] bg-gradient-to-r from-[#8356ff] to-[#693ee2] text-xs font-semibold text-white shadow-[0_7px_19px_rgba(98,57,221,.2)] transition hover:brightness-110 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b49bff] disabled:cursor-wait disabled:opacity-60"
        >
          {isRegister ? 'Hisob yaratish' : 'Kirish'} <FiArrowRight aria-hidden="true" size={16} />
        </button>
        {message && <p role="alert" className="mt-3 text-[11px] leading-relaxed text-[#ffb4c0]">{message}</p>}
      </form>

      <div className="my-[22px] flex items-start gap-3 rounded-[11px] border border-[#9da1cb]/[.07] bg-gradient-to-br from-[#161a2d] to-[#111425] p-4 text-[#b9bfd7]">
        <FiShield aria-hidden="true" size={18} className="mt-px shrink-0 text-[#b5bce1]" />
        <div>
          <strong className="mb-1 block text-[10px] font-medium text-[#e6e7f4]">Demo admin hisobi</strong>
          <p className="text-[10px] leading-[1.6] text-[#9298b5]">
            admin@ustoztop.uz <span className="text-[#666d8e]">/</span> UstozTopAdmin26!
          </p>
          <p className="mt-2 text-[9px] leading-[1.5] text-[#767d9d]">
            Demo akkauntlar va parollar faqat shu brauzerda saqlanadi. Haqiqiy foydalanuvchilar va turli qurilmalardan kirish uchun backend kerak.
          </p>
        </div>
      </div>
    </section>
  )
}

export default LoginForm
