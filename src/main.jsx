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
    {/* Use hash-based navigation so page links work with a simple static host. */}
    <HashRouter>
      {/* Share the demo session with the whole application. */}
      <AuthProvider>
        {/* Initialize browser keys and records, then share workspace data and actions. */}
        <DataProvider>
          {/* Render the route map once its surrounding providers are available. */}
          <App />
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
