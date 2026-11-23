/**
 * HANASO — auth schema (Drizzle) — M1 · AUTH-ACCOUNTS 2026-11-24.
 *
 * The single HANASO account system the KB always pointed at (every app table
 * carried «user_id → app."user" (auth tables land with M1)» logical refs —
 * those refs resolve to `app.users` from this migration on).
 *
 * Owner mandate (mission §۱..§۳):
 *  - ONE account per person; login methods are LINKABLE/REMOVABLE rows on the
 *    same account (auth_identities) — a new method must never fork a second
 *    account;
 *  - the mnemonic (recovery-phrase) method is the PRIMARY anchor — generated
 *    with cryptographic randomness, verified before the account is activated,
 *    and NEVER stored in raw form (a scrypt verifier + a server-keyed lookup
 *    key only; the raw phrase lives ONLY inside a short-lived sealed pending
 *    row during the signup wizard, then it is destroyed);
 *  - email login = real OTP over a real transport (env-configured; without
 *    credentials the method answers 503 — never a fake success);
 *  - SMS = infrastructure only (به‌زودی in the UI, no sends);
 *  - Google = Authorization Code + PKCE + state + nonce, JWKS-verified id_token.
 *
 * KB rules honored: schema `app` = user data, never rewritten from content
 * publishes; PKs uuidv7(); timestamps timestamptz; secrets are never stored
 * raw (tokenHash = SHA-256 of the cookie token, phraseHash = scrypt).
 */
import { sql } from 'drizzle-orm';
import { index, integer, jsonb, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { app } from './app';

/* ------------------------------------------------------------- users (M1) */
/** One HANASO account = one row. Login methods hang off auth_identities. */
export const users = app.table(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    /** Optional friendly name (settings) — never required, never used for login. */
    displayName: text('display_name'),
    /**
     * Contact email (lowercase) — the most recently VERIFIED address (google or
     * email-OTP). Nullable: mnemonic-only accounts may have none. UNIQUE where
     * not null (postgres treats NULLs as distinct). Login linkage itself lives
     * in auth_identities — this column is for display/communication only.
     */
    email: text('email'),
    /** When the contact email above was proven (id_token / OTP). */
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_key').on(t.email)],
);

/* ------------------------------------------------------- auth_identities */
/**
 * The linked login methods of ONE account (mission §۲):
 *   provider='mnemonic' → providerAccountId = the user's own id (one anchor)
 *   provider='google'   → providerAccountId = the Google `sub` (one per user)
 *   provider='email'    → providerAccountId = the lowercase email address
 *   provider='sms'      → providerAccountId = the phone in E.164 (future)
 *
 * UNIQUE (provider, provider_account_id) is the anti-duplicate gate: a google
 * sub or an email can point at exactly ONE account, ever. UNIQUE (user_id,
 * provider) keeps the security-settings surface one-row-per-method.
 */
export const authIdentities = app.table(
  'auth_identities',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    /**
     * Mnemonic only — base64url(HMAC-SHA256(HANASO_SESSION_SECRET, normalized
     * phrase)). DETERMINISTIC so login is an O(1) index lookup, and
     * server-keyed so a leaked DB copy cannot be brute-forced offline without
     * the secret. Never the raw phrase, never the verifier.
     */
    lookupKey: text('lookup_key'),
    /**
     * Mnemonic only — scrypt(N,r,p,salt,b64hash) of the normalized phrase.
     * Slow + memory-hard: possession proof after the lookup-key hit.
     */
    credentialHash: text('credential_hash'),
    /** When this method was proven (quiz pass / verified id_token / OTP). */
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    /** User-disabled from security settings (the row stays for history). */
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('auth_identities_provider_account_key').on(t.provider, t.providerAccountId),
    uniqueIndex('auth_identities_user_provider_key').on(t.userId, t.provider),
    index('auth_identities_user_idx').on(t.userId),
  ],
);

/* ------------------------------------------------------------- sessions */
/**
 * Revocable server-side sessions (mission §۴: «Session امن و قابل ابطال»).
 * The cookie carries a 32-byte random token; the table stores only its
 * SHA-256 hex — a DB copy cannot be replayed as a login. Rolling 30-day
 * expiry; `logout everywhere` = revokedAt stamp on every row of the user.
 */
export const sessions = app.table(
  'sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** sha256 hex of the raw cookie token — UNIQUE (constant-time compare upstream). */
    tokenHash: text('token_hash').notNull(),
    /** The login method that created this session ('mnemonic'|'google'|'email'). */
    method: text('method'),
    /** Short UA summary for the devices list (never a full UA dump). */
    deviceLabel: text('device_label'),
    /** Truncated client IP (privacy: max 2 octets / 16 bits of an IPv6 block). */
    ipPrefix: text('ip_prefix'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Rolling update on verified requests (≤ once/hour to keep writes cheap). */
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Set by logout / logout-everywhere / owner revoke. */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('sessions_token_hash_key').on(t.tokenHash), index('sessions_user_idx').on(t.userId)],
);

/* --------------------------------------------------------- oauth_states */
/**
 * One-time rows for the Google Authorization Code + PKCE flow (mission §۴:
 * CSRF + callback-abuse protection). The raw code_verifier NEVER lands in the
 * DB — it rides an httpOnly SIGNED cookie back to the callback; this row
 * stores only its SHA-256 so the callback can prove the cookie↔row pair.
 * `state` is single-use (consumed_at) and 5-minute-lived.
 */
