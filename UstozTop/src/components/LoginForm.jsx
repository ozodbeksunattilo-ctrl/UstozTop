import { useState } from 'react'
import { FiArrowRight, FiCheckCircle, FiEye, FiEyeOff, FiInfo, FiLock, FiMail, FiUser } from 'react-icons/fi'
import { api } from '../api.js'
import { translate as t } from '../i18n.js'
import { navigate } from '../router.js'

const DEMO_ACCOUNTS = [
  { label: 'Administrator', identifier: 'admin@ustoztop.uz', password: 'UstozTopAdmin26!' },
  { label: 'Ustoz', identifier: 'ustoz@ustoztop.uz', password: 'UstozTop2026!' },
  { label: 'O‘quvchi', identifier: 'aziz@ustoztop.uz', password: 'Student2026!' },
]

const HEADINGS = {
  login: ['Yana xush kelibsiz.', 'Davom etish uchun hisobingizga kiring.'],
  register: ['Yangi hisob yarating.', 'O‘quvchi yoki ustoz sifatida ro‘yxatdan o‘ting.'],
  forgot: ['Parolni tiklash', 'Email yoki telefon raqamingizni kiriting.'],
  reset: ['Yangi parol o‘rnating', 'Yangi parolni ikki marta kiriting.'],
}

function Field({ label, icon: Icon, error, children }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <span className={`auth-input ${error ? 'has-error' : ''}`}>
        {Icon && <Icon aria-hidden="true" size={18} />}
        {children}
      </span>
      {error && <small className="auth-field-error">{error}</small>}
    </label>
  )
}

