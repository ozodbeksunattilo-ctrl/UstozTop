import { useEffect, useRef, useState } from 'react'
import { FiCheck, FiChevronDown, FiGlobe } from 'react-icons/fi'
import './languageSelect.css'

const LANGUAGES = [
  { value: 'uz', code: 'UZ', label: 'O‘zbekcha', hint: 'Lotin' },
  { value: 'ru', code: 'RU', label: 'Русский', hint: 'Russian' },
  { value: 'uz-Cyrl', code: 'ЎЗ', label: 'Ўзбекча', hint: 'Кирилл' },
  { value: 'en', code: 'EN', label: 'English', hint: 'English' },
]

function LanguageSelect({ value, onChange, label = 'Language', align = 'right' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const current = LANGUAGES.find((item) => item.value === value) || LANGUAGES[0]

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="lang" ref={rootRef}>
      <button type="button" className="lang-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((state) => !state)}>
        <FiGlobe aria-hidden="true" />
        <strong>{current.code}</strong>
        <FiChevronDown aria-hidden="true" className={`lang-caret ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <ul className={`lang-menu lang-menu-${align}`} role="listbox" aria-label={label}>
          {LANGUAGES.map((item) => (
            <li key={item.value}>
              <button type="button" role="option" aria-selected={item.value === value} className={item.value === value ? 'is-selected' : ''} onClick={() => { onChange(item.value); setOpen(false) }}>
                <span className="lang-code">{item.code}</span>
                <span className="lang-name"><strong>{item.label}</strong><small>{item.hint}</small></span>
                {item.value === value && <FiCheck aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default LanguageSelect
