import axios from 'axios';

const defaultApiBaseUrl = window.location.port === '5173'
  ? '/api/v1'
  : `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;

export const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiBaseUrl;

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/api/v1')
    ? path.slice('/api/v1'.length)
    : path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`;
};

export const apiFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(apiUrl(path), init);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('recruitflow_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatic token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('recruitflow_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefresh } = res.data;
          localStorage.setItem('recruitflow_token', access_token);
          localStorage.setItem('recruitflow_refresh_token', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('recruitflow_token');
          localStorage.removeItem('recruitflow_refresh_token');
          localStorage.removeItem('recruitflow_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
