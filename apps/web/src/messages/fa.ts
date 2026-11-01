/**
 * دیکشنری تایپ‌دار فارسی (ADR-013 KB — رشتهٔ UI هاردکد در کامپوننت ممنوع).
 * استثنا: محتوای ژاپنی «داده» است نه رشتهٔ UI و از مسیر محتوا می‌آید.
 * این فایل نقطهٔ هماهنگی است — تغییر فقط ترتیبی با اعلام در AGENT_PROGRESS.md.
 */
export const fa = {
  common: {
    save: 'ذخیره',
    cancel: 'انصراف',
    close: 'بستن',
    confirm: 'تأیید',
    retry: 'تلاش دوباره',
    loading: 'در حال بارگذاری…',
    openMenu: 'باز کردن منو',
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
    subtitle: 'برگهٔ مرجع رندر فارسی + ژاپنی + روبی (TASK-M0-09 · AC-2)',
    mixedSection: 'پاراگراف ترکیبی',
    rubySection: 'روبی (FuriganaText)',
    cardSection: 'کارت جمله و دکمهٔ صوت',
    componentsSection: 'کامپوننت‌های رابط (RTL)',
  },
} as const;

export type Dict = typeof fa; // کلیدها compile-time چک می‌شوند
