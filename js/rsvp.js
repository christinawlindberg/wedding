// RSVP flow: guests look themselves up by name against the GuestList sheet
// (see google-apps-script/Code.gs). A lookup can match a solo guest, a
// couple (matched by either person's name, or the combined "First & First
// Last" form), or a larger family group sharing one invitation — see
// Code.gs for how that matching works. If matched, the form unlocks with
// one member block per person, cloned at runtime from #member-template
// since a party can be any size (each person confirms their own
// attendance + dietary needs) plus a shared section (plus-one, children,
// song requests) that only shows fields the guest's row actually allows.
// Existing answers are pre-filled so a repeat visit is an edit, not a
// fresh blank form.
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

  // "A, B & C" — used both for the party greeting and for labeling each
  // option in the disambiguation picker.
  function joinNames(names) {
    return names.length > 1
      ? names.slice(0, -1).join(", ") + " & " + names[names.length - 1]
      : names[0];
  }

  document.addEventListener("DOMContentLoaded", () => {
    const lookupForm = document.getElementById("lookup-form");
    const lookupStep = document.getElementById("lookup-step");
    const lookupStatus = document.getElementById("lookup-status");
    const disambiguationStep = document.getElementById("disambiguation-step");
    const disambiguationOptions = document.getElementById("disambiguation-options");
    const rsvpForm = document.getElementById("rsvp-form");
    if (!lookupForm || !rsvpForm) return;

    const partyNamesEl = document.getElementById("party-names");
    const partyIdField = document.getElementById("partyId");
    const membersContainer = document.getElementById("members-container");
    const memberTemplate = document.getElementById("member-template");

    // Builds one member block per party member (index is 1-based to match
    // the memberN_* field naming Code.gs's doPost expects), wiring up
    // name="..." attributes since these fields aren't in the static HTML.
    function buildMemberBlocks(count) {
      membersContainer.innerHTML = "";
      const blocks = [];
      for (let i = 1; i <= count; i++) {
        const fragment = memberTemplate.content.cloneNode(true);
        const block = fragment.querySelector(".member-block");
        const heading = fragment.querySelector(".member-heading");
        const nameField = fragment.querySelector(".member-name-field");
        const emailField = fragment.querySelector(".member-email-field");
        const dietaryField = fragment.querySelector(".member-dietary-field");
        const dietaryWrap = fragment.querySelector(".member-dietary-wrap");
        const lunchField = fragment.querySelector(".member-lunch-field");
        const lunchWrap = fragment.querySelector(".member-lunch-wrap");
        const declineNoteField = fragment.querySelector(".member-decline-note-field");
        const declineNoteWrap = fragment.querySelector(".member-decline-note-wrap");
        const radios = fragment.querySelectorAll(".member-attending-radio");

        nameField.name = `member${i}_name`;
        emailField.name = `member${i}_email`;
        dietaryField.name = `member${i}_dietary`;
        lunchField.name = `member${i}_buffet`;
        declineNoteField.name = `member${i}_declineNote`;
        radios.forEach((r) => {
          r.name = `member${i}_attending`;
          r.required = true;
          r.addEventListener("change", () => {
            // Dietary/buffet questions only matter if this specific
            // person is attending; a decline note only makes sense if
            // they're not.
            dietaryWrap.style.display = r.value === "Yes" && r.checked ? "block" : "none";
            lunchWrap.style.display = r.value === "Yes" && r.checked ? "block" : "none";
            declineNoteWrap.style.display = r.value === "No" && r.checked ? "block" : "none";
          });
        });

        membersContainer.appendChild(fragment);
        blocks.push({ block, heading, nameField, emailField, dietaryField, dietaryWrap, lunchField, lunchWrap, declineNoteField, declineNoteWrap });
      }
      return blocks;
    }

    const sharedEmail = document.getElementById("sharedEmail");
    const sharedEmailField = document.getElementById("sharedEmailField");
    const sharedSectionDivider = document.getElementById("sharedSectionDivider");
    const plusOneField = document.getElementById("plusOneField");
    const plusOneCheckbox = document.getElementById("plusOne");
    const plusOneDetails = document.getElementById("plusOneDetails");
    const plusOneNameInput = document.getElementById("plusOneName");
    const plusOneDietaryInput = document.getElementById("plusOneDietary");
    const plusOneLunchCheckbox = document.getElementById("plusOneLunch");
    const childrenField = document.getElementById("childrenField");
    const childrenInput = document.getElementById("children");
    const songRequestsInput = document.getElementById("songRequests");
    const notesInput = document.getElementById("notes");
    const details = document.getElementById("attending-details");
    const status = document.getElementById("rsvp-status");

    plusOneCheckbox.addEventListener("change", () => {
      plusOneDetails.style.display = plusOneCheckbox.checked ? "block" : "none";
    });

    // Shared section (plus-one/children/etc.) and the email field show if
    // at least one member of the party is attending — email is only
    // needed to send updates, and declining parties won't need any.
    // Scoped to attending radios specifically — matching any
    // input[value="Yes"] would also catch the plus-one checkbox (which
    // shares that value) and could leave the section stuck open after
    // everyone switches to declining.
    function refreshSharedVisibility() {
      const anyAttending = rsvpForm.querySelectorAll('input[name$="_attending"][value="Yes"]:checked').length > 0;
      details.style.display = anyAttending ? "block" : "none";
      sharedEmailField.style.display = anyAttending ? "block" : "none";
      sharedEmail.required = anyAttending;
      sharedSectionDivider.style.display = anyAttending ? "block" : "none";
    }
    rsvpForm.addEventListener("change", (e) => {
      if (e.target.type === "radio" && e.target.name.endsWith("_attending")) {
        refreshSharedVisibility();
      }
    });

    // Populates and reveals the RSVP form from a single matched party
    // (either the direct lookup result, or whichever option the guest
    // picked in the disambiguation step).
    function applyMatch(match) {
      partyIdField.value = match.partyId || "";
      partyNamesEl.textContent = joinNames(match.members.map((m) => m.name));

      const memberBlocks = buildMemberBlocks(match.members.length);
      sharedEmail.value = "";
      match.members.forEach((member, i) => {
        const m = memberBlocks[i];
        m.heading.textContent = member.name;
        m.nameField.value = member.name;

        if (member.existing) {
          // One email per party — take the first one found on record, since
          // every member's row carries the same duplicated value.
          if (!sharedEmail.value && member.existing.email) {
            sharedEmail.value = member.existing.email;
          }
          m.dietaryField.value = member.existing.dietary || "";
          m.lunchField.checked = member.existing.buffet === "Yes";
          m.declineNoteField.value = member.existing.declineNote || "";
          if (member.existing.attending) {
            const radio = m.block.querySelector(`input[value="${member.existing.attending}"]`);
            if (radio) radio.checked = true;
            m.dietaryWrap.style.display = member.existing.attending === "Yes" ? "block" : "none";
            m.lunchWrap.style.display = member.existing.attending === "Yes" ? "block" : "none";
            m.declineNoteWrap.style.display = member.existing.attending === "No" ? "block" : "none";
          }
        }
      });

      plusOneField.style.display = match.plusOneAllowed ? "block" : "none";
      plusOneCheckbox.checked = false;
      plusOneDetails.style.display = "none";
      childrenField.style.display = match.childrenAllowed ? "block" : "none";

      const shared = match.existingShared;
      if (shared) {
        if (match.plusOneAllowed) {
          plusOneCheckbox.checked = shared.plusOne === "Yes";
          plusOneNameInput.value = shared.plusOneName || "";
          plusOneDietaryInput.value = shared.plusOneDietary || "";
          plusOneLunchCheckbox.checked = shared.plusOneLunch === "Yes";
          plusOneDetails.style.display = plusOneCheckbox.checked ? "block" : "none";
        }
        if (match.childrenAllowed) {
          childrenInput.value = shared.children || "";
        }
        songRequestsInput.value = shared.songRequests || "";
        notesInput.value = shared.notes || "";
      }

      refreshSharedVisibility();
      lookupStep.style.display = "none";
      disambiguationStep.style.display = "none";
      rsvpForm.style.display = "block";
    }

    // Renders one button per candidate party when a typed name matches
    // more than one (e.g. two guests happen to share a name). Each button
    // is labeled with that party's full member list, since seeing who
    // else is on the invitation is what actually distinguishes them.
    function showDisambiguation(options) {
      disambiguationOptions.innerHTML = "";
      options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn";
        button.style.display = "block";
        button.style.width = "100%";
        button.style.marginBottom = "0.75rem";
        button.textContent = joinNames(option.members.map((m) => m.name));
        button.addEventListener("click", () => applyMatch(option));
        disambiguationOptions.appendChild(button);
      });
      lookupStep.style.display = "none";
      disambiguationStep.style.display = "block";
    }

    // Looks up a name and reveals the matching step. Used both for a
    // normal form submit and for the ?name= auto-lookup below (invitation
    // links can be pre-filled with a guest's exact name so they don't have
    // to guess how much of it — middle names included — we're expecting).
    async function performLookup(typedName) {
      if (!SITE_CONFIG.RSVP_ENDPOINT || SITE_CONFIG.RSVP_ENDPOINT.startsWith("PASTE_")) {
        lookupStatus.textContent = "RSVP isn't connected yet — see README for setup steps.";
        lookupStatus.className = "form-status error";
        return;
      }

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

        if (result.ambiguous) {
          showDisambiguation(result.options);
        } else {
          applyMatch(result);
        }
      } catch (err) {
        lookupStatus.textContent = "Something went wrong looking up your invitation. Please try again.";
        lookupStatus.className = "form-status error";
      } finally {
        submitBtn.disabled = false;
      }
    }

    lookupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      performLookup(document.getElementById("lookupName").value.trim());
    });

    // Invitation links can carry ?name=Full+Name to skip straight to a
    // guest's RSVP instead of making them type it in.
    const prefilledName = new URLSearchParams(window.location.search).get("name");
    if (prefilledName) {
      document.getElementById("lookupName").value = prefilledName;
      performLookup(prefilledName.trim());
    }

    rsvpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = rsvpForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      status.textContent = "Submitting…";
      status.className = "form-status";

      // One email per party — duplicate it onto every member's hidden
      // email field so each of their RSVPs rows carries it.
      rsvpForm.querySelectorAll(".member-email-field").forEach((field) => {
        field.value = sharedEmail.value;
      });

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
