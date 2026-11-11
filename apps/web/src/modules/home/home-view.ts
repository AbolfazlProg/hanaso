/**
 * HANASO — Home dashboard view resolver (TASK-HANASO-17) — PURE module.
 *
 * «داشبورد یک تصمیم است، نه ویترین» (KB dashboard-blueprint §۱): the home
 * page's single job is answering «امروز چه کار کنم؟» in one glance and
 * sending the learner INTO the real lesson with ONE click.
 *
 * This module turns a snapshot of REAL progress facts into the home view
 * model. It is pure: same input → same output; every state is derived from
 * the learner's actual journey (never a frontend constant, never a fake
 * number). The server twin (./server.ts) gathers the facts; this file never
 * touches stores.
 *
 * State priority of the ONE primary CTA (HOME_INFORMATION_ARCHITECTURE §۲):
 *   all-understood → review the course map
 *   in-progress station → resume it (fresh) / restart it (expired ≥7d)
 *   core path complete → the mastery gate
 *   next available core station → start / next lesson
 *   fallback → the learning map (never a dead end)
 *
 * Anti-fake rules (owner §3.2 + mission «هیچ عدد ساختگی»): the review card
 * NEVER invents a count — with the FSRS engine not integrated it renders an
 * honest queue-pending note or stays hidden; with the engine live it uses the
 * real due count. No future totals, no «n از m» of the whole course.
 */
import { resumeFreshness } from '@/modules/curriculum/resume-policy';

/** The ONE primary CTA of the home page (its learner-state variant). */
export type HomePrimaryState =
  | 'start' // brand-new learner — first lesson of the active chapter
  | 'resume' // mid-lesson, resume pointer still fresh (< 7d meaningful activity)
  | 'resume_expired' // mid-lesson but stale (≥ 7d) → restart from the top
  | 'next' // previous lessons done → the next available core lesson
  | 'gate' // core path complete → the mastery gate (stage D)
  | 'review_course'; // every chapter understood → the map in review mode

/** Facts the server gathers for the ACTIVE chapter (walk-order semantics). */
export interface HomeJourneyFacts {
  chapterSlug: string;
  chapterTitleFa: string;
  coreCompleted: number;
  corePathComplete: boolean;
  /** First AVAILABLE core station in walk order (prereqs satisfied). */
  nextStation: { slug: string; titleFa: string; estMinutes: number } | null;
  /** The learner's in-progress/needs_retry station (core preferred, walk order). */
  inProgress: {
    slug: string;
    titleFa: string;
    estMinutes: number;
    /** Epoch ms of the last MEANINGFUL activity (null = legacy row → unknown). */
    lastActivityAtMs: number | null;
  } | null;
}

/** Whole-course facts (progress + honest counters). */
export interface HomeCourseFacts {
  /** True when EVERY chapter reached `understood`. */
  allUnderstood: boolean;
  /** Understood chapters in course order (the archive). */
  archive: { slug: string; titleFa: string }[];
  /** Terminal (completed/needs_retry/skipped) stations across ALL chapters. */
  stationsCompletedTotal: number;
  /** Title of the course's last chapter (review target). */
  lastChapterTitleFa: string | null;
}

/** Review scheduler facts (honest — never a fabricated count). */
export interface HomeReviewFacts {
  /** FSRS engine status (today: 'not-integrated'). */
  fsrsActive: boolean;
  /** Real due count — only meaningful when fsrsActive. */
  dueCount: number;
}

/** Everything resolveHomeView needs. `nowMs` is injected (clock-free tests). */
export interface HomeInput {
  nowMs: number;
  journey: HomeJourneyFacts;
  course: HomeCourseFacts;
  review: HomeReviewFacts;
}

/** The resolved primary CTA. */
export interface HomePrimaryCta {
  state: HomePrimaryState;
  href: string;
  stationTitleFa: string | null;
  chapterTitleFa: string | null;
  estMinutes: number | null;
}

/** The secondary «درس بعدی» card (null = hidden — never a duplicate target). */
export interface HomeNextLesson {
  slug: string;
  titleFa: string;
  estMinutes: number;
  href: string;
}

/** The honest review presentation (kind drives rendering). */
export type HomeReviewCard =
  | { kind: 'hidden' } // nothing real to say (brand-new learner, engine off)
  | { kind: 'queue_pending' } // cards enrolled, engine not active yet — quiet note
  | { kind: 'due'; count: number } // engine live, real due count (future)
  | { kind: 'empty' }; // engine live, nothing due (future)

