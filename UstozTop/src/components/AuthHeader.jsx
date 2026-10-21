import { FiMoon, FiSun } from 'react-icons/fi'
import LanguageSelect from './LanguageSelect.jsx'
import { BrandName, LogoMark } from './Brand.jsx'
import { translate as t } from '../i18n.js'

function AuthHeader({ language, onLanguageChange, theme, onThemeToggle }) {
  const lightTheme = theme === 'light'
  const themeLabel = t(language, lightTheme ? 'Qorong‘i mavzuga o‘tish' : 'Yorug‘ mavzuga o‘tish')

  return (
    <header className="auth-header">
      <a href="/" className="auth-brand" aria-label={`UstozTop ${t(language, 'Bosh sahifa')}`}>
        <LogoMark size={68} />
        <BrandName />
      </a>

      <nav className="auth-tools" aria-label={t(language, 'Til va mavzuni tanlash')}>
        <LanguageSelect value={language} onChange={onLanguageChange} label={t(language, 'Til va mavzuni tanlash')} />
        <button type="button" className="auth-theme" onClick={onThemeToggle} aria-label={themeLabel} title={themeLabel}>
          {lightTheme ? <FiMoon aria-hidden="true" size={17} /> : <FiSun aria-hidden="true" size={17} />}
        </button>
      </nav>
    </header>
  )
}

export default AuthHeader
