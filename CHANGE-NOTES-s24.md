# s24 (build 2026-10-29s24): League site, Bets tab

Base: live s23 (/workspace/fantasy-bball). League-owned files only; Draft Room untouched.

## 1. Edit a pending bet
- A bet you placed that nobody has answered yet now has a **✏️ Edit** button next to Withdraw.
- Edit writes the normal withdraw event (`w`) into your own log, then opens the New bet form filled with the old bet: opponent (or Anyone), text, pushups (custom number kept), odds (custom odds kept). A note says which bet it came from. Nothing new is saved until Place bet and Yes, place it.
- If the other side answered first, the withdraw does not count and the page says "Too late to edit".

## 2. Fix result (two-sided)
- A settled bet (including one that settled by itself after 2 days) has a **✏️ Fix result** button for its two sides only.
- New events, each written only into the writer's own log `fbn1-<id>-bets-<mid>`:
  - `fr` fix request `{id, fx, r}` (r = b / o / p, must differ from the current result)
  - `fc` fix confirm `{id, fx}`: counts only from the side that did NOT ask
  - `fd` `{id, fx}`: from the asker = withdraw, from the other side = decline
- The result and the pushup totals change only after a confirm. One side alone never changes them; events from anyone else (watchers, other managers, forged entries) are ignored.
- Conflicts: one active request at a time. A newer request from the same side replaces the older (confirming the old one then does nothing). If the other side asks for the same correction it counts as agreement; a different correction replaces the first and must be confirmed by the first side. Repeated events (same event id) count once. Fix events before the bet is settled are ignored.
- The card shows a "Result changes" history: who asked, original → corrected result, confirmed / declined / withdrawn / replaced, who answered, and times. A confirmed correction is marked "Corrected". Totals always come from the latest confirmed result.

## 3. Small screens
- Below 380px wide the opponent chips wrap to 4 per row and the pushup buttons to 3 per row (they were 37px wide at 320 and 42px at 360). Every tap target is now at least 44px at 320 / 360 / 390 / 1280.

## Tests
- New: `node tests/e2e_bets_s24.js` (APP / API env, mock store): Edit, two-sided Fix result, forged events, conflict / duplicate rules, widths 320 / 360 / 390 / 1280, wording.

## 4. Totals box closed (follow-up)
- The "Net pushups per manager" box (`#b27Board`) was never closed (since s22), so the open-bets note and every bet card were drawn inside it. It is now closed; cards sit below it. `tests/e2e_bets_s24.js` asserts no card is inside the box (the old workaround in the test was removed).
- README.md has an s24 section.

## 5. Tab URLs, deep links, copy / share links (addition)
- Every League site tab has its own hash: `league.html?l=CODE#standings`, `#games`, `#rosters`, `#bets`, `#teams`, `#postseason`, `#redraft`, `#archive`, `#rules` (old aliases still work: `#power`, `#standings/tournament`; new alias `#schedule` = Games). Refresh stays on the tab.
- Tapping a tab uses `pushState`, so Back / Forward move between tabs; `popstate` and `hashchange` are both handled. The first load uses `replaceState` once to clean the address bar.
- Deep links: `#bets/<betId>` and `#games/<gameId>` open the tab, scroll the card into view and highlight it for about 2.6 s. For a game the Games filters are reset so the card is visible (Scores vs Upcoming, owner, day, owner-vs-owner). A missing bet or game shows the tab and a short "not found" note.
- A "🔗 Copy link" button (reads "Share" where the device has a share sheet) above every tab, and a 🔗 button on every bet card and game card. No share sheet: the link goes to the clipboard with a "Link copied" toast (textarea copy as fallback, else the toast shows the link). All are at least 44px.
- Privacy: every URL this page writes and every shared or copied link is built only from origin + path + `?l=CODE` (+ `&demo=1` in the demo) + the route hash. A manager link fragment (`#as=…&k=…`), `#cm=…` or any other query value is never copied, shared or written back; opening such a link cleans the address bar (e.g. `?l=CODE&watch=1#bets&as=…&k=…` becomes `?l=CODE#bets`).
- Plain `league.html?l=CODE` with no hash still opens Standings and is not rewritten with a hash, so the draft room / recap links and their tests are unchanged.
- If a reload arrives without a hash, the page falls back to the last tab of this browser tab (sessionStorage `fbn.ltab.<league>`, only on a reload).
- Test: `node tests/e2e_deeplink_s24.js`.

