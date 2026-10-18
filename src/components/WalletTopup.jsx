/**
 * Shared form for fictional wallet credit. A request reference lets the service recognize
 * retries and avoid double credit.
 */

import { useState } from 'react';
import { useData } from '../data/AppData';
import { pesos } from '../lib/format';
import Button from './Button';
import Input from './Input';

/**
 * Render the form that adds fictional credit to a student wallet.
 */
export default function WalletTopup() {
  const { students, topupWallet } = useData();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const student =
    students.find(
      // Find the selected wallet owner; use the first student when no selection exists.
      (row) => row.id === selected,
    ) || students[0];

  /**
   * Send a demo credit request with a fresh reference, then clear the form after success. No
   * payment provider is contacted.
   */
  async function submit(event) {
    event.preventDefault();
    if (busy || !student) {
      return;
    }
    const form = event.currentTarget;
    const amount = new FormData(form).get('amount');
    setBusy(true);
    setMessage('');
    try {
      await topupWallet({ student: student.id, amount, request_id: crypto.randomUUID() });
      form.reset();
      setMessage(`${pesos(Number(amount))} of demo credit added to ${student.name}.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      {/* Reusable demo-credit card; these amounts are fictional and no money is collected. */}
      <h3>Demo wallet credit</h3>
      <p>Add fictional credit to show how a student wallet works. No money is collected.</p>

      {/* Submit a credit amount for the selected student through the existing wallet handler. */}
      <form onSubmit={submit}>
        {/* Select which student wallet receives the fictional credit. */}
        <label htmlFor="wallet-student">
          Student
          <select
            id="wallet-student"
            value={student?.id || ''}
            disabled={busy}
            onChange={
              // Remember whose wallet should receive the demo credit.
              (event) => setSelected(event.target.value)
            }
          >
            {students.map(
              // Render one student choice for the wallet form.
              (row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.number}
                </option>
              ),
            )}
          </select>
        </label>

        {/* Display that student's current wallet balance before adding credit. */}
        <p>
          Demo wallet balance: <b>{pesos(student?.balance ?? 0)}</b>
        </p>

        {/*
          Collect a peso amount with centavo precision and a presentation-friendly upper limit.
        */}
        <Input
          label="Credit amount (₱)"
          id="topup-amount"
          name="amount"
          type="number"
          min="1"
          max="10000"
          step="0.01"
          placeholder="100.00"
          required
          disabled={busy}
        />

        {/* Add credit once the handler validates it; prevent another click while busy. */}
        <Button type="submit" disabled={busy || !student}>
          {busy ? 'Saving…' : 'Add demo credit'}
        </Button>
      </form>

      {/* Announce the amount credited or an error returned by the service. */}
      <p role="status">{message}</p>
    </section>
  );
}
