/**
 * Card purchase screen: collect the student, UID, slot, and simulated dispense outcome. The
 * service verifies the encrypted card and updates demo records.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../data/AppData';
import { demoCards } from '../lib/prototype-service.js';
import { pesos } from '../lib/format';
import PageHeading from '../components/PageHeading';
import Button from '../components/Button';
import Input from '../components/Input';

/**
 * Render encrypted-card purchase inputs and show the simulated receipt returned by the service.
 */
export default function Purchase() {
  const { students, products, manageCard } = useData();
  const [selected, setSelected] = useState('');
  const [slot, setSlot] = useState(1);
  const [outcome, setOutcome] = useState('success');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState(null);
  const student =
    students.find(
      // Find the selected buyer; the surrounding fallback selects the first student initially.
      (row) => row.id === selected,
    ) || students[0];

  /**
   * Read the typed UID and selected outcome, send one card-purchase request, and display the
   * receipt or validation error.
   */
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
      {/* Explain that this page verifies encrypted cards and simulates wallet purchases. */}
      <PageHeading
        title="Card purchase"
        description="Verify an encrypted card, then simulate the wallet and dispensing flow."
      />

      {/* Pair the working purchase form with the presentation explanation. */}
      <div className="two-columns">
        {/* Purchase card: collect the student, product, UID, and chosen dispense outcome. */}
        <section className="card">
          <h3>Simulate a student purchase</h3>

          {/* Submit all purchase inputs to the existing card verification and purchase handler. */}
          <form onSubmit={submit}>
            {/* Select the enrolled student whose fictional wallet will be checked. */}
            <label htmlFor="purchase-student">
              Student
              <select
                id="purchase-student"
                value={student?.id || ''}
                disabled={busy}
                onChange={
                  // Remember the selected student for the next purchase.
                  (event) => setSelected(event.target.value)
                }
              >
                {students.map(
                  // Render one student choice for the purchase form.
                  (row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            {/* Display the selected student's current demo balance without changing it. */}
            <p>
              Demo wallet: <b>{pesos(student?.balance ?? 0)}</b>
            </p>

            {/* Select a product using its saved slot ID; display its current price and stock. */}
            <label htmlFor="purchase-slot">
              Product slot
              <select
                id="purchase-slot"
                value={slot}
                disabled={busy}
                onChange={
                  // Convert the selected slot value from form text to a number.
                  (event) => setSlot(Number(event.target.value))
                }
              >
                {products.map(
                  // Render one product choice with its current price and stock.
                  (row) => (
                    <option key={row.id} value={row.id}>
                      Slot {row.id}: {row.name} · {pesos(row.price)} · Stock {row.stock}
                    </option>
                  ),
                )}
              </select>
            </label>

            {/*
              Collect the UID to verify; disabling autocomplete avoids suggesting previously
              entered identifiers.
            */}
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

            {/* Choose the successful or failed dispensing scenario for the presentation. */}
            <label htmlFor="purchase-outcome">
              Dispense simulation
              <select
                id="purchase-outcome"
                value={outcome}
                disabled={busy}
                onChange={
                  // Remember whether the presentation should simulate a successful or failed
                  // dispense.
                  (event) => setOutcome(event.target.value)
                }
              >
                <option value="success">Successful dispense</option>
                <option value="failure">Failed dispense → refund demo wallet</option>
              </select>
            </label>

            {/*
              Start verification and show progress; the service enforces wallet, card, and stock
              rules.
            */}
            <Button type="submit" disabled={busy || !student}>
              {busy ? 'Verifying card…' : 'Simulate card purchase'}
            </Button>
          </form>

          {/* Announce the purchase result or validation error. */}
          <p role="status">{message}</p>

          {/* Show the returned receipt only after a simulated purchase produces one. */}
          {receipt && (
            <div className="demo-receipt">
              {/*
                Summarize the result, charged/displayed amount, product, and reference with a
                history link.
              */}
              <strong>{receipt.status}</strong>
              <p>
                {pesos(receipt.amountCents / 100)} · {receipt.product_name}
              </p>
              <code>{receipt.id}</code>
              <Link to="/transactions">View transaction history →</Link>
            </div>
          )}
        </section>

        {/*
          Presentation guide: explain how the card is verified before fictional wallet changes.
        */}
        <section className="card">
          <p className="eyebrow">PRESENTATION GUIDE</p>
          <h3>What happens during this demo?</h3>

          {/*
            List the normalization, keyed lookup, AES verification, and purchase checks in order.
          */}
          <ol className="demo-steps">
            <li>Normalize the typed card UID.</li>
            <li>Find its enrolled record using HMAC-SHA-256.</li>
            <li>Decrypt with AES-256-GCM and verify the student binding.</li>
            <li>Check card status, demo wallet credit, and available stock.</li>
            <li>Record the simulated purchase or refund.</li>
          </ol>

          {/* Provide public sample identifiers for demonstrating the purchase form. */}
          <div className="demo-samples">
            <strong>Sample cards</strong>
            {demoCards.map(
              // Render the public sample card details used during rehearsal.
              (card) => (
                <span key={card.id}>
                  {card.name}: <code>{card.uid}</code>
                </span>
              ),
            )}
          </div>
          <p>No physical item is dispensed. The amounts represent fictional wallet credit.</p>
        </section>
      </div>
    </>
  );
}
