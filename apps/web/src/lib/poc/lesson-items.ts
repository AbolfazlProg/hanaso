/**
 * HANASO — PoC lesson items derived from the dialogue (TASK-DLG-POC-01 / T6).
 *
 * Stage-B sample: vocabulary/grammar/chunk cards for the cafe unit, each wired to the
 * dialogue lines that teach it (`teaches` on the line — KB dialogue-content-schema §۴).
 * The card catalog is PoC-static; the `lineIds` are derived from the content file so a
 * dangling `teaches` id fails loudly (CONTENT-082 spirit: no orphan items).
 */
import type { Dialogue, DialogueLine } from '@/modules/dialogue';

export type LessonItemKind = 'vocab' | 'grammar' | 'chunk';

export interface LessonItem {
  id: string;
  kind: LessonItemKind;
  /** Japanese surface shown on the card (with reading for ruby rendering). */
  surface: string;
  reading?: string;
  /** Persian meaning / pattern explanation. */
  meaningFa: string;
  noteFa?: string;
  /** Worked-example parse (grammar cards) — token/role pairs from the KB §۴ sample. */
  workedExample?: { lineId: string; parse: { token: string; role: string }[] };
  /** Dialogue lines that teach this item (derived from `teaches`). */
  lineIds: string[];
}

/** Static card catalog for unit cafe-morning-01 (ids match `teaches`/`chunk` in the YAML). */
const CATALOG: Omit<LessonItem, 'lineIds'>[] = [
  {
    id: 'voc-coffee',
    kind: 'vocab',
    surface: 'コーヒー',
    reading: 'こーひー',
    meaningFa: 'قهوه',
    noteFa: 'واژهٔ خارجی (کاتاکانا) — از «coffee».',
  },
  {
    id: 'voc-onegaishimasu',
    kind: 'vocab',
    surface: 'お願いします',
    reading: 'おねがいします',
    meaningFa: 'لطفاً انجام دهید / …می‌خواهم، لطفاً',
    noteFa: 'درخواست مؤدبانهٔ عمومی؛ در کافه: «یک … لطفاً».',
  },
  {
    id: 'voc-shoushou',
    kind: 'vocab',
    surface: 'しょうしょう',
    reading: 'しょうしょう',
    meaningFa: 'لحظه‌ای، کمی',
    noteFa: 'با «お待ちください» = «لحظه‌ای صبر کنید».',
  },
  {
    id: 'voc-kekkou-desu',
    kind: 'vocab',
    surface: 'けっこうです',
    reading: 'けっこうです',
    meaningFa: 'نمی‌خواهم، ممنون (رد مؤدبانه)',
    noteFa: 'رد مؤدبانهٔ پیشنهاد؛ در مغازه «だめ» بی‌ادبانه است (بخش رجیستر).',
  },
  {
    id: 'gr-wo-object',
    kind: 'grammar',
    surface: '[مفعول]を[فعل درخواستی]',
    meaningFa: 'ذرهٔ مفعول «を» + فعل درخواستی',
    noteFa: 'الگوی سفارش‌دادن: コーヒーをお願いします = «یک قهوه لطفاً».',
    workedExample: {
      lineId: 's-cafe-morning-01-l2',
      parse: [
        { token: 'コーヒー', role: 'مفعول' },
        { token: 'を', role: 'ذرهٔ مفعول' },
        { token: 'お願いします', role: 'درخواست' },
      ],
    },
  },
  {
    id: 'chrk-irasshaimase',
    kind: 'chunk',
    surface: 'いらっしゃいませ',
    reading: 'いらっしゃいませ',
    meaningFa: 'خوش‌آمدید (فروشندگی)',
    noteFa: 'قطعهٔ ثابت خوش‌آمد فروشگاهی — تحلیل واج‌به‌واج لازم نیست.',
  },
  {
    id: 'chrk-omatase',
    kind: 'chunk',
    surface: 'お待たせしました',
    reading: 'おまたせしました',
    meaningFa: 'معذرت، منتظر گذاشتم',
    noteFa: 'قطعهٔ ثابت هنگام تحویل سفارش.',
  },
  {
    id: 'chrk-kashikomari',
    kind: 'chunk',
    surface: 'かしこまりました',
    reading: 'かしこまりました',
    meaningFa: 'چشم / بله، حتماً (پاسخ مؤدبانهٔ کاری)',
    noteFa: 'پاسخ رسمال کارمند به درخواست مشتری.',
  },
  {
    id: 'chrk-onegai',
    kind: 'chunk',
    surface: 'お願い',
    reading: 'おねがい',
    meaningFa: 'لطفاً / درخواست',
    noteFa: 'هستهٔ درخواست داخل الگوی «[مفعول]をお願いします» — در بافت سفارش.',
  },
  {
    id: 'chrk-omachi',
    kind: 'chunk',
    surface: 'お待ち',
    reading: 'おまち',
    meaningFa: 'انتظار / صبر',
    noteFa: 'با «ください» = «لحظه‌ای صبر کنید» — عبارت خدمت مؤدبانه.',
  },
  {
    id: 'chrk-kekkou',
    kind: 'chunk',
    surface: 'けっこう',
    reading: 'けっこう',
    meaningFa: 'کافی است / نه ممنون',
    noteFa: 'هستهٔ رد مؤدبانه در «けっこうです».',
  },
];

export interface LessonData {
  dialogueId: string;
  items: LessonItem[];
}

/** Derive the lesson from the dialogue content: every catalog item must be taught somewhere. */
export function buildLessonFromDialogue(dialogue: Dialogue): LessonData {
  // Item ids come from TWO content sources (KB dialogue-content-schema §۴):
  // - line-level `teaches` (vocab/grammar wiring, T6)
  // - token-level `chunk` (fixed chunks — e.g. L1 いらっしゃいませ has no `teaches` but a chunk token)
  const byItem = new Map<string, DialogueLine[]>();
  const add = (item: string, line: DialogueLine) => {
    const list = byItem.get(item) ?? [];
    if (!list.some((l) => l.id === line.id)) list.push(line);
    byItem.set(item, list);
  };
  for (const line of dialogue.lines) {
    for (const item of line.teaches ?? []) add(item, line);
    for (const token of line.tokens) {
      if (token.chunk) add(token.chunk, line);
    }
  }
  const items: LessonItem[] = CATALOG.map((entry) => {
    const lines = byItem.get(entry.id);
    if (!lines || lines.length === 0) {
      throw new Error(`lesson item "${entry.id}" is not taught by any dialogue line (orphan item)`);
    }
    const lineIds = lines.map((l) => l.id);
    if (entry.workedExample && !lineIds.includes(entry.workedExample.lineId)) {
      throw new Error(`worked example line ${entry.workedExample.lineId} does not teach ${entry.id}`);
    }
    return { ...entry, lineIds };
  });
  return { dialogueId: dialogue.id, items };
}
