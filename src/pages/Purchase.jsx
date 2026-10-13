import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../data/AppData';
import { demoCards } from '../lib/prototype-service.js';
import { pesos } from '../lib/format';
import PageHeading from '../components/PageHeading';
import Button from '../components/Button';
import Input from '../components/Input';

export default function Purchase() {
  const { students, products, manageCard } = useData();
  const [selected, setSelected] = useState('');
  const [slot, setSlot] = useState(1);
  const [outcome, setOutcome] = useState('success');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState(null);
  const student = students.find((row) => row.id === selected) || students[0];

  async function submit(event) {
    event.preventDefault();
    if (busy || !student) {
      return;
    }
    const uid = new FormData(event.currentTarget).get('uid');
    setBusy(true);
    setMessage('');
    setReceipt(null);
    try {
      const result = await manageCard({
        action: 'purchase',
        studentId: student.id,
        uid,
        slot,
        outcome,
        requestId: crypto.randomUUID(),
      });
      setReceipt(result);
      setMessage(
        result.status === 'Completed'
          ? 'Demo purchase completed. Wallet credit and stock updated.'
          : 'Failed dispense simulated. Demo wallet and stock are restored.',
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Card purchase"
        description="Verify an encrypted card, then simulate the wallet and dispensing flow."
      />
      <div className="two-columns">
        <section className="card">
          <h3>Simulate a student purchase</h3>
          <form onSubmit={submit}>
            <label htmlFor="purchase-student">
              Student
              <select
                id="purchase-student"
                value={student?.id || ''}
                disabled={busy}
                onChange={(event) => setSelected(event.target.value)}
              >
                {students.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Demo wallet: <b>{pesos(student?.balance ?? 0)}</b>
            </p>
            <label htmlFor="purchase-slot">
              Product slot
              <select
                id="purchase-slot"
                value={slot}
                disabled={busy}
                onChange={(event) => setSlot(Number(event.target.value))}
              >
                {products.map((row) => (
                  <option key={row.id} value={row.id}>
                    Slot {row.id}: {row.name} · {pesos(row.price)} · Stock {row.stock}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Enrolled card UID"
              id="purchase-uid"
              name="uid"
              placeholder="04:A1:B2:C3"
              required
              maxLength={80}
              autoComplete="off"
              disabled={busy}
            />
            <label htmlFor="purchase-outcome">
              Dispense simulation
              <select
                id="purchase-outcome"
                value={outcome}
                disabled={busy}
                onChange={(event) => setOutcome(event.target.value)}
              >
                <option value="success">Successful dispense</option>
                <option value="failure">Failed dispense → refund demo wallet</option>
              </select>
            </label>
            <Button type="submit" disabled={busy || !student}>
              {busy ? 'Verifying card…' : 'Simulate card purchase'}
            </Button>
          </form>
          <p role="status">{message}</p>
          {receipt && (
            <div className="demo-receipt">
              <strong>{receipt.status}</strong>
              <p>
                {pesos(receipt.amountCents / 100)} · {receipt.product_name}
              </p>
              <code>{receipt.id}</code>
              <Link to="/transactions">View transaction history →</Link>
            </div>
          )}
        </section>
        <section className="card">
          <p className="eyebrow">PRESENTATION GUIDE</p>
          <h3>What happens during this demo?</h3>
          <ol className="demo-steps">
            <li>Normalize the typed card UID.</li>
            <li>Find its enrolled record using HMAC-SHA-256.</li>
            <li>Decrypt with AES-256-GCM and verify the student binding.</li>
            <li>Check card status, demo wallet credit, and available stock.</li>
            <li>Record the simulated purchase or refund.</li>
          </ol>
          <div className="demo-samples">
            <strong>Sample cards</strong>
            {demoCards.map((card) => (
              <span key={card.id}>
                {card.name}: <code>{card.uid}</code>
              </span>
            ))}
          </div>
          <p>No physical item is dispensed. The amounts represent fictional wallet credit.</p>
        </section>
      </div>
    </>
  );
}
