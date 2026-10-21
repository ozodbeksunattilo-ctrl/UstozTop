import './fx.css'

// Har bir sahifa o'ziga mos "uchib yuruvchi" narsalar to'plamiga ega.
// [belgi, chapdan %, tepadan %, o'lcham px, davomiylik s, kechikish s, harakat turi]
const SETS = {
  auth: [
    ['∑', 6, 14, 44, 16, 0, 'float'], ['π', 90, 12, 40, 19, -4, 'sway'], ['E=mc²', 76, 78, 22, 17, -8, 'float'],
    ['</>', 8, 72, 26, 21, -2, 'sway'], ['A+', 46, 6, 34, 15, -6, 'bob'], ['√x', 93, 46, 34, 18, -9, 'float'],
    ['H₂O', 3, 44, 24, 20, -12, 'bob'], ['Hello!', 62, 90, 22, 22, -3, 'sway'], ['∞', 30, 86, 40, 18, -7, 'float'],
    ['♫', 82, 30, 34, 14, -5, 'bob'], ['x² + y²', 20, 28, 20, 23, -10, 'sway'], ['✎', 54, 70, 36, 16, -1, 'float'],
    ['★', 70, 8, 26, 13, -11, 'spin'], ['Δ', 38, 94, 30, 19, -14, 'bob'], ['%', 15, 92, 32, 17, -6, 'sway'],
    ['◆', 96, 70, 22, 12, -2, 'spin'], ['?', 25, 58, 34, 20, -8, 'float'], ['2+2=4', 88, 90, 20, 24, -13, 'sway'],
  ],
  overview: [
    ['∑', 4, 18, 40, 17, 0, 'float'], ['π', 93, 24, 38, 19, -5, 'sway'], ['A+', 90, 70, 34, 15, -8, 'bob'],
    ['✎', 5, 66, 34, 18, -3, 'float'], ['√x', 48, 92, 30, 21, -10, 'sway'], ['★', 96, 48, 24, 12, -4, 'spin'],
    ['∞', 8, 90, 34, 20, -7, 'bob'], ['Δ', 70, 6, 28, 16, -12, 'float'],
  ],
  teachers: [
    ['★', 5, 20, 34, 14, 0, 'spin'], ['❝', 92, 16, 46, 20, -5, 'sway'], ['✎', 7, 70, 34, 17, -3, 'float'],
    ['☆', 94, 62, 30, 13, -8, 'spin'], ['♛', 50, 92, 30, 18, -6, 'bob'], ['A+', 88, 88, 28, 16, -10, 'bob'],
    ['☺', 3, 46, 32, 19, -2, 'sway'],
  ],
  subjects: [
    ['∑', 4, 14, 40, 18, 0, 'float'], ['H₂O', 92, 20, 24, 20, -5, 'sway'], ['E=mc²', 90, 66, 20, 17, -8, 'float'],
    ['</>', 6, 62, 26, 21, -3, 'bob'], ['Hello', 46, 94, 22, 19, -9, 'sway'], ['♫', 95, 44, 34, 14, -4, 'bob'],
    ['⚛', 4, 88, 36, 16, -7, 'spin'], ['π', 66, 5, 32, 18, -11, 'float'], ['◎', 22, 94, 30, 22, -2, 'sway'],
  ],
  ratings: [
    ['♛', 5, 18, 40, 16, 0, 'bob'], ['#1', 93, 22, 30, 15, -4, 'float'], ['★', 7, 64, 30, 12, -6, 'spin'],
    ['▲', 92, 70, 28, 18, -9, 'bob'], ['◆', 48, 93, 24, 13, -2, 'spin'], ['★', 96, 46, 22, 11, -7, 'spin'],
    ['#2', 4, 90, 24, 17, -11, 'float'],
  ],
  results: [
    ['✓', 5, 20, 38, 16, 0, 'bob'], ['%', 93, 18, 36, 18, -5, 'sway'], ['A', 6, 68, 34, 15, -3, 'float'],
    ['30/30', 90, 72, 20, 20, -8, 'sway'], ['↗', 48, 93, 36, 14, -6, 'bob'], ['B+', 95, 46, 28, 17, -10, 'float'],
  ],
  ai: [
    ['✦', 5, 20, 38, 12, 0, 'spin'], ['?', 93, 24, 40, 17, -5, 'float'], ['</>', 7, 70, 26, 20, -3, 'sway'],
    ['∴', 92, 70, 32, 15, -8, 'bob'], ['!', 50, 94, 34, 16, -6, 'float'], ['◎', 96, 46, 28, 18, -10, 'sway'],
  ],
  profile: [
    ['★', 5, 22, 32, 13, 0, 'spin'], ['♡', 93, 20, 34, 16, -5, 'bob'], ['✎', 7, 68, 32, 18, -3, 'float'],
    ['@', 92, 68, 30, 17, -8, 'sway'], ['✿', 48, 94, 32, 15, -6, 'bob'],
  ],
  admin: [
    ['▦', 94, 18, 30, 18, 0, 'sway'], ['%', 6, 24, 30, 16, -5, 'float'], ['∑', 92, 72, 34, 19, -8, 'bob'],
    ['◈', 5, 76, 28, 14, -3, 'spin'], ['#', 52, 94, 26, 17, -9, 'float'],
  ],
  teacher: [
    ['✎', 94, 16, 34, 17, 0, 'float'], ['✓', 5, 22, 30, 15, -5, 'bob'], ['A+', 93, 74, 28, 16, -8, 'sway'],
    ['★', 6, 78, 26, 12, -3, 'spin'], ['∑', 50, 94, 30, 18, -9, 'float'],
  ],
}

function Floaters({ variant = 'overview', accent }) {
  const items = SETS[variant] || SETS.overview
  return (
    <div className={`floaters floaters-${variant}`} style={accent ? { '--floater': accent } : undefined} aria-hidden="true">
      {items.map(([glyph, x, y, size, duration, delay, motion], index) => (
        <span key={`${glyph}-${index}`} className={`floater floater-${motion}`} style={{ left: `${x}%`, top: `${y}%`, fontSize: size, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>{glyph}</span>
      ))}
      <i className="floater-orb floater-orb-1" />
      <i className="floater-orb floater-orb-2" />
    </div>
  )
}

export default Floaters
