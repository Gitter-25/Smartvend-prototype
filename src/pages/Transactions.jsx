import { useState } from 'react';
import { useData } from '../data/AppData';
import PageHeading from '../components/PageHeading';
import TransactionTable from '../components/TransactionTable';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import { pesos } from '../lib/format';

function localDate(value) {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function Transactions() {
  const { transactions, students } = useData();
  const [filters, setFilters] = useState({ type: 'All', student: '', slot: '', date: '' });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState('');
  const filtered = transactions.filter(
    (row) =>
      (filters.type === 'All' || row.type === filters.type) &&
      (!filters.student || row.studentId === filters.student) &&
      (!filters.slot || row.slot_id === Number(filters.slot)) &&
      (!filters.date || localDate(row.date) === filters.date),
  );
  const lastPage = Math.max(0, Math.ceil(filtered.length / 10) - 1);
  const currentPage = Math.min(page, lastPage);
  const rows = filtered.slice(currentPage * 10, (currentPage + 1) * 10);
  const receipt = transactions.find((row) => row.id === selected);

  function change(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
    setPage(0);
    setSelected('');
  }

  return (
    <>
      <PageHeading
        title="Transactions"
        description="Receipts for simulated wallet and QR activity."
      />
      <section className="card">
        <div className="filter-grid">
          <label htmlFor="filter-type">
            Type
            <select
              id="filter-type"
              value={filters.type}
              onChange={(event) => change('type', event.target.value)}
            >
              <option>All</option>
              <option>Top-up</option>
              <option>Purchase</option>
            </select>
          </label>
          <label htmlFor="filter-student">
            Student
            <select
              id="filter-student"
              value={filters.student}
              onChange={(event) => change('student', event.target.value)}
            >
              <option value="">All students and QR customers</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="filter-slot">
            Slot
            <select
              id="filter-slot"
              value={filters.slot}
              onChange={(event) => change('slot', event.target.value)}
            >
              <option value="">All slots and top-ups</option>
              <option value="1">Slot 1</option>
              <option value="2">Slot 2</option>
            </select>
          </label>
          <InputDate value={filters.date} onChange={(value) => change('date', value)} />
        </div>
        <div className="section-heading">
          <p>{filtered.length} demo records</p>
          <Button
            className="secondary"
            onClick={() => {
              setFilters({ type: 'All', student: '', slot: '', date: '' });
              setPage(0);
              setSelected('');
            }}
          >
            Clear filters
          </Button>
        </div>
        <TransactionTable rows={rows} onSelect={(row) => setSelected(row.id)} />
        <div className="pagination">
          <Button
            className="secondary"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span>
            Page {currentPage + 1} of {lastPage + 1}
          </span>
          <Button
            className="secondary"
            disabled={currentPage >= lastPage}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </section>
      {receipt && (
        <section className="card receipt">
          <div className="section-heading">
            <h3>Demo transaction details</h3>
            <Button className="secondary" onClick={() => setSelected('')}>
              Close details
            </Button>
          </div>
          <p className="reference">{receipt.id}</p>
          <p>
            {receipt.student} · {receipt.type} · {pesos(receipt.amount)}
          </p>
          <StatusBadge>{receipt.status}</StatusBadge>
          <p>{receipt.note}</p>
          <p>No real payment was processed.</p>
        </section>
      )}
    </>
  );
}

function InputDate({ value, onChange }) {
  return (
    <label htmlFor="filter-date">
      Date
      <input
        id="filter-date"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
