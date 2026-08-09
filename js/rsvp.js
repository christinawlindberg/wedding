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
  // How long to wait for a lookup before giving up. A <script> tag only
  // fires onerror on a *network* failure — if the endpoint answers with
  // something that isn't our callback (Apps Script serves an HTML error
  // page, at HTTP 200, whenever the script throws or a quota is hit), the
  // promise would otherwise never settle and the page would sit on
  // "Looking you up…" forever with its button disabled.
  const LOOKUP_TIMEOUT_MS = 12000;

  // Apps Script web app responses aren't reliably readable via cross-origin
  // fetch(), so lookups use JSONP: a <script> tag pointed at the endpoint,
  // which loads and calls a global callback we define. Script tags aren't
  // subject to CORS. Submission (below) still uses the no-cors fetch
  // pattern, which only needs to fire the request — it can't read the
  // reply, which is why the write is confirmed with a follow-up lookup.
  function jsonp(url, params) {
    return new Promise((resolve, reject) => {
      const callbackName = "__rsvpLookup" + Date.now() + Math.floor(Math.random() * 1000);
      const script = document.createElement("script");
      let timer;

      const cleanup = () => {
        clearTimeout(timer);
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

      timer = setTimeout(() => {
        cleanup();
        reject(new Error("lookup timed out"));
      }, LOOKUP_TIMEOUT_MS);

      const qs = new URLSearchParams({ ...params, token: SITE_CONFIG.SHARED_TOKEN, callback: callbackName });
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

  function show(el, visible) {
    if (el) el.hidden = !visible;
  }

  function newSubmissionId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "s" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  // Our i18n strings use HTML entities (&mdash;, &oslash;, …). The summary
  // list mixes trusted labels with untrusted guest input, so it's built with
  // textContent — decode() turns a trusted label's entities into real
  // characters first, so they render instead of showing raw "&oslash;".
  function decode(s) {
    var d = document.createElement("textarea");
    d.innerHTML = s;
    return d.value;
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
    const partyKeyField = document.getElementById("partyKey");
    const membersContainer = document.getElementById("members-container");
    const memberTemplate = document.getElementById("member-template");
    const summary = document.getElementById("rsvp-summary");
    const summaryList = document.getElementById("summary-list");
    const summaryEmail = document.getElementById("summary-email");

    // Builds one member block per party member (index is 1-based to match
    // the memberN_* field naming Code.gs's doPost expects), wiring up
    // name="..." attributes since these fields aren't in the static HTML,
    // plus per-member ids so every label actually points at its own input —
    // otherwise a couple's two identical "Dietary" fields are indis-
    // tinguishable to a screen reader.
    function buildMemberBlocks(names) {
      membersContainer.innerHTML = "";
      const blocks = [];

      names.forEach((memberName, index) => {
        const i = index + 1;
        const fragment = memberTemplate.content.cloneNode(true);
        const block = fragment.querySelector(".member-block");
        const heading = fragment.querySelector(".member-heading");
        const nameField = fragment.querySelector(".member-name-field");
        const emailField = fragment.querySelector(".member-email-field");
        const dietaryField = fragment.querySelector(".member-dietary-field");
        const dietaryWrap = fragment.querySelector(".member-dietary-wrap");
        const dietaryLabel = fragment.querySelector(".member-dietary-label");
        const lunchRadios = fragment.querySelectorAll(".member-lunch-field");
        const lunchLabel = fragment.querySelector(".member-lunch-label");
        const lunchGroup = fragment.querySelector(".member-lunch-radios");
        const lunchWrap = fragment.querySelector(".member-lunch-wrap");
        const declineNoteField = fragment.querySelector(".member-decline-note-field");
        const declineNoteWrap = fragment.querySelector(".member-decline-note-wrap");
        const declineNoteLabel = fragment.querySelector(".member-decline-note-label");
        const attendingLabel = fragment.querySelector(".member-attending-label");
        const radioGroup = fragment.querySelector(".radio-row");
        const radios = fragment.querySelectorAll(".member-attending-radio");

        nameField.name = `member${i}_name`;
        emailField.name = `member${i}_email`;
        dietaryField.name = `member${i}_dietary`;
        lunchRadios.forEach((r) => { r.name = `member${i}_buffet`; });
        declineNoteField.name = `member${i}_declineNote`;

        // Every label points at its own input. The visible text stays short
        // — whose block it is, is obvious from the heading right above it —
        // while aria-label carries the name, so a couple's two identical
        // "Dietary restrictions" fields are still told apart when read
        // aloud out of visual context.
        heading.id = `member${i}-heading`;
        attendingLabel.id = `member${i}-attending-label`;
        radioGroup.setAttribute("aria-labelledby", `member${i}-heading member${i}-attending-label`);

        dietaryField.id = `member${i}-dietary`;
        dietaryLabel.htmlFor = dietaryField.id;
        dietaryField.setAttribute("aria-label", `${decode(T("rsvp.js.aria.dietary"))} — ${memberName}`);

        declineNoteField.id = `member${i}-decline-note`;
        declineNoteLabel.htmlFor = declineNoteField.id;
        declineNoteField.setAttribute("aria-label", `${decode(T("rsvp.js.aria.note"))} — ${memberName}`);

        lunchLabel.id = `member${i}-lunch-label`;
        lunchGroup.setAttribute("aria-labelledby", `member${i}-heading member${i}-lunch-label`);

        radios.forEach((r) => {
          r.name = `member${i}_attending`;
          r.required = true;
          r.addEventListener("change", () => {
            // Dietary/buffet questions only matter if this specific
            // person is attending; a decline note only makes sense if
            // they're not. The buffet is a required yes/no once shown, so
            // its required-ness tracks visibility (a hidden required field
            // blocks submission with an un-positionable bubble).
            const attending = r.value === "Yes" && r.checked;
            const declining = r.value === "No" && r.checked;
            show(dietaryWrap, attending);
            show(lunchWrap, attending);
            show(declineNoteWrap, declining);
            lunchRadios.forEach((lr) => { lr.required = attending; });
          });
        });

        membersContainer.appendChild(fragment);
        // The cloned template carries data-i18n labels; translate the block
        // now so it matches the current language (it's also re-translated on
        // toggle, since it's now part of the document).
        if (window.i18n) window.i18n.translate(block);
        blocks.push({ block, heading, nameField, emailField, dietaryField, dietaryWrap, lunchRadios, lunchWrap, declineNoteField, declineNoteWrap });
      });

      return blocks;
    }

    const sharedEmail = document.getElementById("sharedEmail");
    const plusOneField = document.getElementById("plusOneField");
    const plusOneCheckbox = document.getElementById("plusOne");
    const plusOneDetails = document.getElementById("plusOneDetails");
    const plusOneNameInput = document.getElementById("plusOneName");
    const plusOneDietaryInput = document.getElementById("plusOneDietary");
    const plusOneLunchRadios = rsvpForm.querySelectorAll('input[name="plusOneLunch"]');
    const setPlusOneLunch = (val) => plusOneLunchRadios.forEach((r) => { r.checked = r.value === val; });
    const childrenField = document.getElementById("childrenField");
    const childrenInput = document.getElementById("children");
    const songRequestsInput = document.getElementById("songRequests");
    const notesInput = document.getElementById("notes");
    const details = document.getElementById("attending-details");
    const status = document.getElementById("rsvp-status");

    plusOneCheckbox.addEventListener("change", () => {
      show(plusOneDetails, plusOneCheckbox.checked);
      refreshRequired();
    });

    // A `required` field that's hidden blocks submission with a validation
    // bubble the browser can't position — the form just silently refuses to
    // submit. So required-ness always tracks visibility. Email is always
    // shown now (declining parties still get a confirmation), so it's
    // always required; only the plus-one fields still depend on attendance.
    function refreshRequired() {
      const anyAttending = isAnyoneAttending();
      sharedEmail.required = true;
      const plusOneShown = anyAttending && !plusOneField.hidden && plusOneCheckbox.checked;
      plusOneNameInput.required = plusOneShown;
      plusOneLunchRadios.forEach((r) => { r.required = plusOneShown; });
    }

    function isAnyoneAttending() {
      return rsvpForm.querySelectorAll('input[name$="_attending"][value="Yes"]:checked').length > 0;
    }

    // The plus-one/children/etc. section only makes sense if someone's
    // attending. The email field and its divider stay visible regardless —
    // scoped to attending radios specifically for `details`, since matching
    // any input[value="Yes"] would also catch the plus-one checkbox (which
    // shares that value).
    function refreshSharedVisibility() {
      const anyAttending = isAnyoneAttending();
      show(details, anyAttending);
      refreshRequired();
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
      partyKeyField.value = match.partyKey || "";
      partyNamesEl.textContent = joinNames(match.members.map((m) => m.name));

      const memberBlocks = buildMemberBlocks(match.members.map((m) => m.name));
      sharedEmail.value = "";
      match.members.forEach((member, i) => {
        const m = memberBlocks[i];
        m.nameField.value = member.name;
        m.heading.textContent = member.name;

        if (member.existing) {
          // One email per party — take the first one found on record, since
          // every member's row carries the same duplicated value.
          if (!sharedEmail.value && member.existing.email) {
            sharedEmail.value = member.existing.email;
          }
          m.dietaryField.value = member.existing.dietary || "";
          if (member.existing.buffet === "Yes" || member.existing.buffet === "No") {
            const lr = m.block.querySelector(`.member-lunch-field[value="${member.existing.buffet}"]`);
            if (lr) lr.checked = true;
          }
          m.declineNoteField.value = member.existing.declineNote || "";
          if (member.existing.attending) {
            const attending = member.existing.attending === "Yes";
            const radio = m.block.querySelector(`.member-attending-radio[value="${member.existing.attending}"]`);
            if (radio) radio.checked = true;
            show(m.dietaryWrap, attending);
            show(m.lunchWrap, attending);
            show(m.declineNoteWrap, member.existing.attending === "No");
            m.lunchRadios.forEach((lr) => { lr.required = attending; });
          }
        }
      });

      show(plusOneField, !!match.plusOneAllowed);
      plusOneCheckbox.checked = false;
      show(plusOneDetails, false);
      show(childrenField, !!match.childrenAllowed);

      // Reset every party-level field, then re-fill from what's on record —
      // otherwise picking a second option in the disambiguation step would
      // inherit the first one's answers.
      plusOneNameInput.value = "";
      plusOneDietaryInput.value = "";
      setPlusOneLunch("");
      childrenInput.value = "";
      songRequestsInput.value = "";
      notesInput.value = "";

      const shared = match.existingShared;
      if (shared) {
        if (match.plusOneAllowed) {
          plusOneCheckbox.checked = shared.plusOne === "Yes";
          plusOneNameInput.value = shared.plusOneName || "";
          plusOneDietaryInput.value = shared.plusOneDietary || "";
          setPlusOneLunch(shared.plusOneLunch === "No" ? "No" : shared.plusOneLunch === "Yes" ? "Yes" : "");
          show(plusOneDetails, plusOneCheckbox.checked);
        }
        if (match.childrenAllowed) {
          childrenInput.value = shared.children || "";
        }
        songRequestsInput.value = shared.songRequests || "";
        notesInput.value = shared.notes || "";
      }

      refreshSharedVisibility();
      status.textContent = "";
      status.className = "form-status";
      show(lookupStep, false);
      show(disambiguationStep, false);
      show(summary, false);
      show(rsvpForm, true);
    }

    // Renders one button per candidate party when a typed name matches
    // more than one (e.g. two guests happen to share a name). Each button
    // is labeled with that party's full member list, since seeing who
    // else is on the invitation is what actually distinguishes them.
    //
    // Two *solo* guests with the same name have nothing to tell them apart,
    // so the picker would be two identical buttons and a coin flip — and
    // guessing wrong overwrites a stranger's RSVP. Hand those off to us
    // instead. (Better still, give one of them a middle name or Jr. in
    // GuestList so the lookup is unambiguous in the first place.)
    function showDisambiguation(options) {
      const labels = options.map((o) => joinNames(o.members.map((m) => m.name)));
      if (new Set(labels).size < labels.length) {
        show(disambiguationStep, false);
        show(lookupStep, true);
        showLookupError(M("rsvp.js.dupname"));
        return;
      }

      disambiguationOptions.innerHTML = "";
      options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-block";
        button.textContent = joinNames(option.members.map((m) => m.name));
        button.addEventListener("click", () => applyMatch(option));
        disambiguationOptions.appendChild(button);
      });
      show(lookupStep, false);
      show(summary, false);
      show(disambiguationStep, true);
    }

    // Back to a blank lookup — for a guest who's landed on someone else's
    // prefilled invitation link, or picked the wrong person in the
    // disambiguation step.
    function startOver() {
      show(rsvpForm, false);
      show(disambiguationStep, false);
      show(summary, false);
      show(lookupStep, true);
      lookupStatus.textContent = "";
      lookupStatus.className = "form-status";
      const input = document.getElementById("lookupName");
      input.value = "";
      input.focus();
      // Drop ?name= so a reload doesn't jump straight back into the
      // invitation they were trying to get out of.
      if (window.history.replaceState && window.location.search) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
    document.querySelectorAll("[data-start-over]").forEach((el) => {
      el.addEventListener("click", startOver);
    });

    // Messages come from our own i18n dictionary (which uses HTML entities
    // like &mdash;), so they're set as innerHTML rather than textContent.
    function showLookupError(message) {
      lookupStatus.innerHTML = message;
      lookupStatus.className = "form-status error";
    }

    // Looks up a name and reveals the matching step. Used both for a
    // normal form submit and for the ?name= auto-lookup below (invitation
    // links can be pre-filled with a guest's exact name so they don't have
    // to guess how much of it — middle names included — we're expecting).
    async function performLookup(typedName) {
      if (!SITE_CONFIG.RSVP_ENDPOINT || SITE_CONFIG.RSVP_ENDPOINT.startsWith("PASTE_")) {
        showLookupError(T("rsvp.js.notconnected"));
        return;
      }

      if (!typedName) return;

      const submitBtn = lookupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      lookupStatus.innerHTML = T("rsvp.js.looking");
      lookupStatus.className = "form-status";

      try {
        const result = await jsonp(SITE_CONFIG.RSVP_ENDPOINT, { name: typedName });

        if (result.error) {
          showLookupError(M("rsvp.js.err.lookup"));
          return;
        }

        if (!result.found) {
          showLookupError(M("rsvp.js.err.notfound"));
          return;
        }

        if (result.pastDeadline) {
          showLookupError(M("rsvp.js.err.deadline"));
          return;
        }

        if (result.ambiguous) {
          showDisambiguation(result.options);
        } else {
          applyMatch(result);
        }
      } catch (err) {
        showLookupError(M("rsvp.js.err.unreachable"));
      } finally {
        submitBtn.disabled = false;
      }
    }

    // Guests all have our contact details from the invitation, so the site
    // deliberately carries no email address — error messages just point back
    // to us directly.
    //
    // T() looks up a JS-only string in the current language; M() also splices
    // the contact phrase into the "{c}" placeholder. Both fall back to the
    // key/English if i18n somehow isn't loaded.
    function T(key) { return window.i18n ? window.i18n.t(key) : key; }
    function M(key) { return T(key).replace("{c}", T("rsvp.js.contact")); }
    function contactSentence() { return T("rsvp.js.contact"); }

    lookupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      performLookup(document.getElementById("lookupName").value.trim());
    });

    // Invitation links can carry ?name=Full+Name to skip straight to a
    // guest's RSVP instead of making them type it in.
    const prefilledName = new URLSearchParams(window.location.search).get("name");
    if (prefilledName && prefilledName.trim()) {
      document.getElementById("lookupName").value = prefilledName;
      performLookup(prefilledName.trim());
    }

    // FormData includes fields regardless of whether they're on screen, so
    // a guest who filled in dietary needs and then switched to "decline"
    // would still submit them — inflating the buffet headcount with people
    // who aren't coming. Drop anything currently hidden. Type-hidden inputs
    // (the member name/email carriers) are the point of the exercise, so
    // they stay.
    function formDataWithoutHiddenFields() {
      const data = new FormData(rsvpForm);
      rsvpForm.querySelectorAll("input, textarea, select").forEach((el) => {
        if (!el.name || el.type === "hidden") return;
        if (el.hidden || el.closest("[hidden]")) data.delete(el.name);
      });
      return data;
    }

    // A no-cors POST resolves even when the server rejected the write — the
    // response is opaque, so status is unreadable. Read the answer back
    // instead and check our one-off submission id actually landed on every
    // member's row. Without this, a broken endpoint still tells guests
    // "recorded" and the RSVP is silently lost.
    async function verifySubmission(lookupName, partyKey, submissionId) {
      const result = await jsonp(SITE_CONFIG.RSVP_ENDPOINT, { name: lookupName });
      if (!result || result.error || !result.found) return false;

      const party = result.ambiguous
        ? (result.options || []).find((o) => o.partyKey === partyKey)
        : result;
      if (!party || !party.members) return false;

      return party.members.every((m) => m.existing && m.existing.submissionId === submissionId);
    }

    // Remembered so the summary can be re-rendered in the other language if
    // the guest toggles it while looking at their receipt.
    let lastSummaryData = null;

    function renderSummary(data, keepView) {
      lastSummaryData = data;
      summaryList.innerHTML = "";
      const D = (key) => decode(T(key));
      const add = (text, nested) => {
        const li = document.createElement("li");
        li.textContent = text;
        if (nested) li.className = "summary-nested";
        summaryList.appendChild(li);
      };

      let i = 1;
      while (data.get(`member${i}_name`)) {
        const name = data.get(`member${i}_name`);
        const attending = data.get(`member${i}_attending`) === "Yes";
        add(`${name} — ${attending ? D("rsvp.js.attending") : D("rsvp.js.notattending")}`);
        if (attending) {
          const dietary = data.get(`member${i}_dietary`);
          if (dietary) add(`${D("rsvp.js.sum.dietary")} ${dietary}`, true);
          if (data.get(`member${i}_buffet`) === "Yes") add(D("rsvp.js.sum.lunch"), true);
        }
        i++;
      }

      if (data.get("plusOne") === "Yes") {
        add(`${D("rsvp.js.sum.plusone")} ${data.get("plusOneName") || D("rsvp.js.sum.nametocome")}`);
        const dietary = data.get("plusOneDietary");
        if (dietary) add(`${D("rsvp.js.sum.dietary")} ${dietary}`, true);
        if (data.get("plusOneLunch") === "Yes") add(D("rsvp.js.sum.lunch"), true);
      }
      if (data.get("children")) add(`${D("rsvp.js.sum.children")} ${data.get("children")}`);
      if (data.get("songRequests")) add(`${D("rsvp.js.sum.songs")} ${data.get("songRequests")}`);
      if (data.get("notes")) add(`${D("rsvp.js.sum.notes")} ${data.get("notes")}`);

      summaryEmail.textContent = sharedEmail.value || D("rsvp.js.sum.you");
      show(rsvpForm, false);
      show(summary, true);
      if (!keepView) summary.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Keep the summary list in sync when the language is toggled while it's
    // on screen. (The static form chrome re-translates itself via data-i18n.)
    document.addEventListener("langchange", () => {
      if (summary && !summary.hidden && lastSummaryData) renderSummary(lastSummaryData, true);
    });

    document.getElementById("edit-response").addEventListener("click", () => {
      show(summary, false);
      show(rsvpForm, true);
      status.textContent = "";
      status.className = "form-status";
      rsvpForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    rsvpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = rsvpForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      status.innerHTML = T("rsvp.js.submitting");
      status.className = "form-status";

      // One email per party — duplicate it onto every member's hidden
      // email field so each of their RSVPs rows carries it.
      rsvpForm.querySelectorAll(".member-email-field").forEach((field) => {
        field.value = sharedEmail.value;
      });

      const submissionId = newSubmissionId();
      const data = formDataWithoutHiddenFields();
      data.set("submissionId", submissionId);
      data.set("token", SITE_CONFIG.SHARED_TOKEN);

      const firstName = data.get("member1_name");
      const partyKey = partyKeyField.value;

      try {
        // See the jsonp() comment above for why submission uses no-cors
        // fetch: we can fire this request but not read the reply.
        await fetch(SITE_CONFIG.RSVP_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          body: data,
        });

        if (await verifySubmission(firstName, partyKey, submissionId)) {
          renderSummary(data);
          return;
        }

        status.innerHTML = M("rsvp.js.err.unconfirmed");
        status.className = "form-status error";
      } catch (err) {
        status.innerHTML = M("rsvp.js.err.submit");
        status.className = "form-status error";
      } finally {
        submitBtn.disabled = false;
      }
    });
  });
})();
