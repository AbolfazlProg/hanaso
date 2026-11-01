import { T2EvalForm } from './t2-eval-form';

/**
 * /poc/t2-eval — TASK-DLG-POC-01 / T2: blind speaker-identification form (evaluation harness).
 * The verdict (≥80%, n≥5 evaluators) is recorded by the owner on Preview with real voices;
 * this page delivers the procedure + sample files (after `pnpm gen:audio`).
 */
export default function T2EvalPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-caption text-ink-soft">TASK-DLG-POC-01 · آزمون T2 — تشخیص دوسوکور گوینده</p>
        <h1 className="text-h2 font-bold">این جمله را چه کسی گفت؟</h1>
      </header>
      <T2EvalForm />
      <footer className="mt-auto border-t border-ink-faint pt-4 text-caption text-ink-soft">
        <p>
          رجیستری صداها و ماتریس تمایز: <code>src/modules/audio/content/voices.yaml</code> — سه صدا با F0 های
          ۱۱۰/۱۶۰/۲۱۰ هرتز (محور زیر و بمی) + هارمونیک متفاوت (جنس).
        </p>
      </footer>
    </main>
  );
}
