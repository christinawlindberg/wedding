// Paste this into a Google Sheet's Extensions > Apps Script editor.
// See ../README.md for full setup and deployment instructions.
//
// IMPORTANT: after editing this file you must re-deploy (Deploy > Manage
// deployments > edit > Version: New version). Saving alone does not update
// the live web app.
//
// This spreadsheet needs two tabs:
//
// 1. "GuestList" — one row per invited person, header row:
//      PartyID | Name | PlusOneAllowed | ChildrenAllowed
//    - Leave PartyID blank for a solo invitation.
//    - For a couple you're treating as one invitation, give both of their
//      rows the SAME PartyID (any string, e.g. "smith"). They'll then be
//      matched together whether a guest types either person's name or the
//      combined "John & Jane Smith" form. Larger families work the same way,
//      but are matched by individual name only.
//    - PlusOneAllowed / ChildrenAllowed: TRUE or FALSE (checkbox columns
//      work well). For a couple, set on either row — either being TRUE is
//      enough. These are party-level: a couple invited jointly still
//      confirms attendance and dietary needs individually below, but
//      shares one plus-one/children answer.
//
// 2. "RSVPs" — where submitted responses land, header row:
//      PartyID | PartyKey | Name | Email | Attending | Dietary | Buffet | DeclineNote | PlusOne | PlusOneName | PlusOneDietary | PlusOneLunch | Children | SongRequests | Notes | Timestamp | FirstResponded | SubmissionID
//    You don't need to create rows here yourself — doPost fills them in,
//    one row per person (so a couple's joint RSVP still produces two rows,
//    sharing PartyID and the PlusOne/Children/etc. columns).
//    The last four columns are bookkeeping, safe to ignore when reading:
//      PartyKey     which invitation this row belongs to (see groupGuestList)
//      Timestamp    when this row was last written
//      FirstResponded  when they first replied — preserved across edits, so
//                   you can still see who's changed their answer
//      SubmissionID a nonce the site reads back to confirm the write landed

const GUEST_LIST_SHEET = "GuestList";
const RSVP_SHEET = "RSVPs";

// Must match SHARED_TOKEN in js/config.js. Not real security (it ships in
// the site's JavaScript) — it just keeps this endpoint from answering
// crawlers and idle URL-pokers, which matters because a lookup response
// includes guests' email addresses.
const SHARED_TOKEN = "XkOmJY8lN8TLXSswhpfgKVlI";

// Cutoff for accepting responses, as YYYY-MM-DD (the deadline day itself is
// still open — submissions are refused from the following midnight). Leave
// "" to accept responses indefinitely. Keep this in sync with
// RSVP_DEADLINE_TEXT in js/config.js, which is what guests actually see.
const RSVP_DEADLINE = "";

// Emails each party a copy of what they submitted. Fill in the three
// constants below before turning this on — they appear in the email.
const SEND_CONFIRMATION_EMAILS = true;
const COUPLE_NAMES = "[Partner 1] & [Partner 2]";
const CONTACT_EMAIL = "[email address]";
const SITE_URL = "https://christinawlindberg.github.io/wedding/";

