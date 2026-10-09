// One string table for both editions. Values are strings, arrays, or functions.
const STRINGS = {
  en: {
    min: (n) => `${n} min read`,
    sections: (n) => `${n} chapters`,
    copy: "Copy link to this section",
    copied: "Copied",
    resume: "Continue where you left off?",
    yes: "Resume",
    no: "Dismiss",
    table: "Scrollable table",
  },
  ar: {
    min: (n) => `${n} دقيقة قراءة`,
    sections: (n) => `${n} قسمًا`,
    copy: "نسخ رابط هذا القسم",
    copied: "تم النسخ",
    resume: "تابع القراءة من حيث توقفت؟",
    yes: "متابعة",
    no: "إغلاق",
    table: "جدول قابل للتمرير",
  },
};

export function createT(lang) {
  const table = lang === "ar" ? STRINGS.ar : STRINGS.en;
  return function t(key, ...args) {
    let v = table[key];
    if (v === undefined) v = STRINGS.en[key];
    if (v === undefined) return key;
    return typeof v === "function" ? v(...args) : v;
  };
}

// Feature modules register their strings here so the table stays in one place.
export function addStrings(lang, entries) {
  Object.assign(STRINGS[lang], entries);
}
