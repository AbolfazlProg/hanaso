#!/usr/bin/env python3
# Builds apps/web/content/lesson-engine/n5-lesson-01.yaml (valid YAML guaranteed).
# Content source: owner booklet lesson 1 (N5-01.pdf pp.1-13) — see CHAPTER-02-REBUILD-MAP.md.
# Run: python3 scripts/lesson-engine/build-n5l01-yaml.py
import yaml, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'content/lesson-engine/n5-lesson-01.yaml'
SRC = lambda page, sec, loc: {'artifact': 'n5-booklet', 'lesson': 1, 'page': page, 'section': sec, 'locator': loc}
KA = lambda n: f's-first-meeting-01-l{n}'

chapter = {
    'engineVersion': 1,
    'published': False,
    'id': 'n5-lesson-01',
    'runtimeDialogueSlug': 'first-meeting-01',
    'bookletLesson': 1,
    'bookletSourceFile': 'N5-01.pdf',
    'titleJa': 'わたしは学生です',
    'titleFa': 'فصل ۰۲ (بازسازی) — اولین ملاقات: わたしは学生です',
    'canDoFa': 'در یک ملاقات اول مؤدانه سلام می‌کند، خودش را با نام و ملیت و شغل معرفی می‌کند، دربارهٔ شخص سوم می‌پرسد و با はい/いいえ تأیید یا اصلاح می‌کند؛ در پایان مکالمهٔ کافه را می‌فهمد',
    'level': 'H1',
    'archetype': 'C-Dialogue',
    'characters': [
        {'name': 'ミキ', 'roleFa': 'میزبان، دانشجوی ژاپنی — صحنهٔ کافه'},
        {'name': 'やまだ', 'roleFa': 'صاحب کافه، ژاپنی'},
        {'name': 'ソラ', 'roleFa': 'دانشجوی چینی، مهمان جدید'},
        {'name': 'キム', 'roleFa': 'دانشجوی کره‌ای، هم‌کلاسی سورا'},
    ],
}

def dlg(speaker, ja, romaji, fa, origin, note, page, loc, co=None, flags=None):
    d = {'speaker': speaker, 'textJa': ja, 'romaji': romaji, 'fa': fa, 'origin': origin,
         'originNoteFa': note, 'sourceRef': SRC(page, 'kaiwa', loc), 'flags': flags or []}
    if co: d['coSpeakerNote'] = co
    return d

chapter['dialogue'] = [
    dlg('ミキ', 'こんにちは、やまださん。', 'konnichiwa yamadasan', 'سلام آقای یامادا.', 'target',
        'سلامِ آشنا از فصل کانا + پسوند جدید さん (هدف فصل)', 2, 'turn 1'),
    dlg('やまだ', 'こんにちは、ミキさん。', 'konnichiwa mikisan', 'سلام خانم میکی.', 'prior',
        'جفت پاسخِ همان سلام فصل قبل — الگوی ردوبدل', 2, 'turn 2'),
    dlg('やまだ', 'はじめまして、やまだです。わたしは にほんじんです。よろしく おねがいします。',
        'hajimemashite yamadadesu watashiwa nihonjindesu yoroshiku onegaishimasu',
        'از آشنایی‌تان خوشبختم؛ یامادا هستم. ژاپنی‌ام. یوروشیکو اونِگای‌شیماس.', 'target',
        'هدف فصل — です + わたしは + عبارت معرفی', 2, 'turn 3'),
    dlg('ソラ', 'はじめまして、ソラです。よろしく おねがいします。',
        'hajimemashite soradesu yoroshiku onegaishimasu',
        'از آشنایی‌تان خوشبختم؛ سورا هستم. یوروشیکو اونِگای‌شیماس.', 'target',
        'هدف فصل — حذف فاعل در معرفی (Ⅴ-7 جزوه)', 2, 'turn 4'),
    dlg('やまだ', 'ソラさん です ね。ちゅうごくじん です か。', 'sorasan desune chuugokujin desuka',
        'پس سورا هستید. چینی هستید؟', 'target',
        'هدف فصل — فرم پرسشی ですか + ね تأییدی', 2, 'turn 5'),
    dlg('ソラ', 'はい、わたしは ちゅうごくじん です。', 'hai watashiwa chuugokujindesu',
        'بله، من چینی‌ام.', 'target',
        'هدف فصل — جفت پرسش/پاسخ با はい (نکتهٔ ص۱۰ جزوه)', 2, 'turn 6'),
    dlg('ミキ', 'あのかたは どなた です か。', 'anokatawa donatadesuka',
        'آن شخص کیست؟ (مؤدبانه)', 'target',
        'هدف فصل — پرسش مؤدانه دربارهٔ شخص سوم (Ⅳ-5 جزوه)', 2, 'turn 7'),
    dlg('やまだ', 'アリさん です。イランじん です。だいがく の せんせい です。',
        'arisan desu iranjin desu daigakuno senseedesu',
        'آقای علی است. ایرانی است. استاد دانشگاه است.', 'target',
        'هدف فصل — معرفی شخص سوم؛ イランじん از الگوی مولد じん (حدس‌پذیر)', 3, 'turn 8'),
    dlg('やまだ', 'キムさん も ちゅうごくじん です か。', 'kimsanmo chuugokujindesuka',
        'خانم کیم هم چینی است؟', 'target', 'هدف فصل — ذرهٔ も (Ⅴ-6 جزوه)', 3, 'turn 9'),
    dlg('ソラ', 'いいえ、キムさんは ちゅうごくじんでは ありません。かんこくじん です。',
        'iie kimsanwa chuugokujindewa arimasen kankokujindesu',
        'نه، خانم کیم چینی نیست. کره‌ای است.', 'target',
        'هدف فصل — منفی ではありません + اصلاح مؤدانه', 3, 'turn 10'),
    dlg('やまだ', 'そうですか。わかりました。', 'soodesuka wakarimashita',
        'اه، می‌فهمم. فهمیدم.', 'target',
        'عبارت واکنش فصل (Ⅳ-4 و Ⅳ-6 جزوه)', 3, 'turn 11'),
    dlg('キム', 'はじめまして、キムです。かんこくから きました。よろしく おねがいします。',
        'hajimemashite kimdesu kankokukara kimashita yoroshiku onegaishimasu',
        'از آشنایی‌تان خوشبختم؛ کیم هستم. از کره آمده‌ام. یوروشیکو اونِگای‌شیماس.', 'target',
        'هدف فصل — چانک 〜からきました (معرفی با مبدأ)', 3, 'turn 12'),
    dlg('ソラ', 'よろしく おねがいします。', 'yoroshiku onegaishimasu',
        'یوروشیکو اونِگای‌شیماس. (یامادا و سورا با هم)', 'prior',
        'تکرار عبارت آموخته‌شده به‌عنوان پایانی جمعی', 3, 'turn 13', co='やまだ'),
]

def voc(vid, surface, reading, romaji, meaning, tier, line, coll=None, eu=None, page=3, loc=''):
    d = {'id': vid, 'surface': surface, 'reading': reading, 'romaji': romaji, 'meaningFa': meaning,
         'tier': tier, 'dialogueLineIndex': line, 'collocations': coll or [],
         'sourceRef': SRC(page, 'goi', loc), 'flags': []}
    if eu: d['everydayUsage'] = eu
    return d

chapter['vocabulary'] = [
    voc('voc-watashi', 'わたし', 'わたし', 'watashi', 'من', 'T1', 2, ['わたしは', 'わたしの'],
        {'situationFa': 'در ژاپنی وقتی «من» از متن معلوم است معمولاً حذف می‌شود؛ تکرار わたし در هر جمله غیرطبیعی است',
         'expectedResponseJa': 'はじめまして、（わたしは）ソラです。'}, loc='item 1'),
    voc('voc-san', 'さん', 'さん', 'san', 'پسوند احترام بعد از نام دیگران (معادل «آقا/خانم») — هرگز برای خودت', 'T1', 0,
        ['やまださん', 'ミキさん', 'キムさん'],
        {'situationFa': 'به نام دیگران می‌چسبد؛ به نام خودت هرگز — مکالمه: やまださん اما خودش やまだです می‌گوید',
         'expectedResponseJa': 'やまだです (نه やまださんです)'}, loc='item 3'),
    voc('voc-nihonjin', 'にほんじん', 'にほんじん', 'nihonjin', 'ژاپنی (کشور+じん)', 'T2', 2, ['にほんじんです'], loc='items 4+30'),
    voc('voc-chuugokujin', 'ちゅうごくじん', 'ちゅうごくじん', 'chuugokujin', 'چینی (کشور+じん)', 'T2', 4, ['ちゅうごくじんですか'], loc='items 5+30'),
    voc('voc-kankokujin', 'かんこくじん', 'かんこくじん', 'kankokujin', 'کره‌ای (کشور+じん)', 'T2', 9, ['かんこくじんです'], loc='items 6+30'),
    voc('voc-daigaku', 'だいがく', 'だいがく', 'daigaku', 'دانشگاه', 'T2', 7, ['だいがくのせんせい'], loc='item 10'),
    voc('voc-sensee', 'せんせい', 'せんせい', 'sensee', 'معلم/استاد', 'T2', 7, ['だいがくのせんせいです'], loc='item 13'),
    voc('voc-gakusee', 'がくせい', 'がくせい', 'gakusee', 'دانشجو/دانش‌آموز', 'T2', 2, ['がくせいです', 'がくせいではありません'], loc='item 14'),
    voc('voc-anokata', 'あのかた', 'あのかた', 'anokata', 'آن شخص (مؤدانه)', 'T2', 6, ['あのかたはどなたですか'], loc='item 16'),
    voc('voc-donata', 'どなた', 'どなた', 'donata', 'چه کسی (شکل مؤدانهٔ だれ)', 'T2', 6, ['どなたですか'], loc='item 20'),
    voc('voc-kara', 'から', 'から', 'kara', 'از (مبدأ)', 'T2', 11, ['かんこくからきました'], loc='item 17'),
]

