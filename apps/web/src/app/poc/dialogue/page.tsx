import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { DialogueScene } from './dialogue-scene';

/**
 * /poc/dialogue — TASK-DLG-POC-01 scene: 3 placeholder characters, active-line highlight,
 * furigana bubbles (RTL/LTR islands), transport controls, typed-error recovery banner.
 * RSC loads the bundle server-side; the client island owns playback.
 */
export default async function DialoguePage({ searchParams }: { searchParams: Promise<{ line?: string }> }) {
  const { line } = await searchParams;
  const bundle = loadDialogueBundle('cafe-morning-01');

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-caption text-ink-soft">TASK-DLG-POC-01 · صحنهٔ مکالمه (PoC)</p>
        <h1 className="text-h2 font-bold">کافه‌ای در توکیو، صبح</h1>
        <p className="text-small text-ink-soft">{bundle.dialogue.scene} — ۳ گوینده، ۱۰ خط</p>
      </header>
      <DialogueScene bundle={bundle} initialLineId={line ?? null} />
      <footer className="mt-auto border-t border-ink-faint pt-4 text-caption text-ink-soft">
        <p>
          صداها placeholder سینوسی هستند (F0 هر شخصیت متفاوت) — تولید نهایی: VOICEVOX در زمان build (ADR-009). شخصیت‌ها
          placeholder قابل‌جایگزینی طبق ADR-018 هستند.
        </p>
      </footer>
    </main>
  );
}
