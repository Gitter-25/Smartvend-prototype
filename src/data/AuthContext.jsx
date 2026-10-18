/**
 * Demo login state only. sessionStorage keeps a flag for this tab; it does not provide server-
 * side access control or encrypt passwords.
 */

import { createContext, useContext, useState } from 'react';
import { demoCredentials } from '../lib/prototype-service.js';

const AuthContext = createContext(null);
const sessionKey = 'smartvend-prototype-demo-session';

/**
 * Provide the demonstration session and sign-in/sign-out actions to the interface. The fixed
 * credentials are not production authentication.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(
    // Restore this tab's demo session flag when the provider first renders.
    () =>
      sessionStorage.getItem(sessionKey) === 'active'
        ? { user: { id: 'prototype-admin', email: demoCredentials.email } }
        : null,
  );

  /**
   * Check the fixed presentation credentials, then save the tab session and update the UI.
   */
  function signIn({ email, password }) {
    if (email.toLowerCase() !== demoCredentials.email || password !== demoCredentials.password) {
      throw new Error('Use the demo credentials shown below the form.');
    }
    sessionStorage.setItem(sessionKey, 'active');
    setSession({ user: { id: 'prototype-admin', email: demoCredentials.email } });
  }

  /**
   * Remove this tab's session flag and return the interface to the signed-out state.
   */
  function signOut() {
    sessionStorage.removeItem(sessionKey);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>
      {/*
        Render the wrapped application with access to the current demo session and sign-in/sign-
        out actions.
      */}
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Read the current demo session and its sign-in/sign-out actions from context.
 */
export function useAuth() {
  return useContext(AuthContext);
}
