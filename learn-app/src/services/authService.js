const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!res.ok) {
    const msg = data.message || data.error || data.msg || res.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function login({ identifier, email, username, password }) {
  const payload = {};
  const id = (identifier || '').trim();
  if (id) {
    if (id.includes('@')) payload.email = id; else payload.username = id;
  } else if (email) payload.email = email;
  else if (username) payload.username = username;

  payload.password = password;

  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function register({ username, email, password }) {
  const payload = { username, email, password };
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function verifyToken(token) {
  if (!token) throw new Error('No token provided');
  return request('/auth/profile', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });
}

export async function getProfile(token) {
  return verifyToken(token);
}

export async function updateProfile(body, token) {
  if (!token) throw new Error('No token provided');
  return request('/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}
