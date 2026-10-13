import { decryptUid, encryptUid, fingerprintUid, normalizeUid } from './crypto.js';

export const demoCredentials = { email: 'admin@smartvend.demo', password: 'smartvend123' };
export const demoCards = [
  { id: 'student-ana', name: 'Ana Demo', number: 'DEMO-001', uid: '04:A1:B2:C3' },
  { id: 'student-ben', name: 'Ben Demo', number: 'DEMO-002', uid: '04:D4:E5:F6' },
];
const activeStates = ['AwaitingPayment', 'Authorized', 'Dispensing', 'RefundPending'];

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function cents(value, minimum = 1, maximum = 100000000) {
  requireCondition(
    /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value)),
    'Enter a positive amount with at most two decimal places.',
  );
  const amount = Math.round(Number(value) * 100);
  requireCondition(
    Number.isSafeInteger(amount) && amount >= minimum && amount <= maximum,
    'Amount is outside the prototype limits.',
  );
  return amount;
}

function shortText(value, maximum) {
  requireCondition(
    typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximum,
    `Enter 1–${maximum} characters.`,
  );
  return value.trim();
}

function requestReference(value) {
  requireCondition(
    typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value),
    'A valid demo request reference is required.',
  );
}

function savedRequest(state, id, identity) {
  requestReference(id);
  const receipt = state.transactions.find((row) => row.id === id);
  requireCondition(!receipt || receipt.identity === identity, 'That reference was already used.');
  return receipt;
}

function productFor(state, slot) {
  const product = state.products.find((row) => row.id === Number(slot));
  requireCondition(product && product.stock > 0, 'The selected slot is out of stock.');
  return product;
}

function restoreStock(state, order) {
  if (order.reserved) {
    const product = state.products.find((row) => row.id === order.slot);
    product.stock += 1;
    product.version += 1;
    order.reserved = false;
  }
}

