# s24c (build 2026-10-29s24c) — changes vs s24b. League source: s24-league MD5SUMS.txt 605cfe478a857ada34be07488c2ba4a8
| file | md5 | owner | why |
|---|---|---|---|
| js/index.js | d9520e27572790db2e657e6c89b38573 | Draft Room | QA LOW: resume decides LOCALLY whether the id is a mock (no store call needed); a 503 / failed / offline store never opens a mock; a refused record falls back to the other record or Home |
| js/ui.js | 29f52131815f6b527dc3e9496cc8daaa | Draft Room | UI.isMockId (MK prefix unless a known real league, fbn.mocks, new fbn.mockids list of 100); lastPlace refuses mock ids, kind other than room/recap, mock:true; saveLast / lastTab refuse mock ids |
| js/core.js | f1cf7b5fcef5337ebb28bc86b23e4893 | Draft Room | F.MOCK_PREFIX 'MK', F.makeMockId; real league ids are re-rolled so they never start with MK |
| js/mock.js | 58d2d61688ef76489db5179f7b371a59 | Draft Room | new mocks use F.makeMockId |
| js/room.js | b00d529b2116b91d827ab082cfd51ed1 | Draft Room | in-room last-tab fallback ignored for mock ids |
| js/league-bets.js | 3b25ea8455ba46aa20f21f6d55edf9ef | League (carried unchanged) | s24b: Edit re-reads the logs first, "Too late to edit" with no write |
| css/league-app.css | f787b627477fadf6484c20290cbb5e2e | League (carried unchanged) | s24b: "None selected" counter wraps |
| CHANGE-NOTES-s24.md | aab153233971799b3f33f8771338cdb2 | League (carried unchanged) | League notes |
| README.md | 6915982fd62658c24f08f4a2a08adcc5 | shared | League s24 section synced |
| js/version.js | 9b8e4b9db4cde2dd102fa01da1600e76 | shared | tag 2026-10-29s24c |
Not taken from League: js/index.js, js/version.js. Tests: new tests/e2e_resume_mock.js (503, failed fetch, offline, old / forged lastnav, lastsite and recap records pointing at mocks, kind / mock flag, in-room and recap last-tab fallback); tests/e2e_mock.js allows fbn.mockids; League tests/e2e_bets_s24.js updated.

# s24b (build 2026-10-29s24b) — changes vs s24 (League s24 update, MD5SUMS 5d493fe20c32538ea2ec4bc1f19ece7f; comments reworded)
| file | md5 | owner | why |
|---|---|---|---|
| js/leaguehome.js | 0e17be5bfaca08198b9a5b211778b8da | League (carried unchanged) | shared ball loader; mocks never write fbn.lastsite |
| js/league-bets.js | 7b65170d9a58ce9447941cf92152a995 | League (carried unchanged) | Bets block order, loader |
| js/power-render.js | 1ddeaf8aeac84cb20bdac5550f4ef171 | League (carried unchanged) | recap power rankings loader |
| css/league-app.css | 7c7e4755a15a807d56c8659dd0edccaf | League (carried unchanged) | loader .bl* |
| css/power.css | 1140f2da29cde9770a09178bc02cfd3f | League (carried unchanged) | loader for recap |
| CHANGE-NOTES-s24.md | 3f72e783e053af7db4003a6ab9d53934 | League (carried unchanged) | notes 9-11 + mock hook |
| README.md | 6915982fd62658c24f08f4a2a08adcc5 | shared | League s24 section synced (live-pool name removed from README) |
| js/version.js | cc1f46c08e0ccbd3f4ddedbe5325a01b | shared | tag 2026-10-29s24b (cached files changed; sw.js cache name follows) |
League's js/index.js (7750c07f…) NOT taken: the draft room's single merged resume (56d883b2…) stays. Tests carried: e2e_bets_s24, e2e_deeplink_s24, e2e_refresh_s24, e2e_betfilter_s24, e2e_loader_s24, seed_league.js ({mock:true}).

