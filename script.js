document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const contentArea = $("content-area");
  const tocContainer = $("toc");
  const sidebar = $("sidebar");
  const menuToggle = $("mobile-menu-toggle");
  const themeToggle = $("theme-toggle");
  const progressBar = $("progress-bar");
  const backToTop = $("back-to-top");
  const prevBtn = $("prev-chapter");
  const nextBtn = $("next-chapter");
  const sections = Array.from(contentArea.querySelectorAll("section"));
  const desktop = window.matchMedia("(min-width: 1100px)");

  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {}
    },
  };

  const headerHeight = () => document.querySelector(".site-header").offsetHeight;

  function scrollToElement(el) {
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight() - 8;
    window.scrollTo({ top, behavior: "smooth" });
  }

  // --- Wrap tables so wide ones scroll inside a card ---
  contentArea.querySelectorAll("table").forEach((table) => {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", "Scrollable table");
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  // --- Table of contents (skip the intro/at-a-glance/inline TOC sections) ---
  const tocSections = sections.filter((s) => s.querySelector("h2"));
  const tocLinks = new Map();
  const list = document.createElement("ul");
  tocSections.forEach((section) => {
    const h2 = section.querySelector("h2");
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${section.id}`;
    a.textContent = h2.textContent;
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

  // --- Theme ---
  function applyTheme(dark) {
    document.documentElement.classList.toggle("dark-mode", dark);
    themeToggle.setAttribute("aria-pressed", String(dark));
  }
  const savedTheme = store.get("theme");
  applyTheme(
    savedTheme ? savedTheme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches
  );
  themeToggle.addEventListener("click", () => {
    const dark = !document.documentElement.classList.contains("dark-mode");
    applyTheme(dark);
    store.set("theme", dark ? "dark" : "light");
  });

  // --- Font size (applies to reading text only) ---
  let fontSize = parseInt(store.get("fontSize"), 10);
  if (!(fontSize >= 14 && fontSize <= 24)) fontSize = 18;
  const setFont = (n) => {
    fontSize = Math.min(24, Math.max(14, n));
    document.documentElement.style.setProperty("--reading-size", `${fontSize}px`);
    store.set("fontSize", fontSize);
  };
  setFont(fontSize);
  $("font-increase").addEventListener("click", () => setFont(fontSize + 1));
  $("font-decrease").addEventListener("click", () => setFont(fontSize - 1));

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

  // --- Scroll-driven UI: progress, back-to-top, active section, chapter nav ---
  let current = tocSections[0];
  function setCurrent(section) {
    current = section;
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
      btn.querySelector(".nav-title").textContent = target
        ? target.querySelector("h2").textContent
        : "";
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
    if (found !== current) setCurrent(found);
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
  // --- Localised strings ---
  const ar = document.documentElement.lang === "ar";
  const T = ar
    ? {
        min: (n) => `${n} دقيقة قراءة`,
        sections: (n) => `${n} قسمًا`,
        copy: "نسخ رابط هذا القسم",
        copied: "تم النسخ",
        resume: "تابع القراءة من حيث توقفت؟",
        yes: "متابعة",
        no: "إغلاق",
        close: "إغلاق الصورة",
      }
    : {
        min: (n) => `${n} min read`,
        sections: (n) => `${n} chapters`,
        copy: "Copy link to this section",
        copied: "Copied",
        resume: "Continue where you left off?",
        yes: "Resume",
        no: "Dismiss",
        close: "Close image",
      };

  // --- Reading time ---
  (function () {
    const intro = contentArea.querySelector("section:first-child p");
    if (!intro) return;
    const words = contentArea.textContent.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / (ar ? 180 : 230)));
    const meta = document.createElement("p");
    meta.className = "reading-meta";
    [T.min(minutes), T.sections(tocSections.length)].forEach((t) => {
      const sp = document.createElement("span");
      sp.textContent = t;
      meta.appendChild(sp);
    });
    intro.after(meta);
  })();

  // --- Copyable heading links ---
  contentArea.querySelectorAll("section").forEach((section) => {
    section.querySelectorAll("h2, h3").forEach((h, i) => {
      if (!h.id) h.id = `${section.id}--${i}`;
      if (h.closest("#at-a-glance")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "heading-anchor";
      b.textContent = "#";
      b.setAttribute("aria-label", T.copy);
      b.addEventListener("click", () => {
        const url = `${location.origin}${location.pathname}#${h.id}`;
        history.replaceState(null, "", `#${h.id}`);
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
          .catch(() => {})
          .finally(() => {
            b.classList.add("copied");
            b.textContent = "✓";
            b.setAttribute("aria-label", T.copied);
            setTimeout(() => {
              b.classList.remove("copied");
              b.textContent = "#";
              b.setAttribute("aria-label", T.copy);
            }, 1500);
          });
      });
      h.appendChild(b);
    });
  });

  // --- Image lightbox ---
  const box = document.createElement("dialog");
  box.className = "lightbox";
  const boxImg = document.createElement("img");
  box.appendChild(boxImg);
  document.body.appendChild(box);
  box.addEventListener("click", () => box.close());
  contentArea.querySelectorAll("img").forEach((img) => {
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

  // --- Read chapters + resume position ---
  const pageKey = ar ? "ar" : "en";
  let readSet = new Set();
  try {
    readSet = new Set(JSON.parse(store.get(`read-${pageKey}`) || "[]"));
  } catch (e) {}
  const markRead = () => {
    tocSections.forEach((s, i) => {
      const passed = s.getBoundingClientRect().bottom < 0 || s === current;
      if (passed && i <= tocSections.indexOf(current)) readSet.add(s.id);
    });
    tocLinks.forEach((a, s) => a.classList.toggle("read", readSet.has(s.id) && s !== current));
  };
  let saveTimer;
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      store.set(`read-${pageKey}`, JSON.stringify([...readSet]));
      store.set(`pos-${pageKey}`, String(Math.round(scrollY)));
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
  const savedPos = parseInt(store.get(`pos-${pageKey}`), 10);
  if (!location.hash && savedPos > 1200) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `<span></span><button class="primary" type="button"></button><button type="button"></button>`;
    const [msg, yes, no] = toast.children;
    msg.textContent = T.resume;
    yes.textContent = T.yes;
    no.textContent = T.no;
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
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) setTimeout(() => scrollToElement(t), 100);
  }
});
