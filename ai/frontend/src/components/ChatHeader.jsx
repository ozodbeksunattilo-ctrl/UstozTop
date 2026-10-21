import { ArrowLeftIcon, LogoIcon, TrashIcon } from './Icons.jsx'

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5173/'

const STATUS_MAP = {
  online: { dot: 'bg-emerald-400', ring: 'bg-emerald-400/30', text: 'Onlayn · Gemini AI' },
  checking: { dot: 'bg-amber-400', ring: 'bg-amber-400/30', text: 'Ulanmoqda...' },
  offline: { dot: 'bg-rose-500', ring: 'bg-rose-500/30', text: 'Oflayn · server bilan aloqa yo\'q' },
  unconfigured: { dot: 'bg-amber-400', ring: 'bg-amber-400/30', text: 'API kaliti sozlanmagan' },
}

export default function ChatHeader({ status, model, onClear, hasMessages, onBack }) {
  const state = STATUS_MAP[status] || STATUS_MAP.checking

  return (
    <header className="ai-header flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0a0b14]/70 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        {onBack ? (
          <button type="button" className="ai-back-link" onClick={onBack} aria-label="O‘quvchi kabinetiga qaytish"><ArrowLeftIcon /><span>Kabinet</span></button>
        ) : (
          <a className="ai-back-link" href={DASHBOARD_URL} aria-label="O‘quvchi kabinetiga qaytish"><ArrowLeftIcon /><span>Kabinet</span></a>
        )}
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-900/40">
          <LogoIcon className="h-6 w-6" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0a0b14]">
            <span className={`h-2.5 w-2.5 rounded-full ${state.dot}`} />
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold text-white sm:text-base">UstozTop AI</h1>
            <span className="hidden rounded border border-violet-400/25 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-300 sm:inline">
              AI
            </span>
          </div>
          <p className="flex items-center gap-1.5 truncate text-[11px] text-[#8f8aa8] sm:text-xs">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${state.dot}`} />
            <span className="truncate">{state.text}</span>
            {status === 'online' && model && (
              <>
                <span className="hidden text-[#4f4b66] sm:inline">•</span>
                <span className="hidden truncate text-[#6f6a8a] sm:inline">{model}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          disabled={!hasMessages}
          title="Suhbatni tozalash"
          aria-label="Suhbatni tozalash"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-[#b9b4d0] transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/[0.04] disabled:hover:text-[#b9b4d0]"
        >
          <TrashIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Tozalash</span>
        </button>
      </div>
    </header>
  )
}
