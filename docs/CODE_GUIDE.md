# Reading the SmartVend prototype code

This guide is for the **presentation prototype**. It runs in the browser using
React, Vite, IndexedDB, and Web Crypto. Wallet credits, QR payments, refunds, and
dispensing are simulated. It does not use the full project's Express server,
SQLite database, or PayMongo API.

## Suggested reading order

| Read | File                               | What to understand                                                         |
| ---- | ---------------------------------- | -------------------------------------------------------------------------- |
| 1    | `src/main.jsx`                     | Starts React and wraps the application with routing and shared context.    |
| 2    | `src/App.jsx`                      | Maps URLs to pages and checks the demo session.                            |
| 3    | `src/components/AppLayout.jsx`     | Builds navigation and displays the selected page through `Outlet`.         |
| 4    | `src/data/AuthContext.jsx`         | Stores this tab's demonstration session.                                   |
| 5    | `src/data/AppData.jsx`             | Loads saved data, exposes actions, and refreshes all pages after changes.  |
| 6    | `src/lib/prototype-service.js`     | Validates input and applies wallet, card, stock, order, and receipt rules. |
| 7    | `src/lib/crypto.js`                | Normalizes UIDs, encrypts/decrypts cards, and creates keyed lookups.       |
| 8    | `src/lib/storage.js`               | Reads IndexedDB and commits related changes together.                      |
| 9    | `src/pages/` and `src/components/` | Connects forms and buttons to the shared actions and renders results.      |
| 10   | `tests/prototype.test.js`          | Shows valid scenarios and rejected cases through automated assertions.     |

Each function has a purpose comment, including small callbacks such as `map`,
`find`, button handlers, effect cleanup, and test callbacks. Important files also
have an opening explanation and comments beside the main logic blocks. Comments
explain the existing behavior; they do not run as application code.

## Comments inside the UI return

UI sections use JSX comments in this form:

```jsx
{
  /* Device card: display the simulated online/offline state and its controls. */
}
<section className="card">...</section>;
```

These comments describe sections, forms, fields, conditional panels, table groups,
and navigation inside `return (...)`. They are for reading the source and do not
appear as text on the page. Function comments explain how an action works; JSX
comments explain which visible part of the interface uses that action. Small
inline icons and text within a described section share its surrounding explanation.

## Follow one card-enrollment click

1. In **Students & wallets**, `CardEnrollment.jsx` reads the selected student,
   typed UID, and clicked button value in `submit`.
2. `manageCard` in `AppData.jsx` chooses `enrollCard`. `runAction` calls the service.
3. `enrollCard` in `prototype-service.js` calls `fingerprintUid` and `encryptUid`.
   Encryption finishes before the synchronous database change begins.
4. `crypto.js` normalizes the UID, creates an HMAC lookup, and encrypts the UID
   with AES-256-GCM using fresh random initialization bytes and student binding.
5. The service checks that the student exists, has no enrolled card, and that
   the UID lookup is unique. It then adds the encrypted card record.
6. `storage.js` saves the workspace inside one IndexedDB transaction. A validation
   error aborts the transaction, so partial changes are not saved.
7. `runAction` publishes the returned workspace to React context. The form shows
   success, the student list updates, and Card security can show the ciphertext.

## Encryption terms beside the code

| Term                | Meaning and use in this prototype                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UID                 | The hexadecimal identifier typed to represent a card. `normalizeUid` removes separators and validates its length.                                       |
| AES-256-GCM         | Symmetric authenticated encryption. A 256-bit key encrypts/decrypts the enrolled UID; GCM also detects altered data.                                    |
| IV                  | A fresh random 12-byte initialization value for each encryption. It is public and stored beside the ciphertext.                                         |
| Authentication tag  | A 128-bit integrity value appended to the ciphertext by Web Crypto and checked during decryption.                                                       |
| AAD                 | Additional authenticated data containing the student ID. Copying an envelope to a different student fails verification.                                 |
| Envelope            | The stored object containing `version`, Base64 `iv`, and Base64 `ciphertext` including the tag.                                                         |
| HMAC-SHA-256        | A keyed hash used to find a card record. It is stable for an equivalent UID and the same key; it cannot be decrypted.                                   |
| Base64              | A way to represent bytes as readable text. It is encoding, not encryption.                                                                              |
| RSA-OAEP            | A separate public/private-key helper using 2048-bit RSA and SHA-256. Automated tests exercise it; enrollment uses AES and there is no active RSA panel. |
| Non-extractable key | A Web Crypto key whose secret/private material cannot be exported through the API. The browser application can still use it for permitted operations.   |

