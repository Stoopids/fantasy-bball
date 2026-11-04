# sync-step1 progress (local only, nothing pushed/deployed). 4 Nov 2026, ~09:40 WIB
Branch `sync-step1` in /workspace/league-sync (copy of /tmp/l). Serve: `node /workspace/fantasy-bball-devtools/tools/mock_textdb.js 8840 $PWD 8841`, seed `node tests/seed_league.js http://localhost:8840/api/data/ > /tmp/lsid`, shoot `/workspace/pwvenv/bin/python shoot_league.py after standings,games,bets` (opens league.html?l=<id>&demo=1, fbn.store=/api/data/).
Files changed: league.html (+css/sync-step1.css, last), js/leaguehome.js (Games/Standings markup), js/league-bets.js (hint line). room.html / room.js / data/ untouched.

## Done
- Tab bar: small 32px tabs in one row on laptop; phone grid 2 rows of 4. main/footer width = tab bar (--nav-max 1080, 100–1180 at 1280px).
- Games: neutral-site text removed, 🏠 inside home pill, W-L record inside pill (right), larger owner pill (14px), Copy + Quick bet stacked top-right (.mkbtns; Quick bet button moved out of the card bottom, picker still opens below), footnote "· DraftKings", green .mkbet outline (gHasBet: best-effort match on LBETS._state), Refresh Live Games far right of Upcoming/Past row (data-a=lvrefresh, old #live row hidden), "Pool only" -> "Pool vs Pool", 2-column grid on laptop.
- Standings: Refresh + "Updated X min ago" on the right of League/Breakdown; points centered; phone chips show 4-letter ESPN abbr (teams.js abbr).
- Bets: "Pick one or more opponents…" hint returns ''.
- Tight bottom gap (main pb 8px, footer pb 12px).

## Done in session 2 (4 Nov, ~09:10–09:50 WIB)
- Header frame: laptop banner/header 1000px (140..1140, = STOOPIDS), tagline flush under title (17px line). Measured: League hero 140/0/1000x235, h1 top 291, tag top 363 = STOOPIDS.
- Games 3 across at >=900px (2 at 641–899) on League (css/sync-step1.css) AND /workspace/mockreal (mock.css + inline MOCK style in index.html; backups /tmp/mockreal-index.bak, /tmp/mockreal-mock.css.bak).
- Bet outline now uses League's real model: LBETS.bets() (= reduce() of the per-manager logs fbn1-<id>-bets-<mid>), match on b.g (ESPN event id), ignoring void/declined/withdrawn/pools.
- Seeded real-data league: `node /tmp/seed2.js > /tmp/seed2.json` (8 managers + one pending bet on an upcoming game, viewer = the bettor via localStorage fbn.me.<id>). Shooter: `shoot_real.py real games,bets,standings`. Verified: 1 green-outlined card, 12 stacked Quick bet buttons, Bets form without hint (empty #b27Live box hidden).
- All teams filter ported (#gTeamSel: owned schools in the current list, alphabetical; checked 126 -> 12 cards).
- Page tests run (out/tests.log vs untouched baseline out/tests-baseline.log, same mock setup): e2e_lsite 3/8 (baseline 3/8), e2e_games_s28c 21/30 (baseline 21/30), e2e_header_s26c14 27/39 (baseline 27/39), e2e_alignment 3/8 (baseline -1/8). No new failures; the failing checks are stale specs (old tab list with Rosters/Share/Draft, 4-in-a-row controls, #live row, 140..1140 edges).

## Done in session 3 (4 Nov, ~09:20–10:05 WIB)
- Tab list: League = STOOPIDS's 8 minus **Archive** (League has no archive data/tab yet: meta.archive is never written). Phone: 7 tabs as 2 rows of 4 slots, row 2 (Recap, Rules, Profile) centred (8-col grid, span 2). Rosters is not a League tab any more (rosters live in All teams/Standings).
- Banner = tab bar = content = 1080px at 1280 on League, and the same rule added to /workspace/mockreal (mock.css + inline MOCK style; v=B) so both read 100..1180.
- All teams: STOOPIDS-style compact owner pills (no "Owner" label), one-line owner, compact rows, 12px bold numbers. Rules/Profile already matched the frame (League keeps its own rules text and profile fields). Headings (.gday, .rcroom) aligned to the content edge.
- Phone ≤360px: Refresh Live Games wraps to the right instead of overflowing.
- Tests rewritten to the new look (tests/tabs_exp.js, e2e_lsite, e2e_games_s28c, e2e_header_s26c14, e2e_alignment) – all pass: 53/53, 30/30, 39/39, 54/54 (mock store on 8850/8851). Changed thresholds, stated in the specs: tabs ≥40px phone / ≥32px laptop, Refresh ≥30px (STOOPIDS sizes, below the old 44px rule); title checked as centred, not full width.

## Not done / unverified
- Recap tab: still League's power-rankings layout (2-col cards with chips); STOOPIDS shows 'Weekly write-ups' + 4-col draft-grade cards with letter circle and More. Needs a markup port in power-render.js, not just CSS.
- All teams: STOOPIDS prints ranks as '#16'; League prints '16' (markup change, not done). Profile: small copy/layout differences (Notifications 'Coming soon' line) left as is.
- Archive tab: not added (no data); decide whether League gets an empty Archive tab.
- Only these 4 page specs were re-run; the rest of the suite (e2e_league, bets, recap…) not run this session.
- tests/node_modules is a local symlink to /workspace/audit/s29d/node_modules (excluded via .git/info/exclude).
- Rosters/Recap/Rules/Profile/redraft.html/recap.html not touched; e2e tests not run.
- "Updated X min ago" uses LV.lastOk or D.meta.updated; shows "just now" when unknown.

## Next
0. Recap markup port (draft-grade cards), '#' ranks in All teams, run the full suite (run_suite_private.sh).
1. Seed a non-demo league with a manager identity (localStorage) to verify Quick bet stack, outline, Bets form.
2. Header frame parity, then run tests/e2e_lsite.js + e2e_games_s28c.js on the mock.
3. Port "All teams" filter if wanted; decide 8th tab.
