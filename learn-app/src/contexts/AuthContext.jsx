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
            localStorage.setItem('user', JSON.stringify(profile));
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
      localStorage.setItem('access_token', newToken);
      setToken(newToken);
    }
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    }
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  const value = { token, user, loading, loginUser, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
