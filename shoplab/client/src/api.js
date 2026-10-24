const JWT_KEY = 'shoplab.jwt';

let csrfToken = null;

function getToken() {
  return localStorage.getItem(JWT_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(JWT_KEY, token);
  else localStorage.removeItem(JWT_KEY);
}

function clearToken() {
  localStorage.removeItem(JWT_KEY);
}

async function refreshCsrf() {
  try {
    const data = await request('/auth/csrf');
    csrfToken = data.csrfToken;
  } catch {
    csrfToken = null;
  }
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (method !== 'GET' && method !== 'HEAD' && path !== '/auth/login') {
    if (!csrfToken) {
      await refreshCsrf();
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers,
    ...options,
  });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  login: async (email, password) => {
    csrfToken = null;
    clearToken();
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    await refreshCsrf();
    return { id: data.id, name: data.name, email: data.email, role: data.role || 'customer' };
  },
  logout: async () => {
    csrfToken = null;
    clearToken();
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // Session may already be gone after a server restart.
    }
  },
  me: async () => {
    const user = await request('/auth/me');
    await refreshCsrf();
    return user;
  },
  products: ({ search = '', sort = '' } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    const query = params.toString();
    return request(`/products${query ? `?${query}` : ''}`);
  },
  productReviews: (productId) => request(`/products/${productId}/reviews`),
  postReview: (productId, body) =>
    request(`/products/${productId}/reviews`, { method: 'POST', body: JSON.stringify({ body }) }),
  orders: ({ product = '' } = {}) => {
    const params = new URLSearchParams();
    if (product) params.set('product', product);
    const query = params.toString();
    return request(`/orders${query ? `?${query}` : ''}`);
  },
  order: (orderId) => request(`/orders/${orderId}`),
  adminUsers: () => request('/admin/users'),
  updateProfile: (profile) =>
    request('/auth/me', { method: 'PATCH', body: JSON.stringify(profile) }),
  placeOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  reorder: (productId, quantity) =>
    request('/orders/reorder', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
};
