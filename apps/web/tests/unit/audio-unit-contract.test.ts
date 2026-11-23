/**
 * HANASO — AUDIO-UNIT contract regression tests (2026-11-23 §۱/§۳ — the
 * permanent CI battery that keeps future agents from repeating the wrong-unit
 * mistake in ANY chapter).
 *
 * The mission's rejection list, each mapped to a machine rule:
 *   - استفاده از صوت مکالمه برای سنجش معنی یک واژه        → AU-1
 *   - اتصال فایل صوتی با متن نامرتبط به آیتم آموزشی        → AU-2
 *   - نبود صوت مستقل برای فعالیتی که به Word Audio نیاز دارد → AU-3
 *   - جایگزین‌کردن صدای کامل جمله به‌جای فایل مستقل واژه     → AU-1 (the same rule — no substitution)
 *   - اختلاف متن رجیستری و محتوای فایل                      → AU-4
 *
 * All mutations run on the REAL first-meeting-01 chapter data; the positive
 * expectations run against the real committed words registry (the manifest
 * the production server serves).
 */
import { describe, expect, it } from 'vitest';
import { getChapter } from '@/modules/curriculum/content';
import { gateEqa13 } from '@/modules/curriculum/knowledge/audio-unit-contract';
import {
  resetWordAudioCacheForTests,
  loadWordAudioAssets,
  wordFormAudioId,
  sentenceAudioId,
} from '@/modules/audio/word-audio';
import {
  resolveExerciseAudioBinding,
  requiredAudioUnit,
  spokenTextOfBinding,
  wordFormIsRelated,
} from '@/modules/curriculum/audio-contract';
import { toClientExercise } from '@/modules/curriculum/grading';
import type { Chapter, Exercise, TeachingAudioEntry } from '@/modules/curriculum/types';

function fm01(): Chapter {
  return getChapter('first-meeting-01')!;
}

/** The REAL committed words-registry entries (the CI state production ships). */
function committedEntries(): Record<string, TeachingAudioEntry> | null {
  resetWordAudioCacheForTests();
  return loadWordAudioAssets()?.entries ?? null;
}

function cloneChapter(chapter: Chapter): Chapter {
  return structuredClone(chapter);
}

describe('AUDIO-UNIT §۱ — the committed registry is structurally complete', () => {
  it('every word-unit binding of chapter 02 resolves to a COMMITTED, asr-verified asset (AU-3)', () => {
    const entries = committedEntries();
    expect(entries, 'the words registry must be committed before shipping audio-unit content').not.toBeNull();
    const gate = gateEqa13(fm01(), { wordAudioEntries: entries });
    const errors = gate.filter((f) => f.severity === 'error');
    expect(errors, errors.map((e) => e.messageFa).join('\n')).toEqual([]);
  });

  it('every registry row carries the full structural metadata (text/target/unit/role/voice/source/path/validation)', () => {
    const entries = committedEntries();
    expect(entries).not.toBeNull();
    for (const [id, e] of Object.entries(entries!)) {
      expect(e.text, `${id} text`).toBeTruthy();
      expect(e.audioType, `${id} audioType`).toMatch(/^(word|word-form|sentence)$/);
      expect(e.roleFa, `${id} roleFa`).toBeTruthy();
      expect(e.voice?.name, `${id} voice`).toBeTruthy();
      expect(e.source?.engine, `${id} source.engine`).toBeTruthy();
      expect(e.path?.opus, `${id} path.opus`).toBe(`/audio/words/${id}.opus`);
      expect(e.path?.m4a, `${id} path.m4a`).toBe(`/audio/words/${id}.m4a`);
      expect(e.validation?.status, `${id} validation.status`).toBe('asr-verified');
      if (e.validation?.status === 'asr-verified') {
        expect(e.validation.transcript, `${id} transcript recorded`).toBeTruthy();
      }
      expect(e.bytes).toBeGreaterThan(0);
      expect(e.durationMs).toBeGreaterThan(0);
    }
  });

  it("the manifest text of every WORD row equals the word's spoken reading (AU-4 — 〜 stripped)", () => {
    const entries = committedEntries()!;
    const words = new Map(fm01().words.map((w) => [w.id, w]));
    for (const word of words.values()) {
      const entry = entries[word.wordAudio!];
      expect(entry, `${word.wordAudio} committed`).toBeTruthy();
      expect(entry!.text).toBe(word.readingKana.replace(/^[〜]/, ''));
    }
  });
});

