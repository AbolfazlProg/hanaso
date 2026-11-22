/**
 * HANASO — EQA-8: the course-wide prerequisite gate (ENGINE-REFORM 2026-11-22).
 *
 * «هیچ سطح محتوایی — متن آموزش، مثال، صورت سؤال، گزینه (حتی گزینهٔ انحرافی)،
 * راهنما، بازخورد یا تمرین — نمی‌تواند مطلبی را پیش‌فرض بگیرد که پیش از آن
 * نقطه از مسیر واقعی یادگیری تدریس نشده باشد.»
 *
 * The gate walks every chapter's station decks IN ORDER against the Knowledge
 * Reference Registry (the derived single source of truth), folding each
 * station's own teaching block-by-block as it is walked, and checks EVERY
 * Japanese surface the learner reads (surfaces.ts — the exhaustive inventory):
 *
 *  R1 glyph-untaught (error) — a surface's base glyphs must be taught at-or-before
 *      its deck position (prerequisite-chapter chain included; the station's own
 *      cards fold in deck order — «محتوای تازهٔ ایستگاه فقط پس از مرحلهٔ آموزشِ
 *      همان ایستگاه مجاز به استفاده است»).
 *  R2 mark-untaught (error) — a rule mark (゛゜ゃっーファ…) may appear only after
 *      its rule unit has been walked (chain inheritance honored).
 *  R3 word-untaught (error) — a REGISTERED word (term/reading) inside surrounding
 *      text (options, distractors, chunks, examples, boards, scenes, feedback)
 *      must be taught at-or-before. The exercise's own promptJa (the vessel whose
 *      meaning is given in the prompt) and its declared target concepts are
 *      exempt here — they are governed by R5, not by the surrounding-text rule.
 *  R4 kanji-unregistered (error/warning) — kanji in an ASSESS surface must belong
 *      to a registered word taught at-or-before (unknown content = traceable
 *      error — «موارد ناشناخته بی‌صدا پذیرفته نمی‌شوند»). Kanji in receptive
 *      material carrying an authored gloss (bilingual real-world boards) is a
 *      WARNING (the gloss is the support — visible in every report, EQA-9 review).
 *  R5 assess-before-teach (error) — an exercise's targetConcept/assessesConcepts
 *      must be TAUGHT at an earlier deck position (card before quiz — inside the
 *      same station too, by block order) or an earlier station/chapter.
 *
 * Documented boundary: the ANCHOR dialogue (three-origin rule) is the learner's
 * first ENCOUNTER with target items — an exposure, not teaching (mission §۳).
 * Dialogue-player/scene surfaces are therefore exempt here and recorded as
 * exposureAt in the registry; their comprehension questions are gist-timed by
 * EQA-1 (layer 2), which stays in force unchanged.
 */
import type { Chapter } from '../types';
import type { EqaFinding } from '../eqa/policy';
import type { KnowledgeRegistry } from './types';
import { decomposeJa } from '../glyph-budget';
import { KANA_ITEMS } from '../content/kana-items';
import { stationsInWalkOrder } from '../eqa/model';
import { collectChapterSurfaces } from './surfaces';
import { wordsInSurface } from './registry';

const KANA_ID_BY_GLYPH = new Map(KANA_ITEMS.map((k) => [k.glyph, k.kanaId] as const));
const KANJI_RE = /[\u4e00-\u9fff]/;

/* ------------------------------------------------------------------ helpers */

/** mark availability: the global walk position of each mark's rule unit. */
function markTaughtOrder(registry: KnowledgeRegistry, mark: string): number | null {
  const entry = registry.byId.get(`mark-${mark}`);
  return entry ? entry.firstTaught.globalIndex : null;
}

/* ------------------------------------------------------------------ the gate */

