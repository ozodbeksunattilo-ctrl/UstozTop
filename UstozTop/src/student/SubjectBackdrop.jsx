import './backdrop.css'

function SubjectBackdrop({ subject, compact = false }) {
  const symbols = compact ? subject.symbols.slice(0, 4) : subject.symbols
  return (
    <div
      className={`subject-backdrop ${compact ? 'subject-backdrop-compact' : ''}`}
      style={{ '--subject-accent': subject.color }}
      aria-hidden="true"
    >
      <div className="subject-backdrop-glow" />
      <div className="subject-backdrop-grid" />
      <span className="subject-orbit subject-orbit-1"><i /></span>
      <span className="subject-orbit subject-orbit-2"><i /></span>
      {symbols.map((symbol, index) => (
        <span
          key={`${subject.id}-${symbol}`}
          className={`subject-float subject-float-${index + 1}`}
        >
          {symbol}
        </span>
      ))}
      {!compact && <div className="subject-backdrop-center">{subject.icon}</div>}
    </div>
  )
}

export default SubjectBackdrop
