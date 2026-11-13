# TASK-HANASO-24 — AUTH & SESSION HARDENING (CP-02)

> Closes audit BUG-028 (identity cookie forgeable/stealable), BUG-039
> (mint-and-proceed row growth), and mission findings 3+5. Companion doc:
> IDOR_REMEDIATION.md (the ownership fix that consumes this identity).

## 1. Pre-24 architecture (the problem)

```
cookie: hanaso_lid = <raw uuid>   · samesite=lax · httpOnly:FALSE · Secure:FALSE
minted: by middleware on EVERY request lacking a valid cookie (incl. POST)
client: document.cookie can read AND overwrite it (identity.ts writeCookieId)
server: no issuance record, no signature — a known uuid IS the identity
```

Consequences (audit-confirmed): forged-cookie IDOR (anyone holding a victim's
uuid becomes the victim — the uuid rides plaintext HTTP, is JS-readable, lives
in logs/sync); every cookie-less POST mints a fresh identity and grows PG rows
unauthenticated (the in-code GUEST 401 guards were dead code over HTTP).

## 2. Post-24 architecture

```
cookie: hanaso_lid = <uuid>.<base64url(hMAC-sha256(HANASO_SESSION_SECRET, "hanaso_lid:v1:" + uuid))>
        · samesite=lax · httpOnly:TRUE · Secure:TRUE (https / X-Forwarded-Proto / production) · 365d
minted: ONLY by the middleware, ONLY on safe requests (GET/HEAD)
verify: constant-time, at every resolver seam (RSC + route handlers)
legacy: a pre-24 raw-uuid cookie is re-issued SIGNED with the SAME uuid
        (one-time transition — no re-keying, no orphaned progress rows)
guest:  absent/invalid/unsigned/wrongly-signed → 'guest' → 401 on writes,
        honest empty reads on RSC pages (product behavior preserved)
```

A client cannot invent a (uuid, signature) pair without the secret; cannot read
the cookie from JS (httpOnly); cannot receive it over plaintext HTTP in
production (Secure). The identity is now **server-issued and server-verified** —
a real session token, not "a random id in a cookie".

### Why a signed stateless token (and not a sessions table)

The product has no accounts, no logout, no privilege change; the token's only
job is "the server vouches this uuid is one it issued". A DB-backed session
table would add a per-request DB hop to every RSC render and a new table for
zero additional guarantee at this scale, and the edge middleware cannot reach
PG anyway. The signed token keeps the exact request-path performance, is
additive, and migrates cleanly into better-auth (M1: the authenticated user id
takes precedence; guest progress merges — documented in identity.ts).

### Files

| File | Change |
| --- | --- |
| `src/lib/learner/session.ts` (NEW) | Pure core: secret resolution (`HANASO_SESSION_SECRET` env; loud dev fallback with a production warn — the release gate refuses to ship without a real secret), token shape parse (`<uuid>.<43-char base64url>`), HMAC message domain `hanaso_lid:v1:`. |
| `src/lib/learner/session-node.ts` (NEW) | node:crypto twin — `signSessionTokenSync` / `verifySessionTokenSync` (constant-time). Used by resolvers + tests. |
| `src/lib/learner/session-web.ts` (NEW) | WebCrypto twin (edge runtime) — byte-identical signatures. Used by the middleware. |
| `src/lib/learner/server.ts` | Both resolvers verify the signature; anything else → GUEST. Re-exports the sign/verify helpers for tests. |
| `src/lib/learner/identity.ts` (client twin) | No longer reads/writes the cookie (server owns it). Keeps ONLY the localStorage id — used to namespace walk snapshots; never crosses the network. Existing users keep their localStorage uuid, so walk snapshots survive the upgrade. |
| `src/middleware.ts` | Signed mint on GET/HEAD only; legacy raw-uuid re-issue (same uuid, now signed); **state-changing requests without identity pass through UN-minted → the route guards' 401 is live over HTTP** (BUG-039 closed); flags httpOnly + lax + secure(https/xfp/production). |

### Session fixation / rotation / CSRF analysis (mission §2 requirements)

- **Fixation**: no login or privilege change exists; the token carries no
  authority beyond "issued by this server". The middleware never adopts a
  client-supplied token as-is (only the legacy one-time re-issue, which requires
  the pre-24 value and still ends with a server-chosen signature). Rotation is
  unnecessary while the token is unstructured; when better-auth lands (M1) it
  brings rotation with it.
- **CSRF**: every mutating route is a same-site `fetch` POST with
  `content-type: application/json`. `SameSite=Lax` keeps the cookie off
  cross-site subresource requests (a cross-site POST carries no identity →
  guest → 401), and a cross-site form cannot produce a JSON body the routes
  accept (they 400 `invalid_json`). `Strict` was rejected deliberately: it
  strips the cookie on top-level navigations from external links, and the
  middleware would mint those visitors FRESH identities — silently losing their
  progress (a self-inflicted data-loss bug). Lax + JSON is the correct posture
  here; re-evaluated when cookie-less state-changing routes ever appear.
- **Logout/Login cross-binding** (QA scenario 8): without accounts there is no
  logout; dropping the cookie (browser restart, clearing) simply mints a new
  per-browser identity — the old one's rows are untouched and invisible to the
  new one. Proven in CP-05.

### Transition residual risk (stated honestly — UPDATED after live QA S5 + subagent A)

The first QA run exposed the raw-uuid re-issue as a PERMANENT re-signing oracle
(any holder of a pre-24 raw value could get it re-signed forever). CLOSED:
`HANASO_LEGACY_TOKEN_CUTOFF` (an ISO datetime generated at deploy, recommended
deploy+14d) bounds the grace by wall clock; without the variable production is
FAIL-CLOSED (raw values are never re-signed). Within the grace, a pre-24
attacker who ALREADY stole a victim's raw uuid and races the victim's browser
can still obtain a valid signed token for it once — this window is 14 days by
recommendation, affects only identities compromised BEFORE the deploy, and new
theft is closed by httpOnly+Secure. With no known exfiltration channel (the
audit found no XSS in the learn path), accepted and recorded; the
RELEASE_CANDIDATE carries the cutoff in the deploy gate
(infra/deploy/update-hanaso.sh, env keys HANASO_SESSION_SECRET +
HANASO_LEGACY_TOKEN_CUTOFF are REQUIRED) and .env.example documents both.

## 3. In-flight session volatility (documented per mission §4)

`PgPracticeSessionRepository.inFlight` (answers/attempt state of an unfinished
practice) and `InMemoryEventStore` (analytics ring) remain process-heap state by
design — restart mid-practice 404s the session honestly, single-instance VPS
only. Replacing them with PG-backed stores is deferred to the next data mission
(no new event-sourcing/FSRS in this one, per the mission's explicit boundary).
The DB-written rows themselves (completed sessions, learning-object states,
station/chapter progress, attempts) are unaffected by restarts.

## 4. Verification status

- `tests/unit/middleware-learner-cookie.test.ts` — rewritten to the 24 contract
  (signed mint, httpOnly/lax flags, legacy re-issue with the SAME uuid, NO mint
  on POST, tampered-signature rejection, per-browser distinct ids). 8/8 green.
- `tests/unit/learner-identity.test.ts` — raw uuid → GUEST (both seams),
  wrong signature → GUEST, node/web crypto agreement. All green.
- Full suites: 63 files / 745 tests green (in-memory) + PG suite 29 green.
- Live browser proof (Secure flag on 127.0.0.1, Set-Cookie shape, JS cannot
  read the cookie, cross-site POST carries no identity): CP-05.
