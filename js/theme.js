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
