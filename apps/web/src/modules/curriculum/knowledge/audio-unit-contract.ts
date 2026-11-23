/**
 * HANASO — EQA-13: the audio-unit contract gate (AUDIO-UNIT 2026-11-23 §۱).
 *
 * «واحد صوتی باید دقیقاً با واحدی که زبان‌آموز قرار است یاد بگیرد یا تشخیص
 * دهد متناسب باشد» — the engine-enforced rules (each maps to a mission line):
 *
 *   AU-1 (error)  an audio-meaning / listen-minimal-pair whose targetConcept is
 *                 a chapter WORD must bind the WORD's own standalone audio
 *                 (unit 'word'/'word-form'). A line/dialogue binding there is
 *                 the classic wrong-unit mistake (the beginner hears a whole
 *                 sentence while being asked about one word) — a build failure.
 *                 «در تمرین‌های واژگان مبتدی، به‌هیچ‌وجه صدای یک جملهٔ کامل را
 *                 به‌جای صدای مستقل واژه استفاده نکن.»
 *   AU-2 (error)  the binding's target must be the assessed item: the word id
 *                 equals the target concept (or, for a kanji target, one of the
 *                 kanji's anchor words); a word-form's text must belong to the
 *                 target word's family («اتصال فایل صوتی با متن نامرتبط به
 *                 آیتم آموزشی» is rejected).
 *   AU-3 (error)  the bound content-id must have a COMMITTED, asr-verified
 *                 manifest entry — «نبود صوت مستقل برای فعالیتی که به Word
 *                 Audio نیاز دارد» is a build failure, never a silent fallback
 *                 (and there IS no fallback: the UI hides the control honestly).
 *   AU-4 (error)  the registry row's declared text must equal the text the
 *                 binding demands (the word's reading; the binding's form) and
 *                 its audioType must match the binding unit — «اختلاف میان متن
 *                 ثبت‌شده در رجیستری و محتوای واقعی فایل صوتی».
 *   AU-5 (error)  a dual binding (structured `audio` AND legacy `audioLineRef`
 *                 on the same exercise) is an ambiguous unit declaration.
 *
 * The gate is PURE over (chapter, registry entries): the EQA runner loads the
 * committed words manifest and passes its entries in; unit tests pass
 * controlled entries for the mutation cases.
 */
import type { Chapter } from '../types';
import type { EqaFinding } from '../eqa/policy';
import {
  resolveExerciseAudioBinding,
  requiredAudioUnit,
  spokenTextOfBinding,
  wordFormIsRelated,
} from '../audio-contract';
import { contentIdOfBinding } from '../../audio/word-audio';
import type { TeachingAudioEntry } from '../types';

export interface AudioUnitGateInputs {
  /** The committed words-registry entries (content-id → structural row). Null = nothing committed. */
  wordAudioEntries: Record<string, TeachingAudioEntry> | null;
}

