import { LogoIcon } from './Icons.jsx'

export default function TypingIndicator() {
  return (
    <div className="message-in flex gap-3" aria-live="polite" aria-label="UstozTop AI javob yozmoqda">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-900/30">
        <LogoIcon className="h-[18px] w-[18px]" />
      </div>
      <div className="rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.045] px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <span className="text-xs text-[#9a95b5]">O'ylayapman...</span>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="skeleton-line w-40" />
          <div className="skeleton-line w-56" />
          <div className="skeleton-line w-32" />
        </div>
      </div>
    </div>
  )
}
