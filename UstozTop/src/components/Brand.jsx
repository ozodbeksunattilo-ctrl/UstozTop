import logo from '../assets/UstozTop.jpg'

// Logotip rasmi kvadrat va atrofi bo'sh, shuning uchun faqat gerb qismi kesib ko'rsatiladi (kichik o'lchamda ham aniq ko'rinadi).
export function LogoMark({ size = 46 }) {
  return (
    <i className="logo-mark" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }} aria-hidden="true">
      <img src={logo} alt="" draggable="false" />
    </i>
  )
}

export function BrandName({ className = '' }) {
  return <span className={`brand-name ${className}`}>UstozTop</span>
}
