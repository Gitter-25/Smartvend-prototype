import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createKeyProfile,
  decryptRsa,
  decryptUid,
  encryptRsa,
  encryptUid,
  fingerprintUid,
  fromBase64,
  normalizeUid,
  toBase64,
} from '../src/lib/crypto.js';
import {
  cents,
  createPrototypeService,
  demoCards,
  seedState,
} from '../src/lib/prototype-service.js';

const profile = await createKeyProfile();
const reference = () => crypto.randomUUID();

// A transactional in-memory adapter exercises the same browser service without a backend.
async function fixture() {
  const repository = {
    state: await seedState(profile),
    async snapshot() {
      return structuredClone(this.state);
    },
    async mutate(change) {
      const draft = structuredClone(this.state);
      const result = change(draft);
      this.state = draft;
      return { state: structuredClone(draft), result };
    },
  };
  const service = createPrototypeService(repository, profile);
  return { repository, service };
}

function purchase(overrides = {}) {
  return {
    studentId: demoCards[0].id,
    uid: demoCards[0].uid,
    slot: 1,
    outcome: 'success',
    requestId: reference(),
    ...overrides,
  };
}

test('UID normalization accepts reader separators and rejects malformed values', () => {
  assert.equal(normalizeUid('04:a1-b2 c3'), '04A1B2C3');
  assert.equal(normalizeUid('04:A1:B2:C3:D4:E5:F6'), '04A1B2C3D4E5F6');
  for (const invalid of ['', 'TEST-001', '0x04A1B2C3', 'GG112233', '123', null]) {
    assert.throws(() => normalizeUid(invalid));
  }
});

test('AES-256 and private RSA keys cannot be exported', async () => {
  assert.equal(profile.aes.algorithm.length, 256);
  assert.equal(profile.aes.extractable, false);
  assert.equal(profile.rsa.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('raw', profile.aes));
  await assert.rejects(crypto.subtle.exportKey('pkcs8', profile.rsa.privateKey));
});

test('AES round trips and repeated encryption uses different IVs and ciphertext', async () => {
  const first = await encryptUid(profile, demoCards[0].uid, 'student');
  const second = await encryptUid(profile, demoCards[0].uid, 'student');
  assert.equal(await decryptUid(profile, first, 'student'), '04A1B2C3');
  assert.equal(fromBase64(first.iv).length, 12);
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.ciphertext, second.ciphertext);
});

test('AES rejects modified ciphertext, incorrect keys, and swapped student records', async () => {
  const envelope = await encryptUid(profile, demoCards[0].uid, 'student');
  const bytes = fromBase64(envelope.ciphertext);
  bytes[0] ^= 1;
  await assert.rejects(
    decryptUid(profile, { ...envelope, ciphertext: toBase64(bytes) }, 'student'),
  );
  await assert.rejects(decryptUid(profile, envelope, 'other-student'));
  const wrongAes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  await assert.rejects(decryptUid({ ...profile, aes: wrongAes }, envelope, 'student'));
});

test('HMAC lookup is stable across UID formatting and depends on the secret key', async () => {
  const original = await fingerprintUid(profile, '04:A1:B2:C3');
  assert.equal(await fingerprintUid(profile, '04a1b2c3'), original);
  const lookup = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign'],
  );
  assert.notEqual(await fingerprintUid({ ...profile, lookup }, '04A1B2C3'), original);
});

test('RSA-OAEP round trips with randomized ciphertext and rejects tampering', async () => {
  const first = await encryptRsa(profile, '04A1B2C3');
  assert.equal(await decryptRsa(profile, first), '04A1B2C3');
  assert.notEqual(first, await encryptRsa(profile, '04A1B2C3'));
  const bytes = fromBase64(first);
  bytes[0] ^= 1;
  await assert.rejects(decryptRsa(profile, toBase64(bytes)));
  await assert.rejects(encryptRsa(profile, 'x'.repeat(191)));
});

test('seeded card records contain ciphertext and HMAC, not plaintext UIDs', async () => {
  const state = await seedState(profile);
  assert.equal(state.students[0].balanceCents, 10000);
  assert.equal(state.cards.length, 2);
  const stored = JSON.stringify(state);
  for (const card of demoCards) {
    assert.equal(stored.includes(card.uid), false);
    assert.equal(stored.includes(normalizeUid(card.uid)), false);
  }
});

test('registration rejects duplicates and creates zero-balance wallets', async () => {
  const { service, repository } = await fixture();
  const added = await service.addStudent({ name: 'New Demo', number: ' demo-003 ' });
  assert.equal(added.result.balanceCents, 0);
  assert.equal(added.result.number, 'DEMO-003');
  await assert.rejects(service.addStudent({ name: 'Duplicate', number: 'demo-003' }));
  assert.equal(repository.state.students.length, 3);
});

