/**
 * QR presentation screen: draw demo order metadata and let the presenter choose simulated
 * outcomes. The service controls legal state transitions.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useData } from '../data/AppData';
import { pesos } from '../lib/format';
import PageHeading from '../components/PageHeading';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Icon from '../components/Icon';

const activeStates = ['AwaitingPayment', 'Authorized', 'Dispensing', 'RefundPending'];
const explanations = {
  AwaitingPayment: 'A unit is reserved. Choose a simulated payment outcome below.',
  Authorized: 'Demo payment accepted. Start the simulated dispensing step.',
  Dispensing: 'The device is simulated. Choose whether the demo item was dispensed.',
  Completed: 'Demo purchase completed. No money was collected or physical item dispensed.',
  Failed: 'Payment failure simulated. The reserved unit was returned to stock.',
  Cancelled: 'Checkout cancelled. The reserved unit was returned to stock.',
  RefundPending: 'Stock is restored. Complete the simulated refund to close this order.',
  Refunded: 'Demo refund completed. No student wallet was credited.',
};

/**
 * Render the QR checkout simulation and the action buttons allowed by its current state.
 */
export default function QR() {
  const { products, orders, createOrder, advanceOrder } = useData();
  const [slot, setSlot] = useState(1);
  const [selected, setSelected] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const order =
    orders.find(
      // Find the selected order; fall back to the newest order if none is selected.
      (row) => row.id === selected,
    ) || orders[0];
  const activeOrder = orders.find(
    // Find any unfinished order so a second checkout cannot be started.
    (row) => activeStates.includes(row.state),
  );

  useEffect(() => {
    // Build a QR image from demo metadata when the selected order changes; this payload is not a
    // payment URL.
    let active = true;
    setCode('');
    if (order) {
      // Encode local order details, not a provider checkout link. Scanning this image does not
      // authorize a payment; the buttons below drive the simulation.
      const payload = JSON.stringify({
        type: 'SMARTVEND_DEMO_ONLY',
        reference: order.id,
        amountCentavos: order.amountCents,
        currency: 'PHP',
        realPayment: false,
      });
      QRCode.toDataURL(payload, { width: 220, margin: 2 })
        .then((image) => {
          // Show the generated image only if this effect still belongs to the current selection.
          if (active) {
            setCode(image);
          }
        })
        .catch(() => {
          // Show an image-generation error only while this effect remains current.
          if (active) {
            setMessage('The demo QR image could not be generated.');
          }
        });
    }
    return () => {
      // Ignore late QR results after the selection changes or the component unmounts.
      active = false;
    };
  }, [order?.id]);

  /**
   * Create a simulated checkout with a fresh reference and select its returned order.
   */
  async function create(event) {
    event.preventDefault();
    if (busy) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await createOrder({ slot, requestId: crypto.randomUUID() });
      setSelected(result.id);
      setMessage('Demo checkout created. One unit is reserved.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Apply a payment or dispensing simulation action to the selected order and show its resulting
   * state.
   */
  async function advance(action) {
    if (busy || !order) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await advanceOrder({ id: order.id, action });
      setMessage(`Simulation recorded: ${result.state}.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="QR payment demo"
        description="A payment interface with simulated outcomes. No payment API is called."
      />
      <div className="two-columns">
        <section className="card">
          <p className="eyebrow">CHECKOUT PROTOTYPE</p>
          <h3>Create a demo checkout</h3>
          <form onSubmit={create}>
            <label htmlFor="qr-slot">
              Product slot
              <select
                id="qr-slot"
                value={slot}
                disabled={busy || !!activeOrder}
                onChange={
                  // Remember the selected numeric product slot.
                  (event) => setSlot(Number(event.target.value))
                }
              >
                {products.map(
                  // Render each product as a checkout choice with its price and stock.
                  (product) => (
                    <option key={product.id} value={product.id}>
                      Slot {product.id}: {product.name} · {pesos(product.price)} · Stock{' '}
                      {product.stock}
                    </option>
                  ),
                )}
              </select>
            </label>
            <Button type="submit" disabled={busy || !!activeOrder}>
              Generate demo QR
            </Button>
          </form>
          {activeOrder && (
            <p className="helper-text">
              Finish or cancel the active demo order first.{' '}
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={
                  // Select the unfinished order so its remaining actions can be completed.
                  () => setSelected(activeOrder.id)
                }
              >
                Open active order
              </button>
            </p>
          )}
          <p role="status">{message}</p>
          <div className="scope-note">
            This QR contains demo order information, not a payment link. Use the on-screen controls
            to demonstrate payment. No PayMongo account or credentials are required.
          </div>
        </section>
        <section className="card prototype-checkout">
          {order ? (
            <>
              <div className="section-heading">
                <h3>Demo checkout</h3>
                <StatusBadge>{order.state}</StatusBadge>
              </div>
              <div className="prototype-qr">
                {code ? (
                  <img
                    src={code}
                    width="220"
                    height="220"
                    alt="Demo order QR, not a real payment code"
                  />
                ) : (
                  <p>Preparing QR…</p>
                )}
              </div>
              <strong className="checkout-total">{pesos(order.amount)}</strong>
              <p>
                {order.productName} · Slot {order.slot}
              </p>
              <p className="reference">{order.id}</p>
              <p>{explanations[order.state]}</p>
              <div className="actions simulation-actions">
                {order.state === 'AwaitingPayment' && (
                  <>
                    <Button
                      disabled={busy}
                      onClick={
                        // Simulate acceptance of payment for the selected order.
                        () => advance('pay')
                      }
                    >
                      Simulate successful payment
                    </Button>
                    <Button
                      disabled={busy}
                      className="secondary"
                      onClick={
                        // Simulate payment failure and let the service restore the reservation.
                        () => advance('fail')
                      }
                    >
                      Simulate failed payment
                    </Button>
                    <Button
                      disabled={busy}
                      className="secondary"
                      onClick={
                        // Cancel the simulated checkout and release its stock reservation.
                        () => advance('cancel')
                      }
                    >
                      Cancel demo checkout
                    </Button>
                  </>
                )}
                {order.state === 'Authorized' && (
                  <Button
                    disabled={busy}
                    onClick={
                      // Start simulated dispensing after the order is authorized.
                      () => advance('start')
                    }
                  >
                    Start dispense simulation
                  </Button>
                )}
                {order.state === 'Dispensing' && (
                  <>
                    <Button
                      disabled={busy}
                      onClick={
                        // Record a successful simulated dispense.
                        () => advance('finish')
                      }
                    >
                      Simulate item dispensed
                    </Button>
                    <Button
                      disabled={busy}
                      className="secondary"
                      onClick={
                        // Record a failed dispense so stock is restored and the demo refund can
                        // begin.
                        () => advance('noItem')
                      }
                    >
                      Simulate no item dispensed
                    </Button>
                  </>
                )}
                {order.state === 'RefundPending' && (
                  <Button
                    disabled={busy}
                    onClick={
                      // Complete the simulated refund without crediting a student wallet.
                      () => advance('refund')
                    }
                  >
                    Complete demo refund
                  </Button>
                )}
              </div>
              <p className="helper-text">Student wallets stay unchanged for QR demo orders.</p>
            </>
          ) : (
            <div className="empty-state">
              <Icon name="qr" size={40} />
              <h4>Your demo QR will appear here</h4>
              <p>Select a product and generate a demo checkout.</p>
            </div>
          )}
        </section>
      </div>
      <section className="card">
        <h3>Demo QR orders</h3>
        {!orders.length && <p>No demo checkouts yet.</p>}
        <div className="demo-order-list">
          {orders.map(
            // Render one saved QR order as a selectable history entry.
            (row) => (
              <button
                type="button"
                key={row.id}
                className="demo-order"
                disabled={busy}
                onClick={
                  // Select this saved order to show its QR, state, and available actions.
                  () => setSelected(row.id)
                }
                aria-pressed={order?.id === row.id}
              >
                <span>
                  <strong>
                    {row.productName} · {pesos(row.amount)}
                  </strong>
                  <small className="reference">{row.id}</small>
                </span>
                <StatusBadge>{row.state}</StatusBadge>
              </button>
            ),
          )}
        </div>
      </section>
    </>
  );
}
