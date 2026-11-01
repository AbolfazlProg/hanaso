import { buildInfo } from '@/lib/build-info';

const info = buildInfo();

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start gap-6 px-6 py-16">
      <header className="flex w-full flex-col gap-2">
        <p className="text-caption text-ink-soft">HANASO ·Engineering Foundation</p>
        <h1 className="font-bold text-h1">هاناسو</h1>
        <p className="text-lead text-ink-soft">
          وب‌سایت آموزش زبان ژاپنی برای فارسی‌زبانان — در مرحلهٔ ساخت زیرساخت (فاز M0).
        </p>
      </header>

      <section className="flex w-full flex-col gap-2">
        <h2 className="text-h3 font-bold">وضعیت این نسخه</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body">
          <dt className="text-ink-soft">نسخه</dt>
          <dd>
            <code>{info.version}</code>
          </dd>
          <dt className="text-ink-soft">کامیت</dt>
          <dd>
            <code>{info.commitSha}</code>
          </dd>
          <dt className="text-ink-soft">محیط</dt>
          <dd>
            <code>{info.env}</code>
          </dd>
        </dl>
        <p className="text-small text-ink-soft">
          سلامت سرویس:{' '}
          <a className="text-ai underline" href="/api/health">
            /api/health
          </a>{' '}
          ·{' '}
          <a className="text-ai underline" href="/api/ready">
            /api/ready
          </a>
        </p>
      </section>

      <section className="flex w-full flex-col gap-3">
        <h2 className="text-h3 font-bold">نمونهٔ دوجهسته (RTL فارسی + LTR ژاپنی)</h2>
        <p className="text-body">
          این محصول برای فارسی‌زبانان ساخته می‌شود؛ متن ژاپنی همیشه در بلوکِ چپ‌به‌راستِ جدا نمایش داده می‌شود.
        </p>
        <p
          lang="ja"
          dir="ltr"
          className="ja-block rounded-md border border-ink-faint bg-surface-warm px-4 py-3 text-ja"
        >
          こんにちは、「はなそ」へようこそ。日本語とペルシャ語のあたらしい学び方が、ここからはじまります。
        </p>
      </section>

      <footer className="mt-auto flex w-full flex-col gap-1 border-t border-ink-faint pt-4 text-caption text-ink-soft">
        <p>مشخصات و پژوهش: مرکز دانش japanese-learning-kb · نقشهٔ پروژه: PROJECT_STATUS.md</p>
        <p>
          اولین مسیر واقعی یادگیری (چرخهٔ مکالمه ← درس ← تمرین ← فهم) در{' '}
          <a className="text-ai underline" href="/learn">
            /learn
          </a>{' '}
          آماده است — TASK-SLICE-01.
        </p>
      </footer>
    </main>
  );
}
