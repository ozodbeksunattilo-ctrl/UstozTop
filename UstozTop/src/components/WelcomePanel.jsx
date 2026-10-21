import { FiBookOpen, FiTrendingUp, FiZap } from 'react-icons/fi'
import { translate as t } from '../i18n.js'

function WelcomePanel({ language }) {
  return (
    <section className="auth-hero">
      <span className="auth-pill"><FiZap aria-hidden="true" /> {t(language, 'Bilim bilan kelajak sari')}</span>
      <h1>
        {t(language, 'Katta maqsadlar.')}<br />
        {t(language, 'Aniq yo‘l. Sizning')}<br />
        <span>{t(language, 'ustozingiz.')}</span>
      </h1>
      <p>{t(language, 'Eng yaxshi ustozlarni toping, bilimingizni rivojlantiring va har bir qadamingizni natijaga aylantiring.')}</p>
      <div className="auth-chips">
        <span className="auth-chip"><FiBookOpen aria-hidden="true" /> {t(language, 'Sizga mos ustoz')}</span>
        <span className="auth-chip"><FiTrendingUp aria-hidden="true" /> {t(language, 'Ko‘rinadigan natija')}</span>
        <span className="auth-chip"><FiZap aria-hidden="true" /> {t(language, 'AI bilan grant')}</span>
      </div>
    </section>
  )
}

export default WelcomePanel
