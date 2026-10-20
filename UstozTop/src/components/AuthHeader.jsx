import { FiMoon, FiSun } from 'react-icons/fi'
import logo from '../assets/UstozTop.jpg'
import { translate as t } from '../i18n.js'

function AuthHeader({ language, onLanguageChange, theme, onThemeToggle }) {
  const lightTheme = theme === 'light'

  return (
    <header className="auth-header mx-auto flex w-full max-w-[1340px] items-center justify-between">
      <a href="/" aria-label={`UstozTop ${t(language, 'Bosh sahifa')}`} className="inline-flex min-w-0 items-center gap-3 text-[15px] tracking-tight text-[#e8e7f4]">
        <img
          src={logo}
          alt="UstozTop"
          className="h-16 w-16 shrink-0 rounded-xl border border-amber-200/30 object-contain sm:h-[76px] sm:w-[76px]"
        />
        <span className="truncate font-semibold sm:text-base">UstozTop</span>
      </a>

      <nav aria-label={t(language, 'Til va mavzuni tanlash')} className="flex items-center gap-3 text-[11px] text-[#858aa9] sm:gap-5">
        <a href="mailto:yordam@ustoztop.uz" className="hidden transition hover:text-white sm:inline">
          {t(language, 'Yordam kerakmi?')}
        </a>
        <label className="sr-only" htmlFor="auth-language">{t(language, 'Til va mavzuni tanlash')}</label>
        <select
          id="auth-language"
          aria-label={t(language, 'Til va mavzuni tanlash')}
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
          className="auth-language-select rounded-md border border-[#969abf]/20 bg-[#101322] px-2 py-1.5 text-[10px] text-[#d5d4e7] outline-none focus:border-[#936fff]/80"
        >
          <option value="uz">{t(language, 'UZ — lotin')}</option>
          <option value="ru">{t(language, 'RU — ruscha')}</option>
          <option value="uz-Cyrl">{t(language, 'ЎЗ — кирилл')}</option>
          <option value="en">{t(language, 'EN — English')}</option>
        </select>
        <button
          type="button"
          onClick={onThemeToggle}
          aria-label={t(language, lightTheme ? 'Qorong‘i mavzuga o‘tish' : 'Yorug‘ mavzuga o‘tish')}
          title={t(language, lightTheme ? 'Qorong‘i mavzuga o‘tish' : 'Yorug‘ mavzuga o‘tish')}
          className="grid size-8 place-items-center rounded-full border border-[#969abf]/20 text-[#b4b6cc] transition hover:border-[#b49bff]/60 hover:text-white"
        >
          {lightTheme ? <FiMoon aria-hidden="true" size={15} /> : <FiSun aria-hidden="true" size={15} />}
        </button>
      </nav>
    </header>
  )
}

export default AuthHeader
