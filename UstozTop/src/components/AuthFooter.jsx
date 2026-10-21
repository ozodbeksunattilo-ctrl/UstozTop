import { translate as t } from '../i18n.js'

function AuthFooter({ language }) {
  return (
    <footer className="auth-footer">
      <span>© 2026 UstozTop</span>
      <span>
        <a href="#privacy">{t(language, 'Maxfiylik siyosati')}</a> · <a href="#terms">{t(language, 'Foydalanish shartlari')}</a>
      </span>
    </footer>
  )
}

export default AuthFooter
