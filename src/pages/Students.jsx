/**
 * Student management screen: compose registration, encrypted enrollment/verification, fictional
 * wallet credit, and card enable/disable controls.
 */

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

/**
 * Render student registration, wallet credit, card enrollment, and the student list.
 */
export default function Students() {
  const { students, addStudent, toggleCard } = useData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  /**
   * Read and submit a student registration, then clear the form only after the service accepts
   * it.
   */
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

  /**
   * Enable or disable the selected student's enrolled card and show feedback.
   */
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
      {/* Introduce registration, fictional wallet credit, and encrypted-card management. */}
      <PageHeading
        title="Students & wallets"
        description="Register fictional students, encrypt their cards, and add demo credit."
      />

      {/*
        Show public sample UIDs for rehearsal; newly enrolled identifiers are stored encrypted.
      */}
      <div className="demo-samples">
        <strong>Ready-to-use sample cards</strong>
        {demoCards.map(
          // Render public sample UIDs so the presenter can rehearse the card flow.
          (card) => (
            <span key={card.id}>
              {card.name}: <code>{card.uid}</code>
            </span>
          ),
        )}
      </div>

      {/* Keep registration and demo wallet credit together in the top form row. */}
      <div className="two-columns">
        {/* Registration card: create a fictional student before enrolling their card. */}
        <section className="card">
          <h3>Register student</h3>
          <p>New students start with a zero-balance demo wallet.</p>

          {/* Send the named student fields to register without reloading the browser page. */}
          <form onSubmit={register}>
            {/* Collect a required student name, limited to 80 characters. */}
            <Input label="Student name" id="name" name="name" required maxLength={80} />

            {/*
              Collect a required student number; the service normalizes it and rejects duplicates.
            */}
            <Input label="Student number" id="number" name="number" required maxLength={40} />

            {/* Submit registration and show saving feedback while the request is busy. */}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Register student'}
            </Button>
          </form>

          {/* Announce registration or card-status feedback to assistive technologies. */}
          <p role="status">{message}</p>
        </section>

        {/* Reuse the shared form for adding fictional credit to a selected student wallet. */}
        <WalletTopup />
      </div>

      {/* Reuse the shared form for encrypting a new UID or verifying an enrolled card. */}
      <CardEnrollment />

      {/* Student list: compare wallet balances, enrollment status, and card availability. */}
      <section className="card">
        {/* Show the student-list title and the number of registered records. */}
        <div className="section-heading">
          <h3>Registered students</h3>
          <StatusBadge>{`${students.length} students`}</StatusBadge>
        </div>

        {/* Keep the student table usable when its columns exceed the available screen width. */}
        <div className="table-wrap">
          <table>
            {/* Label the student identity, wallet, card status, and action columns. */}
            <thead>
              <tr>
                <th>Name</th>
                <th>Student number</th>
                <th>Demo balance</th>
                <th>Card status</th>
                <th>Action</th>
              </tr>
            </thead>

            {/* Build table rows from the current shared student records. */}
            <tbody>
              {students.map(
                // Render one student's wallet balance, enrollment status, and card action.
                (student) => (
                  <tr key={student.id}>
                    {/*
                      One student row shows their details; card controls are disabled until a card
                      is enrolled.
                    */}
                    <td>{student.name}</td>
                    <td>{student.number}</td>
                    <td>{pesos(student.balance)}</td>

                    {/*
                      Distinguish not enrolled, active, and disabled cards without changing the
                      saved status.
                    */}
                    <td>
                      <StatusBadge>
                        {!student.cardId ? 'Not enrolled' : student.active ? 'Active' : 'Disabled'}
                      </StatusBadge>
                    </td>

                    {/*
                      Allow an enrolled card to be enabled or disabled through this row's handler.
                    */}
                    <td>
                      <Button
                        className="secondary"
                        disabled={busy || !student.cardId}
                        onClick={
                          // Request the enable/disable action for the student in this row.
                          () => changeCard(student)
                        }
                      >
                        {student.active ? 'Disable' : 'Enable'} card for {student.name}
                      </Button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
