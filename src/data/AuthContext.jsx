import { createContext, useContext, useState } from 'react';
import { demoCredentials } from '../lib/prototype-service.js';

const AuthContext = createContext(null);
const sessionKey = 'smartvend-prototype-demo-session';

// This is a demonstration of the login UI, not secure server authentication.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() =>
    sessionStorage.getItem(sessionKey) === 'active'
      ? { user: { id: 'prototype-admin', email: demoCredentials.email } }
      : null,
  );

  function signIn({ email, password }) {
    if (email.toLowerCase() !== demoCredentials.email || password !== demoCredentials.password) {
      throw new Error('Use the demo credentials shown below the form.');
    }
    sessionStorage.setItem(sessionKey, 'active');
    setSession({ user: { id: 'prototype-admin', email: demoCredentials.email } });
  }

  function signOut() {
    sessionStorage.removeItem(sessionKey);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
