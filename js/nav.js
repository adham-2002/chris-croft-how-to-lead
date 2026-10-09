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
