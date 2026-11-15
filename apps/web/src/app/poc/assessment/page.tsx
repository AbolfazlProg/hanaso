import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { buildAssessmentQuestions, toClientQuestions } from '@/lib/poc/assessment-bank';
import { AssessmentForm } from './assessment-form';
import { guardPocPage } from '@/lib/poc/page-guard';

/**
 * /poc/assessment — TASK-SLICE-01 stage D: 5 comprehension questions covering ALL
 * measures M1..M5 (meaning / vocab-in-context / grammar cloze / blind listening /
 * speaker & intent) from the cafe dialogue → POST /api/attempts → D→understood via
 * /api/progress when passed. The production bank lives in content.comprehension_banks
 * (separate from the C exercises — AC-952); this is the slice's sample of that bank.
 */
export default function AssessmentPage() {
  guardPocPage(); // TASK-HANASO-24: dev/test-only legacy page — 404 in production

  const bundle = loadDialogueBundle('cafe-morning-01');

  // Server-only: the answer key stays here — the client receives the secret-free projection.
  const questions = toClientQuestions(buildAssessmentQuestions(bundle));

  const audioByLine: Record<string, string> = {};
  for (const entry of bundle.audio.entries) audioByLine[entry.lineId] = entry.files.opus;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-caption text-ink-soft">TASK-SLICE-01 · آزمون فهم (مرحلهٔ D — هر ۵ سنجه)</p>
        <h1 className="text-h2 font-bold">مکالمهٔ کافه را چقدر فهمیدی؟</h1>
        <p className="text-small text-ink-soft">
          پاسخ‌های خام فقط به سرور ارسال و همان‌جا نمره‌گذاری می‌شوند (کلید پاسخ هرگز به مرورگر نمی‌آید)؛ نتیجه کیفی است
          (AC-947). قبولی = ثبت رسمی «فهمیدم» برای واحد.
        </p>
      </header>
      <AssessmentForm
        dialogueId={bundle.dialogue.id}
        questions={questions}
        audioByLine={audioByLine}
        audioAvailable={bundle.audio.available}
      />
      <footer className="mt-auto border-t border-ink-faint pt-4 text-caption text-ink-soft">
        <p>
          بانک کامل مرحلهٔ D جدا از تمرین‌هاست (comprehension_banks — AC-952) و هر ۵ سنجهٔ M1..M5 را می‌سنجد؛ این نمونهٔ
          ۵سؤالی همان ساختار را از خودِ مکالمهٔ کافه پیاده می‌کند.
        </p>
      </footer>
    </main>
  );
}
