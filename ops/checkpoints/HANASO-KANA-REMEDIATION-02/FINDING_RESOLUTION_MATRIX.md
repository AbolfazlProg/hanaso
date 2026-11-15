# HANASO-KANA-REMEDIATION-02 — FINDING RESOLUTION MATRIX

> نگاشت یک‌به‌یک یافته‌های ممیزی (HANASO-KANA-AUDIT-01، FINDINGS_REGISTER با ۱۵ شناسه) به رفع‌های این شاخه.
> شاخه: `fix/HANASO-KANA-CONTENT-REMEDIATION-02` — کامیت‌ها: `f116578` (CP-0) → `13342ab` (RP-04) → `23bd689` (CP-1) → `1f4413e` (CP-2) → `a3dcb88` (CP-3).

| شناسه ممیزی | شدت | یافته | رفع (کامیت) | وضعیت |
|---|---|---|---|---|
| **AUD-001** | High | ۳ تمرین چندپاسخگی (گزینهٔ هم‌تلفظ با پاسخ): `h4-asm-1`، `k8-asm-1`، `gate-m3-4` | گزینهٔ هم‌تلفظ با خطای تلفظی واقعی جایگزین شد: «اسا»→«اُسا» (جابه‌جایی あ/お)، «کِیکِی»→«گِیکی» (خطای داکوتن)، «نِکو»→«مِکو» (خلط ね/め) + بازنویسی rationale (CP-1). گارد تک‌پاسخگی ۷ نمونهٔ پنهان دیگر را هم کشید و همه رفع شدند: gate-m3-2، p2-dec-sono، p3-dec-hon، p3-dec-mizu، p3-dec-kuruma، h13-asm-1 (CP-1+CP-2) | ✅ RESOLVED + Guard |
| **AUD-002** | High | تصادم خوانش きょう/きゅう = «کیوو» | きゅう → «کیُوو» در `h6-asm-1` (reading/گزینه/F2/F3) + rationale تمرین `p4-rl-kyou` اصلاح + rule-step h6 حالا تمایز きょ/きゅ را صریح تدریس می‌کند (CP-1). گارد یکتایی نگاشت ژاپنی↔فارسی (CP-2) | ✅ RESOLVED + Guard |
| **AUD-003** | Medium | hint افشاگر پاسخ ×۳: `kf-dec-1`، `k8-asm-1`، `gate-m3-2` | hint «فایل»/«کیک»/«توکیو» از پرامپت حذف شد (پرامپت خالی؛ خوانش کانا باید پاسخ را حمل کند) (CP-1). گارد «hint ⊄ پاسخ» (CP-2) | ✅ RESOLVED + Guard |
| **AUD-004** | Medium | ناهماهنگی نگارش خوانش: ねコ/コーヒー | ねこ → «نِکو» یکدست (gate-m3-4 + p3-dec-neko از قبل)؛ コーヒー → «کووهیی» یکدست در k8-dec-1، k8-lis-1، بلوک‌های تدریس stations.ts (۳ مورد readingFa + reveal + یادداشت مثال — ۴ مورد باقی‌مانده توسط CL خود پروژه TL-14 گرفته و رفع شد) (CP-1+CP-2). گردهای سازگاری درون‌واژه‌ای | ✅ RESOLVED + Guard |
| **AUD-005** | Medium | `kanaWordRomaji` خروجی مختلط کانا/لاتین (がっこう→がっkou) | بازنویسی کامل موتور ترکیب: جدول NFC داکوتن/هان‌داکوتن + تجزیهٔ NFD، ادغام yōon با استثناهای Hepburn (shi→sha/chi→cho/ji→ju)، ァ/ィ کوچک وام‌واژه‌ها (ファ→fa، デ+ィ→di)، geminate طبق Hepburn (sh→s، ch→t، ts→t)، ん→m قبل از labial، حفظ رفتار ー و non-kana (13342ab). ۳۳ کیس تست جدول‌محور + جاروی «بدون خروجی مختلط» روی همهٔ واژه‌های فصل و hostwordها (>۷۰ واژه) | ✅ RESOLVED + Guard |
| **AUD-006** | Medium | نشت شکل (پاسخ = یکتا-بلندترین) | distractor هم‌طولِ خطای واقعی به موارد unique-longest/shadda افزوده شد: h4-dec-1 «گووکوو»، h4-dec-4 «اووزاکا»، p4-dec-gakkou «کَکّوو» (CP-1) + h5-dec-1 «گاکوسِیی»، gate-m3-3 «راامِه»، h7-nas-1 «سام»، h7-asm-1 «زانسوو» (CP-3). نسبت ۸.۸٪ → **۱.۵٪** (۱ مورد دفاع‌پذیر: いいえ با خطاهای معنایی حذف). گارد آماری «نسبت < ۱۰٪» | ✅ RESOLVED + Guard |
| **AUD-007** | Medium | UI: قفل سمت راست (out of scope — Mission 3) | — | ⏭ DEFERRED (Mission 3) |
| **AUD-008** | Medium | UI: toast قفل زیر fold در موبایل (Mission 3) | — | ⏭ DEFERRED (Mission 3) |
| **AUD-009** | Medium | UI: متن ژاپنی inline ۱۶px (Mission 3) | — | ⏭ DEFERRED (Mission 3) |
| **AUD-010** | Low | ۳ گیت بایت‌به‌بایت تکراری با walk (m1-1، m2-1، m2-2) | گزینه‌ها و rationale بازنویسی شد با مجموعهٔ distractor متفاوت هم‌ارز مفهومی (m1-1: こ با て/お؛ m2-1: え با き/せ؛ m2-2: へ با ほ/ぬ) (CP-1). گارد «گیت ≠ walk» (CP-2) | ✅ RESOLVED + Guard |
| **AUD-011** | Low | ん قبل از labial — ناهمگنی (سامپو/اِمپیتسو در برابر شینبون/کُنپیووتاا) + NEEDS_NATIVE_REVIEW | **تحقیق تکمیل شد** (بدون حدس): آلوفون [m] قبل از /p,b,m/ مسلم است (Wikipedia «Japanese phonology» §Moraic nasal؛ sanmai→[sammai]) و رسم‌الخط Hepburn هم m می‌نویسد (sampo/shimbun). قرارداد تلفظیِ خود دادهٔ HANASO (さんぽ→«سامپو»، えんぴつ→«اِمپیتسو») مبنا شد: しんぶん→«شیمبون»، コンピューター→«کُمپیووتاا» با آموزش قاعده در F1/F3 (CP-1+CP-3). سند قرارداد §۲ منبع‌دار شد | ✅ RESOLVED (research-backed) + Guard |
| **AUD-012** | Low | ۸ گلیف بدون hostWord | علت عمدی مستند شد در ۷ حاشیهٔ درون‌رجیستری (ヌ/ヘ/ム/モ/ヤ/ユ کاتاکانا + を): K-glyphها به‌عنوان همتای خطی hostwordهای هیراگانا تدریس می‌شوند؛ を فقط ذره است؛ قید TTS-manifest ثبت شد. افزودن hostWord بدون asset صوتی تست audio-a3 را می‌شکند — انتخاب آگاهانه (CP-3) | ✅ RESOLVED (documented choice) |
| **AUD-013** | Low | ヲ بدون romajiNoteFa (نقص parity با を) | romajiNoteFa ذره‌ای به ヲ افزوده شد (CP-1) | ✅ RESOLVED |
| **AUD-014** | NOT_A_BUG | ۵۹ گزینهٔ هم‌صدای عمدی (سنجش تشخیص خط) | دست نخورد؛ invariant «پرامپت باید خط را نام ببرد» گارد شد. جارو فقط ۱ مورد واقعی بدون نام خط پیدا کرد: gate-m5-2 → پرامپت اصلاح شد (CP-3) | ✅ VERIFIED + Guard |
| **AUD-015** | NEEDS_CONTEXT | آیتم نیازمند زمینهٔ محصول | خارج از دامنهٔ محتوایی این مأموریت — به Backlog مالک | ⏭ DEFERRED |

## خلاصه

- **Resolved:** ۱۲ یافته (هر ۲ High + ۴ Medium محتوایی + ۴ Low + NOT_A_BUG تاییدشده + NEEDS_NATIVE_REVIEW تعیین‌تکلیف‌شده با منبع)
- **Deferred (خارج از دامنه/عمدی):** ۳ یافتهٔ UI (Mission 3) + ۱ NEEDS_CONTEXT
- **گاردهای رگرسیون دائمی:** ۷ گارد (تک‌پاسخگی، یکتایی خوانش، سازگاری درون‌واژه‌ای، hint، گیت≠walk، آماری شکل، نام‌بردن خط) — همه سبز
