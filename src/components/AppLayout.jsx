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
      <aside>
        <div className="brand">
          <span className="brand-icon">
            <Icon name="machine" size={25} />
          </span>
          <h1>
            SmartVend<span></span>
          </h1>
        </div>
        <p className="nav-label">WORKSPACE</p>
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
        <div className="sidebar-bottom">
          <div className="sidebar-project">
            <Icon name="shield" />
            <div>
              Frontend prototype<small>Real encryption · Demo payments</small>
            </div>
          </div>
          <Button className="sign-out" onClick={signOut}>
            <Icon name="logout" size={18} />
            Sign out of demo
          </Button>
        </div>
      </aside>
      <main>
        <header className="workspace-header">
          <span>
            SmartVend <span className="header-divider">/</span> Prototype
          </span>
          <span className="header-session">
            <Icon name="shield" size={16} />
            Presentation mode
          </span>
        </header>
        <div className="notice">
          <Icon name="machine" size={18} />
          <span>Real browser encryption · Simulated payments and dispensing</span>
        </div>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        {loading && (
          <p className="loading-line" role="status">
            Refreshing demo records…
          </p>
        )}
        <Outlet />
        <footer className="workspace-footer">SmartVend</footer>
      </main>
    </div>
  );
}
