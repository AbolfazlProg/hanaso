/**
 * HANASO — auth credentials + seal unit tests (M1 · AUTH-ACCOUNTS).
 *
 * The no-raw-storage contract, pinned:
 *  - scrypt hash/verify roundtrip (right secret passes, any other fails,
 *    constant-time; malformed encodings never crash the verifier);
 *  - the deterministic lookup key routes logins without storing anything
 *    reversible (same phrase → same key; different phrase → different key);
 *  - AES-256-GCM seal survives a roundtrip and dies on any tamper.
 */
import { describe, expect, it } from 'vitest';
import { deriveLookupKey, hashSecret, verifySecret } from '@/modules/auth/credentials';
import { sealPhrase, unsealPhrase } from '@/modules/auth/seal';

describe('hashSecret / verifySecret (scrypt verifier)', () => {
  it('roundtrip: the exact secret verifies; a different secret never does', () => {
    const encoded = hashSecret('legal winner thank year wave sausage worth useful legal winner thank yellow');
    expect(encoded.startsWith('scrypt$')).toBe(true);
    expect(verifySecret('legal winner thank year wave sausage worth useful legal winner thank yellow', encoded)).toBe(
      true,
    );
    expect(verifySecret('legal winner thank year wave sausage worth useful legal winner thank zzzzzz', encoded)).toBe(
      false,
    );
    expect(verifySecret('', encoded)).toBe(false);
  });
  it('the encoded form never contains the secret in any recoverable form', () => {
    const secret = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
    const encoded = hashSecret(secret);
    expect(encoded.includes('legal')).toBe(false);
    expect(encoded.includes('winner')).toBe(false);
    // salt randomness: two hashes of the same secret differ (fresh salt)
    expect(hashSecret(secret)).not.toBe(encoded);
  });
  it('malformed/absent encodings answer false, never throw', () => {
    expect(verifySecret('x', null)).toBe(false);
    expect(verifySecret('x', undefined)).toBe(false);
    expect(verifySecret('x', '')).toBe(false);
    expect(verifySecret('x', 'not-a-scrypt-form')).toBe(false);
    expect(verifySecret('x', 'scrypt$abc$def$ghi$j$k')).toBe(false);
    expect(verifySecret('x', 'scrypt$1099511627776$8$1$AAAA$AAAA')).toBe(false); // absurd params refused
  });
});

describe('deriveLookupKey — deterministic O(1) routing key', () => {
  const phrase = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
  it('same phrase → identical key; different phrase → different key', () => {
    expect(deriveLookupKey(phrase)).toBe(deriveLookupKey(phrase));
    expect(deriveLookupKey(phrase)).not.toBe(
      deriveLookupKey('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'),
    );
  });
  it('the key is a compact base64url value, never the phrase', () => {
    const key = deriveLookupKey(phrase);
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(key.includes('legal')).toBe(false);
  });
});

describe('sealPhrase / unsealPhrase — AES-256-GCM pending-phrase seal', () => {
  const phrase = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
  it('roundtrips the phrase exactly', () => {
    expect(unsealPhrase(sealPhrase(phrase))).toBe(phrase);
  });
  it('two seals of the same phrase differ (fresh IV) but both roundtrip', () => {
    const a = sealPhrase(phrase);
    const b = sealPhrase(phrase);
    expect(a).not.toBe(b);
    expect(unsealPhrase(a)).toBe(phrase);
    expect(unsealPhrase(b)).toBe(phrase);
  });
  it('any tamper (ciphertext, tag, iv) → null, never garbage', () => {
    const sealed = sealPhrase(phrase);
    const [iv, tag, ct] = sealed.split('.');
    expect(unsealPhrase(`${iv}.${tag}.${ct!.slice(0, -2)}AB`)).toBeNull();
    const flipped = String.fromCharCode(tag!.charCodeAt(0) ^ 1) + tag!.slice(1);
    expect(unsealPhrase(`${iv}.${flipped}.${ct}`)).toBeNull();
    expect(unsealPhrase('garbage')).toBeNull();
    expect(unsealPhrase('a.b')).toBeNull();
    expect(unsealPhrase('')).toBeNull();
  });
  it('the sealed form never contains the words', () => {
    expect(sealPhrase(phrase).includes('legal')).toBe(false);
    expect(sealPhrase(phrase).includes('winner')).toBe(false);
  });
});
