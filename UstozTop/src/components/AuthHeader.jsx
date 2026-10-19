import { FiSun } from 'react-icons/fi'
import logo from '../assets/UstozTop.jpg'

function AuthHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1340px] items-center justify-between">
      <a href="/" aria-label="UstozTop bosh sahifa" className="inline-flex min-w-0 items-center gap-3 text-[15px] tracking-tight text-[#e8e7f4]">
        <img
          src={logo}
          alt="UstozTop"
          className="h-14 w-14 shrink-0 rounded-xl border border-amber-200/30 object-contain sm:h-[72px] sm:w-[72px]"
        />
        <span className="truncate font-semibold sm:text-base">UstozTop</span>
      </a>

      <nav aria-label="Yordam va til sozlamalari" className="flex items-center gap-4 text-[11px] text-[#858aa9] sm:gap-6">
        <a href="mailto:yordam@ustoztop.uz" className="hidden transition hover:text-white sm:inline">
          Yordam kerakmi?
        </a>
        <button type="button" aria-label="Til: o‘zbekcha" className="py-1 text-[#b4b6cc]">
          UZ <span className="mx-1 text-[#5e627d]">/</span> RU
        </button>
        <button type="button" aria-label="Mavzu sozlamalari" className="hidden p-1 text-[#b4b6cc] sm:grid sm:place-items-center">
          <FiSun aria-hidden="true" size={15} />
        </button>
      </nav>
    </header>
  )
}

export default AuthHeader
