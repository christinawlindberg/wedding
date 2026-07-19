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

1. Create a new Google Sheet. Rename the first tab to exactly `RSVPs`.
2. In row 1, add these headers exactly (any order, but exact spelling):
   `Name | Email | Attending | GuestCount | Children | MealChoice | Dietary | SongRequests | Notes | Timestamp`
3. Go to **Extensions > Apps Script**. Delete the placeholder code and paste
   in the contents of `google-apps-script/Code.gs`.
4. Click **Deploy > New deployment**. Choose type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, authorize the script when prompted, and copy the
   **Web app URL** it gives you.
6. Paste that URL into `js/config.js` as `RSVP_ENDPOINT`.

Guests can resubmit the RSVP form any time (e.g. plans change) — it matches
on name + email and updates their existing row instead of duplicating it.

If you ever change the RSVP form's fields, update both `rsvp.html` (the
`name="..."` attributes) and the `switch` statement in `Code.gs` to match.

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
- [ ] Test the full flow yourself: visit the public page, click through to
      a protected page, enter the password, submit an RSVP, confirm it
      shows up in the Google Sheet, then resubmit and confirm it updates
      the same row instead of adding a new one
- [ ] Set an RSVP deadline in `rsvp.html`
