import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
const unauthorizedHandlers = new Map();

export class ApiError extends Error {
  constructor({ message, code = 'NETWORK_ERROR', status = null, requestId = null, details = null }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

function createClient(sessionType) {
  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: { Accept: 'application/json' },
  });

  client.interceptors.request.use((config) => {
    if (config.skipAuth) {
      delete config.headers.Authorization;
      delete config.skipAuth;
      return config;
    }
    const token = sessionStorage.getItem(`${sessionType}AccessToken`);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isCancel(error)) return Promise.reject(error);
      const payload = error.response?.data?.error;
      const status = error.response?.status ?? null;
      const normalizedError = new ApiError({
        message: (typeof payload === 'string' ? payload : payload?.message) || (status ? `Request failed (${status})` : 'Unable to connect. Check your connection and try again.'),
        code: (typeof payload === 'object' ? payload?.code : null) || (status ? 'REQUEST_FAILED' : 'NETWORK_ERROR'),
        status,
        requestId: (typeof payload === 'object' ? payload?.requestId : null) || error.response?.headers?.['x-request-id'] || null,
        details: typeof payload === 'object' ? payload?.details || null : null,
      });

      const sessionKey = `${sessionType}AccessToken`;
      if (
        status === 401 &&
        error.config?.headers?.Authorization &&
        error.config.headers.Authorization === `Bearer ${sessionStorage.getItem(sessionKey)}`
      ) {
        unauthorizedHandlers.get(sessionType)?.(normalizedError);
      }
      return Promise.reject(normalizedError);
    },
  );

  return client;
}

export const staffApi = createClient('staff');
export const tenantApi = createClient('tenant');

export function onUnauthorized(sessionType, handler) {
  unauthorizedHandlers.set(sessionType, handler);
  return () => {
    if (unauthorizedHandlers.get(sessionType) === handler) unauthorizedHandlers.delete(sessionType);
  };
}