chapter['grammar'] = [
    {'id': 'gr-desu', 'patternJa': 'AはBです',
     'functionFa': '«A، B است» — معرفی و هویت؛ با か پایان‌بخشی پرسشی می‌شود و بدون فاعل هم طبیعی است',
     'formulaFa': 'AはBです / AはBですか / （A）はBです',
     'persianEquivalentFa': 'برعکس فارسی: موضوع با は نشان داده می‌شود و «است» به شکل مؤدانه です است',
     'commonErrors': ['خواندن は به‌صورت «ها» — به‌عنوان ذره همیشه «وا» خوانده می‌شود',
                      'افزودن さん به نام خودش (やまださんです — غلط؛ خودش やまだです می‌گوید)',
                      'برگردان تحت‌اللفظی «است» به جای です در پایان جمله'],
     'examples': [
         {'ja': 'わたしは にほんじんです。', 'reading': 'watashiwa nihonjindesu', 'fa': 'من ژاپنی‌ام.', 'kind': 'anchor'},
         {'ja': 'ワンさんは がくせいです。', 'reading': 'wangsanwa gakuseedesu', 'fa': 'خانم وان دانشجو است.', 'kind': 'simple'},
         {'ja': 'わたしは インドの がくせいです。', 'reading': 'watashiwa indono gakuseedesu', 'fa': 'من دانشجوی هند هستم.', 'kind': 'varied'},
         {'ja': 'あのかたは どなたですか。', 'reading': 'anokatawa donatadesuka', 'fa': 'آن شخص کیست؟', 'kind': 'varied'},
         {'ja': 'はじめまして、やまだです。', 'reading': 'hajimemashite yamadadesu', 'fa': 'خوشبختم؛ یامادا هستم (حذف فاعل).', 'kind': 'varied'}],
     'sourceRef': SRC(7, 'bumpoo', 'patterns 1+3+7'), 'flags': []},
    {'id': 'gr-neg-mo', 'patternJa': 'AはBではありません / AもBです',
     'functionFa': '«A، B نیست» + «A هم B است» — اصلاح مؤدانه و اشتراک',
     'formulaFa': 'AはBでは（じゃ）ありません / N2もN3です',
     'persianEquivalentFa': 'では رسمی‌تر و じゃ خودی‌تر است؛ も به‌جای は می‌نشیند و معنی «هم» می‌دهد',
     'commonErrors': ['استفاده از じゃ در موقعیت رسمی (با صاحب کافه/غریبه)',
                      'جای‌گذاری も به‌جای は در جملهٔ منفی'],
     'examples': [
         {'ja': 'キムさんは ちゅうごくじんでは ありません。かんこくじんです。', 'reading': 'kimsanwa chuugokujindewa arimasen kankokujindesu', 'fa': 'خانم کیم چینی نیست؛ کره‌ای است.', 'kind': 'anchor'},
         {'ja': 'わたしは がくせいでは ありません。', 'reading': 'watashiwa gakuseedewa arimasen', 'fa': 'من دانشجو نیستم.', 'kind': 'simple'},
         {'ja': 'わたしは ちゅうごくじんです。わたしの ともだちも ちゅうごくじんです。', 'reading': 'watashiwa chuugokujindesu watashinotomodachimo chuugokujindesu', 'fa': 'من چینی‌ام؛ دوستم هم چینی است.', 'kind': 'varied'}],
     'sourceRef': SRC(7, 'bumpoo', 'patterns 2+6'), 'flags': []},
]

def expr(eid, ja, rd, fn, fm, rp, lr, loc, page=6):
    return {'id': eid, 'ja': ja, 'reading': rd, 'functionFa': fn, 'formalityFa': fm, 'replyFa': rp,
            'lineRef': lr, 'sourceRef': SRC(page, 'hyoogen', loc)}

chapter['expressions'] = [
    expr('chrk-konnichiwa', 'こんにちは。', 'konnichiwa', 'سلام روز (نیم‌روز تا عصر)', 'خنثی-مؤدانه', 'こんにちは、(نام)さん。', KA(1), 'item 1'),
    expr('chrk-hajimemashite', 'はじめまして。', 'hajimemashite', 'بار اول ملاقات — «از آشنایی خوشبختم»', 'مؤدانه', 'はじめまして、(نام)です。', KA(3), 'item 2'),
    expr('chrk-yoroshiku', '（どうぞ）よろしく おねがいします。', 'doozo yoroshiku onegaishimasu', 'بستهٔ پایانی معرفی — «از شما خواهش می‌کنم/میفایمتان»', 'مؤدانه', 'こちらこそ よろしく おねがいします (در فصل‌های بعد)', KA(3), 'item 3'),
    expr('chrk-soodesuka', 'そうですか。', 'soodesuka', 'واکنش دریافت اطلاعات — «آه، این‌طور»', 'خنثی', 'ادامهٔ گفتگو', KA(11), 'item 6'),
    expr('chrk-wakarimashita', 'わかりました。', 'wakarimashita', 'فهمیدم/متوجه شدم', 'مؤدانه', '—', KA(11), 'item 4'),
    expr('chrk-iie', 'はい／いいえ。', 'hai iie', 'بله/نه — پاسخ مستقیم پرسش (نکتهٔ ص۱۰ جزوه)', 'خنثی', 'ادامه با توضیح', KA(10), 'item 4+note', page=10),
]

chapter['kanji'] = []

chapter['lessons'] = [
    {'id': 'les-n5l01-1', 'microObjectiveFa': 'درس ۱ — چارچوب سلام و معرفی: مکالمه را می‌شنود و l1–l4 را می‌فهمد (مراحل ۱–۷ مدل ۱۳)',
     'stages': [1, 2, 3, 4, 5, 6, 7],
     'newKnowledgeRefs': ['chrk-konnichiwa', 'chrk-hajimemashite', 'chrk-yoroshiku', 'voc-watashi', 'voc-san', 'voc-gakusee'],
     'skillLinkFa': 'شنیدار → گفتار (سلام جفت)',
     'stationIds': ['stn-n5l01-01-anchor', 'stn-n5l01-02-greet', 'stn-n5l01-03-people'],
     'nextLessonId': 'les-n5l01-2', 'sourceRef': SRC(1, 'goals', ''), 'flags': []},
    {'id': 'les-n5l01-2', 'microObjectiveFa': 'درس ۲ — هویت و پرسش: با AはBです هویت می‌گوید و می‌پرسد؛ l5–l8 را می‌فهمد (مراحل ۷–۹)',
     'stages': [7, 8, 9],
     'newKnowledgeRefs': ['gr-desu', 'voc-nihonjin', 'voc-chuugokujin', 'voc-anokata', 'voc-donata'],
     'skillLinkFa': 'گرامر → شنیدار (l5–l8)',
     'stationIds': ['stn-n5l01-04-desu', 'stn-n5l01-05-qa', 'stn-n5l01-06-jin', 'stn-n5l01-07-who'],
     'nextLessonId': 'les-n5l01-3', 'sourceRef': SRC(7, 'bumpoo', ''), 'flags': []},
    {'id': 'les-n5l01-3', 'microObjectiveFa': 'درس ۳ — اصلاح و بازگشت: منفی+も، تولید خود-معرفی، بازگشت به کل مکالمه (مراحل ۱۰–۱۳)',
     'stages': [10, 11, 12, 13],
     'newKnowledgeRefs': ['gr-neg-mo', 'voc-kankokujin', 'voc-kara', 'voc-sensee', 'voc-daigaku'],
     'skillLinkFa': 'تولید گفتار → انتقال (Transfer)',
     'stationIds': ['stn-n5l01-08-neg-mo', 'stn-n5l01-09-san', 'stn-n5l01-10-practice', 'stn-n5l01-11-speak', 'stn-n5l01-12-reconnect'],
     'sourceRef': SRC(9, 'bumpoo', ''), 'flags': []},
]

# ---------- helpers ----------
def opt(oid, label, ja=None):
    return {'id': oid, 'label': label} if ja is None else {'id': oid, 'label': label, 'ja': ja}

def inter(t, prompt, options, correct, reasons=None, hints=None, fbC=None, fbW=None, tiles=None, extra=None):
    d = {'type': t, 'promptFa': prompt}
    if options is not None: d['options'] = options
    if correct is not None: d['correct'] = correct
    if reasons: d['distractorReasons'] = reasons
    if hints: d['hints'] = hints
    if fbC: d['feedbackCorrectFa'] = fbC
    if fbW: d['feedbackWrongFa'] = fbW
    if tiles: d['tiles'] = tiles
    if extra: d['extraTiles'] = extra
    return d

def step(sid, goal, card=None, it=None, stage='teach', trans='on_correct_or_revealed', listen=None, src=None):
    d = {'id': sid, 'goal': goal, 'stage': stage, 'interaction': it, 'transition': trans, 'flags': []}
    if card: d['card'] = card
    if listen is not None: d['listeningsBeforeTranscript'] = listen
    if src: d['sourceRef'] = src
    return d

def card(text=None, ja=None, reading=None, line=None, audio=None, hl=None):
    d = {}
    if text: d['textFa'] = text
    if ja: d['textJa'] = ja
    if reading: d['reading'] = reading
    if line: d['lineRef'] = line
    if audio: d['audioRef'] = audio
    if hl: d['highlight'] = hl
    return d

def stn(sid, domain, stype, objective, prereqs, steps, next_=None, guided=None, srs=None,
        conv=None, fsrs=None, src=None, flags=None, completion=None, intro=None):
    d = {'id': sid, 'domain': domain, 'type': stype, 'objectiveFa': objective,
         'prerequisites': prereqs, 'steps': steps,
         'completion': completion or {'kind': 'task_completed'},
         'connections': {'practiceStationIds': [], 'conversation': conv or {}},
         'fsrsItems': fsrs or [], 'flags': flags or []}
    if next_: d['connections']['next'] = next_
    if guided: d['guidedStepIds'] = guided
    if srs: d['connections']['srs'] = {'days': srs}
    if intro: d['intro'] = intro
    if src: d['sourceRef'] = src
    return d