## 6. Tabs are real links (addition)
- Each League site tab is now an `<a class="tb" href="league.html?l=CODE#<tab>">` (`&demo=1` added only in the demo); never a manager id, k=, as= or cm=.
- A plain left click (no modifier) is handled in place: default prevented, tab switched with `pushState`, same as before. Ctrl / Cmd / Shift / Alt-click, middle-click and right-click "Open in new tab / window" are left to the browser, which opens the link; a new tab lands on that tab. Enter on a focused tab works (native link activation).
- Active tab keeps `.on` + `aria-current="page"`. The CSS duplicates every `nav button` rule for `nav a.tb`, so size, colours and positions are unchanged (measured against live s23 at 320 / 360 / 390 / 1280: same x, width, height, colours, font size for every item in the tab row).
- Per-card 🔗 buttons stay buttons: they copy or share a link, they do not navigate.
- Tests: `tests/e2e_deeplink_s24.js` extended. `tests/e2e_lsite.js` and `tests/e2e_sitelink.js` now look at `#ltabs a.nd` where they meant "the Draft link", and sitelink checks that tab hrefs carry only `?l=CODE#<tab>`.

## 7. Refresh returns to Home (investigation + fix)
Checked, with the service worker active, at 390px in a mobile browser and in emulated standalone mode (`display-mode: standalone` + `navigator.standalone`):
- `sw.js`: navigations are network-first with the original request (query and hash kept); only the cache KEY drops the query, and the cached `league.html` is the same file for every league, so a reload served from the cache (slow or offline) still runs with `?l=CODE#tab`. No redirect to Home. Not changed.
- `league.html` / `leaguehome.js` / core boot: no redirect to `index.html` (Home links only in error cards). Not the cause.
- `manifest.webmanifest`: `start_url` is `./index.html`, scope `./`. **This is the cause in the home-screen app**: every launch, and every relaunch after the phone drops the app from memory (what feels like a "refresh" on iPhone, where a home-screen app has no reload button), opens `index.html` = Home. Reproduced against live s23: a standalone launch lands on Home.
- Second real gap (live s23 too): a reload of a URL WITHOUT the hash (a League site link or bookmark saved as `?l=CODE`, or a launch straight at it) always opened Standings, because nothing remembered the tab.
- A plain reload of `league.html?l=CODE#bets` in the browser (live s23 and s24, with or without the worker, online and offline) stays on the tab. The phone-browser report was NOT reproduced; the likely explanation is that the page was opened from a link without the hash, or the home-screen app was being used.
Fix:
- `leaguehome.js` remembers the tab per league on this device (`fbn.x.<league>.ltab`, `fbn.lastsite` = {league code, tab, time}; no identity) and in the browser tab (sessionStorage). With no hash in the URL it reopens that tab on a reload / back-forward, and on any open inside the home-screen app. A fresh browser open of `?l=CODE` (e.g. from the draft room) still starts on Standings.
- `index.js` (**Draft Room overlap**, 1 statement at the top): only in standalone mode and only on the first page of an app session, if the League site was used in the last 14 days, it replaces itself with `league.html?l=CODE#<last tab>`. Later visits to Home in the same session stay on Home. `manifest.webmanifest`, `sw.js`, `core.js`, `ui.js` unchanged.
- Test: `node tests/e2e_refresh_s24.js` (27 checks; against live s23 the same test fails 4: lost-hash reloads in both modes, standalone launch at start_url, standalone launch at `?l=CODE`).

