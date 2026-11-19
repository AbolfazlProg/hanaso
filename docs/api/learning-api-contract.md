# Learning-Domain API Contract — HANASO

> قرارداد کامل APIهای حوزهٔ یادگیری (درس‌ها، پیشرفت، مرور، رویدادهای رفتاری، «پنل من»).
> Owner-pass 2026-11-19 — مأموریت «تکمیل APIهای بخش یادگیری». همهٔ پاسخ‌ها `Envelope<T>`
> (`docs/architecture/API-AND-EVENTS.md`)؛ همهٔ routeها `no-store`؛ خطاهای ۴۰۱/۴۰۰/۵۰۰ با
> `requestId` در بدنه و هدر `x-request-id`.

هویت زبان‌آموز: کوکی امضاشدهٔ `hanaso_lid` (middleware فقط GET/HEAD می‌سازد؛ POST بدون
کوکی → 401). مهمان (`guest`) روی همهٔ writeها رد می‌شود؛ READهای عمومی (dialogue bundle)
بدون هویت هم صادقانه خالی سرو می‌شوند.

---

## 1) موتور ایستگاه — `/api/curriculum/station` (موجود، بدون تغییر قرارداد)

| متد  | کاربرد                                                                                                                                                                         | خطاها                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| POST | `enter` / `progress` / `grade` / `grade-block` / `hint` / `writing-practice` / `complete` — zod discriminated union؛ نمره‌گذاری فقط سمت سرور؛ کلید پاسخ هرگز به کلاینت نمی‌رود | 400 validation · 401 guest · 404 unknown · 409 prerequisites_not_met/completion_not_met · 422 writing_char_not_in_station |
| GET  | `?chapter=&station=` — وضعیت ذخیره‌شده + `resumeExpired`                                                                                                                       | 404                                                                                                                       |

**تغییر رفتاری این pass:** در اکشن `complete`، کارت‌های FSRS ایستگاه (DD-095 §۲ — wave 1 در
پایان ایستگاه) اکنون **واقعاً** در `app.fsrs_cards` ثبت می‌شوند (idempotent — تکرارِ تکمیل
هرگز زمان‌بندی را reset نمی‌کند) و رویداد `fsrs_cards_enrolled` دیگر مارکر
`engine:'not-integrated'` ندارد؛ مارگر واقعی پورت را می‌نویسد + `enrolled_count`.

## 2) مرور FSRS — **جدید**

### `GET /api/review/queue` — private

- query: `?limit=` عدد صحیح ۱..۵۰ (پیش‌فرض ۲۰) — خطای خارج از بازه: 400 `review/invalid_limit`
- پاسخ ۲۰۰:

```json
{
  "ok": true,
  "data": {
    "engine": "FSRS-6",
    "status": "integrated",
    "dueCount": 3,
    "due": [
      {
        "itemId": "kn-rec-hira-a",
        "kind": "kn",
        "wave": 1,
        "dueAt": "2026-11-19T10:00:00.000Z",
        "contextLineId": "dlg-cafe-morning-01:l8"
      }
    ]
  }
}
```

- `dueCount` = کل کارت‌های سرِ وقت؛ `due` = صفحهٔ محدود به `limit`، قدیمی‌ترین due اول.
- صف خالی = حالت صادقانهٔ خالی (۰) — هرگز کارت ساختگی ساخته نمی‌شود.
- زمان‌ها ISO مطلق؛ گروه‌بندی نمایشی با مرز روز ۴ صبح Asia/Tehran بر عهدهٔ کلاینت است.

### `POST /api/review` — private، بستهٔ ≤۲۵

- body: `{ "reviews": [ { "itemId": string, "rating": "again"|"hard"|"good"|"easy", "clientReviewId": "<uuid>" } ] }`
- `clientReviewId` (uuidv7 سمت کلاینت) **کلید idempotency** است: تکرار همان ارسال →
  `duplicate` و هرگز دوباره اعمال نمی‌شود (unique index روی `app.fsrs_revlogs.client_review_id`).
- پاسخ ۲۰۰ با وضعیت per-item (یک آیتم بد، بسته را مسموم نمی‌کند):

```json
{
  "ok": true,
  "data": {
    "submitted": 2,
    "applied": 1,
    "duplicate": 1,
    "unknown_item": 0,
    "results": [
      { "itemId": "kn-rec-hira-a", "clientReviewId": "…", "outcome": "applied", "dueAfter": "…ISO…", "stateAfter": 2 }
    ]
  }
}
```

- `unknown_item` = کارت برای این زبان‌آموز ثبت نشده — پاسخ صادقانه، نه موفقیت جعلی.
- خطاها: 400 شکل/سقف بسته · 401 guest · 500 `review/submit_failed` (outage — کلاینت با همان
  `clientReviewId`ها امن retry می‌کند).
