import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { AssessmentForm, type AssessmentQuestion } from './assessment-form';

/**
 * /poc/assessment — TASK-SLICE-01 stage D: 5 comprehension questions covering ALL
 * measures M1..M5 (meaning / vocab-in-context / grammar cloze / blind listening /
 * speaker & intent) from the cafe dialogue → POST /api/attempts → D→understood via
 * /api/progress when passed. The production bank lives in content.comprehension_banks
 * (separate from the C exercises — AC-952); this is the slice's sample of that bank.
 */
export default function AssessmentPage() {
  const bundle = loadDialogueBundle('cafe-morning-01');
  const linesById = new Map(bundle.dialogue.lines.map((l) => [l.id, l]));
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
      id: 'q-m2-shoushou',
      measure: 'M2',
      measureLabelFa: 'واژه در بافت',
      promptFa: 'در جملهٔ زیر، واژهٔ «しょうしょう» چه معنایی دارد؟',
      jpTokens: l3?.tokens,
      options: [
        { id: 'a', labelFa: 'خیلی زیاد / بسیار' },
        { id: 'b', labelFa: 'لحظه‌ای / کمی' },
        { id: 'c', labelFa: 'بلافاصله / همین حالا' },
      ],
      correctOptionId: 'b',
      weakPoint: { lineId: 's-cafe-morning-01-l3', objective: 'voc-shoushou', severity: 'medium' },
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
      id: 'q-m4-blind',
      measure: 'M4',
      measureLabelFa: 'شنیداری بدون متن',
      promptFa: 'به جملهٔ پخش‌شده گوش بده (متنی نشان داده نمی‌شود). کدام ترجمه درست است؟',
      audioLineId: 's-cafe-morning-01-l6',
      options: [
        { id: 'a', labelFa: 'صبح بخیر، میکی!' },
        { id: 'b', labelFa: 'آره! اما امروز سرمای زیادی دارد.' },
        { id: 'c', labelFa: 'بعداً می‌بینمت، میکی!' },
      ],
      correctOptionId: 'b',
      weakPoint: { lineId: 's-cafe-morning-01-l6', objective: 'listening-comprehension', severity: 'high' },
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

  const audioByLine: Record<string, string> = {};
  for (const entry of bundle.audio.entries) audioByLine[entry.lineId] = entry.files.opus;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-caption text-ink-soft">TASK-SLICE-01 · آزمون فهم (مرحلهٔ D — هر ۵ سنجه)</p>
        <h1 className="text-h2 font-bold">مکالمهٔ کافه را چقدر فهمیدی؟</h1>
        <p className="text-small text-ink-soft">
          پاسخ‌ها در سرور نمره‌گذاری و در /api/attempts ثبت می‌شوند؛ نتیجه کیفی است (AC-947). قبولی = ثبت رسمی «فهمیدم»
          برای واحد.
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
