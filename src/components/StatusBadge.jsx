/**
 * Shared status presentation. Badge labels and colors do not change the stored order or receipt
 * state.
 */

/**
 * Convert stored status names into readable labels and choose a matching badge color.
 */
export default function StatusBadge({ children }) {
  // Reversed is a legacy input label displayed as Refunded; this mapping changes presentation
  // text, not stored transaction data.
  const label =
    { Reversed: 'Refunded', RefundPending: 'Refund pending', AwaitingPayment: 'Awaiting payment' }[
      children
    ] || children;
  const tone = ['Completed', 'Active', 'Authorized', 'In stock', 'Demo ready'].includes(children)
    ? 'success'
    : ['AwaitingPayment', 'Dispensing', 'RefundPending', 'Pending'].includes(children)
      ? 'warning'
      : ['Failed', 'Disabled', 'Cancelled', 'Out of stock', 'Demo offline'].includes(children)
        ? 'danger'
        : ['Refunded', 'Reversed'].includes(children)
          ? 'info'
          : 'neutral';
  return (
    <span className={`badge badge-${tone}`}>
      {/*
        Pair a decorative dot with the readable status label; the surrounding class supplies its
        color.
      */}
      <span className="status-dot" />
      {label}
    </span>
  );
}
