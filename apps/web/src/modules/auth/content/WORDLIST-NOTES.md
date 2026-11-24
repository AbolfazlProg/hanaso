# BIP39 English wordlist — M3 (owner revision 2026-11-24)

Owner mandate: «از یه کتابخونه‌ای که قبلاً خودشو اثبات کرده استفاده کن تا
امنیتش بالاتر بره» — the phrase engine now runs on **@scure/bip39** (the
audited noble ecosystem; the modern successor of bitcoinjs's bip39), and the
wordlist itself comes FROM the library
(`@scure/bip39/wordlists/english.js`).

This file (`bip39-english.txt`) is the canonical official list, kept as an
AUDIT ARTIFACT only:

- source: https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt
- sha256: 2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda
- the unit test `auth-mnemonic.test.ts` pins **library list === this txt** —
  a compromised dependency update cannot silently swap the phrase space
  (boot also validates 2048 · unique · `[a-z]{3,8}`).

The vendored JSON module (M1) is retired — deleted with the M3 switch.

The quiz inputs carry NO autocomplete (owner: «باید خود یوزر تایپ کنه») — the
recall test is a real memory check, and the 2048 words no longer ship to the
client bundle.
