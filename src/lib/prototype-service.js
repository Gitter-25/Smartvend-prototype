/**
 * Business rules for the frontend prototype. Wallet credit, QR payments, refunds, and dispensing
 * are fictional local operations; no payment API or hardware is called.
 */

import { decryptUid, encryptUid, fingerprintUid, normalizeUid } from './crypto.js';

// Public presentation fixtures are intentionally readable in this source. Newly enrolled UIDs are
// stored as ciphertext and HMAC in the workspace, not as plaintext.
export const demoCredentials = { email: 'admin@smartvend.demo', password: 'smartvend123' };
export const demoCards = [
  { id: 'student-ana', name: 'Ana Demo', number: 'DEMO-001', uid: '04:A1:B2:C3' },
  { id: 'student-ben', name: 'Ben Demo', number: 'DEMO-002', uid: '04:D4:E5:F6' },
];
// These states keep an order open until it is completed, cancelled, failed, or refunded. An
// unfinished refund also blocks a new QR checkout.
const activeStates = ['AwaitingPayment', 'Authorized', 'Dispensing', 'RefundPending'];

/**
 * Stop an operation with a readable error when a required business rule is not satisfied.
 */
function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Validate a peso amount and convert it to integer centavos within the allowed limits, avoiding
 * fractional wallet arithmetic.
 */
export function cents(value, minimum = 1, maximum = 100000000) {
  requireCondition(
    /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value)),
    'Enter a positive amount with at most two decimal places.',
  );
  // Validate the decimal text first, then calculate in integer centavos (for example, 15.50 pesos
  // becomes 1550). Convert to pesos only for display or slot price fields.
  const amount = Math.round(Number(value) * 100);
  requireCondition(
    Number.isSafeInteger(amount) && amount >= minimum && amount <= maximum,
    'Amount is outside the prototype limits.',
  );
  return amount;
}

/**
 * Validate a required text field, limit its length, and remove surrounding spaces.
 */
function shortText(value, maximum) {
  requireCondition(
    typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximum,
    `Enter 1–${maximum} characters.`,
  );
  return value.trim();
}

/**
 * Require a UUID-shaped request reference before accepting an operation that must not be applied
 * twice.
 */
function requestReference(value) {
  requireCondition(
    typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value),
    'A valid demo request reference is required.',
  );
}

/**
 * Return a receipt for a repeated request, but reject the same reference if its operation
 * details changed.
 */
function savedRequest(state, id, identity) {
  requestReference(id);
  const receipt = state.transactions.find(
    // Find the receipt already stored under this request reference.
    (row) => row.id === id,
  );
  requireCondition(!receipt || receipt.identity === identity, 'That reference was already used.');
  return receipt;
}

/**
 * Find an existing product slot and require at least one available unit.
 */
function productFor(state, slot) {
  const product = state.products.find(
    // Match the numeric slot selected by the form to a saved product.
    (row) => row.id === Number(slot),
  );
  requireCondition(product && product.stock > 0, 'The selected slot is out of stock.');
  return product;
}

/**
 * Return a QR order's reserved unit to stock once, and clear its reservation flag.
 */
function restoreStock(state, order) {
  // The flag makes repeated cancellation/failure actions safe: a unit is returned only while its
  // reservation still exists.
  if (order.reserved) {
    const product = state.products.find(
      // Find the product slot whose reserved unit must be returned.
      (row) => row.id === order.slot,
    );
    product.stock += 1;
    product.version += 1;
    order.reserved = false;
  }
}

/**
 * Build fresh fictional students, encrypted cards, wallets, stock, and device state using the
 * supplied encryption profile.
 */
export async function seedState(profile) {
  const cards = await Promise.all(
    demoCards.map(
      // Create an encrypted card envelope and keyed lookup for each public sample UID.
      async (student) => ({
        id: crypto.randomUUID(),
        studentId: student.id,
        active: true,
        lookup: await fingerprintUid(profile, student.uid),
        envelope: await encryptUid(profile, student.uid, student.id),
      }),
    ),
  );
  return {
    version: 1,
    students: demoCards.map(
      // Copy student details without their sample plaintext UID and set the starting balance in
      // centavos.
      ({ id, name, number }, index) => ({
        id,
        name,
        number,
        balanceCents: index === 0 ? 10000 : 5000,
      }),
    ),
    cards,
    products: [
      { id: 1, name: 'Bottled water', price: 25, stock: 12, version: 0 },
      { id: 2, name: 'Biscuits', price: 15.5, stock: 8, version: 0 },
    ],
    transactions: [],
    orders: [],
    machine: { connected: true, lastSeen: null },
  };
}

/**
 * Prepare stored records for the UI by joining card status and converting centavos into display
 * amounts.
 */