chapter['stations'] = [
    # ── ۱) لنگر: مکالمهٔ محوری ──
    stn('stn-n5l01-01-anchor', 'anchor', 'teaching', 'مکالمهٔ کافه را با پیش‌بینی و سه شنیدن هدفمند می‌فهمد', [],
        intro={'textFa': 'کافه یامادا، بعدازظهر. میکی دوستش سورا را برای اولین بار می‌آورد؛ در آن نزدیکی علی (استاد دانشگاه) کتاب می‌خواند و کیم از میز کنار سلام می‌کند.', 'conversationRef': KA(1)},
        src=SRC(2, 'kaiwa', ''), flags=['audio_pending'],
        steps=[
            step('s1', 'intro', card('اول فقط صحنه را ببین — هنوز چیزی نمی‌فهمی و اشکالی ندارد؛ هدف این فصل همین مکالمه است.', line=KA(1)), None, 'teach', 'on_view', src=SRC(2, 'kaiwa', 'scene')),
            step('s2', 'predict', card('قبل از شنیدن حدس بزن — پاسخ غلط جایی ندارد، فقط حدس.', line=KA(1)),
                 inter('select', 'این گفتگو به نظرت دربارهٔ چیست؟',
                       [opt('o1', 'معرفی آدم‌ها به هم'), opt('o2', 'سفارش غذا در کافه'), opt('o3', 'پرسیدن آدرس')], 'o1',
                       {'o2': 'سفارش غذا فصل‌های بعد است — واژه‌های خوراکی در این مکالمه نیست.', 'o3': 'پرسش آدرس الگوهای دیگری دارد که هنوز نیامده.'},
                       ['به اسم‌هایی که روی صحنه دیده‌ای فکر کن — چند نفر تازه‌واردند؟'],
                       fbW='حدس خوبی بود؛ حالا با شنیدن مقایسه کن.'), listen=0, src=SRC(2, 'kaiwa', 'predict')),
            step('s3', 'gist', card('شنیدن سراسری — فقط جریان کلی را بگیر.', line=KA(1), audio=KA(1)),
                 inter('select', 'در کل مکالمه چند نفر خودشان را معرفی می‌کنند؟',
                       [opt('o1', 'دو نفر'), opt('o2', 'سه نفر'), opt('o3', 'چهار نفر')], 'o3',
                       {'o1': 'یامادا و سورا دو نفر اول‌اند؛ بعد علی و کیم هم می‌آیند.', 'o2': 'معرفی‌ها چهار تا است — شمرده‌ای؟'},
                       ['هر «です» پایان‌بخش معرفی است — جمله‌های معرفی را بشمار.'],
                       fbW='دوباره بشمار — معرفی‌های صریح و معرفی توسط دیگری هر دو حساب می‌شوند.'), src=SRC(2, 'kaiwa', 'gist')),
            step('s4', 'targeted', card('شنیدن دوم — این بار به نام‌ها و واژه‌های ملیت گوش کن.', line=KA(3), audio=KA(3)), None, 'teach', 'on_view'),
            step('s5', 'targeted', card(line=KA(7), audio=KA(7)),
                 inter('listen_choose', 'چه کسی می‌پرسد «آن شخص کیست؟»',
                       [opt('o1', 'ミキ', 'ミキ'), opt('o2', 'ソラ', 'ソラ'), opt('o3', 'やまだ', 'やまだ')], 'o1',
                       {'o2': 'سورا در این نوبت پاسخ‌دهنده است نه پرسشگر.', 'o3': 'یامادا در این لحظه معرفی می‌کند نه می‌پرسد.'},
                       ['صحنهٔ wide — میکی به سمت پنجره اشاره می‌کند.'],
                       fbW='یک بار دیگر فقط صدای پرسشگر را دنبال کن.'), listen=1, src=SRC(2, 'kaiwa', 'turn 7')),
            step('s6', 'verify', card('شنیدن سوم — حالا متن زیرنویس را همراه صدا ببین؛ تفاوت حدس و واقعیت را مقایسه کن.', line=KA(1)), None, 'teach', 'on_view', listen=2),
            step('s7', 'detail', card(line=KA(12), audio=KA(12)),
                 inter('select', 'کیم از کجا آمده است؟',
                       [opt('o1', 'ちゅうごく', 'ちゅうごく'), opt('o2', 'かんこく', 'かんこく'), opt('o3', 'にほん', 'にほん')], 'o2',
                       {'o1': 'چینی بودن سوراست نه کیم — دو ملیت را جابه‌جا نکن.', 'o3': 'ژاپنی بودن یاماداست.'},
                       ['جملهٔ آخر کیم با «から» مبدأ را می‌گوید.'],
                       fbW='متن نوبت ۱۲ را در زیرنویس ببین — かんこくから きました.'), src=SRC(3, 'kaiwa', 'turn 12')),
            step('s8', 'exit', card(line=KA(3)),
                 inter('select', 'کدام جمله در این مکالمه نیامده است؟',
                       [opt('o1', 'おはようございます', 'おはようございます'), opt('o2', 'よろしく おねがいします', 'よろしく おねがいします'), opt('o3', 'だいがくの せんせいです', 'だいがくの せんせいです')], 'o1',
                       {'o2': 'نوبت‌های ۳،۴،۱۲،۱۳ — بستهٔ پایانی معرفی.', 'o3': 'نوبت ۸ دربارهٔ شغل علی.'},
                       ['سلامِ ملاقات اول این مکالمه روزانه است نه صبحگاهی.'],
                       fbW='در این مکالمه سلام با こんにちは شروع می‌شود.')),
        ],
        next_='stn-n5l01-02-greet', conv={'sourceLineRef': KA(1)}),

    # ── ۲) چارچوب سلام/معرفی ──
    stn('stn-n5l01-02-greet', 'vocab', 'teaching', 'سه عبارت سلام و معرفی را می‌شناسد و جفت پاسخ را می‌چیند', ['stn-n5l01-01-anchor'],
        intro={'textFa': 'هر معرفی در مکالمه با همین سه عبارت بسته‌بندی می‌شود — اول چانک، بعد تجزیه.', 'conversationRef': KA(3)},
        src=SRC(6, 'hyoogen', ''),
        steps=[
            step('v0', 'encounter', card('نوبت ۳ یامادا — سه عبارت را در یک جملهٔ واقعی ببین و بشنو.', ja='はじめまして、やまだです。よろしく おねがいします。', line=KA(3), audio=KA(3), hl='はじめまして / よろしく おねがいします'), None, 'teach', 'auto_after_audio', src=SRC(6, 'hyoogen', 'items 2-3')),
            step('v1', 'form', card(line=KA(1), audio=KA(1)),
                 inter('listen_choose', 'کدام صدا را می‌شنوی؟',
                       [opt('o1', 'こんにちは', 'こんにちは'), opt('o2', 'はじめまして', 'はじめまして'), opt('o3', 'わかりました', 'わかりました')], 'o1',
                       {'o2': 'عبارت ملاقات اول در نوبت ۳ است نه ۱.', 'o3': 'عبارت واکنش در نوبت ۱۱ است.'},
                       ['نوبت ۱ میکی به یامادا سلام روز می‌دهد.'],
                       fbW='صدا را دوباره پخش کن — شروع روز با こんにちは.'), src=SRC(6, 'hyoogen', 'item 1')),
            step('v2', 'meaning', card(ja='はじめまして。', reading='hajimemashite', line=KA(3)),
                 inter('select', 'はじめまして دقیقاً کجا گفته می‌شود؟',
                       [opt('o1', 'بار اول که کسی را می‌بینی'), opt('o2', 'موقع خداحافظی'), opt('o3', 'وقتی تشکر می‌کنی')], 'o1',
                       {'o2': 'خداحافظی عبارت خودش را در فصل‌های بعد می‌گیرد.', 'o3': 'تشکر عبارت دیگری است — اینجا فقط معرفی است.'},
                       ['واژهٔ はじめ = اولین — اولین چه چیزی؟'],
                       fbW='فقط برای ملاقات اول — همان‌طور که در نوبت ۳ استفاده شد.'), src=SRC(6, 'hyoogen', 'item 2')),
            step('v3', 'collocation', card(ja='こんにちは、__ さん。', reading='konnichiwa __ san', line=KA(1)),
                 inter('complete', 'جای خالی را پر کن — میکی چه می‌گوید؟',
                       [opt('o1', 'やまだ', 'やまだ'), opt('o2', 'わたし', 'わたし'), opt('o3', 'どなた', 'どなた')], 'o1',
                       {'o2': 'به نام خودش さん نمی‌چسبد — سلام خطاب به یاماداست.', 'o3': 'どなた پرسش «کیست» است نه اسم.'},
                       ['بعد از さん همیشه نامِ شخصِ مقابل می‌آید.'],
                       fbW='نوبت ۱ — こんにちは、やまださん.'), src=SRC(2, 'kaiwa', 'turn 1')),
            step('v4', 'build', card(line=KA(3)),
                 inter('order_build', 'معرفی یامادا را به ترتیب درست بچین',
                       None, None,
                       tiles=['はじめまして、やまだです。', 'わたしは にほんじんです。', 'よろしく おねがいします。'],
                       extra=['ごめんなさい。'],
                       hints=['اول سلامِ ملاقات اول، بعد اسم+です، در پایان بستهٔ خواهش.'],
                       fbC='دقیقاً همان نوبت ۳ مکالمه — جفت معرفی کامل.',
                       fbW='الگوی نوبت ۳ را بشنو و دوباره بچین.'), 'guided', src=SRC(2, 'kaiwa', 'turn 3')),
            step('v5', 'exit', card(line=KA(4)),
                 inter('select', 'پاسخ طبیعی به はじめまして در این مکالمه چیست؟',
                       [opt('o1', 'はじめまして、ソラです。', 'はじめまして、ソラです。'), opt('o2', 'おはようございます。', 'おはようございます。'), opt('o3', 'そうですか。', 'そうですか。')], 'o1',
                       {'o2': 'سلام صبح است و اینجا جفتِ معرفی می‌خواهد.', 'o3': 'واکنش به خبر است نه به معرفی.'},
                       ['نوبت ۴ — سورا با همان بسته پاسخ می‌دهد.'],
                       fbW='جفت سلام = همان عبارت + اسم خودت.')),
        ],
        next_='stn-n5l01-03-people', guided=['v4'], srs=[7, 30],
        conv={'sourceLineRef': KA(3), 'returnLineRef': KA(13)},
        fsrs=['w-chrk-konnichiwa', 's-chrk-konnichiwa', 'w-chrk-hajimemashite', 's-chrk-hajimemashite', 'w-chrk-yoroshiku', 's-chrk-yoroshiku']),

    # ── ۳) واژه‌های هویت ──
    stn('stn-n5l01-03-people', 'vocab', 'teaching', 'わたし و واژه‌های آدم‌ها را می‌شناسد و چانک استاد دانشگاه را می‌سازد', ['stn-n5l01-02-greet'],
        intro={'textFa': 'برای فهم جمله‌های معرفی به اسمِ آدم‌ها نیاز داری — わたし، がくせい، せんせい، だいがく.', 'conversationRef': KA(3)},
        src=SRC(3, 'goi', ''),
        steps=[
            step('w0', 'encounter', card('نوبت ۳ — わたしは یعنی «من…»؛ اما یادت باشد وقتی معلوم است حذفش طبیعی‌تر است.', ja='わたしは にほんじんです。', line=KA(3), audio=KA(3), hl='わたし'), None, 'teach', 'auto_after_audio', src=SRC(3, 'goi', 'item 1')),
            step('w1', 'form', card(line=KA(8), audio=KA(8)),
                 inter('listen_choose', 'شغل علی چیست؟ واژه را در نوبت ۸ بشنو.',
                       [opt('o1', 'せんせい', 'せんせい'), opt('o2', 'がくせい', 'がくせい'), opt('o3', 'かいしゃいん', 'かいしゃいん')], 'o1',
                       {'o2': 'دانشجو بودن سوراست.', 'o3': 'کارمند شرکت در فصل‌های بعد — در این مکالمه نیست.'},
                       ['نوبت ۸ — بعد از だいがくの چه می‌آید؟'],
                       fbW='だいがくの せんせいです — استاد دانشگاه.'), src=SRC(3, 'goi', 'item 13')),
            step('w2', 'meaning', card(ja='がくせい', reading='gakusee', line=KA(3)),
                 inter('select', 'がくせい یعنی چه؟',
                       [opt('o1', 'دانشجو'), opt('o2', 'معلم'), opt('o3', 'دوست')], 'o1',
                       {'o2': 'معلم せんせい است — دو کلمهٔ آدم را قاطی نکن.', 'o3': 'دوست ともだち است (فصل‌های بعد).'},
                       ['عنوان جزوهٔ همین درس است: わたしは学生です.'],
                       fbW='がくせい = دانشجو — همان عنوان درس.'), src=SRC(3, 'goi', 'item 14')),
            step('w3', 'meaning', card(ja='せんせい', reading='sensee', line=KA(8)),
                 inter('select', 'せんせい یعنی چه؟',
                       [opt('o1', 'معلم/استاد'), opt('o2', 'دانشجو'), opt('o3', 'پزشک')], 'o1',
                       {'o2': 'دانشجو がくせい است.', 'o3': 'پزشک いしゃ است (فصل‌های بعد).'},
                       ['علی در دانشگاه چه کاری دارد؟'],
                       fbW='だいがくの せんせい — استاد دانشگاه.'), src=SRC(3, 'goi', 'item 13')),
            step('w4', 'collocation', card(ja='だいがく__せんせい', reading='daigaku __ sensee', line=KA(8)),
                 inter('complete', 'چانک «استاد دانشگاه» را کامل کن — چه ذره‌ای وسط است؟',
                       [opt('o1', 'の', 'の'), opt('o2', 'は', 'は'), opt('o3', 'も', 'も')], 'o1',
                       {'o2': 'は موضوع جمله را نشان می‌دهد — اینجا مالکیت است.', 'o3': 'も معنی «هم» می‌دهد — اینجا جایش نیست.'},
                       ['الگوی نوبت ۸: だいがく の せんせい — مثل «دانشگاهِ» استاد.'],
                       fbW='だいがくの せんせい — ذرهٔ の مثل «ِ» اضافه در فارسی مالکیت می‌سازد.'), src=SRC(3, 'goi', 'item 34 + chunk از نوبت ۸')),
            step('w5', 'build', card(line=KA(3)),
                 inter('order_build', 'جملهٔ «من دانشجوام» را بچین',
                       None, None,
                       tiles=['わたしは', 'がくせい', 'です'], extra=['せんせい'],
                       hints=['موضوع + هستهٔ اسم + ですِ مؤدانه در انتها.'],
                       fbC='わたしは がくせいです — عنوان همین درس!',
                       fbW='الگوی نوبت ۳: わたしは にほんじんです.'), 'guided', src=SRC(7, 'bumpoo', 'example 1')),
            step('w6', 'exit', card(line=KA(3)),
                 inter('select', 'کدام جمله دربارهٔ یامادا درست است؟',
                       [opt('o1', 'やまだは にほんじんです。', 'やまだは にほんじんです。'), opt('o2', 'やまだは がくせいです。', 'やまだは がくせいです。'), opt('o3', 'やまだは ちゅうごくじんです。', 'やまだは ちゅうごくじんです。')], 'o1',
                       {'o2': 'دانشجو بودن سورا و کیم است نه یامادا.', 'o3': 'چینی بودن سوراست.'},
                       ['نوبت ۳ — یامادا خودش چه گفت؟'],
                       fbW='わたしは にほんじんです — یامادا ژاپنی است.')),
        ],
        next_='stn-n5l01-04-desu', guided=['w5'], srs=[7, 30],
        conv={'sourceLineRef': KA(3)},
        fsrs=['w-voc-watashi', 's-voc-watashi', 'w-voc-gakusee', 's-voc-gakusee', 'w-voc-sensee', 's-voc-sensee', 'w-voc-daigaku', 's-voc-daigaku']),
]

