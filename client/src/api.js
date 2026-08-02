const BASE = '';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Not authenticated');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res;
}

export const api = {
  // Auth
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  register: (username, display_name, password) => request('/api/auth/register', { method: 'POST', body: { username, display_name, password } }),
  changePassword: (current_password, new_password) => request('/api/auth/password', { method: 'PUT', body: { current_password, new_password } }),

  // Categories
  getCategories: () => request('/api/categories'),
  createCategory: (data) => request('/api/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/api/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (category_orders) => request('/api/categories/reorder', { method: 'PUT', body: { category_orders } }),

  // Fields
  getFields: (categoryId) => request(`/api/categories/${categoryId}/fields`),
  createField: (data) => request('/api/fields', { method: 'POST', body: data }),
  updateField: (id, data) => request(`/api/fields/${id}`, { method: 'PUT', body: data }),
  deleteField: (id) => request(`/api/fields/${id}`, { method: 'DELETE' }),
  reorderFields: (field_orders) => request('/api/fields/reorder', { method: 'PUT', body: { field_orders } }),

  // Items
  getItems: (categoryId) => request(`/api/items?category_id=${categoryId}`),
  getAllItems: () => request('/api/items'),
  createItem: (data) => request('/api/items', { method: 'POST', body: data }),
  updateItem: (id, data) => request(`/api/items/${id}`, { method: 'PUT', body: data }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),

  // Snapshots
  getSnapshots: (itemId) => request(`/api/items/${itemId}/snapshots`),
  createSnapshot: (data) => request('/api/snapshots', { method: 'POST', body: data }),
  deleteSnapshot: (id) => request(`/api/snapshots/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request('/api/dashboard'),

  // Export
  exportExcel: async () => {
    const res = await fetch('/api/export', { credentials: 'include' });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'WealthPulse_Export.xlsx';
    document.body.appendChild(a);
    a.click();
    // Delay cleanup to prevent Chrome from losing the filename and defaulting to a UUID
    setTimeout(() => {
      a.remove();
      window.URL.revokeObjectURL(url);
    }, 1000);
  },
};

export function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '₹0';
  if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatCurrencyFull(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatPercent(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '0%';
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}

export function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
