/**
 * دیکشنری تایپ‌دار فارسی (ADR-013 KB — رشتهٔ UI هاردکد در کامپوننت ممنوع).
 * استثنا: محتوای ژاپنی «داده» است نه رشتهٔ UI و از مسیر محتوا می‌آید.
 * این فایل نقطهٔ هماهنگی است — تغییر فقط ترتیبی با اعلام در AGENT_PROGRESS.md.
 */
export const fa = {
  notFound: {
    /* TASK-HANASO-20 (BUG-010) — the Persian 404 copy. */
    title: 'این صفحه پیدا نشد',
    body: 'نشانی‌ای که باز کردی به صفحه‌ای نمی‌رسد — شاید جابه‌جا شده باشد. می‌توانی از اینجا مسیرت را ادامه بدهی.',
    backHome: 'بازگشت به خانه',
    goLearn: 'رفتن به مسیر یادگیری',
  },
  common: {
    save: 'ذخیره',
    cancel: 'انصراف',
    close: 'بستن',
    confirm: 'تأیید',
    retry: 'تلاش دوباره',
    loading: 'در حال بارگذاری…',
    openMenu: 'باز کردن منو',
  },
  /*
   * TASK-HANASO-17 — Home dashboard + main navigation. PG-01 (DD-053):
   * «سلام کوتاه» (بدون نام — دادهٔ نام معتبر وجود ندارد)، کارت قدم بعدی با
   * CTA یگانه، مرور صادقانه، لینک کم‌وزن مسیر. بدون عدد ساختگی.
   */
  nav: {
    home: 'خانه',
    journey: 'مسیر یادگیری',
    ariaLabel: 'ناوبری اصلی',
  },
  home: {
    greeting: 'سلام!',
    lead: 'قدم بعدیِ امروز آماده است.',
    /* کارت قدم بعدی — ۶ حالت (HOME_INFORMATION_ARCHITECTURE §۲) */
    primaryTitle: 'قدم بعدی',
    primaryStart: 'شروع یادگیری',
    primaryResume: 'ادامهٔ درس',
    primaryRestart: 'شروع دوبارهٔ درس',
    primaryNext: 'شروع درس بعدی',
    primaryGate: 'دروازهٔ فهم مکالمه',
    primaryReviewCourse: 'مرور مسیر یادگیری',
    primaryResumeExpiredNote:
      'چند روزی به این درس نرسیدی؛ از ابتدای همان درس شروع می‌کنیم — پیشرفت‌های قبلی‌ات سرجایشان هستند.',
    minutesLine: (m: number) => `~${new Intl.NumberFormat('fa-IR').format(m)} دقیقه`,
    /* کارت درس بعدی (ثانویه — فقط وقتی متفاوت از قدم بعدی) */
    nextLessonTitle: 'درس بعدی',
    nextLessonBody: 'اگر ترجیح می‌دهی درس جدیدی را شروع کنی، از این‌جا.',
    nextLessonCta: 'شروع این درس',
    /* مرور — همیشه صادقانه (موتور FSRS هنوز فعال نشده) */
    reviewQueuePending: 'کارت‌های مرورِ آنچه یاد گرفته‌ای ثبت شده‌اند — صف مرور هوشمند به‌زودی فعال می‌شود.',
    reviewDue: (n: number) => `${new Intl.NumberFormat('fa-IR').format(n)} کارت برای مرور امروز`,
    reviewEmpty: 'امروز مروری نداری — درس بدهی یا بخوانی؟',
    reviewCta: 'شروع مرور',
    /* خط مسیر */
    pathLink: 'مشاهدهٔ مسیر یادگیری',
    pathCurrentChapter: (title: string) => `فصل جاری: ${title}`,
    pathCoreDone: (n: number) => `${new Intl.NumberFormat('fa-IR').format(n)} ایستگاه این فصل انجام شد`,
    /* آمار خلاصهٔ صادقانه */
    statsStations: (n: number) => `${new Intl.NumberFormat('fa-IR').format(n)} ایستگاه یادگیری را کامل کرده‌ای`,
    statsChapters: (n: number) => `${new Intl.NumberFormat('fa-IR').format(n)} فصل را فهمیده‌ای`,
  },
  audio: {
    playSentence: 'پخش صدای این جمله',
    replay: 'پخش دوباره',
    stop: 'توقف',
  },
  sentence: {
    revealTranslation: 'نمایش ترجمه',
    hideTranslation: 'پنهان کردن ترجمه',
  },
  uiKit: {
    title: 'نمونهٔ رندر دوزبانه — HANASO',
    subtitle: 'برگهٔ مرجع رندر فارسی + ژاپنی + روبی (TASK-M0-09 · AC-2 · جهت هنری: Aizen — DD-084)',
    mixedSection: 'پاراگراف ترکیبی',
    rubySection: 'روبی (FuriganaText)',
    cardSection: 'کارت جمله و دکمهٔ صوت',
    componentsSection: 'کامپوننت‌های رابط (RTL)',
    mixedIntro: 'مقدمهٔ فارسی:',
    mixedMeans: 'یعنی «صبح بخیر» —',
    mixedAfter: 'و ادامهٔ فارسی پس از جزیره — ترتیب قطعه‌ها باید حفظ شود.',
    serifNote: 'نسخهٔ سرِیف (متن بلند):',
    primaryBtn: 'دکمهٔ اصلی',
    secondaryBtn: 'ثانویه',
    ghostBtn: 'شفاف',
    loadingBtn: 'در حال انجام',
    disabledBtn: 'غیرفعال',
    mainActionBtn: 'اکشن اصلی لمسی',
    hoverMe: 'هاور کن',
    tooltipDemo: 'تولتیپ فارسی با عرض محدود',
    modalBtn: 'مودال',
    modalTitle: 'عنوان مودال',
    modalBody: 'توضیح فارسی مودال — پس‌زمینه با توکن scrim و لایهٔ z-modal.',
    sheetBtn: 'پنل کشویی',
    sheetTitle: 'پنل «در مکالمه ببین»',
    sheetBody: 'side=start در RTL از لبهٔ چپ باز می‌شود.',
    menuBtn: 'منو',
    menuLabel: 'گزینه‌ها',
    menuItemReview: 'شروع مرور',
    menuItemDisabled: 'غیرفعال',
    menuSub: 'زیرمنو',
    menuSubItem: 'عمق ۲',
    tabA: 'الف',
    tabB: 'ب',
    tabAContent: 'محتوای زبانهٔ اول.',
    tabBContent: 'محتوای زبانهٔ دوم.',
    accordionQ: 'چرا جزیرهٔ LTR لازم است؟',
    accordionA: 'بدون isolate، ترتیب قطعه‌های ژاپنی در پاراگراف فارسی وارونه می‌شود (spike M0-08).',
    commandPlaceholder: 'جست‌وجو…',
    commandEmpty: 'نتیجه‌ای نبود.',
    commandGroup: 'واژه‌ها',
    commandItem1: 'コーヒー — قهوه',
    commandItem2: 'お願いします — لطفاً',
    footer: 'انتهای برگهٔ مرجع رندر.',
    translation: 'یک قهوه لطفاً.',
    /* امضاهای Aizen — TASK-DSGN-01 (DD-084) */
    aizenSection: 'امضاهای Aizen — نیلیِ ساختاری و شنگرف',
    aizenIntro:
      'عناصر هویتی جهت هنری منتخب (DD-084): مُهر دایره‌ای فهم، نوار فاز A تا D پستی، پیشرفت راه‌راه مورب و کارت نیلی مکالمه.',
    aizenSealLabel: 'مُهر فهم — پایان مرحلهٔ D',
    aizenRulerLabel: 'نوار فاز A تا D (نمونه: مرحلهٔ C فعال)',
    aizenRulerDone: 'A مکالمه',
    aizenRulerDone2: 'B درس',
    aizenRulerNow: 'C تمرین',
    aizenRulerNext: 'D فهم',
    aizenProgressLabel: 'گام ۳ از ۶ — مرحلهٔ B',
    aizenProgressValue: '۵۰٪',
    aizenChipsLabel: 'چیپ‌های قاب‌دار',
    aizenChipOn: 'روبی: تطبیقی',
    aizenChip1: 'فاز A · مکالمه',
    aizenChip2: '۰٫۹× سرعت',
    aizenDarkCardLabel: 'کارت نیلی مکالمه — زبان صحنهٔ تیره',
    aizenDarkWho: 'ミキ · میکی',
    aizenDarkRegister: 'رجیستر: محترمانهٔ پایه',
    aizenDarkTranslation: '«امروز هوا گرم است. لطفاً آب سرد.» — «کافهٔ صبح»، خط ۳',
    ctaBtn: 'شروع مکالمه',
  },

  /* TASK-LEARNING-01 — سفر جزیره‌ای فصل */
  curriculum: {
    learnIndexTitle: 'یادگیری با مکالمه',
    learnIndexLead:
      'هر فصل با یک مکالمه شروع می‌شود؛ از دلش یاد می‌گیری، با خودش تمرین می‌کنی و در پایان فهمِ همان مکالمه محک می‌خورد.',
    chapterBadge: 'فصل',
    startChapter: 'شروع فصل',
    continueChapter: 'ادامهٔ فصل',
    minutes: 'دقیقه',
    stations: 'ایستگاه',
    canDoTitle: 'در پایان این فصل می‌توانی…',
    sceneTitle: 'صحنه',
    levelLabel: 'سطح',
    /*
     * Issue #94 (Wave 3): honest copy — the chapter soft lock (DD-117/120) means
     * the prerequisite gate REALLY gates entry; the old «بدون آن هم می‌توانی شروع
     * کنی» contradicted it. Rendered ONLY on chapters that declare a prerequisite.
     */
    prerequisitesNote: 'برای باز شدن این فصل، باید ابتدا گیت فهم فصل پیش‌نیاز (فصل کانا) را بگذرانی.',
    /* island journey */
    journeyTitle: 'مسیر جزیره‌ای فصل',
    journeyLead: 'هر ایستگاه یک لنگرگاه است؛ مسیر اصلی را دنبال کن، شاخه‌های اختیاری برای کنجکاوها.',
    stationLocked: 'قفل',
    stationAvailable: 'آماده',
    stationInProgress: 'در جریان',
    stationCompleted: 'انجام‌شده',
    stationNeedsRetry: 'عبور نرم',
    stationOptional: 'اختیاری',
    journeyStart: 'شروع مسیر',
    journeyFinish: 'دروازهٔ فهم',
    coreProgress: 'پیشرفت مسیر اصلی',
    understoodBadge: 'این مکالمه را فهمیدی',
    goToGate: 'آزمون فهم مکالمه',
    nextUp: 'ایستگاه بعدی',
    /*
     * TASK-HANASO-16 — the progressive learning journey (Chapter → Section →
     * Rows → Lessons): one active section panel, prev/next section buttons,
     * progress-extracted active chapter, understood-chapter archive and the
     * late teaser. NO total counts anywhere (owner's progressive-reveal rule).
     */
    journeyHomeTitle: 'مسیر یادگیری تو',
    journeyHomeLead: 'قدم‌به‌قدم جلو می‌روی؛ هر بخش را تمام می‌کنی، بخش بعدی باز می‌شود.',
    sectionBadge: 'بخش',
    sectionGoalLabel: 'هدف این بخش',
    sectionStatusCompleted: 'این بخش را تمام کردی',
    sectionStatusInProgress: 'در حال گذراندن',
    sectionStatusLocked: 'هنوز باز نشده',
    sectionRowsDone: (done: number) => `${new Intl.NumberFormat('fa-IR').format(done)} ایستگاه این بخش انجام شد`,
    rowStart: 'شروع',
    rowContinue: 'ادامه',
    rowReview: 'مرور',
    rowLocked: 'قفل',
    rowOptional: 'اختیاری',
    rowMinutes: (m: number) => `~${new Intl.NumberFormat('fa-IR').format(m)} دقیقه`,
    sectionPrev: 'بخش قبلی',
    sectionNext: 'بخش بعدی',
    sectionFirstHint: 'این اولین بخش است',
    sectionLastHint: 'این آخرین بخش همین فصل است',
    sectionNextLockedHint: 'ایستگاه‌های این بخش هنوز قفل‌اند',
    startLearning: 'شروع یادگیری',
    continueLearning: 'ادامهٔ یادگیری',
    reviewChapterCta: 'مرور این فصل',
    chapterIntroLink: 'معرفی فصل',
    chapterProgressLabel: 'پیشرفت مسیر اصلی فصل',
    coreDoneCount: (done: number) => `${new Intl.NumberFormat('fa-IR').format(done)} ایستگاه مسیر اصلی انجام شد`,
    gateReadyCta: 'آمادهٔ دروازهٔ فهم',
    gateOpenCta: 'دروازهٔ فهم مکالمه',
    archiveTitle: 'فصل‌های گذرانده‌شده',
    archiveSummary: 'برای مرور، هر وقت خواستی برگرد.',
    archiveEmptyHint: 'هنوز فصلی را کامل نفهمیده‌ای — آرشیو همین‌جا پر می‌شود.',
    chapterUnderstoodBadge: 'فهمیده‌شده',
    teaserTitle: 'بعد از این فصل…',
    teaserHint: 'با تمام‌کردن این فصل، فصل بعدی برایت باز می‌شود.',
    reviewModeBadge: 'حالت مرور',
    /* TASK-LEARNING-06 — kana cards + two-level map + chapter prereq */
    kanaCardMissing: (glyph: string) => `کارت کانا «${glyph}» در رجیستری پیدا نشد — محتوای ایستگاه ناقص است.`,
    kanaRomajiHidden: 'روماجی در این مرحله نمایش داده نمی‌شود — از صدای کانا در تمرین بعدی حدس بزن.',
    kanaMnemonicDraft: 'پیش‌نویس — در بازبینی انسانی',
    /* TASK-LEARNING-08 WP-2 (KanaCard v2 — owner feedback A+C): the card TEACHES */
    kanaSoundLabel: (glyph: string) => `پخش صدای ${glyph}`,
    kanaSoundReplay: 'پخش مجدد',
    kanaHostWordPrefix: 'واژهٔ قابل‌خواندن',
    kanaPairCompareTitle: 'جفت اشتباه‌پذیر — با هم ببین',
    kanaPairOther: 'جفتش',
    kanaWritingTitle: (glyph: string) => `نوشتن ${glyph} — ترتیب ضربه‌ها را ببین و خودت بنویس`,
    kanaWritingHide: 'بستن تمرین نوشتن',
    kanaWritingShow: 'نمایش تمرین نوشتن',
    kanaWritingCollapsedNote: 'تمرین نوشتن همین‌جاست — هر وقت خواستی بازش کن.',
    kanaAudioPending: 'صدای این نویسه هنوز تولید نشده؛ به‌محض آماده‌شدن همین‌جا اضافه می‌شود.',
    kanaConfusablePre: 'جفت اشتباه‌پذیر: ',
    /* TASK-LEARNING-08 v4 (owner final correction) — KanaCard v4: ONE unified
       environment, auto-flowing timeline, NO stage CTAs (بند ۱ و ۱۰ مالک) */
    kanaStageIntroTitle: 'آموزش نوشتن این نویسه',
    kanaStageIntroHint: 'شماره، نقطهٔ شروع و جهت هر ضربه را همان‌جا در دفتر می‌بینی — نویسه خودش را می‌نویسد.',
    /* TASK-LEARNING-08 Addendum-2 §4: the ONE interactive stop — after the calm
       introduction, the user confirms readiness; everything after is automatic. */
    kanaStageReadyTitle: 'آماده‌ای؟',
    kanaStageReadyChip: 'تأیید آمادگی',
    kanaStageChipReady: 'آماده',
    kanaStageReadyHint: 'نویسه را نگاه کن، صدایش را بشنو و توضیحش را بخوان — وقتی آماده بودی شروع کن.',
    /* TASK-HANASO-CTA-01 (owner 2026-11-08): the CTA leaves the slot under the
       canvas and becomes the natural LAST step of the introduction — a small
       tidy footer after all the related examples. Arrow = lucide icon (no emoji). */
    kanaStageReadyCta: 'شروع تمرین نوشتن',
    kanaIntroFooterLead: 'معرفی این کاراکتر تمام شد! حالا نوبت توست.',
    kanaIntroExamplesTitle: 'نمونه‌های کاربردی',
    kanaIntroExamplesFold: 'نمونه‌های کاربردی این نویسه',
    kanaStageDemoTitle: 'نحوهٔ نوشتن را ببین',
    kanaStageDemoReplay: 'نمایش دوباره',
    kanaStageDemoDone: 'نمایش تمام شد — با هم مرورش کنیم',
    kanaStageExplainTitle: 'خوانش و شکل نویسه',
    kanaStageGuidedTitle: 'تمرین با راهنما',
    kanaStageGuidedDone: 'همهٔ ضربه‌ها درست شد — حالا بدون راهنما',
    kanaStageFreeTitle: 'نوشتن از حافظه',
    kanaStageFreeDone: 'تمرین نوشتن کامل شد',
    kanaStageWriteAgain: 'یک بار دیگر بنویس',
    kanaStageHelpBtn: 'راهنما',
    kanaStageBackToGuided: 'با راهنما تمرین می‌کنم',
    kanaStageDoneTitle: (glyph: string) => `نوشتن ${glyph} یاد گرفته شد`,
    kanaStagePracticeAgain: 'تمرین مجدد',
    kanaStageStrokeProgress: 'پیشرفت ضربه‌ها',
    kanaStageAudioOnce: 'هر وقت خواستی دوباره پخش کن.',
    kanaReplayTeaching: 'تکرار آموزش',
    /* TASK-LEARNING-08 Addendum-4 — §3 stable action slot + §5 neutral free panel */
    kanaStageGuidedHint:
      'ضربه‌ها را روی راهنمای نقطه‌چین بکش — بعد از هر ضربهٔ درست، همان ضربه با شکل استانداردش جوهری می‌شود.',
    kanaStageFreeHint: 'حالا از حافظه بنویس — اگر جایی گیر کردی، دکمهٔ «راهنما» همین‌جا بالای صفحه است.',
    kanaStageDoneHint: 'تمرین کامل شد — فرم استاندارد و شمارهٔ ضربه‌ها بالاست؛ مسیر خودش ادامه می‌یابد.',
    kanaStageOrderTitle: 'ترتیب ضربه‌ها',
    kanaStageOrderRest: 'فرم کامل و شمارهٔ هر ضربه بالاست — با «تکرار آموزش» می‌توانی دوباره تماشایش کنی.',
    kanaStageMemoryHint: 'از خودت تصمیم بگیر از کجا و چطور شروع کنی؛ سیستم چیزی را لو نمی‌دهد.',
    kanaStageMemoryHelp: 'راهنما خواستی؟ دکمهٔ «راهنما» را بزن — بعد از چند اشتباه هم خودش کمکت می‌کند.',
    kanaStageChipIntro: 'آموزش',
    kanaStageChipDemo: 'نمایش نوشتن',
    kanaStageChipExplain: 'توضیح',
    kanaStageChipGuided: 'تمرین با راهنما',
    kanaStageChipFree: 'نوشتن از حافظه',
    kanaStageChipDone: 'کامل شد',
    kanaStrokesWord: 'ضربه',
    /* TASK-LEARNING-08 Addendum-3 — §8 Latin complement + §9 audio speed state */
    kanaReadingLatin: (faReading: string, latin: string) => `${faReading} | ${latin}`,
    kanaSpeedNormal: 'عادی',
    kanaSpeedSlow: 'آهسته',
    kanaSpeedLabel: 'سرعت پخش',
    kanaWordAudioLabel: (word: string) => `پخش صدای واژهٔ ${word}`,
    kanaWordAudioPending: 'صدای این واژه هنوز تولید نشده.',
    /* TASK-LEARNING-08 Addendum-4 §7 — example-word audio (example-set blocks) */
    kanaExampleAudioLabel: (word: string) => `پخش صدای مثالِ ${word}`,
    kanaExampleAudioNone: 'صدای این مثال هنوز تولید نشده.',
    /* TASK-LEARNING-08 Addendum-5 §1 — practice-focused view: the intro-only
       cards collapse (never deleted) while the learner is writing. */
    kanaIntroFoldReading: 'اطلاعات معرفی — تلفظ و واژهٔ نمونه',
    kanaIntroFoldSide: 'اطلاعات معرفی — یادسپار و جفت مشابه',
    /* TASK-LEARNING-09 §۶ — the host readable word + the related usage
       examples merge into ONE section (no duplicated word cards). */
    kanaReadableExamplesTitle: 'نمونه‌های قابل‌خواندن',
    kanaReadableExamplesFold: 'نمونه‌های قابل‌خواندن این نویسه',
    /* TASK-LEARNING-09 §۱۵ — the mnemonic story returns to the introduction
       flow; the practice fold groups the whole introduction info column. */
    kanaIntroFoldInfo: 'اطلاعات معرفی — تلفظ، یادسپار و جفت مشابه',
    /* TASK-LEARNING-08 Addendum-5 §3 — audio presence in kana questions */
    exHearQuestionSound: 'شنیدن صدا',
    exHearQuestionSoundAria: 'پخش صدای این سؤال',
    exListenAutoNote: 'صدا به‌صورت خودکار پخش می‌شود — دوباره خواستی، پخش مجدد را بزن.',
    exPromptSoundNote: 'صدای همان خوانشی که در صورت سؤال می‌بینی — شکل درستش را از بین گزینه‌ها پیدا کن.',
    exHearCorrectPron: 'شنیدن تلفظ درست',
    exHearCorrectPronAria: (what: string) => `پخش تلفظ درست (${what})`,
    /* TASK-LEARNING-08 Addendum-5 §6 — example pronunciation guide */
    examplePronGuideTitle: 'چطور تلفظ کنیم؟',
    kanaWritingTipTitle: 'نکات نوشتن',
    unitProgress: 'بخش',
    islandMap: 'جزایر فصل',
    chapterLockedTitle: 'این فصل قفل است',
    chapterLockedBody: 'برای ورود به این فصل، ابتدا گیت فهم فصل قبل را بگذران.',
    goPrerequisite: 'رفتن به فصل پیش‌نیاز',
    prevStation: 'ایستگاه قبلی',
    /* feedback ladder F2/F4 (Issue #106) */
    eliminatedOption: 'یک گزینهٔ نادرست حذف شد',
    returnToTeaching: 'بازگشت به آموزش',
    /* block navigation + revisit (Issue #102) */
    prevBlock: 'مرحلهٔ قبل',
    exerciseAlreadyDoneTitle: 'این تمرین را کامل کرده‌ای',
    exerciseAlreadyDoneBody: 'نتیجه‌اش ثبت شده و با رفت‌وآمد بین مراحل از بین نمی‌رود؛ بدون تکرار می‌توانی ادامه بدهی.',
    /* station runner */
    continueBlock: 'ادامه',
    /* TASK-LEARNING-08 WP-5: auto-next after a correct answer (owner feedback D) */
    autoNextHint: 'درست بود — به سؤال بعد می‌رویم…',
    /* TASK-LEARNING-08 Addendum-2 §1: the accepted ink is replaced by the clean
       standard sample for a short review beat. */
    kanaReviewSampleNote: 'نمونهٔ استاندارد — نتیجهٔ تمیز نوشتنت را ببین.',
    /* TASK-LEARNING-08 WP-5: walk resume notice (owner feedback E) */
    walkResumedTitle: 'از همان‌جا ادامه دادی',
    walkResumedBody: 'موقعیت قبلی‌ات در همین ایستگاه ذخیره شده بود و بازگردانده شد.',
    checkAnswer: 'بررسی پاسخ',
    tryAgain: 'دوباره تلاش کن',
    correct: 'درست!',
    incorrect: 'نادرست',
    showHint: 'سرنخ',
    stationDone: 'ایستگاه کامل شد',
    backToJourney: 'بازگشت به مسیر',
    /* ---- TASK-LEARNING-10 §6 — station completion flow (status = message,
     * ONE main CTA labeled by its real destination; never a second red button)
     * ---- TASK-HANASO-17 §۷: the CTA now goes back to the map section of THIS
     * station («پایان درس و بازگشت به مسیر») and the next lesson is a TEXT
     * line — never auto-opened. The old «رفتن به ایستگاه بعدی» deep-link CTA
     * is gone on purpose (owner §7: «بعد از پایان Lesson نباید بدون اقدام
     * کاربر، درس بعدی باز شود»). */
    stationCompletedMessage: 'این ایستگاه را با موفقیت پشت سر گذشتی!',
    ctaFinishStation: 'پایان درس و بازگشت به مسیر',
    nextStationShown: (title: string) => `درس بعدی: ${title}`,
    ctaContinuePath: 'ادامهٔ مسیر',
    reviewStationAgain: 'مرور دوبارهٔ این ایستگاه',
    /* ---- TASK-HANASO-17 §۶ — Lesson Replay mode (completed lessons always
     * reviewable from the top; no re-completion, no duplicate rewards). */
    replayModeBadge: 'حالت مرور',
    replayEndedMessage: 'مرور این درس تمام شد — هر وقت خواستی دوباره از همین‌جا.',
    replayEndedNote: 'این مرور دوباره چیزی را تغییر نداد؛ ثبت اولیهٔ تکمیل همین درس سرجایش است.',
    replayAgain: 'یک بار دیگر از اول',
    /* ---- TASK-HANASO-17 §۸ — neutral restart notice (behavioral-UX §۴:
     * no absence-shaming, no red numbers). */
    walkRestartedTitle: 'از ابتدای درس شروع می‌کنیم',
    walkRestartedBody:
      'چند روزی به این درس نرسیدی؛ برای اینکه هیچ ناآشنایی جا نماند، از همان اول با هم جلو می‌رویم — پیشرفت‌ها و تاریخچه‌ات دست‌نخورده‌اند.',
    /* ---- TASK-LEARNING-13 (A-3) — honest completion-failure notice + retry
     * (a failed/aborted complete POST was previously silent) */
    completionFailedTitle: 'ثبت پایان ایستگاه ناموفق بود',
    completionFailedBody:
      'پیشرفت تو از دست نرفته — فقط ثبتِ پایانی روی سرور انجام نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.',
    completionRetry: 'تلاش دوباره برای ثبت',
    /* ---- TASK-HANASO-20 (BUG-004) — the 409 now explains itself: the server
     * says WHICH prerequisites are missing; the runner links straight to the
     * first unmet lesson instead of a dead retry loop. */
    completionPrereqTitle: 'این درس هنوز قابل ثبت نیست',
    completionPrereqBody:
      'برای ثبت این درس، ابتدا باید درس‌های پیش‌نیازش کامل شوند — ترتیب یادگیری حفظ می‌شود.',
    completionPrereqGo: 'رفتن به درس پیش‌نیاز',
    /* ---- TASK-HANASO-21 — the criterion 409 panel: the final exercise score
     * was honestly below the bar. The recovery is a redo of ONLY the final
     * exercise block (the earned walk is kept — never a full re-walk, never a
     * same-score retry loop). */
    completionCriterionTitle: 'نمرهٔ تمرین پایانی برای ثبت پایان کافی نبود',
    completionCriterionBody:
      'همهٔ پیشرفت این درس محفوظ است — فقط نمرهٔ تمرین پایانی به حد نصاب نرسید. با یک‌بار انجام دوبارهٔ همان تمرین پایانی می‌توانی نمره را بالا ببری و درس را ثبت کنی؛ لازم نیست کل درس را از اول بگذرانی.',
    completionCriterionRedo: 'انجام دوبارهٔ تمرین پایانی',
    /* ---- TASK-HANASO-21 — the AIZEN completion seal's accessible name (the
     * seal is art; screen readers get the FACT it stamps). */
    sealLabel: 'مهر ایچن — این درس کامل شد',
    /* TASK-HANASO-20 (BUG-008) — the rule-card listening column label. */
    listenColumnLabel: 'شنیدن',
    /* ---- TASK-LEARNING-10 §5 — honest short note when the sound is unavailable */
    audioUnavailableShort: 'صوت در دسترس نیست',
    playLine: 'پخش صدای این خط',
    inDialogue: 'در مکالمه ببین',
    wordCardNote: 'نکته',
    gradingUnavailable: 'ارتباط با سرور برقرار نشد — نمره‌گذاری فعلاً در دسترس نیست؛ بعداً دوباره تلاش کن.',
    gradingUnavailableTitle: 'نمره‌گذاری در دسترس نیست',
    progressUnavailable: 'خواندن پیشرفت ناموفق بود — اتصال را بررسی کن و صفحه را تازه‌سازی کن.',
    predictionDefaultReveal: 'پاسخ ثبت شد — به پخش مکالمه گوش کن و حدست را بسنج!',
    listeningTaskTitle: 'گوشِ فعال',
    listeningTaskBody: 'پخش هر خط را که تمام شد، به پرسش‌های بعدی همین ایستگاه پاسخ بده — متن‌ها نمایش داده نمی‌شوند.',
    replayDialogue: 'شنیدن دوبارهٔ مکالمه',
    dialogueGoToListen:
      'مکالمهٔ کامل با پلیر چندصدایی در صفحهٔ مکالمه پخش می‌شود — بعد به همین ایستگاه برگرد و ادامه بده.',
    masteryStationNote: 'آزمون فهم (دروازهٔ D) در صفحهٔ جدا اجرا می‌شود.',
    prevQuestion: 'قبلی',
    examplesTitle: 'مثال‌ها',
    /* ---- TASK-LEARNING-14 (slide-by-slide rule teaching) ---- */
    rulePrereqFirstLook: 'اولین نگاه',
    ruleContrastPlayBoth: 'پخش هر دو پشت‌سرهم',
    ruleContrastPlaying: 'در حال پخش…',
    ruleBeatsLabel: 'ضربه',
    ruleStepNoticeLabel: 'نگاه کن',
    ruleStepExplainLabel: 'توضیح',
    ruleAskGuessedCorrect: 'حدست درست بود!',
    ruleAskGuessedWrong: 'حدست الان مهم نبود — این را ببین:',
    /* writing practice (TASK-LEARNING-07 / DD-105/DD-111) */
    writingBlockTitle: 'نوشتن با دست',
    writingPickChar: 'نویسهٔ تمرین:',
    writingPairFocusTitle: 'جفت‌های شبیه — دقیق نگاه کن',
    writingPairNote: 'این دو نویسه فقط در جزئیات فرق دارند؛ هر دو را چند بار بکش و تفاوت را حس کن.',
    /* vertical trail map (TASK-LEARNING-07 · #107) */
    trailLegendTitle: 'راهنمای نشانه‌های مسیر',
    trailLegendCompleted: 'انجام‌شده',
    trailLegendCurrent: 'نقطهٔ ادامه',
    trailLegendAvailable: 'آماده',
    trailLegendLocked: 'قفل',
    trailLegendOptional: 'اختیاری',
    trailBackToFocus: 'بازگشت به نقطهٔ ادامه',
    trailScrolledNotice: 'مسیر روی نقطهٔ ادامهٔ تو تنظیم شد',
    yourTurn: 'نوبت تو',
    typeYourName: 'نامت را بنویس',
    /* mastery gate */
    gateTitle: 'دروازهٔ فهم مکالمه',
    gateLead: 'به مکالمهٔ اول برگرد — این بار با حمایت کمتر. سپس به ده پرسش فهم پاسخ بده.',
    gateReplay: 'شنیدن دوبارهٔ مکالمه',
    gateStart: 'شروع آزمون فهم',
    gateSubmit: 'ثابت می‌کنم فهمیدم',
    gatePassedTitle: 'این مکالمه را فهمیدی',
    gatePassedBody: 'مُهر «فهمیدم» این فصل خورد. کارت‌های مرور فردا منتظرند.',
    gateFailedTitle: 'هنوز کامل نشده',
    gateFailedBody: 'ایستگاه‌های پیشنهادی زیر را دوباره ببین و برگرد — حداکثر سه حلقه در هر جلسه.',
    gateQuestion: 'پرسش',
    gateOf: 'از',
    backToChapters: 'فصل‌ها',
    viewResult: 'دیدن نتیجه',
    chapterCompleteTitle: 'فصل کامل شد',
    poUnitLabel: 'واحد آزمایشی (نمونهٔ فنی)',
  },
} as const;

export type Dict = typeof fa; // کلیدها compile-time چک می‌شوند
