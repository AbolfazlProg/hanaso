/**
 * B4 scan 2: within-block difficulty monotonicity across ALL chapters —
 * the proposed R16 law's blast radius (real data, no speculation).
 */
import { getChapter } from '../../apps/web/src/modules/curriculum/content';

for (const slug of ['kana-foundation-01', 'kana-expansion-01', 'first-meeting-01']) {
  const ch = getChapter(slug);
  let violations = 0;
  for (const st of ch.stations) {
    for (const b of st.blocks) {
      if (b.kind !== 'exercise') continue;
      const ds = (b as any).exerciseIds.map((id: string) => (ch.exercises as any)[id]?.difficulty);
      for (let i = 1; i < ds.length; i++) {
        if (ds[i] < ds[i - 1]) {
          violations++;
          console.log(`${slug} :: ${st.slug} :: block ${b.id} :: ${ds.join(',')} :: drop at ${i}`);
        }
      }
    }
  }
  console.log(`--- ${slug}: ${violations} within-block difficulty drops`);
}