export function gateEqa8(chapter: Chapter, registry: KnowledgeRegistry): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const surfaces = collectChapterSurfaces(chapter);
  const push = (finding: EqaFinding) => findings.push(finding);

  /** one finding per (rule, station) — message carries the concrete surfaces. */
  const reported = new Map<string, { finding: EqaFinding; examples: string[] }>();
  const report = (
    rule: string,
    stationSlug: string,
    severity: 'error' | 'warning',
    messageFa: string,
    ruleRef: string,
    example: string,
  ) => {
    const key = `${rule}:${stationSlug}:${severity}`;
    let slot = reported.get(key);
    if (!slot) {
      slot = {
        finding: {
          gate: 'EQA-8',
          severity,
          subject: stationSlug,
          rule,
          messageFa: '',
          ruleRef,
        },
        examples: [],
      };
      reported.set(key, slot);
    }
    if (slot.examples.length < 6) slot.examples.push(example);
    slot.finding.messageFa = `${messageFa} — نمونه‌ها: ${slot.examples.join('؛ ')}`;
    return slot;
  };

  const ordered = stationsInWalkOrder(chapter);

  for (const station of ordered) {
    const knownBefore = registry.cumulativeBeforeStation.get(`${chapter.slug}/${station.slug}`) ?? new Set<string>();
    /* deck-fold events: ids whose DEFINING home is this station, at block positions. */
    const folds = new Map<number, Set<string>>();
    for (const entry of registry.entries) {
      const t = entry.firstTaught;
      if (t.chapterSlug !== chapter.slug || t.stationSlug !== station.slug) continue;
      const idx = t.blockId ? station.blocks.findIndex((b) => b.id === t.blockId) : 0;
      const set = folds.get(idx >= 0 ? idx : 0) ?? new Set<string>();
      set.add(entry.id);
      folds.set(idx >= 0 ? idx : 0, set);
    }

    const stationSurfaces = surfaces.filter((s) => s.stationSlug === station.slug);

    const knownAtBlock = (blockIndex: number, inclusive: boolean): Set<string> => {
      const set = new Set(knownBefore);
      for (const [idx, ids] of folds)
        if (inclusive ? idx <= blockIndex : idx < blockIndex) for (const id of ids) set.add(id);
      return set;
    };

    for (const s of stationSurfaces) {
      /* Exposure surfaces (the anchor scene framing / dialogue-adjacent copy)
       * are the three-origin FIRST ENCOUNTER — exempt by design (mission §۳);
       * their comprehension questions are gist-timed by EQA-1 layer 2. */
      if (s.role === 'exposure') continue;

      /* A TEACH surface's own glyphs are taught BY itself (the fold at its own
       * block is inclusive); a USE/ASSESS surface must only use what was taught
       * STRICTLY before it — the deck-order contract. */
      const known = knownAtBlock(s.blockIndex, s.role === 'teach');
      if (s.role === 'teach' && s.field === 'prereq-glyph') continue; // reactivation of prior glyphs by design

      /* R1/R2 — glyphs and rule marks. */
      const req = decomposeJa(s.text);
      const unknownGlyphs = req.base.filter((g) => {
        const id = KANA_ID_BY_GLYPH.get(g);
        return id !== undefined && !known.has(id);
      });
      if (unknownGlyphs.length > 0) {
        report(
          'glyph-untaught',
          station.slug,
          'error',
          `ایستگاه ${station.slug} در سطح «${s.field}» از کانا/نشانه‌هایی استفاده می‌کند که پیش از این نقطه تدریس نشده‌اند (${unknownGlyphs.join('')}) — پیش‌نیاز گلیفی نقض شده (رجیستری دانش).`,
          'ENGINE-REFORM §۳ R1 · Knowledge Registry',
          `${s.field}: ${s.text.slice(0, 24)}`,
        );
      }
      const earlyMarks = req.marks.filter((m) => {
        const at = markTaughtOrder(registry, m);
        if (at === null) return true; // never taught anywhere in the course
        const myGlobal = station.order + 10000 * (registry.course.indexOf(chapter.slug) + 1);
        return at > myGlobal;
      });
      if (earlyMarks.length > 0) {
        report(
          'mark-untaught',
          station.slug,
          'error',
          `ایستگاه ${station.slug} در سطح «${s.field}» از قواعد نگارشی (${earlyMarks.join('، ')}) پیش از ایستگاه تدریس‌کنندهٔ آن‌ها استفاده می‌کند — قاعده هنوز تدریس نشده (رجیستری دانش).`,
          'ENGINE-REFORM §۳ R2 · Knowledge Registry',
          `${s.field}: ${s.text.slice(0, 24)}`,
        );
      }

      /* R3 — registered words inside COMPREHENSION-bearing text. The honest
       * task-semantics boundary (documented, calibrated):
       *  - comprehension surfaces: example sentences (non-reading), unglossed
       *    boards, character-scene production steps/chips, cloze tokens, and the
       *    answer material (chunks/chips) — the learner must UNDERSTAND these,
       *    so every registered word in them must be taught at-or-before.
       *  - exempt: the exercise's own promptJa (the vessel — its meaning is
       *    given in the prompt), the exercise's declared target (R5 governs),
       *    self-supporting surfaces (reading-moment examples / glossed boards —
       *    meaning provided inline), options of surface/glyph/meaning-matching
       *    tasks (match-in-line, kana kinds, meaning/audio kinds — the task is
       *    form-matching, not word comprehension), and post-answer feedback/
       *    rationale copy (the F-ladder's reveal is a teaching moment — the
       *    #139 redaction engine governs its key-leaking instead).
       *  - board items are DECODE VESSELS (reading material — glyph knowledge
       *    suffices; the meaning rides with the exercise prompt on unglossed
       *    boards or the authored gloss on bilingual ones). */
      const comprehensionOptionTypes = new Set([
        'cloze',
        'response-select',
        'gist-select',
        'produce-template',
        'word-order',
        'dialogue-order',
      ]);
      const r3Applies =
        (s.role === 'use' &&
          !s.selfSupporting &&
          !s.field.startsWith('board-') &&
          !s.field.startsWith('wrapup-') &&
          !s.field.startsWith('scene-')) ||
        (s.role === 'assess' &&
          !s.isPromptVessel &&
          !s.field.startsWith('feedback-') &&
          !s.field.startsWith('rationale-') &&
          !s.field.startsWith('prompt') &&
          !s.field.startsWith('board-') &&
          !s.field.startsWith('wrapup-') &&
          (s.field.startsWith('cloze') ||
            s.field.startsWith('chunk-') ||
            s.field.startsWith('chip-') ||
            s.field.startsWith('scene-') ||
            s.field.startsWith('si-opt-') ||
            s.field.startsWith('gd-opt-') ||
            (s.field.startsWith('opt-') && comprehensionOptionTypes.has(s.exerciseType ?? ''))));
      if (r3Applies) {
        const declared = new Set(s.declaredConcepts ?? []);
        for (const match of wordsInSurface(registry, s.text)) {
          if (declared.has(match.entry.id)) continue; // the exercise's own target (R5 governs it)
          if (known.has(match.entry.id)) continue;
          report(
            'word-untaught',
            station.slug,
            'error',
            `ایستگاه ${station.slug} در سطح «${s.field}» واژهٔ «${match.entry.surface}» (${match.entry.reading ?? ''} — ${match.entry.meaningFa ?? ''}) را پیش‌فرض می‌گیرد، در حالی که اولین تدریس آن ${match.entry.firstTaught.chapterSlug}/${match.entry.firstTaught.stationSlug} است — استفادهٔ زودهنگام از واژهٔ آموزش‌نداده‌شده.`,
            'ENGINE-REFORM §۳ R3 · Knowledge Registry',
            `${s.field}: ${s.text.slice(0, 24)}`,
          );
        }
      }

      /* R4 — kanji coverage (unknown content = traceable error, never silent). */
      if ((s.role === 'use' || s.role === 'assess') && KANJI_RE.test(s.text)) {
        const covered = new Set<number>();
        for (const match of wordsInSurface(registry, s.text)) {
          if (!known.has(match.entry.id)) continue; // unknown words already flagged by R3
          for (let i = match.start; i < match.start + match.length; i++) covered.add(i);
        }
        for (let i = 0; i < s.text.length; i++) {
          if (!KANJI_RE.test(s.text[i] ?? '')) continue;
          if (covered.has(i)) continue;
          const selfSupporting = Boolean(s.selfSupporting);
          report(
            'kanji-unregistered',
            station.slug,
            s.role === 'assess' ? 'error' : selfSupporting ? 'warning' : 'error',
            s.role === 'assess' || !selfSupporting
              ? `ایستگاه ${station.slug} در سطح «${s.field}» نویسهٔ کانجی «${s.text[i]}» را بدون هرگونه ثبت در رجیستری دانش استفاده می‌کند — محتوای ناشناخته باید خطای قابل‌پیگیری بدهد، نه بی‌صدا پذیرفته شود.`
              : `ایستگاه ${station.slug} در سطح «${s.field}» نویسهٔ کانجی «${s.text[i]}» را در متریال دریافتِ خود-پشتیبان (گلاوس/لحظهٔ خواندن) استفاده می‌کند — ثبت‌نشده در رجیستری؛ بازبینی انسانی (EQA-9).`,
            'ENGINE-REFORM §۳ R4 · Knowledge Registry',
            `${s.field}: ${s.text.slice(0, 24)}`,
          );
          break; // one representative kanji per surface (dedupe per station+rule)
        }
      }

      /* R5 — assess-before-teach (deck order, course-wide). */
      if (s.role === 'assess' && s.exerciseId) {
        for (const concept of s.declaredConcepts ?? []) {
          const taught = registry.taughtAt.get(concept);
          if (!taught) continue; // unregistered concepts are EQA-1's warning layer
          const sameStation = taught.chapterSlug === chapter.slug && taught.stationSlug === station.slug;
          let ok: boolean;
          if (!sameStation) {
            const myGlobal = station.order + 10000 * (registry.course.indexOf(chapter.slug) + 1);
            ok = taught.globalIndex < myGlobal;
          } else {
            const taughtIdx = taught.blockId ? station.blocks.findIndex((b) => b.id === taught.blockId) : 0;
            ok = (taughtIdx >= 0 ? taughtIdx : 0) < s.blockIndex;
          }
          if (!ok) {
            report(
              'assess-before-teach',
              station.slug,
              'error',
              `تمرین ${s.exerciseId} (سطح «${s.field}») مفهوم «${concept}» را می‌سنجد، اما تدریسِ آن در ${taught.chapterSlug}/${taught.stationSlug}${taught.blockId ? ` (بلوک ${taught.blockId})` : ''} است — سنجش پیش از تدریس، حتی درون همان ایستگاه (ترتیب بلوک).`,
              'ENGINE-REFORM §۳ R5 · Knowledge Registry',
              `${s.exerciseId}: ${concept}`,
            );
          }
        }
      }
    }

    /* R5b + R6 — GRADED NON-EXERCISE blocks (ENGINE-REFORM §۴, owner order
     * 2026-11-22 «آزمون قبل از آموزش»): guided-discovery / structured-input /
     * dialogue-player prediction are GRADED questions. The engine enforces the
     * SAME mandatory order on them as on exercises —
     *  R6  a graded block MUST declare assessesConcepts (an unlabeled graded
     *      question is invisible to the teach-order gate — that invisibility
     *      was the root cause of «آزمون قبل از آموزش»);
     *  R5b every declared concept must be TAUGHT strictly before the block
     *      (deck order inside the station, station/chapter order otherwise) —
     *      an induction quiz before its rule teaching is a build failure. */
    station.blocks.forEach((block, blockIndex) => {
      let concepts: string[] | undefined;
      let blockKindFa: string;
      if (block.kind === 'guided-discovery' || block.kind === 'structured-input') {
        concepts = block.assessesConcepts;
        blockKindFa = block.kind === 'guided-discovery' ? 'کشف هدایت‌شده' : 'ورودی ساخت‌یافته';
      } else if (block.kind === 'dialogue-player' && block.prediction) {
        concepts = block.prediction.assessesConcepts;
        blockKindFa = 'پرسش پیش‌بینی';
      } else {
        return;
      }
      if (!concepts || concepts.length === 0) {
        report(
          'graded-block-unlabelled',
          station.slug,
          'error',
          `بلوک ${block.id} (${blockKindFa}) در ایستگاه ${station.slug} نمره‌دار است اما assessesConcepts ندارد — پرسش نمره‌دار بدون برچسب برای موتور نامرئی می‌شود و ترتیب آموزش-پیش-از-سنجش قابل اعتبارسنجی نیست (R6).`,
          'ENGINE-REFORM §۴ R6 · Knowledge Registry',
          `${block.id}: unlabelled`,
        );
        return;
      }
      for (const concept of concepts) {
        const taught = registry.taughtAt.get(concept);
        if (!taught) continue; // unregistered concepts stay EQA-1's warning layer
        const sameStation = taught.chapterSlug === chapter.slug && taught.stationSlug === station.slug;
        let ok: boolean;
        if (!sameStation) {
          const myGlobal = station.order + 10000 * (registry.course.indexOf(chapter.slug) + 1);
          ok = taught.globalIndex < myGlobal;
        } else {
          const taughtIdx = taught.blockId ? station.blocks.findIndex((b) => b.id === taught.blockId) : 0;
          ok = (taughtIdx >= 0 ? taughtIdx : 0) < blockIndex;
        }
        if (!ok) {
          report(
            'graded-block-before-teach',
            station.slug,
            'error',
            `بلوک ${block.id} (${blockKindFa}) در ایستگاه ${station.slug} مفهوم «${concept}» را می‌سنجد، اما تدریسِ آن در ${taught.chapterSlug}/${taught.stationSlug}${taught.blockId ? ` (بلوک ${taught.blockId})` : ''} است — پرسش نمره‌دار پیش از تدریس (R5b: آموزش مقدم بر سنجش، برای بلوک‌های نمره‌دار هم).`,
            'ENGINE-REFORM §۴ R5b · Knowledge Registry',
            `${block.id}: ${concept}`,
          );
        }
      }
    });
  }

  for (const slot of reported.values()) push(slot.finding);
  return findings;
}

