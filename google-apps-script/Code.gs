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
//      PartyID | Name | PlusOneAllowed | ChildrenAllowed | BachEventAllowed
//    - Leave PartyID blank for a solo invitation.
//    - For a couple you're treating as one invitation, give both of their
//      rows the SAME PartyID (any string, e.g. "smith"). They'll then be
//      matched together whether a guest types either person's name or the
//      combined "John & Jane Smith" form. Larger families work the same way,
//      but are matched by individual name only.
//    - PlusOneAllowed / ChildrenAllowed / BachEventAllowed: TRUE or FALSE
//      (checkbox columns work well). For a couple, set on either row —
//      either being TRUE is enough. These are party-level: a couple invited
//      jointly still confirms attendance and dietary needs individually
//      below, but shares one plus-one/children answer.
//    - BachEventAllowed gates the Friday bachelor/bachelorette question, so
//      only the guests invited to it are asked. Each attending member picks
//      their own event (and the plus-one gets their own pick); leaving the
//      column blank/FALSE hides the question entirely.
//
// 2. "RSVPs" — where submitted responses land, header row:
//      PartyID | PartyKey | Name | Email | Attending | Dietary | Buffet | BachEvent | DeclineNote | PlusOne | PlusOneName | PlusOneDietary | PlusOneLunch | PlusOneBachEvent | Children | SongRequests | Notes | Timestamp | FirstResponded | SubmissionID
//    You don't need to create rows here yourself — doPost fills them in,
//    one row per person (so a couple's joint RSVP still produces two rows,
//    sharing PartyID and the PlusOne/Children/etc. columns).
//    Everything here is looked up by header NAME, not position, so the
//    column order above doesn't matter — to add a new one (e.g. BachEvent /
//    PlusOneBachEvent) just append it to the right of the existing headers.
//    A column that doesn't exist is simply not written, so an out-of-date
//    sheet degrades quietly rather than erroring.
//      BachEvent    which Friday event this person picked: "Bike ride",
//                   "Picnic", or "Opt out" (blank if they weren't invited)
//      PlusOneBachEvent  the same, for the party's plus-one
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
const RSVP_DEADLINE = "2027-02-04";

// Emails each party a copy of what they submitted. Fill in the constants
// below before turning this on — they appear in the email.
const SEND_CONFIRMATION_EMAILS = true;
const COUPLE_NAMES = "John & Christina";
const SITE_URL = "https://christinawlindberg.github.io/wedding/";

// Plaintext password shown in the confirmation email so guests can look
// themselves up again later. Purely informational — keep this in sync by
// hand with whatever password's hash is in js/config.js as PASSWORD_HASH.
const RSVP_PASSWORD = "oliver2027";

// Sticker shown at the bottom of the confirmation email. Fetched from the
// live site at send time and attached inline, so it displays without the
// "load remote images?" prompt some clients show. Set to "" to drop it.
// If the fetch fails the email still goes out, just without the picture —
// see stickerAttachment().
const CONFIRMATION_STICKER_URL = SITE_URL + "assets/images/cat-sticker.png";

// "auto" picks the confirmation wording based on whether anyone in the
// party is attending (see sendConfirmation). Set to "neutral" to always
// send the same wording regardless of attendance.
const EMAIL_TONE = "auto";