chapter['stations'] += [
    # ── ۴) گرامر GR-01: AはBです ──
    stn('stn-n5l01-04-desu', 'grammar', 'teaching', 'با الگوی AはBです جملهٔ معرفی می‌سازد و می‌شناسد', ['stn-n5l01-03-people'],
        intro={'textFa': 'قلب همین درس — الگویی که کل مکالمه روی آن سوار است؛ جزوه ص۷: N1 は N2 です.', 'conversationRef': KA(3)},
        src=SRC(7, 'bumpoo', ''),
        steps=[
            step('g0', 'notice', card('نوبت ۳ را دوباره بشنو — به پایان هر بخش گوش بده، همان です.', line=KA(3), audio=KA(3), hl='です'), None, 'teach', 'auto_after_audio', src=SRC(7, 'bumpoo', 'pattern 1')),
            step('g1', 'function', card(ja='AはBです。', reading='A wa B desu', line=KA(3)),
                 inter('select', 'با です دربارهٔ چه چیزی حرف می‌زنیم؟',
                       [opt('o1', 'هویت و اتصال — «A، B است»'), opt('o2', 'درخواست چیزی از کسی'), opt('o3', 'توصیف حال هوا')], 'o1',
                       {'o2': 'درخواست الگوی دیگری دارد (فصل‌های بعد).', 'o3': 'توصیف حال با صفت است — جزوه این الگو را «N1 is N2» توضیح می‌دهد.'},
                       ['نوبت‌های ۳،۴،۸ — هر معرفی با چه پایان می‌یابد؟'],
                       fbW='です مثل «است» مؤدانه است — اتصال A به B.'), src=SRC(7, 'bumpoo', 'pattern 1 توضیح')),
            step('g2', 'form', card(ja='わたしは にほんじん__。', reading='watashiwa nihonjin __', line=KA(3)),
                 inter('complete', 'جای خالی را کامل کن',
                       [opt('o1', 'です', 'です'), opt('o2', 'さん', 'さん'), opt('o3', 'も', 'も')], 'o1',
                       {'o2': 'さん پسوند نام است — پایان جمله نیست.', 'o3': 'も ذرهٔ «هم» است و وسط جمله می‌نشیند.'},
                       ['مثال ۱ جزوه ص۷: わたしは にほんじんです.'],
                       fbW='پایان جملهٔ مؤدانه معرفی = です.'), src=SRC(7, 'bumpoo', 'example 1')),
            step('g3', 'examples', card(line=KA(3), audio=KA(3)),
                 inter('listen_choose', 'کدام جمله را می‌شنوی؟ (مثال لنگر)',
                       [opt('o1', 'わたしは にほんじんです。', 'わたしは にほんじんです。'), opt('o2', 'わたしは がくせいです。', 'わたしは がくせいです。'), opt('o3', 'キムさんは かんこくじんです。', 'キムさんは かんこくじんです。')], 'o1',
                       {'o2': 'عنوان درس است ولی در نوبت ۳ یامادا ملیت خودش را گفت.', 'o3': 'جملهٔ کیم در نوبت ۱۰ است.'},
                       ['مثال لنگر همان جملهٔ خودِ یامادا در نوبت ۳ است.'],
                       fbW='نوبت ۳ را دوباره پخش کن — わたしは にほんじんです.'), src=SRC(7, 'bumpoo', 'example 1')),
            step('g4', 'examples', card(ja='ワンさんは がくせいです。', reading='wangsanwa gakuseedesu', line=KA(5)),
                 inter('select', '«خانم وان دانشجو است» — کدام درست است؟ (مثال ۲ جزوه)',
                       [opt('o1', 'ワンさんは がくせいです。', 'ワンさんは がくせいです。'), opt('o2', 'ワンさんは せんせいです。', 'ワンさんは せんせいです。'), opt('o3', 'ワンさんは にほんじんです。', 'ワンさんは にほんじんです。')], 'o1',
                       {'o2': 'شغل در الگو جای اسم می‌نشیند اما معنی جمله را عوض می‌کند — جزوه «دانشجو» گفته.', 'o3': 'ملیت وان در جزوه نیامده.'},
                       ['الگو ثابت است: Aは + هسته + です — هسته را از معنی فارسی بردار.'],
                       fbW='わたしは がくせいです — الگو همان است با A دیگر.'), src=SRC(7, 'bumpoo', 'example 2')),
            step('g5', 'build', card(ja='わたしは インドの がくせいです。', reading='watashiwa indono gakuseedesu', line=KA(8)),
                 inter('order_build', 'مثال ۳ جزوه را بچین — «من دانشجوی هند هستم»',
                       None, None,
                       tiles=['わたしは', 'インドの がくせい', 'です'], extra=['じゃ ありません'],
                       hints=['اول موضوع با は، بعد هستهٔ طولانی، پایان با です.'],
                       fbC='わたしは インドの がくせいです — دقیقاً مثال ۳ جزوه ص۷.',
                       fbW='شکل منفی اینجا لازم نیست — جملهٔ مثبت است.'), 'guided', src=SRC(7, 'bumpoo', 'example 3')),
            step('g6', 'exit', card(line=KA(4)),
                 inter('select', 'بازگشت به مکالمه — سورا دربارهٔ خودش چه می‌گوید؟',
                       [opt('o1', 'ソラです。', 'ソラです。'), opt('o2', 'やまだです。', 'やまだです。'), opt('o3', 'アリさんです。', 'アリさんです。')], 'o1',
                       {'o2': 'یامادا در نوبت ۳ خودش را معرفی کرد.', 'o3': 'علی را یامادا معرفی می‌کند نه خودش.'},
                       ['نوبت ۴ — سورا بدون わたしは معرفی می‌شود (حذف فاعل طبیعی است).'],
                       fbW='はじめまして、ソラです — حذف فاعل، طبیعی‌ترین شکل معرفی.')),
        ],
        next_='stn-n5l01-05-qa', guided=['g5'], srs=[7, 30],
        conv={'sourceLineRef': KA(3), 'returnLineRef': KA(4)}, fsrs=['gr-gr-desu']),

    # ── ۵) پرسش ですか + はい/いいه ──
    stn('stn-n5l01-05-qa', 'grammar', 'teaching', 'با ですか می‌پرسد و با はい/いいه پاسخ می‌دهد', ['stn-n5l01-04-desu'],
        intro={'textFa': 'همان です با یک ذرهٔ پرسشی — جزوه ص۸: N1 は N2 ですか؛ و نکتهٔ ص۱۰: پاسخ با はい/いいه.', 'conversationRef': KA(5)},
        src=SRC(8, 'bumpoo', ''),
        steps=[
            step('q0', 'notice', card('نوبت ۵ — یامادا چه می‌پرسد؟ به ذرهٔ پایان جمله گوش کن.', line=KA(5), audio=KA(5), hl='です か'), None, 'teach', 'auto_after_audio', src=SRC(8, 'bumpoo', 'pattern 3')),
            step('q1', 'function', card(ja='ちゅうごくじん です か。', reading='chuugokujin desuka', line=KA(5)),
                 inter('select', 'کدام ذره جمله را پرسشی می‌کند؟',
                       [opt('o1', 'か', 'か'), opt('o2', 'ね', 'ね'), opt('o3', 'は', 'は')], 'o1',
                       {'o2': 'ね برای تأیید چیز آشکار است (ソラさんですね) — پرسش واقعی نمی‌سازد.', 'o3': 'は موضوع را نشان می‌دهد.'},
                       ['جزوه ص۸: ذرهٔ پرسشی در پایان جمله با آهنگ بالارونده.'],
                       fbW='です + か = پرسش مؤدانه.'), src=SRC(8, 'bumpoo', 'pattern 3 توضیح')),
            step('q2', 'form', card(ja='あなたは エンジニア__。', reading='anatawa enjinia __', line=KA(5)),
                 inter('complete', '«مهندس هستی؟» — جزوه ص۸ مثال ۲',
                       [opt('o1', 'ですか', 'ですか'), opt('o2', 'です', 'です'), opt('o3', 'じゃ', 'じゃ')], 'o1',
                       {'o2': 'بدون か جملهٔ خبری می‌شود نه پرسش.', 'o3': 'じゃ بخش شکل منفی است (じゃありません) نه پرسش.'},
                       ['پایان پرسش مؤدانه = です + ذرهٔ پرسشی.'],
                       fbW='あなたは エンジニアですか — همان مثال جزوه.'), src=SRC(8, 'bumpoo', 'example 2')),
            step('q3', 'examples', card(line=KA(6)),
                 inter('judge', 'پرسش: あなたは がくせいですか؟ — تو دانشجویی؛ چه می‌گویی؟',
                       [opt('o1', 'はい、わたしは がくせいです。', 'はい、わたしは がくせいです。'), opt('o2', 'いいえ、がくせいでは ありません。', 'いいえ、がくせいでは ありません。'), opt('o3', 'そうですか。', 'そうですか。')], 'o1',
                       {'o2': 'شکل منفی برای وقتی است که دانشجو نباشی.', 'o3': 'واکنش به خبر است نه پاسخ به پرسش دربارهٔ خودت.'},
                       ['نکتهٔ جزوه ص۱۰: پاسخ ژاپنی با はい/いいه شروع می‌شود.'],
                       fbW='はい + تکرار هویت — دقیقاً نوبت ۶ سورا.'), src=SRC(10, 'bumpoo', 'note')),
            step('q4', 'build', card(line=KA(10)),
                 inter('judge', 'پرسش: キムさんは ちゅうごくじんですか؟ — کیم کره‌ای است؛ چه می‌گویند؟',
                       [opt('o1', 'いいえ、ちゅうごくじんでは ありません。', 'いいえ、ちゅうごくじんでは ありません。'), opt('o2', 'はい、ちゅうごくじんです。', 'はい、ちゅうごくじんです。'), opt('o3', 'かんこくから きました。', 'かんこくから きました。')], 'o1',
                       {'o2': 'はی تأیید حرف غلط می‌شود.', 'o3': 'جواب مبدأ است نه پاسخ بله/نه.'},
                       ['نوبت ۱۰ — سورا چطور اصلاح می‌کند؟'],
                       fbC='いいه + منفی — دقیقاً نوبت ۱۰: اصلاح مؤدانه.',
                       fbW='اصلاح با いいه + شکل منفی — نوبت ۱۰ را ببین.'), 'guided', src=SRC(3, 'kaiwa', 'turn 10')),
            step('q5', 'exit', card(line=KA(5)),
                 inter('select', 'در ソラさんですね ذرهٔ ね چه حالی می‌دهد؟',
                       [opt('o1', 'تأیید چیز آشکار — «که همین‌طور است»'), opt('o2', 'پرسش واقعی دربارهٔ چیزی نامعلوم'), opt('o3', 'نفی جملهٔ قبلی')], 'o1',
                       {'o2': 'پرسش واقعی با か است.', 'o3': 'ね نفی نمی‌کند — تأییدِ مشترک می‌طلبد.'},
                       ['یامادا چیزی را که از قبل می‌داند تأیید می‌کند.'],
                       fbW='ね = تأییدی — جزوه این ذره را در نوبت ۵ گذاشته.')),
        ],
        next_='stn-n5l01-06-jin', guided=['q4'], srs=[7, 30],
        conv={'sourceLineRef': KA(5), 'returnLineRef': KA(6)}, fsrs=['gr-gr-desu']),

    # ── ۶) الگوی مولد ملیت ──
    stn('stn-n5l01-06-jin', 'vocab', 'teaching', 'با پسوند じん ملیت می‌سازد و آن را از پسوند زبان (ご) جدا می‌کند', ['stn-n5l01-04-desu'],
        intro={'textFa': 'یک الگوی مولد — با کشورها ملیت می‌سازی؛ ضمیمهٔ جزوه ص۱۱–۱۳ فهرست کامل است.', 'conversationRef': KA(6)},
        src=SRC(11, 'other', ''),
        steps=[
            step('j0', 'encounter', card('نوبت ۶ — واژه را دو تکه ببین: کشور + پسوند.', ja='ちゅうごくじん = ちゅうごく + じん', line=KA(6), audio=KA(6), hl='じん'), None, 'teach', 'auto_after_audio', src=SRC(3, 'goi', 'items 5+30')),
            step('j1', 'form', card(ja='じん (人)', reading='jin', line=KA(6)),
                 inter('select', 'پسوند じん چه معنی می‌دهد؟',
                       [opt('o1', 'آدمِ آن کشور — ملیت'), opt('o2', 'زبان آن کشور'), opt('o3', 'غذای آن کشور')], 'o1',
                       {'o2': 'زبان با پسوند ご است — به‌زودی مقایسه می‌کنیم.', 'o3': 'غذا الگوی پسوندی دیگری دارد.'},
                       ['にほんじん = آدمِ ژاپن — جزوه ص۳ آیتم ۳۰.'],
                       fbW='じん = ملیت؛ به اسم کشور می‌چسبد.'), src=SRC(3, 'goi', 'item 30')),
            step('j2', 'meaning', card(ja='アメリカ + じん', reading='amerika + jin', line=KA(8)),
                 inter('select', 'アメリカじん یعنی چه؟ (کشور در ضمیمهٔ ص۱۲)',
                       [opt('o1', 'آمریکایی'), opt('o2', 'زبان انگلیسی'), opt('o3', 'آقای آمریکا')], 'o1',
                       {'o2': 'زبان آمریکا با الگوی えいگو می‌آید نه پسوند کشور.', 'o3': 'さん برای اسم آدم است نه کشور.'},
                       ['الگو: کشور + じん = آدمِ آن کشور.'],
                       fbW='アメリカじん = آمریکایی — همان الگوی にほんじん.'), src=SRC(12, 'other', 'appendix USA')),
            step('j3', 'situation', card(line=KA(10), audio=KA(10)),
                 inter('listen_choose', 'در نوبت ۱۰ ملیت کیم چیست؟',
                       [opt('o1', 'かんこくじん', 'かんこくじん'), opt('o2', 'ちゅうごくじん', 'ちゅうごくじん'), opt('o3', 'にほんじん', 'にほんじん')], 'o1',
                       {'o2': 'همان چیزی است که کیم «نیست» — توجه به では ありません.', 'o3': 'ژاپنی بودن یاماداست.'},
                       ['بعد از منفی، ملیت درست با です می‌آید.'],
                       fbW='かんこくじん です — کیم کره‌ای است.'), src=SRC(3, 'goi', 'item 6')),
            step('j4', 'register', card(ja='にほんご', reading='nihongo', line=KA(3)),
                 inter('select', 'کنتراست — にほんご (ضمیمهٔ ص۱۲) یعنی چه؟',
                       [opt('o1', 'زبان ژاپنی'), opt('o2', 'آدم ژاپنی'), opt('o3', 'محصول ژاپن')], 'o1',
                       {'o2': 'آدم ژاپنی = にほんじん با じん.', 'o3': 'محصول پسوند ملیت نمی‌گیرد.'},
                       ['ご (語) برای زبان، じん (人) برای آدم — دو پسوند دو دنیا.'],
                       fbW='ご = زبان؛ にほんご = زبان ژاپنی.'), src=SRC(12, 'other', 'appendix Japan row')),
            step('j5', 'build', card(line=KA(8)),
                 inter('complete', '«ایرانی» را بساز — نوبت ۸ دربارهٔ علی',
                       [opt('o1', 'イランじん', 'イランじん'), opt('o2', 'イランご', 'イランご'), opt('o3', 'イランさん', 'イランさん')], 'o1',
                       {'o2': 'ご زبان می‌سازد — الگوی ملیت نمی‌دهد.', 'o3': 'さん بعد از اسم کشور نمی‌نشیند.'},
                       ['کشور + پسوند آدم.'],
                       fbC='イランじん — دقیقاً نوبت ۸؛ الگو برای هر کشور ضمیمه جواب می‌دهد.',
                       fbW='الگوی ملیت = کشور + じん.'), 'guided', src=SRC(3, 'kaiwa', 'turn 8')),
            step('j6', 'exit', card(line=KA(12)),
                 inter('select', 'کیم از کجا آمده؟ (نوبت ۱۲)',
                       [opt('o1', 'かんこく', 'かんこく'), opt('o2', 'ちゅうごく', 'ちゅうごく'), opt('o3', 'インド', 'インド')], 'o1',
                       {'o2': 'چین مبدأ سوراست.', 'o3': 'هند فقط در مثال گرامر جزوه آمد.'},
                       ['نوبت ۱۲ — بعد از から اسم کشور است.'],
                       fbW='かんこくから きました — از کره آمده‌ام.')),
        ],
        next_='stn-n5l01-07-who', guided=['j5'], srs=[7, 30],
        conv={'sourceLineRef': KA(6), 'returnLineRef': KA(10)},
        fsrs=['w-voc-chuugokujin', 's-voc-chuugokujin', 'w-voc-kankokujin', 's-voc-kankokujin', 'w-voc-nihonjin', 's-voc-nihonjin']),
]

