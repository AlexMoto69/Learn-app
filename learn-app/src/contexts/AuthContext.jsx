import React, { useEffect, useState } from 'react';
import * as authService from '../services/authService';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (token && !user) {
        try {
          setLoading(true);
          const profile = await authService.verifyToken(token);
          if (mounted) {
            setUser(profile);
            try { localStorage.setItem('user', JSON.stringify(profile)); } catch { /* ignore */ }
          }
        } catch (err) {
          console.warn('Token verify failed:', err.message || err);
          logout();
        } finally {
          if (mounted) setLoading(false);
        }
      }
    }
    init();
    return () => { mounted = false; };
  }, [token, user]);

  function loginUser({ token: newToken, user: newUser } = {}) {
    if (newToken) {
      try { localStorage.setItem('access_token', newToken); } catch { /* ignore */ }
      setToken(newToken);
    }
    if (newUser) {
      try { localStorage.setItem('user', JSON.stringify(newUser)); } catch { /* ignore */ }
      setUser(newUser);
    }
  }

  function logout() {
    try { localStorage.removeItem('access_token'); } catch { /* ignore */ }
    try { localStorage.removeItem('refresh_token'); } catch { /* ignore */ }
    try { localStorage.removeItem('user'); } catch { /* ignore */ }
    try { localStorage.removeItem('quiz_cache_v1'); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  }

  const value = { token, user, loading, loginUser, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
