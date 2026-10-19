import { FiBookOpen, FiTrendingUp, FiZap } from 'react-icons/fi'
import LearningArtwork from './LearningArtwork.jsx'

function WelcomePanel() {
  return (
    <aside className="hidden min-h-[560px] flex-col rounded-[22px] border border-[#9c9acd]/15 bg-[radial-gradient(ellipse_at_42%_57%,rgba(92,64,178,.18),transparent_55%),linear-gradient(143deg,rgba(20,22,43,.96),rgba(12,15,31,.98))] p-6 shadow-[0_22px_70px_rgba(0,0,0,.2)] md:flex xl:min-h-[640px] xl:p-8">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.055em] text-[#c2adff]">
        <FiZap aria-hidden="true" size={13} />
        Bilim bilan kelajak sari
      </div>
      <h1 className="mb-3 mt-5 text-[clamp(32px,3.15vw,43px)] font-semibold leading-[1.12] tracking-[-.045em] text-[#f0efff]">
        Katta maqsadlar.<br />
        Aniq yo‘l. Sizning<br />
        ustozingiz.
      </h1>
      <p className="m-0 max-w-[430px] text-[13px] leading-[1.7] text-[#989cb8]">
        Eng yaxshi ustozlarni toping, bilimingizni rivojlantiring va har bir qadamingizni natijaga aylantiring.
      </p>
      <div className="mt-5 h-[clamp(185px,22vw,285px)] min-h-[185px] overflow-hidden rounded-[14px] border border-[#9986cd]/10 bg-[radial-gradient(ellipse_at_50%_48%,rgba(70,47,139,.2),transparent_57%),linear-gradient(150deg,#080a15,#0b0d1a_60%,#080a13)]">
        <LearningArtwork />
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#a7a7ca]/10 pt-5 text-[10px] text-[#a4a7c0]">
        <span className="flex items-center gap-2 whitespace-nowrap"><FiBookOpen className="text-[#ad91ff]" /> Sizga mos ustoz</span>
        <span className="flex items-center gap-2 whitespace-nowrap"><FiTrendingUp className="text-[#ad91ff]" /> Ko‘rinadigan natija</span>
        <span className="flex items-center gap-2 whitespace-nowrap"><FiZap className="text-[#ad91ff]" /> AI bilan grant</span>
      </div>
    </aside>
  )
}

export default WelcomePanel
