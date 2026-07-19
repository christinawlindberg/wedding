// Paste this into a Google Sheet's Extensions > Apps Script editor.
// See ../README.md for full setup and deployment instructions.
//
// Sheet must have a header row (row 1) with exactly these column names,
// in any order:
//   Name | Email | Attending | GuestCount | ChildrenCount | MealChoice | Dietary | SongRequests | Notes | Timestamp

const SHEET_NAME = "RSVPs";

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = e.parameter;

  const name = (data.name || "").trim();
  const email = (data.email || "").trim().toLowerCase();

  const values = sheet.getDataRange().getValues();
  const header = values[0];
  const col = {};
  header.forEach((h, i) => { col[h] = i; });

  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    const rowName = String(values[i][col["Name"]] || "").trim().toLowerCase();
    const rowEmail = String(values[i][col["Email"]] || "").trim().toLowerCase();
    if (rowName === name.toLowerCase() && rowEmail === email) {
      targetRow = i + 1; // 1-indexed sheet row
      break;
    }
  }

  const rowData = header.map((h) => {
    switch (h) {
      case "Name": return name;
      case "Email": return data.email || "";
      case "Attending": return data.attending || "";
      case "GuestCount": return data.guestCount || "";
      case "ChildrenCount": return data.childrenCount || "";
      case "MealChoice": return data.mealChoice || "";
      case "Dietary": return data.dietary || "";
      case "SongRequests": return data.songRequests || "";
      case "Notes": return data.notes || "";
      case "Timestamp": return new Date();
      default: return "";
    }
  });

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
