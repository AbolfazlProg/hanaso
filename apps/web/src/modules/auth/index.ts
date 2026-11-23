/**
 * HANASO — auth module barrel (M1 · AUTH-ACCOUNTS).
 *
 * The four login methods (mission §۱):
 *  - mnemonic (the PRIMARY anchor — signup + re-login);
 *  - email OTP (full infrastructure; transport env-gated);
 *  - google OAuth/OIDC (full flow; credentials env-gated);
 *  - sms (infrastructure only — «به‌زودی»).
 * The linking rules (§۲), the guest→account migration (§۳) and the session
 * service (§۴) live beside them. See the file-level docblocks for contracts.
 */
export * from './wordlist';
export * from './mnemonic';
export * from './credentials';
export * from './seal';
export * from './session';
export * from './rate-limit';
export * from './email-otp';
export * from './email';
export * from './google';
export * from './sms';
export * from './identities';
export * from './merge';
export * from './sweep';