test('enrollment encrypts a unique card and verification reports disabled status', async () => {
  const { service, repository } = await fixture();
  const { result: student } = await service.addStudent({ name: 'New Demo', number: 'DEMO-003' });
  const input = { studentId: student.id, uid: '04:11:22:33' };
  await service.enrollCard(input);
  assert.equal((await service.verifyCard(input)).result.active, true);
  await service.toggleCard({ id: student.id });
  assert.equal((await service.verifyCard(input)).result.active, false);
  assert.equal(JSON.stringify(repository.state).includes('04112233'), false);
  await assert.rejects(service.enrollCard(input));
  const { result: another } = await service.addStudent({ name: 'Other Demo', number: 'DEMO-004' });
  await assert.rejects(service.enrollCard({ ...input, studentId: another.id }));
});

test('money validation preserves centavos and rejects extra decimals and invalid amounts', () => {
  assert.equal(cents('15.50'), 1550);
  assert.equal(cents('0.01'), 1);
  for (const amount of ['1.001', '-1', '', NaN, Infinity, '1e2', 0]) {
    assert.throws(() => cents(amount));
  }
});

test('wallet credit applies once and reused references cannot change identity', async () => {
  const { service, repository } = await fixture();
  const input = { student: demoCards[0].id, amount: '10.25', request_id: reference() };
  await service.topupWallet(input);
  await service.topupWallet(input);
  assert.equal(repository.state.students[0].balanceCents, 11025);
  assert.equal(repository.state.transactions.length, 1);
  await assert.rejects(service.topupWallet({ ...input, amount: '20.25' }));
  assert.equal(repository.state.students[0].balanceCents, 11025);
});

test('product edits preserve centavos and reject stale inventory versions', async () => {
  const { service, repository } = await fixture();
  await service.saveProduct({ id: 1, name: 'Demo water', price: '25.75', stock: 5, version: 0 });
  assert.equal(repository.state.products[0].price, 25.75);
  await assert.rejects(
    service.saveProduct({ id: 1, name: 'Old', price: 10, stock: 2, version: 0 }),
  );
  assert.equal(repository.state.products[0].stock, 5);
});

test('card purchases deduct the trusted slot price and stock only once', async () => {
  const { service, repository } = await fixture();
  const input = purchase({ slot: 2 });
  const result = await service.purchaseCard(input);
  await service.purchaseCard(input);
  assert.equal(result.result.amountCents, 1550);
  assert.equal(repository.state.students[0].balanceCents, 8450);
  assert.equal(repository.state.products[1].stock, 7);
  assert.equal(repository.state.transactions.length, 1);
  await assert.rejects(service.purchaseCard({ ...input, outcome: 'failure' }));
});

test('failed card dispense records a refund without consuming wallet or stock', async () => {
  const { service, repository } = await fixture();
  const result = await service.purchaseCard(purchase({ outcome: 'failure' }));
  assert.equal(result.result.status, 'Refunded');
  assert.equal(repository.state.students[0].balanceCents, 10000);
  assert.equal(repository.state.products[0].stock, 12);
});

test('card mismatch, disabled cards and tampered records cannot purchase', async () => {
  const { service, repository } = await fixture();
  await assert.rejects(service.purchaseCard(purchase({ uid: demoCards[1].uid })));
  await service.toggleCard({ id: demoCards[0].id });
  await assert.rejects(service.purchaseCard(purchase()));
  await service.toggleCard({ id: demoCards[0].id });
  await repository.mutate((state) => {
    state.cards[0].envelope.ciphertext = 'AAAA';
  });
  await assert.rejects(service.purchaseCard(purchase()));
  assert.equal(repository.state.students[0].balanceCents, 10000);
  assert.equal(repository.state.products[0].stock, 12);
  assert.equal(repository.state.transactions.length, 0);
});

test('insufficient balance and empty stock leave all purchase data unchanged', async () => {
  const { service, repository } = await fixture();
  await repository.mutate((state) => {
    state.students[0].balanceCents = 1;
  });
  await assert.rejects(service.purchaseCard(purchase()));
  await repository.mutate((state) => {
    state.students[0].balanceCents = 10000;
    state.products[0].stock = 0;
  });
  await assert.rejects(service.purchaseCard(purchase()));
  assert.equal(repository.state.students[0].balanceCents, 10000);
  assert.equal(repository.state.transactions.length, 0);
});