export const oauthStates = app.table(
  'oauth_states',
  {
    /** 32-byte base64url state string (the CSRF token itself). */
    state: text('state').primaryKey(),
    /** id_token nonce — bound into the row, compared at token verification. */
    nonce: text('nonce').notNull(),
    /** sha256 hex of the PKCE code_verifier (raw verifier lives in the cookie). */
    codeVerifierHash: text('code_verifier_hash').notNull(),
    /** 'login' | 'link' — link rows carry the authenticated user. */
    purpose: text('purpose').notNull(),
    /** Only for purpose='link' — whose account will gain the google method. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    /** Post-login internal path (validated ^/[A-Za-z0-9/_-]*$ — no open redirect). */
    redirectTo: text('redirect_to').notNull().default('/'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Single-use marker (set at consume; replay = reject). */
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (t) => [index('oauth_states_expires_idx').on(t.expiresAt)],
);

/* ------------------------------------------------------------ otp_codes */
/**
 * One-time codes for email (and the SMS infrastructure). The 6-digit code is
 * stored ONLY as a scrypt hash; max 5 verify attempts; 10-minute expiry;
 * single use. Rate limiting is a separate ledger (auth_rate_events).
 */
export const otpCodes = app.table(
  'otp_codes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    /** 'email' (real) | 'sms' (infrastructure — rows only after a real gateway exists). */
    channel: text('channel').notNull(),
    /** email lowercase / phone E.164. */
    destination: text('destination').notNull(),
    /** 'login' (start a session) | 'link' (attach method to the authenticated user). */
    purpose: text('purpose').notNull(),
    /** scrypt(N,r,p,salt,b64hash) of the 6-digit code — never the raw code. */
    codeHash: text('code_hash').notNull(),
    /** Only for purpose='link' — the account the verified email will attach to. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (t) => [index('otp_codes_destination_idx').on(t.destination, t.createdAt)],
);

/* ----------------------------------------------------- auth_rate_events */
/**
 * DB-backed rate-limit ledger (mission §۴ — brute force protection; works
 * across restarts and through PgBouncer, unlike in-memory buckets).
 * `bucket` names the throttle: 'login:fail:<lookupKey>', 'otp:send:<destination>',
 * 'otp:send:ip:<prefix>', 'auth:ip:<prefix>'. Swept with the OTP/expiry sweep.
 */
export const authRateEvents = app.table(
  'auth_rate_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    bucket: text('bucket').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('auth_rate_events_bucket_idx').on(t.bucket, t.createdAt)],
);

/* --------------------------------------- mnemonic_pending_registrations */
/**
 * The sealed phrase of an in-flight signup wizard (mission §۱-الف):
 * shown once, verified by random-position quiz, then destroyed. TTL 15
 * minutes. `phrase_sealed` = AES-256-GCM (iv.tag.ciphertext, b64) keyed from
 * HANASO_SESSION_SECRET via HKDF — the phrase at rest is unreadable even
 * with a DB copy; the salt + scrypt verifier are precomputed so the final
 * `verify` never needs to decrypt for the security decision (decrypt only
 * serves the quiz positions' expected words comparison).
 * Bound to the signup browser's guest learner id — another browser holding
 * the registration id cannot read or submit.
 */
export const mnemonicPendingRegistrations = app.table(
  'mnemonic_pending_registrations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    /** The guest cookie id of the signup browser (binding — not guessable). */
    guestLearnerId: text('guest_learner_id').notNull(),
    /** AES-256-GCM sealed 12-word phrase. */
    phraseSealed: text('phrase_sealed').notNull(),
    /** scrypt(N,r,p,salt,b64hash) — the possession verifier (precomputed). */
    phraseHash: text('phrase_hash').notNull(),
    /** HMAC lookup key (precomputed) — the O(1) login index value. */
    lookupKey: text('lookup_key').notNull(),
    /** The scrypt salt (b64) — needed to re-verify at login time. */
    salt: text('salt').notNull(),
    /** Quiz positions, 1..12 (jsonb array) — asked in THIS wizard only. */
    positions: jsonb('positions').$type<number[]>().notNull(),
    /** 'signup' (create account) | 'enroll' (attach to the logged-in user). */
    purpose: text('purpose').notNull().default('signup'),
    /** Only for purpose='enroll'. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (t) => [index('mnemonic_pending_expires_idx').on(t.expiresAt)],
);

/* --------------------------------------------------------- learner_merges */
/**
 * The guest→account migration ledger (mission §۳ — existing data must not be
 * lost or attached to the wrong account). When the browser that carried a
 * guest learner id signs up (or logs in), that guest's progress rows are
 * re-pointed at the account ONCE and recorded here — a later login on the
 * same browser never re-merges (double-merge guard) and the old id can never
 * be resurrected as someone else's.
 */
export const learnerMerges = app.table(
  'learner_merges',
  {
    /** The former guest cookie uuid (primary key — merged exactly once). */
    fromLearnerId: text('from_learner_id').primaryKey(),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mergedAt: timestamp('merged_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('learner_merges_to_user_idx').on(t.toUserId)],
);
