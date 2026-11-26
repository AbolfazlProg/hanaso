// @vitest-environment jsdom
/**
 * LESSON-UX PART2 — the permanent gates of the 2026-11-26 Part-2 mission.
 *
 *   P2-A  answer-leak class (#203 audit finding 1): a kana-listening item
 *         NEVER carries promptJa — the glyph IS the answer; rendering it
 *         above the options leaked the key (ex-kana-kf-warm-1, ヲ).
 *   P2-B  the reading-sheet law (#200): the m-stations state ONE goal
 *         («بتوانی بخوانی»), carry word-wall closings whose every word has
 *         a reading + meaning + COMMITTED audio, and every board item is
 *         kana-derivable → carries its Persian reading (the tap-reveal).
 *   P2-C  the host-word reading law (#205): every KANA_ITEMS hostWord is
 *         derivable by the ONE transliteration standard — a host card can
 *         never again render a Latin-only chip (ドア → "doa"). Spot-locks
 *         the three formerly-underivable hostwords (～かい, ウェイトレス,
 *         ヂャンクション).
 *   P2-D  the skill-chip law (#206): kana-typed questions carry the kana
 *         label («کانا» / «خواندن کانا»), never the stale «واژگان».
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { getChapter } from '@/modules/curriculum/content';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { standardWordReadingFa, transliterateKanaToFa } from '@/modules/curriculum/content/translit-standard';
import { skillLabel } from '@/components/curriculum/exercise-session';
import type { Exercise, Station } from '@/modules/curriculum/types';

const web = process.cwd(); // apps/web

/* ------------------------------------------------------------------ P2-A */

describe('P2-A — kana-listening never leaks its answer glyph (#203 finding 1)', () => {
  const chapters = ['kana-foundation-01', 'kana-expansion-01', 'first-meeting-01'].map((s) => getChapter(s)!);

  it('NO kana-listening exercise in the live banks carries promptJa', () => {
    const offenders: string[] = [];
    for (const ch of chapters) {
      for (const ex of Object.values(ch.exercises)) {
        if (ex.type === 'kana-listening' && ex.promptJa)
          offenders.push(`${ch.slug}/${ex.id}: promptJa «${ex.promptJa}»`);
      }
    }
    expect(offenders, 'kana-listening items with promptJa (the glyph is the answer — it must never render)').toEqual(
      [],
    );
  });

  it('the fixed item keeps its prompt glyph OUT of the payload (ex-kana-kf-warm-1)', () => {
    const ex = getChapter('kana-foundation-01')!.exercises['ex-kana-kf-warm-1'] as Exercise;
    expect(ex.type).toBe('kana-listening');
    expect(ex.promptJa).toBeUndefined();
    expect(ex.options!.map((o) => o.label)).toContain('ヲ');
  });
});

/* ------------------------------------------------------------------ P2-B */

