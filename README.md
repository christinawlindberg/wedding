# Wedding Website

A static site: a public info page, plus a small set of password-protected
pages (details, RSVP, our story) for invited guests only. No build step —
open any `.html` file, or push the folder to GitHub Pages.

## Structure

```
index.html         Public: welcome + travel info (hotels, transport, activities)
details.html       Protected: schedule, venue, dress code
rsvp.html          Protected: RSVP form (writes to a Google Sheet)
our-story.html     Protected: your story / family history / customs
                    (split into more pages later if it grows — copy the
                    nav + gate markup from this file into a new .html file)
css/style.css       All styling, colors, fonts — edit variables at the top
js/config.js        Password hash + RSVP endpoint URL — the two things you
                    must set before launch
js/gate.js          Password gate logic (shared by all protected pages)
js/rsvp.js          RSVP form submission logic
admin/generate-hash.html   Tool to generate a new password hash
google-apps-script/Code.gs  Backend script — paste into your Google Sheet
```

## 1. Add your content

Replace bracketed placeholders (`[Partner 1]`, `[Month Day, Year]`, etc.)
throughout the HTML files. Drop photos into `assets/images/` and reference
them — the hero sections in `css/style.css` have a commented example under
`.hero` showing how to swap in a background photo.

## 2. Set the guest password

1. Open `admin/generate-hash.html` in a browser (locally is fine — it runs
   entirely client-side, nothing is sent anywhere).
2. Type the password you want to email to guests, click **Generate hash**.
3. Copy the resulting hash into `js/config.js` as `PASSWORD_HASH`.
4. Delete or don't publish `admin/` if you don't want the tool sitting on
   the live site (optional — it's harmless either way since it doesn't
   expose the password itself).

**Note on security:** this is a client-side gate. It stops search engines
and casual visitors, but the protected pages' HTML is technically
downloadable by anyone who inspects the page source with dev tools. That's
an acceptable tradeoff for a wedding site; don't rely on it for anything
sensitive.

## 3. Connect the RSVP form to a Google Sheet

The RSVP form works off two tabs in one Google Sheet: a guest list you
maintain by hand, and a responses tab the script fills in automatically.

1. Create a new Google Sheet with two tabs:

   **`GuestList`** — one row per person you've invited. You fill this in
   yourself before sending invitations. Header row:
   `PartyID | Name | PlusOneAllowed | ChildrenAllowed`

   `GuestList-example.csv` in this folder has example rows covering every
   case (solo guest, solo guest with a plus-one, solo guest allowed
   children, a couple sharing a last name, a couple with different last
   names). Easiest way to use it: in your Google Sheet, right-click the tab
   bar > **Insert sheet**, name it `GuestList`, then File > **Import** >
   Upload the CSV > Import location: **Replace current sheet**. Delete the
   example rows and replace with your real guest list, keeping the header
   row.
   - `Name` must be exactly what that person would type on the RSVP form.
     Ideally unique across the whole sheet — if two different people share
     a name (e.g. a grandparent and grandchild), it's best to add a middle
     name or Sr./Jr. to one of them so a lookup goes straight to the right
     person. If you leave a duplicate name as-is, it isn't broken: the
     guest is shown both matching parties (labeled by who else is on each
     invitation) and picks which one they are.
   - `PartyID`: leave **blank** for a solo invitation. For a **shared
     invitation** (a couple, or a larger family group under one invite),
     give all their rows the same `PartyID` (any string, e.g. `smith`).
     They'll then be matched together whether a guest types any one
     person's name, or — for a two-person party — the combined form
     (`John Smith & Jane Smith`, or `John & Jane Smith` if they share a
     last name; larger groups are matched by individual name only, not a
     combined form).
   - `PlusOneAllowed` / `ChildrenAllowed`: TRUE or FALSE (checkbox columns
     work well). Only guests marked TRUE will see that option — most people
     should be FALSE/FALSE if their invite is just for themselves (and any
     children/plus-ones are already implied, not optional). For a shared
     invitation, set these on any one row — any TRUE is enough; they're
     shared across the whole party, not per-person.

   **`RSVPs`** — where submitted responses land. You don't need to add rows
   here, just create the tab with the header row:
   `PartyID | Name | Email | Attending | Dietary | DeclineNote | PlusOne | PlusOneName | Children | SongRequests | Notes | Timestamp`

2. Go to **Extensions > Apps Script**. Delete the placeholder code and paste
   in the contents of `google-apps-script/Code.gs`.
3. Click **Deploy > New deployment**. Choose type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, authorize the script when prompted, and copy the
   **Web app URL** it gives you.
5. Paste that URL into `js/config.js` as `RSVP_ENDPOINT`.

**How it works:** a guest types their name and the site looks it up against
`GuestList`. If there's no match, they see a message to check spelling or
email you — this keeps the guest count controlled since only names you've
entered can RSVP. If matched to a shared invitation (couple or family), the
form shows one block per person — each confirms their own attendance and
dietary needs independently (so it's fine if some are coming and others
aren't) — plus a shared section (plus-one, children, song requests) that
only shows fields that party's row allows. Resubmitting later (e.g. plans
change) re-matches by name and pre-fills what was already answered,
updating the existing row(s) in `RSVPs` instead of creating new ones.

If you ever change the RSVP form's fields, update `rsvp.html`, `js/rsvp.js`,
and both `doGet`/`doPost` in `Code.gs` to match.

## 4. Host it — christinawlindberg.github.io/wedding/

`christinawlindberg.github.io` currently has no custom domain attached, so a
true subdomain (`wedding.yourdomain.com`) isn't available without buying a
domain first. Instead this site is hosted as a path under the existing
GitHub Pages account:

**Final URL: `https://christinawlindberg.github.io/wedding/`**

Steps:

1. Create a new **public** GitHub repository named exactly `wedding` under
   the `christinawlindberg` account (repo name becomes the URL path).
2. Push this folder's contents to that repo's `main` branch.
3. In the repo's Settings > Pages, set source to the `main` branch, root
   folder. GitHub will serve it at the URL above within a minute or two.

All links in this site use relative paths (`css/style.css`, `js/config.js`,
etc.), so it works correctly whether it's served from the domain root or
from a `/wedding/` subpath — no path rewriting needed.

If you later decide to buy a domain, moving to a real subdomain
(`wedding.yourdomain.com`) just means adding a `CNAME` file to this repo and
a CNAME DNS record at your registrar — ask if you want help with that then.

## 5. Before sending invitations

- [ ] Replace all placeholder text and images
- [ ] Set the real password in `js/config.js` (and remember to actually
      tell guests what it is, e.g. in the invitation email)
- [ ] Set `RSVP_ENDPOINT` in `js/config.js`
- [ ] Fill in `GuestList` with everyone you're inviting before sending
      invitations — anyone not on it can't RSVP
- [ ] Test the full flow yourself: visit the public page, click through to
      a protected page, enter the password, look yourself up on the RSVP
      page (add yourself to `GuestList` first), submit, confirm it shows up
      in `RSVPs`, then look yourself up again and confirm your answers are
      pre-filled and resubmitting updates the same row
- [ ] Also test looking up a name that isn't in `GuestList` — confirm you
      get the "couldn't find that name" message
- [ ] Set an RSVP deadline in `rsvp.html`
