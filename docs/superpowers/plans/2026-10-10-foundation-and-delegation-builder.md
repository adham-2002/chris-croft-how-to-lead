# Foundation Refactor + Delegation Briefing Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single `script.js` closure into native ES modules with a shared storage layer and string table, then add a bilingual delegation briefing builder to the "How to delegate — 8-step process" chapter.

**Architecture:** `script.js` is replaced by `js/main.js`, loaded with `<script type="module">`. Pure logic (`store.js`, `i18n.js`, `briefing.js`) has no DOM access at import time so it can be verified with plain Node. DOM modules (`context.js`, `nav.js`, `theme.js`, `font.js`, `content.js`, `lightbox.js`, `reader.js`, `delegation-builder.js`) each export one `init…` function and share a `ctx` object built once.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules). No bundler, no dependencies, no test framework. Node (v24 is installed) is used only for throwaway verification commands.

**Spec:** `docs/superpowers/specs/2026-10-10-foundation-and-delegation-builder-design.md`

## Global Constraints

- Static files served by GitHub Pages; no backend, no build step, no new runtime dependencies.
- Two editions must stay in parity: `index.html` (English, LTR) and `ar.html` (Arabic, RTL).
- Existing readers must not lose saved progress.
- Nothing is pushed or deployed without the owner's explicit request. Commits stay local.
- Commits use: `git -c user.name="Adham Elganzoury" -c user.email="adham54732@gmail.com" commit ...` and end the message with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Working directory for every command: `E:\MyGitHub2025\chris-croft-how-to-lead` (Git Bash path `/e/MyGitHub2025/chris-croft-how-to-lead`).

## Review Focus

Failure modes the spec implies but no task would otherwise exercise, most likely first. Each has a pinned check in the owning task.

1. **Whitespace-only or empty task** → briefing is empty, preview shows the hint, Copy is disabled. (Task 3 check, Task 4 manual.)
2. **User text ending in punctuation (`.`, Arabic full stop/comma)** → no doubled punctuation in the briefing. (Task 3 check.)
3. **Unselected or hostile select values (`""`, `__proto__`, `constructor`)** → those lines are omitted, nothing throws. (Task 3 check.)
4. **Mixed-direction text** (an English name typed into the Arabic form, Arabic into the English form) → inputs use `dir="auto"`; preview does not scramble. (Task 4 manual.)
5. **Storage unavailable or corrupt `htl:v1`** → site still works; corrupt data is rebuilt from legacy keys. (Task 1 check.)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `js/store.js` | Create | Namespaced JSON storage, legacy migration, safe read/write, export/import |
| `js/i18n.js` | Create | String table (en/ar) and `createT(lang)` |
| `js/context.js` | Create | Element refs, section lists, shared state and helpers |
| `js/nav.js` | Create | TOC, drawer, scroll-spy, progress, prev/next |
| `js/theme.js` | Create | Theme toggle |
| `js/font.js` | Create | A+ / A− |
| `js/content.js` | Create | Table wrapping, reading meta, heading link buttons |
| `js/lightbox.js` | Create | Image dialog |
| `js/reader.js` | Create | Read marks, resume toast, hash scroll |
| `js/main.js` | Create | Boot: build store/t/ctx, call inits in order |
| `js/briefing.js` | Create | Pure `buildBriefing(lang, fields)` |
| `js/delegation-builder.js` | Create | Builder card UI |
| `script.js` | Delete | Replaced by the modules |
| `index.html`, `ar.html` | Modify | Pre-paint theme script; script tag |
| `styles.css` | Modify | Append builder styles |
| spec file | Modify | Record the amendments listed in each task |

---

### Task 1: Storage layer and string table

**Files:**
- Create: `js/store.js`
- Create: `js/i18n.js`

**Interfaces:**
- Produces:
  - `createStore(storage|null) → { get(): State, set(patch: Partial<State>): void, exportJSON(): string, importJSON(text: string): {ok: boolean, error?: string} }`
  - `State = { v: 1, theme: "dark"|"light"|null, fontSize: number|null, read: {en: string[], ar: string[]}, pos: {en: number|null, ar: number|null} }`
  - `createT(lang: string) → t(key: string, ...args) → string | array`; `t` returns the key itself when no table has it.
  - Also exported for checks: `KEY`, `defaults()`, `normalize(raw)`.

- [ ] **Step 1: Create `js/store.js`**