/** The whole home view model. */
export interface HomeView {
  primary: HomePrimaryCta;
  nextLesson: HomeNextLesson | null;
  review: HomeReviewCard;
  /** Compact path strip — the ONLY place chapter progress appears on home. */
  path: { href: string; chapterTitleFa: string; coreCompleted: number };
  /** Honest one-line stats (null for a brand-new learner). */
  stats: { stationsCompleted: number; chaptersUnderstood: number } | null;
  /** True when the resume pointer expired — tone flag only (no red numbers). */
  returningAfterAbsence: boolean;
}

export function resolveHomeView(input: HomeInput): HomeView {
  const { journey, course, review } = input;

  /* ---- the ONE primary CTA (priority order — see module doc) ---- */
  let primary: HomePrimaryCta;
  let returningAfterAbsence = false;

  if (course.allUnderstood) {
    primary = {
      state: 'review_course',
      href: '/learn',
      stationTitleFa: course.lastChapterTitleFa,
      chapterTitleFa: null,
      estMinutes: null,
    };
  } else if (journey.inProgress) {
    const freshness = resumeFreshness(journey.inProgress.lastActivityAtMs, input.nowMs);
    const stationPath = `/learn/${journey.chapterSlug}/journey/${journey.inProgress.slug}`;
    if (freshness === 'expired') {
      returningAfterAbsence = true;
      primary = {
        state: 'resume_expired',
        href: `${stationPath}?restart=1`,
        stationTitleFa: journey.inProgress.titleFa,
        chapterTitleFa: journey.chapterTitleFa,
        estMinutes: journey.inProgress.estMinutes,
      };
    } else {
      primary = {
        state: 'resume',
        href: stationPath,
        stationTitleFa: journey.inProgress.titleFa,
        chapterTitleFa: journey.chapterTitleFa,
        estMinutes: journey.inProgress.estMinutes,
      };
    }
  } else if (journey.corePathComplete) {
    primary = {
      state: 'gate',
      href: `/learn/${journey.chapterSlug}/assessment`,
      stationTitleFa: null,
      chapterTitleFa: journey.chapterTitleFa,
      estMinutes: null,
    };
  } else if (journey.nextStation) {
    // copy distinction (PG-01): a brand-new learner reads «شروع یادگیری»;
    // from the second lesson on it is «شروع درس بعدی» — same target, honest label.
    primary = {
      state: journey.coreCompleted > 0 ? 'next' : 'start',
      href: `/learn/${journey.chapterSlug}/journey/${journey.nextStation.slug}`,
      stationTitleFa: journey.nextStation.titleFa,
      chapterTitleFa: journey.chapterTitleFa,
      estMinutes: journey.nextStation.estMinutes,
    };
  } else {
    // honest fallback: no startable lesson on the active chapter (all optional
    // done, gate unavailable?) — the map is always a valid destination.
    primary = {
      state: 'start',
      href: '/learn',
      stationTitleFa: null,
      chapterTitleFa: journey.chapterTitleFa,
      estMinutes: null,
    };
  }

  /* ---- secondary «درس بعدی» — only a DIFFERENT startable lesson ---- */
  let nextLesson: HomeNextLesson | null = null;
  if (
    journey.nextStation &&
    // hidden whenever the primary CTA already targets this very station
    // (start/next states) — never a duplicate card (owner §3.3)
    (primary.state === 'resume' || primary.state === 'resume_expired')
  ) {
    nextLesson = {
      slug: journey.nextStation.slug,
      titleFa: journey.nextStation.titleFa,
      estMinutes: journey.nextStation.estMinutes,
      href: `/learn/${journey.chapterSlug}/journey/${journey.nextStation.slug}`,
    };
  }

  /* ---- review card: honest states only (mission §3.2) ---- */
  let reviewCard: HomeReviewCard;
  if (review.fsrsActive) {
    reviewCard = review.dueCount > 0 ? { kind: 'due', count: review.dueCount } : { kind: 'empty' };
  } else {
    // engine not integrated: a quiet honest note once cards exist, else hidden
    reviewCard = course.stationsCompletedTotal > 0 ? { kind: 'queue_pending' } : { kind: 'hidden' };
  }

  /* ---- path strip + honest stats ---- */
  const stats =
    course.stationsCompletedTotal > 0 || course.archive.length > 0
      ? { stationsCompleted: course.stationsCompletedTotal, chaptersUnderstood: course.archive.length }
      : null;

  return {
    primary,
    nextLesson,
    review: reviewCard,
    path: {
      href: '/learn',
      chapterTitleFa: journey.chapterTitleFa,
      coreCompleted: journey.coreCompleted,
    },
    stats,
    returningAfterAbsence,
  };
}

/** Persian day-line for the greeting (PG-01: short header + date, no name). */
export function faDateLine(nowMs: number): string {
  return new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tehran',
  }).format(new Date(nowMs));
}
