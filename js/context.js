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