describe('AUDIO-UNIT §۳ — the permanent rejections (mutations on the real chapter)', () => {
  it('AU-1: a word-meaning question bound to the DIALOGUE LINE is rejected (the original bug)', () => {
    const chapter = cloneChapter(fm01());
    const ex = chapter.exercises['ex-fm01-v1-p1-aud-1']!;
    const mutated: Exercise = { ...ex, audio: undefined, audioLineRef: 's-first-meeting-01-l3' };
    chapter.exercises[ex.id] = mutated;
    const findings = gateEqa13(chapter, { wordAudioEntries: committedEntries() });
    expect(findings.some((f) => f.rule === 'audio-unit-mismatch' && f.subject === ex.id)).toBe(true);
  });

  it('AU-1: NO binding at all on a word-target listening question is rejected (missing word audio)', () => {
    const chapter = cloneChapter(fm01());
    const ex = chapter.exercises['ex-fm01-v2-aud-1']!;
    const mutated: Exercise = { ...ex, audio: undefined, audioLineRef: undefined };
    chapter.exercises[ex.id] = mutated;
    const findings = gateEqa13(chapter, { wordAudioEntries: committedEntries() });
    expect(findings.some((f) => f.rule === 'audio-unit-mismatch' && f.subject === ex.id)).toBe(true);
  });

  it('AU-2: a word binding pointing at a DIFFERENT word than the assessed one is rejected', () => {
    const chapter = cloneChapter(fm01());
    const ex = chapter.exercises['ex-fm01-v1-p1-aud-1']!; // assesses voc-watashi
    const mutated: Exercise = { ...ex, audio: { unit: 'word', wordId: 'voc-nihonjin' }, audioLineRef: undefined };
    chapter.exercises[ex.id] = mutated;
    const findings = gateEqa13(chapter, { wordAudioEntries: committedEntries() });
    expect(findings.some((f) => f.rule === 'audio-binding-wrong-target' && f.subject === ex.id)).toBe(true);
  });

  it('AU-2: a word-form whose text is UNRELATED to the target word is rejected (نامرتبط)', () => {
    const chapter = cloneChapter(fm01());
    const ex = chapter.exercises['ex-fm01-l1-mp-2']!; // target voc-chuugokujin
    const mutated: Exercise = {
      ...ex,
      audio: { unit: 'word-form', text: 'だいがく', wordId: 'voc-chuugokujin' }, // unrelated form
      audioLineRef: undefined,
    };
    chapter.exercises[ex.id] = mutated;
    const findings = gateEqa13(chapter, { wordAudioEntries: committedEntries() });
    expect(findings.some((f) => f.rule === 'audio-form-unrelated-text' && f.subject === ex.id)).toBe(true);
  });

  it('AU-3: a binding whose asset is NOT committed is rejected (the honest absence that forces generation)', () => {
    const chapter = cloneChapter(fm01());
    const entries = { ...committedEntries()! };
    delete entries['wa-fm01-watashi'];
    const findings = gateEqa13(chapter, { wordAudioEntries: entries });
    expect(findings.some((f) => f.rule === 'audio-asset-missing' && f.subject === 'ex-fm01-v1-p1-aud-1')).toBe(true);
  });

  it('AU-3: a committed asset WITHOUT asr-verified validation is rejected (unverified file)', () => {
    const chapter = cloneChapter(fm01());
    const entries = { ...committedEntries()! };
    entries['wa-fm01-sensee'] = { ...entries['wa-fm01-sensee']!, validation: { status: 'pending-asr' } };
    const findings = gateEqa13(chapter, { wordAudioEntries: entries });
    expect(findings.some((f) => f.rule === 'audio-asset-unverified' && f.subject === 'ex-fm01-l1-engage-1')).toBe(true);
  });

  it("AU-4: a registry row whose TEXT does not match the word's reading is rejected (registry↔content mismatch)", () => {
    const chapter = cloneChapter(fm01());
    const entries = { ...committedEntries()! };
    entries['wa-fm01-nihonjin'] = { ...entries['wa-fm01-nihonjin']!, text: 'にほん' };
    const findings = gateEqa13(chapter, { wordAudioEntries: entries });
    expect(findings.some((f) => f.rule === 'audio-registry-text-mismatch' && f.subject === 'ex-fm01-v1-p1-aud-2')).toBe(
      true,
    );
  });

  it('AU-4: a registry row whose audioType disagrees with the binding unit is rejected', () => {
    const chapter = cloneChapter(fm01());
    const entries = { ...committedEntries()! };
    entries['wa-fm01-sensee'] = { ...entries['wa-fm01-sensee']!, audioType: 'sentence' };
    const findings = gateEqa13(chapter, { wordAudioEntries: entries });
    expect(findings.some((f) => f.rule === 'audio-registry-type-mismatch' && f.subject === 'ex-fm01-l1-engage-1')).toBe(
      true,
    );
  });

  it('AU-5: a dual binding (structured audio + legacy audioLineRef) is rejected', () => {
    const chapter = cloneChapter(fm01());
    const ex = chapter.exercises['ex-fm01-v1-p1-aud-1']!;
    const mutated: Exercise = { ...ex, audioLineRef: 's-first-meeting-01-l3' } as Exercise;
    chapter.exercises[ex.id] = mutated;
    const findings = gateEqa13(chapter, { wordAudioEntries: committedEntries() });
    expect(findings.some((f) => f.rule === 'audio-dual-binding' && f.subject === ex.id)).toBe(true);
  });
});

