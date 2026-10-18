/**
 * Rehearsal controls: simulated online/offline status, unfinished QR orders, and a reset that
 * restores fictional samples while retaining keys.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../data/AppData';
import PageHeading from '../components/PageHeading';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Icon from '../components/Icon';

/**
 * Render simulated device controls, demo-data reset, and links to unfinished QR orders.
 */
export default function Machine() {
  const { machine, orders, setMachine, resetDemo } = useData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const active = orders.filter(
    // Keep orders that still require payment, dispensing, or refund completion.
    (order) =>
      ['AwaitingPayment', 'Authorized', 'Dispensing', 'RefundPending'].includes(order.state),
  );

  /**
   * Toggle the simulated device availability and report the saved result.
   */
  async function connect() {
    setBusy(true);
    setMessage('');
    try {
      await setMachine(!machine.connected);
      setMessage('Simulated device status updated.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Require the reset checkbox, then restore sample records and clear the confirmation form
   * after success.
   */
  async function reset(event) {
    event.preventDefault();
    if (busy) {
      return;
    }
    const form = event.currentTarget;
    if (new FormData(form).get('confirm') !== 'yes') {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await resetDemo();
      form.reset();
      setMessage('Demo reset. Sample students, wallets, cards, and stock are ready again.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Machine & demo setup"
        description="Simulate device availability and reset the presentation workspace."
      />
      <div className="two-columns">
        <section className="card">
          <div className="section-heading">
            <h3>
              <Icon name="machine" /> ESP32-S3 concept
            </h3>
            <StatusBadge>{machine.connected ? 'Demo ready' : 'Demo offline'}</StatusBadge>
          </div>
          <p>
            The planned device has two product slots, a card reader, motors, and a drop sensor.
            Hardware is not connected to this prototype.
          </p>
          <p>
            Last simulated contact:{' '}
            {machine.lastSeen
              ? new Date(machine.lastSeen).toLocaleString()
              : 'No contact simulated yet'}
          </p>
          <Button disabled={busy} onClick={connect}>
            {machine.connected ? 'Simulate device offline' : 'Connect simulated device'}
          </Button>
          <p className="helper-text">
            Offline blocks card purchases and the start of QR dispensing.
          </p>
        </section>
        <section className="card">
          <p className="eyebrow">REHEARSAL TOOLS</p>
          <h3>Reset presentation data</h3>
          <p>
            Restore Ana’s ₱100 wallet, Ben’s ₱50 wallet, encrypted sample cards, and both stocked
            product slots. Demo transactions and added students will be cleared.
          </p>
          <form onSubmit={reset}>
            <label className="checkbox-label">
              <input type="checkbox" name="confirm" value="yes" required disabled={busy} />I want to
              reset this prototype’s demo records.
            </label>
            <Button type="submit" disabled={busy}>
              Reset demo data
            </Button>
          </form>
        </section>
      </div>
      <p className="form-message" role="status">
        {message}
      </p>
      <section className="card">
        <h3>Active simulated orders</h3>
        {!active.length && <p>No unfinished demo orders.</p>}
        {active.map(
          // Render each unfinished order with a link back to the QR simulation.
          (order) => (
            <div className="slot-summary" key={order.id}>
              <div>
                <h4>{order.productName}</h4>
                <p className="reference">{order.id}</p>
              </div>
              <StatusBadge>{order.state}</StatusBadge>
              <Link to="/qr">Continue demo →</Link>
            </div>
          ),
        )}
      </section>
    </>
  );
}
