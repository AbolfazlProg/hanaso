#!/usr/bin/env python3
# B4 content edits part 2 — the NEW exercises (engages, guided build, second
# recognition round) + the od1 rationale rewording. Same one-match discipline.
import sys

EX = 'apps/web/src/modules/curriculum/content/chapter-fm01.exercises.ts'

edits = [
    # ── stn-14: the three d1 engages (each answerable from the card just seen) ──
    ("""  {
    id: 'ex-fm01-e2-resp-1',""",
     """  /* B4-REBUILD §D3 — the packet engages (C-first-engage): one d1
   * recognition right after each card, answerable from the card itself. */
  {
    id: 'ex-fm01-e2-engage-1',
    type: 'response-select',
    targetSkill: 'expression',
    targetConcept: 'chrk-iie',
    lineRef: L(10),
    difficulty: 1,
    promptFa: 'کارت را تازه دیدی — «いいえ» یعنی چه؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'نه', 'بله', 'خوشبختم', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      a: 'بله یعنی はい — تأیید؛ いいえ ردّ است.',
      c: '«خوشبختم» معنای はじめまして است — واژهٔ آیین آشنایی.',
    },
    feedback: {
      f1Fa: 'واژهٔ روی کارت — ردِّ ساده.',
      f2HintFa: 'قرار نیست چیزی را تأیید کنی.',
      f3ExplainFa: 'いいえ = نه.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-e2-resp-1',"""),
    ("""  {
    id: 'ex-fm01-e2-resp-2',""",
     """  {
    id: 'ex-fm01-e2-engage-2',
    type: 'response-select',
    targetSkill: 'expression',
    targetConcept: 'chrk-soodesuka',
    lineRef: L(11),
    difficulty: 1,
    promptFa: 'کارت را تازه دیدی — «そうですか» یعنی چه؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'آه، می‌فهمم', 'نه', 'خوشبختم', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'ردّ با いいえ است — این واکنشِ شنیدنِ خبر تازه است.',
      c: 'احوال‌پرسیِ آشنایی (はじめまして) با این واکنش اشتباه گرفته نشود.',
    },
    feedback: {
      f1Fa: 'واکنشِ شنیدنِ خبرِ تازه — روی کارت.',
      f2HintFa: 'یامادا وقتی خبرِ ملیتِ کیم را شنید همین را گفت.',
      f3ExplainFa: 'そうですか = آه، می‌فهمم.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-e2-resp-2',"""),
    ("""  {
    id: 'ex-fm01-e2-order-1',""",
     """  {
    id: 'ex-fm01-e2-engage-3',
    type: 'response-select',
    targetSkill: 'expression',
    targetConcept: 'chrk-wakarimashita',
    lineRef: L(11),
    difficulty: 1,
    promptFa: 'کارت را تازه دیدی — «わかりました» یعنی چه؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'فهمیدم', 'نمی‌فهمم', 'خوشحال شدم', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      a: 'منفی/ناتوانی نیست — اعلامِ فهمِ کامل است.',
      c: 'واکنشِ شادی نیست — پایانِ توضیح است.',
    },
    feedback: {
      f1Fa: 'اعلامِ فهم — روی کارت.',
      f2HintFa: 'یامادا بعد از توضیحِ سورا گفتش.',
      f3ExplainFa: 'わかりました = فهمیدم.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-e2-order-1',"""),
    # ── stn-17: the guided self-intro assembly (d2, before the d3 builds) ──
    ("""  {
    id: 'ex-fm01-p2-c2-prod-1',""",
     """  /* B4-REBUILD §D5 — the guided self-intro step (C-guided-first): a d2
   * assembly of the familiar frame BEFORE the independent d3 builds. */
  {
    id: 'ex-fm01-p2-c2-guide-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'self-intro-production',
    assessesConcepts: ['gr-desu-identity'],
    difficulty: 2,
    promptFa: 'گرم‌کردنِ معرفی — «از آشنایی خوشبختم؛ من استاد هستم.»',
    chips: [
      { id: 'gs1', ja: 'はじめまして、' },
      { id: 'gs2', ja: 'わたしは' },
      { id: 'gs3', ja: 'せんせいです。' },
    ],
    acceptedChipOrder: ['gs1', 'gs2', 'gs3'],
    feedback: {
      f1Fa: 'سه تکه: آیینِ آشنایی + موضوع + هویت.',
      f2HintFa: 'فرمولِ آشنایی را اول بگذار.',
      f3ExplainFa: 'はじめまして、わたしは せんせいです.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p2-c2-prod-1',"""),
    # ── stn-21: the second recognition round (d1) ──
    ("""  {
    id: 'ex-fm01-od2-prod-1',""",
     """  {
    id: 'ex-fm01-od2-resp-2',
    type: 'response-select',
    targetSkill: 'vocab',
    targetConcept: 'jobs-recognition',
    lineRef: L(8),
    difficulty: 1,
    promptFa: '«かいしゃいん» یعنی چه؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'کارمند شرکت', 'پزشک', 'مدیر کافه', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'پزشک = いしゃ.',
      c: 'مدیر کافه = てんちょう — شغلِ یامادا.',
    },
    feedback: {
      f1Fa: 'かいしゃ (شرکت) + いん (عضو).',
      f2HintFa: 'واژه‌ای مرکب از «شرکت» و «عضو».',
      f3ExplainFa: 'かいしゃいん = کارمند شرکت.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-od2-prod-1',"""),
    # ── stn-19: clearer ご rationale ──
    ("""    distractorRationaleFa: {
      b: '〜ご = زبان (آمریکایی انگلیسی!) — پیش‌نمایش بعدی.',
      c: 'さん برای اسامی اشخاص است.',
    },""",
     """    distractorRationaleFa: {
      b: '〜ご یعنی «زبانِ» — زبانِ آمریکا انگلیسی است؛ این‌جا دنبالِ «آمریکایی» هستی.',
      c: 'さん برای اسامی اشخاص است.',
    },"""),
]

def main() -> int:
    cur = open(EX, encoding='utf-8').read()
    n = 0
    for old, new in edits:
        c = cur.count(old)
        if c != 1:
            print(f'FAIL ({c} matches):\n---\n{old[:120]}\n---')
            return 1
        cur = cur.replace(old, new)
        n += 1
    open(EX, 'w', encoding='utf-8').write(cur)
    print(f'{n}/{len(edits)} edits applied')
    return 0

if __name__ == '__main__':
    sys.exit(main())
