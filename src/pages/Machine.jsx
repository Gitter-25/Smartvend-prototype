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
      {/* Page title and a short description of the rehearsal controls. */}
      <PageHeading
        title="Machine & demo setup"
        description="Simulate device availability and reset the presentation workspace."
      />

      {/* Place device availability and demo-data reset side by side on wider screens. */}
      <div className="two-columns">
        {/*
          Device simulation card: show the planned controller and its local online/offline state.
        */}
        <section className="card">
          {/* Pair the ESP32-S3 concept heading with the current simulation status badge. */}
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

          {/*
            Show the last simulated contact time, or a fallback before any contact has been
            recorded.
          */}
          <p>
            Last simulated contact:{' '}
            {machine.lastSeen
              ? new Date(machine.lastSeen).toLocaleString()
              : 'No contact simulated yet'}
          </p>

          {/*
            Toggle local device availability; busy disables repeat clicks while the change is
            saved.
          */}
          <Button disabled={busy} onClick={connect}>
            {machine.connected ? 'Simulate device offline' : 'Connect simulated device'}
          </Button>
          <p className="helper-text">
            Offline blocks card purchases and the start of QR dispensing.
          </p>
        </section>

        {/* Reset card: explain which fictional records will be restored or cleared. */}
        <section className="card">
          <p className="eyebrow">REHEARSAL TOOLS</p>
          <h3>Reset presentation data</h3>
          <p>
            Restore Ana’s ₱100 wallet, Ben’s ₱50 wallet, encrypted sample cards, and both stocked
            product slots. Demo transactions and added students will be cleared.
          </p>

          {/* Submit the reset handler only after the required confirmation checkbox is checked. */}
          <form onSubmit={reset}>
            {/* Require an explicit checkbox selection before clearing presentation records. */}
            <label className="checkbox-label">
              <input type="checkbox" name="confirm" value="yes" required disabled={busy} />I want to
              reset this prototype’s demo records.
            </label>

            {/*
              Run the demo reset; disable this action while another machine-page action is
              running.
            */}
            <Button type="submit" disabled={busy}>
              Reset demo data
            </Button>
          </form>
        </section>
      </div>

      {/* Display success or error feedback from the device and reset handlers. */}
      <p className="form-message" role="status">
        {message}
      </p>

      {/* List orders that still need payment, dispensing, or refund completion. */}
      <section className="card">
        <h3>Active simulated orders</h3>

        {/* Show this empty-state message only when there are no unfinished orders. */}
        {!active.length && <p>No unfinished demo orders.</p>}

        {/* Build one summary for every unfinished order, using its stable ID as the React key. */}
        {active.map(
          // Render each unfinished order with a link back to the QR simulation.
          (order) => (
            <div className="slot-summary" key={order.id}>
              {/*
                Show this order's product, reference, and state with a link to resume it on the QR
                page.
              */}
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