# s24 (build 2026-10-29s24) — changed files vs s23-full
Base: /workspace/fantasy-bball-releases/s23-full (tag 2026-10-29s23). Draft Room s24 (mock drafts, #tab= hash, tab links, unified resume) merged with League site s24 (/workspace/fantasy-bball-releases/s24-league). No Solana / wallet code (reverted).

| file | md5 | owner | why |
|---|---|---|---|
| mock.html | 9e86ebb6f16c6d8b8b42bd276371cb9d | Draft Room | new: mock draft setup page (solo / with others), last 5 mocks |
| js/mock.js | ac358626839d0f495133b3507b9d3597 | Draft Room | new: FBNMock.create (practice league, mock flag, settings copied, 7 bots / fill seats), mock list on device |
| js/room.js | dafc0f1b75274f65bc14994c1104af46 | Draft Room | PRACTICE banner, bot auto-picks, solo autostart, fill bots, Practice while you wait (hidden when live), Run another / Back to my league (no League site in mocks), tabs as <a href="#tab=">, hash tabs, last place |
| js/recap.js | ebb92b6d3b45f2e0d315a8a059661d32 | Draft Room | grades vs bots note, Run another / Back to my league, section links #tab=, last place |
| js/ui.js | ea9c3c57f19dee530cb594b39e5611f0 | Draft Room | hashTab/setHashTab, saveLast/lastTab/lastPlace (fbn.lastnav + League fbn.lastsite, newest within 14 days), isStandalone, firstPage |
| js/index.js | 56d883b2d6bb4b50f0c3cd03d29bb828 | shared | ONE unified standalone resume (replaces League's s24 statement), Try a mock draft |
| js/join.js | c722cf40f5c9176781bba2dcdd1d0686 | Draft Room | Practice this draft |
| js/core.js | 9d96d827d952c128781e0e07e48ae6be | Draft Room | mock flag kept on reset |
| room.html | 9447ca8628fa90520b99a3d9e2e75ca7 | Draft Room | practice banner host |
| css/app.css | 245791d2b93766f49ccb75499c81a716 | Draft Room | mock / practice styles, tab links |
| sw.js | fffff590518bd990fb6eea9bfd1fb526 | Draft Room | precache mock.html, js/mock.js (cache name from version.js) |
| js/version.js | 974a51faaa7738fa26a220fd7b5e9285 | shared | tag 2026-10-29s24 |
| README.md | f64616b50444e393d60d8800586aa1ae | shared | s24 Draft Room sections + League s24 section |
| css/league-app.css | 90efa06270281c7ad9938d45c0126275 | League (carried unchanged from s24-league) | tab links, bets filters, small screens |
| js/league-bets.js | fdd7a12b4cfbed532f3b3021be9362af | League (carried unchanged) | edit, fix result, filters |
| js/leaguehome.js | 2fdf91f777b1013a059172a444da118f | League (carried unchanged) | tab routes, deep links, share, fbn.lastsite |
| CHANGE-NOTES-s24.md | 5ca84ae430987db88d687e699d74cf16 | League (carried unchanged) | League s24 notes |
| CHANGED-FILES.md | (this file) | | s24 section |

Not shipped (tests): new tests/e2e_mock.js, e2e_tabs.js, e2e_refresh.js, e2e_anchor.js; League tests carried: e2e_bets_s24, e2e_deeplink_s24, e2e_betfilter_s24, e2e_refresh_s24, e2e_lsite, e2e_sitelink; e2e_security / e2e_toptabs updated for #tab= and a click race. tools/make_bundle.sh adds mock.html.

# s24-league (build 2026-10-29s24) — changed files vs live s23
Base: /workspace/fantasy-bball (live s23). League Bets work (Edit on pending bets, two-sided Fix result) + League site tab URLs, deep links and copy / share links. Notes: CHANGE-NOTES-s24.md.

| file | md5 | why |
|---|---|---|
| js/league-bets.js | 3b25ea8455ba46aa20f21f6d55edf9ef | Edit button (withdraw + prefilled form); Fix result events fr / fc / fd, reduce rules, history on the card; #b27Board closed (cards no longer inside the totals box); 🔗 copy-link button on each bet card; Bets list filters (Person / Status / search terms), remembered per league, #bets/f= hash, reveal() for deep links; layout = the partner site block order: form, totals + Still open, filter row with "Showing x of y bets", waiting section, cards, intro card with the live line last; shared loader while the bets load; s24b: Edit re-reads the logs first, "Too late to edit" with no write |
| css/league-app.css | f787b627477fadf6484c20290cbb5e2e | history / edit-hint styles; below 380px chips wrap so tap targets stay >= 44px; Copy link / card link buttons, deep-link highlight; nav a.tb mirrors every nav button rule; one-row filter bar (.b27-flt); .b27-cnt / .b27-top; the partner site BALL-LOADER CSS (.bl*); s24b: "None selected" counter wraps (no sideways scroll) |
| js/version.js | 974a51faaa7738fa26a220fd7b5e9285 | build tag 2026-10-29s24 (sw.js cache name fbnc-2026-10-29s24 is derived from it; sw.js bytes unchanged) |
| README.md | 9e51aac381ba8e1a2d8c6dfb40422999 | s24 section (incl. tab URLs / deep links) + tab links + refresh / home-screen app + Bets filters + Bets layout + loader + power loader / mock skip |
| js/leaguehome.js | 0e17be5bfaca08198b9a5b211778b8da | tab URLs (pushState / replaceState, popstate + hashchange), deep links #bets/<id> #games/<id> with highlight + not-found note, Copy link / Share, links never carry identity; tabs are real <a href="?l=CODE#tab"> links (plain click in place, modified / middle click = browser default); remembers the last tab per league (no identity) for reloads without a hash and home-screen launches; #bets/f=<p>-<s>[/q=] route, filter in Copy link, deep link resets filters; LLOADER() shared loader (the partner site ballLoader markup) replaces the "Loading the league…" card; mock leagues skip fbn.lastsite / last-tab memory (draft room HOOK.md hook 1) |
| js/index.js | 7750c07fa06661c09fbba0fc19db248e | **OVERLAP (Draft Room file)**: one statement at the top: a fresh home-screen (standalone) launch at start_url reopens the last League site tab (used in the last 14 days); browser mode unchanged |
| js/power-render.js | 1ddeaf8aeac84cb20bdac5550f4ef171 | League-owned (recap page module): ball loader replaces "Loading the power rankings…" |
| css/power.css | 1140f2da29cde9770a09178bc02cfd3f | League-owned: BALL-LOADER CSS copy for recap.html (no Draft Room CSS edited) |
| CHANGE-NOTES-s24.md | see MD5SUMS.txt | new (s24 shipped files: comments reworded, no partner-site name, test_core word check) |
| CHANGED-FILES.md | (this file) | s24 section |

Test-only (not shipped): tests/e2e_betfilter_s24.js (new, md5 d2bc264e4d8471501e41de5128d59d43); tests/e2e_refresh_s24.js (new, md5 e5ba397cc94e0e1cac890979bbf7be75); tests/e2e_bets_s24.js (new, md5 72d423210a3295519a7da8d26f3e6d21; asserts no bet card sits inside #b27Board); tests/e2e_deeplink_s24.js (new, md5 9a05959fedc63ab67cea76579fa094ac); tests/e2e_lsite.js (md5 282fdfd0d7913ba524b1d6415750ade5) and tests/e2e_sitelink.js (md5 1689dda8249b9bdc913850d76b6934f8): '#ltabs a' -> '#ltabs a.nd' for the Draft link, sitelink checks tab hrefs carry only ?l=CODE#tab.

# s23 (build 2026-10-29s23) — changed files vs s22b
Base: /workspace/fantasy-bball-releases/s22b (MD5SUMS.txt md5 4ac201a69189bf10f44f8142c4741225). Draft Room files only; no League-owned file changed (League has no s23 work marked ready).

| file | md5 | why |
|---|---|---|
| js/room.js | 9a933ebfd57d200be9493e3122b3478b | items 1,3,4,5,6,9,10,12 (undo/auto-pick race, spin save on Hide, not-found guard, chat re-add, spin for all, end-of-draft redirect + end card, start countdown/auto-start/auto-spin/8 managers) |
| js/store.js | a1c776ffcad4a1e1444e2a41913572c1 | item 2 (5xx read-back, backup key) |
| js/core.js | 18f400f6856a3118082b5522bd8bc8cf | items 1,2,12 + LOW-1 (auto-pick ids, replay, countdown/start helpers, A–Z full name) |
| js/recap.js | 7366287ea6a7a12ed8cb7bf9ea273a37 | item 9 (recap layout, league grades, share my grade) |
| js/setup.js | 6ee37a04f0db5eea861da8145211b72c | item 8 (Email me these links), item 12 time-zone line |
| js/ui.js | 098e3ef32e73ab38f34fd127cb2989df | LOW-2 ("Checking your link…"), shared helpers |
| css/app.css | 17261ccabfde4a54937f1ae9d5569ce7 | items 7, 9, 10 |
| js/version.js | 9776e2bd9dee9e6e3f5947b65f73fda0 | build tag 2026-10-29s23 |
| README.md | b3a5846b8b360e5138fa8b245b88e251 | s23 section |
| CHANGED-FILES.md | (this file) | new |

Test-only (not shipped): tests/e2e.js line 260 time.html New York check accepts UTC-4 or UTC-5 (DST ends Nov 1 2026); tests/s23_extra_shots.js (new).

## League site part of s23 = the s22 League items (STOOPIDS Bets page + Quick bet)
Merged in `/workspace/fantasy-bball-releases/s23-full` (= s23 + these files). League changes copied unchanged from `/workspace/fantasy-bball-releases/s22`; build tag stays 2026-10-29s23; sw.js unchanged (no new files).

| file | md5 | why |
|---|---|---|
| js/league-bets.js | 8d01f9c584fb8682b3c641b196fc6527 | Quick bet picker (Winner only; no lines in data), undo bets placed together (30 s), new-bets badge |
| js/leaguehome.js | 83d3c73fa9870b7d390ddc46bdc141fa | Quick bet pill hook on Games cards, chat bar panel (league chat key), Bets nav badge |
| css/league-app.css | 417564e23154768827df0ac9946d538d | qb-*, chat panel, nav badge styles |
| README.md | see MD5SUMS.txt | s23 README + the s22 "Bets tab and Games cards" section |
