import { CameraIcon, ImageIcon, SparkIcon } from './Icons.jsx'

export const SUGGESTIONS = [
  {
    title: 'JavaScriptni tushuntir',
    prompt:
      'JavaScript nima va u qanday ishlaydi? Boshlang\'ich darajada sodda misollar bilan bosqichma-bosqich tushuntir.',
    icon: '{}',
    accent: 'from-amber-400/20 to-orange-500/10 text-amber-300',
  },
  {
    title: 'Matematikadan yordam ber',
    prompt: 'Kvadrat tenglamani yechishni bosqichma-bosqich tushuntir va bitta misol yechib ber.',
    icon: '∑',
    accent: 'from-sky-400/20 to-blue-500/10 text-sky-300',
  },
  {
    title: 'Ingliz tilini o\'rgat',
    prompt: 'Ingliz tilidagi Present Simple zamonini o\'zbek tilida misollar bilan tushuntir.',
    icon: 'Aa',
    accent: 'from-emerald-400/20 to-teal-500/10 text-emerald-300',
  },
  {
    title: 'Kod yozishni o\'rgat',
    prompt: 'Python dasturlash tilida Fibonacci sonlarini hisoblaydigan kodni yozib, har bir qatorini tushuntir.',
    icon: '</>',
    accent: 'from-violet-400/20 to-fuchsia-500/10 text-violet-300',
  },
]

export default function WelcomeScreen({ onPick }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center py-6">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-3xl shadow-2xl shadow-violet-900/40">
          <SparkIcon className="h-8 w-8" />
        </div>
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-violet-300">
          <SparkIcon className="h-3 w-3" />
          Matn va rasm tahlili
        </p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Assalomu alaykum! Men <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">UstozTop AI</span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#a39fbd] sm:text-[15px]">
          Masalani suratga oling yoki rasmni yuklang — birga tahlil qilib, yechimini bosqichma-bosqich topamiz.
          Matematika, til, tarix, IT va boshqa fanlardan savol bering.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onPick(item.prompt)}
            className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-left transition hover:border-violet-400/30 hover:bg-white/[0.06]"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-mono text-sm font-semibold ${item.accent}`}
            >
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[#e9e7f7] group-hover:text-white">{item.title}</span>
              <span className="mt-0.5 block truncate text-xs text-[#8b87a3]">Boshlash uchun bosing</span>
            </span>
          </button>
        ))}
      </div>
      <div className="ai-welcome-photo-hint">
        <span><ImageIcon /> Rasm yuklab savol berish</span>
        <i />
        <span><CameraIcon /> Telefon kamerasidan suratga olish</span>
      </div>
    </div>
  )
}
