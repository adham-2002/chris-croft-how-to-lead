export function initLightbox(ctx) {
  const box = document.createElement("dialog");
  box.className = "lightbox";
  const boxImg = document.createElement("img");
  box.appendChild(boxImg);
  document.body.appendChild(box);
  box.addEventListener("click", () => box.close());
  ctx.contentArea.querySelectorAll("img").forEach((img) => {
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
}
