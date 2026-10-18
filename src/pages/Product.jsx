/**
 * Inventory screen: each fixed slot has its own form. Saved version numbers prevent an outdated
 * form from overwriting newer stock values.
 */

import { useState } from 'react';
import { useData } from '../data/AppData';
import { pesos } from '../lib/format';
import PageHeading from '../components/PageHeading';
import Button from '../components/Button';
import Input from '../components/Input';
import StatusBadge from '../components/StatusBadge';

/**
 * Render the fixed product slots with an independent editor for each one.
 */
export default function Product() {
  const { products } = useData();
  const [savedMessage, setSavedMessage] = useState('');
  return (
    <>
      {/* Introduce the two fixed vending-slot editors. */}
      <PageHeading
        title="Product slots"
        description="Edit demo products, prices, and stock in two fixed slots."
      />

      {/* Show a save confirmation only after an editor has reported a successful update. */}
      {savedMessage && (
        <p className="form-message" role="status">
          {savedMessage}
        </p>
      )}

      {/*
        Render an independent editor per slot; its version key reloads inputs after saved changes.
      */}
      <div className="two-columns">
        {products.map(
          // Create an editor for each slot; a changed version remounts it with the latest saved
          // values.
          (product) => (
            <SlotEditor
              key={`${product.id}:${product.version ?? 0}`}
              product={product}
              onSaved={
                // Show which slot was successfully saved.
                () => setSavedMessage(`Slot ${product.id} saved.`)
              }
              onSaveStart={
                // Clear the previous success notice when a new save begins.
                () => setSavedMessage('')
              }
            />
          ),
        )}
      </div>
    </>
  );
}

/**
 * Render and manage one slot's form without mixing it with another slot's unsaved inputs.
 */
function SlotEditor({ product, onSaved, onSaveStart }) {
  const { saveProduct: persistProduct, loadData } = useData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  /**
   * Validate the form, include the slot version for conflict detection, and save its name,
   * price, and stock through shared data.
   */
  async function saveProduct(event) {
    event.preventDefault();
    onSaveStart();
    setMessage('');
    const data = new FormData(event.currentTarget);
    const name = data.get('name').trim();
    const price = Number(data.get('price'));
    const stock = Number(data.get('stock'));
    if (
      !name ||
      !Number.isFinite(price) ||
      price < 0.01 ||
      price > 1000000 ||
      !Number.isSafeInteger(stock) ||
      stock < 0 ||
      stock > 1000000
    ) {
      return setMessage('Enter a name, a positive price, and a whole stock count.');
    }
    setBusy(true);
    try {
      // Send the version originally shown in this form. The service rejects it if another action
      // has changed the saved slot in the meantime.
      await persistProduct(product.id, {
        name,
        price: Math.round(price * 100) / 100,
        stock,
        version: product.version,
      });
      onSaved();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card slot-editor">
      {/*
        Single-slot editor card; its local form state is separate from the other slot's inputs.
      */}
      {/* Display the slot number, saved product name, and current stock badge. */}
      <div className="slot-header">
        {/* Group the fixed slot number and saved product name within the card header. */}
        <div>
          <p className="eyebrow">SLOT {String(product.id).padStart(2, '0')}</p>
          <h3>{product.name}</h3>
        </div>
        <StatusBadge>{product.stock ? 'In stock' : 'Out of stock'}</StatusBadge>
      </div>

      {/* Summarize the saved price and stock before the editable form. */}
      <p>
        {pesos(product.price)} · {product.stock} items available
      </p>

      {/* Submit a validated product update with the saved version for conflict detection. */}
      <form onSubmit={saveProduct}>
        {/* Edit the product name while retaining the current saved value as its initial value. */}
        <Input
          label="Product name"
          id={`product-name-${product.id}`}
          name="name"
          defaultValue={product.name}
          required
          maxLength={80}
        />

        {/* Place price and whole-unit stock fields together. */}
        <div className="form-grid">
          {/* Accept peso prices with centavo precision; the service validates the final amount. */}
          <Input
            label="Price (₱)"
            id={`price-${product.id}`}
            name="price"
            type="number"
            defaultValue={product.price}
            min="0.01"
            step="0.01"
            required
          />

          {/* Accept a non-negative whole stock count. */}
          <Input
            label="Stock count"
            id={`stock-${product.id}`}
            name="stock"
            type="number"
            defaultValue={product.stock}
            min="0"
            step="1"
            required
          />
        </div>

        {/* Save this slot and prevent another submission while it is busy. */}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : `Save Slot ${product.id}`}
        </Button>
      </form>

      {/* Display validation errors or save feedback for this editor only. */}
      <p role="status">{message}</p>

      {/* Reload the latest shared records after a conflict before retrying an edit. */}
      <Button className="text-button" type="button" disabled={busy} onClick={loadData}>
        Reload latest values
      </Button>
      <p className="helper-text">Reload after a conflict, then enter your changes again.</p>
    </section>
  );
}