- هر تصمیم، رویداد سمت‌سرورِ `review_logged` هم تولید می‌کند (رویداد حیاتی فقط سمت سرور).
- ریاضیاتِ زمان‌بندی = ts-fsrs v6 (`FSRS-6`، fuzz خاموش) داخل `modules/fsrs` — در هیچ
  محتوایی زمان‌بندی وجود ندارد (قانون single-scheduler).

## 3) رویدادهای رفتاری (نظارت یادگیری) — `/api/events` (ارتقا)

### `POST /api/events` — private

- دو شکل پذیرفته می‌شود (additive-first):
  - **بسته (قرارداد):** `{ "events": [ { "name", "props", "occurredAt?" } ] }` — حداکثر ۲۵ آیتم → **202**
  - **تک‌رویداد (legacy، سازگاری کامل):** `{ "name", "props" }` → 201
- نام رویدادها: `object_action` snake_case از رجیستری منجمد
  (`modules/curriculum/event-names.ts` = رویدادهای سیستم درس + نام‌های legacy کلاینت).
- **قرنطینهٔ ADR-016:** نام ناشناخته **حذف نمی‌شود** — با `quarantined=true` ذخیره و در
  شمارندهٔ پاسخ دیده می‌شود (auditable، نه silent-drop). → 202 با `{received, accepted, quarantined}`.
- کران‌ها (ضد DoS — TASK-HANASO-24 حفظ می‌شود): props ≤۱۶ کلید / ≤۴KB؛ بسته ≤۲۵.
- ذخیره‌سازی **پایدار** در `app.learning_events` (append-only، user_id stamped، index
  روی (user, occurredAt) و (name, receivedAt)) — restart-proof؛ پنل مدیریت آینده از همین
  جدول تغذیه می‌شود.
- privacy: بدون متن آزاد/PII؛ مصرف‌کننده‌های تحلیلی موظف‌اند k≥10 تجمیع کنند.

### `GET /api/events` — private

- فقط رویدادهای خودِ زبان‌آموز (رفع IDOR همان TASK-HANASO-24، اکنون از جدول پایدار)،
  آخرین ۵۰، بدون `user_id` در props، ردیف‌های قرنطینه‌شده هم نمایش داده نمی‌شوند.

## 4) «پنل من» — **جدید**

### `GET /api/me/learning-summary` — private

- پاسخ ۲۰۰ (همهٔ شمارنده‌ها فقط از همین زبان‌آموز):

```json
{ "ok": true, "data": {
  "journey": { "chapterSlug": "kana-foundation-01", "chapterTitleFa": "…",
               "coreCompleted": 3, "corePathComplete": false,
               "nextStation": { "slug": "…", "titleFa": "…", "estMinutes": 6 } | null,
               "inProgress": { "slug": "…", "titleFa": "…", "estMinutes": 6, "lastActivityAtMs": 1732… } | null },
  "course": { "stationsCompletedTotal": 12, "understoodChapters": 1 },
  "review": { "engine": "FSRS-6", "status": "integrated", "dueCount": 3 },
  "weak": [ { "objectId": "kn-rec-hira-u", "labelFa": "う (u)" } ],   // حداکثر ۵ — فقط با evidence
  "practice": { "sessionsLast30d": 4, "firstTryRate": 0.72 },          // بدون evidence = null صادقانه
  "recentEvents": [ { "name": "exercise_answered", "at": "…ISO…" } ]   // آخرین ۱۰ — تایم‌لاین گیرکردن
} }
```

- همان resolverهایی که صفحهٔ خانه/نقشه می‌خوانند (`resolveLearnerJourney`) — بدون drift،
  بدون محاسبهٔ موازی. داشبورد RSC خانه نیز اکنون `dueCount` واقعی را می‌خواند.

## 5) نگهداشت (retention)

- job روزانهٔ worker `ops.events-retention` — ساعت ۰۴:۱۰ Asia/Tehran؛ ردیف‌های
  `app.learning_events` قدیمی‌تر از `HANASO_EVENTS_RETENTION_DAYS` (پیش‌فرض ۱۸۰،
  clamp ۷..۳۶۵۰) حذف می‌شوند. عدد نهایی سیاست با OQ-020/021؛ مکانیزم از امروز فعال است
  تا جدول روی سرور ۲۰GB بی‌کران رشد نکند.
- `fsrs_revlogs` retention ندارد (evidence آموزشی — append-only، مانند attempts).

## 6) تست‌ها

- unit (in-memory، سانباکس/CI بدون DB): `tests/unit/api/learning-api.spec.ts` —
  401 گوست، صف صادقانهٔ خالی، اعمال/تکرار/unknown، کران‌های بسته، قرنطینه، شکل خلاصهٔ پنل.
- integration-pg (PostgreSQL واقعی — job CI): `tests/integration-pg/review-events.spec.ts` —
  migration 0005، idempotency ثبت/ارسال، isolation کاربر، قرنطینه + retention sweep واقعی.