function normalizeName(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// "A, B & C" — for addressing a multi-person party in the confirmation
// email greeting.
function joinNames(names) {
  return names.length > 1
    ? names.slice(0, -1).join(", ") + " & " + names[names.length - 1]
    : names[0];
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
  const bachEventAllowed = party.rows.some((row) => isTrue(row["BachEventAllowed"]));
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
        bachEvent: cell(i, "BachEvent"),
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
    bachEventAllowed: bachEventAllowed,
    members: members,
    existingShared: sharedIndex >= 0 ? {
      plusOne: cell(sharedIndex, "PlusOne"),
      plusOneName: cell(sharedIndex, "PlusOneName"),
      plusOneDietary: cell(sharedIndex, "PlusOneDietary"),
      plusOneLunch: cell(sharedIndex, "PlusOneLunch"),
      plusOneBachEvent: cell(sharedIndex, "PlusOneBachEvent"),
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
      PlusOneBachEvent: data.plusOneBachEvent || "",
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
        bachEvent: data["member" + n + "_bachEvent"] || "",
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
          case "BachEvent": return member.bachEvent || "";
          case "DeclineNote": return member.declineNote || "";
          case "PlusOne": return shared.PlusOne;
          case "PlusOneName": return shared.PlusOneName;
          case "PlusOneDietary": return shared.PlusOneDietary;
          case "PlusOneLunch": return shared.PlusOneLunch;
          case "PlusOneBachEvent": return shared.PlusOneBachEvent;
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

// Spells out a stored BachEvent value for the confirmation email. Returns
// "" for "Opt out" and for anyone who wasn't invited (blank), so the caller
// simply omits the line rather than printing "Friday event: Opt out".
function bachEventLabel(value) {
  switch (String(value || "").trim()) {
    case "Bike ride": return "Bike ride with John (Mikkeller, Årsdale)";
    case "Picnic": return "Beach picnic with Christina (Snogebæk)";
    default: return "";
  }
}

// The email carries guest-entered text (names, dietary needs, notes), so
// anything interpolated into the HTML part gets escaped — otherwise a stray
// "<" or "&" in someone's note mangles the rest of the message.
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Grabs the sticker for inline (cid:) embedding. Deliberately isolated and
// non-fatal: a slow or 404-ing image must never cost a guest their
// confirmation email, so any failure just returns null and the message goes
// out without the picture.
function stickerAttachment() {
  if (!CONFIRMATION_STICKER_URL) return null;
  try {
    const response = UrlFetchApp.fetch(CONFIRMATION_STICKER_URL, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      console.error("Sticker fetch returned HTTP " + response.getResponseCode());
      return null;
    }
    return response.getBlob().setName("catSticker");
  } catch (err) {
    console.error("Sticker fetch failed: " + err);
    return null;
  }
}

// ---- confirmation email styling ----
// Loosely a printed dinner-menu card: cream stock, deep green ink, a
// pinstriped border framing a ruled panel. Everything is inlined and
// table-based because that's the subset of HTML/CSS email clients agree
// on — see buildConfirmationHtml for what degrades where.
const MAIL_PAGE_BG = "#e9e7e0";   // outside the card
const MAIL_CARD_BG = "#f4f2eb";   // the card stock itself
const MAIL_INK = "#2f3d34";       // deep green, headings + rules
const MAIL_BODY_INK = "#4a5a4f";  // slightly lifted, for body copy
const MAIL_SERIF = "Georgia, 'Times New Roman', Times, serif";

// The response is grouped rather than kept as flat lines so the plain-text
// and HTML parts can both be rendered from one model and never drift: each
// section is a heading (a person, or "Notes") plus the lines under it.
function buildResponseSections(members, shared) {
  const sections = [];

  members.forEach(function (m) {
    const items = [];
    items.push(m.attending === "Yes" ? "Attending" : "Not attending");
    if (m.attending === "Yes") {
      if (m.dietary) items.push("Dietary: " + m.dietary);
      if (m.buffet === "Yes") items.push("Coming to the Sunday lunch");
      const bach = bachEventLabel(m.bachEvent);
      if (bach) items.push("Friday event: " + bach);
    }
    sections.push({ title: m.name, items: items });
  });

  if (shared.PlusOne === "Yes") {
    const items = [shared.PlusOneName || "(name to come)"];
    if (shared.PlusOneDietary) items.push("Dietary: " + shared.PlusOneDietary);
    if (shared.PlusOneLunch === "Yes") items.push("Coming to the Sunday lunch");
    const plusOneBach = bachEventLabel(shared.PlusOneBachEvent);
    if (plusOneBach) items.push("Friday event: " + plusOneBach);
    sections.push({ title: "Plus-one", items: items });
  }

  if (shared.Children) sections.push({ title: "Children", items: [shared.Children] });
  if (shared.SongRequests) sections.push({ title: "Song Requests", items: [shared.SongRequests] });
  if (shared.Notes) sections.push({ title: "Notes", items: [shared.Notes] });

  return sections;
}

function renderSectionsText(sections) {
  return sections.map(function (s) {
    return s.title + "\n" + s.items.map(function (i) { return "    " + i; }).join("\n");
  }).join("\n\n");
}

// Builds the card. Notes on the email-client compromises:
//  - tables + inline styles, since Outlook ignores most modern CSS
//  - the pinstripes are a repeating-linear-gradient, which unsupported
//    clients simply drop, leaving the plain cream bgcolor underneath
//  - no web fonts (they don't load in Outlook/Gmail); the script accent on
//    a real menu becomes large italic Georgia, which is the closest thing
//    that renders everywhere
function buildConfirmationHtml(greeting, intro, sections, contact, signoff, hasSticker) {
  const stripes =
    "background-image:repeating-linear-gradient(90deg," + MAIL_INK + " 0px," + MAIL_INK +
    " 1px,transparent 1px,transparent 7px);";

  // Guest-entered text and the site URL below are both long unbroken
  // strings in the worst case; without this they widen the card past the
  // screen on a phone instead of wrapping.
  const wrap = "word-break:break-word;overflow-wrap:break-word;";

  const sectionsHtml = sections.map(function (s) {
    const items = s.items.map(function (item) {
      return '<div style="margin:0 0 4px;font-family:' + MAIL_SERIF +
        ';font-size:15px;line-height:1.65;color:' + MAIL_BODY_INK + ";" + wrap + '">' +
        escapeHtml(item) + "</div>";
    }).join("");
    return '<div style="margin:0 0 26px;">' +
      '<div style="margin:0 0 8px;font-family:' + MAIL_SERIF +
      ';font-style:italic;font-size:22px;line-height:1.3;color:' + MAIL_INK + ';">' +
      escapeHtml(s.title) + "</div>" + items + "</div>";
  }).join("");

  const stickerHtml = hasSticker
    ? '<div style="margin:0 0 30px;"><img src="cid:catSticker" alt="" width="190" ' +
      'style="width:190px;max-width:70%;height:auto;border:0;display:block;margin:0 auto;"></div>'
    : "";

  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>RSVP confirmed</title></head>" +
    '<body style="margin:0;padding:0;background:' + MAIL_PAGE_BG + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
    'bgcolor="' + MAIL_PAGE_BG + '" style="background:' + MAIL_PAGE_BG + ';">' +
    '<tr><td align="center" style="padding:28px 12px;">' +

      // The card, with the pinstriped margin. width:100% + max-width (rather
      // than a fixed width:600px) is what lets it shrink on a phone — a
      // fixed-width table won't drop below its content's min-width and just
      // overflows the screen instead.
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
      'align="center" bgcolor="' + MAIL_CARD_BG + '" style="width:100%;max-width:600px;background:' +
      MAIL_CARD_BG + ';">' +
      '<tr><td style="padding:22px;' + stripes + '">' +

        // The ruled inner panel sits on solid stock, masking the stripes.
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
        'bgcolor="' + MAIL_CARD_BG + '" style="background:' + MAIL_CARD_BG + ';border:1px solid ' + MAIL_INK + ';">' +
        '<tr><td align="center" style="padding:40px 34px 44px;">' +

          '<div style="font-family:' + MAIL_SERIF + ';font-size:27px;letter-spacing:7px;' +
          "text-transform:uppercase;color:" + MAIL_INK + ';">RSVP</div>' +
          '<div style="margin:2px 0 26px;font-family:' + MAIL_SERIF + ';font-style:italic;' +
          "font-size:40px;line-height:1.2;color:" + MAIL_INK + ';">Confirmed</div>' +

          stickerHtml +

          '<div style="margin:0 0 30px;font-family:' + MAIL_SERIF + ';font-size:15px;' +
          "line-height:1.7;color:" + MAIL_BODY_INK + ';">' +
          "<div>" + escapeHtml(greeting) + "</div>" +
          '<div style="margin-top:10px;">' + escapeHtml(intro) + "</div></div>" +

          sectionsHtml +

          '<div style="border-top:1px solid ' + MAIL_INK + ';margin:6px 0 0;padding-top:22px;' +
          "font-family:" + MAIL_SERIF + ";font-size:12.5px;line-height:1.7;color:" + MAIL_BODY_INK + ";" +
          wrap + '">' + escapeHtml(contact) + "</div>" +

          '<div style="margin-top:24px;font-family:' + MAIL_SERIF + ';font-size:15px;' +
          "line-height:1.7;color:" + MAIL_INK + ';">Thank you,<br>' +
          '<span style="font-style:italic;font-size:20px;">' + escapeHtml(signoff) + "</span></div>" +

        "</td></tr></table>" +
      "</td></tr></table>" +
    "</td></tr></table></body></html>";
}

// Guests get no receipt otherwise — they submit into a void and then email
// to ask whether it worked. Failures here are swallowed on purpose: the
// RSVP is already saved, and a mail quota problem shouldn't look like a
// failed submission.
//
// Wording depends on whether anyone in the party is attending (unless
// EMAIL_TONE is "neutral", which always uses the same wording) — see the
// three templates below.
function sendConfirmation(members, shared) {
  if (!SEND_CONFIRMATION_EMAILS) return;

  // Collected regardless of attendance (see refreshRequired in js/rsvp.js),
  // so a fully-declining party still gets a confirmation.
  const to = members.map((m) => m.email).filter(Boolean)[0];
  if (!to) return;

  try {
    const sections = buildResponseSections(members, shared);
    const anyAttending = members.some((m) => m.attending === "Yes");

    let intro;
    if (EMAIL_TONE === "neutral") {
      intro = "Thank you for responding to our RSVP invitation. We hope you are able to attend our celebration. Below is a copy of your responses.";
    } else if (anyAttending) {
      intro = "Thank you for submitting an RSVP to attend our wedding. Below is a copy of your responses. We look forward to seeing you there!";
    } else {
      intro = "Thank you for responding to our RSVP invitation. We are sorry that you are unable to attend, but we appreciate your reply. Below is a copy of your responses.";
    }

    const greeting = "Dear " + joinNames(members.map((m) => m.name)) + ",";
    const contact = "Please contact us if there are any errors, or if you have any questions or concerns. John can be reached at jsoltisd@gmail.com or +1 (248) 996-7989. Christina can be contacted at christina.lindberg@live.com or +1 (425) 273-3517. You can also update your RSVP on the website at any time using the link from the RSVP invitation, or by entering the url " + SITE_URL + "index.html and searching your name. If you use the above url, you will need to enter a password to modify the RSVP. The password to the website is " + RSVP_PASSWORD + ".";
    const signoff = "Christina Lindberg & John Soltis";

    // Plain-text part. Still sent alongside the HTML below, both because
    // some clients prefer it and because it's what any text-only reader
    // falls back to. Rendered from the same sections as the HTML.
    const body = [
      greeting, "", intro, "", renderSectionsText(sections), "",
      contact, "", "Thank you,", signoff,
    ].join("\n");

    const sticker = stickerAttachment();
    const htmlBody = buildConfirmationHtml(greeting, intro, sections, contact, signoff, !!sticker);

    const message = {
      to: to,
      subject: "We've got your RSVP — " + COUPLE_NAMES,
      body: body,
      htmlBody: htmlBody,
    };
    if (sticker) message.inlineImages = { catSticker: sticker };

    MailApp.sendEmail(message);
  } catch (err) {
    console.error("Confirmation email failed: " + err);
  }
}
