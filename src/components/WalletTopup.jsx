import { useState } from 'react';
import { useData } from '../data/AppData';
import { pesos } from '../lib/format';
import Button from './Button';
import Input from './Input';

export default function WalletTopup() {
  const { students, topupWallet } = useData();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const student = students.find((row) => row.id === selected) || students[0];

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
      <h3>Demo wallet credit</h3>
      <p>Add fictional credit to show how a student wallet works. No money is collected.</p>
      <form onSubmit={submit}>
        <label htmlFor="wallet-student">
          Student
          <select
            id="wallet-student"
            value={student?.id || ''}
            disabled={busy}
            onChange={(event) => setSelected(event.target.value)}
          >
            {students.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.number}
              </option>
            ))}
          </select>
        </label>
        <p>
          Demo wallet balance: <b>{pesos(student?.balance ?? 0)}</b>
        </p>
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
        <Button type="submit" disabled={busy || !student}>
          {busy ? 'Saving…' : 'Add demo credit'}
        </Button>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}
