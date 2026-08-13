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

// Sticker shown at the bottom of the confirmation email, as base64 PNG.
//
// It's baked in here rather than fetched from the site so sending doesn't
// depend on the website being reachable, and so no network call happens
// while the submission lock is held. It's attached to the message inline
// (cid:) rather than written into the HTML as a data: URI, because Gmail
// and Outlook both strip data: URI images — cid: is what actually renders
// everywhere. Set to "" to drop the sticker entirely.
//
// To swap the picture: base64-encode a PNG (`base64 -i file.png`) and
// paste it below. Keep it small — it ships with every confirmation. This
// one is 380px wide, ~47KB, displayed at 190px.
const CONFIRMATION_STICKER_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAXwAAAFfCAMAAAB6AYdgAAADAFBMVEWaWi1ZLBrWnWWfXjXSkmOeXTIvGxLQk16cWy7XlWRZ" +
  "JRibZUwlFBJzVTBfVVRdMx9RLRqZak+yi2cmGhmeaUy6nGjero/lsY8rHRa0iGFxUTSXaVLnq47+26THclnbpo/4eQ9sWE+y" +
  "i21leYpuTTOkk5ieOSrJfVw4RVHEazzxyaja0NmhkpV4UTKGPSAnOUWEPR7HZDrg2umVipOEi5SuruJyTkGDKizcvcD/0HLv" +
  "0t98kqLMZkSff5/AaTm4scb0waX3yqf/AP+4gT4A/wCxxNN9U0MAAADTl2rIh1a1d0yUVjDlqHOrZjjpt4zZpHSrakWKSifJ" +
  "i2XDe0zVqIsJBQjux6ukWzDvxJa6g1dyNxjTk1x2RSnqs3rlqoi3h2mZYjkvFxNQJxdtOiWKRhu2cjyYZkfinGry1LLatI/W" +
  "t6nOmobnuaZnKxJVNSfu2Mm7k3ODPBhJGw+QW0N6Qhw4IhlMKyKve2UZEhO6l4fbxLH1488oCwl6UjXMqqT/f39YMhv/AACq" +
  "VVX///+XUxw2JyN/fwD//wCqqlWFPCXqzMR/f3//qlXLeWWaclDinIWoXEhVAAB/AAB1V0XJa1VVVFR9Pjz/qqrBdD4IAwQI" +
  "BAbcsXyyjILcwpo3AQBVVQDbycMKBQZZQzOzdk28f3yyd0uNVDPOl2y6fTw/PwK8o5GqqqqveEvSl2nRmGiqd1Kyd080GxXj" +
  "pG0SGiRlLCP//3/mpXDrt4yreU734bYqFhHQl2tSOCjy0Z0SCAmxeEq6kltqRiycd2flqHRzRzDNjYGoaDdySCyhTS7kpXLm" +
  "rqHol3LlmW2VZklTNCfZpGkaJC11ZFOqVQAsFhQzMzCMVzLx5+E+PTwMBwfnmW7kl27Nl2q2imuVaU/lp3HkpG7EhVFIJhaz" +
  "hFSROQ+4hVGSZUVROShMNyrLlWvklXBqOyXut4yTWDFRNScwFAhtRjQsFxDYpnTZpnNJJxTapGpzSCt0UzGmS0MyGRKnWDPl" +
  "mW/TmmeLVTa0hVW3hFPmpncHx/5vAAABAHRSTlMcHxmiomMfY9rm5uOkGfhgpV7Y4yAXZqNbm1yeHA3k0wIYZ/+big0T///e" +
  "jHHKaf+ssmov/w9b//8FF/9LCFVsR4kBnAH/sQD+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+//7+/v7+/v7+/v7+/v7+" +
  "/v7+/v/+/v///v7+Av4BAwH//gIBA/7/AgP+/v7/AwL+/wMFA/8vbv///wgD/1D/zgVurXEGBP8DLw/RsI9Lrv//AlLOFf/Q" +
  "KnD/0Ez+cP8vjf8vTv/Q/xLQkM6y//8DkP+W/waML0ySjzF0j9jPVA6yrS1MR5axFGqSLtBuN1BzyrEW/7ZObqtSbCwUDUW5" +
  "WgAAs6tJREFUeNrt/Qd8XPl1Joiig9RJOVqWwziMJ+zOzO57G97uvvzebt37v3VzEYVbdVFVqHABECgQiQBJEQxNstnsQHWr" +
  "FdpqSbYlK46yZEuWZEm2Jcs5jHPOHuccZhz3fN/531sFdqvVgd2k+OtqNkiAJAic//+e851zvvOdmdplfL3kZ37nHX9wwyu/" +
  "vVa7vfbM60u/Zi7j5/q6txmTGJPe8sLrarU7nrHt02j819SuK5IkcfD/i174zOV/uo3vJYkrP+T/5JW/+4xtn0bj3137lSK5" +
  "N0ocB9ffiT5Xq73+Gfs+Tca/s/Z2uhy8oft5Za125hkDPy3GP1277m0OPX7qpqkYv+G84iXPeP6nx/h31K6L5NanJqX9XXkE" +
  "GiuvfMszFn46jH977fm7vPmp/Cc/ubj9K8WnnsGcT4vx/yGx7h6Ov+MI8HFWOt3P1W5/zTNmfoqN/67aCx1reIAdR/9fCVZ+" +
  "tFZ73TN2fmqN//+97m2dJK3MX75WGs4rn/2M63lqjX977d/f21HLO4v2Z/7faHSf95+fsf5TbPw/cjosLjjJYnn/+VOjkRTP" +
  "lxTsmddTZvx31d7e6cilJ+BRf9NZofmdTifJ/+TMM1H3qTP+G2o3Bh118zT+SqfT6HSIeTrieb6y9txnbP1UGf907be+Rmzd" +
  "WVzk5Xc6QdBYcVZWVnAajTD42pc843ieMuPfKUBTLv6rX70o5hdH0wkaTqPjrJSgJ7ixdub0M9Z+aox/j7p8Mb/zajwBjQbf" +
  "yEtRTyP45dq3P2Ptp9L4r16Ruy+3vtMIApi+o8ZXP/T1z1j/KTP+BzsdCbKv7oj1VxtBAx5fjO+o3xfrB40X1v7jM/Z+anz+" +
  "B2F5voIGom1DjC+Gx/23jqfxK7WTV883fvr06WvF+LfXfnSlNH6ns2p9TqB+v6PlhuBFz62dvzosf/5OvD15z7Vy839UbKyW" +
  "X5U3uPGN1dXAOn1i/0bwiqsBb97xrjvxAP4v7/pfrnin7TIZ/z/WfrkRrLy6Mn7Q+KHVWXkAxOGL928g25KYu/z1Z953ha/8" +
  "7bztL73xlvff8v4P/8UVtv5lM/6/PKjGD/BaXZ29a3a1Qbs3FOyjyDP78tqVvftoan7/TTfe+P56vY6v89eubBS6jMZf7Vjj" +
  "d1bvOnTXKjBPBfXV+p3gFVeyyiCGnvnMTa4zH9TxhXacev07T99zLRj/vz24asFOsDp76JDc+yCYgvpw+6H8ZvGVp69Qa+Xk" +
  "7bXfetavO/VOPZB7X5evqO7Uf6l25zVjfPHrYmDafnV2dlXcz6rmW44TIuiGQeO2K+N47pAb/plfR80pgOHrzuIij+CTV9IP" +
  "zlyuJ/r/ekKMv4ibL2Y/NCumX17FKyDipOen9Z1fuQKZ7mlx9u+90Qnkywo69enXO2v3fNkbX2DD15ZuR4Itrv4yrj5dvhg+" +
  "sW5fbt77v/1pz3RPIsyq6dX2i5Xxb7ySfucyGf9uvfm0PV0+rn6DaF9cv1baWF3urCLXeloR3h0na9d9xu3M0fQEYx3+3MEZ" +
  "fPhK4p3L5/NPBOXFn529665DsweX+cvV1eVlWL+zov2tYNXp/mjt/NOX24tP/8wt1uMoGpsrT0Cs/+ErCfUvH9Q8yu9tNQgQ" +
  "bO86tKqWX10m2lxZ6TRCev0G4vIrayefLuu/qzbz245EoaVZ1Jys4fUF4994Tdz8f3lUL75kuLD9XauzanwAHov2GyCyhcGq" +
  "QM5X1N7w9Fz7M7XvT3DrZ2Ft/DxXmb8D9//3te/4sjf+/1j7f53oBLa2I8a/a2J6AZsE+7S/OP7ObBAGyy98Or7pu++sveU3" +
  "nbmlpdLbw/iBHgRD76IA/S9/tHOm9j9+bWeCdmB8e+Eby/jGxfAo88jtbzjBXOgE61/3lAPs8+8SfPmiRnnt9TU3Nzc7V158" +
  "AfufvAbcjmD3l62WBWW99Adp+eVAj0BbWw7v/mzghI0XPbXf9WlUjf/pFRZfVi8xPIw/x4eULv9KltYuH2nq5Z1Xv9qWNVcP" +
  "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" +
  "TLDcQA0vMxqJ8SNzEePHBsoQo4yZU8+O6Yp7A8twL98WO2NVhJj+r//gc597/vc8/3u+5y+f/w/Pesl777F9jdq1Zvz7L9cn" +
  "+ofPveMdb3tbKeeqgzJQ9uxxbVGvaEHtC2eSGQ/wUZUUT3E2HdrV2xCXvfnmv37HX3/uYVjyzpN331GrXXvGvzwn+DqL/+6Y" +
  "ecfNhcdZSw/pre5sMReRXKOzZpCy9uRUelryyFmqOLxGN+P9u++xpMnT97/u9m953be8/ufe/XOXoRl+jRufXuH280w8v+65" +
  "1/3Nc5973XO/cEPhoWiELVFw7lQjwWMggbcHz4/SjVKdzyEdv/V7roPpz5+/4/Y7rvx382VmfFv4njLcc6+77h++8A8v/KM/" +
  "+srvEe/9jd/4O7flMeSVemBd3XDDz7zwhc//y0996s/+7Ns+9KEP/e7v/j9qT0PJ5to2vriM06+5Q17f8p8e/ltvef7zf+Yd" +
  "f/2O3/ncj/7R3zz8d193x1X0XXyZGn/ykhO4/fWvf+7r+Xr36/f77vO3y++9+93v/rm3yOv++7/lNVfX1/5/AnW11pST3n36" +
  "AAAAAElFTkSuQmCC";

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