```js
// Namespaced storage. Pure module: no DOM or window access at import time.
export const KEY = "htl:v1";

const isNum = (n) => typeof n === "number" && Number.isFinite(n);

export function defaults() {
  return { v: 1, theme: null, fontSize: null, read: { en: [], ar: [] }, pos: { en: null, ar: null } };
}

// Coerce anything into a valid State. Unknown keys are dropped.
export function normalize(raw) {
  const d = defaults();
  if (!raw || typeof raw !== "object") return d;
  if (raw.theme === "dark" || raw.theme === "light") d.theme = raw.theme;
  if (Number.isInteger(raw.fontSize) && raw.fontSize >= 14 && raw.fontSize <= 24) d.fontSize = raw.fontSize;
  for (const lang of ["en", "ar"]) {
    const r = raw.read && raw.read[lang];
    if (Array.isArray(r)) d.read[lang] = r.filter((x) => typeof x === "string");
    const p = raw.pos && raw.pos[lang];
    if (isNum(p)) d.pos[lang] = p;
  }
  return d;
}

// Build a State from the pre-module keys. Legacy keys are read, never deleted.
function readLegacy(storage) {
  const get = (k) => {
    try {
      return storage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  const json = (s) => {
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  };
  return normalize({
    theme: get("theme"),
    fontSize: parseInt(get("fontSize"), 10),
    read: { en: json(get("read-en")), ar: json(get("read-ar")) },
    pos: { en: parseFloat(get("pos-en")), ar: parseFloat(get("pos-ar")) },
  });
}

export function createStore(storage) {
  let state;
  const write = () => {
    try {
      if (storage) storage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  };

  let parsed = null;
  try {
    const s = storage && storage.getItem(KEY);
    parsed = s ? JSON.parse(s) : null;
  } catch (e) {
    parsed = null;
  }
  if (parsed && parsed.v === 1) {
    state = normalize(parsed);
  } else {
    state = storage ? readLegacy(storage) : defaults();
    write();
  }

  return {
    get: () => state,
    set(patch) {
      state = normalize({ ...state, ...patch });
      write();
    },
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON(text) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return { ok: false, error: "invalid-json" };
      }
      if (!data || data.v !== 1) return { ok: false, error: "unsupported-version" };
      state = normalize(data);
      write();
      return { ok: true };
    },
  };
}
```

- [ ] **Step 2: Create `js/i18n.js`**

```js
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
```

- [ ] **Step 3: Run the storage checks (expect all to print `ok`)**

Run:
```bash
node --input-type=module - <<'EOF'
import assert from "node:assert/strict";
import { createStore, KEY, defaults, normalize } from "./js/store.js";
import { createT } from "./js/i18n.js";

const mem = (init = {}) => {
  const m = { ...init };
  return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } };
};
const t1 = (name, fn) => { fn(); console.log("ok -", name); };

t1("empty storage gives defaults and writes htl:v1", () => {
  const s = mem(); const st = createStore(s);
  assert.deepEqual(st.get(), defaults());
  assert.ok(s.m[KEY]);
});
t1("legacy keys migrate and are NOT deleted", () => {
  const s = mem({ theme: "dark", fontSize: "20", "read-en": '["a","b"]', "pos-ar": "1500" });
  const st = createStore(s).get();
  assert.equal(st.theme, "dark"); assert.equal(st.fontSize, 20);
  assert.deepEqual(st.read.en, ["a", "b"]); assert.equal(st.pos.ar, 1500); assert.equal(st.pos.en, null);
  assert.equal(s.m.theme, "dark"); assert.equal(s.m["read-en"], '["a","b"]');
});
t1("corrupt htl:v1 falls back to legacy", () => {
  const st = createStore(mem({ [KEY]: "{not json", theme: "light" })).get();
  assert.equal(st.theme, "light");
});
t1("blocked storage (throws) still works in memory", () => {
  const bad = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const st = createStore(bad); st.set({ theme: "dark" });
  assert.equal(st.get().theme, "dark");
});
t1("null storage works", () => { const st = createStore(null); st.set({ fontSize: 16 }); assert.equal(st.get().fontSize, 16); });
t1("set persists and reloads", () => {
  const s = mem(); createStore(s).set({ read: { en: ["x"], ar: [] } });
  assert.deepEqual(createStore(s).get().read.en, ["x"]);
});
t1("normalize rejects bad values", () => {
  const n = normalize({ theme: "pink", fontSize: 99, read: { en: [1, "ok"] }, pos: { en: "5", ar: NaN } });
  assert.equal(n.theme, null); assert.equal(n.fontSize, null);
  assert.deepEqual(n.read.en, ["ok"]); assert.equal(n.pos.en, null); assert.equal(n.pos.ar, null);
});
t1("import rejects invalid json and wrong version", () => {
  const st = createStore(mem());
  assert.deepEqual(st.importJSON("nope"), { ok: false, error: "invalid-json" });
  assert.deepEqual(st.importJSON('{"v":2}'), { ok: false, error: "unsupported-version" });
});
t1("export then import round-trips", () => {
  const a = createStore(mem()); a.set({ theme: "dark", fontSize: 22 });
  const b = createStore(mem()); assert.deepEqual(b.importJSON(a.exportJSON()), { ok: true });
  assert.equal(b.get().theme, "dark"); assert.equal(b.get().fontSize, 22);
});
t1("i18n: language, fallback, missing key, functions", () => {
  assert.equal(createT("ar")("copied"), "تم النسخ");
  assert.equal(createT("en")("min", 5), "5 min read");
  assert.equal(createT("fr")("copied"), "Copied");
  assert.equal(createT("en")("nope"), "nope");
});
EOF
```
Expected: ten `ok -` lines and no stack trace.

- [ ] **Step 4: Commit**

