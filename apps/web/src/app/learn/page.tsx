import { loadDialogue } from '@/modules/dialogue/server';
import { LearnCard } from './learn-card';

/**
 * /learn — TASK-SLICE-01 entry point of the learning experience: one attractive,
 * simple unit card («کافه — صبح») with the live A→D stage badge and a
 * «ادامه از همان مرحله» CTA. Progress comes from /api/progress (client island);
 * unit metadata is loaded server-side from the dialogue content.
 */
export default function LearnPage() {
  const dialogue = loadDialogue('cafe-morning-01');

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-14">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-ink-soft">هاناسو · مسیر یادگیری</p>
        <h1 className="text-h1 font-bold">یادگیری با مکالمه</h1>
        <p className="text-lead text-ink-soft">
          هر واحد با یک مکالمه شروع می‌شود، از دلش درس می‌گیری، با خودش تمرین می‌کنی و در پایان فهمِ همان مکالمه محک
          می‌خورد.
        </p>
      </header>

      <LearnCard dialogueId={dialogue.id} titleFa="کافه — صبح" sceneFa={dialogue.scene} jlpt="Pre-N5" />

      <footer className="mt-auto border-t border-ink-faint pt-4 text-caption text-ink-soft">
        <p>
          اولین واحد واقعی (TASK-SLICE-01)؛ واحدهای بعدی از همین چرخهٔ A→B→C→D پیروی می‌کنند. وضعیت «فهمیدم» فقط با
          قبولی در ارزیابی مرحلهٔ D ثبت می‌شود.
        </p>
      </footer>
    </main>
  );
}
