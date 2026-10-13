# SmartVend prototype presentation: 5–7 minutes

## Before presenting

Run `npm ci` once, then `npm run dev`. Open http://127.0.0.1:5174 in Chrome or Edge.
Sign in using the prefilled demo credentials. On Machine & demo setup, use
Reset demo data before rehearsing. Keep the same browser profile and URL.

## 1. Introduce the scope — 30 seconds

“SmartVend is our smart vending system concept. This presentation demonstrates
the frontend, navigation, real encryption, and simulated payment workflows.
The full project's backend and hardware are separate from this prototype.”

Show the Overview page and click a navigation link to establish that the GUI works.

## 2. Show products and students — 1 minute

Open Product slots. Show the two products, centavo prices, and stock. Edit a product
and save it. Open Students & wallets. Show Ana Demo's ₱100 wallet and enrolled card.

To demonstrate enrollment, register a fictional student such as “Chris Demo” with
student number `DEMO-003`. Select that student in Encrypted card enrollment,
enter `04:11:22:33`, and click Encrypt & enroll card. Enter the same UID again and
click Verify card. Explain that the stored card record contains encrypted bytes.

## 3. Explain card security — 1 minute

Open Card security and show the newly enrolled student's encrypted record.
The record contains AES ciphertext and an HMAC lookup rather than a plaintext UID.
Return to Students & wallets and verify the same card to demonstrate that the
underlying encryption still works.

“AES-256-GCM protects enrolled card identifiers and detects tampering.
HMAC-SHA-256 helps find a matching card. HMAC is a keyed hash, not encryption.”

## 4. Simulate a card purchase — 1 minute

Open Card purchase. Select Ana Demo and Slot 1. Enter `04:A1:B2:C3`, choose
Successful dispense, and click Simulate card purchase. If Slot 1 is still ₱25,
Ana's balance becomes ₱75 and stock decreases by one. Open Transactions to show
the receipt. Adjust your spoken example if you edited the price earlier.

“The encryption is real, but the wallet credit and item dispensing are simulated.”

## 5. Show the QR payment concept — 1–2 minutes

Open QR payment demo and click Generate demo QR. Show the amount, order reference,
and QR image. It contains demo order information, not a payment-provider URL.

Click Simulate successful payment, Start dispense simulation, and Simulate item
dispensed. Explain the states: Awaiting payment, Authorized, Dispensing, Completed.
Show the completed receipt. Student wallets are unchanged for this QR purchase.

If time permits, create another checkout and choose successful payment, start,
and Simulate no item dispensed. Show restored stock and Refund pending, then click
Complete demo refund. Explain that all these outcomes are prototype actions.

## 6. Close with the ecosystem — 30 seconds

“This prototype uses React and Vite for the GUI, React Router for navigation,
Web Crypto for encryption, and IndexedDB for local demonstration records.
The complete project will integrate the backend, a payment provider, and ESP32-S3
hardware. Today we are presenting the frontend prototype required for this stage.”

No API keys, PayMongo account, phone payment authorization, tunnel, or physical
hardware are needed for this demonstration.
