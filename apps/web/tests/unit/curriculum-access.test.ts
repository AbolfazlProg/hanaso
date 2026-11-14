/**
 * HANASO — Chapter access tests (TASK-LEARNING-07 Wave 3 — Issue #94 residual).
 *
 * chapterAccessStatus (modules/curriculum/server) is the ONE computation behind
 * every page-level chapter gate: /learn index, the journey map, and (Wave 3) the
 * station + anchor-dialogue deep links. These tests pin its contract over the
 * real bundled chapters with the DEV-ONLY in-memory progress store (DATABASE_URL
 * neutralized by the unit vitest config):
 * - no declared prerequisite → always unlocked (the kana foundation chapter);
 * - prerequisite declared → locked until that chapter's gate reads `understood`
 *   (started / stations_complete are NOT enough — only DD-048's «فهمیدم» opens it);
 * - `understood` → unlocked.
 */
import { describe, expect, it } from 'vitest';
import { getChapter } from '@/modules/curriculum/content';
import { chapterAccessStatus } from '@/modules/curriculum/server';
import { getChapterProgressStore } from '@/lib/poc/stores';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';

describe('chapterAccessStatus — the chapter soft lock (#94 / DD-117/120)', () => {
  it('a chapter without a declared prerequisite is always unlocked', async () => {
    const access = await chapterAccessStatus(getChapter('kana-foundation-01')!, POC_DEFAULT_USER_ID);
    expect(access.locked).toBe(false);
    expect(access.prerequisiteSlug).toBeNull();
    expect(access.prerequisiteTitleFa).toBeNull();
  });

  it('the conversation chapter stays locked while the kana gate is not understood', async () => {
    // no chapter progress recorded → locked, and the notice can name the prereq
    const access = await chapterAccessStatus(getChapter('first-meeting-01')!, POC_DEFAULT_USER_ID);
    expect(access.locked).toBe(true);
    expect(access.prerequisiteSlug).toBe('kana-foundation-01');
    expect(access.prerequisiteTitleFa).toBe(getChapter('kana-foundation-01')!.titleFa);
  });

  it('walking the prerequisite without passing its gate is NOT enough (only understood unlocks)', async () => {
    const store = getChapterProgressStore();
    await store.upsert(POC_DEFAULT_USER_ID, 'kana-foundation-01', {
      status: 'stations_complete',
      bestWeighted: null,
      bestMeasures: null,
      remediationCount: 0,
    });
    const access = await chapterAccessStatus(getChapter('first-meeting-01')!, POC_DEFAULT_USER_ID);
    expect(access.locked).toBe(true);
  });

  it('passing the prerequisite gate (understood — DD-048) unlocks the chapter', async () => {
    const store = getChapterProgressStore();
    await store.upsert(POC_DEFAULT_USER_ID, 'kana-foundation-01', {
      status: 'understood',
      bestWeighted: 0.95,
      bestMeasures: null,
      remediationCount: 0,
    });
    const access = await chapterAccessStatus(getChapter('first-meeting-01')!, POC_DEFAULT_USER_ID);
    expect(access.locked).toBe(false);
    expect(access.prerequisiteSlug).toBe('kana-foundation-01'); // still named for the UI
  });
});
