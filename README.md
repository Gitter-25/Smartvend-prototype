# SmartVend Presentation Prototype

A standalone frontend project for presenting SmartVend's UI/UX, navigation,
encryption, and payment concept. It is independent of the full SmartVend project.

## Start on Windows, macOS, or Linux

Install Node.js 24. Extract this project into its own folder, open that folder
in VS Code, and run:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5174**. Use the prefilled presentation credentials:

| Field    | Value                  |
| -------- | ---------------------- |
| Email    | `admin@smartvend.demo` |
| Password | `smartvend123`         |

This is a demo login interface, not server authentication. No backend server,
database installation, `.env`, payment keys, tunnel, or hardware is required.
Keep the terminal running during the presentation. The first dependency
installation requires internet access; the running prototype makes no external
payment or data requests.

Do not open `index.html` by double-clicking it. Use the Vite address so Web Crypto
has a localhost secure context. Keep the same address and port when rehearsing:
browser data is separate for different origins.

## Working screens

- **Overview:** stock totals, student count, product summaries, and recent activity.
- **Students & wallets:** registration, card enrollment/verification, card status,
  and fictional wallet credit.
- **Product slots:** two editable slots, centavo prices, and stock counts.
- **Card purchase:** encrypted-card verification, simulated purchase, and a
  failed-dispense refund demonstration.
- **QR payment demo:** an actual QR image with demo order information; successful
  payment, failed payment, cancellation, dispensing, and refund controls.
- **Transactions:** filters, pagination, and receipt details.
- **Card security:** enrolled-card ciphertext and keyed lookup records.
- **Machine & demo setup:** simulated device availability and a demo-data reset.

Navigation uses hash routes, such as `#/students`, for simple static hosting.

## Sample data

| Student  | Enrolled sample UID | Starting demo balance |
| -------- | ------------------- | --------------------- |
| Ana Demo | `04:A1:B2:C3`       | ₱100.00               |
| Ben Demo | `04:D4:E5:F6`       | ₱50.00                |

Slot 1 starts with 12 bottled waters at ₱25.00. Slot 2 starts with 8 biscuits
at ₱15.50. These are fictional presentation records. Register a new student
and enroll `04:11:22:33` to demonstrate a new encryption operation.

Keys and records persist in **IndexedDB in this browser profile**. Refreshing
the page preserves demo records. Clearing site data removes both records and
keys; the next visit creates fresh sample data. The Machine page's reset restores
sample records and keeps the current browser keys.

## Encryption and payment scope

Encryption is real: enrolled UIDs use **AES-256-GCM**, a fresh 12-byte IV,
a 128-bit authentication tag, and student-specific authenticated data.
**HMAC-SHA-256** provides keyed UID lookup. **RSA-OAEP with a 2048-bit key and
SHA-256** remains available in the crypto helper and automated tests; its demo panels are hidden.

HMAC is hashing, not encryption. Base64 is an encoding used to display bytes.
AES and private RSA keys are non-extractable Web Crypto keys stored in IndexedDB.
They can still be used by the application in that browser; this frontend-only
design is a teaching prototype, not production access control. Use fictional data.

All payment, wallet-credit, refund, and dispensing outcomes are **simulated**.
There is no PayMongo SDK, API request, real payment link, or money collection.
The QR encodes demo metadata and should be presented as a prototype code.
Card simulation changes fictional student credit. QR simulation leaves student
wallets unchanged and reserves/restores demo stock.

See [presentation flow](docs/PRESENTATION.md), [file and function guide](docs/FILES.md),
and [encryption explanation](docs/ENCRYPTION.md).

## Production build and checks

```sh
npm test
npm run format:check
npm run build
npm run preview
```

The preview opens at **http://127.0.0.1:4174**. It uses a separate browser-data
origin from the development server. Pick one mode before rehearsing.

The project uses 2-space indentation and a 100-character formatting target.
Run `npm run format` after edits. Dependencies are pinned in `package-lock.json`.
The test suite verifies encryption, card validation, centavos, once-only retries,
stock changes, QR state transitions, simulated refunds, and reset behavior.