describe('P2-B — the reading-sheet stations (#200)', () => {
  const chapter = getChapter('kana-foundation-01')!;
  const stationBySlug = (slug: string): Station => chapter.stations.find((s) => s.slug === slug)!;
  const m1 = stationBySlug('stn-kana-m1-reading');
  const m2 = stationBySlug('stn-kana-m2-realworld');

  const hostManifest = JSON.parse(readFileSync(join(web, 'public', 'audio', 'hostwords', 'manifest.json'), 'utf8')) as {
    entries: Record<string, { file?: string }>;
  };
  const committed = (w: string): boolean => {
    const e = hostManifest.entries[w];
    return !!e && existsSync(join(web, 'public', 'audio', 'hostwords', `${e.file}.opus`));
  };

  it('both stations state the ONE goal in their objective (بتوانی بخوانی)', () => {
    for (const st of [m1, m2]) {
      expect(st.objectiveFa, `${st.slug} objective states the reading goal`).toContain('بتوانی بخوانی');
    }
  });

  it('each station closes on a word-wall whose words all have reading + meaning + COMMITTED audio', () => {
    for (const st of [m1, m2]) {
      const walls = st.blocks.filter((b) => b.kind === 'word-wall');
      expect(walls.length, `${st.slug} has a word-wall`).toBe(1);
      const wall = walls[0]!;
      expect(wall.words.length).toBeGreaterThanOrEqual(6);
      for (const w of wall.words) {
        expect(w.readingFa.trim(), `${st.slug}/${w.ja} readingFa`).not.toBe('');
        expect(w.meaningFa.trim(), `${st.slug}/${w.ja} meaningFa`).not.toBe('');
        expect(committed(w.ja), `${st.slug}/${w.ja} has a committed audio asset`).toBe(true);
      }
      // the wall closes the station (after the last exercise, before wrap-up)
      const wallIdx = st.blocks.findIndex((b) => b.id === wall.id);
      const lastExerciseIdx = Math.max(...st.blocks.flatMap((b, i) => (b.kind === 'exercise' ? [i] : [])));
      const wrapIdx = st.blocks.findIndex((b) => b.kind === 'wrap-up');
      expect(wallIdx).toBeGreaterThan(lastExerciseIdx);
      expect(wallIdx).toBeLessThan(wrapIdx);
    }
  });

  it('every board ITEM that is kana-derivable carries its Persian reading (the tap-reveal contract)', () => {
    for (const st of [m1, m2]) {
      for (const board of st.blocks.filter((b) => b.kind === 'realworld-board')) {
        for (const panel of board.panels) {
          for (const item of panel.items) {
            const derivable = transliterateKanaToFa(item.ja).errors.length === 0;
            if (derivable) {
              expect(item.readingFa, `${st.slug} board item ${item.ja} carries readingFa`).toBeTruthy();
            }
          }
        }
      }
    }
  });

  it('every text written on the boards is audio-committed — items, leads AND sides (the «وویس» law)', () => {
    const texts: string[] = [];
    for (const st of [m1, m2]) {
      for (const board of st.blocks.filter((b) => b.kind === 'realworld-board')) {
        for (const panel of board.panels) {
          if (panel.leadJa) texts.push(panel.leadJa);
          for (const item of panel.items) {
            texts.push(item.ja);
            if (item.sideJa) texts.push(item.sideJa);
          }
        }
      }
    }
    const silent = texts.filter((t) => !committed(t));
    expect(silent, 'written board texts without a committed audio asset').toEqual([]);
  });
});

/* ------------------------------------------------------------------ P2-C */

describe('P2-C — every host word is derivable by the ONE standard (#205)', () => {
  it('all KANA_ITEMS hostWords transliterate with zero errors (never a Latin-only chip)', () => {
    const offenders: string[] = [];
    for (const item of KANA_ITEMS) {
      if (!item.hostWord) continue;
      const { errors } = transliterateKanaToFa(item.hostWord.word);
      if (errors.length) offenders.push(`${item.kanaId} «${item.hostWord.word}»: ${errors.join('; ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('the three formerly-underivable hostwords now derive (tilde, ウェ, ヂャ registrations)', () => {
    expect(standardWordReadingFa('～かい')).toBe('کای');
    expect(standardWordReadingFa('ウェイトレス')).toBe('وهیتُرهسو');
    expect(standardWordReadingFa('ヂャンクション')).toBe('جان‌کوشُن');
  });

  it('standardWordReadingFa returns null for non-kana text (the honest absence)', () => {
    expect(standardWordReadingFa('本日営業')).toBeNull();
  });
});

/* ------------------------------------------------------------------ P2-D */

describe('P2-D — the skill chip matches the question nature (#206)', () => {
  const ex = (over: Partial<Exercise>): Exercise =>
    ({ id: 'x', type: 'kana-recognition', targetSkill: 'vocab', promptFa: '', ...over }) as Exercise;

  it('kana-typed questions carry the kana labels — never «واژگان»', () => {
    expect(skillLabel(ex({ type: 'kana-recognition' }))).toBe('کانا');
    expect(skillLabel(ex({ type: 'kana-listening' }))).toBe('کانا');
    expect(skillLabel(ex({ type: 'kana-recall' }))).toBe('کانا');
    expect(skillLabel(ex({ type: 'kana-decode' }))).toBe('خواندن کانا');
    for (const t of ['kana-recognition', 'kana-listening', 'kana-recall', 'kana-decode'] as const) {
      expect(skillLabel(ex({ type: t }))).not.toBe('واژگان');
    }
  });

  it('the non-kana skills keep their labels (the untouched half of the mapping)', () => {
    expect(skillLabel(ex({ type: 'meaning-select', targetSkill: 'vocab' }))).toBe('واژگان');
    expect(skillLabel(ex({ type: 'rule-listening', targetSkill: 'listening' }))).toBe('شنیداری');
    expect(skillLabel(ex({ type: 'meaning-select', targetSkill: 'grammar' }))).toBe('گرامر');
  });
});
