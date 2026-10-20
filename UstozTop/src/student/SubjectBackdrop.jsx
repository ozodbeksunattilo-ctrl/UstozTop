function SubjectBackdrop({ subject }) {
  return (
    <div
      className="subject-backdrop"
      style={{ '--subject-accent': subject.color }}
      aria-hidden="true"
    >
      <div className="subject-backdrop-glow" />
      {subject.symbols.map((symbol, index) => (
        <span
          key={`${subject.id}-${symbol}`}
          className={`subject-float subject-float-${index + 1}`}
        >
          {symbol}
        </span>
      ))}
      <div className="subject-backdrop-center">{subject.icon}</div>
    </div>
  )
}

export default SubjectBackdrop
