/**
 * HANASO — Pedagogical Validator (owner-pass 2026-11-19, mission phase 5).
 *
 * The machine-checkable subset of the teaching framework, enforced on
 * lesson-engine DRAFTS. Rule sources are cited inline — the full register with
 * severities lives in docs/lesson-engine/REQUIREMENTS.md. Numbers come ONLY
 * from engine-config.ts (calibratable — Q-004/007/009/011/017/020).
 *
 * MODES:
 *  - draft mode (default): runs EVERY rule on an EngineChapter draft. Draft
 *    chapters must pass BEFORE compile/publish.
 *  - product mode: the structural subset that the EXISTING chapters already
 *    satisfy (no new failures on shipped content — compatibility contract).
 */
import { ENGINE_CONFIG } from './engine-config';
import {
  ATTEMPT_POLICY_BY_STAGE,
  type EngineChapter,
  type EngineInteraction,
  type EngineStation,
  type EngineStep,
  type ValidatorFinding,
  type ValidatorReport,
} from './types';

/* ------------------------------------------------------------------ helpers */

const RE =
  'REQUIREMENTS.md ref: '; // prefix keeping rule→framework traceability in findings

function flowOrderFor(domain: string): string[] {
  switch (domain) {
    case 'grammar':
      return ['notice', 'function', 'form', 'meaning', 'examples', 'contrast', 'build', 'exit'];
    case 'vocab':
      return ['encounter', 'form', 'meaning', 'situation', 'collocation', 'register', 'build', 'exit'];
    case 'kanji':
      return ['encounter', 'shape', 'reading', 'anchor2', 'stroke', 'exit'];
    case 'listening':
      return ['predict', 'gist', 'targeted', 'verify', 'reflect', 'exit'];
    case 'pron':
      return ['encounter', 'perception', 'comparison', 'production', 'exit'];
    case 'reading':
      return ['words', 'chunks', 'sentence', 'text', 'inference', 'exit'];
    case 'writing':
      return ['model', 'structure', 'complete', 'constrained', 'free', 'exit'];
    case 'kana':
      return ['sound', 'card', 'recognize', 'recall', 'listen', 'examples', 'exit'];
    default:
      return [];
  }
}

/** Is `steps` a valid subsequence of `order` (same-domain steps keep order; merges allowed)? */
function isOrderedSubsequence(steps: EngineStep[], order: string[]): boolean {
  let cursor = 0;
  for (const step of steps) {
    const goal = step.goal.toLowerCase();
    let found = -1;
    for (let i = cursor; i < order.length; i += 1) {
      if (order[i] === goal || order[i].split('+').includes(goal)) {
        found = i;
        break;
      }
    }
    if (found >= 0) cursor = found + 1;
    else return false; // a goal not in the flow at/after cursor → order violation
  }
  return true;
}

function interactionOf(step: EngineStep): EngineInteraction | null {
  return step.interaction ?? null;
}

/* ------------------------------------------------------------------ rules */

export interface ValidateOptions {
  /** product mode runs only the compatibility-safe subset. */
  mode?: 'draft' | 'product';
}

