import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Lock, Repeat2 } from 'lucide-react';
import { loadChapterBundle, chapterAccessStatus } from '@/modules/curriculum/server';
import { sectionOfStation } from '@/modules/curriculum/journey';
import { resolveLearnerId } from '@/lib/learner/server';
import { resolveStudyAccess } from '@/lib/auth/study-gate';
import { StudyDoor } from '@/components/auth/study-door';
import { getStationProgressStore } from '@/lib/poc/stores';
import { previewUnlockAll, unlockAllMode } from '@/lib/preview';
import { toClientExercise, toClientStation, splitKanjiWritingBlocks } from '@/modules/curriculum';
import { resolveSpeaker } from '@/modules/character';
import {
  wordAudioUrls,
  kanaAudioUrls,
  hostWordAudioUrls,
  teachingAudioUrls,
  contentIdOfBinding,
} from '@/modules/audio/server';
import { resolveExerciseAudioBinding } from '@/modules/curriculum/audio-contract';
import { KANJI_ITEMS_BY_ID } from '@/modules/curriculum/kanji';
import type { KanjiCardData } from '@/components/curriculum/kanji-card';
import { KANA_ITEMS_BY_ID } from '@/modules/curriculum/content/kana-items';
import { getChapter } from '@/modules/curriculum/content';
import { StationRunner } from '@/components/curriculum/station-runner';
import { ChapterLockedNotice } from '@/components/curriculum/chapter-locked-notice';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';

/**
 * /learn/[chapter]/journey/[station] — TASK-LEARNING-01 page 4+5: the STATION
 * (lesson engine) page. One renderer for EVERY station type — the content drives
 * what renders (blocks in authored order); this page never special-cases types.
 * Answer keys are stripped server-side (SKL-013); grading round-trips the API.
 *
 * Issue #94 (Wave 3): deep links respect the chapter soft lock — a locked chapter
 * renders the SAME notice as the journey page (chapterAccessStatus, DD-117/120).
 *
 * TASK-HANASO-17:
 * - `?mode=review` — LESSON REPLAY (§۶): a completed lesson re-opens from the
 *   TOP with the full content (audio, exercises) and re-registers NOTHING —
 *   the map's «مرور» rows deep-link here.
 * - `?restart=1` — expired-resume restart (§۸): the walk starts from block 0
 *   with the neutral notice (the 7-day policy dropped the old anchor).
 * - the header's back link and the completion CTA both return to the map
 *   SECTION of this station (`?s=` — §۷ «بازگشت به همان مسیر و Section»).
 */
/** Progress-aware (chapter access store) — dynamic render. */
export const dynamic = 'force-dynamic';

