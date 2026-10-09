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
