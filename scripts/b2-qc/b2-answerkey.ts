/**
 * B2 QC — extract the WALK ANSWER KEY for stations 07-12 of first-meeting-01.
 * Output: JSON the Playwright walker consumes (click-by-label), so the real
 * browser session answers every graded surface correctly.
 *   exercises[exId] = { prompt, kind, labels[] , name? }
 *   discoveries[question] = label
 *   sceneReplies[prompt] = { labels[], name? }
 */
import { writeFileSync } from 'node:fs';
import { getChapter } from '../../apps/web/src/modules/curriculum/content';
import type { TeachingBlock } from '../../apps/web/src/modules/curriculum/types';

const ch = getChapter('first-meeting-01');
const NAME = '[نامت]';

const out: Record<string, unknown> = {};

for (const stn of ch.stations) {
  if (stn.order < 7 || stn.order > 12) continue;
  const exercises: Record<string, unknown> = {};
  const discoveries: Record<string, string> = {};
  const sceneReplies: Record<string, unknown> = {};

  for (const b of stn.blocks as TeachingBlock[]) {
    if (b.kind === 'exercise') {
      for (const id of (b as { exerciseIds: string[] }).exerciseIds) {
        const ex = ch.exercises[id];
        if (!ex) continue;
        if (ex.options) {
          const correct = ex.options.find((o) => o.id === ex.correctOptionId);
          exercises[id] = { prompt: ex.promptFa, kind: 'option', labels: [correct?.label] };
        } else if (ex.chunks) {
          const labels = (ex.correctOrder ?? []).map((cid) => ex.chunks!.find((c) => c.id === cid)?.ja ?? cid);
          exercises[id] = { prompt: ex.promptFa, kind: 'order', labels };
        } else if (ex.chips) {
          const labels = (ex.acceptedChipOrder ?? []).map((cid) => ex.chips!.find((c) => c.id === cid)?.ja ?? cid);
          exercises[id] = {
            prompt: ex.promptFa,
            kind: 'build',
            labels: labels.map((l) => (l === '___NAME___' ? NAME : l)),
            name: labels.includes('___NAME___') ? 'آرش' : undefined,
          };
        }
      }
    }
    if (b.kind === 'guided-discovery') {
      const gd = b as unknown as {
        questionFa: string;
        options: { id: string; label: string }[];
        correctOptionId: string;
      };
      const correct = gd.options.find((o) => o.id === gd.correctOptionId);
      discoveries[gd.questionFa] = correct?.label ?? '';
    }
    if (b.kind === 'character-scene') {
      const cs = b as unknown as {
        steps: {
          fa?: string;
          userReply?: {
            kind: string;
            promptFa?: string;
            chips?: { id: string; ja: string }[];
            acceptedChipOrder?: string[];
            acceptedOrders?: string[][];
            options?: { id: string; label: string }[];
            correctOptionId?: string;
          };
        }[];
      };
      for (const s of cs.steps ?? []) {
        const r = s.userReply;
        if (!r || !r.promptFa) continue;
        if (r.kind === 'choice') {
          const correct = (r.options ?? []).find((o) => o.id === r.correctOptionId);
          sceneReplies[r.promptFa] = { labels: [correct?.label], name: undefined };
        } else if (r.chips) {
          /* the character-scene spec uses acceptedOrders (a list of orders) */
          const accepted = r.acceptedChipOrder ?? r.acceptedOrders?.[0];
          const labels = (accepted ?? []).map((cid) => r.chips!.find((c) => c.id === cid)?.ja ?? cid);
          sceneReplies[r.promptFa] = {
            labels: labels.map((l) => (l === '___NAME___' ? NAME : l)),
            name: labels.includes('___NAME___') ? 'آرش' : undefined,
          };
        }
      }
    }
  }
  out[stn.slug] = { exercises, discoveries, sceneReplies };
}

writeFileSync('/tmp/b2-answerkey.json', JSON.stringify(out, null, 1));
console.log('answer key written: /tmp/b2-answerkey.json');
for (const [slug, v] of Object.entries(out)) {
  const x = v as { exercises: object; discoveries: object; sceneReplies: object };
  console.log(
    `${slug}: ${Object.keys(x.exercises).length} exercises, ${Object.keys(x.discoveries).length} discoveries, ${Object.keys(x.sceneReplies).length} scene replies`,
  );
}
