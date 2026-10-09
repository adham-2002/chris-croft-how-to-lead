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
  initNav(ctx);
  initTheme(ctx, store);
  initFont(ctx, store);
  initContent(ctx, t);
  initLightbox(ctx);
  initDelegationBuilder(t);
  initReader(ctx, store, t);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
