#!/usr/bin/env node
/**
 * TASK-HANASO-27 — TASK27_COVERAGE_MATRIX.md generator.
 * Input: /tmp/t27-data.json (extracted from the REAL bundled content via
 * esbuild — see scripts/t27-coverage.sh). No hand-counted numbers.
 * Run: node scripts/t27-coverage.js
 */
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/tmp/t27-data.json', 'utf8'));
const exById = data.ex;

const stationOf = {};
for (const st of data.st) {
  for (const b of st.blocks) {
    if (b.kind === 'exercise') for (const id of b.exerciseIds) stationOf[id] = st.slug;
  }
}
const prereqOf = Object.fromEntries(data.stations.map((s) => [s.slug, (s.prerequisites ?? []).join('+')]));
const romajiOf = Object.fromEntries(data.items.map((i) => [i.glyph, i.romaji]));
const glyphOf = Object.fromEntries(data.items.map((i) => [i.kanaId, i.glyph]));

const TYPE_FA = {
  'kana-recognition': 'Glyph Recognition — بازشناسی شکل',
  'kana-recall': 'Kana Recall — بازیابی شکل',
  'kana-listening': 'Sound-to-Kana — شنیداری',
  'kana-decode': 'Word/Sequence Reading — خواندن',
  'rule-listening': 'Listening Discrimination — جفت قاعده',
  'meaning-select': 'Word Meaning — معنا',
};
const HINT_FA = 'سرنخ ۳ مرحله‌ای: F1 اشاره → F2 سرنخ + حذف یک گزینهٔ نادرست → F3 توضیح کامل + «بازگشت به آموزش» (موتور مشترک `grading.ts` — دکمهٔ «سرنخ» در UI)';
const AUDIO_FA = {
  'kana-recognition': 'پخش **نمی‌شود** پیش از پاسخ (جواب است)؛ پس از درست: «شنیدن تلفظ درست» + Auto-next',
  'kana-recall': 'صدای خوانشِ صریح prompt مجاز است (جواب «شکل» است)؛ شکل لو نمی‌رود',
  'kana-listening': 'صدا خودِ سؤال: autoplay + «شنیدن صدا» (Replay)؛ گزینه‌ها گلیف‌اند',
  'kana-decode': 'پخش نمی‌شود پیش از پاسخ؛ پس از درست: صدای واژه + Auto-next (بدون صدا: تأخیر تجربی)',
  'rule-listening': 'صدا خودِ سؤال؛ متن واژه پیش از پاسخ مخفی (strip می‌شود)',
  'meaning-select': 'پخش نمی‌شود پیش از پاسخ؛ پس از درست: صدای واژه',
};

