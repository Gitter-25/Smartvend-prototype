/**
 * Overview screen: derive totals and summaries from saved demo records instead of using separate
 * hard-coded counters.
 */

import { Link } from 'react-router-dom';
import { useData } from '../data/AppData';
import PageHeading from '../components/PageHeading';
import TransactionTable from '../components/TransactionTable';
import StatusBadge from '../components/StatusBadge';
import Icon from '../components/Icon';
import { pesos } from '../lib/format';

/**
 * Render overview totals and recent activity from the current demo workspace.
 */
export default function Dashboard() {
  const { students, products, transactions } = useData();
  const activeCards = students.filter(
    /**
     * Count students who have an enrolled, enabled card.
     */
    (student) => student.active && (student.cardId || student.card),
  ).length;
  return (
    <>
      {/* Introduce the overview of the current saved presentation records. */}
      <PageHeading title="Overview" description="Your presentation workspace, at a glance." />

      {/* Overview banner: introduce the two payment paths and link to the QR demo. */}
      <section className="overview-banner">
        {/* Group the overview headline, supporting text, and checkout navigation link. */}
        <div>
          <p className="eyebrow">SMARTER CAMPUS VENDING</p>
          <h3>
            Two ways to pay.
            <br />
          </h3>
          <p>
            Manage student wallets, prepare product slots, and follow every simulated payment from
            checkout to settlement.
          </p>
          <Link className="button-link" to="/qr">
            Open QR payment demo <Icon name="arrow" size={18} />
          </Link>
        </div>

        {/*
          Decorative vending illustration; aria-hidden keeps it out of the accessible reading
          order.
        */}
        <div className="banner-visual" aria-hidden="true">
          {/* Build the machine illustration from display, controls, and tray shapes. */}
          <div className="vending-illustration">
            {/* Use product icons to illustrate the two vending slots. */}
            <div className="vending-display">
              <Icon name="product" size={38} />
              <Icon name="product" size={38} />
            </div>

            {/* Illustrate card and QR payment choices using local SVG icons. */}
            <div className="vending-controls">
              <Icon name="card" />
              <Icon name="qr" />
            </div>
            <div className="vending-tray" />
          </div>
          <span className="banner-caption">FRONTEND PROTOTYPE</span>
        </div>
      </section>

      {/* Metric cards summarize stock, students, and the planned hardware concept. */}
      <div className="grid metrics">
        {/*
          Calculate available stock from product records instead of displaying a separate hard-
          coded counter.
        */}
        <section className="card metric-card">
          <span className="metric-icon">
            <Icon name="product" />
          </span>
          <p className="metric-label">Available stock</p>
          <strong className="metric-value">
            {products.reduce(
              // Add each product's stock to the total number of available units.
              (total, product) => total + product.stock,
              0,
            )}
          </strong>
          <p>Items across {products.length} product slots</p>
          <Link to="/product">
            Manage inventory <Icon name="arrow" size={16} />
          </Link>
        </section>

        {/* Show the registered student count and how many have active enrolled cards. */}
        <section className="card metric-card">
          <span className="metric-icon">
            <Icon name="students" />
          </span>
          <p className="metric-label">Registered students</p>
          <strong className="metric-value">{students.length}</strong>
          <p>
            {activeCards} enrolled, active {activeCards === 1 ? 'card' : 'cards'}
          </p>
          <Link to="/students">
            Manage students <Icon name="arrow" size={16} />
          </Link>
        </section>

        {/* Identify the intended ESP32-S3 controller and link to its simulation controls. */}
        <section className="card metric-card">
          <span className="metric-icon">
            <Icon name="machine" />
          </span>
          <p className="metric-label">Simulated device</p>
          <strong className="metric-text">ESP32-S3</strong>
          <p>Real hardware is planned for the full project</p>
          <Link to="/machine">
            Machine & demo setup <Icon name="arrow" size={16} />
          </Link>
        </section>
      </div>

      {/*
        Inventory overview: show each saved slot and provide navigation to the product editors.
      */}
      <section className="card">
        {/* Combine the inventory title with its edit-slots link. */}
        <div className="section-heading">
          {/* Group the inventory eyebrow and title before the edit-slots navigation link. */}
          <div>
            <p className="eyebrow">INVENTORY</p>
            <h3>Product slots</h3>
          </div>
          <Link to="/product">
            Edit slots <Icon name="arrow" size={16} />
          </Link>
        </div>

        {/* Lay out a summary for every product slot. */}
        <div className="slot-summary-grid">
          {products.map(
            // Render a product-slot summary with price, stock, and availability.
            (product) => (
              <div className="slot-summary" key={product.id}>
                {/* Show one slot's number, product name, price, stock, and availability badge. */}
                <span className="slot-number">{String(product.id).padStart(2, '0')}</span>

                {/* Keep this product name, peso price, and stock count together in its slot summary. */}
                <div>
                  <h4>{product.name}</h4>
                  <p>
                    {pesos(product.price)} <span>·</span> {product.stock} available
                  </p>
                </div>
                <StatusBadge>{product.stock > 0 ? 'In stock' : 'Out of stock'}</StatusBadge>
              </div>
            ),
          )}
        </div>

        {/* Explain the empty inventory area when there are no product records to display. */}
        {!products.length && <p>Product slots will appear once workspace data is loaded.</p>}
      </section>

      {/* Recent activity: reuse the receipt table for the five newest transactions. */}
      <section className="card">
        {/* Pair the activity heading with a link to the full transaction history. */}
        <div className="section-heading">
          {/* Group the activity eyebrow and title before the full-history navigation link. */}
          <div>
            <p className="eyebrow">ACTIVITY</p>
            <h3>Latest transactions</h3>
          </div>
          <Link to="/transactions">
            View all <Icon name="arrow" size={16} />
          </Link>
        </div>

        {/*
          Display only the newest five receipts here; filtering and details live on the
          Transactions page.
        */}
        <TransactionTable rows={transactions.slice(0, 5)} />
      </section>
    </>
  );
}
