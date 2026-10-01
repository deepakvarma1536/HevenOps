function StatCard({
  title,
  value,
  subtext,
  icon,
  trend,
  colorTheme = "forest",
}) {
  return (
    <div className={`stat-card theme-${colorTheme}`}>
      <div className="stat-card-header">
        <span className="stat-label">{title}</span>
        {icon && (
          <div className={`stat-icon-badge badge-${colorTheme}`} aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
      <h3 className="stat-value">{value}</h3>
      <div className="stat-footer">
        {trend && (
          <span className={`stat-trend ${trend.positive ? "positive" : "negative"}`}>
            {trend.positive ? "↑" : "↓"} {trend.text}
          </span>
        )}
        {subtext && <p className="stat-subtext">{subtext}</p>}
      </div>
    </div>
  );
}

export default StatCard;
