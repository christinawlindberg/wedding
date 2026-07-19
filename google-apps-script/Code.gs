// Paste this into a Google Sheet's Extensions > Apps Script editor.
// See ../README.md for full setup and deployment instructions.
//
// This spreadsheet needs two tabs:
//
// 1. "GuestList" — one row per invited person, header row:
//      PartyID | Name | PlusOneAllowed | ChildrenAllowed
//    - Leave PartyID blank for a solo invitation.
//    - For a couple you're treating as one invitation, give both of their
//      rows the SAME PartyID (any string, e.g. "smith"). They'll then be
//      matched together whether a guest types either person's name or the
//      combined "John & Jane Smith" form. Only 2-person parties (couples)
//      are supported, not larger groups.
//    - PlusOneAllowed / ChildrenAllowed: TRUE or FALSE (checkbox columns
//      work well). For a couple, set on either row — either being TRUE is
//      enough. These are party-level: a couple invited jointly still
//      confirms attendance and dietary needs individually below, but
//      shares one plus-one/children answer.
//
// 2. "RSVPs" — where submitted responses land, header row:
//      PartyID | Name | Email | Attending | Dietary | PlusOne | PlusOneName | Children | SongRequests | Notes | Timestamp
//    You don't need to create rows here yourself — doPost fills them in,
//    one row per person (so a couple's joint RSVP still produces two rows,
//    sharing PartyID and the PlusOne/Children/etc. columns).
//
// Matching is done on Name (case-insensitive, trimmed). Guests look
// themselves up by name; resubmitting later updates their existing row(s)
// in RSVPs rather than duplicating them.

const GUEST_LIST_SHEET = "GuestList";
const RSVP_SHEET = "RSVPs";

function normalizeName(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function sheetAsObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  const header = values[0];
  return values.slice(1).map((row) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function isTrue(value) {
  return value === true || value === "TRUE";
}

// Builds the name forms a guest might type to reach a 2-person party
// jointly: "John Smith & Jane Doe" (either order), and if they share a
// last name, the shorthand "John & Jane Smith" (either order).
function jointNameCandidates(nameA, nameB) {
  const candidates = [`${nameA} & ${nameB}`, `${nameB} & ${nameA}`];

  const partsA = nameA.trim().split(/\s+/);
  const partsB = nameB.trim().split(/\s+/);
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

function groupGuestList(guestList) {
  const groups = {};
  guestList.forEach((row, i) => {
    const partyId = String(row["PartyID"] || "").trim();
    const key = partyId || `__solo_${i}`;
    if (!groups[key]) groups[key] = { partyId: partyId, rows: [] };
    groups[key].rows.push(row);
  });
  return Object.values(groups);
}

function findMatchingParty(guestList, typedName) {
  const groups = groupGuestList(guestList);

  const direct = groups.find((g) => g.rows.some((row) => normalizeName(row["Name"]) === typedName));
  if (direct) return direct;

  return groups.find((g) => {
    if (g.rows.length !== 2) return false;
    const candidates = jointNameCandidates(g.rows[0]["Name"], g.rows[1]["Name"]);
    return candidates.some((c) => normalizeName(c) === typedName);
  }) || null;
}

// GET requests are guest lookups, served as JSONP since Apps Script web app
// responses aren't reliably readable via cross-origin fetch() from a static
// site. See js/rsvp.js for the client side of this.
function doGet(e) {
  const callback = e.parameter.callback;
  const typedName = normalizeName(e.parameter.name);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const guestList = sheetAsObjects(ss.getSheetByName(GUEST_LIST_SHEET));
  const rsvps = sheetAsObjects(ss.getSheetByName(RSVP_SHEET));

  const party = findMatchingParty(guestList, typedName);

  let result;
  if (!party) {
    result = { found: false };
  } else {
    const plusOneAllowed = party.rows.some((row) => isTrue(row["PlusOneAllowed"]));
    const childrenAllowed = party.rows.some((row) => isTrue(row["ChildrenAllowed"]));

    const members = party.rows.map((row) => {
      const existingRow = rsvps.find((r) => normalizeName(r["Name"]) === normalizeName(row["Name"]));
      return {
        name: row["Name"],
        existing: existingRow ? {
          email: existingRow["Email"],
          attending: existingRow["Attending"],
          dietary: existingRow["Dietary"],
        } : null,
      };
    });

    const sharedSourceRow = rsvps.find((r) =>
      party.rows.some((row) => normalizeName(row["Name"]) === normalizeName(r["Name"]))
    );

    result = {
      found: true,
      partyId: party.partyId,
      plusOneAllowed: plusOneAllowed,
      childrenAllowed: childrenAllowed,
      members: members,
      existingShared: sharedSourceRow ? {
        plusOne: sharedSourceRow["PlusOne"],
        plusOneName: sharedSourceRow["PlusOneName"],
        children: sharedSourceRow["Children"],
        songRequests: sharedSourceRow["SongRequests"],
        notes: sharedSourceRow["Notes"],
      } : null,
    };
  }

  const body = callback
    ? callback + "(" + JSON.stringify(result) + ")"
    : JSON.stringify(result);

  return ContentService
    .createTextOutput(body)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RSVP_SHEET);
  const data = e.parameter;

  const values = sheet.getDataRange().getValues();
  const header = values[0];
  const col = {};
  header.forEach((h, i) => { col[h] = i; });

  const shared = {
    PlusOne: data.plusOne || "No",
    PlusOneName: data.plusOneName || "",
    Children: data.children || "",
    SongRequests: data.songRequests || "",
    Notes: data.notes || "",
  };

  const members = [];
  if (data.member1_name) {
    members.push({ name: data.member1_name, email: data.member1_email, attending: data.member1_attending, dietary: data.member1_dietary });
  }
  if (data.member2_name) {
    members.push({ name: data.member2_name, email: data.member2_email, attending: data.member2_attending, dietary: data.member2_dietary });
  }

  members.forEach((member) => {
    const normalized = normalizeName(member.name);
    let targetRow = -1;
    for (let i = 1; i < values.length; i++) {
      if (normalizeName(values[i][col["Name"]]) === normalized) {
        targetRow = i + 1; // 1-indexed sheet row
        break;
      }
    }

    const rowData = header.map((h) => {
      switch (h) {
        case "PartyID": return data.partyId || "";
        case "Name": return member.name;
        case "Email": return member.email || "";
        case "Attending": return member.attending || "";
        case "Dietary": return member.dietary || "";
        case "PlusOne": return shared.PlusOne;
        case "PlusOneName": return shared.PlusOneName;
        case "Children": return shared.Children;
        case "SongRequests": return shared.SongRequests;
        case "Notes": return shared.Notes;
        case "Timestamp": return new Date();
        default: return "";
      }
    });

    if (targetRow > 0) {
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
  });

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
