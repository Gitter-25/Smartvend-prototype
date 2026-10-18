/**
 * Presentation login screen using published demo credentials. Actual encryption is implemented
 * separately for card UIDs.
 */

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { demoCredentials } from '../lib/prototype-service.js';
import Button from '../components/Button';
import Input from '../components/Input';
import Icon from '../components/Icon';

/**
 * Render the fixed-credential demo login, or redirect an existing session to Overview.
 */
export default function Login() {
  const { session, signIn } = useAuth();
  const [message, setMessage] = useState('');

  /**
   * Read the submitted credentials, request demo sign-in, and display a validation error if it
   * fails.
   */
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
      {/* Full-page sign-in layout, separate from the signed-in workspace shell. */}
      {/* Pair the project introduction with the presentation credential form. */}
      <div className="login-shell">
        {/*
          Brand panel: introduce SmartVend and summarize its encryption and simulation features.
        */}
        <section className="login-story">
          {/* Display the SmartVend name with its local machine icon. */}
          <div className="brand">
            <span className="brand-icon">
              <Icon name="machine" size={25} />
            </span>
            <h1>SmartVend</h1>
          </div>

          {/* Group the campus-vending introduction and its feature list. */}
          <div>
            <p className="eyebrow">CAMPUS VENDING, REIMAGINED</p>
            <h2>
              A smarter way
              <br />
              to serve students.
            </h2>
            <p>A working interface for encrypted student cards and simulated vending payments.</p>

            {/* Summarize card encryption, QR simulation, and encrypted records with icons. */}
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
          <small> One machine · Two product slots</small>
        </section>

        {/* Demo login form: check the public presentation credentials and show feedback. */}
        <section className="login-form">
          <p className="eyebrow">DEMO ADMIN WORKSPACE</p>
          <h2>Welcome to SmartVend</h2>
          <p>Enter the demo workspace to begin your presentation.</p>

          {/* Submit credentials through the demo sign-in handler without a browser page reload. */}
          <form onSubmit={submit}>
            {/* Prefill the public demo email so the presenter can enter the workspace quickly. */}
            <Input
              label="Email address"
              id="email"
              name="email"
              type="email"
              defaultValue={demoCredentials.email}
              required
              autoComplete="off"
            />

            {/*
              Mask the typed password visually; this field itself does not encrypt or securely
              authenticate it.
            */}
            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              defaultValue={demoCredentials.password}
              required
              autoComplete="off"
            />

            {/* Submit demo sign-in and continue to the workspace when the session changes. */}
            <Button type="submit">
              Enter prototype
              <Icon name="arrow" size={18} />
            </Button>
          </form>

          {/* Show a login error only when the credential check has returned a message. */}
          {message && (
            <p className="form-message" role="alert">
              {message}
            </p>
          )}

          {/*
            Publish the fixed demo credentials for rehearsal; they are not private production
            secrets.
          */}
          <div className="demo-credentials">
            <strong>Presentation credentials</strong>
            <code>{demoCredentials.email}</code>
            <code>{demoCredentials.password}</code>
          </div>

          {/* Remind the presenter to use fictional data with the demonstration login. */}
          <p className="login-note">Demo sign-in UI . Use fictional data throughout.</p>
        </section>
      </div>
    </div>
  );
}
