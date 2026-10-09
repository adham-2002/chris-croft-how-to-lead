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
    // Re-read storage first so a stale page (bfcache, second tab) never overwrites
    // newer data. read/pos merge per language; other keys merge shallowly.
    set(patch) {
      let base = state;
      try {
        const s = storage && storage.getItem(KEY);
        const p = s ? JSON.parse(s) : null;
        if (p && p.v === 1) base = normalize(p);
      } catch (e) {}
      const pt = patch || {};
      state = normalize({
        ...base,
        ...pt,
        read: { ...base.read, ...(pt.read || {}) },
        pos: { ...base.pos, ...(pt.pos || {}) },
      });
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