describe('AUDIO-UNIT §۱ — the pure contract helpers', () => {
  it('the legacy audioLineRef resolves as a line binding (one resolver, no forks)', () => {
    const ex = fm01().exercises['ex-fm01-l1-gist-1']!;
    const binding = resolveExerciseAudioBinding(ex);
    expect(binding?.unit).toBe('line');
  });

  it('a word-target audio-meaning REQUIRES the word unit; a grammar/listening target is unconstrained', () => {
    const chapter = fm01();
    const wordsById = new Map(chapter.words.map((w) => [w.id, w]));
    expect(requiredAudioUnit(chapter.exercises['ex-fm01-v1-p1-aud-1']!, wordsById)).toBe('word');
    expect(requiredAudioUnit(chapter.exercises['ex-fm01-l1-mp-2']!, wordsById)).toBe('word');
    expect(requiredAudioUnit(chapter.exercises['ex-fm01-l2-aud-1']!, wordsById)).toBeNull(); // grammar target
    expect(requiredAudioUnit(chapter.exercises['ex-fm01-l1-gist-1']!, wordsById)).toBeNull(); // gist
  });

  it('spokenTextOfBinding strips the 〜 notation marker (さん is spoken, not 〜さん)', () => {
    const chapter = fm01();
    const wordsById = new Map(chapter.words.map((w) => [w.id, w]));
    const san = wordsById.get('voc-san')!;
    expect(spokenTextOfBinding({ unit: 'word', wordId: 'voc-san' }, wordsById)).toBe(
      san.readingKana.replace(/^[〜]/, ''),
    );
  });

  it('wordFormIsRelated accepts contiguous forms of the family, rejects unrelated text', () => {
    const chapter = fm01();
    const wordsById = new Map(chapter.words.map((w) => [w.id, w]));
    const chuugokujin = wordsById.get('voc-chuugokujin')!;
    expect(wordFormIsRelated('ちゅうごく', chuugokujin)).toBe(true);
    expect(wordFormIsRelated('ちゅうごくじん', chuugokujin)).toBe(true);
    expect(wordFormIsRelated('だいがく', chuugokujin)).toBe(false);
    expect(wordFormIsRelated('せんせい', chuugokujin)).toBe(false);
  });

  it('the word-form/sentence content ids are the deterministic hash stems (generator == gate)', () => {
    expect(wordFormAudioId('ちゅうごく')).toBe('waf-36c3bce15f84bea6');
    expect(wordFormAudioId('かんこく')).toBe('waf-09204d5319c2fba6');
    expect(sentenceAudioId('かんこくから きました。')).toBe('se-2fcd82d63ab75039');
  });

  it('the client payload drops audioLineRef when the word binding owns the unit (ONE sound per question)', () => {
    // The station page performs this exact transform; asserted at the transport level:
    const ex = fm01().exercises['ex-fm01-v1-p1-aud-1']!;
    const ce = toClientExercise(ex);
    expect(ex.audio?.unit).toBe('word');
    expect(ex.audioLineRef).toBeUndefined(); // the authored data itself carries ONE binding
    expect(ce.audioLineRef).toBeUndefined();
  });
});
