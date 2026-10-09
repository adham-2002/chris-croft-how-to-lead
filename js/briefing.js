// Pure text generation for the delegation briefing. No DOM access.
// Follows the course's 8 steps: what, why it matters, why you, limits,
// reporting, support, check understanding, confidence.
export const RHYTHM = ["daily", "weekly", "milestones", "problem"];
export const SUPPORT = ["anytime", "scheduled", "request"];

// Collapse whitespace and drop trailing full stops / Arabic comma so templates add their own.
const clean = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.۔،]+$/, "")
    .trim();

const EN = {
  hi: (p) => (p ? `Hi ${p},` : "Hi,"),
  task: (v) => `I'd like you to take on this task: ${v}.`,
  why: (v) => `It matters because ${v}.`,
  whyYou: (v) => `I'm asking you because ${v}.`,
  deadline: (v) => `I need it by ${v}.`,
  limits: (v) => `Limits to keep in mind: ${v}.`,
  rhythm: {
    daily: "Please give me a short update every day.",
    weekly: "Please give me an update once a week.",
    milestones: "Please update me when you finish each main part.",
    problem: "You don't need to report in regularly; just come to me if there's a problem.",
  },
  support: {
    anytime: "I'm available whenever you need help, and asking is never a problem.",
    scheduled: "I'll set aside time at set points to help you, and you can also ask any time.",
    request: "Support is there whenever you ask for it.",
  },
  check: "What will your first step be?",
  close: "I know you can do this.",
};

// Arabic is written gender-neutral: no verbs conjugated for the person addressed.
const AR = {
  hi: (p) => (p ? `مرحبًا ${p}،` : "مرحبًا،"),
  task: (v) => `أريد منك تولّي هذه المهمة: ${v}.`,
  why: (v) => `أهمية المهمة: ${v}.`,
  whyYou: (v) => `اخترتك لهذه المهمة لأن ${v}.`,
  deadline: (v) => `الموعد المطلوب: ${v}.`,
  limits: (v) => `الحدود التي نلتزم بها: ${v}.`,
  rhythm: {
    daily: "أحتاج منك تحديثًا مختصرًا كل يوم.",
    weekly: "أحتاج منك تحديثًا مرة في الأسبوع.",
    milestones: "أحتاج منك تحديثًا عند إنجاز كل جزء رئيسي.",
    problem: "لا حاجة لتقارير دورية؛ يكفي إبلاغي إن ظهرت مشكلة.",
  },
  support: {
    anytime: "بابي مفتوح في أي وقت، وطلب المساعدة ليس عيبًا.",
    scheduled: "سأخصّص أوقاتًا محددة لمساعدتك، ويمكنك التواصل معي في أي وقت أيضًا.",
    request: "الدعم متاح عند الطلب دون أي حرج.",
  },
  check: "ما خطوتك الأولى في رأيك؟",
  close: "أثق في قدرتك على إنجازها.",
};

export function buildBriefing(lang, f = {}) {
  const L = lang === "ar" ? AR : EN;
  const task = clean(f.task);
  if (!task) return "";

  const lines = [L.hi(clean(f.person)), L.task(task)];
  const why = clean(f.why);
  const whyYou = clean(f.whyYou);
  const deadline = clean(f.deadline);
  const limits = clean(f.limits);
  if (why) lines.push(L.why(why));
  if (whyYou) lines.push(L.whyYou(whyYou));
  if (deadline) lines.push(L.deadline(deadline));
  if (limits) lines.push(L.limits(limits));
  if (typeof f.rhythm === "string" && Object.hasOwn(L.rhythm, f.rhythm)) lines.push(L.rhythm[f.rhythm]);
  if (typeof f.support === "string" && Object.hasOwn(L.support, f.support)) lines.push(L.support[f.support]);
  lines.push(L.check, L.close);
  return lines.join("\n\n");
}