## 8. Bets list filters (addition)
- One row above the Bets list, in the look of the old side-bets page (`/workspace/onebets-preview/index.html` lines 1160-1170, reference image `bets_filter_ref.png`): **Person** (Everyone default, Me only with a manager link, then the league's managers by display name), **Status** (Any status default, Open, Settled, Wash, Waiting on me only with a manager link) and a **"search terms..."** box (bet text and manager names, case-insensitive, live while typing). All three combine. The heading shows the count, e.g. "Bets (3 of 9)"; each combination has its own empty line plus a "Show all bets" button.
- Status meanings: Open = waiting for an answer, accepted, result reported or in disagreement. Settled = settled (wash included). Wash = settled with the result "Wash" (nobody owes); there is no separate push / void / tie state, and declined / withdrawn bets only show under Any status. Waiting on me = a bet sent to me or open to anyone that I have not answered, a result the other side reported that I have not answered, a disagreement I am in, or a Fix result request waiting for my confirm.
- Remembered per league on this device (`fbn.x.<league>.betf` = {p, s, q}; p is all / me / the manager's position 1-8, never a manager id). In the URL as `#bets/f=<p>-<s>` with optional `/q=<terms>` (e.g. `#bets/f=me-waiting`, `#bets/f=3-settled`, `#bets/f=all-open/q=ben`). Filter changes rewrite the hash in place (replaceState). Copy link on the Bets tab includes the filter; no manager id, k= or as=.
- A deep link to a bet the filters hide (`#bets/<betId>`) resets them to Everyone / Any status / no search, then scrolls to and highlights the card.
- Watchers (no manager link): no Me / Waiting on me; a link or saved choice using them shows everyone with a short note.
- 44px controls; one row at 360px and wider, the search box wraps under the two selects below 360px. Below 400px the text is 14px (13px placeholder) so "Any status" and "search terms..." fit; iOS Safari may zoom a little when one of them is focused (it does that for text under 16px).
- Test: `node tests/e2e_betfilter_s24.js`.

## 9. Bets page layout: no headline, form + filters at the top, intro text at the bottom (addition)
- The "💪 Bets" headline card is gone (the tab already says Bets). The page now starts with the New bet form (watchers: the "Watching only" card), then the filter row.
- The count that lived in the "Bets (3 of 9)" heading is now a small line inside the filter row: "Showing 3 of 9 bets" (`#b27FCount` keeps the same "3 of 9" / "9" text). The "Bets (n)" list heading is removed; the live / offline / "Try now" line (`#b27Top`, wrapper still `#b27Head`) sits under the filter row.
- When no filter is on, "Waiting for your answer" stays above the list and the remaining cards get an "Other bets" heading; with a filter on, that section is folded into the filtered list (no duplicates).
- The totals (who owes who, net pushups, "Still open") now come after the bet cards; the intro text (wording unchanged, pushups only) is the last block.
- Tests: e2e_betfilter_s24 checks there is no headline, the form is the first block, the filter row (with "Showing 9 bets") follows, then bets, then totals, then the intro text last; the count checks read the count line instead of the heading.

## 10. Bets block order copied from the partner site (addition)
Reference: the partner site `index.html` Bets view (staged copy /workspace/owes_betsintro_upload, md5 b9c333d54cc9d61205bd7eff47b8b2c6 = live), read only.
- Reference order: status message · New bet form (or "Pick who you are") · Who owes who table + net chart · "Still open" line · "Bets (n of m)" heading · filter row · bet cards · "Showing the latest 60" · intro card (disclaimer, records text, live line last).
- Ours now: status message · New bet form (or Watching only card) · Who owes who + net pushups · "Still open" line · filter row with "Showing x of y bets" count (stands in for the reference heading) · Waiting for your answer + "Other bets" (ours only, kept just above the cards) · bet cards · "Showing the latest 60" · intro card with the live / offline / Try now line as its last line.
- Moved: totals + Still open back above the list; live line into the intro card. No other layout change.
- Test: e2e_betfilter_s24 checks this order.

## 11. Shared loader: the partner site ball loader (addition)
- The "Loading the league…" card is replaced by one shared loader, the same design as the partner site `/*<BALL-LOADER>*/` (staged the partner site index.html md5 208e48cf2955176a5d5ec1eae3b547de, read only). CSS copied verbatim into css/league-app.css (`.bl`, `.bl-row`, `.bl-b`, `.bl-t`, keyframes blBounce / blShadow; no class collisions); markup from `LLOADER()` in js/leaguehome.js = the partner site `ballLoader()` (3 🏀 with a ground shadow, staggered 0 / .14 / .28 s, small "Loading…" line). CSS only, no inline scripts (our CSP is fine with it).
- Accessible: role=status, aria-live=polite, the balls are aria-hidden, the screen reader hears "Loading…". prefers-reduced-motion: no bounce, balls resting on their shadows (partner-site rule).
- League loading states covered: league page first load (leaguehome.js `#loading`), and the Bets tab while the bets are still loading (league-bets.js: loader in place of the totals and list, as the partner site; the live line still says "Connecting…"). The other tabs (Games/schedule, Standings, Squads, Teams, Post, Redraft link) render from the already-loaded league data and have no loading state of their own.
- Not loading states, left as they are: "Having trouble reaching the league. Retrying…" card and the "Offline: showing the last saved view" note (errors, as the partner site keeps errors unchanged).
- Draft Room / other-page files with loading text, NOT edited: js/recap.js "Loading the final rosters…", js/power-render.js "Loading the power rankings…" (recap page), js/redraft.js "Loading the Redraft…" (redraft.html).
- Test: tests/e2e_loader_s24.js (loader during held load, a11y, staggered animation, no old card, reduced motion, centered + no overflow at 320/360/390/1280, Bets loader).

## 12. Recap power loader + mock-league skip for fbn.lastsite (addition)
- js/power-render.js: "Loading the power rankings…" card replaced by the same the partner site ball loader markup (role=status, aria-live=polite, balls aria-hidden, label "Loading the power rankings…"). recap.html does not load css/league-app.css, so the BALL-LOADER CSS block (incl. reduced motion) is copied into css/power.css; no Draft Room CSS edited.
- Draft Room note /workspace/draftroom-notes/s24-resume/HOOK.md, hook 1, done in js/leaguehome.js `saveLast()`: for a mock league (`L.meta.mock===true`) nothing is written to fbn.lastsite, fbn.x.<id>.ltab or the session tab, and an old record of that mock league is cleared, so a reload / standalone launch never resumes a mock league. Demo stays skipped as before. Real leagues unchanged: `{id,t,at}`, bare tab name.
- js/index.js not changed again. HOOK.md says the draft room's own index.js resume statement replaces our s24 one (don't ship both); that is a merge decision for the draft room release, listed here.
- tests/seed_league.js: `{mock:true}` option. Tests: e2e_loader_s24 (power loader + reduced motion), e2e_refresh_s24 (mock league neither writes nor follows fbn.lastsite; real league still does; standalone launch resumes the real league).

## 13. Wording fix: no partner-site name in shipped files (test_core)
- Comments only (no behaviour change): the partner site's name and "reference standings site" / "older Side bets page" wording removed from js/league-bets.js, js/leaguehome.js, js/power-render.js, css/league-app.css, css/power.css; the s24 docs reworded the same way.
- Left alone (Draft Room file): css/app.css comment "same family as the reference site" (no banned word; listed only).

## 14. s24b QA fixes (/workspace/qa-s24b/REPORT.md items 5 and 9)
- Edit "too late" (QA 5, Medium): editBet() now re-reads every manager's bets log from the store (GET) before deciding. If the bet was already answered (accepted / declined), it shows "Too late to edit, this bet was already answered." and writes nothing and opens no form, so no duplicate can be placed. If the logs can't be read, it says so and does nothing. The old post-withdraw check stays as a backstop.
- Sideways scroll on Bets for a signed-in manager (QA 9, Medium): the "None selected" counter (`.b27-selbar .cnt`) may now wrap (white-space normal, min-width 0); below 360px the button row may wrap (`flex-wrap:wrap`). No other layout change.
- Tests (e2e_bets_s24): the other side accepts while the viewer's page is stale, then Edit -> message, no write, no duplicate; strict scrollWidth <= innerWidth <= screen for a signed-in manager at 320/360/390/1280 and in standalone, plus a control that the old rule did overflow.
- Version tag stays 2026-10-29s24 (League files only). The Draft Room s24b build tag (2026-10-29s24b) is set by the Draft Room release; when merged, its version.js wins.
- Not fixed here: QA 7 (Low), resume to a mock recap while the store is down, is in js/index.js resume code owned by the Draft Room (UI.lastPlace / index.js should check the local fbn.mocks list); listed for the Draft Room.
