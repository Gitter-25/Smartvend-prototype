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

export default function QR() {
  const { products, orders, createOrder, advanceOrder } = useData();
  const [slot, setSlot] = useState(1);
  const [selected, setSelected] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const order = orders.find((row) => row.id === selected) || orders[0];
  const activeOrder = orders.find((row) => activeStates.includes(row.state));

  useEffect(() => {
    let active = true;
    setCode('');
    if (order) {
      const payload = JSON.stringify({
        type: 'SMARTVEND_DEMO_ONLY',
        reference: order.id,
        amountCentavos: order.amountCents,
        currency: 'PHP',
        realPayment: false,
      });
      QRCode.toDataURL(payload, { width: 220, margin: 2 })
        .then((image) => {
          if (active) {
            setCode(image);
          }
        })
        .catch(() => {
          if (active) {
            setMessage('The demo QR image could not be generated.');
          }
        });
    }
    return () => {
      active = false;
    };
  }, [order?.id]);

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
                onChange={(event) => setSlot(Number(event.target.value))}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    Slot {product.id}: {product.name} · {pesos(product.price)} · Stock{' '}
                    {product.stock}
                  </option>
                ))}
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
                onClick={() => setSelected(activeOrder.id)}
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
                    <Button disabled={busy} onClick={() => advance('pay')}>
                      Simulate successful payment
                    </Button>
                    <Button disabled={busy} className="secondary" onClick={() => advance('fail')}>
                      Simulate failed payment
                    </Button>
                    <Button disabled={busy} className="secondary" onClick={() => advance('cancel')}>
                      Cancel demo checkout
                    </Button>
                  </>
                )}
                {order.state === 'Authorized' && (
                  <Button disabled={busy} onClick={() => advance('start')}>
                    Start dispense simulation
                  </Button>
                )}
                {order.state === 'Dispensing' && (
                  <>
                    <Button disabled={busy} onClick={() => advance('finish')}>
                      Simulate item dispensed
                    </Button>
                    <Button disabled={busy} className="secondary" onClick={() => advance('noItem')}>
                      Simulate no item dispensed
                    </Button>
                  </>
                )}
                {order.state === 'RefundPending' && (
                  <Button disabled={busy} onClick={() => advance('refund')}>
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
          {orders.map((row) => (
            <button
              type="button"
              key={row.id}
              className="demo-order"
              disabled={busy}
              onClick={() => setSelected(row.id)}
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
          ))}
        </div>
      </section>
    </>
  );
}