export async function seedState(profile) {
  const cards = await Promise.all(
    demoCards.map(async (student) => ({
      id: crypto.randomUUID(),
      studentId: student.id,
      active: true,
      lookup: await fingerprintUid(profile, student.uid),
      envelope: await encryptUid(profile, student.uid, student.id),
    })),
  );
  return {
    version: 1,
    students: demoCards.map(({ id, name, number }, index) => ({
      id,
      name,
      number,
      balanceCents: index === 0 ? 10000 : 5000,
    })),
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

export function viewState(state) {
  return {
    students: state.students.map((student) => {
      const card = state.cards.find((row) => row.studentId === student.id);
      return {
        ...student,
        balance: student.balanceCents / 100,
        cardId: card?.id,
        active: card?.active ?? false,
      };
    }),
    cards: state.cards,
    products: state.products,
    transactions: state.transactions.map((row) => ({ ...row, amount: row.amountCents / 100 })),
    orders: state.orders.map((row) => ({ ...row, amount: row.amountCents / 100 })),
    machine: state.machine,
  };
}

// The repository is browser-only IndexedDB. There are no provider or backend calls.
export function createPrototypeService(repository, profile) {
  async function commit(change) {
    const { state, result } = await repository.mutate(change);
    return { data: viewState(state), result };
  }

  return {
    profile,

    async loadData() {
      return { data: viewState(await repository.snapshot()) };
    },

    async resetDemo() {
      const seed = await seedState(profile);
      return commit((state) => {
        Object.assign(state, seed);
        return { reset: true };
      });
    },

    addStudent(input) {
      return commit((state) => {
        const name = shortText(input.name, 80);
        const number = shortText(input.number, 40).toUpperCase();
        requireCondition(
          !state.students.some((student) => student.number === number),
          'Student number is already registered.',
        );
        const student = { id: crypto.randomUUID(), name, number, balanceCents: 0 };
        state.students.push(student);
        return student;
      });
    },

    toggleCard(input) {
      return commit((state) => {
        const card = state.cards.find((row) => row.studentId === input.id);
        requireCondition(card, 'Enroll this student’s card first.');
        card.active = !card.active;
        return { active: card.active };
      });
    },

    saveProduct(input) {
      return commit((state) => {
        const product = state.products.find((row) => row.id === input.id);
        requireCondition(product, 'Select an existing product slot.');
        requireCondition(product.version === input.version, 'Slot changed. Reload before saving.');
        requireCondition(
          !state.orders.some(
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

    topupWallet(input) {
      return commit((state) => {
        const amount = cents(input.amount, 100, 1000000);
        const identity = `topup:${input.student}:${amount}`;
        const previous = savedRequest(state, input.request_id, identity);
        if (previous) {
          return previous;
        }
        const student = state.students.find((row) => row.id === input.student);
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

    async enrollCard(input) {
      const lookup = await fingerprintUid(profile, input.uid);
      const envelope = await encryptUid(profile, input.uid, input.studentId);
      return commit((state) => {
        requireCondition(
          state.students.some((student) => student.id === input.studentId),
          'Select a registered student.',
        );
        requireCondition(
          !state.cards.some((card) => card.studentId === input.studentId),
          'This student already has an enrolled card.',
        );
        requireCondition(
          !state.cards.some((card) => card.lookup === lookup),
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

    async verifyCard(input) {
      const state = await repository.snapshot();
      const lookup = await fingerprintUid(profile, input.uid);
      const card = state.cards.find(
        (row) => row.lookup === lookup && row.studentId === input.studentId,
      );
      requireCondition(card, 'This card does not match the selected student.');
      const uid = await decryptUid(profile, card.envelope, input.studentId);
      requireCondition(uid === normalizeUid(input.uid), 'Card integrity check failed.');
      return { data: viewState(state), result: { verified: true, active: card.active } };
    },

    async purchaseCard(input) {
      requireCondition(['success', 'failure'].includes(input.outcome), 'Select a demo outcome.');
      const snapshot = await repository.snapshot();
      const lookup = await fingerprintUid(profile, input.uid);
      const verified = snapshot.cards.find(
        (card) => card.lookup === lookup && card.studentId === input.studentId,
      );
      requireCondition(verified, 'This card does not match the selected student.');
      requireCondition(
        (await decryptUid(profile, verified.envelope, input.studentId)) === normalizeUid(input.uid),
        'Card integrity check failed.',
      );
      return commit((state) => {
        const identity = `card:${input.studentId}:${lookup}:${input.slot}:${input.outcome}`;
        const previous = savedRequest(state, input.requestId, identity);
        if (previous) {
          return previous;
        }
        const card = state.cards.find((row) => row.id === verified.id);
        requireCondition(
          card && card.active && card.envelope.ciphertext === verified.envelope.ciphertext,
          'The card is disabled or changed. Verify it again.',
        );
        requireCondition(
          state.machine.connected,
          'Connect the simulated device on the Machine page.',
        );
        requireCondition(
          !state.orders.some((order) => activeStates.includes(order.state)),
          'Finish the existing QR demo before another purchase.',
        );
        const student = state.students.find((row) => row.id === input.studentId);
        const product = productFor(state, input.slot);
        const amount = cents(product.price);
        requireCondition(student.balanceCents >= amount, 'Insufficient demo wallet credit.');
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

    createOrder(input) {
      return commit((state) => {
        const identity = `qr:${input.slot}`;
        const previous = savedRequest(state, input.requestId, identity);
        if (previous) {
          return state.orders.find((order) => order.id === input.requestId);
        }
        requireCondition(
          !state.orders.some((order) => activeStates.includes(order.state)),
          'Finish or cancel the existing QR demo first.',
        );
        const product = productFor(state, input.slot);
        product.stock -= 1;
        product.version += 1;
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

    advanceOrder(input) {
      return commit((state) => {
        const order = state.orders.find((row) => row.id === input.id);
        requireCondition(order, 'Select an existing demo order.');
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
        if (order.state === after) {
          return order;
        }
        requireCondition(order.state === before, `This action requires ${before}.`);
        if (input.action === 'start') {
          requireCondition(state.machine.connected, 'Connect the simulated device first.');
          state.machine.lastSeen = new Date().toISOString();
        }
        if (['fail', 'cancel', 'noItem'].includes(input.action)) {
          restoreStock(state, order);
        }
        order.state = after;
        if (input.action === 'finish') {
          order.reserved = false;
        }
        const receipt = state.transactions.find((row) => row.id === order.id);
        receipt.status = after === 'Authorized' || after === 'Dispensing' ? 'Pending' : after;
        receipt.note = `Prototype state: ${after}. Payment and dispensing are simulated.`;
        return order;
      });
    },

    setMachine(input) {
      return commit((state) => {
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
