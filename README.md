# Wedding Website

A static, six-page site for John & Christina's wedding. Five pages are
public (Home, Schedule, About, Travel, Explore); the RSVP page is password
protected. No build step — open any `.html` file, or push the folder to
GitHub Pages.

## Structure

```
index.html         Home: hero photo + how we met
schedule.html      Friday/Saturday/Sunday events, with Map + Add-to-calendar
about.html         Why Bornholm, the church, the venue, Danish traditions
travel.html        Getting to Bornholm & Snogebæk, where to stay
explore.html       Local food & experiences
rsvp.html          Protected: RSVP form (writes to a Google Sheet)
css/style.css      All styling — edit the variables at the top (accent, etc.)
js/config.js       Password hash, RSVP endpoint, contact email, deadline —
                   the values you must set before launch
js/site.js         Fills the contact address + RSVP deadline from config.js
js/gate.js         Password gate logic (used only by rsvp.html now)
js/rsvp.js         RSVP form submission logic
assets/images/home-hero.jpg  The Home hero background photo
admin/generate-hash.html     Tool to generate a new password hash
google-apps-script/Code.gs   Backend script — paste into your Google Sheet
```

The type is the device's own system sans-serif — nothing to download, no
third-party font dependency. Colors (including the Baltic-blue accent) are
CSS variables at the top of `css/style.css`.

**Only `rsvp.html` is gated** now; the other pages are public (all pages
are `noindex` so they stay out of search results). To gate another page,
copy the `#gate` block and the `data-protected-content` wrapper from
`rsvp.html` and add `js/gate.js` to that page's scripts.

## 1. Finish the content

The pages are filled in with real copy. A few spots still need you:
- **Home hero photo** — swap `assets/images/home-hero.jpg` for a different
  shot if you like (the CSS points `.hero-photo` at that path).
- **Schedule** — the Friday event says "Location to be announced," and the
  Saturday ceremony/dinner show "Afternoon"/"Evening"; add specifics when
  you have them.
- **A Bornholm map** on the Travel page, if you want one.
- Set `CONTACT_EMAIL` and `RSVP_DEADLINE_TEXT` in `js/config.js` (until
  then the footer email shows as plain text, not a link).

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
   - `Name` must be exactly what that person would type on the RSVP form,
     and should be **unique across the whole sheet**. If two different
     people share a name (e.g. a grandparent and grandchild), add a middle
     name or Sr./Jr. to one of them.

     Duplicates aren't silently broken, but they do degrade. If the two
     matching invitations have *different* other members on them (say two
     "John Smith"s, one invited alone and one with a partner), the guest is
     shown both, labeled by who else is on each, and picks. If the two are
     indistinguishable — two John Smiths each invited alone — the site
     won't ask the guest to flip a coin, because a wrong guess would
     overwrite the other person's answers. It tells them to email you
     instead, and you add them to the sheet by hand.
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
   `PartyID | PartyKey | Name | Email | Attending | Dietary | Buffet | DeclineNote | PlusOne | PlusOneName | PlusOneDietary | PlusOneLunch | Children | SongRequests | Notes | Timestamp | FirstResponded | SubmissionID`

   The last few are bookkeeping columns you can ignore when reading the
   sheet — but they do need to exist, since the script matches columns by
   header name:
   - `PartyKey` — which invitation the row belongs to. This is what keeps
     two guests who happen to share a name from overwriting each other.
   - `Timestamp` — when the row was last written.
   - `FirstResponded` — when they *first* replied, preserved across edits,
     so you can still see who has changed their answer since.
   - `SubmissionID` — a one-off id the site reads back to confirm the write
     actually landed before telling the guest it worked.

2. Go to **Extensions > Apps Script**. Delete the placeholder code and paste
   in the contents of `google-apps-script/Code.gs`. Fill in the constants at
   the top: `COUPLE_NAMES`, `CONTACT_EMAIL`, and `RSVP_DEADLINE` (leave the
   deadline `""` to accept responses indefinitely).
3. Click **Deploy > New deployment**. Choose type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, authorize the script when prompted, and copy the
   **Web app URL** it gives you. Authorizing includes permission to send
   mail as you — that's the confirmation email guests get after they RSVP
   (set `SEND_CONFIRMATION_EMAILS = false` in `Code.gs` if you'd rather not).
5. Paste that URL into `js/config.js` as `RSVP_ENDPOINT`.

**Whenever you edit `Code.gs` afterwards**, saving is not enough — the live
web app keeps serving the old version until you go to **Deploy > Manage
deployments**, click the pencil icon, and set **Version: New version**.

**A note on `SHARED_TOKEN`:** `Code.gs` and `js/config.js` each carry a
matching token, and the endpoint ignores requests without it. This is not
real security — the token ships inside the site's JavaScript, where anyone
can read it. It exists because a lookup response includes guests' email
addresses, and this keeps crawlers and idle URL-pokers from getting one.
Change both copies together if you ever want to rotate it.

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

Once submitted, the site reads the response back out of the sheet before it
tells the guest anything — so "Thank you" means the row is really there,
not just that the request was sent. It then shows a summary of what was
recorded, and `Code.gs` emails the party a copy.

If you ever change the RSVP form's fields, update `rsvp.html`, `js/rsvp.js`,
and both `doGet`/`doPost` in `Code.gs` to match.

**Prefilled invitation links:** the RSVP page accepts a `?name=` URL
parameter that skips the lookup step entirely — useful when you send out
invitations, since guests won't have to guess how much of their name we're
expecting (middle names, etc.). Build one by URL-encoding the exact `Name`
value from `GuestList` (or, for a couple, the `"First & First Last"` form)
and appending it, e.g.:

```
https://christinawlindberg.github.io/wedding/rsvp.html?name=Jane%20Smith
https://christinawlindberg.github.io/wedding/rsvp.html?name=John%20%26%20Jane%20Smith
```

If you want a full batch of these generated from your guest list when
you're ready to send invitations, just ask.

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
- [ ] Set `RSVP_ENDPOINT` and `CONTACT_EMAIL` in `js/config.js`
- [ ] Set the deadline in **both** places: `RSVP_DEADLINE_TEXT` in
      `js/config.js` (what guests see) and `RSVP_DEADLINE` in `Code.gs`
      (what's actually enforced)
- [ ] Fill in `COUPLE_NAMES`, `CONTACT_EMAIL` and `SITE_URL` in `Code.gs` —
      they appear in the confirmation email guests receive
- [ ] Add an `og:image` to `index.html` once you have a photo, so the link
      previews with an image when guests forward it
- [ ] Fill in `GuestList` with everyone you're inviting before sending
      invitations — anyone not on it can't RSVP
- [ ] Test the full flow yourself: visit the public page, click through to
      a protected page, enter the password, look yourself up on the RSVP
      page (add yourself to `GuestList` first), submit, confirm you get the
      summary *and* the confirmation email, confirm it shows up in `RSVPs`,
      then look yourself up again and confirm your answers are pre-filled
      and resubmitting updates the same row
- [ ] Also test looking up a name that isn't in `GuestList` — confirm you
      get the "couldn't find that name" message
- [ ] Test declining: accept first with dietary needs and the Sunday lunch
      box ticked, submit, then change to decline and resubmit — the sheet
      should clear those, not keep counting you for lunch
- [ ] Once the deadline has been set and passed, confirm the form refuses
      new responses (temporarily set `RSVP_DEADLINE` to yesterday to check)
