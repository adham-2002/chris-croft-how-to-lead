import { addStrings } from "./i18n.js";
import { buildBriefing, RHYTHM, SUPPORT } from "./briefing.js";

addStrings("en", {
  bTitle: "Delegation briefing builder",
  bIntro:
    "Fill in what you know. Your briefing follows the 8 steps above and updates as you type. Nothing you type is saved.",
  bTask: "What needs doing?",
  bWhy: "Why does it matter?",
  bPerson: "Who is it for? (name)",
  bWhyYou: "Why are you asking them?",
  bDeadline: "Deadline",
  bLimits: "Limits (time, money, scope)",
  bRhythm: "How should they report?",
  bRhythmOpts: ["— choose —", "Every day", "Once a week", "At each milestone", "Only if there's a problem"],
  bSupport: "What support will you offer?",
  bSupportOpts: ["— choose —", "Available any time", "Scheduled check-ins", "On request"],
  bPreview: "Your briefing",
  bEmpty: "Fill in “What needs doing?” to see your briefing.",
  bCopy: "Copy briefing",
  bClear: "Clear form",
  bCopied: "Copied to clipboard.",
  bCopyFail: "Couldn't copy automatically. The text is selected — copy it manually.",
});
addStrings("ar", {
  bTitle: "منشئ رسالة التفويض",
  bIntro: "املأ ما تعرفه. تتبع الرسالة الخطوات الثماني أعلاه وتتحدث أثناء الكتابة. لا يُحفظ شيء مما تكتبه.",
  bTask: "ما المطلوب إنجازه؟",
  bWhy: "لماذا هو مهم؟",
  bPerson: "لمن المهمة؟ (الاسم)",
  bWhyYou: "لماذا اخترته لها؟",
  bDeadline: "الموعد النهائي",
  bLimits: "الحدود (الوقت، المال، النطاق)",
  bRhythm: "كيف يُبلغ عن التقدم؟",
  bRhythmOpts: ["— اختر —", "كل يوم", "مرة في الأسبوع", "عند كل مرحلة", "فقط إن ظهرت مشكلة"],
  bSupport: "ما الدعم الذي ستقدمه؟",
  bSupportOpts: ["— اختر —", "متاح في أي وقت", "لقاءات متابعة مجدولة", "عند الطلب"],
  bPreview: "رسالتك",
  bEmpty: "اكتب «ما المطلوب إنجازه؟» لتظهر رسالتك.",
  bCopy: "نسخ الرسالة",
  bClear: "مسح النموذج",
  bCopied: "تم النسخ.",
  bCopyFail: "تعذّر النسخ تلقائيًا. النص محدد ويمكن نسخه يدويًا.",
});

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "text") node.textContent = v;
    else if (k in node && k !== "list") node[k] = v;
    else node.setAttribute(k, v);
  }
  children.forEach((c) => node.appendChild(c));
  return node;
}

function selectNode(node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}

export function initDelegationBuilder(t) {
  const section = document.getElementById("how-to-delegate-the-8-step-process");
  if (!section) return;
  const lang = document.documentElement.lang === "ar" ? "ar" : "en";

  const field = (name, labelKey, control) => {
    control.id = `bld-${name}`;
    control.name = name;
    return el("div", { className: "builder-field" }, [
      el("label", { htmlFor: control.id, text: t(labelKey) }),
      control,
    ]);
  };
  const text = () => el("input", { type: "text", autocomplete: "off", dir: "auto" });
  const area = () => el("textarea", { rows: 2, dir: "auto" });
  const select = (optsKey, values) => {
    const s = el("select");
    t(optsKey).forEach((label, i) =>
      s.appendChild(el("option", { value: i === 0 ? "" : values[i - 1], text: label }))
    );
    return s;
  };

  const form = el("form", { className: "builder-form", noValidate: true }, [
    field("task", "bTask", area()),
    field("why", "bWhy", area()),
    field("person", "bPerson", text()),
    field("whyYou", "bWhyYou", area()),
    field("deadline", "bDeadline", text()),
    field("limits", "bLimits", area()),
    field("rhythm", "bRhythm", select("bRhythmOpts", RHYTHM)),
    field("support", "bSupport", select("bSupportOpts", SUPPORT)),
  ]);

  const preview = el("div", {
    id: "bld-preview",
    className: "builder-preview is-empty",
    tabIndex: 0,
    dir: "auto",
  });
  preview.setAttribute("role", "region");
  preview.setAttribute("aria-labelledby", "bld-preview-label");

  const copyBtn = el("button", { type: "button", className: "primary", text: t("bCopy") });
  const clearBtn = el("button", { type: "button", text: t("bClear") });
  const sr = el("div", { className: "builder-sr" });
  sr.setAttribute("role", "status");
  sr.setAttribute("aria-live", "polite");
  sr.setAttribute("aria-atomic", "true");
  const msg = el("p", { className: "builder-msg" });
  msg.setAttribute("role", "status");

  const card = el("div", { className: "builder" }, [
    el("p", { id: "bld-title", className: "builder-title", text: t("bTitle") }),
    el("p", { className: "builder-intro", text: t("bIntro") }),
    el("div", { className: "builder-grid" }, [
      form,
      el("div", { className: "builder-out" }, [
        el("p", { id: "bld-preview-label", className: "builder-out-label", text: t("bPreview") }),
        preview,
        el("div", { className: "builder-actions" }, [copyBtn, clearBtn]),
        msg,
        sr,
      ]),
    ]),
  ]);
  card.setAttribute("role", "group");
  card.setAttribute("aria-labelledby", "bld-title");

  const readFields = () => Object.fromEntries(new FormData(form).entries());
  let srTimer;
  const announce = (out) => {
    clearTimeout(srTimer);
    srTimer = setTimeout(() => {
      sr.textContent = out;
    }, 700);
  };
  const update = () => {
    const out = buildBriefing(lang, readFields());
    announce(out);
    preview.textContent = out || t("bEmpty");
    preview.classList.toggle("is-empty", !out);
    copyBtn.disabled = !out;
    msg.textContent = "";
  };

  form.addEventListener("input", update);
  form.addEventListener("submit", (e) => e.preventDefault());
  clearBtn.addEventListener("click", () => {
    form.reset();
    clearTimeout(srTimer);
    sr.textContent = "";
    update();
    form.querySelector("textarea").focus();
  });
  copyBtn.addEventListener("click", async () => {
    const out = buildBriefing(lang, readFields());
    if (!out) return;
    if (await copyText(out)) {
      msg.textContent = t("bCopied");
    } else {
      selectNode(preview);
      msg.textContent = t("bCopyFail");
    }
  });

  update();
  section.appendChild(card);
}
