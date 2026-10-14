import { Navigate } from 'react-router-dom';
import { useTenantAuth } from '../context/useTenantAuth';
import AsyncState from './AsyncState';

function TenantProtectedRoute({ children }) {
  const { tenant, loading, error, retrySession } = useTenantAuth();

  if (loading || (error && error.status !== 401)) {
    return <AsyncState loading={loading} error={error} onRetry={retrySession} loadingMessage="Verifying your tenant session..." />;
  }

  if (!tenant) {
    return <Navigate to="/tenant/login" replace />;
  }

  return children;
}

export default TenantProtectedRoute;