chapter['stations'] += [
    # ── ۷) شنیدار هدفمند شخص سوم ──
    stn('stn-n5l01-07-who', 'listening', 'teaching', 'پرسش مؤدانه دربارهٔ شخص سوم را در شنیدار تشخیص می‌دهد', ['stn-n5l01-06-jin'],
        intro={'textFa': 'وسط فصل — نگه‌داشت شنیدار: نوبت‌های ۷ و ۸ فقط پرسش و معرفی شخص سوم‌اند.', 'conversationRef': KA(7)},
        src=SRC(6, 'hyoogen', ''), flags=['audio_pending'],
        steps=[
            step('l0', 'predict', card('قبل از شنیدن — در این نوبت‌ها دربارهٔ چه کسی صحبت می‌شود؟ به صحنه نگاه کن (پاسخ غلط جایی ندارد).', line=KA(7)), None, 'teach', 'on_view', src=SRC(2, 'kaiwa', 'turn 7')),
            step('l1', 'gist', card(line=KA(7), audio=KA(7)),
                 inter('listen_choose', 'میکی دربارهٔ چه چیزی می‌پرسد؟',
                       [opt('o1', 'あのかた', 'あのかた'), opt('o2', 'この かふえ', 'この かふえ'), opt('o3', 'がくせい', 'がくせい')], 'o1',
                       {'o2': 'کافه موضوع نوبت ۷ نیست — میکی به آدم اشاره می‌کند.', 'o3': 'دانشجو موضوع نوبت‌های معرفی خودی‌هاست.'},
                       ['شنیدار اول — فقط موضوع پرسش را بگیر؛ どなた یعنی «چه کسی».'],
                       fbW='あのかたは どなたですか — پرسش دربارهٔ آن شخص.'), listen=1, src=SRC(6, 'hyoogen', 'item 5')),
            step('l2', 'targeted', card(line=KA(8), audio=KA(8)),
                 inter('listen_choose', 'شغل علی چیست؟ (شنیدار دوم)',
                       [opt('o1', 'だいがくの せんせい', 'だいがくの せんせい'), opt('o2', 'がくせい', 'がくせい'), opt('o3', 'エンジニア', 'エンジニア')], 'o1',
                       {'o2': 'دانشجو سوراست.', 'o3': 'مهندس مثال گرامر جزوه ص۸ است — در این نوبت نیامده.'},
                       ['بعد از ملیت، جملهٔ سوم نوبت ۸ شغل را می‌گوید.'],
                       fbW='だいがくの せんせいです — استاد دانشگاه.'), listen=1, src=SRC(3, 'kaiwa', 'turn 8')),
            step('l3', 'verify', card('شنیدن سوم با متن — دو نوبت را با زیرنویس مقایسه کن.', line=KA(7)), None, 'teach', 'on_view', listen=2),
            step('l4', 'reflect', card(line=KA(7)),
                 inter('select', 'چرا あのかた/どなた به‌جای このひと/だれ؟',
                       [opt('o1', 'شکل مؤدانه برای آدم غریبه'), opt('o2', 'چون جمله بلندتر می‌شود'), opt('o3', 'فقط در نوشتن به کار می‌رود')], 'o1',
                       {'o2': 'طول جمله ملاک مؤدب بودن نیست.', 'o3': 'در گفتار روزمرهٔ مؤدانه هم همین‌ها را می‌شنوی — نوبت ۷.'},
                       ['جزوه ص۳ آیتم ۲۰: どなた = «چه کسی» به شکل مؤدانه.'],
                       fbW='دربارهٔ غریبه مؤدانه‌تر: あのかた + どなた.'), src=SRC(3, 'goi', 'item 20')),
            step('l5', 'exit', card(line=KA(7)),
                 inter('select', 'کدام جمله پرسش مؤدانهٔ «آن شخص کیست؟» است؟',
                       [opt('o1', 'あのかたは どなたですか。', 'あのかたは どなたですか。'), opt('o2', 'あなたは だれですか。', 'あなたは だれですか。'), opt('o3', 'これ なんですか。', 'これ なんですか。')], 'o1',
                       {'o2': 'خطاب مستقیم با あなた برای غریبه بی‌ادب است.', 'o3': '«این چیست؟» برای چیز است نه آدم.'},
                       ['ترکیب نوبت ۷ را بساز: آن شخص + کیست مؤدانه + ですか.'],
                       fbW='あのかたは どなたですか — عین نوبت ۷.')),
        ],
        next_='stn-n5l01-08-neg-mo', conv={'sourceLineRef': KA(7), 'returnLineRef': KA(8)}),

    # ── ۸) GR-02: منفی + も ──
    stn('stn-n5l01-08-neg-mo', 'grammar', 'teaching', 'با では ありません نفی می‌کند و با も اشتراک می‌سازد', ['stn-n5l01-06-jin'],
        intro={'textFa': 'نوبت‌های ۹ و ۱۰ — جزوه ص۷–۹: شکل منفی です و ذرهٔ も.', 'conversationRef': KA(10)},
        src=SRC(7, 'bumpoo', ''),
        steps=[
            step('n0', 'notice', card('نوبت ۱۰ — سورا حرف یامادا را اصلاح می‌کند؛ به بخش میانی جمله گوش کن.', line=KA(10), audio=KA(10), hl='では ありません'), None, 'teach', 'auto_after_audio', src=SRC(7, 'bumpoo', 'pattern 2')),
            step('n1', 'function', card(ja='AはBでは ありません。', reading='A wa B dewa arimasen', line=KA(10)),
                 inter('select', 'では ありません چه می‌کند؟',
                       [opt('o1', 'نفی می‌کند — «B نیست»'), opt('o2', 'پرسش می‌سازد'), opt('o3', 'زمان را گذشته می‌کند')], 'o1',
                       {'o2': 'پرسش با か است.', 'o3': 'گذشته با でした — جزوه ص۸–۹ و برای فصل بعد.'},
                       ['جزوه ص۷: «This is the negative form of です».'],
                       fbW='では ありません = شکل منفیِ مؤدانهٔ です.'), src=SRC(7, 'bumpoo', 'pattern 2 توضیح')),
            step('n2', 'form', card(ja='わたしは がくせい__ ありません。', reading='watashiwa gakusee __ arimasen', line=KA(10)),
                 inter('complete', 'مثال ۲ جزوه ص۸ را کامل کن',
                       [opt('o1', 'では', 'では'), opt('o2', 'でも', 'でも'), opt('o3', 'には', 'には')], 'o1',
                       {'o2': 'でも «اما» است — حرف ربط، نه بخش شکل منفی.', 'o3': 'には الگویی متفاوت دارد که هنوز نیامده.'},
                       ['شکل رسمی: では؛ شکل خودی: じゃ — جزوه هر دو را داده.'],
                       fbW='がくせいでは ありません — では در موقعیت رسمی.'), src=SRC(8, 'bumpoo', 'example 2')),
            step('n3', 'examples', card(line=KA(10)),
                 inter('select', '«کیم چینی نیست» — کدام؟',
                       [opt('o1', 'キムさんは ちゅうごくじんでは ありません。', 'キムさんは ちゅうごくじんでは ありません。'), opt('o2', 'キムさんは ちゅうごくじんです。', 'キムさんは ちゅうごくじんです。'), opt('o3', 'キムさんは かんこくじんでは ありません。', 'キムさんは かんこくじんでは ありません。')], 'o1',
                       {'o2': 'این تأیید است نه نفی — نوبت ۱۰ نفی می‌کند.', 'o3': 'کره‌ای بودن تأیید می‌شود؛ نفی‌شده چینی بودن است.'},
                       ['چیزِ نفی‌شده در نوبت ۱۰ چیست؟'],
                       fbW='نفی روی چینی بودن است؛ کره‌ای بودن با です تأیید می‌شود.'), src=SRC(7, 'bumpoo', 'example 1')),
            step('n4', 'examples', card(line=KA(9)),
                 inter('select', 'جای ذرهٔ も در نوبت ۹ — キムさん__ ちゅうごくじん です か。',
                       [opt('o1', 'も', 'も'), opt('o2', 'は', 'は'), opt('o3', 'が', 'が')], 'o1',
                       {'o2': 'は موضوع جدید نشان می‌دهد — اینجا «هم» معنی می‌خواهیم.', 'o3': 'が هنوز درس داده نشده و در این مکالمه نیست.'},
                       ['جزوه ص۹: も وقتی می‌آید که همان چیز برای نفر دیگر هم تکرار شود.'],
                       fbW='も جای は می‌نشیند و «هم» می‌دهد.'), src=SRC(9, 'bumpoo', 'pattern 6')),
            step('n5', 'build', card(ja='わたしの ともだちも ちゅうごくじんです。', reading='watashino tomodachimo chuugokujindesu', line=KA(9)),
                 inter('order_build', '«دوستم هم چینی است» — مثال ۱ جزوه ص۹ را بچین',
                       None, None,
                       tiles=['わたしの ともだち', 'も', 'ちゅうごくじんです'], extra=['では ありません'],
                       hints=['موضوع + も + هسته + です — منفی اینجا جایی ندارد.'],
                       fbC='わたしの ともだちも ちゅうごくじんです — دقیقاً مثال جزوه.',
                       fbW='جملهٔ مثبت است؛ شکل منفی را بردار.'), 'guided', src=SRC(9, 'bumpoo', 'pattern 6 example 1')),
            step('n6', 'exit', card(line=KA(11)),
                 inter('select', 'یامادا خبر کیم را با کدام عبارت می‌پذیرد؟',
                       [opt('o1', 'そうですか。', 'そうですか。'), opt('o2', 'はじめまして。', 'はじめまして。'), opt('o3', 'こんにちは。', 'こんにちは。')], 'o1',
                       {'o2': 'برای ملاقات اول است نه دریافت خبر.', 'o3': 'سلام آغاز گفتگو است.'},
                       ['نوبت ۱۱ — دو عبارت واکنش پشت هم.'],
                       fbW='そうですか + わかりました — واکنش‌های جزوه (Ⅳ-4 و Ⅳ-6).')),
        ],
        next_='stn-n5l01-09-san', guided=['n5'], srs=[7, 30],
        conv={'sourceLineRef': KA(9), 'returnLineRef': KA(10)}, fsrs=['gr-gr-neg-mo']),

    # ── ۹) T1 さん ──
    stn('stn-n5l01-09-san', 'vocab', 'teaching', 'さん را فقط برای دیگران به کار می‌برد و پرسش مؤدانه را می‌شناسد', ['stn-n5l01-08-neg-mo'],
        intro={'textFa': 'مهم‌ترین قاعدهٔ اجتماعی این درس — جزوه ص۳ آیتم ۳: さん پسوند احترام برای نام دیگران.', 'conversationRef': KA(1)},
        src=SRC(3, 'goi', ''),
        steps=[
            step('t0', 'encounter', card('مقایسهٔ دو نوبت — به نام دیگران さん می‌چسبد؛ یامادا برای خودش می‌گوید やまだです نه やまださんです.', ja='やまださん です ね / やまだです。', line=KA(1), audio=KA(1), hl='さん'), None, 'teach', 'auto_after_audio', src=SRC(3, 'goi', 'item 3')),
            step('t1', 'situation', card(line=KA(3)),
                 inter('select', 'خودت را معرفی می‌کنی (اسم تو やまだ) — کدام درست است؟',
                       [opt('o1', 'やまだです。', 'やまだです。'), opt('o2', 'やまださんです。', 'やまださんです。'), opt('o3', 'さんです。', 'さんです。')], 'o1',
                       {'o2': 'رایج‌ترین خطا — さん هرگز برای خودت؛ قاعدهٔ ثبت اجتماعی.', 'o3': 'پسوند تنهایی معنی ندارد.'},
                       ['نوبت ۳ — یامادا برای خودش چه گفت؟'],
                       fbW='やまだです — بدون さん؛ به نام دیگران さん می‌چسبد.'), src=SRC(3, 'goi', 'item 3 توضیح')),
            step('t2', 'situation', card(line=KA(2)),
                 inter('select', 'خطاب به خانم کیم — چه می‌گویی؟',
                       [opt('o1', 'キムさん', 'キムさん'), opt('o2', 'キム', 'キム'), opt('o3', 'キムご', 'キムご')], 'o1',
                       {'o2': 'بی‌احترامی است — به نام دیگران さん لازم است.', 'o3': 'ご پسوند زبان است.'},
                       ['نوبت ۹ — یامادا به کیم چه می‌گوید؟'],
                       fbW='キムさん — نام + さん برای دیگران.'), src=SRC(3, 'kaiwa', 'turn 9')),
            step('t3', 'collocation', card(ja='__は どなた です か。', reading='__ wa donata desuka', line=KA(7)),
                 inter('complete', 'پرسش مؤدانه را کامل کن — به چه موضوعی؟',
                       [opt('o1', 'あのかた', 'あのかた'), opt('o2', 'あなた', 'あなた'), opt('o3', 'わたし', 'わたし')], 'o1',
                       {'o2': 'خطاب مستقیم با あなた به غریبه بی‌ادبانه است — مؤدبانه‌اش あのかた است.', 'o3': 'پرسش دربارهٔ خودت بی‌معنی است.'},
                       ['نوبت ۷ — میکی دربارهٔ چه کسی پرسید؟'],
                       fbW='あのかたは どなたですか — جفت مؤدانهٔ کامل.'), src=SRC(3, 'goi', 'item 16')),
            step('t4', 'build', card(line=KA(4)),
                 inter('judge', 'میزبان به تو می‌گوید はじめまして — اسم تو アリア است؛ جواب؟',
                       [opt('o1', 'はじめまして、アリアです。', 'はじめまして、アリアです。'), opt('o2', 'はじめまして、アリアさんです。', 'はじめまして、アリアさんです。'), opt('o3', 'アリアさん です ね。', 'アリアさん です ね。')], 'o1',
                       {'o2': 'さん برای خودت ممنوع — همان قاعدهٔ گام قبل.', 'o3': 'تأیید شخص سوم است نه معرفی خود.'},
                       ['الگوی نوبت ۴ سورا را با اسم خودت عوض کن.'],
                       fbC='はじめまして、アリアです — معرفی بدون さん برای خود.',
                       fbW='الگوی سورا: اسم بدون さん + です.'), 'guided', src=SRC(2, 'kaiwa', 'turn 4')),
            step('t5', 'exit', card(line=KA(7)),
                 inter('select', 'کدام کاربرد غلط است؟',
                       [opt('o1', 'گفتن やまださん دربارهٔ خودت'), opt('o2', 'گفتن キムさん دربارهٔ کیم'), opt('o3', 'پرسیدن どなたですか دربارهٔ غریبه')], 'o1',
                       {'o2': 'درست است — برای دیگران لازم.', 'o3': 'درست است — مؤدانه‌ترین شکل پرسش.'},
                       ['قاعدهٔ یک‌خطی فصل: さん فقط برای دیگران.'],
                       fbW='さん هرگز برای خودت — やまだです.')),
        ],
        next_='stn-n5l01-10-practice', guided=['t4'], srs=[7, 30],
        conv={'sourceLineRef': KA(1), 'returnLineRef': KA(3)},
        fsrs=['w-voc-san', 's-voc-san', 'w-voc-anokata', 's-voc-anokata', 'w-voc-donata', 's-voc-donata']),
]

