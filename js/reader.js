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
