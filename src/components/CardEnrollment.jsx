/**
 * Shared enrollment form used by the Students page. The clicked submit button chooses between
 * creating an encrypted card and verifying an existing one.
 */

import { useState } from 'react';
import { useData } from '../data/AppData';
import Button from './Button';
import Input from './Input';

/**
 * Render the student/card form and show feedback for enrollment or verification.
 */
export default function CardEnrollment() {
  const { students, manageCard } = useData();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const student =
    students.find(
      // Find the selected student; the surrounding expression falls back to the first student.
      (row) => row.id === selected,
    ) || students[0];

  /**
   * Read the typed UID and the clicked submit button, then request enrollment or verification
   * and display the result.
   */
  async function submit(event) {
    event.preventDefault();
    if (busy || !student) {
      return;
    }
    const form = event.currentTarget;
    const uid = new FormData(form).get('uid').trim();
    // Both buttons submit this form. The button value tells the handler whether to encrypt/enroll
    // the card or verify an existing enrollment.
    const action = event.nativeEvent.submitter?.value || 'enroll';
    setBusy(true);
    setMessage('');
    try {
      const result = await manageCard({ action, studentId: student.id, uid });
      form.reset();
      setMessage(
        result.enrolled
          ? 'Card encrypted with AES-256-GCM and enrolled in browser storage.'
          : `Card matches. Status: ${result.active ? 'Active' : 'Disabled'}.`,
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h3>Encrypted card enrollment</h3>
      <p>Enter a fictional hexadecimal UID. The prototype stores its ciphertext and keyed hash.</p>
      <form onSubmit={submit}>
        <label htmlFor="card-student">
          Student
          <select
            id="card-student"
            value={student?.id || ''}
            disabled={busy}
            onChange={
              // Remember the student chosen in the dropdown.
              (event) => setSelected(event.target.value)
            }
          >
            {students.map(
              // Render one selectable student with their name and student number.
              (row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.number}
                </option>
              ),
            )}
          </select>
        </label>
        <Input
          label="Card UID (hexadecimal)"
          id="enrollment-uid"
          name="uid"
          placeholder="04:11:22:33"
          required
          maxLength={80}
          autoComplete="off"
          disabled={busy}
        />
        <div className="actions">
          <Button
            type="submit"
            name="action"
            value="enroll"
            disabled={busy || !student || !!student.cardId}
          >
            Encrypt & enroll card
          </Button>
          <Button
            type="submit"
            name="action"
            value="verify"
            className="secondary"
            disabled={busy || !student?.cardId}
          >
            Verify card
          </Button>
        </div>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}
