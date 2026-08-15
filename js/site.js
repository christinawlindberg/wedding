// Small bits of chrome shared by every page, driven from js/config.js so
// the RSVP deadline is set in exactly one place rather than copy-pasted
// across the HTML files.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const deadline = SITE_CONFIG.RSVP_DEADLINE_TEXT;
    if (deadline) {
      document.querySelectorAll("[data-rsvp-deadline]").forEach((el) => {
        el.textContent = deadline;
      });
    }

    setUpLightbox();
  });

  // Any [data-lightbox="path/to.jpg"] button opens that image in the page's
  // <dialog id="lightbox">. Used for the attire examples on the schedule.
  // The image src is only set on first open, so the file isn't downloaded
  // by guests who never click.
  function setUpLightbox() {
    const dialog = document.getElementById("lightbox");
    const triggers = document.querySelectorAll("[data-lightbox]");
    if (!dialog || !triggers.length || typeof dialog.showModal !== "function") return;

    const image = dialog.querySelector("img");

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const src = trigger.getAttribute("data-lightbox");
        if (image.getAttribute("src") !== src) image.setAttribute("src", src);
        dialog.showModal();
      });
    });

    const closer = dialog.querySelector("[data-lightbox-close]");
    if (closer) closer.addEventListener("click", () => dialog.close());

    // Clicking the backdrop closes it. The backdrop isn't its own element,
    // so a click that lands on the dialog box itself (rather than on the
    // image or the close button inside it) is the one to treat as "outside".
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });

    // Esc closes it. showModal() already does this in current browsers;
    // this is a belt-and-braces fallback for older engines and embedded
    // webviews where the close request isn't reliably delivered. Closing an
    // already-closed dialog is a no-op, so it can't double-fire.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dialog.open) dialog.close();
    });
  }
})();