def ps(sid, t, prompt, options=None, correct=None, reasons=None, fbW=None, card_=None, tiles=None, extra=None):
    """independent practice item — no hints (three-level policy)."""
    it = {'type': t, 'promptFa': prompt}
    if options: it['options'] = options
    if correct: it['correct'] = correct
    if reasons: it['distractorReasons'] = reasons
    if fbW: it['feedbackWrongFa'] = fbW
    if tiles: it['tiles'] = tiles
    if extra: it['extraTiles'] = extra
    return step(sid, 'retrieve', card_, it, 'independent')

chapter['stations'] += [
    # ── ۱۰) تمرین مستقل درهم‌آمیخته ──
    stn('stn-n5l01-10-practice', 'practice', 'practice', 'آموخته‌های فصل را بدون راهنما بازیابی می‌کند', ['stn-n5l01-08-neg-mo', 'stn-n5l01-09-san'],
        completion={'kind': 'exercise_threshold', 'threshold': 0.7},
        src=SRC(7, 'bumpoo', 'mixed retrieval'),
        steps=[
            ps('p1', 'select', 'アメリカじん یعنی چه؟',
               [opt('o1', 'آمریکایی'), opt('o2', 'زبان انگلیسی'), opt('o3', 'آقای آمریکا')], 'o1',
               {'o2': 'زبان با ご است.', 'o3': 'さん پسوند نام است.'},
               'کشور + じん = ملیت.', card_=card(line=KA(8))),
            ps('p2', 'complete', 'نوبت ۶ — جملهٔ سورا را کامل کن',
               [opt('o1', 'です', 'です'), opt('o2', 'では ありません', 'では ありません'), opt('o3', 'も', 'も')], 'o1',
               {'o2': 'سورا چینی بودنش را تأیید می‌کند نه نفی.', 'o3': 'も «هم» است و اینجا موضوع جدید است.'},
               'はい、わたしは ちゅうごくじん です — تأیید با です.', card_=card(ja='ソラは ちゅうごくじん__。', line=KA(6))),
            ps('p3', 'listen_choose', 'کدام جمله را می‌شنوی؟',
               [opt('o1', 'わたしは にほんじんです。', 'わたしは にほんじんです。'), opt('o2', 'わたしは がくせいです。', 'わたしは がくせいです。'), opt('o3', 'かんこくから きました。', 'かんこくから きました。')], 'o1',
               {'o2': 'عنوان درس است اما صدای نوبت ۳ جملهٔ یاماداست.', 'o3': 'جملهٔ کیم نوبت ۱۲ است.'},
               'صدا را دوباره پخش کن — ملیت یامادا.', card_=card(line=KA(3), audio=KA(3))),
            ps('p4', 'order_build', '«استاد دانشگاه است» را بچین', None, None, None,
               'چانک نوبت ۸ — だいがくの せんせい + です.',
               card_=card(line=KA(8)), tiles=['だいがくの', 'せんせい', 'です'], extra=['じゃ ありません']),
            ps('p5', 'select', 'どなた شکل مؤدانهٔ کدام واژه است؟',
               [opt('o1', 'だれ', 'だれ'), opt('o2', 'なん', 'なん'), opt('o3', 'どこ', 'どこ')], 'o1',
               {'o2': 'なん «چه چیزی» می‌پرسد.', 'o3': 'どこ «کجا» می‌پرسد.'},
               'どなた = چه کسی (مؤدانه) — جزوه ص۳ آیتم ۲۰.', card_=card(line=KA(7))),
            ps('p6', 'judge', 'شنیده‌ای: いいه، がくせいでは ありません — پس آن آدم دانشجوست یا نه؟',
               [opt('o1', 'نه، نیست'), opt('o2', 'بله، هست'), opt('o3', 'از متن معلوم نیست')], 'o1',
               {'o2': 'いいه + شکل منفی یعنی نفی صریح.', 'o3': 'شکل منفی صریح است — معلوم است.'},
               'いいه + では ありません = نفی.', card_=card(line=KA(10))),
            ps('p7', 'complete', 'نوبت ۹ — ذرهٔ «هم» را بگذار',
               [opt('o1', 'も', 'も'), opt('o2', 'は', 'は'), opt('o3', 'ね', 'ね')], 'o1',
               {'o2': 'は «هم» نمی‌دهد — موضوع جدید می‌سازد.', 'o3': 'ね تأییدی است نه اشتراکی.'},
               'キムさんも — اشتراک با も.', card_=card(ja='キムさん__ ちゅうごくじん です か。', line=KA(9))),
            ps('p8', 'order_build', '«من ژاپنی‌ام» را بچین', None, None, None,
               'مثال ۱ جزوه ص۷ — わたしは にほんじんです.',
               card_=card(line=KA(3)), tiles=['わたしは', 'にほんじん', 'です'], extra=['では ありません']),
            ps('p9', 'listen_choose', 'کیم چه می‌گوید؟',
               [opt('o1', 'かんこくから きました。', 'かんこくから きました。'), opt('o2', 'だいがくの せんせいです。', 'だいがくの せんせいです。'), opt('o3', 'そうですか。', 'そうですか。')], 'o1',
               {'o2': 'شغل علی است نه کیم.', 'o3': 'واکنش یامادا در نوبت ۱۱ است.'},
               'نوبت ۱۲ — مبدأ + から + きました.', card_=card(line=KA(12), audio=KA(12))),
            ps('p10', 'judge', 'کدام مؤدانه‌ترین شکل پرسش دربارهٔ شخص است؟',
               [opt('o1', 'あのかたは どなたですか。', 'あのかたは どなたですか。'), opt('o2', 'これは だれですか。', 'これは だれですか。'), opt('o3', 'キムは だれ؟', 'キムは だれ؟')], 'o1',
               {'o2': 'برای چیز نزدیک است و مؤدانه نیست.', 'o3': 'بی‌احترام — نام بدون さん و だれ ساده.'},
               'あのかた + どなた + ですか — سه‌تایی مؤدانهٔ نوبت ۷.', card_=card(line=KA(7))),
        ],
        next_='stn-n5l01-11-speak'),

    # ── ۱۱) نردبان گفتار ──
    stn('stn-n5l01-11-speak', 'speaking', 'teaching', 'معرفی کامل خودش را به ژاپنی مؤدانه تولید می‌کند', ['stn-n5l01-09-san', 'stn-n5l01-10-practice'],
        intro={'textFa': 'حالا نوبت توست — الگوی جزوه ص۱۰ (حذف فاعل): はじめまして、（اسم）です.', 'conversationRef': KA(3)},
        src=SRC(10, 'bumpoo', ''), flags=['audio_pending'],
        steps=[
            step('k0', 'model', card('مدل را بشنو — یامادا در نوبت ۳، بعد با اسم خودت همان را می‌سازی.', line=KA(3), audio=KA(3)), None, 'teach', 'auto_after_audio', src=SRC(10, 'bumpoo', 'pattern 7 example 1')),
            step('k1', 'model', card(line=KA(3)),
                 inter('listen_choose', 'در معرفی کامل، کدام بخش اول می‌آید؟',
                       [opt('o1', 'はじめまして', 'はじめまして'), opt('o2', 'よろしく おねがいします', 'よろしく おねがいします'), opt('o3', 'かんこくから きました', 'かんこくから きました')], 'o1',
                       {'o2': 'بستهٔ پایانی است — آخر می‌آید.', 'o3': 'فقط اگر مبدأ داشته باشی — بعد از اسم می‌آید.'},
                       ['الگوی نوبت ۳: سلامِ اول → اسم → بستهٔ پایانی.'],
                       fbW='はじめまして دروازهٔ معرفی است.'), src=SRC(6, 'hyoogen', 'items 2-3')),
            step('k2', 'model', card(line=KA(3)),
                 inter('select', 'اسم تو アリア است — کدام معرفی بدون خطا است؟',
                       [opt('o1', 'はじめまして、アリアです。', 'はじめまして、アリアです。'), opt('o2', 'はじめまして、アリアさんです。', 'はじめまして、アリアさんです。'), opt('o3', 'アリアさん です ね。', 'アリアさん です ね。')], 'o1',
                       {'o2': 'さん برای خودت ممنوع — خطای ثبت‌شدهٔ فصل.', 'o3': 'تأیید شخص سوم است، معرفی نیست.'},
                       ['قاعدهٔ ایستگاه さん را یادت آمد؟'],
                       fbW='اسم خودت بدون さん + です.'), src=SRC(3, 'goi', 'item 3')),
            step('k3', 'build', card(line=KA(3)),
                 inter('order_build', 'معرفی خودت را بچین (اسم تو アリア)',
                       None, None,
                       tiles=['はじめまして、アリアです。', 'よろしく おねがいします。'], extra=['どなたですか。'],
                       hints=['سلام معرفی + اسم + بستهٔ خواهش — الگوی نوبت‌های ۳ و ۴.'],
                       fbC='معرفی کامل خودت — همان چیزی که در مکالمه واقعی می‌گویی.',
                       fbW='پرسش どなた برای دیگران است — اینجا معرفی خودت است.'), 'guided', src=SRC(10, 'bumpoo', 'pattern 7')),
            step('k4', 'build', card(line=KA(12)),
                 inter('order_build', 'معرفی با مبدأ — الگوی کیم در نوبت ۱۲ را برای اسم アリア بساز',
                       None, None,
                       tiles=['アリアです。', 'イランから', 'きました。', 'よろしく おねがいします。'], extra=['そうですか。'],
                       hints=['اسم+です → مبدأ+から → きました → بستهٔ پایانی.'],
                       fbC='معرفی با مبدأ — چانک 〜から きました مسیر آشنا.',
                       fbW='ترتیب نوبت ۱۲ را دنبال کن: اسم، مبدأ، بستهٔ پایانی.'), 'guided', src=SRC(3, 'kaiwa', 'turn 12')),
            step('k5', 'exit', card(line=KA(13)),
                 inter('select', 'بستهٔ کامل معرفی خودت کدام است؟',
                       [opt('o1', 'はじめまして、（اسم）です。よろしく おねがいします。'), opt('o2', '（اسم）さんです。'), opt('o3', 'そうですか。わかりました。')], 'o1',
                       {'o2': 'さん برای خودت نمی‌آید و معرفی کامل نیست.', 'o3': 'واکنش‌های شنونده است نه معرف.'},
                       ['چانک‌های ایستگاه سلام + حذف فاعل.'],
                       fbW='سلام معرفی + اسم+です + بستهٔ خواهش.')),
        ],
        next_='stn-n5l01-12-reconnect', guided=['k3', 'k4'],
        conv={'sourceLineRef': KA(3), 'returnLineRef': KA(13)}),

    # ── ۱۲) بازگشت + انتقال ──
    stn('stn-n5l01-12-reconnect', 'transfer', 'review', 'کل مکالمه را می‌فهمد و همان مهارت را در موقعیت جدید به کار می‌برد', ['stn-n5l01-11-speak'],
        intro={'textFa': 'مرحلهٔ ۱۳ — مکالمهٔ اول فصل را حالا دوباره بشنو؛ تفاوت با اول فصل را حس کن.', 'conversationRef': KA(1)},
        src=SRC(11, 'other', ''), flags=['audio_pending'],
        steps=[
            step('r0', 'verify', card('کل مکالمه — این بار بدون کمک، فقط با زیرنویس چک کن.', line=KA(1)), None, 'teach', 'on_view', listen=2),
            step('r1', 'detail', card(line=KA(10)),
                 inter('select', 'چرا سورا در نوبت ۱۰ いいه می‌گوید؟',
                       [opt('o1', 'چون کیم چینی نیست — اصلاح مؤدانه'), opt('o2', 'چون خودش چینی نیست'), opt('o3', 'چون پرسش را نشنیده')], 'o1',
                       {'o2': 'حرف دربارهٔ کیم است نه خود سورا.', 'o3': 'پرسش نوبت ۹ را شنیده — پاسخ می‌دهد.'},
                       ['نوبت ۹ چه پرسیده بود؟ — キムさんも؟'],
                       fbW='پرسش دربارهٔ کیم بود؛ سورا با いいه + منفی اصلاح می‌کند.'), src=SRC(3, 'kaiwa', 'turns 9-10')),
            step('r2', 'detail', card(line=KA(9), audio=KA(9)),
                 inter('listen_choose', 'پرسش یامادا در نوبت ۹ دقیقاً چیست؟',
                       [opt('o1', 'キムさんも ちゅうごくじん です か。', 'キムさんも ちゅうごくじん です か。'), opt('o2', 'キムさんは せんせい です か。', 'キムさんは せんせい です か。'), opt('o3', 'キムさんは どなた です か。', 'キムさんは どなた です か。')], 'o1',
                       {'o2': 'شغل کیم در مکالمه نیامده.', 'o3': 'پرسش شخص سوم نوبت ۷ بود دربارهٔ علی.'},
                       ['ذرهٔ も را در صدا بشناس.'],
                       fbW='キムさんも ちゅうごくじん です か — «هم چینی است؟».'), src=SRC(3, 'kaiwa', 'turn 9')),
            step('r3', 'transfer_intro', card('انتقال — مهمانی جدید: مهمان‌هایی از کشورهای ضمیمهٔ جزوه (ص۱۱–۱۳: ブラジル، フランス، …). همان مهارت، اسم‌ها و کشورهای تازه.', line=KA(1)), None, 'teach', 'on_view', src=SRC(11, 'other', 'appendix')),
            ps('r4', 'judge', 'در مهمانی می‌پرسند: あなたは がくせいですか؟ — تو دانشجویی؛ چه می‌گویی؟',
               [opt('o1', 'はい、わたしは がくせいです。', 'はい、わたしは がくせいです。'), opt('o2', 'いいه、がくせいです。', 'いいه、がくせいです。'), opt('o3', 'そうですか。', 'そうですか。')], 'o1',
               {'o2': 'ترکیب غلط — いいه با نفی می‌آید نه تأیید.', 'o3': 'واکنش شنونده است نه پاسخ.'},
               'الگوی نوبت ۶ سورا با هویت خودت.',
               card_=card(line=KA(4))),
            step('r5', 'exit', card(line=KA(7)),
                 inter('select', 'پایان فصل — دربارهٔ مهمان تازه از برزیل چه می‌پرسی؟',
                       [opt('o1', 'ブラジルさんは がくせいですか。', 'ブラジルさんは がくせいですか。'), opt('o2', 'ブラジルじんは どなたですか。', 'ブラジルじんは どなたですか。'), opt('o3', 'ブラジルご です か。', 'ブラジルご です か。')], 'o2',
                       {'o1': 'さん به اسم آدم می‌چسبد؛ ブラジル اسم کشور است — ملیتش ブラジルじん.', 'o3': 'ご زبان می‌پرسد نه آدم.'},
                       ['پرسش شخص سوم مؤدانه: موضوع + どなたですか.'],
                       fbW='ブラジルじんは どなたですか — «آدمِ برزیل کیست؟» — انتقال کامل الگو.'), src=SRC(11, 'other', 'appendix Brazil')),
        ],
        conv={'sourceLineRef': KA(1), 'returnLineRef': KA(13), 'transferNoteFa': 'موقعیت جدید مهمانی با کشورهای ضمیمهٔ جزوه'}),
]

