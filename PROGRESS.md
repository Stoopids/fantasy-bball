# sync-step1 progress (local only, nothing pushed/deployed). 4 Nov 2026, ~09:40 WIB
Branch `sync-step1` in /workspace/league-sync (copy of /tmp/l). Serve: `node /workspace/fantasy-bball-devtools/tools/mock_textdb.js 8840 $PWD 8841`, seed `node tests/seed_league.js http://localhost:8840/api/data/ > /tmp/lsid`, shoot `/workspace/pwvenv/bin/python shoot_league.py after standings,games,bets` (opens league.html?l=<id>&demo=1, fbn.store=/api/data/).
Files changed: league.html (+css/sync-step1.css, last), js/leaguehome.js (Games/Standings markup), js/league-bets.js (hint line). room.html / room.js / data/ untouched.

## Done
- Tab bar: small 32px tabs in one row on laptop; phone grid 2 rows of 4. main/footer width = tab bar (--nav-max 1080, 100–1180 at 1280px).
- Games: neutral-site text removed, 🏠 inside home pill, W-L record inside pill (right), larger owner pill (14px), Copy + Quick bet stacked top-right (.mkbtns; Quick bet button moved out of the card bottom, picker still opens below), footnote "· DraftKings", green .mkbet outline (gHasBet: best-effort match on LBETS._state), Refresh Live Games far right of Upcoming/Past row (data-a=lvrefresh, old #live row hidden), "Pool only" -> "Pool vs Pool", 2-column grid on laptop.
- Standings: Refresh + "Updated X min ago" on the right of League/Breakdown; points centered; phone chips show 4-letter ESPN abbr (teams.js abbr).
- Bets: "Pick one or more opponents…" hint returns ''.
- Tight bottom gap (main pb 8px, footer pb 12px).

## Not done / unverified
- Header frame (banner/title/tagline) not yet compared pixel-for-pixel with STOOPIDS (League shows "DEMO DATA" badge + extra demo note card).
- Quick bet stack + green outline not visually verified: demo has no signed-in manager and bets are off in demo. gHasBet guesses at the LBETS state shape (S.bets/S.list) – check it.
- Bets form not screenshotted (demo disables Bets) – needs a non-demo seeded league with scores.
- Mockreal's extra "All teams" filter select on Games not ported; League has 7 tabs (no Archive), so phone row 2 has an empty slot.
- Rosters/Recap/Rules/Profile/redraft.html/recap.html not touched; e2e tests not run.
- "Updated X min ago" uses LV.lastOk or D.meta.updated; shows "just now" when unknown.

## Next
1. Seed a non-demo league with a manager identity (localStorage) to verify Quick bet stack, outline, Bets form.
2. Header frame parity, then run tests/e2e_lsite.js + e2e_games_s28c.js on the mock.
3. Port "All teams" filter if wanted; decide 8th tab.