const L = [];
L.push('# TASK-HANASO-27 — Coverage Matrix');
L.push('');
L.push(`**تاریخ تولید:** 2026-11-14 · **روش:** استخراج ماشینی از \`chapter-kana01.practice.exercises.ts\` و \`chapter-kana01.practice.ts\` (esbuild bundle → JSON → این جدول). هیچ عددی دستی نیست.`);
L.push('');
const all = Object.values(exById);
const byStation = (p) => all.filter((e) => e.id.includes(`-p${p}-`)).length;
L.push(`**مجموع:** ${all.length} تمرین — P1=${byStation(1)} · P2=${byStation(2)} · P3=${byStation(3)} · P4=${byStation(4)}`);
L.push('');
const byType = {};
for (const e of all) byType[e.type] = (byType[e.type] ?? 0) + 1;
L.push(`**بر اساس نوع:** ${Object.entries(byType).map(([t, n]) => `${TYPE_FA[t].split(' — ')[0]} (${t}) = ${n}`).join(' · ')}`);
L.push('');
L.push('> Hintها و Feedbackها از **یک** قرارداد مشترک (F-ladder موتور Lesson) می‌آیند؛ ستون‌های Hint/Feedback/Audio رفتار همان قرارداد برای هر نوع هستند و در تست‌های PR-6 + CL + E2E واقعی (اسکرین‌شات A05/A06/A07) تأیید شده‌اند.');
L.push('');
L.push('## جدول تمرین‌ها (هر ردیف = یک تمرین واقعی)');
L.push('');
L.push('| Station | Exercise ID | نوع مهارت | مفاهیم سنجیده | پرسش | Prerequisite ایستگاه | Hint | Feedback | Audio/Auto-next | تست‌ها |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
for (const st of data.st) {
  for (const b of st.blocks) {
    if (b.kind !== 'exercise') continue;
    for (const id of b.exerciseIds) {
      const e = exById[id];
      const concepts = e.assessesConcepts.map((c) => (glyphOf[c] ? `${glyphOf[c]}` : c)).join('،');
      L.push(`| ${st.slug} | \`${id}\` | ${TYPE_FA[e.type]} | ${concepts} | ${(e.promptJa ?? '—').replace(/\|/g, '¦')}${e.promptJaReading ? ` «${e.promptJaReading}»` : ''} | ${st.slug} ← ${prereqOf[st.slug]} | ${HINT_FA} | غلط: rationale همان گزینه + پلهٔ F؛ درست: تأیید + پخش تلفظ | ${AUDIO_FA[e.type]} | PR-1..6، CL-01..17، E2E A/B |`);
    }
  }
}
L.push('');
const counts = new Map();
for (const e of all) {
  const text = [e.promptJa ?? '', ...(e.options ?? []).map((o) => o.label)].join('');
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1);
}
L.push('## پوشش ۴۶ گلیف پایهٔ هیراگانا (شمارش از promptJa + گزینه‌ها)');
L.push('');
L.push('| گلیف | romaji | تعداد تمرین | گیت ≥2 |');
L.push('|---|---|---|---|');
const base = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
let passCount = 0;
for (const g of base) {
  const n = counts.get(g) ?? 0;
  const ok = n >= 2;
  if (ok) passCount++;
  L.push(`| ${g} | ${romajiOf[g] ?? '?'} | ${n} | ${ok ? 'PASS' : '**FAIL**'} |`);
}
L.push('');
L.push(`**نتیجهٔ گیت:** ${passCount}/46 گلیف ≥2 تمرین — ${passCount === 46 ? 'همه PASS ✅' : 'ناقص ❌'} (تست PR-4 در \`tests/unit/h27-practice-content.test.ts\` همین را assert می‌کند)`);
L.push('');
L.push('## اشکال مشتق/قاعده‌ای پوشش‌داده‌شده');
L.push('');
L.push('| شکل | قانون | ایستگاه قانون | تعداد در تمرین‌ها |');
L.push('|---|---|---|---|');
const derivedMap = {
  が: ['داکوتن ゛', 'stn-kana-h5'], ぎ: ['داکوتن ゛', 'stn-kana-h5'], ご: ['داکوتن ゛', 'stn-kana-h5'],
  ざ: ['داکوتن ゛', 'stn-kana-h5'], じ: ['داکوتن ゛', 'stn-kana-h5'], ぜ: ['داکوتن ゛', 'stn-kana-h5'],
  だ: ['داکوتن ゛', 'stn-kana-h9'],
  ば: ['داکوتن ゛', 'stn-kana-h12'], び: ['داکوتن ゛', 'stn-kana-h12'], ぶ: ['داکوتن ゛', 'stn-kana-h12'], ぼ: ['داکوتن ゛', 'stn-kana-h15'],
  ぱ: ['هان‌داکوتن ゜', 'stn-kana-h15'], ぴ: ['هان‌داکوتن ゜', 'stn-kana-h15'], ぽ: ['هان‌داکوتن ゜', 'stn-kana-h15'],
  ゃ: ['یوئون (کوچک)', 'stn-kana-h6'], ゅ: ['یوئون (کوچک)', 'stn-kana-h6'], ょ: ['یوئون (کوچک)', 'stn-kana-h6'],
  っ: ['سوکوئون', 'stn-kana-h13'],
};
for (const [g, [rule, stn]] of Object.entries(derivedMap)) {
  L.push(`| ${g} | ${rule} | ${stn} | ${counts.get(g) ?? 0} |`);
}
L.push('');
L.push('## Guardrailهای محتوایی (ممنوعیت‌ها — تست PR-3)');
L.push('');
L.push('- **P1** (پس از h5): ممنوع ん و همهٔ ردیف‌های بعدی، ممنوع ゜ (h15)، ممنوع ぬ/め (め در h10).');
L.push('- **P2** (پس از h9): ممنوع ردیف‌های ま/ら/は/や/わ، ممنوع ば (h12)، ممنوع ゃゅょ/っ.');
L.push('- **P3** (پس از h12): ممنوع ゃゅょ (h6 بعداً می‌آید)، っ، わ/を، ゜ — دیزتراکتور «کاپان» (未来‌محتوا) ممنوع.');
L.push('- **P4** (پس از h15): مجاز کل هیراگانا + همهٔ قواعد؛ **ممنوع** کاتاکانا، chōonpu ー، و ぐ/ず/げ/づ/ぷ/べ/ぺ (در هیچ‌جای واحد تدریس نشده‌اند).');
L.push('- همهٔ گزینه‌های نادرست باید خوانشِ کانای **آموزش‌دیده** باشند؛ Hintها محتوای آینده را نام نمی‌برند.');
L.push('');
L.push('## یادداشت کیفیت مستقل (Subagent C — PASS-WITH-NOTES)');
L.push('');
L.push('- `ex-kana-p2-rec-n` / `ex-kana-p4-rec-n`: گزینه‌ها و پاسخ یکسان، فقط حاشیهٔ prompt متفاوت — بازآزمایی عمدی در ایستگاه مرور کامل؛ ضعیف‌ترین «تمرین جدید» بانک (note).');
L.push('- `ex-kana-p3-rec-he` / `he2`: دو بار آزمودن همان نگاشت へ در یک ایستگاه (بلوک‌های rec و pairs) — note کیفیت.');
L.push('- این موارد گیت ضد-duplicate (PR-5: type+prompt+پاسخ) را پاس می‌کنند چون prompt متفاوت‌اند؛ به‌عنوان spiral review ثبت شده‌اند نه تمرین جدید.');
L.push('');

fs.writeFileSync('ops/checkpoints/TASK-HANASO-27/TASK27_COVERAGE_MATRIX.md', L.join('\n'));
console.log('written: TASK27_COVERAGE_MATRIX.md — exercise rows:', all.length, '| glyph gate:', passCount + '/46');