def mb(mid, measure, label, ret, prompt, opts, correct, line, hints, fbW, t='select', skill='grammar', ja=None):
    d = {'id': mid, 'measure': measure, 'measureLabelFa': label, 'returnStationId': ret, 'type': t,
         'targetSkill': skill, 'promptFa': prompt, 'options': opts, 'correctOptionId': correct,
         'hints': hints, 'feedbackWrongFa': fbW, 'lineRef': line}
    if ja: d['promptJa'] = ja
    return d

chapter['masteryBank'] = [
    mb('mb-n5l01-m1a', 'M1', 'سلام و عبارات معرفی', 'stn-n5l01-02-greet', 'پاسخ はじめまして کدام است؟',
       [opt('o1', 'はじめまして、アリです。', 'はじめまして、アリです。'), opt('o2', 'おはようございます。', 'おはようございます。'), opt('o3', 'そうですか。', 'そうですか。')], 'o1', KA(3),
       ['جفت معرفی با اسم بدون さん.'], 'الگوی نوبت ۴.', skill='expression'),
    mb('mb-n5l01-m1b', 'M1', 'سلام و عبارات معرفی', 'stn-n5l01-02-greet', 'به خبر تازه چه می‌گویی؟',
       [opt('o1', 'そうですか。', 'そうですか。'), opt('o2', 'はじめまして。', 'はじめまして。'), opt('o3', 'こんにちは。', 'こんにちは。')], 'o1', KA(11),
       ['واکنش نوبت ۱۱ یامادا.'], 'そうですか — دریافت خبر.', skill='expression'),
    mb('mb-n5l01-m2a', 'M2', 'هویت با AはBです', 'stn-n5l01-04-desu', 'جای خالی را کامل کن',
       [opt('o1', 'です', 'です'), opt('o2', 'も', 'も'), opt('o3', 'ね', 'ね')], 'o1', KA(3),
       ['پایان مؤدانهٔ معرفی.'], 'です — مثال ۱ جزوه ص۷.', ja='わたしは がくせい__。'),
    mb('mb-n5l01-m2b', 'M2', 'هویت با AはBです', 'stn-n5l01-04-desu', 'جای خالی را کامل کن',
       [opt('o1', 'です', 'です'), opt('o2', 'ません', 'ません'), opt('o3', 'さん', 'さん')], 'o1', KA(8),
       ['نوبت ۸ — جملهٔ خبری مثبت.'], 'です — استاد دانشگاه است.', ja='アリさんは だいがくの せんせい__。'),
    mb('mb-n5l01-m3a', 'M3', 'پرسش ですか و پاسخ', 'stn-n5l01-05-qa', 'کدام جمله پرسش است؟',
       [opt('o1', 'あなたは エンジニアですか。', 'あなたは エンジニアですか。'), opt('o2', 'あなたは エンジニアです。', 'あなたは エンジニアです。'), opt('o3', 'エンジニアさん です ね。', 'エンジニアさん です ね。')], 'o1', KA(5),
       ['ذرهٔ پرسشی پایان جمله — جزوه ص۸.'], 'ですか — مثال ۲ جزوه ص۸.'),
    mb('mb-n5l01-m3b', 'M3', 'پرسش ですک و پاسخ', 'stn-n5l01-05-qa', 'چه پرسیده می‌شود؟',
       [opt('o1', 'ちゅうごくじん です か。', 'ちゅうごくじん です か。'), opt('o2', 'ちゅうごくじんでは ありません。', 'ちゅうごくじんでは ありません。'), opt('o3', 'はい、そうです。', 'はい、そうです。')], 'o1', KA(5),
       ['نوبت ۵ — پرسش ملیت سورا.'], 'پرسش با か می‌شنوی.', t='listen_choose', skill='listening'),
    mb('mb-n5l01-m4a', 'M4', 'منفی و も', 'stn-n5l01-08-neg-mo', 'جای خالی را کامل کن',
       [opt('o1', 'では', 'では'), opt('o2', 'でも', 'でも'), opt('o3', 'には', 'には')], 'o1', KA(10),
       ['شکل منفی — مثال ۲ جزوه ص۸.'], 'では ありません.', ja='わたしは せんせい__ ありません。'),
    mb('mb-n5l01-m4b', 'M4', 'منفی و も', 'stn-n5l01-08-neg-mo', 'جای خالی را کامل کن (معنی «هم»)',
       [opt('o1', 'も', 'も'), opt('o2', 'は', 'は'), opt('o3', 'か', 'か')], 'o1', KA(9),
       ['ذرهٔ اشتراک — جزوه ص۹.'], 'も — «هم».', ja='ソラ__ がくせいです。'),
    mb('mb-n5l01-m5a', 'M5', 'فهم مکالمهٔ فصل', 'stn-n5l01-12-reconnect', 'نوبت ۱۲ چه اطلاعات جدیدی داد؟',
       [opt('o1', 'مبدأ کیم'), opt('o2', 'شغل کیم'), opt('o3', 'اسم کافه')], 'o1', KA(12),
       ['から きました — مبدأ.'], 'かんこくから きました — از کره آمده‌ام.', skill='listening'),
    mb('mb-n5l01-m5b', 'M5', 'فهم مکالمهٔ فصل', 'stn-n5l01-12-reconnect', 'پاسخ سورا در نوبت ۱۰ چه بود؟',
       [opt('o1', 'かんこくじん です。', 'かんこくじん です。'), opt('o2', 'ちゅうごくじん です。', 'ちゅうごくじん です。'), opt('o3', 'せんせい です。', 'せんせい です。')], 'o1', KA(10),
       ['بعد از منفی، ملیت درست.'], 'کیم کره‌ای است — کره‌ای + です.', t='listen_choose', skill='listening'),
]

