/**
 * HANASO — Stage-D assessment bank (TASK-SLICE-01, remediation of review F1/S1).
 *
 * SERVER-ONLY module: holds the answer key. Questions are built here from the
 * dialogue bundle and only the SECRET-FREE projection (`AssessmentQuestionClient`)
 * crosses into client components — per KB dialogue-mastery-model §۱: «answer keys
 * are never part of the client payload; grading happens on the server».
 * The production bank lives in `content.comprehension_banks` (AC-952); this is
 * the slice's 5-question sample covering M1..M5 from the cafe dialogue itself.
 */
import type { DialogueBundle } from './dialogue-bundle';

export interface AssessmentQuestion {
  id: string;
  measure: 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
  measureLabelFa: string;
  promptFa: string;
  jpTokens?: { surface: string; reading: string }[];
  audioLineId?: string;
  options: { id: string; labelFa: string; jp?: boolean }[];
  /** SERVER-ONLY — must never be serialized to the client. */
  correctOptionId: string;
  /** SERVER-ONLY — recorded as a weak point when the question is missed. */
  weakPoint: { lineId: string; objective: string; severity: 'low' | 'medium' | 'high' };
}

/** Client-safe projection (no answer key, no weak-point mapping). */
export type AssessmentQuestionClient = Omit<AssessmentQuestion, 'correctOptionId' | 'weakPoint'>;

export function toClientQuestions(questions: AssessmentQuestion[]): AssessmentQuestionClient[] {
  return questions.map((q) => {
    const { correctOptionId: _correctOptionId, weakPoint: _weakPoint, ...safe } = q;
    void _correctOptionId;
    void _weakPoint;
    return safe;
  });
}

export function buildAssessmentQuestions(bundle: DialogueBundle): AssessmentQuestion[] {
  const linesById = new Map(bundle.dialogue.lines.map((l) => [l.id, l]));
  const l3 = linesById.get('s-cafe-morning-01-l3');
  const l8 = linesById.get('s-cafe-morning-01-l8');
  return [
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
}

export interface GradedAssessment {
  scores: { M1: number | null; M2: number | null; M3: number | null; M4: number | null; M5: number | null };
  weakPoints: AssessmentQuestion['weakPoint'][];
  /**
   * Revealed only AFTER grading — safe to send back for feedback.
   * TASK-HANASO-24 (subagent B-06): `correctOptionId` is REMOVED from the
   * response — a fixed retake-allowed bank made the post-submission reveal a
   * harvest channel (submit garbage, read the keys, resubmit perfect). The
   * per-question CORRECTNESS flag stays (honest feedback); the key itself
   * never crosses back.
   */
  perQuestion: { questionId: string; measure: string; correct: boolean }[];
}

/** Grade raw answers server-side (never trust client-computed scores). */
export function gradeAssessment(questions: AssessmentQuestion[], answers: Record<string, string>): GradedAssessment {
  const scores: GradedAssessment['scores'] = { M1: null, M2: null, M3: null, M4: null, M5: null };
  const weakPoints: GradedAssessment['weakPoints'] = [];
  const perQuestion: GradedAssessment['perQuestion'] = [];
  for (const q of questions) {
    const given = answers[q.id];
    const correct = given === q.correctOptionId;
    scores[q.measure] = correct ? 1 : 0;
    if (!correct) weakPoints.push(q.weakPoint);
    perQuestion.push({ questionId: q.id, measure: q.measure, correct });
  }
  return { scores, weakPoints, perQuestion };
}
