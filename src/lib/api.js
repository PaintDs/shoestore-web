import { authHeaders, getToken } from './auth.js';

/**
 * JSON API fetch with Bearer token when available.
 * @throws {Error} when response is not ok
 */
export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...options.headers,
  };
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d) => d.msg || d).join(', ')
        : 'Có lỗi xảy ra';
    throw new Error(message);
  }
  return data;
}

export async function fetchCurrentUser() {
  if (!getToken()) return null;
  try {
    return await apiFetch('/api/users/me');
  } catch {
    return null;
  }
}