function normalizeName(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function sheetAsObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return [];
  const header = values[0];
  return values.slice(1).map((row) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// Throws a message the site can show instead of failing deep inside a
// getDataRange() call on null — a renamed or deleted tab is the single most
// likely way this script breaks after setup.
function requireSheet(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet tab "' + name + '"');
  return sheet;
}

function isTrue(value) {
  return value === true || value === "TRUE";
}

function pastDeadline() {
  if (!RSVP_DEADLINE) return false;
  const cutoff = new Date(RSVP_DEADLINE + "T23:59:59");
  if (isNaN(cutoff.getTime())) return false;
  return new Date() > cutoff;
}

// Builds the name forms a guest might type to reach a 2-person party
// jointly: "John Smith & Jane Doe" (either order), and if they share a
// last name, the shorthand "John & Jane Smith" (either order).
function jointNameCandidates(nameA, nameB) {
  const candidates = [`${nameA} & ${nameB}`, `${nameB} & ${nameA}`];

  const partsA = String(nameA).trim().split(/\s+/);
  const partsB = String(nameB).trim().split(/\s+/);
  if (partsA.length > 1 && partsB.length > 1) {
    const lastA = partsA[partsA.length - 1];
    const lastB = partsB[partsB.length - 1];
    if (lastA.toLowerCase() === lastB.toLowerCase()) {
      const firstA = partsA.slice(0, -1).join(" ");
      const firstB = partsB.slice(0, -1).join(" ");
      candidates.push(`${firstA} & ${firstB} ${lastA}`, `${firstB} & ${firstA} ${lastA}`);
    }
  }
  return candidates;
}

// Groups the guest list into invitations, and gives each one a stable key
// used to tie RSVPs rows back to the right party.
//
// A shared invitation already has a key: its PartyID. A solo guest doesn't,
// so we derive one from their name, which — unlike a row number — survives
// reordering and editing the GuestList.
//
// Two solo guests who genuinely share a name would then collide, and the
// second to reply would overwrite the first. So repeats get an occurrence
// suffix: the first "Alex Chen" is `solo:alex chen`, a second one is
// `solo:alex chen#2`. Numbering only by position *among rows of the same
// name* means adding or removing other guests never disturbs it.
function groupGuestList(guestList) {
  const groups = {};
  const order = [];

  guestList.forEach((row, i) => {
    const partyId = String(row["PartyID"] || "").trim();
    const key = partyId || `__solo_${i}`;
    if (!groups[key]) {
      groups[key] = { partyId: partyId, rows: [] };
      order.push(groups[key]);
    }
    groups[key].rows.push(row);
  });

  const seen = {};
  order.forEach((group) => {
    if (group.partyId) {
      group.key = group.partyId;
      return;
    }
    const name = normalizeName(group.rows[0]["Name"]);
    seen[name] = (seen[name] || 0) + 1;
    group.key = seen[name] === 1 ? "solo:" + name : "solo:" + name + "#" + seen[name];
  });

  return order;
}

// Returns every party the typed name could refer to. Normally just one,
// but if the same name appears in more than one party (e.g. two people who
// happen to share a name and weren't distinguished in GuestList), this
// returns all of them so the guest can be asked to pick which one they are
// rather than silently guessing.
function findMatchingParties(guestList, typedName) {
  if (!typedName) return [];

  const groups = groupGuestList(guestList);
  const matched = [];

  groups.forEach((g) => {
    const directHit = g.rows.some((row) => normalizeName(row["Name"]) === typedName);
    const jointHit = g.rows.length === 2 &&
      jointNameCandidates(g.rows[0]["Name"], g.rows[1]["Name"]).some((c) => normalizeName(c) === typedName);
    if (directHit || jointHit) matched.push(g);
  });

  return matched;
}

// True if this name belongs to more than one invitation on the guest list.
// When it does we refuse to guess which stored RSVP row is whose.
function isAmbiguousName(guestList, name) {
  return findMatchingParties(guestList, normalizeName(name)).length > 1;
}

// Locates a person's existing row in RSVPs. Prefers an exact PartyKey
// match; failing that, adopts a row matched on name alone — but only when
// the name is unambiguous, so a shared name can never overwrite the wrong
// person. The name-only fallback is what lets rows written before PartyKey
// existed (or after you edited a PartyID) heal themselves on next submit
// instead of turning into duplicates.
//
// `values` is the raw sheet range; returns a 0-based index into it, or -1.
function findRsvpRow(values, col, partyKey, name, ambiguous) {
  const target = normalizeName(name);
  const nameMatches = [];

  for (let i = 1; i < values.length; i++) {
    if (normalizeName(values[i][col["Name"]]) !== target) continue;
    if (String(values[i][col["PartyKey"]] || "").trim() === partyKey) return i;
    nameMatches.push(i);
  }

  if (!ambiguous && nameMatches.length === 1) return nameMatches[0];
  return -1;
}

function buildPartyResult(party, values, col, guestList) {
  const plusOneAllowed = party.rows.some((row) => isTrue(row["PlusOneAllowed"]));
  const childrenAllowed = party.rows.some((row) => isTrue(row["ChildrenAllowed"]));
  const partyKey = party.key;

  const cell = (rowIndex, column) =>
    rowIndex >= 0 && col[column] !== undefined ? values[rowIndex][col[column]] : "";

  const members = party.rows.map((row) => {
    const ambiguous = isAmbiguousName(guestList, row["Name"]);
    const i = findRsvpRow(values, col, partyKey, row["Name"], ambiguous);
    return {
      name: row["Name"],
      existing: i >= 0 ? {
        email: cell(i, "Email"),
        attending: cell(i, "Attending"),
        dietary: cell(i, "Dietary"),
        buffet: cell(i, "Buffet"),
        declineNote: cell(i, "DeclineNote"),
        submissionId: String(cell(i, "SubmissionID") || ""),
      } : null,
    };
  });

  // Party-level answers are duplicated onto every member's row, so the
  // first member who has one on record is as good a source as any.
  let sharedIndex = -1;
  party.rows.some((row) => {
    const i = findRsvpRow(values, col, partyKey, row["Name"], isAmbiguousName(guestList, row["Name"]));
    if (i >= 0) sharedIndex = i;
    return i >= 0;
  });

  return {
    partyId: party.partyId,
    partyKey: partyKey,
    plusOneAllowed: plusOneAllowed,
    childrenAllowed: childrenAllowed,
    members: members,
    existingShared: sharedIndex >= 0 ? {
      plusOne: cell(sharedIndex, "PlusOne"),
      plusOneName: cell(sharedIndex, "PlusOneName"),
      plusOneDietary: cell(sharedIndex, "PlusOneDietary"),
      plusOneLunch: cell(sharedIndex, "PlusOneLunch"),
      children: cell(sharedIndex, "Children"),
      songRequests: cell(sharedIndex, "SongRequests"),
      notes: cell(sharedIndex, "Notes"),
    } : null,
  };
}

// JSONP wraps the payload in a call to a function the page defined. The
// callback name lands in executable output, so restrict it to identifier
// characters — otherwise anyone could hand this endpoint a URL that makes
// it emit arbitrary script.
function serve(result, callback) {
  const safeCallback = /^[A-Za-z0-9_$]{1,64}$/.test(String(callback || "")) ? callback : "";
  const body = safeCallback
    ? safeCallback + "(" + JSON.stringify(result) + ")"
    : JSON.stringify(result);

  return ContentService
    .createTextOutput(body)
    .setMimeType(safeCallback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

// GET requests are guest lookups, served as JSONP since Apps Script web app
// responses aren't reliably readable via cross-origin fetch() from a static
// site. See js/rsvp.js for the client side of this.
function doGet(e) {
  const callback = e.parameter.callback;

  try {
    if (e.parameter.token !== SHARED_TOKEN) {
      return serve({ error: "unauthorized" }, callback);
    }

    // An empty name normalizes to "" and would otherwise match any blank
    // Name cell in the sheet — an easy way to leak a party by accident.
    const typedName = normalizeName(e.parameter.name);
    if (!typedName) return serve({ found: false }, callback);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const guestList = sheetAsObjects(requireSheet(ss, GUEST_LIST_SHEET));
    const values = requireSheet(ss, RSVP_SHEET).getDataRange().getValues();
    const col = {};
    (values[0] || []).forEach((h, i) => { col[h] = i; });

    const parties = findMatchingParties(guestList, typedName);

    let result;
    if (parties.length === 0) {
      result = { found: false };
    } else if (parties.length === 1) {
      result = Object.assign(
        { found: true, ambiguous: false, pastDeadline: pastDeadline() },
        buildPartyResult(parties[0], values, col, guestList)
      );
    } else {
      result = {
        found: true,
        ambiguous: true,
        pastDeadline: pastDeadline(),
        options: parties.map((party) => buildPartyResult(party, values, col, guestList)),
      };
    }

    return serve(result, callback);
  } catch (err) {
    return serve({ error: String(err && err.message || err) }, callback);
  }
}

function doPost(e) {
  const data = e.parameter;

  if (data.token !== SHARED_TOKEN) {
    return serve({ result: "error", error: "unauthorized" }, null);
  }
  if (pastDeadline()) {
    return serve({ result: "error", error: "past deadline" }, null);
  }

  // Two guests submitting at the same moment would otherwise both read the
  // sheet, then both write based on what they saw — the second write
  // clobbering the first. Serialize instead.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return serve({ result: "error", error: "busy" }, null);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = requireSheet(ss, RSVP_SHEET);
    const guestList = sheetAsObjects(requireSheet(ss, GUEST_LIST_SHEET));

    const values = sheet.getDataRange().getValues();
    const header = values[0];
    const col = {};
    header.forEach((h, i) => { col[h] = i; });

    const partyKey = String(data.partyKey || "").trim();
    const now = new Date();

    const shared = {
      PlusOne: data.plusOne || "No",
      PlusOneName: data.plusOneName || "",
      PlusOneDietary: data.plusOneDietary || "",
      PlusOneLunch: data.plusOneLunch || "No",
      Children: data.children || "",
      SongRequests: data.songRequests || "",
      Notes: data.notes || "",
    };

    // Party size isn't fixed (solo, couple, or a larger family group all use
    // the same memberN_* naming from rsvp.html), so keep reading member1,
    // member2, member3... until one isn't present.
    const members = [];
    let n = 1;
    while (data["member" + n + "_name"]) {
      members.push({
        name: data["member" + n + "_name"],
        email: data["member" + n + "_email"],
        attending: data["member" + n + "_attending"],
        dietary: data["member" + n + "_dietary"],
        buffet: data["member" + n + "_buffet"] || "No",
        declineNote: data["member" + n + "_declineNote"],
      });
      n++;
    }

    members.forEach((member) => {
      const ambiguous = isAmbiguousName(guestList, member.name);
      const rowIndex = findRsvpRow(values, col, partyKey, member.name, ambiguous);
      const existing = rowIndex >= 0 ? values[rowIndex] : null;

      const rowData = header.map((h) => {
        switch (h) {
          case "PartyID": return data.partyId || "";
          case "PartyKey": return partyKey;
          case "Name": return member.name;
          case "Email": return member.email || "";
          case "Attending": return member.attending || "";
          case "Dietary": return member.dietary || "";
          case "Buffet": return member.buffet || "No";
          case "DeclineNote": return member.declineNote || "";
          case "PlusOne": return shared.PlusOne;
          case "PlusOneName": return shared.PlusOneName;
          case "PlusOneDietary": return shared.PlusOneDietary;
          case "PlusOneLunch": return shared.PlusOneLunch;
          case "Children": return shared.Children;
          case "SongRequests": return shared.SongRequests;
          case "Notes": return shared.Notes;
          case "Timestamp": return now;
          // Set once, then carried forward — so an edited RSVP still shows
          // when they originally replied, not just when they last changed
          // their mind.
          case "FirstResponded":
            return existing && existing[col["FirstResponded"]] ? existing[col["FirstResponded"]] : now;
          case "SubmissionID": return data.submissionId || "";
          default: return "";
        }
      });

      if (rowIndex >= 0) {
        sheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
        values[rowIndex] = rowData;
      } else {
        sheet.appendRow(rowData);
        values.push(rowData);
      }
    });

    sendConfirmation(members, shared);

    return serve({ result: "success" }, null);
  } catch (err) {
    return serve({ result: "error", error: String(err && err.message || err) }, null);
  } finally {
    lock.releaseLock();
  }
}

// Guests get no receipt otherwise — they submit into a void and then email
// to ask whether it worked. Failures here are swallowed on purpose: the
// RSVP is already saved, and a mail quota problem shouldn't look like a
// failed submission.
function sendConfirmation(members, shared) {
  if (!SEND_CONFIRMATION_EMAILS) return;

  const to = members.map((m) => m.email).filter(Boolean)[0];
  if (!to) return;

  try {
    const lines = ["Thanks for replying — here's what we have on record:", ""];

    members.forEach((m) => {
      lines.push(m.attending === "Yes" ? m.name + " — attending" : m.name + " — not attending");
      if (m.attending === "Yes") {
        if (m.dietary) lines.push("    Dietary: " + m.dietary);
        if (m.buffet === "Yes") lines.push("    Coming to the Sunday lunch");
      }
    });

    if (shared.PlusOne === "Yes") {
      lines.push("Plus-one: " + (shared.PlusOneName || "(name to come)"));
      if (shared.PlusOneDietary) lines.push("    Dietary: " + shared.PlusOneDietary);
      if (shared.PlusOneLunch === "Yes") lines.push("    Coming to the Sunday lunch");
    }
    if (shared.Children) lines.push("Children: " + shared.Children);
    if (shared.SongRequests) lines.push("Song requests: " + shared.SongRequests);
    if (shared.Notes) lines.push("Notes: " + shared.Notes);

    lines.push(
      "",
      "Need to change something? Look yourself up again at " + SITE_URL + "rsvp.html",
      "and resubmit — it updates your answer rather than adding a new one.",
      "",
      "Anything else, just reply to this email or write to " + CONTACT_EMAIL + ".",
      "",
      COUPLE_NAMES
    );

    MailApp.sendEmail({
      to: to,
      subject: "We've got your RSVP — " + COUPLE_NAMES,
      body: lines.join("\n"),
    });
  } catch (err) {
    console.error("Confirmation email failed: " + err);
  }
}
