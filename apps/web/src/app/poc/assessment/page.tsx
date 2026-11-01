import { loadDialogue } from '@/modules/dialogue/server';
import { AssessmentForm, type AssessmentQuestion } from './assessment-form';

/**
 * /poc/assessment — TASK-DLG-POC-01 stage-D sample: 3 comprehension questions
 * (M1 meaning / M3 grammar / M5 speaker&intent) from the cafe dialogue → POST /api/attempts.
 */
export default function AssessmentPage() {
  const dialogue = loadDialogue('cafe-morning-01');
  const linesById = new Map(dialogue.lines.map((l) => [l.id, l]));
  const l3 = linesById.get('s-cafe-morning-01-l3');
  const l8 = linesById.get('s-cafe-morning-01-l8');

  const questions: AssessmentQuestion[] = [
    {
      id: 'q-m1-kekkou',
      measure: 'M1',
      measureLabelFa: 'درک معنا',
      promptFa: 'جملهٔ زیر چه معنایی دارد؟',
      jpTokens: l8?.tokens,
      options: [
        { id: 'a', labelFa: 'شیر هم اضافه کنید، لطفاً.' },
        { id: 'b', labelFa: 'شیر نمی‌خواهم، ممنون.' },
        { id: 'c', labelFa: 'شیر جای دیگری سرو می‌شود.' },
      ],
      correctOptionId: 'b',
      weakPoint: { lineId: 's-cafe-morning-01-l8', objective: 'voc-kekkou-desu', severity: 'high' },
    },
    {
      id: 'q-m3-wo',
      measure: 'M3',
      measureLabelFa: 'ساختار (cloze ذره)',
      promptFa: 'جملهٔ درست کدام است؟',
      options: [
        { id: 'a', labelFa: 'コーヒーをお願いします', jp: true },
        { id: 'b', labelFa: 'コーヒーはお願いします', jp: true },
        { id: 'c', labelFa: 'コーヒーがお願いします', jp: true },
      ],
      correctOptionId: 'a',
      weakPoint: { lineId: 's-cafe-morning-01-l2', objective: 'gr-wo-object', severity: 'medium' },
    },
    {
      id: 'q-m5-speaker',
      measure: 'M5',
      measureLabelFa: 'گوینده و نیّت',
      promptFa: '«しょうしょうお待ちください» را چه کسی و با چه نیّتی گفت؟',
      jpTokens: l3?.tokens,
      options: [
        { id: 'a', labelFa: 'یامادا (کارمند) — درخواست صبر تا آماده‌شدن سفارش.' },
        { id: 'b', labelFa: 'میکی — عذرخواهی برای دیر رسیدن.' },
        { id: 'c', labelFa: 'سورا — خداحافظی و قرار بعداً.' },
      ],
      correctOptionId: 'a',
      weakPoint: { lineId: 's-cafe-morning-01-l3', objective: 'speaker-intent-service', severity: 'low' },
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-caption text-ink-soft">TASK-DLG-POC-01 · آزمون فهم (مرحلهٔ D — نمونهٔ ۳سؤالی)</p>
        <h1 className="text-h2 font-bold">مکالمهٔ کافه را چقدر فهمیدی؟</h1>
        <p className="text-small text-ink-soft">
          پاسخ‌ها در سرور نمره‌گذاری و در /api/attempts ثبت می‌شوند؛ نتیجه کیفی است (AC-947).
        </p>
      </header>
      <AssessmentForm dialogueId={dialogue.id} questions={questions} />
      <footer className="mt-auto border-t border-ink-faint pt-4 text-caption text-ink-soft">
        <p>
          بانک کامل مرحلهٔ D جدا از تمرین‌هاست (comprehension_banks) و هر ۵ سنجهٔ M1..M5 را می‌سنجد؛ این فرم فقط نمونهٔ
          اتصال برای PoC است.
        </p>
      </footer>
    </main>
  );
}
