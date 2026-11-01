import Link from 'next/link';
import { buildLessonFromDialogue } from '@/lib/poc/lesson-items';
import { loadDialogue } from '@/modules/dialogue/server';
import { JpLine } from '../jp-text';

/**
 * /poc/lesson — TASK-DLG-POC-01 / T6: vocabulary & grammar cards derived from the SAME
 * dialogue content, each wired to its lines («در مکالمه ببین» → /poc/dialogue?line=…).
 * The dialogue bubbles link back here (bidirectional T6 wiring).
 */
export default function LessonPage() {
  const dialogue = loadDialogue('cafe-morning-01');
  const lesson = buildLessonFromDialogue(dialogue);
  const linesById = new Map(dialogue.lines.map((l) => [l.id, l]));

  const vocab = lesson.items.filter((i) => i.kind === 'vocab');
  const grammar = lesson.items.filter((i) => i.kind === 'grammar');
  const chunks = lesson.items.filter((i) => i.kind === 'chunk');

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-caption text-ink-soft">TASK-DLG-POC-01 · درس مکالمه‌محور (مرحلهٔ B — نمونه)</p>
        <h1 className="text-h2 font-bold">واژه‌ها و الگوهای «کافه، صبح»</h1>
        <p className="text-small text-ink-soft">
          همهٔ کارت‌ها از همان دیالوگ مشتق شده‌اند؛ «در مکالمه ببین» شما را به خط مربوط می‌برد (T6).
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 text-small">
        <a href="#sec-vocab" className="rounded-md border border-ink-faint px-3 py-1.5">
          واژه‌ها
        </a>
        <a href="#sec-grammar" className="rounded-md border border-ink-faint px-3 py-1.5">
          گرامر
        </a>
        <a href="#sec-chunks" className="rounded-md border border-ink-faint px-3 py-1.5">
          قطعه‌های ثابت
        </a>
        <Link href="/poc/dialogue" className="rounded-md bg-ai px-3 py-1.5 text-paper">
          بازگشت به مکالمه
        </Link>
      </nav>

      <section id="sec-vocab" className="flex flex-col gap-3">
        <h2 className="text-h3 font-bold">واژه‌های کلیدی</h2>
        {vocab.map((item) => {
          const firstLine = linesById.get(item.lineIds[0] ?? '');
          return <Card key={item.id} item={item} firstLine={firstLine} />;
        })}
      </section>

      <section id="sec-grammar" className="flex flex-col gap-3">
        <h2 className="text-h3 font-bold">الگوی گرامری</h2>
        {grammar.map((item) => {
          const firstLine = linesById.get(item.lineIds[0] ?? '');
          return (
            <Card key={item.id} item={item} firstLine={firstLine}>
              {item.workedExample && (
                <div className="mt-2 rounded-md bg-surface-muted px-3 py-2 text-small">
                  <p className="mb-1 text-caption text-ink-soft">مثال حل‌شده (از خودِ مکالمه):</p>
                  <JpLine tokens={linesById.get(item.workedExample.lineId)?.tokens ?? []} className="text-ja" />
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {item.workedExample.parse.map((p) => (
                      <li key={p.token}>
                        <bdi lang="ja" dir="ltr" className="text-ja">
                          {p.token}
                        </bdi>{' '}
                        = {p.role}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </section>

      <section id="sec-chunks" className="flex flex-col gap-3">
        <h2 className="text-h3 font-bold">قطعه‌های ثابت (بدون تحلیل واجی)</h2>
        {chunks.map((item) => {
          const firstLine = linesById.get(item.lineIds[0] ?? '');
          return <Card key={item.id} item={item} firstLine={firstLine} />;
        })}
      </section>

      <footer className="mt-auto border-t border-ink-faint pt-4 text-caption text-ink-soft">
        <p>
          نمونهٔ مرحلهٔ B طبق KB lesson-from-dialogue — تولید کامل بخش‌ها از موتور محتواست، اینجا دستی برای PoC ساخته
          شده و با `teaches` خطوط دیالوگ اعتبارسنجی می‌شود (بدون آیتم یتیم).
        </p>
      </footer>
    </main>
  );
}

function Card({
  item,
  firstLine,
  children,
}: {
  item: {
    id: string;
    kind: string;
    surface: string;
    reading?: string;
    meaningFa: string;
    noteFa?: string;
    lineIds: string[];
  };
  firstLine?: { id: string; fa: string; tokens: { surface: string; reading: string }[] };
  children?: React.ReactNode;
}) {
  return (
    <article
      id={`item-${item.id}`}
      className="flex scroll-mt-24 flex-col gap-2 rounded-lg border border-ink-faint bg-paper p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <JpLine
          tokens={[{ surface: item.surface, reading: item.reading ?? item.surface }]}
          className="text-lead font-bold"
        />
        <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-caption text-ink-soft">{item.kind}</span>
      </div>
      <p className="text-body">{item.meaningFa}</p>
      {item.noteFa && <p className="text-small text-ink-soft">{item.noteFa}</p>}
      {firstLine && (
        <div className="rounded-md bg-surface-warm px-3 py-2">
          <p className="mb-1 text-caption text-ink-soft">در مکالمه:</p>
          <JpLine tokens={firstLine.tokens} className="text-ja" />
          <p className="mt-1 text-small text-ink-soft">{firstLine.fa}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {item.lineIds.map((lineId) => (
          <Link
            key={lineId}
            href={`/poc/dialogue?line=${lineId}`}
            className="rounded-md bg-ai px-3 py-1.5 text-small text-paper"
          >
            در مکالمه ببین ↗
          </Link>
        ))}
      </div>
      {children}
    </article>
  );
}