export function gateEqa13(chapter: Chapter, inputs: AudioUnitGateInputs): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const push = (rule: string, severity: 'error' | 'warning', subject: string, messageFa: string) => {
    findings.push({
      gate: 'EQA-13',
      severity,
      subject,
      rule,
      messageFa,
      ruleRef: 'AUDIO-UNIT 2026-11-23 §۱ · DD-119 (صدای مستقل واژه — تصمیم مالک) · word-audio registry',
    });
  };

  const wordsById = new Map(chapter.words.map((w) => [w.id, w]));
  const kanjiAnchors = new Map<string, string[]>();
  for (const k of chapter.kanji ?? []) kanjiAnchors.set(k.kanjiId, k.anchorWordIds);
  const kanjiIds = new Set(kanjiAnchors.keys());
  const entries = inputs.wordAudioEntries ?? {};

  for (const ex of Object.values(chapter.exercises)) {
    const binding = resolveExerciseAudioBinding(ex);

    /* AU-5 — one unit declaration per exercise. */
    if (ex.audio && ex.audioLineRef) {
      push(
        'audio-dual-binding',
        'error',
        ex.id,
        `تمرین ${ex.id} هم binding ساختاری audio و هم audioLineRef قدیمی دارد — واحد صوتی مبهم است؛ فقط یکی را اعلام کن (AU-5).`,
      );
    }

    const required = requiredAudioUnit(ex, wordsById, kanjiIds);

    /* AU-1 — a word-target listening item MUST bind word-unit audio. */
    if (required === 'word' || required === 'word-anchor') {
      if (!binding || binding.unit === 'line' || binding.unit === 'context') {
        push(
          'audio-unit-mismatch',
          'error',
          ex.id,
          `تمرین ${ex.id} (${ex.type}) دربارهٔ «${ex.targetConcept}» است اما واحد صوتی آن ${
            binding ? `${binding.unit === 'line' ? 'خط مکالمه (جملهٔ کامل)' : binding.unit} است` : 'binding ندارد'
          } — سؤال دربارهٔ یک واژه باید صدای مستقل همان واژه را پخش کند، نه جمله/مکالمهٔ کامل (AU-1).`,
        );
        continue;
      }
    }

    if (!binding) continue; // line-unit items with no audio binding are other gates' business (EQA-2 packet)

    /* AU-2 — the binding's target must be the assessed item. */
    if (binding.unit === 'word') {
      const word = wordsById.get(binding.wordId);
      if (!word) {
        push(
          'audio-binding-unknown-word',
          'error',
          ex.id,
          `تمرین ${ex.id}: binding صوتی به واژهٔ ناموجود «${binding.wordId}» اشاره می‌کند (AU-2).`,
        );
        continue;
      }
      if (required === 'word' && binding.wordId !== ex.targetConcept) {
        push(
          'audio-binding-wrong-target',
          'error',
          ex.id,
          `تمرین ${ex.id}: سنجشِ «${ex.targetConcept}» است اما صدا به واژهٔ «${binding.wordId}» وصل شده — واحد صوتی باید همان واژهٔ سنجیده‌شده باشد (AU-2).`,
        );
      }
      if (required === 'word-anchor') {
        const anchors = kanjiAnchors.get(ex.targetConcept) ?? [];
        if (!anchors.includes(binding.wordId)) {
          push(
            'audio-binding-not-anchor',
            'error',
            ex.id,
            `تمرین ${ex.id}: هدف ${ex.targetConcept} است اما واژهٔ صوتی «${binding.wordId}» از واژه‌های anchor آن کانجی نیست — صدا باید یکی از واژه‌های حامل همان مفهوم باشد (AU-2).`,
          );
        }
      }
    } else if (binding.unit === 'word-form') {
      const word = wordsById.get(binding.wordId);
      if (!word) {
        push(
          'audio-binding-unknown-word',
          'error',
          ex.id,
          `تمرین ${ex.id}: binding word-form به واژهٔ ناموجود «${binding.wordId}» اشاره می‌کند (AU-2).`,
        );
        continue;
      }
      if (required === 'word' && binding.wordId !== ex.targetConcept) {
        push(
          'audio-binding-wrong-target',
          'error',
          ex.id,
          `تمرین ${ex.id}: سنجشِ «${ex.targetConcept}» است اما شکل صوتی به واژهٔ «${binding.wordId}» وصل شده (AU-2).`,
        );
      }
      if (!wordFormIsRelated(binding.text, word)) {
        push(
          'audio-form-unrelated-text',
          'error',
          ex.id,
          `تمرین ${ex.id}: متن شکل صوتی «${binding.text}» به واژهٔ «${word.readingKana}» ربط ندارد — فایل صوتی با متن نامرتبط به آیتم آموزشی وصل شده (AU-2).`,
        );
      }
    }

    /* AU-3 + AU-4 — committed, verified, text-matching asset (words registry rows). */
    if (binding.unit === 'word' || binding.unit === 'word-form' || binding.unit === 'sentence') {
      const contentId = contentIdOfBinding(binding, wordsById);
      if (!contentId) {
        push(
          'audio-asset-unbound',
          'error',
          ex.id,
          `تمرین ${ex.id}: binding واحد ${binding.unit} به هیچ شناسهٔ محتوایی قابل‌حل‌شدن نمی‌رسد (واژهٔ wordAudio ندارد؟) (AU-3).`,
        );
        continue;
      }
      const entry = entries[contentId];
      if (!entry) {
        push(
          'audio-asset-missing',
          'error',
          ex.id,
          `تمرین ${ex.id}: فایل صوتی مستقل «${contentId}» در رجیستری صوت موجود نیست — فعالیتی که به ${binding.unit === 'word' ? 'Word Audio' : `صدای ${binding.unit}`} نیاز دارد نباید بدون فایل بماند؛ نبود صوت را تولید کنید، نه پنهان (AU-3).`,
        );
        continue;
      }
      if (entry.validation?.status !== 'asr-verified') {
        push(
          'audio-asset-unverified',
          'error',
          ex.id,
          `تمرین ${ex.id}: فایل صوتی «${contentId}» وضعیت اعتبارسنجی «${entry.validation?.status ?? 'ندارد'}» دارد — هر فایل صوتی آموزشی باید با ASR به متن ثبت‌شده‌اش راستی‌آزمایی شده باشد (AU-3).`,
        );
      }
      const expectedText = spokenTextOfBinding(binding, wordsById);
      if (expectedText !== null && entry.text !== expectedText) {
        push(
          'audio-registry-text-mismatch',
          'error',
          ex.id,
          `تمرین ${ex.id}: متن ثبت‌شدهٔ رجیستری برای «${contentId}» («${entry.text}») با متن موردنیاز binding («${expectedText}») فرق دارد — اختلاف متن رجیستری و محتوای فایل صوتی (AU-4).`,
        );
      }
      if (entry.audioType !== binding.unit) {
        push(
          'audio-registry-type-mismatch',
          'error',
          ex.id,
          `تمرین ${ex.id}: نوع صوت ثبت‌شدهٔ «${contentId}» (${entry.audioType}) با واحد binding (${binding.unit}) فرق دارد (AU-4).`,
        );
      }
    }
  }

  return findings;
}