test('QR reserves stock once and prevents unpaid dispensing and conflicting edits', async () => {
  const { service, repository } = await fixture();
  const input = { slot: 1, requestId: reference() };
  await service.createOrder(input);
  await service.createOrder(input);
  assert.equal(repository.state.products[0].stock, 11);
  assert.equal(repository.state.orders.length, 1);
  await assert.rejects(service.advanceOrder({ id: input.requestId, action: 'start' }));
  await assert.rejects(service.createOrder({ slot: 2, requestId: reference() }));
  await assert.rejects(service.purchaseCard(purchase()));
  await assert.rejects(
    service.saveProduct({ id: 1, name: 'Change', price: 10, stock: 99, version: 1 }),
  );
  assert.equal(repository.state.students[0].balanceCents, 10000);
});

test('QR success completes payment and dispensing without touching student wallets', async () => {
  const { service, repository } = await fixture();
  const id = reference();
  await service.createOrder({ slot: 1, requestId: id });
  for (const action of ['pay', 'start', 'finish', 'finish']) {
    await service.advanceOrder({ id, action });
  }
  assert.equal(repository.state.orders[0].state, 'Completed');
  assert.equal(repository.state.transactions[0].status, 'Completed');
  assert.equal(repository.state.products[0].stock, 11);
  assert.equal(repository.state.students[0].balanceCents, 10000);
});

test('QR cancellation and failed payment restore stock once', async () => {
  for (const action of ['cancel', 'fail']) {
    const { service, repository } = await fixture();
    const id = reference();
    await service.createOrder({ slot: 1, requestId: id });
    await service.advanceOrder({ id, action });
    await service.advanceOrder({ id, action });
    assert.equal(repository.state.products[0].stock, 12);
    assert.equal(repository.state.orders[0].state, action === 'cancel' ? 'Cancelled' : 'Failed');
  }
});

test('failed dispense restores stock and refunds without wallet credit', async () => {
  const { service, repository } = await fixture();
  const id = reference();
  await service.createOrder({ slot: 1, requestId: id });
  for (const action of ['pay', 'start', 'noItem', 'noItem']) {
    await service.advanceOrder({ id, action });
  }
  assert.equal(repository.state.orders[0].state, 'RefundPending');
  assert.equal(repository.state.products[0].stock, 12);
  await service.advanceOrder({ id, action: 'refund' });
  await service.advanceOrder({ id, action: 'refund' });
  assert.equal(repository.state.transactions[0].status, 'Refunded');
  assert.equal(repository.state.students[0].balanceCents, 10000);
  assert.equal(repository.state.products[0].stock, 12);
});

test('invalid QR transitions roll back without changing the order', async () => {
  const { service, repository } = await fixture();
  const id = reference();
  await service.createOrder({ slot: 1, requestId: id });
  await assert.rejects(service.advanceOrder({ id, action: 'finish' }));
  await assert.rejects(service.advanceOrder({ id, action: 'unknown' }));
  assert.equal(repository.state.orders[0].state, 'AwaitingPayment');
  assert.equal(repository.state.products[0].stock, 11);
});

test('simulated device offline blocks purchases and dispense start until reconnected', async () => {
  const { service, repository } = await fixture();
  await service.setMachine({ connected: false });
  await assert.rejects(service.purchaseCard(purchase()));
  const id = reference();
  await service.createOrder({ slot: 1, requestId: id });
  await service.advanceOrder({ id, action: 'pay' });
  await assert.rejects(service.advanceOrder({ id, action: 'start' }));
  await service.setMachine({ connected: true });
  await service.advanceOrder({ id, action: 'start' });
  assert.equal(repository.state.orders[0].state, 'Dispensing');
});

test('demo reset restores samples and keeps encryption usable with the same profile', async () => {
  const { service, repository } = await fixture();
  await service.purchaseCard(purchase());
  await service.addStudent({ name: 'Temporary', number: 'TEMP-001' });
  await service.resetDemo();
  assert.equal(repository.state.students.length, 2);
  assert.equal(repository.state.students[0].balanceCents, 10000);
  assert.equal(repository.state.products[0].stock, 12);
  assert.equal(repository.state.transactions.length, 0);
  assert.equal(
    (await service.verifyCard({ studentId: demoCards[0].id, uid: demoCards[0].uid })).result
      .verified,
    true,
  );
});

test('malformed request references are rejected before changing demo credit', async () => {
  const { service, repository } = await fixture();
  await assert.rejects(
    service.topupWallet({ student: demoCards[0].id, amount: 10, request_id: 'bad' }),
  );
  assert.equal(repository.state.students[0].balanceCents, 10000);
});
