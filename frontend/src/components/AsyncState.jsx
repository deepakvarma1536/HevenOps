export default function AsyncState({ loading, error, onRetry, children, loadingMessage = 'Loading...' }) {
  if (loading) {
    return <div className="async-state" role="status" aria-live="polite">{loadingMessage}</div>;
  }

  if (error) {
    const unauthorized = error.status === 401;
    return (
      <div className="async-state async-state-error" role="alert">
        <p>{unauthorized ? 'Your session has expired. Please sign in again.' : error.message || 'Unable to load this information.'}</p>
        {!unauthorized && onRetry && <button type="button" className="outline-btn" onClick={onRetry}>Try again</button>}
      </div>
    );
  }

  return children;
}
