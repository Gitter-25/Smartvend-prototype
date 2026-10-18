/**
 * Application entry point: mount React, enable hash navigation, and make demo login and
 * workspace data available to every page.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './data/AuthContext';
import { DataProvider } from './data/AppData';
import './styles.css';

// HashRouter uses URLs such as #/students, so a simple static host can serve every page.
// AuthProvider shares the demo session; DataProvider shares saved records and actions. StrictMode
// helps expose development lifecycle issues; initialization is shared safely.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
