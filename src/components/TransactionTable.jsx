/**
 * Shared receipt table used by Overview and Transactions. The parent decides which rows to show
 * and whether selection is enabled.
 */

import { pesos } from '../lib/format';
import StatusBadge from './StatusBadge';

/**
 * Render receipt rows, or an empty-state message when there are none. onSelect is optional.
 */
export default function TransactionTable({ rows, onSelect }) {
  if (!rows.length) {
    return (
      <div className="empty-state">
        {/* When rows is empty, explain how receipts appear and suggest checking filters. */}
        <h4>No transactions to show</h4>
        <p>
          Activity will appear here after a top-up or purchase. Try changing the filters if you
          expected a record.
        </p>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      {/* Keep the shared receipt table usable on narrower screens. */}
      <table>
        {/* Label the reference/date, student, type, amount, and status columns. */}
        <thead>
          <tr>
            <th>Reference / date</th>
            <th>Student</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>

        {/*
          Render the receipts supplied by the parent page; this component does not filter them
          itself.
        */}
        <tbody>
          {rows.map(
            // Build one table row from a receipt, including its reference, date, amount, and
            // status.
            (row) => (
              <tr key={row.id}>
                {/* Display one supplied receipt and retain its unique ID as the React row key. */}
                {/* Group the shortened reference with a human-readable local timestamp. */}
                <td>
                  <span className="reference" title={row.id}>
                    {/*
                      Use a detail-opening button only when the parent supplied onSelect;
                      otherwise render reference text.
                    */}
                    {onSelect ? (
                      <button
                        className="text-button"
                        aria-label={`View transaction ${row.id}`}
                        onClick={
                          // Pass the clicked receipt to the parent page so it can show the full
                          // details.
                          () => onSelect(row)
                        }
                      >
                        {row.id.length > 16 ? `${row.id.slice(0, 8)}…${row.id.slice(-4)}` : row.id}
                      </button>
                    ) : row.id.length > 16 ? (
                      `${row.id.slice(0, 8)}…${row.id.slice(-4)}`
                    ) : (
                      row.id
                    )}
                  </span>
                  <small className="table-subtext">
                    {new Date(row.date).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </td>

                {/* Show the recorded student name, with a fallback label for QR customers. */}
                <td>{row.student || 'QR customer'}</td>

                {/* Show the operation type and its simulated payment/credit method. */}
                <td>
                  {row.type}
                  <small className="table-subtext">
                    {row.payment_method || (row.type === 'Top-up' ? 'Admin credit' : 'Card wallet')}
                  </small>
                </td>

                {/* Format the receipt's display amount in Philippine pesos. */}
                <td className="money">{pesos(row.amount)}</td>

                {/* Use the shared status badge to keep receipt colors and wording consistent. */}
                <td>
                  <StatusBadge>{row.status}</StatusBadge>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
