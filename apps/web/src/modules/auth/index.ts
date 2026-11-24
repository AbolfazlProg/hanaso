/**
 * HANASO — auth module barrel (M1 · AUTH-ACCOUNTS → M2 · AUTH-PASSWORD).
 *
 * M2 (owner revision 2026-11-24): username+password is THE primary login;
 * the mnemonic/email/google/sms rows became the four password-RECOVERY
 * doors (google stays a login method too — one-click, no password).
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
export * from './password-policy';
export * from './password';
export * from './login';
export * from './register';
export * from './recover';
