/** Token storage and role-based access for admin modules. */

export function getToken() {
  return localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
}

export function setToken(token, remember = true) {
  if (remember) {
    localStorage.setItem('shoestore_token', token);
    sessionStorage.removeItem('token');
  } else {
    sessionStorage.setItem('token', token);
    localStorage.removeItem('shoestore_token');
  }
}

export function clearAuthTokens() {
  localStorage.removeItem('shoestore_token');
  sessionStorage.removeItem('token');
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export function roleHasAccess(role, module) {
  if (!role || role === 'guest' || role === 'customer') return false;
  if (role === 'admin') return true;
  if (role === 'it') return module === 'it';
  if (role === 'kho') return ['inventory', 'orders', 'product_management'].includes(module);
  if (role === 'sale') {
    return ['sales', 'orders', 'promotion_management', 'feedback_management'].includes(module);
  }
  if (role === 'ketoan') return ['accounting', 'dashboard', 'salary'].includes(module);
  return false;
}

export function adminLandingPath(role) {
  switch (role) {
    case 'admin': return '/admin/dashboard';
    case 'kho': return '/admin/inventory';
    case 'sale': return '/admin/sales';
    case 'ketoan': return '/admin/accounting';
    case 'it': return '/admin/it';
    default: return '/';
  }
}
