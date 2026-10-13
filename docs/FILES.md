# Files and functions

| File or folder                      | Purpose                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `index.html`                        | Browser entry point and page metadata.                                                                        |
| `src/main.jsx`                      | Mounts React, hash routing, demo login state, and shared data.                                                |
| `src/App.jsx`                       | Maps each route to a page and redirects the demo login flow.                                                  |
| `src/styles.css`                    | Shared responsive styles, navigation, cards, forms, and demo panels.                                          |
| `src/components/`                   | Reusable buttons, inputs, icons, navigation, status labels, tables, card enrollment, and wallet-credit forms. |
| `src/pages/`                        | Overview, Login, Students, Product, Purchase, QR, Transactions, Card security, and Machine screens.           |
| `src/data/AuthContext.jsx`          | Prefilled demo sign-in and sign-out. This does not implement secure authentication.                           |
| `src/data/AppData.jsx`              | Initializes encryption keys and sample data; connects page actions to the prototype service.                  |
| `src/lib/crypto.js`                 | Actual AES-GCM, RSA-OAEP, HMAC, UID normalization, and byte encoding.                                         |
| `src/lib/storage.js`                | Opens IndexedDB, saves non-extractable keys, and commits demo-record changes atomically.                      |
| `src/lib/prototype-service.js`      | Validates students, products, cards, wallets, and QR state transitions.                                       |
| `src/lib/format.js`                 | Formats Philippine peso amounts with centavos.                                                                |
| `tests/prototype.test.js`           | Tests encryption integrity and simulated transaction behavior.                                                |
| `vite.config.js`                    | React build configuration; no API proxy.                                                                      |
| `.prettierrc.json`, `.editorconfig` | Consistent indentation, quoting, line length, and line endings.                                               |
| `.github/workflows/checks.yml`      | Optional checks if this separate project is later placed in a GitHub repository.                              |

## Main service functions

| Function         | Summary                                                                            |
| ---------------- | ---------------------------------------------------------------------------------- |
| `seedState()`    | Builds fictional students, encrypted cards, wallets, and two product slots.        |
| `viewState()`    | Maps stored centavos and card records to fields consumed by the UI.                |
| `addStudent()`   | Checks names and duplicate numbers; creates a zero-balance wallet.                 |
| `enrollCard()`   | Generates a keyed lookup and encrypted UID; rejects duplicate enrollment.          |
| `verifyCard()`   | Matches HMAC, decrypts the record, and checks its student binding.                 |
| `topupWallet()`  | Adds fictional credit and a receipt, once per request reference.                   |
| `saveProduct()`  | Checks centavos, stock, edit version, and unresolved slot reservations.            |
| `purchaseCard()` | Verifies a card and simulates a purchase or restored-wallet refund.                |
| `createOrder()`  | Creates a demo QR order and reserves one unit of stock.                            |
| `advanceOrder()` | Applies valid simulated payment, dispensing, cancellation, and refund transitions. |
| `setMachine()`   | Changes simulated device availability.                                             |
| `resetDemo()`    | Restores sample records while retaining the browser encryption profile.            |

The prototype has no Express server, SQLite file, Supabase functions, PayMongo
integration, or ESP32 firmware. Those belong to the separate full SmartVend project.
