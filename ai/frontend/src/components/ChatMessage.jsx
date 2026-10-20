import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertIcon, CheckIcon, CopyIcon, LogoIcon, RefreshIcon } from './Icons.jsx'
import { renderMarkdown } from '../lib/markdown.js'

const LANG_LABELS = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  py: 'Python',
  python: 'Python',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  bash: 'Bash',
  sh: 'Shell',
  sql: 'SQL',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  php: 'PHP',
  text: 'Matn',
}

function formatTime(value) {
  try {
    return new Date(value).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const helper = document.createElement('textarea')
    helper.value = text
    helper.setAttribute('readonly', '')
    helper.style.position = 'fixed'
    helper.style.opacity = '0'
    document.body.appendChild(helper)
    helper.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(helper)
    return ok
  }
}

function enhanceCodeBlocks(container) {
  container.querySelectorAll('pre').forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-shell')) return
    const code = pre.querySelector('code')
    if (!code) return

    const rawLang = Array.from(code.classList)
      .find((name) => name.startsWith('language-'))
      ?.replace('language-', '')
      .toLowerCase()
    const label = LANG_LABELS[rawLang] || rawLang?.toUpperCase() || 'Kod'

    const shell = document.createElement('div')
    shell.className = 'code-shell'

    const bar = document.createElement('div')
    bar.className = 'code-bar'

    const lang = document.createElement('span')
    lang.textContent = label

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'copy-btn'
    button.dataset.copy = 'true'
    button.textContent = 'Nusxalash'

    bar.append(lang, button)
    pre.replaceWith(shell)
    shell.append(bar, pre)
  })

  container.querySelectorAll('a').forEach((link) => {
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
  })
}

function AiAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-900/30">
      <LogoIcon className="h-[18px] w-[18px]" />
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-violet-200">
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 20c.4-3.3 3.2-5.2 7-5.2s6.6 1.9 7 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function AssistantMessage({ message, onRetry }) {
  const bodyRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const html = useMemo(() => (message.error ? '' : renderMarkdown(message.content)), [message.content, message.error])

  useEffect(() => {
    if (!bodyRef.current || message.error) return
    enhanceCodeBlocks(bodyRef.current)
  }, [html, message.error])

  async function handleBodyClick(event) {
    const button = event.target.closest('button[data-copy]')
    if (!button) return
    const pre = button.closest('.code-shell')?.querySelector('pre code')
    if (!pre) return
    const ok = await copyText(pre.textContent || '')
    if (!ok) return
    button.dataset.copied = 'true'
    button.textContent = 'Nusxalandi'
    setTimeout(() => {
      button.dataset.copied = 'false'
      button.textContent = 'Nusxalash'
    }, 1600)
  }

  async function handleCopyReply() {
    const ok = await copyText(message.content)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }

  if (message.error) {
    return (
      <div className="message-in flex gap-3">
        <AiAvatar />
        <div className="max-w-[85%] min-w-0">
          <div className="rounded-2xl rounded-tl-md border border-rose-500/25 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100">
            <div className="mb-1 flex items-center gap-2 font-medium text-rose-200">
              <AlertIcon className="h-4 w-4" />
              Xatolik yuz berdi
            </div>
            <p className="leading-relaxed text-rose-100/85">{message.content}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 transition hover:bg-rose-500/20"
              >
                <RefreshIcon className="h-3.5 w-3.5" />
                Qayta urinish
              </button>
            )}
          </div>
          <p className="mt-1.5 pl-1 text-[11px] text-[#6f6a8a]">{formatTime(message.time)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="message-in flex gap-3">
      <AiAvatar />
      <div className="min-w-0 max-w-[calc(100%-2.75rem)] sm:max-w-[85%]">
        <div className="group relative rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.045] px-4 py-3.5 text-[#e9e7f7] shadow-sm sm:px-5">
          <div
            ref={bodyRef}
            className="md"
            onClick={handleBodyClick}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <button
            type="button"
            onClick={handleCopyReply}
            title="Javobni nusxalash"
            aria-label="Javobni nusxalash"
            className="absolute -top-2.5 right-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#12131f] text-[#8f8aa8] opacity-0 transition hover:text-white focus:opacity-100 group-hover:opacity-100"
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5 text-emerald-400" /> : <CopyIcon className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-2 pl-1 text-[11px] text-[#6f6a8a]">
          <span>{formatTime(message.time)}</span>
          {message.model && (
            <>
              <span className="h-1 w-1 rounded-full bg-[#4a4660]" />
              <span className="truncate">{message.model}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function UserMessage({ message }) {
  return (
    <div className="message-in flex justify-end gap-3">
      <div className="flex max-w-[85%] min-w-0 flex-col items-end">
        <div className="rounded-2xl rounded-tr-md bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-violet-950/40 sm:px-5">
          {message.image && (
            <img
              src={message.image.dataUrl}
              alt="Suhbatga biriktirilgan rasm"
              className="mb-2 max-h-64 max-w-full rounded-xl object-contain"
            />
          )}
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
        </div>
        <p className="mt-1.5 pr-1 text-[11px] text-[#6f6a8a]">{formatTime(message.time)}</p>
      </div>
      <UserAvatar />
    </div>
  )
}

export default function ChatMessage({ message, onRetry }) {
  return message.role === 'user' ? (
    <UserMessage message={message} />
  ) : (
    <AssistantMessage message={message} onRetry={onRetry} />
  )
}
