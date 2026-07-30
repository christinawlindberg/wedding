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
  });
})();