/** EQA-8 course-level integrity findings (run once, chapter-independent). */
export function gateEqa8Course(registry: KnowledgeRegistry): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const WARN_RULES = new Set(['grammar-anchor-ambiguous', 'registry-prereq-dangling']);
  for (const note of registry.notes) {
    findings.push({
      gate: 'EQA-8',
      severity: WARN_RULES.has(note.rule) ? 'warning' : 'error',
      subject: note.rule,
      rule: 'registry-integrity',
      messageFa: `رجیستری دانش: ${note.message}`,
      ruleRef: 'ENGINE-REFORM §۲ · Knowledge Registry integrity',
    });
  }
  const ids = registry.entries.map((e) => e.id);
  if (new Set(ids).size !== ids.length) {
    findings.push({
      gate: 'EQA-8',
      severity: 'error',
      subject: 'registry',
      rule: 'registry-unique-ids',
      messageFa: 'رجیستری دانش: شناسهٔ تکراری در مدخل‌ها کشف شد — هر داده باید یک خانهٔ تعریف یکتا داشته باشد.',
      ruleRef: 'ENGINE-REFORM §۲ · anti-duplication',
    });
  }
  /* prerequisite DAG: every referenced prerequisite id must exist. */
  const known = new Set(ids);
  const missing = new Set<string>();
  for (const e of registry.entries) {
    for (const p of e.prerequisites) if (!known.has(p)) missing.add(`${e.id}→${p}`);
  }
  if (missing.size > 0) {
    findings.push({
      gate: 'EQA-8',
      severity: 'warning',
      subject: 'registry',
      rule: 'registry-prereq-dangling',
      messageFa: `رجیستری دانش: روابط پیش‌نیازی با ارجاع dangling: ${[...missing].slice(0, 5).join('، ')} — بازبینی شود.`,
      ruleRef: 'ENGINE-REFORM §۲ · registry prerequisites',
    });
  }
  return findings;
}
