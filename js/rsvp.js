// RSVP flow: guests look themselves up by name against the GuestList sheet
// (see google-apps-script/Code.gs). A lookup can match a solo guest or a
// couple sharing one invitation (matched by either person's name, or the
// combined "First & First Last" form) — see Code.gs for how that matching
// works. If matched, the form unlocks with one member block per person
// (each confirms their own attendance + dietary needs) plus a shared
// section (plus-one, children, song requests) that only shows fields the
// guest's row actually allows. Existing answers are pre-filled so a repeat
// visit is an edit, not a fresh blank form.
(function () {
  // Apps Script web app responses aren't reliably readable via cross-origin
  // fetch(), so lookups use JSONP: a <script> tag pointed at the endpoint,
  // which loads and calls a global callback we define. Script tags aren't
  // subject to CORS. Submission (below) still uses the no-cors fetch
  // pattern, which only needs to fire the request, not read the response.
  function jsonp(url, params) {
    return new Promise((resolve, reject) => {
      const callbackName = "__rsvpLookup" + Date.now();
      const script = document.createElement("script");

      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("lookup failed"));
      };

      const qs = new URLSearchParams({ ...params, callback: callbackName });
      script.src = url + "?" + qs.toString();
      document.body.appendChild(script);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const lookupForm = document.getElementById("lookup-form");
    const lookupStep = document.getElementById("lookup-step");
    const lookupStatus = document.getElementById("lookup-status");
    const rsvpForm = document.getElementById("rsvp-form");
    if (!lookupForm || !rsvpForm) return;

    const partyNamesEl = document.getElementById("party-names");
    const partyIdField = document.getElementById("partyId");

    const memberBlocks = [
      {
        block: document.getElementById("member-1"),
        heading: document.getElementById("member-1-heading"),
        nameField: document.getElementById("member1_name"),
        emailField: document.getElementById("member1_email"),
        dietaryField: document.getElementById("member1_dietary"),
      },
      {
        block: document.getElementById("member-2"),
        heading: document.getElementById("member-2-heading"),
        nameField: document.getElementById("member2_name"),
        emailField: document.getElementById("member2_email"),
        dietaryField: document.getElementById("member2_dietary"),
      },
    ];

    const plusOneField = document.getElementById("plusOneField");
    const plusOneCheckbox = document.getElementById("plusOne");
    const plusOneNameInput = document.getElementById("plusOneName");
    const childrenField = document.getElementById("childrenField");
    const childrenInput = document.getElementById("children");
    const songRequestsInput = document.getElementById("songRequests");
    const notesInput = document.getElementById("notes");
    const details = document.getElementById("attending-details");
    const status = document.getElementById("rsvp-status");

    plusOneCheckbox.addEventListener("change", () => {
      plusOneNameInput.style.display = plusOneCheckbox.checked ? "block" : "none";
    });

    // Shared section (plus-one/children/etc.) shows if at least one member
    // of the party is attending.
    function refreshSharedVisibility() {
      const anyAttending = rsvpForm.querySelectorAll('input[value="Yes"]:checked').length > 0;
      details.style.display = anyAttending ? "block" : "none";
    }
    rsvpForm.addEventListener("change", (e) => {
      if (e.target.type === "radio" && e.target.name.endsWith("_attending")) {
        refreshSharedVisibility();
      }
    });

    lookupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!SITE_CONFIG.RSVP_ENDPOINT || SITE_CONFIG.RSVP_ENDPOINT.startsWith("PASTE_")) {
        lookupStatus.textContent = "RSVP isn't connected yet — see README for setup steps.";
        lookupStatus.className = "form-status error";
        return;
      }

      const typedName = document.getElementById("lookupName").value.trim();
      if (!typedName) return;

      const submitBtn = lookupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      lookupStatus.textContent = "Looking you up…";
      lookupStatus.className = "form-status";

      try {
        const result = await jsonp(SITE_CONFIG.RSVP_ENDPOINT, { name: typedName });

        if (!result.found) {
          lookupStatus.textContent = "We couldn't find that name on the guest list. Please check the spelling, or email us if you think this is a mistake.";
          lookupStatus.className = "form-status error";
          return;
        }

        partyIdField.value = result.partyId || "";
        partyNamesEl.textContent = result.members.map((m) => m.name).join(" & ");

        result.members.forEach((member, i) => {
          const m = memberBlocks[i];
          m.block.style.display = "block";
          m.heading.textContent = member.name;
          m.nameField.value = member.name;
          m.emailField.required = true;
          m.block.querySelectorAll('input[type="radio"]').forEach((r) => { r.required = true; });

          if (member.existing) {
            m.emailField.value = member.existing.email || "";
            m.dietaryField.value = member.existing.dietary || "";
            if (member.existing.attending) {
              const radio = m.block.querySelector(`input[value="${member.existing.attending}"]`);
              if (radio) radio.checked = true;
            }
          } else {
            m.emailField.value = "";
            m.dietaryField.value = "";
          }
        });

        // Hide (and disable requirement on) the second member block for a
        // solo invitation.
        if (result.members.length < 2) {
          const m = memberBlocks[1];
          m.block.style.display = "none";
          m.emailField.required = false;
          m.emailField.value = "";
          m.dietaryField.value = "";
          m.nameField.value = "";
          m.block.querySelectorAll('input[type="radio"]').forEach((r) => { r.required = false; r.checked = false; });
        }

        plusOneField.style.display = result.plusOneAllowed ? "block" : "none";
        childrenField.style.display = result.childrenAllowed ? "block" : "none";

        const shared = result.existingShared;
        if (shared) {
          if (result.plusOneAllowed) {
            plusOneCheckbox.checked = shared.plusOne === "Yes";
            plusOneNameInput.value = shared.plusOneName || "";
            plusOneNameInput.style.display = plusOneCheckbox.checked ? "block" : "none";
          }
          if (result.childrenAllowed) {
            childrenInput.value = shared.children || "";
          }
          songRequestsInput.value = shared.songRequests || "";
          notesInput.value = shared.notes || "";
        }

        refreshSharedVisibility();
        lookupStep.style.display = "none";
        rsvpForm.style.display = "block";
      } catch (err) {
        lookupStatus.textContent = "Something went wrong looking up your invitation. Please try again.";
        lookupStatus.className = "form-status error";
      } finally {
        submitBtn.disabled = false;
      }
    });

    rsvpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = rsvpForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      status.textContent = "Submitting…";
      status.className = "form-status";

      const formData = new FormData(rsvpForm);

      try {
        // See the jsonp() comment above for why submission uses no-cors
        // fetch instead: we only need to fire this request, not read it.
        await fetch(SITE_CONFIG.RSVP_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          body: formData,
        });
        status.textContent = "Thank you! Your RSVP has been recorded. You can look yourself up again any time to update it.";
        status.className = "form-status success";
      } catch (err) {
        status.textContent = "Something went wrong submitting your RSVP. Please try again or email us directly.";
        status.className = "form-status error";
      } finally {
        submitBtn.disabled = false;
      }
    });
  });
})();
