# API & Event Strategy — HANASO

> **خلاصهٔ فارسی:** بدون tRPC/GraphQL؛ Server Action برای فرم‌ها + سطح REST بسیار کوچک و ثابت. همهٔ پاسخ‌ها پوشش `Envelope<T>` واحد. رویدادهای تحلیلی فقط از `events.yaml` (قرارداد CI) و رویدادهای حیاتی فقط سمت-سرور. مرجع: KB `backend-architecture.md` + `analytics-event-taxonomy.md`.

## REST surface (fixed — anything else is a Server Action)

| Endpoint                                              | Auth                | Purpose                                                            |
| ----------------------------------------------------- | ------------------- | ------------------------------------------------------------------ |
| `GET /api/health`                                     | public              | Liveness + build info (version, SHA)                               |
| `GET /api/ready`                                      | public              | Readiness (dependencies; DB check from M0-10)                      |
| `/api/auth/[...all]`                                  | public              | better-auth routes                                                 |
| `GET /api/review/queue` · `POST /api/review`          | private             | FSRS queue + idempotent submit (`clientReviewId` uuidv7) — OTD-001 |
| `GET /api/search?q=`                                  | private             | Short-cache search                                                 |
| `GET /api/export/:jobId`                              | private             | Data export download                                               |
| `POST /api/events`                                    | private             | Analytics batch ≤25                                                |
| `POST /api/admin/content/*`                           | owner-gated         | Admin ops (ADR-017)                                                |
| `POST /api/internal/revalidate` · `/api/internal/rum` | service token / own | Worker-only cache invalidation · web-vitals ingestion              |

## Error envelope (single contract)

```ts
type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: `${Module}/${cause}`; message: string; details?: unknown; requestId?: string } };
```

Codes like `validation/invalid_input`, `auth/forbidden`, `review/duplicate_review`, `unknown/internal` (only this one goes to Sentry). HTTP mapping 400/401/403/404/409/500. zod `safeParse` at every boundary; keyset pagination (`cursor = base64(createdAtISO|id)`, limit ≤ 50). Seeded implementation: `apps/web/src/modules/shared`.

## Versioning & compatibility

Additive-first: new optional fields allowed; breaking change = new endpoint/version + deprecation window (≥ 1 release) recorded in an ADR. Event names are **immutable** — change = new name + `plan_version` bump (ADR-016).

## Event taxonomy (summary)

- Single source: `events.yaml` (registered in CI from M1 "Analytics v0"; unknown event ⇒ quarantine + 202).
- Naming `object_verb` past tense; flat typed properties; **critical events (exercise/gate/review/auth results) server-side only**.
- Privacy: `user_pseudo_id` = HMAC-SHA256(user_id, secret); PII blacklist (free text, emails, note contents, search strings) enforced in CI; aggregation k≥10.
