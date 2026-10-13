# Encryption in the presentation prototype

## AES-256-GCM: protecting enrolled card identifiers

AES means Advanced Encryption Standard. The 256 refers to its 256-bit secret key.
The same key encrypts and decrypts, so AES is symmetric encryption.
GCM means Galois/Counter Mode; it authenticates encrypted data as well as hiding it.

`encryptUid()` normalizes a fictional card UID, creates a fresh random 12-byte IV,
and encrypts it with Web Crypto. The output includes ciphertext and a 128-bit
authentication tag. The student's record ID is additional authenticated data,
which prevents a copied ciphertext from being accepted for a different student.

`decryptUid()` needs the matching key, IV, ciphertext/tag, and student binding.
Modified ciphertext or a different binding causes decryption to fail. Automated
tests flip a ciphertext bit and verify that decryption rejects it.

## RSA-OAEP: retained cryptography helper

RSA uses a public/private key pair. The public key encrypts and the matching private
key decrypts. OAEP is the padding method; this prototype uses a 2048-bit RSA key
and SHA-256. The helper operates on short messages rather than bulk data.

RSA functions remain in the crypto module and automated tests, but their interactive
demo panels are removed from the GUI. Enrolled cards use AES-GCM; they are not
encrypted twice or sent to another device.

## HMAC-SHA-256: finding a matching card

HMAC means Hash-based Message Authentication Code. SHA-256 produces a 256-bit hash.
HMAC also depends on a secret key. Equivalent UID formatting produces the same
keyed lookup, which lets the prototype find an enrolled record before decrypting it.

HMAC is not reversible encryption. A different lookup key produces a different
result. This prototype uses a separate HMAC key from its AES encryption key.

## Base64 and browser storage

Base64 converts bytes into printable text. It is not encryption: the protection
comes from AES or RSA, not from the Base64 appearance.

The prototype stores CryptoKey objects and encrypted card records in IndexedDB.
AES and private RSA keys are non-extractable, but the same browser application
can still perform authorized cryptographic operations with them. Demo login is
only a UI flow; it cannot enforce a server security boundary. Use fictional data.

The Card security page shows ciphertext and keyed hashes without displaying
decrypted UIDs. The two sample UIDs are public
demo fixtures in the source code, not private student identifiers.

## References

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [AES-GCM parameters](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams)
- [SubtleCrypto and key storage](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
- [Web Cryptography specification](https://www.w3.org/TR/WebCryptoAPI/)
