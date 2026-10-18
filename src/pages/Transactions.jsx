/**
 * Receipt browser: filter records locally, show ten results per page, and open the full selected
 * receipt.
 */

import { useState } from 'react';
import { useData } from '../data/AppData';
import PageHeading from '../components/PageHeading';
import TransactionTable from '../components/TransactionTable';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import { pesos } from '../lib/format';

/**
 * Convert a receipt timestamp into a local YYYY-MM-DD date for date-filter comparisons.
 */
function localDate(value) {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Render filtered and paginated demo receipts and the details of a selected transaction.
 */
export default function Transactions() {
  const { transactions, students } = useData();
  const [filters, setFilters] = useState({ type: 'All', student: '', slot: '', date: '' });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState('');
  const filtered = transactions.filter(
    /**
     * Keep only receipts matching all currently selected filters.
     */
    (row) =>
      (filters.type === 'All' || row.type === filters.type) &&
      (!filters.student || row.studentId === filters.student) &&
      (!filters.slot || row.slot_id === Number(filters.slot)) &&
      (!filters.date || localDate(row.date) === filters.date),
  );
  // Apply filters before pagination. Clamp the current page when fewer results remain, then select
  // up to ten receipts for the table.
  const lastPage = Math.max(0, Math.ceil(filtered.length / 10) - 1);
  const currentPage = Math.min(page, lastPage);
  const rows = filtered.slice(currentPage * 10, (currentPage + 1) * 10);
  const receipt = transactions.find(
    // Find the receipt selected for the details panel.
    (row) => row.id === selected,
  );

  /**
   * Change one filter, return to the first page, and close any previously selected receipt.
   */
  function change(name, value) {
    setFilters(
      // Preserve the other filter values while replacing the changed field.
      (previous) => ({ ...previous, [name]: value }),
    );
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
              onChange={
                // Apply the selected transaction-type filter.
                (event) => change('type', event.target.value)
              }
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
              onChange={
                // Apply the selected student filter.
                (event) => change('student', event.target.value)
              }
            >
              <option value="">All students and QR customers</option>
              {students.map(
                // Render one student choice in the receipt filter.
                (student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ),
              )}
            </select>
          </label>
          <label htmlFor="filter-slot">
            Slot
            <select
              id="filter-slot"
              value={filters.slot}
              onChange={
                // Apply the selected slot filter.
                (event) => change('slot', event.target.value)
              }
            >
              <option value="">All slots and top-ups</option>
              <option value="1">Slot 1</option>
              <option value="2">Slot 2</option>
            </select>
          </label>
          <InputDate
            value={filters.date}
            onChange={
              // Apply the date selected by the shared date input.
              (value) => change('date', value)
            }
          />
        </div>
        <div className="section-heading">
          <p>{filtered.length} demo records</p>
          <Button
            className="secondary"
            onClick={() => {
              // Reset every filter and return the receipt table to its initial view.
              setFilters({ type: 'All', student: '', slot: '', date: '' });
              setPage(0);
              setSelected('');
            }}
          >
            Clear filters
          </Button>
        </div>
        <TransactionTable
          rows={rows}
          onSelect={
            // Open the details of the receipt clicked in the table.
            (row) => setSelected(row.id)
          }
        />
        <div className="pagination">
          <Button
            className="secondary"
            disabled={currentPage === 0}
            onClick={
              // Show the preceding page of filtered receipts.
              () => setPage(currentPage - 1)
            }
          >
            Previous
          </Button>
          <span>
            Page {currentPage + 1} of {lastPage + 1}
          </span>
          <Button
            className="secondary"
            disabled={currentPage >= lastPage}
            onClick={
              // Show the next page of filtered receipts.
              () => setPage(currentPage + 1)
            }
          >
            Next
          </Button>
        </div>
      </section>
      {receipt && (
        <section className="card receipt">
          <div className="section-heading">
            <h3>Demo transaction details</h3>
            <Button
              className="secondary"
              onClick={
                // Close the selected receipt details.
                () => setSelected('')
              }
            >
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

/**
 * Render the labeled date input used by the transaction filters.
 */
function InputDate({ value, onChange }) {
  return (
    <label htmlFor="filter-date">
      Date
      <input
        id="filter-date"
        type="date"
        value={value}
        onChange={
          // Pass the date input's text value back to its parent filter handler.
          (event) => onChange(event.target.value)
        }
      />
    </label>
  );
}