// Decodes the sticker for inline (cid:) embedding. Deliberately isolated
// and non-fatal: a decorative picture must never cost a guest their
// confirmation email, so any failure just returns null and the message goes
// out without it.
function stickerAttachment() {
  if (!CONFIRMATION_STICKER_B64) return null;
  try {
    const bytes = Utilities.base64Decode(CONFIRMATION_STICKER_B64);
    return Utilities.newBlob(bytes, "image/png", "catSticker");
  } catch (err) {
    console.error("Sticker decode failed: " + err);
    return null;
  }
}

// ---- confirmation email styling ----
// Loosely a printed dinner-menu card: cream stock, deep green ink, a
// pinstriped border framing a ruled panel. Everything is inlined and
// table-based because that's the subset of HTML/CSS email clients agree
// on — see buildConfirmationHtml for what degrades where.
// Warm palette pulled from the sticker's ginger coat: light golden stock,
// burnt-orange rules and headings, soft brown body copy. Kept dark enough
// to stay legible — a literal orange on cream fails contrast at body size.
const MAIL_PAGE_BG = "#f6e7cd";   // outside the card, warm sand
const MAIL_CARD_BG = "#fffaf1";   // the card stock itself
const MAIL_INK = "#b26424";       // burnt orange, headings + rules
const MAIL_BODY_INK = "#6d5236";  // warm brown, for body copy
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
      // Friday before Sunday — the weekend in order.
      const bach = bachEventLabel(m.bachEvent);
      if (bach) items.push("Friday event: " + bach);
      if (m.buffet === "Yes") items.push("Coming to the Sunday lunch");
    }
    sections.push({ title: m.name, items: items });
  });

  if (shared.PlusOne === "Yes") {
    const items = [shared.PlusOneName || "(name to come)"];
    if (shared.PlusOneDietary) items.push("Dietary: " + shared.PlusOneDietary);
    const plusOneBach = bachEventLabel(shared.PlusOneBachEvent);
    if (plusOneBach) items.push("Friday event: " + plusOneBach);
    if (shared.PlusOneLunch === "Yes") items.push("Coming to the Sunday lunch");
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
    ? '<div style="margin:30px 0 0;"><img src="cid:catSticker" alt="" width="190" ' +
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
          '<div style="margin:2px 0 30px;font-family:' + MAIL_SERIF + ';font-style:italic;' +
          "font-size:40px;line-height:1.2;color:" + MAIL_INK + ';">Confirmed</div>' +

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

          stickerHtml +

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
