const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

export function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

export function fromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

// Keys are real Web Crypto keys. Private material is non-extractable.
export async function createKeyProfile() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Open the prototype on localhost or HTTPS to enable browser encryption.');
  }
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

// A fresh 96-bit IV makes repeated encryption produce different ciphertext.
// Additional authenticated data binds the ciphertext to its student's record.
export async function encryptUid(profile, value, studentId) {
  const uid = normalizeUid(value);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: encoder.encode(`smartvend-prototype:v1:${studentId}`),
      tagLength: 128,
    },
    profile.aes,
    encoder.encode(uid),
  );
  return { version: 1, iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
}

export async function decryptUid(profile, envelope, studentId) {
  try {
    if (envelope.version !== 1) {
      throw new Error('Unsupported encryption version.');
    }
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

// HMAC is a keyed hash for lookup, not reversible encryption.
export async function fingerprintUid(profile, value) {
  const digest = await crypto.subtle.sign(
    'HMAC',
    profile.lookup,
    encoder.encode(normalizeUid(value)),
  );
  return toBase64(digest);
}

// RSA is a separate asymmetric-encryption demonstration in the encryption lab.
export async function encryptRsa(profile, value) {
  const bytes = encoder.encode(value);
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

export async function decryptRsa(profile, ciphertext) {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    profile.rsa.privateKey,
    fromBase64(ciphertext),
  );
  return decoder.decode(plaintext);
}
