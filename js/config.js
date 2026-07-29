// Site-wide configuration — the handful of things you must set before
// launch. Loaded by every page.
//
// PASSWORD_HASH: the SHA-256 hash of the guest password (never store the
// plain password here). Use admin/generate-hash.html to create a new hash
// when you change the password, then paste it below.
//
// Current password: "tbd" — placeholder until you decide on the real one.
// CHANGE THIS before sending invitations (use admin/generate-hash.html).
const SITE_CONFIG = {
  PASSWORD_HASH: "41ae616098dc844be79a547862902f30e586a2600f33556900af1918a09c58cf",

  RSVP_ENDPOINT: "https://script.google.com/macros/s/AKfycbxThrMslP0nKUznid1lN4zrCDv_SuoAHb-X30i8ktl1gVqI1CKv2y_yPy6IhaHuJVXFsA/exec",

  // Must match SHARED_TOKEN in google-apps-script/Code.gs. This isn't real
  // security — it ships in this file, which anyone can read. It just stops
  // crawlers and idle URL-pokers from getting a response, which matters
  // because a lookup returns guests' email addresses.
  SHARED_TOKEN: "XkOmJY8lN8TLXSswhpfgKVlI",

  // Filled into the footer of every page as a mailto: link, and into the
  // RSVP page's error messages.
  CONTACT_EMAIL: "[email address]",

  // Shown on the RSVP page ("Please respond by …"). The date that's
  // actually *enforced* is RSVP_DEADLINE in Code.gs — set both, and keep
  // them in agreement.
  RSVP_DEADLINE_TEXT: "February 4, 2027",
};
