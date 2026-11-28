#!/usr/bin/env python3
# B4 content edits — CH02 batch 4: retire the registered EQA debt (stations
# 11/12/13/14/16/17) + deep-pass the optional branch (19-23).
# Every edit asserts exactly-one match (the b3-content-edits.py pattern).
import sys

ST = 'apps/web/src/modules/curriculum/content/chapter-fm01.stations.ts'
EX = 'apps/web/src/modules/curriculum/content/chapter-fm01.exercises.ts'

edits = [
    # ── stn-11: reading moment before the recycle decode (C-worked-before-decode) ──
    (ST, """    blocks: [
      ex('blk-v2-recycle', ['ex-fm01-v2-dec-1', 'ex-fm01-v2-dec-2']),""",
     """    blocks: [
      /* B4-REBUILD §D1 — reading moment (05A §۴): the three new words were
       * HEARD in stn-10's replay of lines 9–13; this worked model unlocks
       * them as READING before the recycle decode runs (C-worked-before-decode
       * — the modeled read precedes the measured decode) and bridges the
       * station from the dialogue the learner just left. */
      {
        kind: 'example-set',
        id: 'blk-v2-reading',
        examples: [
          {
            id: 'v2-read-1',
            role: 'reading',
            ja: 'かんこくじん',
            reading: 'kankokujin',
            fa: 'کره‌ای — واژهٔ تازهٔ همین درس',
            whyFa: 'شنیدی‌اش در خط ۱۰ از زبان سورا؛ حالا خودت می‌توانی بخوانی‌اش.',
            lineRef: L(10),
          },
          {
            id: 'v2-read-2',
            role: 'reading',
            ja: 'かんこくから きました。',
            reading: 'kankoku kara kimashita.',
            fa: 'از کره آمده‌ام.',
            whyFa: 'خط ۱۲ کیم — دو واژهٔ تازهٔ درس (から، きました) کنار هم.',
            lineRef: L(12),
          },
        ],
      },
      ex('blk-v2-recycle', ['ex-fm01-v2-dec-1', 'ex-fm01-v2-dec-2']),"""),
    # ── stn-11: drill ladder 1→2→2 (R16) ──
    (ST, "      ex('blk-v2-drill', ['ex-fm01-v2-aud-1', 'ex-fm01-v2-aud-2', 'ex-fm01-v2-txt-1']),",
     """      /* B4-REBUILD §D2 — R16 (within-block progression): the particle round
       * (d1) opens, then the word-meaning rounds (d2) — 1→2→2, not 2→1→2. */
      ex('blk-v2-drill', ['ex-fm01-v2-aud-2', 'ex-fm01-v2-aud-1', 'ex-fm01-v2-txt-1']),"""),
    # ── stn-12: discovery R6 label ──
    (ST, """        questionFa: 'جملهٔ خط ۶ را با خط ۹ مقایسه کن — も چه چیزی را عوض کرد؟',
        options: [
          { id: 'a', label: '«هم» را می‌رساند: مثل سورا' },
          { id: 'b', label: 'پرسش را مؤدبانه می‌کند' },
          { id: 'c', label: 'جمله را منفی می‌کند' },
        ],
        correctOptionId: 'a',""",
     """        questionFa: 'جملهٔ خط ۶ را با خط ۹ مقایسه کن — も چه چیزی را عوض کرد؟',
        options: [
          { id: 'a', label: '«هم» را می‌رساند: مثل سورا' },
          { id: 'b', label: 'پرسش را مؤدبانه می‌کند' },
          { id: 'c', label: 'جمله را منفی می‌کند' },
        ],
        correctOptionId: 'a',
        /* B4-REBUILD §E2 — R6 label (the graded block was machine-invisible):
         * the comparison presupposes only what earlier stations taught —
         * は+です identity (stn-03) and the ですか question (stn-05). The も
         * insight itself is what this discovery TEACHES (with the rule card). */
        assessesConcepts: ['gr-desu-identity', 'gr-desu-qa'],"""),
    # ── stn-13: discovery R6 label ──
    (ST, """          { id: 'b', label: 'با か — پرسش' },
          { id: 'c', label: 'با も — «هم»' },
        ],
        correctOptionId: 'a',""",
     """          { id: 'b', label: 'با か — پرسش' },
          { id: 'c', label: 'با も — «هم»' },
        ],
        correctOptionId: 'a',
        /* B4-REBUILD §E2 — R6 label: rejecting the か/も distractors
         * presupposes those taught patterns (stn-05 / stn-12). */
        assessesConcepts: ['gr-desu-qa', 'gr-mo'],"""),
    # ── stn-14: every packet opens with its d1 engage (C-first-engage) ──
    (ST, """      { kind: 'expression-card', id: 'blk-e2-card-iie', expressionId: 'chrk-iie' },
      ex('blk-e2-ret-1', ['ex-fm01-e2-resp-1']),
      { kind: 'expression-card', id: 'blk-e2-card-soodesuka', expressionId: 'chrk-soodesuka' },
      ex('blk-e2-ret-2', ['ex-fm01-e2-resp-2']),
      { kind: 'expression-card', id: 'blk-e2-card-wakarimashita', expressionId: 'chrk-wakarimashita' },
      ex('blk-e2-ret-3', ['ex-fm01-e2-order-1', 'ex-fm01-e2-prod-1']),""",
     """      /* B4-REBUILD §D3 — C-first-engage: every packet now opens with its own
       * d1 recognition (the answer is on the card just seen), THEN the applied
       * round — 1→2 per packet, 1→2→3 on the closer. */
      { kind: 'expression-card', id: 'blk-e2-card-iie', expressionId: 'chrk-iie' },
      ex('blk-e2-ret-1', ['ex-fm01-e2-engage-1', 'ex-fm01-e2-resp-1']),
      { kind: 'expression-card', id: 'blk-e2-card-soodesuka', expressionId: 'chrk-soodesuka' },
      ex('blk-e2-ret-2', ['ex-fm01-e2-engage-2', 'ex-fm01-e2-resp-2']),
      { kind: 'expression-card', id: 'blk-e2-card-wakarimashita', expressionId: 'chrk-wakarimashita' },
      ex('blk-e2-ret-3', ['ex-fm01-e2-engage-3', 'ex-fm01-e2-order-1', 'ex-fm01-e2-prod-1']),"""),
    # ── stn-15: comprehension before sound discrimination (R16: 2→3) ──
    (ST, "      ex('blk-l2-drill-2', ['ex-fm01-l2-mp-1', 'ex-fm01-l2-who-1']),",
     """      /* B4-REBUILD §D4 — R16: the line-comprehension round (d2) precedes the
       * sound-discrimination finale (d3) — macro before micro, 2→3 not 3→2. */
      ex('blk-l2-drill-2', ['ex-fm01-l2-who-1', 'ex-fm01-l2-mp-1']),"""),
    # ── stn-16: discovery R6 label ──
    (ST, """        questionFa: 'در «از کره آمدم»، جای から کجاست؟',
        options: [
          { id: 'a', label: 'بعد از مکان، قبل از فعل' },
          { id: 'b', label: 'اول جمله، قبل از مکان' },
          { id: 'c', label: 'آخر جمله' },
        ],""",
     """        questionFa: 'در «از کره آمدم»، جای から کجاست؟',
        options: [
          { id: 'a', label: 'بعد از مکان، قبل از فعل' },
          { id: 'b', label: 'اول جمله، قبل از مکان' },
          { id: 'c', label: 'آخر جمله' },
        ],
        /* B4-REBUILD §E2 — R6 label: the slot question presupposes the SOV
         * bridge (place before verb — stn-04's structure station). */
        assessesConcepts: ['sov-bridge-persian'],"""),
    # ── stn-17: guided self-intro step before the independent builds ──
    (ST, "      ex('blk-p2-c2', ['ex-fm01-p2-c2-cloze-1', 'ex-fm01-p2-c2-prod-1', 'ex-fm01-p2-c2-prod-2']),",
     """      /* B4-REBUILD §D5 — C-guided-first: the self-intro ladder gains its
       * guided (d2) assembly BEFORE the independent (d3) builds — 2→2→3→3. */
      ex('blk-p2-c2', [
        'ex-fm01-p2-c2-cloze-1',
        'ex-fm01-p2-c2-guide-1',
        'ex-fm01-p2-c2-prod-1',
        'ex-fm01-p2-c2-prod-2',
      ]),"""),
    # ── stn-19 (opt-countries): honest ladder + wrap-up ──
    (ST, """          {
            id: 'od1-ex-1',
            role: 'varied',
            ja: 'にほんじん',""",
     """          {
            id: 'od1-ex-1',
            role: 'anchor',
            ja: 'にほんじん',"""),
    (ST, """          {
            id: 'od1-ex-4',
            role: 'faded',
            ja: 'にほんご',""",
     """          {
            id: 'od1-ex-4',
            role: 'varied',
            ja: 'にほんご',"""),
    (ST, """      ex('blk-od1-drill', ['ex-fm01-od1-resp-1', 'ex-fm01-od1-prod-1']),
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-opt-review-desu',""",
     """      ex('blk-od1-drill', ['ex-fm01-od1-resp-1', 'ex-fm01-od1-prod-1']),
      {
        kind: 'wrap-up',
        id: 'blk-od1-wrap',
        titleFa: 'الگوی 〜じん مال تو شد',
        itemsFa: [
          'نام کشور + じん = اهلِ آن کشور — にほんじん、かんこくじん、アメリカじん.',
          'پیش‌نمایشِ فردا: نام کشور + ご = زبانِ آن کشور — にほんご.',
        ],
      },
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-opt-review-desu',"""),
    # ── stn-20 (opt-review-desu): suggestions stay inside the guaranteed-taught set ──
    (ST, "            selfExplainFa: 'بلند بگو: مثلاً がくせい！',",
     "            selfExplainFa: 'بلند بگو: مثلاً にほんじん!'",),
    (ST, "            selfExplainFa: 'مثلاً: てんちょう (مدیر کافه)؟ یا با آموخته‌ها: にほんじん！',",
     "            selfExplainFa: 'با آموخته‌ها: にほんじん! — یامادا خودش در خط ۳ گفت.',"),
    (ST, "            whyFa: 'جای の را پر کن.',",
     "            whyFa: 'واژهٔ مکان را پر کن — علی کجا درس می‌دهد؟',"),
    (ST, "            selfExplainFa: 'がくせい؟ エンジニア؟ انتخاب با تو.',",
     "            selfExplainFa: 'مثلاً せんせい! یا هر واژهٔ آموخته — انتخاب با تو.',"),
    # ── stn-21 (opt-jobs): honest count + tenchoo + second recognition round + wrap-up ──
    (ST, "    objectiveFa: '۸ واژهٔ شغل را بشناس تا شغل خودت را بگویی — فقط با انتخاب صریح تو کارت می‌شود',",
     "    objectiveFa: '۶ واژهٔ شغل را بشناس تا شغل خودت را بگویی — فقط با انتخاب صریح تو کارت می‌شود',"),
    (ST, "            fa: 'دانشجو — واژهٔ نام‌گذارِ فصل!',",
     "            fa: 'دانشجو',"),
    (ST, """          {
            id: 'od2-ex-6',
            role: 'faded',
            ja: 'わたしは ___です。',""",
     """          {
            id: 'od2-ex-6',
            role: 'varied',
            ja: 'てんちょう',
            reading: 'tenchoo',
            fa: 'مدیر کافه — شغلِ خودِ یامادا!',
            whyFa: 'صاحبِ کافه‌ای که مکالمهٔ این فصل در آن گذشت.',
          },
          {
            id: 'od2-ex-7',
            role: 'faded',
            ja: 'わたしは ___です。',"""),
    (ST, """      ex('blk-od2-drill', ['ex-fm01-od2-resp-1', 'ex-fm01-od2-prod-1']),
    ],""",
     """      /* B4-REBUILD §D6 — the recognition round covers a second job word too
       * (d1→d1→d2), and the station closes with its own recap. */
      ex('blk-od2-drill', ['ex-fm01-od2-resp-1', 'ex-fm01-od2-resp-2', 'ex-fm01-od2-prod-1']),
      {
        kind: 'wrap-up',
        id: 'blk-od2-wrap',
        titleFa: 'شغلی برای خودت داری',
        itemsFa: [
          '۶ واژهٔ شغل: がくせい · エンジニア · いしゃ · かいしゃいん · てんちょう · だいがくの せんせい.',
          'الگوی گفتنش همان است: わたしは 〜です.',
        ],
      },
    ],"""),
    # ── stn-22 (opt-drill): the objective's own order — 2→2→3 (R16) ──
    (ST, "    blocks: [ex('blk-or2-drill', ['ex-fm01-or2-mp-1', 'ex-fm01-or2-cloze-1', 'ex-fm01-or2-cloze-2'])],",
     """    /* B4-REBUILD §D7 — R16 + the objective's own promised order: the two
     * grammar distinctions first (d2, d2), the vowel-length drill as the
     * finale (d3) — was 3→2→2. */
    blocks: [ex('blk-or2-drill', ['ex-fm01-or2-cloze-1', 'ex-fm01-or2-cloze-2', 'ex-fm01-or2-mp-1'])],"""),
    # ── stn-23 (kanji): wrap-up runs stay inside registered forms ──
    (ST, "          '国 = کشور — قاب مرز + گوهر داخل؛ 中国 چین و 韓国 کره با خوانش «کُوک»',",
     "          '国 = کشور — قاب مرز + گوهر داخل؛ در ちゅうごく (چین) و かんこく (کره) با خوانش «کُوک»',"),
]

# fix the one typo'd tuple above (Python one-liner safety)
edits = [(f, a, b if isinstance(b, str) else str(b)) for f, a, b in edits]

def main() -> int:
    files = {ST: open(ST, encoding='utf-8').read(), EX: open(EX, encoding='utf-8').read()}
    n = 0
    for path, old, new in edits:
        cur = files[path]
        c = cur.count(old)
        if c != 1:
            print(f'FAIL ({c} matches): {path}\n---\n{old[:120]}\n---')
            return 1
        files[path] = cur.replace(old, new)
        n += 1
    for path, content in files.items():
        open(path, 'w', encoding='utf-8').write(content)
    print(f'{n}/{len(edits)} edits applied')
    return 0

if __name__ == '__main__':
    sys.exit(main())