function LoginForm({ onAuthenticated, language, path }) {
  const resetToken = path === '/reset-password' ? new URLSearchParams(window.location.search).get('token') || '' : ''
  const [mode, setMode] = useState(resetToken ? 'reset' : path === '/register' ? 'register' : 'login')
  const [token, setToken] = useState(resetToken)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', identifier: '', password: '', confirmPassword: '', role: 'STUDENT', acceptTerms: false })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const isRegister = mode === 'register'
  const isLoginLike = mode === 'login' || mode === 'register'

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function changeMode(next) {
    setMode(next)
    setMessage('')
    setSuccess('')
    setErrors({})
    if (next === 'login' || next === 'register') navigate(next === 'register' ? '/register' : '/login', { replace: true })
  }

  function showError(error) {
    setErrors(error.fields || {})
    setMessage(t(language, error.message))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setSuccess('')
    setErrors({})
    setBusy(true)
    try {
      if (mode === 'register') {
        const data = await api.post('/auth/register', form)
        onAuthenticated(data.user)
      } else if (mode === 'login') {
        const data = await api.post('/auth/login', { identifier: form.identifier, password: form.password })
        onAuthenticated(data.user)
      } else if (mode === 'forgot') {
        const data = await api.post('/auth/forgot', { identifier: form.identifier })
        setSuccess(t(language, data.message))
        // email xizmati ulanmagan: development rejimida server tokenni qaytaradi
        if (data.devResetToken) setToken(data.devResetToken)
      } else {
        if (form.password !== form.confirmPassword) {
          setErrors({ confirmPassword: t(language, 'Parollar mos kelmadi.') })
          return
        }
        await api.post('/auth/reset', { token, password: form.password })
        setForm((current) => ({ ...current, password: '', confirmPassword: '' }))
        setToken('')
        changeMode('login')
        setSuccess(t(language, 'Parol yangilandi. Endi yangi parol bilan kiring.'))
      }
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  const passwordInput = (key, placeholder, autoComplete) => (
    <>
      <input
        type={showPassword ? 'text' : 'password'}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
      {key === 'password' && (
        <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={t(language, showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish')}>
          {showPassword ? <FiEyeOff aria-hidden="true" size={18} /> : <FiEye aria-hidden="true" size={18} />}
        </button>
      )}
    </>
  )

  const [heading, subheading] = HEADINGS[mode]
  const submitLabel = { login: 'Kirish', register: 'Hisob yaratish', forgot: 'Tiklash havolasini yuborish', reset: 'Parolni yangilash' }[mode]

  return (
    <section aria-labelledby="login-heading" className="auth-card">
      <h2 id="login-heading">{t(language, heading)}</h2>
      <p>{t(language, subheading)}</p>

      {isLoginLike && (
        <div className="auth-tabs" data-mode={mode}>
          <button type="button" onClick={() => changeMode('login')} aria-pressed={!isRegister}>{t(language, 'Kirish')}</button>
          <button type="button" onClick={() => changeMode('register')} aria-pressed={isRegister}>{t(language, 'Hisob yaratish')}</button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate={false}>
        {isRegister && (
          <>
            <div className="auth-row">
              <Field label={t(language, 'Ism')} icon={FiUser} error={errors.firstName}>
                <input value={form.firstName} onChange={set('firstName')} placeholder={t(language, 'Ismingiz')} autoComplete="given-name" required minLength={2} />
              </Field>
              <Field label={t(language, 'Familiya')} error={errors.lastName}>
                <input value={form.lastName} onChange={set('lastName')} placeholder={t(language, 'Familiyangiz')} autoComplete="family-name" required minLength={2} />
              </Field>
            </div>
            <fieldset className="auth-roles">
              <legend>{t(language, 'Platformadagi rolingiz')}</legend>
              {[['STUDENT', 'O‘quvchi'], ['TEACHER', 'Ustoz']].map(([value, label]) => (
                <label key={value} className={form.role === value ? 'is-active' : ''}>
                  <input type="radio" name="role" value={value} checked={form.role === value} onChange={set('role')} />
                  {t(language, label)}
                </label>
              ))}
            </fieldset>
          </>
        )}

        {mode !== 'reset' && (
          <Field label={t(language, 'Email yoki telefon')} icon={FiMail} error={errors.identifier}>
            <input value={form.identifier} onChange={set('identifier')} placeholder="sizning@email.com / +998901234567" autoComplete="username" required />
          </Field>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'reset') && (
          <Field label={t(language, mode === 'reset' ? 'Yangi parol' : 'Parol')} icon={FiLock} error={errors.password}>
            {passwordInput('password', t(language, isRegister || mode === 'reset' ? 'Kamida 8 ta belgi, harf va raqam' : 'Parolingizni kiriting'), isRegister || mode === 'reset' ? 'new-password' : 'current-password')}
          </Field>
        )}

        {(isRegister || mode === 'reset') && (
          <Field label={t(language, 'Parolni tasdiqlang')} icon={FiLock} error={errors.confirmPassword}>
            {passwordInput('confirmPassword', t(language, 'Parolni qayta kiriting'), 'new-password')}
          </Field>
        )}

        {isRegister && (
          <label className={`auth-check ${errors.acceptTerms ? 'has-error' : ''}`}>
            <input type="checkbox" checked={form.acceptTerms} onChange={set('acceptTerms')} />
            <span>{t(language, 'Foydalanish shartlari va maxfiylik siyosatiga roziman')}</span>
          </label>
        )}
        {errors.acceptTerms && <small className="auth-field-error">{errors.acceptTerms}</small>}

        {mode === 'login' && (
          <button type="button" className="auth-link" onClick={() => changeMode('forgot')}>{t(language, 'Parolni unutdingizmi?')}</button>
        )}

        <button type="submit" className="auth-submit" disabled={busy}>
          {t(language, submitLabel)} <FiArrowRight aria-hidden="true" size={18} />
        </button>

        {message && <p role="alert" className="auth-error">{message}</p>}
        {success && <p role="status" className="auth-success"><FiCheckCircle aria-hidden="true" size={16} /> {success}</p>}
      </form>

      {mode === 'forgot' && token && (
        <button type="button" className="auth-link auth-link-strong" onClick={() => { setMode('reset'); setSuccess(''); setMessage('') }}>
          {t(language, 'Tiklash havolasini ochish (demo)')}
        </button>
      )}
      {(mode === 'forgot' || mode === 'reset') && (
        <button type="button" className="auth-link" onClick={() => changeMode('login')}>{t(language, 'Kirishga qaytish')}</button>
      )}

      {isRegister && form.role === 'TEACHER' && (
        <p className="auth-note"><FiInfo aria-hidden="true" size={16} /><span>{t(language, 'Ustoz akkaunti administrator tasdiqlagunga qadar cheklangan holatda turadi.')}</span></p>
      )}

      {mode === 'login' && (
        <div className="auth-demo">
          <span>{t(language, 'Demo akkauntlar')}</span>
          {DEMO_ACCOUNTS.map((account) => (
            <button type="button" key={account.identifier} onClick={() => { setForm((current) => ({ ...current, identifier: account.identifier, password: account.password })); setMessage(''); setErrors({}) }}>
              <strong>{t(language, account.label)}</strong>
              <small>{account.identifier}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default LoginForm
