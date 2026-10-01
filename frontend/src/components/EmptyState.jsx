function EmptyState({
  icon = "🔍",
  title = "No matching records found",
  message = "Try clearing your search query or changing the filter options.",
  onReset,
  resetText = "Reset Filters",
}) {
  return (
    <div className="empty-state-box" role="status" aria-live="polite">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-message">{message}</p>
      {onReset && (
        <button type="button" className="outline-btn" onClick={onReset}>
          {resetText}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