```bash
git add js/store.js js/i18n.js
git -c user.name="Adham Elganzoury" -c user.email="adham54732@gmail.com" commit -m "Add storage layer and string table modules (not wired yet)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Move `script.js` into modules (behavior unchanged)

**Files:**
- Create: `js/context.js`, `js/nav.js`, `js/theme.js`, `js/font.js`, `js/content.js`, `js/lightbox.js`, `js/reader.js`, `js/main.js`
- Modify: `index.html` (pre-paint script at the top of `<head>`; script tag at the end), `ar.html` (same two places)
- Delete: `script.js`
- Modify: spec file (record amendments)

**Interfaces:**
- Consumes: `createStore`, `createT` from Task 1.
- Produces:
  - `createContext() → ctx` where `ctx = { $, contentArea, sections, tocSections, desktop, tocLinks: Map<section, a>, state: {current}, headerHeight(), scrollToElement(el), titleOf(section) }`
  - `initNav(ctx)`, `initTheme(ctx, store)`, `initFont(ctx, store)`, `initContent(ctx, t)`, `initLightbox(ctx)`, `initReader(ctx, store, t)`
  - Init order in `main.js` must be: nav → theme → font → content → lightbox → reader (the TOC text is read before heading buttons are added, as in the original).

- [ ] **Step 1: Capture the "before" baseline in the browser**

Start the local server if it is not running (`python -m http.server 8000` from the project root, run in the background). Open `http://localhost:8000/?v=1` and `http://localhost:8000/ar.html?v=1`, open the browser console, and run on each page:

```js
JSON.stringify({
  anchors: document.querySelectorAll(".heading-anchor").length,
  tables: document.querySelectorAll(".table-wrap").length,
  toc: document.querySelectorAll("#toc li").length,
  meta: [...document.querySelectorAll(".reading-meta span")].map((s) => s.textContent),
  prevTitle: document.querySelector("#prev-chapter .nav-title").textContent,
  nextTitle: document.querySelector("#next-chapter .nav-title").textContent,
  tocFirst: document.querySelector("#toc li a").textContent,
  dark: document.documentElement.classList.contains("dark-mode"),
})
```
Write the two result strings into the task notes. Also scroll about halfway down each page, wait one second, and note `localStorage.getItem("pos-en")` / `("pos-ar")`.
Expected: two JSON strings captured (these are the comparison targets in Step 11). If no browser is available to the executor, hand this step and Steps 11–12 to the owner and say so in the report.

- [ ] **Step 2: Create `js/context.js`**

```js
// Shared element refs, section lists and helpers. Built once in main.js.
export function createContext() {
  const $ = (id) => document.getElementById(id);
  const contentArea = $("content-area");
  const sections = Array.from(contentArea.querySelectorAll("section"));
  // Skip intro / at-a-glance / inline-contents sections (they have no h2... or are not chapters)
  const tocSections = sections.filter((s) => s.querySelector("h2"));
  const headerHeight = () => document.querySelector(".site-header").offsetHeight;

  return {
    $,
    contentArea,
    sections,
    tocSections,
    desktop: window.matchMedia("(min-width: 1100px)"),
    tocLinks: new Map(),
    state: { current: tocSections[0] },
    headerHeight,
    scrollToElement(el) {
      const top = el.getBoundingClientRect().top + window.scrollY - headerHeight() - 8;
      window.scrollTo({ top, behavior: "smooth" });
    },
    // Heading text without the "#" copy-link button that content.js appends.
    titleOf(section) {
      const clone = section.querySelector("h2").cloneNode(true);
      clone.querySelectorAll(".heading-anchor").forEach((b) => b.remove());
      return clone.textContent.trim();
    },
  };
}
```

- [ ] **Step 3: Create `js/nav.js`**

