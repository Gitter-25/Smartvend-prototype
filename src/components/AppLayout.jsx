/**
 * Shared workspace shell. Sidebar links change the nested route rendered by Outlet while keeping
 * the layout visible.
 */

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { useData } from '../data/AppData';
import Button from './Button';
import Icon from './Icon';

const pages = [
  ['dashboard', 'Overview', 'dashboard'],
  ['students', 'Students & wallets', 'students'],
  ['product', 'Product slots', 'product'],
  ['purchase', 'Card purchase', 'card'],
  ['qr', 'QR payment demo', 'qr'],
  ['transactions', 'Transactions', 'transactions'],
  ['encryption', 'Card security', 'shield'],
  ['machine', 'Machine & demo setup', 'machine'],
];

/**
 * Render the sidebar, shared workspace notices, and the current route through Outlet.
 */
export default function AppLayout() {
  const { signOut } = useAuth();
  const { loading, error } = useData();
  return (
    <div className="layout">
      {/*
        Shared signed-in workspace layout; its nested page changes without rebuilding the sidebar.
      */}
      {/* Sidebar area: branding, page navigation, scope reminder, and sign-out action. */}
      <aside>
        {/* Display the SmartVend brand beside the local machine icon. */}
        <div className="brand">
          <span className="brand-icon">
            <Icon name="machine" size={25} />
          </span>
          <h1>
            SmartVend<span></span>
          </h1>
        </div>
        <p className="nav-label">WORKSPACE</p>

        {/* Build route links from the page list; NavLink marks the current destination. */}
        <nav aria-label="Main navigation">
          {pages.map(
            // Turn each navigation entry into a link with its label and icon.
            ([path, label, icon]) => (
              <NavLink key={path} to={`/${path}`}>
                <Icon name={icon} />
                {label}
              </NavLink>
            ),
          )}
        </nav>

        {/*
          Keep the prototype scope reminder and demo sign-out grouped at the bottom of the
          sidebar.
        */}
        <div className="sidebar-bottom">
          {/* Summarize real encryption and simulated payments beside the shield icon. */}
          <div className="sidebar-project">
            <Icon name="shield" />

            {/* Keep the frontend-prototype caption and its encryption/payment reminder together. */}
            <div>
              Frontend prototype<small>Real encryption · Demo payments</small>
            </div>
          </div>

          {/* Clear the demo session through the existing signOut handler. */}
          <Button className="sign-out" onClick={signOut}>
            <Icon name="logout" size={18} />
            Sign out of demo
          </Button>
        </div>
      </aside>

      {/* Main workspace area: shared notices followed by the selected route's page. */}
      <main>
        {/* Identify the current workspace and show that the app is in presentation mode. */}
        <header className="workspace-header">
          <span>
            SmartVend <span className="header-divider">/</span> Prototype
          </span>
          <span className="header-session">
            <Icon name="shield" size={16} />
            Presentation mode
          </span>
        </header>

        {/* Keep the real-encryption and simulated-payment scope visible across all pages. */}
        <div className="notice">
          <Icon name="machine" size={18} />
          <span>Real browser encryption · Simulated payments and dispensing</span>
        </div>

        {/* Show shared storage or loading errors only when an error message is present. */}
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}

        {/* Show reload progress while shared workspace records are being refreshed. */}
        {loading && (
          <p className="loading-line" role="status">
            Refreshing demo records…
          </p>
        )}

        {/* Insert the page matched by the current nested route here. */}
        <Outlet />

        {/* Close each workspace page with the shared SmartVend footer. */}
        <footer className="workspace-footer">SmartVend</footer>
      </main>
    </div>
  );
}
