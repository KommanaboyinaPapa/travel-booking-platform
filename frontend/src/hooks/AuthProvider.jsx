import React, { createContext, useContext, useState } from 'react';
import { loginUser, registerUser } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('travel_user')) || null;
    } catch {
      localStorage.removeItem('travel_user');
      return null;
    }
  });

  async function login(credentials) {
    const data = await loginUser(credentials);
    if (data.token) localStorage.setItem('travel_token', data.token);
    if (data.user) {
      localStorage.setItem('travel_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  }

  async function register(payload) {
    const data = await registerUser(payload);
    if (data.token) localStorage.setItem('travel_token', data.token);
    if (data.user) {
      localStorage.setItem('travel_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  }

  function logout() {
    localStorage.removeItem('travel_token');
    localStorage.removeItem('travel_user');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
