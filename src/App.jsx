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
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <DemoRoute>
            <AppLayout />
          </DemoRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/product" element={<Product />} />
        <Route path="/purchase" element={<Purchase />} />
        <Route path="/qr" element={<QR />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/encryption" element={<Encryption />} />
        <Route path="/machine" element={<Machine />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
