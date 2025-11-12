const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

function getAccessToken() { try { return localStorage.getItem('access_token'); } catch { return null } }
function getRefreshToken() { try { return localStorage.getItem('refresh_token'); } catch { return null } }
function setTokens({ access, refresh }) {
  try {
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  } catch { /* ignore storage errors */ }
}

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

  const data = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  // store tokens if present
  if (data?.access_token || data?.refresh_token) {
    setTokens({ access: data.access_token, refresh: data.refresh_token });
  }
  return data;
}

export async function register({ username, email, password }) {
  const payload = { username, email, password };
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    const e = new Error('No refresh token');
    e.status = 401;
    throw e;
  }
  const data = await request('/auth/refresh', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${refresh}` },
  });
  if (data?.access_token || data?.refresh_token) {
    setTokens({ access: data.access_token, refresh: data.refresh_token });
  }
  return data?.access_token;
}

export async function verifyToken(token) {
  const access = token || getAccessToken();
  if (!access) throw new Error('No token provided');
  return request('/auth/profile', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` }
  });
}

export async function getProfile(token) {
  const access = token || getAccessToken();
  try {
    return await request('/auth/profile', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` }
    });
  } catch (e) {
    if (e?.status === 401) {
      await refreshAccessToken();
      const access2 = getAccessToken();
      return request('/auth/profile', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access2}` }
      });
    }
    throw e;
  }
}

export async function updateProfile(body, token) {
  const doPost = async (access) => request('/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access}`,
    },
    body: JSON.stringify(body || {}),
  });
  const access = token || getAccessToken();
  try {
    return await doPost(access);
  } catch (e) {
    if (e?.status === 401) {
      await refreshAccessToken();
      const access2 = getAccessToken();
      return doPost(access2);
    }
    throw e;
  }
}

export function logout() {
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  } catch { /* ignore storage errors */ }
}

export async function sendChat({ prompt, module, history, max_context_chars } = {}) {
  const body = { prompt, module, history, max_context_chars };
  const doPost = async (access) => request('/api/chatbot/respond', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access}`,
    },
    body: JSON.stringify(body),
  });
  const access = getAccessToken();
  if (!access) {
    const e = new Error('Not authenticated');
    e.status = 401;
    throw e;
  }
  try {
    return await doPost(access);
  } catch (e) {
    if (e?.status === 401) {
      await refreshAccessToken();
      const access2 = getAccessToken();
      return doPost(access2);
    }
    throw e;
  }
}

export async function getModuleQuiz(moduleNumber, opts = {}) {
  const mod = String(moduleNumber || '').trim();
  if (!mod) throw new Error('Module number required');
  const { signal } = opts;
  return request('/api/quiz/biolaureat', {
    method: 'GET',
    headers: { 'X-Module': mod },
    signal,
  });
}

export async function submitQuiz(payload) {
  const doPost = async (access) => request('/api/quiz/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access}`,
    },
    body: JSON.stringify(payload || {}),
  });
  const access = getAccessToken();
  if (!access) {
    // allow caller to handle unauthenticated state
    const e = new Error('Not authenticated');
    e.status = 401; throw e;
  }
  try {
    return await doPost(access);
  } catch (e) {
    if (e?.status === 401) {
      await refreshAccessToken();
      const access2 = getAccessToken();
      return doPost(access2);
    }
    throw e;
  }
}
