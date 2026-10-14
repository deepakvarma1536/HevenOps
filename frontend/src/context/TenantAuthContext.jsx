import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi } from '../api/client';
import { tenantSession, useSession } from './sessionStore';
import { TenantAuthContext } from './TenantAuthContextValue';

export function TenantAuthProvider({ children }) {
  const session = useSession(tenantSession);
  const navigate = useNavigate();

  const verifySession = useCallback(async () => {
    const current = tenantSession.getSnapshot();
    if (!current.token) {
      tenantSession.update({ principal: null, loading: false, error: null });
      return;
    }
    tenantSession.update({ loading: true, error: null });
    try {
      const response = await tenantApi.get('/tenant-portal/me');
      if (tenantSession.getSnapshot().token !== current.token) return;
      tenantSession.update({ principal: response.data, loading: false, error: null });
    } catch (error) {
      if (tenantSession.getSnapshot().token === current.token && error.status !== 401) {
        tenantSession.update({ loading: false, error });
      }
    }
  }, []);

  useEffect(() => {
    if (session.token && !session.principal) verifySession();
  }, [session.token, session.principal, verifySession]);

  const login = useCallback(async (identifier, password) => {
    try {
      const response = await tenantApi.post('/tenant-auth/login', { identifier: identifier.trim(), password }, { skipAuth: true });
      const { token, tenant } = response.data;
      if (!token || !tenant) throw new Error('The sign-in response was incomplete.');
      tenantSession.update({ token, principal: tenant, loading: false, error: null });
      navigate('/tenant');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed.' };
    }
  }, [navigate]);

  const logout = useCallback(() => {
    tenantSession.clear();
    navigate('/tenant/login', { replace: true });
  }, [navigate]);

  const value = useMemo(() => ({
    tenant: session.principal,
    loading: session.loading,
    error: session.error,
    login,
    logout,
    tenantApi,
    retrySession: verifySession,
  }), [session.principal, session.loading, session.error, login, logout, verifySession]);

  return <TenantAuthContext.Provider value={value}>{children}</TenantAuthContext.Provider>;
}
