import { useState } from 'react';
import { useData } from '../data/AppData';
import { demoCards } from '../lib/prototype-service.js';
import { pesos } from '../lib/format';
import PageHeading from '../components/PageHeading';
import Button from '../components/Button';
import Input from '../components/Input';
import CardEnrollment from '../components/CardEnrollment';
import WalletTopup from '../components/WalletTopup';
import StatusBadge from '../components/StatusBadge';

export default function Students() {
  const { students, addStudent, toggleCard } = useData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function register(event) {
    event.preventDefault();
    if (busy) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage('');
    try {
      await addStudent({ name: data.get('name'), number: data.get('number') });
      form.reset();
      setMessage('Student registered. Enroll a card below and add demo credit.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeCard(student) {
    setBusy(true);
    try {
      await toggleCard(student);
      setMessage('Card status updated.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Students & wallets"
        description="Register fictional students, encrypt their cards, and add demo credit."
      />
      <div className="demo-samples">
        <strong>Ready-to-use sample cards</strong>
        {demoCards.map((card) => (
          <span key={card.id}>
            {card.name}: <code>{card.uid}</code>
          </span>
        ))}
      </div>
      <div className="two-columns">
        <section className="card">
          <h3>Register student</h3>
          <p>New students start with a zero-balance demo wallet.</p>
          <form onSubmit={register}>
            <Input label="Student name" id="name" name="name" required maxLength={80} />
            <Input label="Student number" id="number" name="number" required maxLength={40} />
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Register student'}
            </Button>
          </form>
          <p role="status">{message}</p>
        </section>
        <WalletTopup />
      </div>
      <CardEnrollment />
      <section className="card">
        <div className="section-heading">
          <h3>Registered students</h3>
          <StatusBadge>{`${students.length} students`}</StatusBadge>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Student number</th>
                <th>Demo balance</th>
                <th>Card status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.number}</td>
                  <td>{pesos(student.balance)}</td>
                  <td>
                    <StatusBadge>
                      {!student.cardId ? 'Not enrolled' : student.active ? 'Active' : 'Disabled'}
                    </StatusBadge>
                  </td>
                  <td>
                    <Button
                      className="secondary"
                      disabled={busy || !student.cardId}
                      onClick={() => changeCard(student)}
                    >
                      {student.active ? 'Disable' : 'Enable'} card for {student.name}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
