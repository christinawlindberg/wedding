// Submits the RSVP form to the Google Apps Script web app configured in
// js/config.js. Guests can resubmit later (e.g. if plans change) — the
// script matches on name + email and updates their existing row instead of
// creating a duplicate. See google-apps-script/Code.gs for the backend.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("rsvp-form");
    if (!form) return;

    const status = document.getElementById("rsvp-status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!SITE_CONFIG.RSVP_ENDPOINT || SITE_CONFIG.RSVP_ENDPOINT.startsWith("PASTE_")) {
        status.textContent = "RSVP isn't connected yet — see README for setup steps.";
        status.className = "form-status error";
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      status.textContent = "Submitting…";
      status.className = "form-status";

      const formData = new FormData(form);

      try {
        // Apps Script web apps don't return CORS headers we can read from
        // the browser, so we fire the request in no-cors mode and treat a
        // non-throwing fetch as success. This is the standard pattern for
        // posting to Apps Script from a static site.
        await fetch(SITE_CONFIG.RSVP_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          body: formData,
        });
        status.textContent = "Thank you! Your RSVP has been recorded. You can come back and resubmit any time your plans change.";
        status.className = "form-status success";
        form.reset();
      } catch (err) {
        status.textContent = "Something went wrong submitting your RSVP. Please try again or email us directly.";
        status.className = "form-status error";
      } finally {
        submitBtn.disabled = false;
      }
    });
  });
})();
