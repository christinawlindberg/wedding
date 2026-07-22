// Small bits of chrome shared by every page, driven from js/config.js so
// the contact address and RSVP deadline are each set in exactly one place
// rather than copy-pasted across four HTML files.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const email = SITE_CONFIG.CONTACT_EMAIL;
    if (email) {
      document.querySelectorAll("[data-contact-email]").forEach((el) => {
        el.textContent = email;
        // A placeholder address would produce a mailto: to nobody. Drop the
        // href *and* the link styling, so it doesn't sit there looking like
        // a broken link until the real address is filled in.
        if (email.startsWith("[")) {
          el.removeAttribute("href");
          el.classList.add("not-a-link");
        } else {
          el.href = "mailto:" + email;
          el.classList.remove("not-a-link");
        }
      });
    }

    const deadline = SITE_CONFIG.RSVP_DEADLINE_TEXT;
    if (deadline) {
      document.querySelectorAll("[data-rsvp-deadline]").forEach((el) => {
        el.textContent = deadline;
      });
    }
  });
})();
