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
