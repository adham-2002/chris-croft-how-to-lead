import { createStore } from "./store.js";
import { createT } from "./i18n.js";
import { createContext } from "./context.js";
import { initNav } from "./nav.js";
import { initTheme } from "./theme.js";
import { initFont } from "./font.js";
import { initContent } from "./content.js";
import { initLightbox } from "./lightbox.js";
import { initReader } from "./reader.js";
import { initDelegationBuilder } from "./delegation-builder.js";

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
  // Each init is isolated so one failure cannot stop the later ones.
  const run = (name, fn) => {
    try {
      fn();
    } catch (e) {
      console.error(`init ${name} failed`, e);
    }
  };
  run("nav", () => initNav(ctx));
  run("theme", () => initTheme(ctx, store));
  run("font", () => initFont(ctx, store));
  run("content", () => initContent(ctx, t));
  run("lightbox", () => initLightbox(ctx));
  run("delegation builder", () => initDelegationBuilder(t));
  run("reader", () => initReader(ctx, store, t));
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
