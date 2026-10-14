import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, onUnauthorized, staffApi, tenantApi } from './client';

function installAdapter(client, implementation) {
  const originalAdapter = client.defaults.adapter;
  client.defaults.adapter = implementation;
  return () => {
    client.defaults.adapter = originalAdapter;
  };
}

function successAdapter(config) {
  return Promise.resolve({
    data: { authorization: config.headers.get('Authorization') || null },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}

afterEach(() => {
  sessionStorage.clear();
});

describe('API clients', () => {
  it('uses separate staff and tenant bearer tokens', async () => {
    sessionStorage.setItem('staffAccessToken', 'staff-token');
    sessionStorage.setItem('tenantAccessToken', 'tenant-token');
    const restoreStaff = installAdapter(staffApi, successAdapter);
    const restoreTenant = installAdapter(tenantApi, successAdapter);

    try {
      expect((await staffApi.get('/private')).data.authorization).toBe('Bearer staff-token');
      expect((await tenantApi.get('/private')).data.authorization).toBe('Bearer tenant-token');
    } finally {
      restoreStaff();
      restoreTenant();
    }
  });

  it('omits an existing bearer token for explicitly unauthenticated requests', async () => {
    sessionStorage.setItem('staffAccessToken', 'staff-token');
    const restore = installAdapter(staffApi, successAdapter);

    try {
      expect((await staffApi.post('/auth/login', {}, { skipAuth: true })).data.authorization).toBeNull();
    } finally {
      restore();
    }
  });

  it('normalizes API errors and clears only the matching session on authenticated 401s', async () => {
    sessionStorage.setItem('staffAccessToken', 'staff-token');
    sessionStorage.setItem('tenantAccessToken', 'tenant-token');
    const unauthorized = vi.fn(() => sessionStorage.removeItem('staffAccessToken'));
    const unsubscribe = onUnauthorized('staff', unauthorized);
    const restore = installAdapter(staffApi, (config) => Promise.reject({
      config,
      response: {
        status: 401,
        data: { error: { code: 'SESSION_EXPIRED', message: 'Session expired', requestId: 'request-123', details: [] } },
        headers: {},
      },
    }));

    try {
      await expect(staffApi.get('/private')).rejects.toMatchObject({
        name: 'ApiError',
        code: 'SESSION_EXPIRED',
        message: 'Session expired',
        status: 401,
        requestId: 'request-123',
        details: [],
      });
      expect(unauthorized).toHaveBeenCalledOnce();
      expect(unauthorized.mock.calls[0][0]).toBeInstanceOf(ApiError);
      expect(sessionStorage.getItem('staffAccessToken')).toBeNull();
      expect(sessionStorage.getItem('tenantAccessToken')).toBe('tenant-token');

      const removeSecondHandler = onUnauthorized('staff', () => undefined);
      unsubscribe();
      removeSecondHandler();
      expect(unauthorized).toHaveBeenCalledOnce();
    } finally {
      unsubscribe();
      restore();
    }
  });

  it('normalizes network failures without marking them as authenticated 401s', async () => {
    const restore = installAdapter(tenantApi, (config) => Promise.reject({ config, message: 'offline' }));
    try {
      await expect(tenantApi.get('/private')).rejects.toMatchObject({
        name: 'ApiError',
        code: 'NETWORK_ERROR',
        message: 'Unable to connect. Check your connection and try again.',
        status: null,
      });
    } finally {
      restore();
    }
  });
});
