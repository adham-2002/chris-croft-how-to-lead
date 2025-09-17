document.addEventListener("DOMContentLoaded", () => {
  const contentArea = document.getElementById("content-area");
  const tocContainer = document.getElementById("toc");
  const headings = contentArea.querySelectorAll("h2"); // Only H2 for main TOC
  const themeToggle = document.getElementById("theme-toggle");
  const fontIncrease = document.getElementById("font-increase");
  const fontDecrease = document.getElementById("font-decrease");
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const prevChapterBtn = document.getElementById("prev-chapter");
  const nextChapterBtn = document.getElementById("next-chapter");
  const sections = contentArea.querySelectorAll("section");

  let currentFontSize = 16; // Base font size in px
  const minFontSize = 14;
  const maxFontSize = 20;

  // Get responsive header height
  function getHeaderHeight() {
    return window.innerWidth <= 768 ? 70 : 80;
  }

  // Custom scroll function to account for header
  function scrollToElement(element, offset = null) {
    const headerHeight = offset || getHeaderHeight();
    const elementPosition = element.offsetTop;
    const offsetPosition = elementPosition - headerHeight;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  }

  // --- Table of Contents Generation ---
  function generateTOC() {
    const tocList = document.createElement("ul");
    headings.forEach((heading, index) => {
      const id = heading.id || `section-${index}`;
      heading.id = id; // Ensure all headings have an ID

      const listItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${id}`;
      link.textContent = heading.textContent;

      // Add click event to use custom scroll function
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetElement = document.getElementById(id);
        if (targetElement) {
          scrollToElement(targetElement);
        }
      });

      listItem.appendChild(link);
      tocList.appendChild(listItem);
    });
    tocContainer.appendChild(tocList);
  }

  // --- Theme Toggle ---
  function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    themeToggle.textContent = isDarkMode ? "☀️" : "💡";
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
      themeToggle.textContent = "☀️";
    } else {
      themeToggle.textContent = "💡";
    }
  }

  // --- Font Size Adjustment ---
  function adjustFontSize(change) {
    currentFontSize += change;
    if (currentFontSize < minFontSize) currentFontSize = minFontSize;
    if (currentFontSize > maxFontSize) currentFontSize = maxFontSize;
    document.body.style.fontSize = `${currentFontSize}px`;
    localStorage.setItem("fontSize", currentFontSize);
  }

  function loadFontSize() {
    const savedFontSize = localStorage.getItem("fontSize");
    if (savedFontSize) {
      currentFontSize = parseInt(savedFontSize);
      document.body.style.fontSize = `${currentFontSize}px`;
    }
  }

  // --- Mobile Menu Toggle ---

  // Ensure sidebar starts closed on all screen sizes
  sidebar.classList.remove("active");
  document.querySelector(".sidebar-overlay")?.remove();

  // Get Started Button Functionality
  const getStartedBtn = document.getElementById("get-started-btn");
  const firstSection = document.querySelector(
    "#content-area section:first-child"
  );

  if (getStartedBtn && firstSection) {
    getStartedBtn.addEventListener("click", () => {
      scrollToElement(firstSection);

      // Add a nice click animation
      getStartedBtn.style.transform = "scale(0.95)";
      setTimeout(() => {
        getStartedBtn.style.transform = "";
      }, 150);
    });
  }

  mobileMenuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    // Optional: Add an overlay to close sidebar when clicking outside
    if (sidebar.classList.contains("active")) {
      const overlay = document.createElement("div");
      overlay.classList.add("sidebar-overlay");
      document.body.appendChild(overlay);
      overlay.addEventListener("click", () => {
        sidebar.classList.remove("active");
        overlay.remove();
      });
    } else {
      document.querySelector(".sidebar-overlay")?.remove();
    }
  });

  // --- Chapter Navigation ---
  function updateChapterNavigation() {
    const currentSection =
      Array.from(sections).find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight / 2;
      }) || sections[0]; // Default to first section if none in view

    const currentIndex = Array.from(sections).indexOf(currentSection);

    if (currentIndex > 0) {
      prevChapterBtn.disabled = false;
      prevChapterBtn.onclick = () => {
        scrollToElement(sections[currentIndex - 1]);
      };
    } else {
      prevChapterBtn.disabled = true;
    }

    if (currentIndex < sections.length - 1) {
      nextChapterBtn.disabled = false;
      nextChapterBtn.onclick = () => {
        scrollToElement(sections[currentIndex + 1]);
      };
    } else {
      nextChapterBtn.disabled = true;
    }

    // Update active TOC link
    document.querySelectorAll(".toc ul li a").forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${currentSection.id}`) {
        link.classList.add("active");
        link.scrollIntoView({ behavior: "smooth", block: "nearest" }); // Keep active link in view
      }
    });
  }

  // --- Event Listeners ---
  themeToggle.addEventListener("click", toggleTheme);
  fontIncrease.addEventListener("click", () => adjustFontSize(1));
  fontDecrease.addEventListener("click", () => adjustFontSize(-1));
  window.addEventListener("scroll", updateChapterNavigation);
  window.addEventListener("resize", updateChapterNavigation); // Also update on resize

  // --- Initializations ---
  generateTOC();
  loadTheme();
  loadFontSize();
  updateChapterNavigation(); // Initial call to set button states and active TOC link
});
