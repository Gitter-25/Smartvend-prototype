/**
 * Route map for the prototype. Pages handle forms and display; shared business rules live in
 * lib/prototype-service.js.
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './data/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Product from './pages/Product';
import Purchase from './pages/Purchase';
import QR from './pages/QR';
import Transactions from './pages/Transactions';
import Machine from './pages/Machine';
import Encryption from './pages/Encryption';

/**
 * Check the demo session before showing workspace pages; send signed-out users to Login. This is
 * navigation control, not secure server authentication.
 */
function DemoRoute({ children }) {
  const { session } = useAuth();
  return session ? children : <Navigate to="/login" replace />;
}

/**
 * Define which page appears for each URL and place workspace pages inside the shared layout.
 */
export default function App() {
  return (
    <Routes>
      {/* The login route is available before a demo session exists. */}
      <Route path="/login" element={<Login />} />

      {/*
        Group workspace routes inside DemoRoute so the demo session is checked before AppLayout is
        shown.
      */}
      <Route
        element={
          <DemoRoute>
            <AppLayout />
          </DemoRoute>
        }
      >
        {/* Redirect the workspace root URL to the overview page. */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Overview page: stock totals, student counts, product summaries, and recent receipts. */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Students page: registration, demo wallet credit, enrollment, and card availability. */}
        <Route path="/students" element={<Students />} />

        {/* Product page: edit the two fixed vending slots. */}
        <Route path="/product" element={<Product />} />

        {/* Card purchase page: verify a typed UID and demonstrate a wallet purchase. */}
        <Route path="/purchase" element={<Purchase />} />

        {/* QR page: create and progress simulated checkouts and refunds. */}
        <Route path="/qr" element={<QR />} />

        {/* Transactions page: filter receipts, change pages, and open details. */}
        <Route path="/transactions" element={<Transactions />} />

        {/* Card security page: display enrolled-card ciphertext and keyed lookup records. */}
        <Route path="/encryption" element={<Encryption />} />

        {/* Machine page: simulate device availability and reset presentation data. */}
        <Route path="/machine" element={<Machine />} />
      </Route>

      {/* Send unknown URLs back to the overview route. */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