export default async function StationPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapter: string; station: string }>;
  searchParams: Promise<{ mode?: string; restart?: string; block?: string }>;
}) {
  const { chapter: chapterSlug, station: stationSlug } = await params;
  const { mode, restart, block } = await searchParams;
  let bundle;
  try {
    bundle = loadChapterBundle(chapterSlug);
  } catch {
    notFound();
  }
  const chapter = bundle!.chapter;

  /*
   * The STUDY GATE (owner 2026-11-25): lists are open, READING is for
   * accounts. A guest gets the door (with this lesson as the return path)
   * before any content is composed — the page never ships lesson material
   * to a logged-out visitor. The owner's preview cookie passes (QA).
   */
  const studyAccess = await resolveStudyAccess();
  if (studyAccess.mode === 'guest') {
    return <StudyDoor next={`/learn/${chapterSlug}/journey/${stationSlug}`} />;
  }

  // #94: the station walk is gated exactly like the journey map.
  const learnerId = await resolveLearnerId();
  const access = await chapterAccessStatus(chapter, learnerId);
  if (access.locked) {
    return (
      <ChapterLockedNotice
        chapterTitleFa={chapter.titleFa}
        prerequisiteSlug={access.prerequisiteSlug}
        prerequisiteTitleFa={access.prerequisiteTitleFa}
      />
    );
  }

  const station = chapter.stations.find((s) => s.slug === stationSlug);
  if (!station) notFound();

  /*
   * UX-AUDIT #137 (root C — the gate at ENTRY, not at the completion POST):
   * the station page refuses to SERVE a walk whose prerequisites are unmet —
   * the learner sees which lesson to finish first, before investing a single
   * step (the API entry gate enforces the same rule server-side for every
   * walk action; this notice is the UI face of that gate). The temporary
   * open mode keeps its bypass — one contract with the API.
   */
  const openMode = unlockAllMode() || (await previewUnlockAll());
  if (!openMode && station.prerequisites.length > 0) {
    const prereqStates = await getStationProgressStore().listForUnit(learnerId, station.prerequisites);
    const unmet = station.prerequisites.filter((slug) => {
      const st = prereqStates.find((s) => s.stationSlug === slug);
      return !st || st.status === 'in_progress';
    });
    if (unmet.length > 0) {
      const byTitle = new Map(chapter.stations.map((s) => [s.slug, s.titleFa]));
      const ordered = unmet
        .map((slug) => ({ slug, order: chapter.stations.find((s) => s.slug === slug)?.order ?? 0 }))
        .sort((a, b) => a.order - b.order);
      const first = ordered[0]!;
      return (
        <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-5 px-4 py-16 text-center">
          <span
            aria-hidden
            className="grid size-16 place-items-center rounded-full border-2 border-dashed border-ink-faint text-ink-faint"
          >
            <Lock className="size-7" />
          </span>
          <h1 className="text-h2 font-black text-indigo">{fa.curriculum.stationLockedTitle}</h1>
          <p className="max-w-md text-body leading-[var(--leading-fa)] text-ink">
            این درس هنوز باز نشده — برای شروعش ابتدا «{byTitle.get(first.slug) ?? first.slug}» را کامل کن.
          </p>
          <Link
            href={`/learn/${chapterSlug}/journey/${first.slug}`}
            className="flex h-12 items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
          >
            {fa.curriculum.goPrerequisite}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </main>
      );
    }
  }

  /*
   * TASK-LEARNING-10 §6 — the next CORE station after this one on the real
   * learning-map order (authored `order`, core path only — the same semantics
   * the island map resolves). Passed to the runner for its completion CTA:
   * «رفتن به ایستگاه بعدی» deep-linked to it, or «ادامهٔ مسیر» to the map when
   * this was the last core station (the mastery gate opens there).
   */
  const nextCoreStation =
    chapter.stations
      .slice()
      .sort((a, b) => a.order - b.order)
      .find((s) => s.core && s.order > station.order) ?? null;

  /*
   * TASK-HANASO-17: every exit from this lesson returns to the map SECTION
   * that holds this station (?s= deep-link) and the next core station is
   * passed to the runner as TEXT ONLY (never auto-opened).
   */
  const sectionSlug = sectionOfStation(chapter, stationSlug);
  const mapHref = sectionSlug ? `/learn/${chapterSlug}/journey?s=${sectionSlug}` : `/learn/${chapterSlug}/journey`;
  const replayMode = mode === 'review';
  const restartRequested = restart === '1';

  /*
   * UX-AUDIT #141 — the kana taught by the walk BEFORE this station (every
   * earlier station's kana-card glyphs, chapter walk order). The runner
   * computes the readability claims of the example cards from this context —
   * the «خواندنی است» promise tracks the lesson, never a static string.
   *
   * Issue #146 — CHAPTER-CHAIN inheritance: the chapter's declared
   * prerequisite (kana-foundation-01 → kana-expansion-01) is already
   * understood when this chapter unlocks, so its taught glyphs seed the
   * "before" context; the expansion chapter's claims stay honest from station 1.
   */
  const taughtKanaBeforeStation: string[] = [];
  const prereqGlyphs: string[] = [];
  {
    const prereq = chapter.prerequisiteChapterSlug ? getChapter(chapter.prerequisiteChapterSlug) : null;
    if (prereq) {
      for (const st of [...prereq.stations].sort((a, b) => a.order - b.order)) {
        for (const b of st.blocks) {
          if (b.kind === 'kana-card') {
            const glyph = KANA_ITEMS_BY_ID[b.kanaId]?.glyph;
            if (glyph && !prereqGlyphs.includes(glyph)) prereqGlyphs.push(glyph);
          }
        }
      }
    }
  }
  for (const g of prereqGlyphs) taughtKanaBeforeStation.push(g);
  for (const st of [...chapter.stations].filter((s) => s.order < station.order).sort((a, b) => a.order - b.order)) {
    for (const b of st.blocks) {
      if (b.kind === 'kana-card') {
        const glyph = KANA_ITEMS_BY_ID[b.kanaId]?.glyph;
        if (glyph && !taughtKanaBeforeStation.includes(glyph)) taughtKanaBeforeStation.push(glyph);
      }
    }
  }

  /*
   * Part-2 ط (the ?block= deep link — the anchor-dialogue CTA's return path):
   * the dialogue page anchors the walk at the wrap-up block and routes back
   * here. A validated block id moves the walk POINTER only (client-side walk
   * position, the same trust level as the resume anchor) — it grants no
   * progress: completion still runs the ordinary walk/completion flow.
   * KANJI-WRITE-FIX §۱ (2026-11-23): the id validates against the WALK view —
   * kanji writing decks travel as one slide per kanji (`${deckId}@${literal}`).
   */
  const walkBlockIds = new Set(splitKanjiWritingBlocks(station).blocks.map((b) => b.id));
  const initialBlockId = block && walkBlockIds.has(block) ? block : undefined;

  /*
   * Part-2 ط (G1 truly in the execution path): when THIS is the last core
   * station, its completion screen's primary CTA leads STRAIGHT to the
   * chapter gate (the assessment page) — «دروازهٔ فصل در انتظار توست» stops
   * being a dead promise one hop away on the map.
   */
  const lastCore = [...chapter.stations]
    .sort((a, b) => a.order - b.order)
    .reverse()
    .find((st) => st.core);
  const gateOpen = station.core && lastCore?.slug === station.slug;

  /*
   * TASK-HANASO-27 (F4 cross-station): practice stations reference teaching
   * blocks of EARLIER stations (spiral review). Resolve a non-local blockId
   * against the full chapter bundle → journey href to the OWNING station.
   * Serializable data only (RSC boundary): the runner turns this map into its
   * own href resolver on the client. The exercise payload never carries it.
   */
  const blockIdToStationHref: Record<string, string> = {};
  for (const st of chapter.stations) {
    const href = `/learn/${chapterSlug}/journey/${st.slug}`;
    for (const b of st.blocks) blockIdToStationHref[b.id] = href;
  }

  // client-safe exercise payloads (no answers/feedback)
  const clientExercises: Record<string, ClientExercise> = {};

  /*
   * ENGINE-REFORM §۳ (owner order 2026-11-22 «نمایش بخش منتخب مکالمه»): the
   * chapter-wide item label map for the focused-line teaching view's «آنچه این
   * خط به تو می‌آموزد» chips — computed from the REAL chapter data (words,
   * expressions, grammar clusters), never hardcoded per lesson. Any future
   * chapter's dialogue-teaches ids resolve through the same standard map.
   */
  const dialogueItemLabels: Record<string, string> = {};
  for (const w of chapter.words) dialogueItemLabels[w.id] = `${w.term} — ${w.meaningFa}`;
  for (const x of chapter.expressions) dialogueItemLabels[x.id] = `${x.ja} — ${x.functionFa}`;
  for (const g of chapter.grammar) dialogueItemLabels[g.id] = `${g.pattern} — ${g.titleFa}`;
  // AUDIO-UNIT: the words lookup the exercise audio bindings resolve against.
  const wordsByIdForChapter = new Map(chapter.words.map((w) => [w.id, w] as const));

  for (const block of station.blocks) {
    if (block.kind !== 'exercise') continue;
    for (const id of block.exerciseIds) {
      const ex = chapter.exercises[id];
      if (!ex) continue;
      const ce = toClientExercise(ex);
      /* TASK-LEARNING-08 Addendum-5 §3 — the QUESTION's own sound, attached
       * ONLY where hearing it is part of the prompt (never the answer key):
       *  - kana-listening — the sound IS the question (auto-play + replay);
       *  - kana-recall — the prompt reading's own sound (the visible Persian
       *    prompt in audio form; it cannot reveal WHICH GLYPH is correct).
       * NEVER for kana-recognition/kana-decode — there the sound equals the
       * answer and would leak it before answering (owner rule §3).
       *
       * TASK-LEARNING-13 (T1 auditory discrimination): rule-listening plays the
       * WORD's own committed recording (hostwords registry — DD-081). A missing
       * asset resolves to null and the client degrades honestly (visual-only) —
       * never a neighboring word's sound, never a dead button. */
      if (ex.type === 'kana-listening' || ex.type === 'kana-recall') {
        /* LESSON-UX P2 #203/#200 — a kana-listening item whose options are
         * multi-glyph WORDS is a word-listening question: the sound IS the
         * question and must be the WORD's own committed asset (DD-119 —
         * «صدای واژه باید واقعاً همان واژه باشد»), never the single-kana
         * registry cut. Glyph questions (single-kana options) keep the
         * per-glyph kn-* asset. The correct option's label is server-side
         * knowledge here — only the resolved audio URL crosses to the client. */
        const correctLabel = ex.options?.find((o) => o.id === ex.correctOptionId)?.label ?? '';
        ce.promptAudio =
          ex.type === 'kana-listening' && correctLabel.length > 1
            ? hostWordAudioUrls(correctLabel)
            : kanaAudioUrls(`kn-${ex.targetConcept}`);
      }
      if (ex.type === 'rule-listening' && ex.promptJa) {
        ce.promptAudio = hostWordAudioUrls(ex.promptJa);
        /* SKL-013 (answer key never crosses the boundary): for rule-listening
         * the WRITTEN word IS the answer — the sound is the question. The word
         * text never reaches the client pre-answer; the server's outcome
         * carries it (correctReading) at reveal time. */
        ce.promptJa = undefined;
        ce.promptJaReading = undefined;
      }
      /*
       * AUDIO-UNIT 2026-11-23 §۱ — the structured binding owns the question's
       * unit: a word/word-form/sentence binding resolves the QUESTION's own
       * committed asset from the words registry (DD-119 — the word's standalone
       * file, NEVER the dialogue line: «سؤال دربارهٔ یک واژه → فقط همان واژه»,
       * EQA-13 AU-1). The line button must not render beside it — exactly ONE
       * audio unit per question — so audioLineRef drops from the client
       * payload when the structured binding is present. A missing asset →
       * null → no sound control (honest absence; CI fails that state at
       * authoring time, never a silent line-audio substitute). */
      const audioBinding = resolveExerciseAudioBinding(ex);
      if (
        audioBinding &&
        (audioBinding.unit === 'word' || audioBinding.unit === 'word-form' || audioBinding.unit === 'sentence')
      ) {
        const wordsById = wordsByIdForChapter;
        const contentId = contentIdOfBinding(audioBinding, wordsById);
        ce.promptAudio = contentId ? teachingAudioUrls(contentId) : null;
        ce.audioLineRef = undefined;
      }
      /*
       * PART1-FIX-5 (evaluation criterion 5 — the answer leak): in kana-decode
       * the options ARE the Persian readings of the prompt — its
       * `promptJaReading` crossing to the client rendered the correct answer
       * directly above the options (h4 «کووکوو», h5, k8 «جووس», and every row
       * decode item). The reading never crosses pre-answer any more; the
       * server's grade outcome attaches it at reveal time (correctReading).
       */
      if (ex.type === 'kana-decode') {
        ce.promptJaReading = undefined;
      }
      clientExercises[id] = ce;
    }
  }

  // dialogue transport for the runner (lines + speaker names + audio map)
  const dialogue = bundle!.bundle.dialogue;
  const speakers: Record<string, string> = {};
  for (const id of dialogue.characterIds) speakers[id] = resolveSpeaker(id).manifest.nameFa;
  const audioByLine: Record<string, string> = {};
  const audioFallbackByLine: Record<string, string> = {};
  for (const entry of bundle!.bundle.audio.entries) {
    audioByLine[entry.lineId] = entry.files.opus;
    audioFallbackByLine[entry.lineId] = entry.files.m4a;
  }
  // Issue #103 (TASK-LEARNING-07): vocab cards prefer the word's INDEPENDENT audio
  // (wordAudio registry — DD-119) when a committed asset exists; resolution is
  // server-side (node:fs) and only the resolved URL pair crosses the RSC boundary.
  // Null = honest fallback to the source-line audio in the runner.
  const wordAudioByWord: Record<string, { opus: string; m4a: string } | null> = {};
  for (const w of chapter.words) {
    wordAudioByWord[w.id] = w.wordAudio ? wordAudioUrls(w.wordAudio) : null;
  }
  // TASK-LEARNING-08 (WP-2/WP-3 — owner feedback A): per-glyph kana audio resolved
  // server-side from the PRE-GENERATED registry (public/audio/kana — DD-081).
  // Null = no committed asset yet; the card degrades honestly.
  const kanaAudioByKanaId: Record<string, { opus: string; m4a: string } | null> = {};
  const hostWordAudioByKanaId: Record<string, { opus: string; m4a: string } | null> = {};
  for (const block of station.blocks) {
    if (block.kind === 'kana-card') {
      kanaAudioByKanaId[block.kanaId] = kanaAudioUrls(`kn-${block.kanaId}`);
      // Addendum-3 §9: the readable host word gets its OWN independent audio
      // (never the character's sound reused) — resolved from the hostwords registry.
      const hostWord = KANA_ITEMS_BY_ID[block.kanaId]?.hostWord;
      hostWordAudioByKanaId[block.kanaId] = hostWord ? hostWordAudioUrls(hostWord.word) : null;
    }
  }
  // TASK-LEARNING-08 Addendum-4 §7: EVERY example word in this station's
  // example-set blocks gets its OWN playable audio from the SAME per-word
  // registry (one asset per unique word, bound by the word itself). Null = no
  // committed asset → the example card renders NO play control (honest — never
  // a dead button and never another character/word's sound).
  const exampleAudioByWord: Record<string, { opus: string; m4a: string } | null> = {};
  for (const block of station.blocks) {
    if (block.kind === 'example-set') {
      for (const ex of block.examples) exampleAudioByWord[ex.ja] = hostWordAudioUrls(ex.ja);
    }
    // TASK-LEARNING-14: the rule-slide words join the same registry — the
    // contrast/notice/prereq slides resolve their play controls (and the
    // contrast pair's «پخش هر دو») through the exact same per-word contract.
    if (block.kind === 'rule-prereq') {
      for (const item of block.items) {
        if (item.word) exampleAudioByWord[item.word] = hostWordAudioUrls(item.word);
      }
    }
    if (block.kind === 'rule-contrast') {
      exampleAudioByWord[block.a.ja] = hostWordAudioUrls(block.a.ja);
      exampleAudioByWord[block.b.ja] = hostWordAudioUrls(block.b.ja);
    }
    if (block.kind === 'rule-step' && block.word) {
      exampleAudioByWord[block.word.ja] = hostWordAudioUrls(block.word.ja);
    }
    /*
     * TASK-HANASO-20 (BUG-008): the rule-card listening column gets REAL audio —
     * each row's audible representative resolves through the same per-word
     * registry (null row = no control, honest).
     */
    if (block.kind === 'rule-card' && block.listenWords) {
      for (const w of block.listenWords) {
        if (w) exampleAudioByWord[w] = hostWordAudioUrls(w);
      }
    }
    /*
     * LESSON-UX P2 #200 — the reading sheet's audio law: EVERYTHING written on
     * the board and the wall is hearable — items, panel leads (こんにちは！ /
     * コーヒー・セット) and the signboard sides (prices, セール, 新入荷…). Same
     * per-word hostwords registry as every other surface; null = the control
     * hides honestly (the h21 inventory gate keeps the set orphan-free).
     */
    if (block.kind === 'realworld-board') {
      for (const panel of block.panels) {
        if (panel.leadJa) exampleAudioByWord[panel.leadJa] = hostWordAudioUrls(panel.leadJa);
        for (const item of panel.items) {
          exampleAudioByWord[item.ja] = hostWordAudioUrls(item.ja);
          if (item.sideJa) exampleAudioByWord[item.sideJa] = hostWordAudioUrls(item.sideJa);
        }
      }
    }
    if (block.kind === 'word-wall') {
      for (const w of block.words) exampleAudioByWord[w.ja] = hostWordAudioUrls(w.ja);
    }
  }

  /*
   * AUDIO-UNIT/KANJI 2026-11-23 §۲ — the kanji-card data of THIS station's
   * cards: facts from the N5 reference (shape/meaning/stroke count) + the
   * anchor words resolved from the chapter's own vocabulary, each carrying
   * its OWN standalone audio pair (the D-0006 reading display rides inside
   * the anchor words — never an on/kun list). Serializable RSC transport.
   */
  const kanjiDataByKanjiId: Record<string, KanjiCardData | undefined> = {};
  for (const block of station.blocks) {
    if (block.kind !== 'kanji-card') continue;
    const ref = KANJI_ITEMS_BY_ID.get(block.kanjiId);
    if (!ref) continue;
    kanjiDataByKanjiId[block.kanjiId] = {
      kanjiId: block.kanjiId,
      literal: ref.literal,
      meaningFa: ref.meaningFa,
      strokeCount: ref.strokeCount,
      anchors: block.anchorWordIds.flatMap((wid) => {
        const w = chapter.words.find((x) => x.id === wid);
        if (!w) return [];
        return [
          {
            wordId: w.id,
            term: w.term,
            termFurigana: w.termFurigana,
            readingKana: w.readingKana,
            meaningFa: w.meaningFa,
            audio: w.wordAudio ? wordAudioUrls(w.wordAudio) : null,
          },
        ];
      }),
    };
  }

  return (
    /* TASK-LEARNING-09 §۳/§۴ — the lesson container grows with the screen:
     * phones stay compact (42rem), tablets get real horizontal room (50rem),
     * laptops 64rem, desktops cap at 72rem (≈1152px — the task's 1100–1250
     * band). The KanaCard is a @container, so ITS layout responds to the
     * actual card width, not to device names. */
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6 md:max-w-[50rem] lg:max-w-[64rem] xl:max-w-[72rem]">
      <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-faint bg-paper/95 px-4 py-3 backdrop-blur">
        <Link
          href={mapHref}
          className="flex h-11 items-center gap-1 rounded-md border border-ink-faint px-3 text-small font-bold text-ink transition-colors hover:bg-surface-warm"
        >
          <ArrowRight aria-hidden className="size-4" />
          {fa.curriculum.backToJourney}
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-body font-black text-indigo">
            <MixedFaJaText text={station.titleFa} />
          </h1>
          {/* JOURNEY-FIX 2026-11-23 §۱: the breadcrumb chapter title embeds a
              Japanese run — shared mixed-direction renderer, not raw text. */}
          <p className="truncate text-caption text-ink-soft">
            <MixedFaJaText text={chapter.titleFa} />
          </p>
        </div>
        {replayMode ? (
          /* TASK-HANASO-17 replay badge: full content, nothing re-registered. */
          <p className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-ink px-3 py-1 text-caption font-bold text-paper">
            <Repeat2 aria-hidden className="size-3.5" />
            {fa.curriculum.replayModeBadge}
          </p>
        ) : !station.core ? (
          <p className="rounded-full border border-ai px-3 py-1 text-caption text-ai">
            {fa.curriculum.stationOptional}
          </p>
        ) : null}
      </header>
      <div className="my-auto flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-1">
          <p className="text-lead text-ink-soft">
            <MixedFaJaText text={station.objectiveFa} />
          </p>
        </div>

        <StationRunner
          chapterSlug={chapterSlug}
          station={toClientStation(station)}
          chapter={{ words: chapter.words, expressions: chapter.expressions }}
          clientExercises={clientExercises}
          dialogueItemLabels={dialogueItemLabels}
          dialogue={{
            lines: dialogue.lines.map((l) => ({
              id: l.id,
              tokens: l.tokens.map((t) => ({ surface: t.surface })),
              fa: l.fa,
              speaker: l.speaker,
            })),
            speakers,
          }}
          dialogueScene={{
            /*
             * Owner order 2026-11-21 «مکالمه درون درس» — the FULL dialogue
             * bundle for the inline anchor-dialogue section (the first real
             * section of the chapter's first lesson — subtitles ON by default,
             * grading through the same /api/curriculum/station round-trip).
             * Serializable RSC transport — the same data the /dialogue page
             * already ships (no new surface).
             */
            dialogueSlug: chapter.dialogueSlug,
            dialogue,
            characters: bundle!.bundle.characters,
            audio: bundle!.bundle.audio,
          }}
          audioByLine={audioByLine}
          audioFallbackByLine={audioFallbackByLine}
          audioAvailable={bundle!.bundle.audio.available}
          wordAudioByWord={wordAudioByWord}
          kanjiDataByKanjiId={kanjiDataByKanjiId}
          kanaAudioByKanaId={kanaAudioByKanaId}
          hostWordAudioByKanaId={hostWordAudioByKanaId}
          exampleAudioByWord={exampleAudioByWord}
          nextCoreStation={nextCoreStation ? { slug: nextCoreStation.slug, titleFa: nextCoreStation.titleFa } : null}
          gateOpen={gateOpen}
          initialBlockId={initialBlockId}
          replayMode={replayMode}
          restartRequested={restartRequested}
          mapHref={mapHref}
          returnToStationHref={blockIdToStationHref}
          taughtKanaBeforeStation={taughtKanaBeforeStation}
        />
      </div>
    </main>
  );
}
