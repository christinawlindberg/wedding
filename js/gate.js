// Simple client-side password gate.
//
// This is a *casual* deterrent, not real security: everything in the page's
// HTML is still downloadable by anyone who looks at the page source. It's
// meant to keep the details away from search engines and casual visitors,
// not from a determined snoop. Don't put anything in protected pages you
// wouldn't want a sufficiently curious guest's plus-one to stumble on.
(function () {
  // localStorage, not sessionStorage: guests come back to this site over
  // months, and sessionStorage makes them re-enter the password every time
  // they close the browser — which turns into "what was the password
  // again?" emails.
  const STORAGE_KEY = "wedding_gate_ok";

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function reveal() {
    document.querySelectorAll("[data-protected-content]").forEach((el) => {
      el.style.display = "block";
    });
    const gate = document.getElementById("gate");
    if (gate) gate.style.display = "none";
  }

  async function tryUnlock(password, errorEl) {
    const hash = await sha256Hex(password.trim());
    if (hash === SITE_CONFIG.PASSWORD_HASH) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch (err) { /* private mode */ }
      reveal();
    } else if (errorEl) {
      errorEl.textContent = "That password doesn't match. Please check the invitation email and try again.";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    let unlocked = false;
    try {
      unlocked = localStorage.getItem(STORAGE_KEY) === "1" ||
        sessionStorage.getItem(STORAGE_KEY) === "1"; // pre-localStorage visits
    } catch (err) { /* storage unavailable — fall through to the prompt */ }

    if (unlocked) {
      reveal();
      return;
    }

    const form = document.getElementById("gate-form");
    if (!form) return;

    const input = document.getElementById("gate-password");
    const errorEl = document.getElementById("gate-error");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      errorEl.textContent = "";
      tryUnlock(input.value, errorEl);
    });
  });
})();
