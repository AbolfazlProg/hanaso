import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { buildInfo } from '@/lib/build-info';

const info = buildInfo();

/**
 * / — خانهٔ HANASO با هویت Aizen (TASK-DSGN-01 / DD-084):
 * نوار نیلی ساختاری با موتیف青海波 (`.band-indigo`) + تایپوگرافی پوستری ۹۰۰ +
 * زیرنویس ژاپنی با tracking باز + نوار برش شنگرف/کاغذ. سطوح پایین: قاب‌های
 * newspaper-grid روی کاغذ روشن. محتوای اطلاعاتی (نسخه/سلامت) دست‌نخورده.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* — نوار نیلی هیرو — لنگر ساختاری Aizen — */}
      <header className="band-indigo">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-5 px-6 py-20">
          <p className="rounded-sm border border-indigo-mist/35 px-3.5 py-1 text-caption font-medium tracking-[0.18em] text-indigo-mist">
            هاناسو · HANASO — زیرساخت مهندسی
          </p>
          <h1 className="text-hero-fa font-black tracking-fa-display leading-[1.22]">
            هاناسو
            <span
              lang="ja"
              dir="ltr"
              className="ja-block mt-3 block text-[0.52em] font-black tracking-poster text-speaker-1-l"
            >
              日本語を、会話から学ぶ
            </span>
          </h1>
          <p className="max-w-[58ch] text-lead text-indigo-mist">
            وب‌سایت آموزش زبان ژاپنی برای فارسی‌زبانان — <b className="text-paper">مکالمه‌محور</b>، با تکرارهای هوشمند و
            مسیر یادگیری مبتنی بر گفت‌وگو. در مرحلهٔ ساخت زیرساخت (فاز M0).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <a href="/learn" className={cn(buttonVariants({ variant: 'cta', size: 'main' }))}>
              شروع مکالمهٔ نمونه
            </a>
            <a href="/poc/ui" className={cn(buttonVariants({ variant: 'secondary', size: 'main' }))}>
              نمونهٔ رندر رابط
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-12">
        {/* — وضعیت این نسخه — */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <span aria-hidden className="inline-block h-6.5 w-1.5 bg-shu" />
            <h2 className="text-h3 font-extrabold">وضعیت این نسخه</h2>
            <span className="ms-auto border-b-2 border-indigo pb-1 text-caption uppercase tracking-[0.18em] text-ink-faint">
              Status
            </span>
          </div>
          <dl className="frame-ink grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg bg-card p-5 text-body shadow-card">
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

        {/* — نمونهٔ دوجهسته — */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <span aria-hidden className="inline-block h-6.5 w-1.5 bg-shu" />
            <h2 className="text-h3 font-extrabold">نمونهٔ دوجهسته (RTL فارسی + LTR ژاپنی)</h2>
            <span className="ms-auto border-b-2 border-indigo pb-1 text-caption uppercase tracking-[0.18em] text-ink-faint">
              Bilingual
            </span>
          </div>
          <p className="text-body">
            این محصول برای فارسی‌زبانان ساخته می‌شود؛ متن ژاپنی همیشه در بلوکِ چپ‌به‌راستِ جدا نمایش داده می‌شود.
          </p>
          <p lang="ja" dir="ltr" className="ja-block frame-ink rounded-lg bg-card px-4 py-3 text-ja shadow-card">
            こんにちは、「はなそ」へようこそ。日本語とペルシャ語のあたらしい学び方が、ここからはじまります。
          </p>
        </section>
      </main>

      <footer className="border-t-4 border-indigo px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-1 text-caption text-ink-soft">
          <p>مشخصات و پژوهش: مرکز دانش japanese-learning-kb · نقشهٔ پروژه: PROJECT_STATUS.md</p>
          <p>
            اولین مسیر واقعی یادگیری (چرخهٔ مکالمه، درس، تمرین و فهم) در{' '}
            <a className="text-ai underline" href="/learn">
              /learn
            </a>{' '}
            آماده است — TASK-SLICE-01.
          </p>
        </div>
      </footer>
    </div>
  );
}
