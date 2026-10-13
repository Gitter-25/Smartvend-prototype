import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { demoCredentials } from '../lib/prototype-service.js';
import Button from '../components/Button';
import Input from '../components/Input';
import Icon from '../components/Icon';

export default function Login() {
  const { session, signIn } = useAuth();
  const [message, setMessage] = useState('');

  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      signIn({ email: data.get('email').trim(), password: data.get('password') });
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="login">
      <div className="login-shell">
        <section className="login-story">
          <div className="brand">
            <span className="brand-icon">
              <Icon name="machine" size={25} />
            </span>
            <h1>
              SmartVend<span>PRESENTATION PROTOTYPE</span>
            </h1>
          </div>
          <div>
            <p className="eyebrow">CAMPUS VENDING, REIMAGINED</p>
            <h2>
              A smarter way
              <br />
              to serve students.
            </h2>
            <p>A working interface for encrypted student cards and simulated vending payments.</p>
            <div className="login-features">
              <span>
                <Icon name="card" />
                AES-256-GCM card encryption
              </span>
              <span>
                <Icon name="qr" />
                QR payment simulation
              </span>
              <span>
                <Icon name="shield" />
                Encrypted card records
              </span>
            </div>
          </div>
          <small>Frontend only · One machine · Two product slots</small>
        </section>
        <section className="login-form">
          <p className="eyebrow">DEMO ADMIN WORKSPACE</p>
          <h2>Welcome to SmartVend</h2>
          <p>Enter the demo workspace to begin your presentation.</p>
          <form onSubmit={submit}>
            <Input
              label="Email address"
              id="email"
              name="email"
              type="email"
              defaultValue={demoCredentials.email}
              required
              autoComplete="off"
            />
            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              defaultValue={demoCredentials.password}
              required
              autoComplete="off"
            />
            <Button type="submit">
              Enter prototype
              <Icon name="arrow" size={18} />
            </Button>
          </form>
          {message && (
            <p className="form-message" role="alert">
              {message}
            </p>
          )}
          <div className="demo-credentials">
            <strong>Presentation credentials</strong>
            <code>{demoCredentials.email}</code>
            <code>{demoCredentials.password}</code>
          </div>
          <p className="login-note">Demo sign-in UI only. Use fictional data throughout.</p>
        </section>
      </div>
    </div>
  );
}
