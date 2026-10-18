/**
 * Cryptography helpers: AES-256-GCM protects enrolled UIDs; HMAC-SHA-256 supports keyed lookup.
 * RSA helpers remain tested but have no active UI panel.
 */

// Web Crypto works with bytes. UTF-8 encoding converts UID text to bytes and decoding converts
// decrypted bytes back to text.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Validate a 4-, 7-, or 10-byte hexadecimal card UID and return one uppercase format without
 * separators.
 */
export function normalizeUid(value) {
  if (typeof value !== 'string') {
    throw new Error('Enter a hexadecimal card UID.');
  }
  const uid = value.replace(/[\s:-]/g, '').toUpperCase();
  if (!/^(?:[0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$/.test(uid)) {
    throw new Error('Use a 4-, 7-, or 10-byte hexadecimal UID, such as 04:A1:B2:C3.');
  }
  return uid;
}

/**
 * Encode binary bytes as Base64 text for storage and display. Base64 does not encrypt data.
 */
export function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/**
 * Decode Base64 text back into the byte array needed by Web Crypto.
 */
export function fromBase64(value) {
  return Uint8Array.from(
    atob(value),
    // Convert each decoded character into its numeric byte value.
    (character) => character.charCodeAt(0),
  );
}

/**
 * Generate separate AES-256-GCM, HMAC-SHA-256, and RSA-OAEP keys using Web Crypto.
 * Secret/private keys are non-extractable.
 */
export async function createKeyProfile() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Open the prototype on localhost or HTTPS to enable browser encryption.');
  }
  // Each purpose gets a separate key. The false argument prevents exporting secret/private key
  // material, but this browser application can still use the keys.
  const [aes, lookup, rsa] = await Promise.all([
    crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
    crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']),
    crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      false,
      ['encrypt', 'decrypt'],
    ),
  ]);
  return { aes, lookup, rsa };
}

/**
 * Encrypt a normalized UID with AES-256-GCM and return its version, random IV, and authenticated
 * ciphertext as a storage envelope.
 */
export async function encryptUid(profile, value, studentId) {
  const uid = normalizeUid(value);
  // An IV is a public initialization value. Generate a fresh 12-byte (96-bit) random IV for each
  // AES-GCM encryption; it is stored beside the ciphertext.
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      // Additional authenticated data (AAD) is checked, not encrypted. Binding the ciphertext to
      // this student makes copying it to another student fail authentication.
      additionalData: encoder.encode(`smartvend-prototype:v1:${studentId}`),
      // GCM adds a 128-bit authentication tag. Web Crypto appends that tag to the ciphertext
      // returned below so later decryption can detect tampering.
      tagLength: 128,
    },
    profile.aes,
    encoder.encode(uid),
  );
  // Keep the format version, IV, and ciphertext; the AES key remains in the separate key profile.
  // Base64 makes these byte arrays storable as text.
  return { version: 1, iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
}

/**
 * Decrypt and authenticate a stored UID with the same AES key and student binding; reject
 * altered or mismatched records.
 */
export async function decryptUid(profile, envelope, studentId) {
  try {
    if (envelope.version !== 1) {
      throw new Error('Unsupported encryption version.');
    }
    // Use the same AES key, IV, AAD, and tag length as encryption. Web Crypto rejects
    // authentication failures before returning plaintext.
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(envelope.iv),
        additionalData: encoder.encode(`smartvend-prototype:v1:${studentId}`),
        tagLength: 128,
      },
      profile.aes,
      fromBase64(envelope.ciphertext),
    );
    return normalizeUid(decoder.decode(plaintext));
  } catch {
    throw new Error('Decryption rejected: the ciphertext, key, or student binding does not match.');
  }
}

/**
 * Create a stable HMAC-SHA-256 lookup value for a normalized UID. This keyed hash can match
 * cards without storing a plaintext UID.
 */
export async function fingerprintUid(profile, value) {
  // Unlike randomized AES ciphertext, this keyed hash is stable for the same UID and key. It
  // supports matching; it cannot be decrypted to recover the UID.
  const digest = await crypto.subtle.sign(
    'HMAC',
    profile.lookup,
    encoder.encode(normalizeUid(value)),
  );
  return toBase64(digest);
}

/**
 * Encrypt a short UTF-8 message with the RSA-OAEP public key. This helper remains for tests; the
 * interactive RSA panel is removed.
 */
export async function encryptRsa(profile, value) {
  const bytes = encoder.encode(value);
  // RSA-OAEP with a 2048-bit key and SHA-256 allows at most 190 message bytes. Card enrollment
  // uses AES; this separate helper is exercised by the tests.
  if (!bytes.length || bytes.length > 190) {
    throw new Error('Enter 1–190 UTF-8 bytes for the RSA demonstration.');
  }
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    profile.rsa.publicKey,
    bytes,
  );
  return toBase64(ciphertext);
}

/**
 * Decrypt Base64 RSA-OAEP ciphertext with the private key. Card enrollment itself uses AES, not
 * this RSA helper.
 */
export async function decryptRsa(profile, ciphertext) {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    profile.rsa.privateKey,
    fromBase64(ciphertext),
  );
  return decoder.decode(plaintext);
}
