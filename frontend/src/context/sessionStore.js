import { useSyncExternalStore } from 'react';
import { onUnauthorized } from '../api/client';

function createSessionStore(sessionType) {
  const key = `${sessionType}AccessToken`;
  let token = sessionStorage.getItem(key);
  let principal = null;
  let loading = Boolean(token);
  let error = null;
  let state = { token, principal, loading, error };
  const listeners = new Set();

  const snapshot = () => state;
  const notify = () => listeners.forEach((listener) => listener());
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const update = (changes) => {
    if ('token' in changes) {
      token = changes.token;
      if (token) sessionStorage.setItem(key, token);
      else sessionStorage.removeItem(key);
    }
    if ('principal' in changes) principal = changes.principal;
    if ('loading' in changes) loading = changes.loading;
    if ('error' in changes) error = changes.error;
    state = { token, principal, loading, error };
    notify();
  };
  const clear = (sessionError = null) => {
    sessionStorage.removeItem(key);
    token = null;
    principal = null;
    loading = false;
    error = sessionError;
    state = { token, principal, loading, error };
    notify();
  };

  onUnauthorized(sessionType, (sessionError) => clear(sessionError));

  return { getSnapshot: snapshot, subscribe, update, clear };
}

export const staffSession = createSessionStore('staff');
export const tenantSession = createSessionStore('tenant');

export function useSession(store) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