```js
// TOC, mobile drawer, scroll-spy, progress bar, back-to-top, prev/next.
export function initNav(ctx) {
  const { $, contentArea, tocSections, tocLinks, desktop, state, headerHeight, scrollToElement, titleOf } = ctx;
  const tocContainer = $("toc");
  const sidebar = $("sidebar");
  const menuToggle = $("mobile-menu-toggle");
  const progressBar = $("progress-bar");
  const backToTop = $("back-to-top");
  const prevBtn = $("prev-chapter");
  const nextBtn = $("next-chapter");

  // --- Sidebar drawer (mobile/tablet) ---
  let overlay = null;
  function openSidebar() {
    sidebar.classList.add("active");
    menuToggle.setAttribute("aria-expanded", "true");
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    overlay.addEventListener("click", closeSidebar);
    document.body.appendChild(overlay);
  }
  function closeSidebar() {
    sidebar.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    overlay?.remove();
    overlay = null;
  }
  menuToggle.addEventListener("click", () =>
    sidebar.classList.contains("active") ? closeSidebar() : openSidebar()
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("active")) {
      closeSidebar();
      menuToggle.focus();
    }
  });
  desktop.addEventListener("change", closeSidebar);

  // --- Table of contents ---
  const list = document.createElement("ul");
  tocSections.forEach((section) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${section.id}`;
    a.textContent = titleOf(section);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToElement(section);
      history.replaceState(null, "", `#${section.id}`);
      if (!desktop.matches) closeSidebar();
    });
    li.appendChild(a);
    list.appendChild(li);
    tocLinks.set(section, a);
  });
  tocContainer.appendChild(list);

  // Make the in-page contents list smooth-scroll with the header offset
  contentArea.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.getElementById(a.getAttribute("href").slice(1));
    if (target) {
      e.preventDefault();
      scrollToElement(target);
    }
  });

  // --- Scroll-driven UI: progress, back-to-top, active section, chapter nav ---
  function setCurrent(section) {
    state.current = section;
    tocLinks.forEach((a, s) => {
      const on = s === section;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    const idx = tocSections.indexOf(section);
    const prev = tocSections[idx - 1];
    const next = tocSections[idx + 1];
    const wire = (btn, target) => {
      btn.disabled = !target;
      btn.querySelector(".nav-title").textContent = target ? titleOf(target) : "";
      btn.onclick = target ? () => scrollToElement(target) : null;
    };
    wire(prevBtn, prev);
    wire(nextBtn, next);
    const link = tocLinks.get(section);
    if (link && desktop.matches) link.scrollIntoView({ block: "nearest" });
  }

  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    backToTop.classList.toggle("visible", scrollY > 800);

    const line = headerHeight() + innerHeight * 0.25;
    let found = tocSections[0];
    for (const s of tocSections) {
      if (s.getBoundingClientRect().top <= line) found = s;
      else break;
    }
    if (found !== state.current) setCurrent(found);
  }
  let ticking = false;
  addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
    },
    { passive: true }
  );
  addEventListener("resize", onScroll);
  backToTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

  setCurrent(tocSections[0]);
  onScroll();
}
```

- [ ] **Step 4: Create `js/theme.js` and `js/font.js`**

`js/theme.js`:
```js
export function initTheme(ctx, store) {
  const themeToggle = ctx.$("theme-toggle");
  function applyTheme(dark) {
    document.documentElement.classList.toggle("dark-mode", dark);
    themeToggle.setAttribute("aria-pressed", String(dark));
  }
  const saved = store.get().theme;
  applyTheme(saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  themeToggle.addEventListener("click", () => {
    const dark = !document.documentElement.classList.contains("dark-mode");
    applyTheme(dark);
    store.set({ theme: dark ? "dark" : "light" });
  });
}
```

`js/font.js`:
```js
// Font size applies to reading text only (CSS var --reading-size).
export function initFont(ctx, store) {
  let fontSize = store.get().fontSize;
  if (!(fontSize >= 14 && fontSize <= 24)) fontSize = 18;
  const setFont = (n) => {
    fontSize = Math.min(24, Math.max(14, n));
    document.documentElement.style.setProperty("--reading-size", `${fontSize}px`);
    store.set({ fontSize });
  };
  setFont(fontSize);
  ctx.$("font-increase").addEventListener("click", () => setFont(fontSize + 1));
  ctx.$("font-decrease").addEventListener("click", () => setFont(fontSize - 1));
}
```

- [ ] **Step 5: Create `js/content.js` and `js/lightbox.js`**

`js/content.js`:
```js
// Table wrapping, reading-time line, copyable heading links.
export function initContent(ctx, t) {
  const { contentArea, tocSections } = ctx;
  const ar = document.documentElement.lang === "ar";

  // Wrap tables so wide ones scroll inside a card
  contentArea.querySelectorAll("table").forEach((table) => {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", t("table"));
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  // Reading time + chapter count
  const intro = contentArea.querySelector("section:first-child p");
  if (intro) {
    const words = contentArea.textContent.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / (ar ? 180 : 230)));
    const meta = document.createElement("p");
    meta.className = "reading-meta";
    [t("min", minutes), t("sections", tocSections.length)].forEach((text) => {
      const sp = document.createElement("span");
      sp.textContent = text;
      meta.appendChild(sp);
    });
    intro.after(meta);
  }

  // Copyable heading links
  contentArea.querySelectorAll("section").forEach((section) => {
    section.querySelectorAll("h2, h3").forEach((h, i) => {
      if (!h.id) h.id = `${section.id}--${i}`;
      if (h.closest("#at-a-glance")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "heading-anchor";
      b.textContent = "#";
      b.setAttribute("aria-label", t("copy"));
      b.addEventListener("click", () => {
        const url = `${location.origin}${location.pathname}#${h.id}`;
        history.replaceState(null, "", `#${h.id}`);
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
          .catch(() => {})
          .finally(() => {
            b.classList.add("copied");
            b.textContent = "✓";
            b.setAttribute("aria-label", t("copied"));
            setTimeout(() => {
              b.classList.remove("copied");
              b.textContent = "#";
              b.setAttribute("aria-label", t("copy"));
            }, 1500);
          });
      });
      h.appendChild(b);
    });
  });
}
```

`js/lightbox.js`:
```js
export function initLightbox(ctx) {
  const box = document.createElement("dialog");
  box.className = "lightbox";
  const boxImg = document.createElement("img");
  box.appendChild(boxImg);
  document.body.appendChild(box);
  box.addEventListener("click", () => box.close());
  ctx.contentArea.querySelectorAll("img").forEach((img) => {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    const open = () => {
      boxImg.src = img.currentSrc || img.src;
      boxImg.alt = img.alt;
      box.showModal();
    };
    img.addEventListener("click", open);
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}
```

- [ ] **Step 6: Create `js/reader.js`**

```js
// Read chapters, resume position, and scrolling to a URL hash on load.
export function initReader(ctx, store, t) {
  const { tocSections, tocLinks, state, scrollToElement } = ctx;
  const pageKey = document.documentElement.lang === "ar" ? "ar" : "en";
  const readSet = new Set(store.get().read[pageKey]);

  const markRead = () => {
    tocSections.forEach((s, i) => {
      const passed = s.getBoundingClientRect().bottom < 0 || s === state.current;
      if (passed && i <= tocSections.indexOf(state.current)) readSet.add(s.id);
    });
    tocLinks.forEach((a, s) => a.classList.toggle("read", readSet.has(s.id) && s !== state.current));
  };

  let saveTimer;
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const cur = store.get();
      store.set({
        read: { ...cur.read, [pageKey]: [...readSet] },
        pos: { ...cur.pos, [pageKey]: Math.round(scrollY) },
      });
    }, 400);
  };
  addEventListener(
    "scroll",
    () => {
      markRead();
      persist();
    },
    { passive: true }
  );

  const savedPos = store.get().pos[pageKey];
  if (!location.hash && savedPos > 1200) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `<span></span><button class="primary" type="button"></button><button type="button"></button>`;
    const [msg, yes, no] = toast.children;
    msg.textContent = t("resume");
    yes.textContent = t("yes");
    no.textContent = t("no");
    yes.onclick = () => {
      scrollTo({ top: savedPos, behavior: "smooth" });
      toast.remove();
    };
    no.onclick = () => toast.remove();
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 12000);
  }
  markRead();

  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) setTimeout(() => scrollToElement(target), 100);
  }
}
```

- [ ] **Step 7: Create `js/main.js`**

```js
import { createStore } from "./store.js";
import { createT } from "./i18n.js";
import { createContext } from "./context.js";
import { initNav } from "./nav.js";
import { initTheme } from "./theme.js";
import { initFont } from "./font.js";
import { initContent } from "./content.js";
import { initLightbox } from "./lightbox.js";
import { initReader } from "./reader.js";