`createKeyProfile` creates separate keys for separate purposes. `AppData.jsx`
loads them from IndexedDB or generates them for a fresh workspace. Saved enrolled
records contain ciphertext and HMAC, while public sample UIDs remain in the source
as presentation fixtures. The Card security page displays protection records;
it does not decrypt enrolled UIDs for display.

This browser-only design demonstrates encryption, not production access control.
The fixed login credentials are public and are not password encryption. Use
fictional student data. See [the encryption explanation](ENCRYPTION.md) for more.

## Follow the simulated payment paths

**Card:** `Purchase.jsx` sends the selected student, typed UID, slot, and chosen
outcome through `manageCard` to `purchaseCard`. The service finds the HMAC match,
authenticates/decrypts the card, and rechecks its current status. It checks the
simulated machine, wallet credit, and stock. A successful outcome deducts the
saved product price and one unit; a failure records **Refunded** while leaving
credit and stock unchanged. It does not debit and then reverse an actual charge.

**QR:** `QR.jsx` calls `createOrder`, which reserves one unit and records
`AwaitingPayment`. The QR image contains local demo metadata, not a provider
payment link. Buttons call `advanceOrder`; the service enforces these paths:

| Starting state  | Action             | Result                                      |
| --------------- | ------------------ | ------------------------------------------- |
| AwaitingPayment | `pay`              | Authorized                                  |
| AwaitingPayment | `fail` or `cancel` | Failed or Cancelled; restore reserved stock |
| Authorized      | `start`            | Dispensing; simulated device must be online |
| Dispensing      | `finish`           | Completed; reserved unit is consumed        |
| Dispensing      | `noItem`           | RefundPending; restore reserved stock       |
| RefundPending   | `refund`           | Refunded; close the simulated refund        |

QR orders never change a student wallet. `restoreStock` clears the `reserved`
flag after returning a unit, so repeated actions cannot increase stock again.
The service recognizes an exact repeated request reference instead of applying
its effect twice. A reused reference with changed details is rejected.

## Common patterns in the pages

- `useState` stores temporary UI values such as a selection, a message, or `busy`.
  Saved workspace records come from `useData` instead.
- `event.preventDefault()` keeps a form submission from reloading the page.
  `FormData` reads named form fields.
- `try/catch/finally` displays service errors and clears busy state when an
  asynchronous action finishes, whether it succeeds or fails.
- `map` builds a display row or choice for each item; `find` selects one matching
  record; `some` checks whether any record matches; `filter` keeps matching rows;
  `reduce` accumulates totals.
- `useEffect` runs work after rendering. The QR effect returns a cleanup function
  that prevents an old asynchronous image result from replacing a newer one.
- `commit` groups related saved changes. Its change callback must stay synchronous:
  do asynchronous crypto before it so IndexedDB does not close the transaction.
- `version` is a product edit counter. An outdated form is rejected instead of
  overwriting newer stock. `requestId`/`request_id` is a unique operation reference
  used to recognize retries. Neither is an encryption key.

## Styling, configuration, and verification

`src/styles.css` has section comments for the theme, shared controls, workspace
layout, login, responsive rules, and prototype additions. `vite.config.js`
configures React compilation; `index.html` provides the element React mounts into.
`package.json` and `package-lock.json` retain their existing dependency settings.

The code uses two-space indentation and a 100-character formatting target.
Generated dependency folders and build output are not part of this source ZIP.

```sh
npm ci
npm run dev
```

To check an edit, run:

```sh
npm run format:check
npm test
npm run build
```

The tests use real crypto and an in-memory repository to check service behavior.
They do not replace a browser test of IndexedDB events or a hardware/payment
integration test. For a live rehearsal, follow [the presentation flow](PRESENTATION.md).
