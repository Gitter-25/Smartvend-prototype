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
      {/* Introduce the local QR simulation and make its no-payment-API scope visible. */}
      <PageHeading
        title="QR payment demo"
        description="A payment interface with simulated outcomes. No payment API is called."
      />

      {/* Place checkout creation beside the currently selected order. */}
      <div className="two-columns">
        {/* Checkout creation card: select a slot and reserve a unit for a simulated order. */}
        <section className="card">
          <p className="eyebrow">CHECKOUT PROTOTYPE</p>
          <h3>Create a demo checkout</h3>

          {/* Submit a new checkout request; an unfinished order blocks another checkout. */}
          <form onSubmit={create}>
            {/* Choose a saved product slot and show its current price and stock. */}
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

            {/*
              Create the demo order and QR; disable creation while busy or while another order is
              unfinished.
            */}
            <Button type="submit" disabled={busy || !!activeOrder}>
              Generate demo QR
            </Button>
          </form>

          {/* Show a resume link when an unfinished order prevents starting a new checkout. */}
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

          {/* Announce checkout creation, transition results, or errors. */}
          <p role="status">{message}</p>

          {/* Explain that scanning this QR reads demo metadata and does not collect a payment. */}
          <div className="scope-note">
            This QR contains demo order information, not a payment link. Use the on-screen controls
            to demonstrate payment. No PayMongo account or credentials are required.
          </div>
        </section>

        {/* Selected checkout card: show order details and controls, or a helpful empty state. */}
        <section className="card prototype-checkout">
          {/*
            Switch between the selected order's checkout interface and the no-order placeholder.
          */}
          {order ? (
            <>
              {/* Show the checkout heading and the saved order state. */}
              <div className="section-heading">
                <h3>Demo checkout</h3>
                <StatusBadge>{order.state}</StatusBadge>
              </div>

              {/*
                Display the generated image when ready, otherwise show QR preparation feedback.
              */}
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

              {/* Format the selected order's amount as Philippine pesos. */}
              <strong className="checkout-total">{pesos(order.amount)}</strong>

              {/* Identify the product and slot reserved by this order. */}
              <p>
                {order.productName} · Slot {order.slot}
              </p>

              {/*
                Keep the full order reference available for matching checkout and history records.
              */}
              <p className="reference">{order.id}</p>
              <p>
                {/* Explain what the selected order's current state means to the presenter. */}
                {explanations[order.state]}
              </p>

              {/* Offer only simulation actions appropriate to the order's current state. */}
              <div className="actions simulation-actions">
                {/*
                  Before authorization, demonstrate payment success, payment failure, or
                  cancellation.
                */}
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

                {/* After authorization, allow the simulated device to begin dispensing. */}
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

                {/*
                  During dispensing, choose whether the simulated product was delivered or failed.
                */}
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

                {/* After a failed dispense, finish the local refund demonstration. */}
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
              {/* Prompt the presenter to create an order when there is no checkout to display. */}
              <Icon name="qr" size={40} />
              <h4>Your demo QR will appear here</h4>
              <p>Select a product and generate a demo checkout.</p>
            </div>
          )}
        </section>
      </div>

      {/* Order history: keep previous demo checkouts selectable for reviewing their states. */}
      <section className="card">
        <h3>Demo QR orders</h3>

        {/* Explain the empty history before the first demo checkout has been created. */}
        {!orders.length && <p>No demo checkouts yet.</p>}

        {/* Render a history button for each saved QR order. */}
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
                {/*
                  Show one history entry; aria-pressed marks the order whose checkout is currently
                  open.
                */}
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