export function viewState(state) {
  return {
    students: state.students.map((student) => {
      // Add the student's card status and peso balance to their display record.
      const card = state.cards.find(
        // Find the card enrolled for this student.
        (row) => row.studentId === student.id,
      );
      return {
        ...student,
        balance: student.balanceCents / 100,
        cardId: card?.id,
        active: card?.active ?? false,
      };
    }),
    cards: state.cards,
    products: state.products,
    transactions: state.transactions.map(
      // Add a peso amount to each receipt while retaining its stored centavo amount.
      (row) => ({ ...row, amount: row.amountCents / 100 }),
    ),
    orders: state.orders.map(
      // Add a peso amount to each QR order for the checkout display.
      (row) => ({ ...row, amount: row.amountCents / 100 }),
    ),
    machine: state.machine,
  };
}

/**
 * Build the prototype's business operations around a repository and crypto profile. All payments
 * and device outcomes here are local simulations.
 */
export function createPrototypeService(repository, profile) {
  /**
   * Save a grouped change through the repository and return both refreshed UI data and the
   * operation's result.
   */
  async function commit(change) {
    const { state, result } = await repository.mutate(change);
    return { data: viewState(state), result };
  }

  return {
    profile,

    /**
     * Read saved records and return their display-friendly representation.
     */
    async loadData() {
      return { data: viewState(await repository.snapshot()) };
    },

    /**
     * Replace demo records with fresh samples while retaining the current encryption keys.
     */
    async resetDemo() {
      const seed = await seedState(profile);
      return commit((state) => {
        // Replace the workspace with the prepared seed inside one write transaction.
        Object.assign(state, seed);
        return { reset: true };
      });
    },

    /**
     * Register a student with a unique normalized student number and an empty fictional wallet.
     */
    addStudent(input) {
      return commit((state) => {
        // Validate the registration and insert the new zero-balance student atomically.
        const name = shortText(input.name, 80);
        const number = shortText(input.number, 40).toUpperCase();
        requireCondition(
          !state.students.some(
            // Check whether the normalized student number is already registered.
            (student) => student.number === number,
          ),
          'Student number is already registered.',
        );
        const student = { id: crypto.randomUUID(), name, number, balanceCents: 0 };
        state.students.push(student);
        return student;
      });
    },

    /**
     * Enable or disable an enrolled card for the selected student.
     */
    toggleCard(input) {
      return commit((state) => {
        // Find the enrolled card, change its active flag, and return the new status.
        const card = state.cards.find(
          // Match this student to their enrolled card.
          (row) => row.studentId === input.id,
        );
        requireCondition(card, 'Enroll this student’s card first.');
        card.active = !card.active;
        return { active: card.active };
      });
    },

    /**
     * Update a product only if its version is current and no unfinished QR order is using that
     * slot.
     */
    saveProduct(input) {
      return commit((state) => {
        // Check the slot, version, pending orders, price, and stock before applying the product
        // update.
        const product = state.products.find(
          // Find the product being edited.
          (row) => row.id === input.id,
        );
        requireCondition(product, 'Select an existing product slot.');
        requireCondition(product.version === input.version, 'Slot changed. Reload before saving.');
        requireCondition(
          !state.orders.some(
            /**
             * Check for an unfinished checkout or refund that locks this slot against editing.
             */
            (order) => order.slot === input.id && activeStates.includes(order.state),
          ),
          'Finish the demo checkout or refund before editing this slot.',
        );
        const name = shortText(input.name, 80);
        const price = cents(input.price) / 100;
        requireCondition(
          Number.isSafeInteger(input.stock) && input.stock >= 0 && input.stock <= 1000000,
          'Stock must be a whole number between 0 and 1,000,000.',
        );
        Object.assign(product, { name, price, stock: input.stock, version: product.version + 1 });
        return { saved: true };
      });
    },

    /**
     * Add fictional wallet credit once per request reference and record a matching receipt.
     */
    topupWallet(input) {
      return commit((state) => {
        // Validate the credit, recognize retries, and update the balance and receipt together.
        const amount = cents(input.amount, 100, 1000000);
        // The reference identifies this request; identity binds it to the student and amount. An
        // exact retry returns the receipt without adding credit again.
        const identity = `topup:${input.student}:${amount}`;
        const previous = savedRequest(state, input.request_id, identity);
        if (previous) {
          return previous;
        }
        const student = state.students.find(
          // Find the student whose wallet will receive the credit.
          (row) => row.id === input.student,
        );
        requireCondition(student, 'Select a registered student.');
        requireCondition(student.balanceCents + amount <= 100000000, 'Demo wallet limit reached.');
        student.balanceCents += amount;
        const receipt = {
          id: input.request_id,
          identity,
          studentId: student.id,
          student: student.name,
          type: 'Top-up',
          amountCents: amount,
          status: 'Completed',
          payment_method: 'Demo admin credit',
          date: new Date().toISOString(),
          note: 'Simulated wallet credit. No real money or payment API.',
        };
        state.transactions.unshift(receipt);
        return receipt;
      });
    },

    /**
     * Create the UID's keyed lookup and encrypted envelope, then enroll it only if both the
     * student and card are eligible.
     */
    async enrollCard(input) {
      // Compute the keyed lookup and authenticated envelope before the synchronous database
      // change. The transaction then checks uniqueness against current records.
      const lookup = await fingerprintUid(profile, input.uid);
      const envelope = await encryptUid(profile, input.uid, input.studentId);
      return commit((state) => {
        // Recheck student existence and card uniqueness before storing the encrypted card record.
        requireCondition(
          state.students.some(
            // Confirm that the selected student exists.
            (student) => student.id === input.studentId,
          ),
          'Select a registered student.',
        );
        requireCondition(
          !state.cards.some(
            // Check whether this student already has an enrolled card.
            (card) => card.studentId === input.studentId,
          ),
          'This student already has an enrolled card.',
        );
        requireCondition(
          !state.cards.some(
            // Check whether this UID's keyed lookup is already assigned to another card.
            (card) => card.lookup === lookup,
          ),
          'This card is already enrolled for another student.',
        );
        state.cards.push({
          id: crypto.randomUUID(),
          studentId: input.studentId,
          lookup,
          envelope,
          active: true,
        });
        return { enrolled: true };
      });
    },

    /**
     * Match the student and HMAC lookup, then decrypt and authenticate the UID; return the match
     * and current card status without charging a wallet.
     */
    async verifyCard(input) {
      const state = await repository.snapshot();
      const lookup = await fingerprintUid(profile, input.uid);
      const card = state.cards.find(
        /**
         * Find a card matching both the normalized UID's lookup and the selected student.
         */
        (row) => row.lookup === lookup && row.studentId === input.studentId,
      );
      requireCondition(card, 'This card does not match the selected student.');
      // HMAC locates the candidate record; AES-GCM then authenticates its ciphertext and student
      // binding. A lookup match alone is not the full integrity check.
      const uid = await decryptUid(profile, card.envelope, input.studentId);
      requireCondition(uid === normalizeUid(input.uid), 'Card integrity check failed.');
      return { data: viewState(state), result: { verified: true, active: card.active } };
    },

    /**
     * Authenticate an enrolled card, validate wallet and stock, and record the chosen simulated
     * dispensing outcome once per request.
     */
    async purchaseCard(input) {
      requireCondition(['success', 'failure'].includes(input.outcome), 'Select a demo outcome.');
      const snapshot = await repository.snapshot();
      const lookup = await fingerprintUid(profile, input.uid);
      const verified = snapshot.cards.find(
        /**
         * Find the candidate card by student and keyed lookup before AES integrity verification.
         */
        (card) => card.lookup === lookup && card.studentId === input.studentId,
      );
      requireCondition(verified, 'This card does not match the selected student.');
      requireCondition(
        (await decryptUid(profile, verified.envelope, input.studentId)) === normalizeUid(input.uid),
        'Card integrity check failed.',
      );
      return commit((state) => {
        // Recheck the verified card and current inventory, then save a success or failed-dispense
        // receipt atomically.
        // Recheck current records inside the write transaction because verification used an
        // earlier snapshot. The request reference also prevents duplicate wallet deductions.
        const identity = `card:${input.studentId}:${lookup}:${input.slot}:${input.outcome}`;
        const previous = savedRequest(state, input.requestId, identity);
        if (previous) {
          return previous;
        }
        const card = state.cards.find(
          // Read the current version of the card that was verified before the transaction.
          (row) => row.id === verified.id,
        );
        requireCondition(
          card && card.active && card.envelope.ciphertext === verified.envelope.ciphertext,
          'The card is disabled or changed. Verify it again.',
        );
        requireCondition(
          state.machine.connected,
          'Connect the simulated device on the Machine page.',
        );
        requireCondition(
          !state.orders.some(
            // Check whether an unfinished QR payment or refund blocks a new card purchase.
            (order) => activeStates.includes(order.state),
          ),
          'Finish the existing QR demo before another purchase.',
        );
        const student = state.students.find(
          // Find the student whose fictional wallet will fund the card purchase.
          (row) => row.id === input.studentId,
        );
        const product = productFor(state, input.slot);
        const amount = cents(product.price);
        requireCondition(student.balanceCents >= amount, 'Insufficient demo wallet credit.');
        // Only the successful outcome consumes wallet credit and stock. The failure branch records
        // a simulated Refunded receipt while leaving those amounts unchanged.
        if (input.outcome === 'success') {
          student.balanceCents -= amount;
          product.stock -= 1;
          product.version += 1;
        }
        const receipt = {
          id: input.requestId,
          identity,
          studentId: student.id,
          student: student.name,
          type: 'Purchase',
          amountCents: amount,
          status: input.outcome === 'success' ? 'Completed' : 'Refunded',
          payment_method: 'Card wallet simulation',
          slot_id: product.id,
          product_name: product.name,
          date: new Date().toISOString(),
          note:
            input.outcome === 'success'
              ? 'Simulated dispense completed. No physical item was dispensed.'
              : 'Simulated dispense failed. Demo wallet and stock remain restored.',
        };
        state.transactions.unshift(receipt);
        return receipt;
      });
    },

    /**
     * Create a simulated QR checkout, reserve one stock unit, and save its initial receipt once
     * per reference.
     */
    createOrder(input) {
      return commit((state) => {
        // Recognize an existing request or reserve stock and insert the new order and pending
        // receipt together.
        const identity = `qr:${input.slot}`;
        const previous = savedRequest(state, input.requestId, identity);
        if (previous) {
          return state.orders.find(
            // Return the existing QR order when the same checkout request is retried.
            (order) => order.id === input.requestId,
          );
        }
        requireCondition(
          !state.orders.some(
            // Check whether a previous QR order is still awaiting payment, dispensing, or refund
            // completion.
            (order) => activeStates.includes(order.state),
          ),
          'Finish or cancel the existing QR demo first.',
        );
        const product = productFor(state, input.slot);
        product.stock -= 1;
        product.version += 1;
        // The stock unit above is reserved for this QR order. Cancellation, payment failure, or
        // failed dispensing returns it once; successful dispensing consumes it.
        const order = {
          id: input.requestId,
          slot: product.id,
          productName: product.name,
          amountCents: cents(product.price),
          state: 'AwaitingPayment',
          reserved: true,
          date: new Date().toISOString(),
        };
        state.orders.unshift(order);
        state.transactions.unshift({
          id: order.id,
          identity,
          student: 'Demo QR customer',
          type: 'Purchase',
          amountCents: order.amountCents,
          status: 'Pending',
          payment_method: 'QR simulation',
          slot_id: order.slot,
          product_name: order.productName,
          date: order.date,
          note: 'Demo checkout created. No payment provider was contacted.',
        });
        return order;
      });
    },

    /**
     * Apply an allowed simulated QR state transition and keep stock and receipt status in step
     * with it.
     */
    advanceOrder(input) {
      return commit((state) => {
        // Validate the current order state, apply the requested transition, and save all related
        // changes together.
        const order = state.orders.find(
          // Find the QR order selected for the simulation action.
          (row) => row.id === input.id,
        );
        requireCondition(order, 'Select an existing demo order.');
        // Each action has one allowed starting state and one destination. UI buttons guide the
        // flow, but these rules also reject invalid direct service calls.
        const transitions = {
          pay: ['AwaitingPayment', 'Authorized'],
          fail: ['AwaitingPayment', 'Failed'],
          cancel: ['AwaitingPayment', 'Cancelled'],
          start: ['Authorized', 'Dispensing'],
          finish: ['Dispensing', 'Completed'],
          noItem: ['Dispensing', 'RefundPending'],
          refund: ['RefundPending', 'Refunded'],
        };
        const transition = transitions[input.action];
        requireCondition(transition, 'Unknown simulation action.');
        const [before, after] = transition;
        // Repeating a completed transition returns the saved order without restoring stock or
        // changing money again.
        if (order.state === after) {
          return order;
        }
        requireCondition(order.state === before, `This action requires ${before}.`);
        if (input.action === 'start') {
          requireCondition(state.machine.connected, 'Connect the simulated device first.');
          state.machine.lastSeen = new Date().toISOString();
        }
        // Failed/cancelled QR flows restore the reserved product. QR orders never credit or debit
        // a student wallet; the refund is a presentation state only.
        if (['fail', 'cancel', 'noItem'].includes(input.action)) {
          restoreStock(state, order);
        }
        order.state = after;
        if (input.action === 'finish') {
          order.reserved = false;
        }
        const receipt = state.transactions.find(
          // Find the receipt belonging to this QR order so its status follows the order.
          (row) => row.id === order.id,
        );
        receipt.status = after === 'Authorized' || after === 'Dispensing' ? 'Pending' : after;
        receipt.note = `Prototype state: ${after}. Payment and dispensing are simulated.`;
        return order;
      });
    },

    /**
     * Save the simulated device's availability and a local contact timestamp; no ESP32 request
     * is sent.
     */
    setMachine(input) {
      return commit((state) => {
        // Validate the boolean device state and save its simulated last-contact time.
        requireCondition(typeof input.connected === 'boolean', 'Choose a device simulation state.');
        state.machine = {
          connected: input.connected,
          lastSeen: new Date().toISOString(),
        };
        return state.machine;
      });
    },
  };
}
