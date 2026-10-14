import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffApi } from '../api/client';
import { staffSession, useSession } from './sessionStore';
import { AuthContext } from './AuthContextValue';

export function AuthProvider({ children }) {
  const session = useSession(staffSession);
  const navigate = useNavigate();

  const verifySession = useCallback(async () => {
    const current = staffSession.getSnapshot();
    if (!current.token) {
      staffSession.update({ principal: null, loading: false, error: null });
      return;
    }
    staffSession.update({ loading: true, error: null });
    try {
      const response = await staffApi.get('/auth/me');
      if (staffSession.getSnapshot().token !== current.token) return;
      staffSession.update({ principal: response.data, loading: false, error: null });
    } catch (error) {
      if (staffSession.getSnapshot().token === current.token && error.status !== 401) {
        staffSession.update({ loading: false, error });
      }
    }
  }, []);

  useEffect(() => {
    if (session.token && !session.principal) verifySession();
  }, [session.token, session.principal, verifySession]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await staffApi.post('/auth/login', { email: email.trim(), password }, { skipAuth: true });
      const { token, user } = response.data;
      if (!token || !user) throw new Error('The sign-in response was incomplete.');
      staffSession.update({ token, principal: user, loading: false, error: null });
      navigate('/');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed.' };
    }
  }, [navigate]);

  const register = useCallback(async (name, email, password, organizationName) => {
    try {
      const response = await staffApi.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
        organizationName: organizationName.trim(),
      }, { skipAuth: true });
      const { token, user } = response.data;
      if (!token || !user) throw new Error('The registration response was incomplete.');
      staffSession.update({ token, principal: user, loading: false, error: null });
      navigate('/');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Registration failed.' };
    }
  }, [navigate]);

  const logout = useCallback(() => {
    staffSession.clear();
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(() => ({
    user: session.principal,
    loading: session.loading,
    error: session.error,
    login,
    register,
    logout,
    retrySession: verifySession,
  }), [session.principal, session.loading, session.error, login, register, logout, verifySession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
