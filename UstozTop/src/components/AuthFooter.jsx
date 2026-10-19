function AuthFooter() {
  return (
    <footer className="mx-auto flex min-h-[22px] w-full max-w-[1340px] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[9px] text-[#686d89] sm:justify-between">
      <span>© 2026 UstozTop</span>
      <div className="flex items-center gap-2.5">
        <a href="#privacy" className="transition hover:text-white">Maxfiylik siyosati</a>
        <span>·</span>
        <a href="#terms" className="transition hover:text-white">Foydalanish shartlari</a>
      </div>
      <span className="hidden text-right lg:inline">Interfeys konsepti · Natijaga yo‘naltirilgan ta’lim</span>
    </footer>
  )
}

export default AuthFooter