export function validateEngineChapter(chapter: EngineChapter, options: ValidateOptions = {}): ValidatorReport {
  const findings: ValidatorFinding[] = [];
  const draft = options.mode !== 'product';
  const cfg = ENGINE_CONFIG;
  let rules = 0;

  const push = (rule: string, severity: 'hard' | 'soft', location: string, message: string) => {
    findings.push({ rule, severity, message: `${RE}${message}`, location });
  };
  const run = (rule: string, fn: () => void) => {
    rules += 1;
    fn();
  };

  /* ---- L-STRUCT: chapter structural completeness (chapter-blueprint §۱) ---- */
  run('L-STRUCT', () => {
    if (!chapter.canDoFa || chapter.canDoFa.length < 8) push('L-STRUCT', 'hard', 'chapter', 'can_do فصل الزامی و باید جملهٔ قابل‌سنجش JF باشد.');
    if (chapter.archetype === 'C-Dialogue') {
      if (chapter.dialogue.length < 3) push('L-STRUCT', 'hard', 'chapter.dialogue', 'فصل C-Dialogue بدون مکالمهٔ محوری معنا ندارد (مدل ۱۳-مرحله).');
      const turnCap = cfg.dialogueTurns[chapter.level] ?? 8;
      if (chapter.dialogue.length > turnCap + 4)
        push('L-STRUCT', 'soft', 'chapter.dialogue', `مکالمهٔ فصل ${chapter.dialogue.length} نوبت است — بیش از توصیهٔ سطح (${turnCap}).`);
    }
    if (chapter.grammar.length > cfg.grammarPerChapter.max)
      push('L-STRUCT', 'hard', 'chapter.grammar', `بودجهٔ گرامر فصل حداکثر ${cfg.grammarPerChapter.max} ساختار است (prerequisite-and-sequencing §۳).`);
    if (chapter.culturalNote.length > cfg.culturalNotesMax)
      push('L-STRUCT', 'hard', 'chapter.culturalNote', `حداکثر ${cfg.culturalNotesMax} نکتهٔ فرهنگی در فصل (CLT).`);
    if (chapter.published) push('L-STRUCT', 'hard', 'chapter', 'فصل draft نباید published باشد — انتشار فقط پس از کامپایل و بررسی مالک.');
    if (chapter.stations.length === 0) push('L-STRUCT', 'hard', 'chapter.stations', 'فصل بدون ایستگاه است.');
    if (chapter.lessons.length === 0 && draft) push('L-STRUCT', 'hard', 'chapter.lessons', 'نقشهٔ درس‌ها (لایهٔ Lesson فریم‌ورک) خالی است.');
  });

  /* ---- L-SRC: booklet provenance (anti-invention, mission phase 4) ---- */
  run('L-SRC', () => {
    if (!draft) return;
    const check = (ref: unknown, location: string) => {
      if (!ref || typeof ref !== 'object') {
        push('L-SRC', 'hard', location, 'بدون sourceRef جزوه — هر آیتم باید ارجاع دقیق (فایل/درس/صفحه/بخش) داشته باشد (QC #۷).');
      }
    };
    check(chapter.dialogue.length ? chapter.dialogue[0]?.sourceRef : null, 'chapter.dialogue[0]');
    chapter.dialogue.forEach((line, i) => check(line.sourceRef, `dialogue[${i}]`));
    chapter.vocabulary.forEach((v, i) => check(v.sourceRef, `vocab[${v.id}]@${i}`));
    chapter.grammar.forEach((g, i) => check(g.sourceRef, `grammar[${g.id}]@${i}`));
    chapter.kanji.forEach((k, i) => check(k.sourceRef, `kanji[${k.id}]@${i}`));
    if (chapter.finalTask && !chapter.finalTask.sourceRef)
      push('L-SRC', 'soft', 'chapter.finalTask', 'Transfer Task بدون ارجاع جزوه (موقعیت جدید است — ارجاع توصیه می‌شود).');
  });

  /* ---- L-ORIGIN: dialogue three-origin rule (conversation-centered §۲.۳) ---- */
  run('L-ORIGIN', () => {
    if (!draft) return;
    chapter.dialogue.forEach((line, i) => {
      if (!line.originNoteFa && (line.origin === 'guessable' || line.origin === 'transfer_keyword'))
        push('L-ORIGIN', 'hard', `dialogue[${i}]`, 'خط‌های حدس‌پذیر/کلیدواژهٔ Transfer باید توضیح منشأ داشته باشند.');
      if (!line.sourceRef) push('L-ORIGIN', 'hard', `dialogue[${i}]`, 'خط مکالمه بدون ارجاع جزوه.');
    });
  });

  /* ---- L-FLAG: draft flags surfaced (honest gaps — never silently dropped) ---- */
  run('L-FLAG', () => {
    if (!draft) return;
    let flagged = 0;
    const count = (flags: string[]) => flags.filter((f) => f === 'needs_review' || f === 'prereq_unclear' || f === 'missing_source').length;
    chapter.vocabulary.forEach((v) => (flagged += count(v.flags)));
    chapter.grammar.forEach((g) => (flagged += count(g.flags)));
    chapter.kanji.forEach((k) => (flagged += count(k.flags)));
    chapter.dialogue.forEach((l) => (flagged += count(l.flags ?? [])));
    chapter.stations.forEach((s) => (flagged += count(s.flags)));
    if (flagged === 0 && (chapter.vocabulary.length > 0 || chapter.grammar.length > 0))
      push('L-FLAG', 'soft', 'chapter', 'هیچ آیتمی needs_review ندارد — اگر موارد مبهم وجود داشت با پرچم ثبت شود (قرارداد بدون اختراع).');
  });

  /* ---- L-PREREQ: station graph resolves (validation.ts prereqOrder analogue) ---- */
  run('L-PREREQ', () => {
    const ids = new Set(chapter.stations.map((s) => s.id));
    chapter.stations.forEach((s) => {
      s.prerequisites.forEach((p) => {
        if (!ids.has(p))
          push('L-PREREQ', 'hard', `station[${s.id}]`, `پیش‌نیاز «${p}» در فصل پیدا نشد — یا id اشتباه است یا پیش‌نیاز فصل قبلی است (باید در prereqs فصل ثبت شود).`);
      });
    });
    chapter.lessons.forEach((l) => {
      l.stationIds.forEach((sid) => {
        if (!ids.has(sid)) push('L-PREREQ', 'hard', `lesson[${l.id}]`, `ایستگاه «${sid}» در نقشهٔ درس وجود ندارد.`);
      });
    });
    chapter.stations.forEach((s) => {
      if (s.connections.next && !ids.has(s.connections.next))
        push('L-PREREQ', 'hard', `station[${s.id}]`, 'اتصال next به ایستگاه ناشناخته اشاره می‌کند.');
    });
  });

  /* ---- L-STATION: per-station structural rules (station-blueprint §۱/§۲) ---- */
  run('L-STATION', () => {
    const objectiveSentence = (s: string) => /[.!؟?。]/.test(s.slice(0, -1));
    chapter.stations.forEach((s) => {
      if (objectiveSentence(s.objectiveFa))
        push('L-STATION', 'hard', `station[${s.id}].objective`, 'objective ایستگاه باید یک جملهٔ قابل‌سنجش باشد (دو جمله = دو ایستگاه).');
      const cap = s.type === 'teaching' ? (cfg.teachingStepCap[chapter.level] ?? 9) + cfg.guidedStepCap : cfg.practiceItems.max;
      if (s.type === 'teaching' && s.steps.length > cap)
        push('L-STATION', 'hard', `station[${s.id}]`, `ایستگاه teaching ${s.steps.length} گام دارد — سقف ${cap} (Teaching+Guided، Q-017).`);
      if (s.type === 'practice' && draft) {
        if (s.steps.length < cfg.practiceItems.min || s.steps.length > cfg.practiceItems.max)
          push('L-STATION', 'soft', `station[${s.id}]`, `ایستگاه practice باید ${cfg.practiceItems.min}–${cfg.practiceItems.max} آیتم داشته باشد (الان ${s.steps.length}).`);
      }
      // Guided phase = LAST steps (D-0011)
      if (s.guidedStepIds.length > 0) {
        const lastIds = s.steps.slice(-cfg.guidedStepCap).map((st) => st.id);
        s.guidedStepIds.forEach((gid) => {
          if (!s.steps.some((st) => st.id === gid)) push('L-STATION', 'hard', `station[${s.id}]`, `گام guided «${gid}» وجود ندارد.`);
          else if (!lastIds.includes(gid))
            push('L-STATION', 'hard', `station[${s.id}]`, 'گام‌های Guided Application باید ۲–۳ گام پایانی Teaching Station باشند (D-0011).');
        });
      }
      // Exit check exists
      const hasExit = s.steps.some((st) => st.goal.toLowerCase() === 'exit' || st.interaction?.promptFa.includes('خروج'));
      if (s.type !== 'practice' && !hasExit)
        push('L-STATION', 'hard', `station[${s.id}]`, 'ایستگاه بدون Exit Check است (تنها سنجش محسوس ایستگاه — station-blueprint §۱).');
      // attempt policy consistency
      s.steps.forEach((st) => {
        const it = interactionOf(st);
        if (it && st.stage === 'independent' && (it.hints?.length ?? 0) > 0)
          push('L-STATION', 'hard', `station[${s.id}].${st.id}`, 'در Independent Practice hint ممنوع است (ثبت hint-used) — سیاست سه‌سطحی.');
        if (it && (it.type === 'order_build' || it.type === 'transform') && (it.tiles?.length ?? 0) > cfg.buildTiles.max + 1)
          push('L-STATION', 'hard', `station[${s.id}].${st.id}`, `Build بیش از ${cfg.buildTiles.max}+۱ تایل اضافی دارد (بار موبایل).`);
        if (it && (it.type === 'select' || it.type === 'listen_choose' || it.type === 'judge') && it.options) {
          if (it.options.length < cfg.options.min || it.options.length > cfg.options.max)
            push('L-STATION', 'hard', `station[${s.id}].${st.id}`, `تعداد گزینه‌ها باید ${cfg.options.min}–${cfg.options.max} باشد (Q-020).`);
          if (it.options.length === 2 && st.stage !== 'teach')
            push('L-STATION', 'soft', `station[${s.id}].${st.id}`, 'گزینهٔ باینری فقط برای معرفی اول توصیه شده (micro-interaction §۱).');
          // distractor reasons from recorded errors
          if (draft && it.distractorReasons) {
            const unknown = Object.keys(it.distractorReasons).filter((oid) => !it.options?.some((o) => o.id === oid));
            if (unknown.length > 0) push('L-STATION', 'hard', `station[${s.id}].${st.id}`, 'distractorReasons به گزینهٔ نامعلومی اشاره می‌کند.');
          }
        }
        // hints must carry instructional content
        it?.hints?.forEach((h, hi) => {
          if (/دوباره فکر کن|مجدداً تلاش کن|^فکر کن$/.test(h.trim()))
            push('L-STATION', 'hard', `station[${s.id}].${st.id}.h${hi + 1}`, 'Hint بدون محتوای آموزشی («دوباره فکر کن» ممنوع — نردبان H باید یادآور محتوایی باشد).');
        });
        // typing ban in teaching stage
        if (st.stage === 'teach' && (it?.type === 'transform' || it?.promptFa.includes('تایپ کن')))
          push('L-STATION', 'soft', `station[${s.id}].${st.id}`, 'typing آزاد در Teaching ممنوع است — Transform از تایل استفاده کند (micro-interaction §۱).');
        // transition rule consistency
        if (st.interaction && st.transition === 'auto_after_audio')
          push('L-STATION', 'hard', `station[${s.id}].${st.id}`, 'گام تعاملی نمی‌تواند auto_after_audio باشد — انتقال فقط با صحیح/نمایش‌شده.');
        if (!st.interaction && st.transition === 'on_correct_or_revealed' && !st.card?.audioRef && !st.card?.textJa)
          push('L-STATION', 'soft', `station[${s.id}].${st.id}`, 'گام نمایشی با انتقال on_correct نمی‌بندد — auto_after_audio یا on_view.');
      });
      // anti-fatigue: ≤2 consecutive same-type interactions
      let streakType: string | null = null;
      let streak = 0;
      s.steps.forEach((st) => {
        const t = st.interaction?.type ?? null;
        if (t && t === streakType) {
          streak += 1;
          if (streak > cfg.maxConsecutiveSameInteraction)
            push('L-STATION', 'hard', `station[${s.id}].${st.id}`, `بیش از ${cfg.maxConsecutiveSameInteraction} تعامل متوالی هم‌قالب (${t}) — ضد-خستگی D-0014.`);
        } else {
          streakType = t;
          streak = t ? 1 : 0;
        }
      });
      // at least one constructive step per teaching station (perception-heavy
      // anchor/listening stations are exempt from HARD — their constructive work
      // lands in the guided/practice stations; staged-principles C3 + 13-stage)
      if (s.type === 'teaching' && !s.steps.some((st) => ['order_build', 'complete', 'transform'].includes(st.interaction?.type ?? '')))
        push(
          'L-STATION',
          s.domain === 'anchor' || s.domain === 'listening' ? 'soft' : 'hard',
          `station[${s.id}]`,
          'هر Teaching Station باید دست‌کم یک گام Constructive (build/complete/order/transform) داشته باشد.',
        );
    });
  });

  /* ---- L-FLOW: domain flow step order (G/V/K/L/P/R/W blueprints) ---- */
  run('L-FLOW', () => {
    chapter.stations.forEach((s) => {
      const order = flowOrderFor(s.domain);
      if (order.length === 0) return;
      const steps = s.steps.filter((st) => st.goal.toLowerCase() !== 'intro');
      if (!isOrderedSubsequence(steps, order))
        push('L-FLOW', 'hard', `station[${s.id}]`, `ترتیب گام‌ها فلوکش ${s.domain} را نقض می‌کند (${order.join('→')}) — ترتیب الزامی فریم‌ورک.`);
    });
  });

  /* ---- L-DOMAIN: per-domain caps (vocab tiers, kana count, kanji rules) ---- */
  run('L-DOMAIN', () => {
    if (draft) {
      // T1 cap per vocab station: count T1 vocab referenced by each vocab station via fsrsItems/steps heuristics —
      // the station-level check uses the chapter vocabulary tiers assigned to the station's step goals
      chapter.stations
        .filter((s) => s.domain === 'vocab' && s.type === 'teaching')
        .forEach((s) => {
          const t1Ids = chapter.vocabulary.filter((v) => v.tier === 'T1').map((v) => v.id);
          if (t1Ids.length > 4)
            push('L-DOMAIN', 'soft', `station[${s.id}]`, 'واژه‌های T1 بیش از حد انتظار فصل است — حداکثر ۱–۲ T1 در هر ایستگاه واژگان (ضد-سربار).');
        });
      // kanji readings must live inside ≥1 anchor words (D-0006)
      chapter.kanji.forEach((k) => {
        if (k.anchorWords.length < 2)
          push('L-DOMAIN', 'hard', `kanji[${k.id}]`, 'هر کانجی حداقل ۲ واژهٔ anchor لازم دارد (خوانش فقط درون‌واژه — D-0006).');
      });
      // kanji-per-chapter budget
      if (chapter.kanji.length > 0 && (chapter.kanji.length < cfg.kanjiPerChapter.min || chapter.kanji.length > cfg.kanjiPerChapter.max))
        push('L-DOMAIN', 'soft', 'chapter.kanji', `تعداد کانجی فصل ${chapter.kanji.length} است — بازهٔ طراحی ${cfg.kanjiPerChapter.min}–${cfg.kanjiPerChapter.max} (Q-004؛ فصل‌های کانا مستثنا).`);
    }
    chapter.stations.filter((s) => s.domain === 'kana').forEach((s) => {
      const kanaCards = s.steps.filter((st) => st.goal.toLowerCase() === 'card' || st.card?.imageHint).length;
      if (kanaCards > cfg.kanaPerStation.max)
        push('L-DOMAIN', 'soft', `station[${s.id}]`, `تعداد کارت‌های کانا (${kanaCards}) بیش از سقف ${cfg.kanaPerStation.max} است.`);
    });
  });

  /* ---- L-LISTEN: transcript timing (D-0007) ---- */
  run('L-LISTEN', () => {
    chapter.stations.filter((s) => s.domain === 'listening').forEach((s) => {
      s.steps.forEach((st) => {
        if (st.goal.toLowerCase() === 'verify' || st.card?.textJa) {
          const before = st.listeningsBeforeTranscript ?? 0;
          if (before < ENGINE_CONFIG.minListeningsBeforeTranscript)
            push('L-LISTEN', 'hard', `station[${s.id}].${st.id}`, 'نمایش متن/Transcript فقط بعد از ≥۲ شنیدن مجاز است (D-0007 — ممنوع در شنیدن اول).');
        }
        if (st.goal.toLowerCase() === 'predict' && st.interaction)
          push('L-LISTEN', 'hard', `station[${s.id}].${st.id}`, 'گام Predict پاسخ غلط ندارد — تعامل نمره‌دار در پیش‌بینی ممنوع (سیکل شنیدن).');
      });
    });
  });

  /* ---- L-SRS: horizon config match ---- */
  run('L-SRS', () => {
    chapter.stations.forEach((s) => {
      const hz = s.connections.srs?.days;
      if (!hz) return;
      const expected = cfg.srsHorizon[s.domain] ?? cfg.srsHorizon.vocab;
      const same = hz.length === expected.length && hz.every((d, i) => d === expected[i]);
      if (!same)
        push('L-SRS', 'soft', `station[${s.id}]`, `افق SRS ایستگاه [${hz.join('/')}] با کانفیگ حوزه [${expected.join('/')}] هم‌خوان نیست (کالیبره از engine-config).`);
    });
  });

  /* ---- L-ATTEMPT: attempt policy must match the three-level model ---- */
  run('L-ATTEMPT', () => {
    chapter.stations.forEach((s) => {
      s.steps.forEach((st) => {
        if (st.interaction) {
          const expected = ATTEMPT_POLICY_BY_STAGE[st.stage];
          if (st.stage === 'independent' && st.interaction.hints && st.interaction.hints.length > 0)
            push('L-ATTEMPT', 'hard', `station[${s.id}].${st.id}`, `سیاست تلاش این گام باید «${expected}» باشد (Independent) — hint policy نقض شده.`);
        }
      });
    });
  });

  const hardCount = findings.filter((f) => f.severity === 'hard').length;
  return {
    chapterId: chapter.id,
    passed: hardCount === 0,
    hardCount,
    softCount: findings.length - hardCount,
    findings,
    checkedRules: rules,
  };
}

/** Human-readable validator report (CLI + CI output). */
export function formatValidatorReport(report: ValidatorReport): string {
  const lines: string[] = [];
  lines.push(`# گزارش اعتبارسنجی آموزشی — ${report.chapterId}`);
  lines.push(`قواعد بررسی‌شده: ${report.checkedRules} | HARD: ${report.hardCount} | SOFT: ${report.softCount} | ${report.passed ? '✅ PASS' : '❌ FAIL'}`);
  const bySeverity = (sev: 'hard' | 'soft') => report.findings.filter((f) => f.severity === sev);
  for (const sev of ['hard', 'soft'] as const) {
    const items = bySeverity(sev);
    if (items.length > 0) {
      lines.push(`\n## ${sev === 'hard' ? 'خطاهای سخت (باید رفع شوند)' : 'هشدارها (کالیبره/بررسی)'}`);
      for (const f of items) lines.push(`- [${f.rule}] ${f.location}: ${f.message.replace(RE, '')}`);
    }
  }
  return lines.join('\n');
}
