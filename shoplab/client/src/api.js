async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
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
  placeOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  reorder: (productId, quantity) =>
    request('/orders/reorder', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
};
