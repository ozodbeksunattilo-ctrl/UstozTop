export function StatCard({ label, value, hint, icon: Icon, accent }) {
  return (
    <article className="role-stat" style={{ '--role-accent': accent }}>
      <span className="role-stat-icon"><Icon aria-hidden="true" /></span>
      <span className="role-stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}

export function Card({ title, subtitle, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`role-card ${className}`}>
      <div className="role-card-heading">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        {action || (Icon && <Icon aria-hidden="true" />)}
      </div>
      {children}
    </section>
  )
}

export function localDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