chapter['finalTask'] = {
    'descriptionFa': 'در مهمانی جدید (ضمیمهٔ جزوه ص۱۱–۱۳): خودت را با نام و ملیت/شغل معرفی می‌کنی، دربارهٔ مهمان تازه با あのかたは どなたですか می‌پرسی و با はい/いいه تأیید یا اصلاح می‌کنی — همان Can-do فصل در موقعیت ناشناخته.',
    'sourceRef': SRC(11, 'other', 'appendix')}
chapter['culturalNote'] = [
    {'textFa': 'さん فقط برای نام دیگران؛ به نام خودت نمی‌چسبد — یامادا دربارهٔ خودش やまだです می‌گوید (جزوه ص۳ آیتم ۳ و مکالمه نوبت ۳).', 'sourceRef': SRC(3, 'goi', 'item 3')},
    {'textFa': 'پاسخ ژاپنی با はい/いいه شروع می‌شود — نه تکرار فعل؛ نکتهٔ ص۱۰ جزوه در نوبت‌های ۶ و ۱۰ دیده می‌شود.', 'sourceRef': SRC(10, 'bumpoo', 'note')}]
chapter['productionAudit'] = {
    'coveragePercent': 100, 'interleavingNewOld': '60/40',
    'auditedBy': 'lesson-engine-validator + product validation.ts + EQA',
    'deferredNote': 'الگوهای Ⅴ-4 でした و Ⅴ-5 では ありませんでした (ص۸–۹ جزوه) به فصل بعد؛ واژه‌های غیرمکالمه‌ای Ⅲ به فصل‌های بعد.'}

# ---------- write ----------
import io
class Dumper(yaml.SafeDumper):
    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)
text = yaml.dump(chapter, Dumper=Dumper, allow_unicode=True, sort_keys=False, width=1000, default_flow_style=False)
open(OUT, 'w').write('# HANASO — Lesson Engine draft: n5-lesson-01 (REBUILD of chapter 02)\n')
open(OUT, 'a').write('# Generated by scripts/lesson-engine/build-n5l01-yaml.py — content from owner booklet lesson 1.\n\n')
open(OUT, 'a').write(text)
print('written', OUT, '-', len(text.splitlines()), 'lines')
