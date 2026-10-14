import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import AsyncState from './AsyncState';

function ProtectedRoute({ children }) {
  const { user, loading, error, retrySession } = useAuth();

  if (loading || (error && error.status !== 401)) {
    return <AsyncState loading={loading} error={error} onRetry={retrySession} loadingMessage="Verifying your staff session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