function safeStorage() {
  try {
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

function boot() {
  const store = createStore(safeStorage());
  const t = createT(document.documentElement.lang);
  const ctx = createContext();
  // Order matters: nav reads heading text before content.js appends the "#" buttons.
  initNav(ctx);
  initTheme(ctx, store);
  initFont(ctx, store);
  initContent(ctx, t);
  initLightbox(ctx);
  initReader(ctx, store, t);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
```

- [ ] **Step 8: Update the pre-paint theme script in BOTH pages**

The inline script in `<head>` reads only the legacy `theme` key; theme changes now live in `htl:v1`, so without this the page would flash the wrong theme. In `index.html` and `ar.html`, replace exactly:

```html
    <script>
      try {
        var t = localStorage.getItem("theme");
        if (t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches)
          document.documentElement.classList.add("dark-mode");
      } catch (e) {}
    </script>
```
with:
```html
    <script>
      try {
        var s = null;
        try {
          s = JSON.parse(localStorage.getItem("htl:v1"));
        } catch (e) {}
        var t = s && s.theme ? s.theme : localStorage.getItem("theme");
        if (t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches)
          document.documentElement.classList.add("dark-mode");
      } catch (e) {}
    </script>
```

- [ ] **Step 9: Swap the script tag in BOTH pages and remove `script.js`**

In `index.html` and `ar.html` replace `<script src="script.js"></script>` with `<script type="module" src="js/main.js"></script>`. Then:

```bash
git rm -q script.js
grep -n "script.js" index.html ar.html
```
Expected: no output from `grep`.

- [ ] **Step 10: Check the modules import cleanly in Node and the server MIME type**

Run:
```bash
node --input-type=module -e "
for (const f of ['store','i18n','context','nav','theme','font','content','lightbox','reader']) {
  const m = await import('./js/' + f + '.js'); console.log('ok -', f, Object.keys(m).join(','));
}"
curl -sI "http://localhost:8000/js/main.js?v=$RANDOM" | grep -i -E "HTTP|content-type"
```
Expected: nine `ok -` lines; `HTTP/1.0 200 OK`; `Content-type:` containing `javascript`. If the content type is `text/plain` (a Windows registry quirk with Python's server), browsers refuse modules: restart the local server with `python -c "import mimetypes,http.server as h; mimetypes.add_type('text/javascript','.js'); h.test(h.SimpleHTTPRequestHandler, port=8000)"`. GitHub Pages serves the correct type, so this only affects local testing.

- [ ] **Step 11: Compare against the baseline in the browser**

Reload both pages with a new cache-buster (`?v=2`), run the same console snippet from Step 1, and compare field by field. Expected: `anchors`, `tables`, `toc`, `meta`, `tocFirst`, `dark` are identical to the baseline. `tocFirst` and `prevTitle`/`nextTitle` must NOT end in `#` (if the baseline `prevTitle` or `nextTitle` ended in `#`, that was a pre-existing bug that `titleOf()` now fixes — note it in the report). Also check the console for errors.

- [ ] **Step 12: Manual regression checklist (both pages, desktop and a 375px-wide window, light and dark)**

- Theme toggle switches and survives a reload with no flash of the wrong theme.
- A+ / A− change text size and survive a reload.
- Mobile: menu button opens the drawer, overlay click and Esc close it, TOC click scrolls and closes it.
- Scroll: progress bar moves, active TOC item follows, back-to-top appears after 800px, prev/next cards show titles and work.
- Click a diagram: lightbox opens; Esc/click closes. Keyboard: Tab to a diagram, Enter opens.
- Click a `#` next to a heading: URL hash updates, button shows ✓ briefly.
- Reload after scrolling past ~1200px: the "resume" toast appears; "Resume" scrolls back.
- Open a URL with a hash (e.g. `/#final-takeaways`): it scrolls there.
- **Legacy migration:** in the console run `localStorage.clear(); localStorage.setItem("read-en", JSON.stringify(["final-takeaways"])); localStorage.setItem("pos-en", "3000"); localStorage.setItem("theme","dark"); location.reload()`. Expected: page loads dark, `final-takeaways` shows as read in the TOC after scrolling past it, the resume toast appears, and `localStorage.getItem("htl:v1")` now exists while `read-en` still exists.
- **Storage blocked:** in the browser's site settings block cookies/site data for localhost, reload: page still renders and all controls work (nothing persists).

- [ ] **Step 13: Amend the spec and commit**

In `docs/superpowers/specs/2026-10-10-foundation-and-delegation-builder-design.md`, under the `### store.js` list add the bullet:
`- The pre-paint inline script in each page's <head> reads `htl:v1` first and falls back to the legacy `theme` key, so there is no flash of the wrong theme.`
and under `### i18n.js` add:
`- Fixes found during the move: the table region's aria-label is now localized (it was English on the Arabic page), and chapter titles used by the TOC and prev/next cards exclude the "#" copy-link button text.`

```bash
git add js index.html ar.html docs
git -c user.name="Adham Elganzoury" -c user.email="adham54732@gmail.com" commit -m "Refactor script.js into ES modules with shared store and i18n

Behavior unchanged apart from a localized table aria-label and
titles that exclude the heading-link button text.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Briefing text generator (pure logic)

**Files:**
- Create: `js/briefing.js`

**Interfaces:**
- Produces: `buildBriefing(lang: "en"|"ar", f: Fields) → string`, where `Fields = { task, why, person, whyYou, deadline, limits, rhythm, support }` (all strings; `rhythm` is `""|"daily"|"weekly"|"milestones"|"problem"`; `support` is `""|"anytime"|"scheduled"|"request"`). Returns `""` when `task` is empty or whitespace. Also exports `RHYTHM` and `SUPPORT` arrays of the valid keys.

- [ ] **Step 1: Create `js/briefing.js`**

```js
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
    .replace(/[.\u06D4\u060C]+$/, "")
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
```

- [ ] **Step 2: Run the checks (expect all `ok`)**

Run:
```bash
node --input-type=module - <<'EOF'
import assert from "node:assert/strict";
import { buildBriefing, RHYTHM, SUPPORT } from "./js/briefing.js";
const t = (name, fn) => { fn(); console.log("ok -", name); };

t("empty / whitespace task gives empty string (both languages)", () => {
  for (const lang of ["en", "ar"]) {
    assert.equal(buildBriefing(lang, {}), "");
    assert.equal(buildBriefing(lang, { task: "   \n " }), "");
    assert.equal(buildBriefing(lang), "");
  }
});
t("minimal English briefing", () => {
  assert.equal(
    buildBriefing("en", { task: "Prepare the Q4 report" }),
    "Hi,\n\nI'd like you to take on this task: Prepare the Q4 report.\n\nWhat will your first step be?\n\nI know you can do this."
  );
});
t("trailing punctuation does not double up", () => {
  const out = buildBriefing("en", { task: "Fix the form.", why: "customers wait.  ", person: "Sara" });
  assert.ok(out.includes("task: Fix the form.\n"));
  assert.ok(!out.includes(".."));
  assert.ok(out.includes("It matters because customers wait."));
  assert.ok(out.startsWith("Hi Sara,"));
  const ar = buildBriefing("ar", { task: "تجهيز التقرير،", whyYou: "خبرتك كبيرة." });
  assert.ok(ar.includes("المهمة: تجهيز التقرير."));
  assert.ok(!ar.includes("،."));
  assert.ok(!ar.includes(".."));
});
t("whitespace and newlines inside fields collapse", () => {
  assert.ok(buildBriefing("en", { task: "a\n\n  b" }).includes("task: a b."));
});
t("unselected and hostile select values are omitted without throwing", () => {
  const base = { task: "X" };
  const plain = buildBriefing("en", base);
  for (const bad of ["", "__proto__", "constructor", "toString", "nope", null, undefined, 5]) {
    assert.equal(buildBriefing("en", { ...base, rhythm: bad, support: bad }), plain);
    assert.equal(buildBriefing("ar", { ...base, rhythm: bad, support: bad }), buildBriefing("ar", base));
  }
});
t("every valid rhythm/support key adds exactly one line, in both languages", () => {
  for (const lang of ["en", "ar"]) {
    const base = buildBriefing(lang, { task: "X" }).split("\n\n").length;
    for (const r of RHYTHM) assert.equal(buildBriefing(lang, { task: "X", rhythm: r }).split("\n\n").length, base + 1);
    for (const s of SUPPORT) assert.equal(buildBriefing(lang, { task: "X", support: s }).split("\n\n").length, base + 1);
  }
});
t("full English briefing has the 8 steps in order", () => {
  const out = buildBriefing("en", { task: "T", why: "W", person: "P", whyYou: "Y", deadline: "Thu", limits: "L", rhythm: "weekly", support: "anytime" });
  const order = ["Hi P,", "take on this task", "It matters", "asking you because", "need it by", "Limits", "once a week", "available whenever", "first step", "can do this"];
  let pos = -1;
  for (const s of order) { const i = out.indexOf(s); assert.ok(i > pos, s); pos = i; }
});
t("Arabic briefing: no placeholder leakage, mixed-script name preserved", () => {
  const out = buildBriefing("ar", { task: "تجهيز العرض", person: "Sara" });
  assert.ok(out.startsWith("مرحبًا Sara،"));
  assert.ok(!/undefined|null|\[object/.test(out));
});
EOF
```
Expected: eight `ok -` lines and no stack trace.

- [ ] **Step 3: Commit**

```bash
git add js/briefing.js
git -c user.name="Adham Elganzoury" -c user.email="adham54732@gmail.com" commit -m "Add pure delegation briefing generator (English and gender-neutral Arabic)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Builder card UI, styles and wiring

**Files:**
- Create: `js/delegation-builder.js`
- Modify: `js/main.js` (import + call)
- Modify: `styles.css` (append)
- Modify: spec file (record amendments)

**Interfaces:**
- Consumes: `buildBriefing`, `RHYTHM`, `SUPPORT` (Task 3); `createT`/`addStrings` (Task 1); `ctx` (Task 2).
- Produces: `initDelegationBuilder(t)` — appends a card to `#how-to-delegate-the-8-step-process` on both pages; no-op if the section is missing. Strings for the card are registered via `addStrings` from inside this module, **before** `createT`'s table is read (see Step 2).

- [ ] **Step 1: Register builder strings (module top-level) and write `js/delegation-builder.js`**

```js
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
  bCopyFail: "Couldn't copy automatically. The text is selected — press Ctrl+C.",
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
  bCopyFail: "تعذّر النسخ تلقائيًا. النص محدد — اضغط Ctrl+C.",
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
  const text = (name) => el("input", { type: "text", autocomplete: "off", dir: "auto" });
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
  preview.setAttribute("aria-live", "polite");
  preview.setAttribute("aria-atomic", "true");
  preview.setAttribute("aria-labelledby", "bld-preview-label");

  const copyBtn = el("button", { type: "button", className: "primary", text: t("bCopy") });
  const clearBtn = el("button", { type: "button", text: t("bClear") });
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
      ]),
    ]),
  ]);
  card.setAttribute("role", "group");
  card.setAttribute("aria-labelledby", "bld-title");

  const readFields = () => Object.fromEntries(new FormData(form).entries());
  const update = () => {
    const out = buildBriefing(lang, readFields());
    preview.textContent = out || t("bEmpty");
    preview.classList.toggle("is-empty", !out);
    copyBtn.disabled = !out;
    msg.textContent = "";
  };

  form.addEventListener("input", update);
  form.addEventListener("submit", (e) => e.preventDefault());
  clearBtn.addEventListener("click", () => {
    form.reset();
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
```

- [ ] **Step 2: Wire it into `js/main.js`**

Add the import below the other imports:
```js
import { initDelegationBuilder } from "./delegation-builder.js";
```
`createT(...)` reads the string table at call time, but `addStrings` runs when `delegation-builder.js` is imported, which happens at module load, before `boot()`. So no ordering change is needed. In `boot()`, add the call after `initLightbox(ctx);` and before `initReader(...)`:
```js
  initDelegationBuilder(t);
```

- [ ] **Step 3: Append the styles to `styles.css`**

```css
/* ---------- Delegation briefing builder ---------- */
.builder {
  margin-block-start: 2rem;
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.builder-title {
  margin: 0 0 0.25rem;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text);
}
.builder-intro {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: var(--text-muted);
}
.builder-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}
.builder-form,
.builder-out {
  display: grid;
  gap: 0.85rem;
  align-content: start;
}
.builder-field {
  display: grid;
  gap: 0.3rem;
}
.builder-field label,
.builder-out-label {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}
.builder-field :is(input, textarea, select) {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.7rem;
  font: inherit;
  font-size: 1rem; /* 16px+ avoids iOS zoom-on-focus */
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.builder-field textarea {
  min-height: 3.2rem;
  resize: vertical;
}
.builder-preview {
  min-height: 8rem;
  padding: 0.9rem 1rem;
  color: var(--text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.builder-preview.is-empty {
  color: var(--text-muted);
  font-style: italic;
}
.builder-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.builder-actions button {
  padding: 0.55rem 1rem;
  font: inherit;
  font-weight: 600;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.builder-actions button.primary {
  color: var(--accent-contrast);
  background: var(--accent);
  border-color: var(--accent);
}
.builder-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.builder-msg {
  min-height: 1.2em;
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}
@media print {
  .builder-form,
  .builder-actions {
    display: none;
  }
}
```

- [ ] **Step 4: Module checks in Node**

Run:
```bash
node --input-type=module -e "
import('./js/i18n.js').then(async (i) => {
  await import('./js/delegation-builder.js');
  const en = i.createT('en'), ar = i.createT('ar');
  console.log(en('bTitle'), '|', ar('bTitle'));
  console.log(en('bRhythmOpts').length, ar('bRhythmOpts').length, en('bSupportOpts').length, ar('bSupportOpts').length);
});"
```
Expected: the two titles print, then `5 5 4 4` (option counts match across languages: one placeholder plus four rhythm / three support choices).

- [ ] **Step 5: Browser verification (both pages; desktop and 375px; light and dark)**

Reload with a fresh cache-buster. Go to the "How to delegate — the 8-step process" chapter (English) / «كيف تفوّض — العملية ذات الخطوات الثماني» (Arabic) and scroll to its end. Check each:

1. The card appears at the end of that chapter only; console has no errors.
2. Empty form: preview shows the hint in muted italics; **Copy is disabled**.
3. Type spaces only into "What needs doing?": still the hint, Copy still disabled.
4. Type a task: preview appears at once with greeting, task, "first step" question, closing line. Add each other field: its line appears in the order of the 8 steps; clear a field: its line disappears.
5. Trailing period/comma in a field produces no doubled punctuation.
6. Choose each rhythm/support option and the empty option: lines added/removed.
7. **Copy** shows the confirmation and pasting elsewhere gives exactly the preview text. To test the fallback, run `Object.defineProperty(navigator, "clipboard", { value: undefined })` in the console, click Copy: the preview text is selected and the failure message shows.
8. **Clear** empties the form, restores the hint and returns focus to the first field.
9. Keyboard only: Tab reaches every field, both buttons and the preview; focus ring visible; Enter in the person field does not reload the page.
10. Arabic page: card mirrors (labels and text right-aligned, buttons on the right); briefing text is right-to-left; typing an English name ("Sara") into the person field renders `مرحبًا Sara،` readably; the Arabic briefing contains no verbs conjugated for a specific gender of the person addressed.
11. 375px width: no horizontal page scroll, fields at least 16px, buttons wrap.
12. Dark mode: card, inputs and preview all readable; print preview hides the form and buttons.
13. Re-run the Task 2 regression checklist quickly (TOC, scroll-spy, theme, font, lightbox, resume): nothing regressed. Note: saved scroll positions beyond this chapter shift by the card's height; this is expected and harmless.

Record anything that could not be checked (real phone, screen reader) in the final report as untested.

- [ ] **Step 6: Amend the spec and commit**

In the spec file, replace the line starting `**Fields:**` with:
`**Fields:** task, why it matters (free text), person (name), why them (free text), deadline, limits (time / money / scope, free text), reporting rhythm (select: daily / weekly / at milestones / only if a problem), support offered (select: available any time / scheduled check-ins / on request).`
and in the `## Delivery` section replace the three numbered items with:
`1. Commits are local and follow the plan: storage/i18n modules, the module refactor, the briefing generator, then the builder UI.` followed by `2. Push/deploy only on the owner's request.` Also add under `## Out of scope`: `Export/import UI for stored data (the store supports it; no screen uses it yet).`

```bash
git add js styles.css docs
git -c user.name="Adham Elganzoury" -c user.email="adham54732@gmail.com" commit -m "Add delegation briefing builder to the 8-step delegation chapter

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git status --short
git log --oneline -5
```
Expected: clean working tree; four new commits on top of `29697d8`. Do not push.

---

## Self-Review

1. **Spec coverage:** architecture/modules (Tasks 1–2), `store.js` with namespacing, try/catch, legacy migration without deletion, export/import (Task 1), `i18n.js` (Task 1), builder placement/fields/output/behavior/accessibility (Tasks 3–4), error-handling table rows (storage blocked/corrupt → Task 1 checks; invalid import → Task 1; clipboard → Task 4 step 5.7; module load failure → content is static HTML), manual checklist items 1–5 (Task 2 steps 11–12, Task 4 step 5), delivery, out-of-scope. Spec inconsistencies found and amended in-plan: missing "why it matters" field (Task 4 step 6), head script (Task 2 step 8), commit granularity (Task 4 step 6).
2. **Placeholder scan:** no TBD/TODO; every code step shows complete code.
3. **Type consistency:** `createStore/get/set`, `createT/t/addStrings`, `ctx` fields (`state.current`, `titleOf`, `tocLinks`), `buildBriefing(lang, fields)`, `RHYTHM`/`SUPPORT`, `initDelegationBuilder(t)` match across tasks. `builder` field names (`task, why, person, whyYou, deadline, limits, rhythm, support`) match `buildBriefing`'s keys.
4. **Review Focus:** items 1, 2, 3 have Node checks in Task 3; item 4 is in Task 4 step 5.10; item 5 is in Task 1 checks and Task 2 step 12.

## Known risks

- No automated browser testing is available in this repo; Tasks 2 and 4 depend on manual browser checks. If the executor has no browser, those steps must be handed to the owner and the report must say they were not run.
- ES modules require HTTP. Opening `index.html` directly from disk (`file://`) will not run the scripts; the content stays readable but interactive features are off.
