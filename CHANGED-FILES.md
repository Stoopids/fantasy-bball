# s26c15 (build 2026-11-01s26c15): s26c14 + Teams name pill drafts (no separate Draft box)
Base: LIVE s26c14 = /workspace/fantasy-bball-releases/s26c14 (MD5SUMS 2f869a40). Staged only, not published. js/shared-s25.js 8bdd1fd8d7928c3c7e085de801925234 (unchanged). tests/, shots/ not in MD5SUMS.
- Teams list (Paul 'no need for another draft box'): the yellow Draft button is removed from Teams rows. On your turn (or the commissioner picking for someone) the team name pill is the Draft action: button.tm.dbtn data-a=draftrow -> the same confirmDraft -> confirm sheet -> doPick path (pick path unchanged). Yellow outline, >=48px, aria-label 'Draft <team>'. Off turn: plain name, no action (as s26c14). Q+ Queue button kept (48px; hidden for spectators). Hint text 'tap a team name to draft it.'
- Tests updated: e2e_teams_tap_s26c14, e2e_rowtap_s25g, e2e_espn; new tests/shot_teams_pill_s27.js (pill -> confirm -> pick lands; cancel leaves no pick; off turn nothing).

| file | md5 | owner |
|---|---|---|
| css/app.css | 486b1ad392417d891e4c25161f6e14e6 | Draft Room |
| js/room.js | d7e27229f048d6564a99a1de842566cc | Draft Room |
| js/version.js | fa5e7de132fee62d8a01e768bf7caa42 | Draft Room |
| sw.js | 42fe99bd8acabaf6f73f70b8420f4060 | Draft Room |

# s26c14 (build 2026-11-01s26c14): Draft Room two ranks (STOOPID rank + Power rank/KenPom), auto-pick queue-then-KenPom, o/p blend for mock bots + grades, Rules tab, Draft-button-only picking, BUG-1/BUG-2 + League s26c14-league-full
Base: /workspace/fantasy-bball-releases/s26c13 (MD5SUMS 6e4bd13f). Staged only, not published. js/shared-s25.js 8bdd1fd8d7928c3c7e085de801925234 (unchanged). tests/, shots/, node_modules, __pycache__ not in MD5SUMS.
- Ranks: STOOPID rank = meta.p (label renamed from "Power rank"); Power rank = new meta.o = KenPom 2026-27 preseason ratings rank for all 365 teams (/workspace/kenpom/kenpom_o.json via tools/kenpom_rank.py: 365/365 matched, 20 explicit aliases, kenpom_unmatched.txt empty d41d8cd98f00b204e9800998ecf8427e). Credit is the single constant F.RANK_SRC='KenPom 2026-27 preseason ratings'; no Torvik/GordStats credit anywhere. Teams sort pills STOOPID rank / Power rank (tap again to reverse), row badge "S #p / P #o", '–' when missing.
- Auto-pick (every path: Auto-pick switch, clock expiry, Auto-draft me): queue first, then best KenPom rank (o); teams without o last, p as tie-break. Rules: "Auto-pick: queue first, then KenPom rank."
- Mock bots + draft grades: blended rank F.blendRank(meta,wo) = wo*o + (1-wo)*p, teams with p always ahead of teams without p (no-p default p = maxP + o, KenPom order among them). Grades (F.teamStrength / rosterRatings) 50/50; bots without personality 50/50; personalities wo: chalk .5, bigconf .4, value .7, upside .6, homer .3, balanced .5 (guard windows unchanged). NOTE: the finished-draft grade from League js/power-gen.js (schoolScore) still uses p - League-owned, not edited.
- Rules tab between Chat and More (Board, Teams, My Team, Chat, Rules, More): Draft Rules + League Rules link (league.html?l=<id>#rules, hidden in mocks); header Rules buttons and the post-draft More Rules card removed; lobby buttons kept. Draft Rules section 10 Rankings (3 points). "about 3 seconds" wording.
- Safety: a team is drafted only via its own Draft button + confirm (row/name taps never pick); Queue button 48px tall, labelled, >=8px (10px) gap from Draft. Commissioner picking-for-someone gets Draft buttons (no Queue).
- Who are you? picker: "Just watching (spectator)" first, full width, 48px.
- test_core: exact label "STOOPID rank" allowlisted in the live-pool word check; roster strength test now on the blend. KenPom alias table: 21 explicit entries (LIU added; it already matched).
- NOT done: meta.completed_at/endedAt on a natural finish (touches the pick path; League handles it in draftComplete).
- Lobby: grey "UTC · Commissioner’s zone" line under the start time removed (render only, room.js).
- BUG-1: group mock personalities run on every joined device (shared meta.mockOpts), one pick per slot. BUG-2: no-clock undo hold (10 s) confirmed by test (KEPT). Pre-draft synced countdown NOT included (see s26c14-countdown-status.txt).

| file | md5 | owner | why |
|---|---|---|---|
| assets/teams.js | 536e882a44b318e0b08ef96c80c9b6c2 | Draft Room | s26c14 |
| css/app.css | 9125642b9b69a34842547bebd447cced | Draft Room | s26c14 |
| css/league-app.css | 2a39e8668e41074ff1408f2c555f6964 | League | s26c14 |
| js/core.js | 6905f1c92dbc25af2b475997cff38764 | Draft Room | s26c14 |
| js/league-bets.js | ad8fbcb71ffc55ac4ebe51b261dc2d08 | League | s26c14 |
| js/league-d.js | e75167362ea9a9353aa44946763c9634 | League | s26c14 |
| js/leaguehome.js | 50ca9b4ffea230f20f2262326346e04c | League | s26c14 |
| js/mock-bots.js | bf2c25253e672ef3952b0fd06e42ad13 | Draft Room | s26c14 |
| js/mock.js | abfa3575297de542ad98245944481d02 | Draft Room | s26c14 |
| js/power-render.js | 271969c72964545d5c71610cc563a8f7 | League | s26c14 |
| js/room.js | 084e2a9951dc78562a2847ededf3f0f6 | Draft Room | s26c14 |
| js/rules.js | b6c40f01a574e3c88d516c6c075879f3 | Draft Room | s26c14 |
| js/version.js | 89ed85d54cdb994df66133a83554a239 | Draft Room | s26c14 |
| sw.js | 4c2bb6f84e46568b77f1f35e2e179f1d | Draft Room | s26c14 |
| tools/kenpom_rank.py | be1290331d89ff8782ac60ce0b8143b9 | Draft Room | s26c14 |

League section (top of /workspace/league-site-work/s26c14-league-full/CHANGED-FILES.md, md5 ea2a1227, MD5SUMS 08e9fbac):
# s26c14-league-full (League, on s26c13-league-full): STOOPID rank (p) + Power rank (o, KenPom 2026-27 preseason ratings) in the Rosters school detail
Base: s26c13-league-full (MD5SUMS f2c11ffce33ba029380d6faf5aa1017c). Staged only, not published. core.js / version.js / sw.js / assets/teams.js untouched (Draft Room owns; o arrives via teams.js meta[espnId].o in DR s26c14).
p was not shown anywhere in League files before (only Draft Room / power-render recap card label, now 'Avg STOOPID rank'); All teams table has no room at 320/390, so both ranks go in the Rosters › school detail (tap a school row). Grades/sorting stay on p.
| file | md5 | owner | why |
|---|---|---|---|
| js/leaguehome.js | 50ca9b4ffea230f20f2262326346e04c | League | draftComplete(): a natural finish (every pick made, no endedAt from Draft Room) also counts as complete, so the Draft tab shows the pick board; Rosters detail: 'STOOPID rank: #p' + 'Power rank: #o' pills, note 'Power rank: KenPom 2026-27 preseason ratings', '–' when missing (rkNum/rkPills); Games toggle labels 'Upcoming' / 'Past' (no emoji, no counts); header: 'Standings updated' line and Refresh Live Games row removed, title + tagline centred; Refresh Live Games + 'Last updated <time>' at the top of the Games tab (liveRow); footer line 'Standings last updated <time>'; view-only guards (sendChat, urlSignIn, heroWrite return under window.LVIEW); first lines: #bets/<id> / #games/<id> cleaned to the tab hash on reload / repeat open (s26w) |
| css/league-app.css | 2a39e8668e41074ff1408f2c555f6964 | League | .rkp pills; S26C14-VIEW (html.viewonly hides chat form, bet actions, quick-bet, photo controls); S26C14-HDR (centred title, Games-top live row, footer line); S26C14-PARITY (tab labels 12px on phones, desktop pill tabs with inline icon, pill school chips, footer 14px side padding) |
| tests/e2e_torvik_o.js (not in bundle) | 031f7c9159a27d060ab0c0fd780fad2e | League | with-o / without-o, 320/390/1280; real o from /workspace/kenpom/kenpom_o.json (names mapped to ESPN ids, 344/365) else torvik_o.json else mock; source line KenPom |
| js/power-render.js | 271969c72964545d5c71610cc563a8f7 | League | Recap grade card label 'Avg power rank' -> 'Avg STOOPID rank' (text only) |
| tests/e2e_s23.js (not in bundle) | cc09d8deccc8ad183e069c6dcf93e2ff | League | expected label 'Avg STOOPID rank' (B2 check + header comment) |
| js/league-d.js | e75167362ea9a9353aa44946763c9634 | League | top: ?view=1 view-only mode (sessionStorage fbn.view; identity keys fbn.me.*/fbn.cm.* read empty and can't be written; every non-GET fetch/XHR/sendBeacon refused; html.viewonly); history.scrollRestoration='manual' |
| js/league-bets.js | ad8fbcb71ffc55ac4ebe51b261dc2d08 | League | append() refuses under window.LVIEW (view-only) |
| tests/league_step.js (not in bundle) | c0148a7f1364cd45a29a958be144a12c | League | Games toggle expects exactly Upcoming / Past |
| tests/e2e_postdraft_s26c14.js (not in bundle) | 32dd76851193436e9298a31eb4557395 | League | new: completed 8x8 BALL DON'T LIE mock, every tab 320/390/1280 + pick-64 timing |
| tests/e2e_view_s26c14.js (not in bundle) | 912196b44e8ff5cc02ea2e0b47e08974 | League | new: ?view=1 zero writes, guest forced, identity untouched, open-at-top, no sticky bet hash |
| tests/e2e_live_s26c14.js (not in bundle) | c5871655b3415f8e033298d4e90da85c | League | new: mock ESPN live->final moves Upcoming->Past without reload; poll gaps; focus; standings unaffected |
| tests/e2e_header_s26c14.js (not in bundle) | caee8f6be4f491dcb1c5f3a260c2429c | League | new: header/footer/Games-top live row, 320/390/1280 |
Not done here (Draft Room files): room.js 'Who are you?' picker 'Just watching' button; core/room do not set meta.endedAt on a natural finish (League now handles it in draftComplete); test_core 'stoopid' word rule vs the approved 'STOOPID rank' label.


# s26c13 (build 2026-11-01s26c13): League s26c13-league-full + Draft Room s26c9 (UI compaction + lobby) + s26mo4 (mock bot personalities) + s26c11-conf, on live s26c8b
Base: live c96e05d (tag 2026-11-01s26c8b) = /workspace/fantasy-bball-releases/s26c8b (MD5SUMS.txt md5 d175568dd7291dc7fa308c21944f3af1; = live eca8125/s26c11 + Auto-draft me toggle in js/core.js, js/room.js, js/rules.js). Staged only, not published. js/shared-s25.js 8bdd1fd8d7928c3c7e085de801925234 (unchanged); js/core.js 0469b8648e5b27afa7e7ee0a18c2f320 (s26c8b, unchanged). tests/, shots/, node_modules, __pycache__ not in MD5SUMS.
Merges: League files taken whole from s26c13-league-full (MD5SUMS f2c11ffc; vs live only assets/teams.js, css/league-app.css, js/leaguehome.js, .nojekyll differ). s26c9 deltas vs s26c8a and s26mo4 deltas vs s26c8a applied (no file overlap between them). js/room.js and js/rules.js 3-way merged (s26c8a/s26c11 base, s26c9, s26c8b): room.js tickClock keeps the s26c8b Auto re-pick hold countdown + the s26c9 lobby countdown hero; lobby order rows keep the s26c9 viewer highlight/YOU tag + the s26c8b 🤖 AUTO badge. rules.js: s26c8b Autopick text; section 8 Scoring, section 9 "Can’t make the draft?" (s26c9 order, title and .r2miss layout, ids r2_miss/r2_missclk) with the 3 s26c8b points (queue, clock, Auto-draft me). Auto-pick wording "about 2 seconds" -> "about 3 seconds" (QA measured ~3 s; delay code unchanged). tools/refresh_data.py + data/FORMAT.md from s26c11-conf (League's copies were identical to live, so no conflict).

| file | md5 | owner | why |
|---|---|---|---|
| assets/teams.js | 208a42ea0268c4dc172a193c27d9abf0 | Draft Room 2 (via League) | 365-team pool (s26c12-pool) |
| js/leaguehome.js | fe4679701323039e91ba7d12487ecf78 | League | s26c13-league-full: pre-draft 📖 Rules tab (#rules), 365 pool readiness |
| css/league-app.css | 40ab6e51735f527272774499450167aa | League | s26c13-league-full |
| .nojekyll | (empty) | League/live | from live |
| js/room.js | 008b93a9525c6a3305d59ae520ff4fd7 | Draft Room | s26c9 (a360c08c) + s26c8b toggle (5bb6fe35), merged |
| js/rules.js | c141e381ea1ce3f6ae9bd0555d05fdcf | Draft Room | s26c9 (95ee6d1e) + s26c8b (29ed1c91), merged; "about 3 seconds" |
| js/recap.js | 563093cd2e3f54dcc3fdaefd0ee78286 | Draft Room | s26c9 League site new-tab rule |
| css/app.css | c4050f822fda71bbbdee8fe88022ef3d | Draft Room | s26c9 blocks |
| js/mock-bots.js (new) | adcb1f00426208a96dc0242dc04c627b | Draft Room | s26mo4 personalities |
| js/mock.js | 1f84b4b0e795cf0f765369c6bea2af8a | Draft Room | s26mo4 (MOCK_CUSTOMIZE_LINK=true) |
| mock.html | 8651de3c384a5387ec19ec8c1dc594e4 | shared | + js/mock-bots.js |
| room.html | dc5dc90e7dd8ad325b34f5fb28fe1425 | shared | + js/mock-bots.js before js/mock.js (only change vs live) |
| tools/refresh_data.py | 6559e8a171d431e60a937caaaaf65b8f | Draft Room | s26c11-conf annotate_net |
| data/FORMAT.md | cf4fc8b4afa5beeab4d4bd9c8b62d78a | League/Draft Room | s26c11-conf |
| js/version.js | 1a5020f090f4b8d58b580ba13f53173f | Draft Room | FBN_BUILD 2026-11-01s26c13 |
| sw.js | 2543f36726c07e3549e0f7ac163e9f0d | Draft Room | line 3 comment; js/mock-bots.js in SHELL; cache fbnc-2026-11-01s26c13 |
| CHANGED-FILES.md / MD5SUMS.txt | - | Draft Room | this section; regenerated |

Tests (not in bundle): League's e2e_league_tabs, e2e_power_recap, league_step, tabs_exp, e2e_wordscan (USD team code exempt), e2e_allteams, e2e_pool365_s26c12, e2e_prerules_s26c13; s26c9 e2e_lobby_s26c9 (now 3 points incl. Auto-draft me), e2e_more_pd_s26c9, e2e_rules_dr2, e2e_sitelink; s26mo4 e2e_mock, e2e_mock_options_s26, e2e_undo_repick_s26c8a, sim/shots; s26c11-conf test_refresh_conf.py; s26c8b autodraft tests. Fixed: e2e_chips SEC 16 (was 12); e2e_stage5 Teams each cap 15 at 12 managers (was 13); e2e_mock_opts_c8 APP/SHOTDIR from env (no port 18731), #m_bots optional, now exits 1 on a bad run; e2e_draft16 accepts "<name> League site →"; e2e.js: lobby hero "SCHEDULED IN" case-insensitive, pre-draft league page may show Rules/Recap/Draft tabs but no standings tabs, and the end-of-draft check accepts the s23 recap jump (see below).
e2e.js 'Draft complete' timeout: not slowness. A room open when the last pick lands shows Draft complete and jumps to recap.html ~1.8 s later (s23 item 9). The phone that makes pick #48 sees it first; by the time the test has waited for the commissioner's banner and read 48 entries, that phone is already on recap.html, so polling #banner can never match. All 8 phones reach the end within 2 s of the last pick at 365 rows (logged per phone). The test now counts the recap jump for this league as complete; timeout unchanged.

# s26c8b (build 2026-11-01s26c8b): Auto-draft me (opt-in fast auto-pick) + Rules 'Can't make the draft?', on live eca8125 (tag 2026-11-01s26c11)
Base: git eca8125 (= /workspace/fantasy-bball-releases/s26c11 app files; this CHANGED-FILES.md continues the s26c11 release copy). Staged only, not published. Draft Room files only; no League-owned file changed; js/shared-s25.js 8bdd1fd8d7928c3c7e085de801925234. Rebase onto s26c13: core.js/room.js/rules.js are untouched by s26c9..s26c13 League work, so they copy over as-is; bump version.js/sw.js.
Design: switch = the manager's own pref doc (K.pref(mid).auto, league-scoped, set in the lobby or during the draft). Only that manager or the commissioner can switch it (F.canSetAuto). Auto/away turns use the existing autoReason/autoChoice path (queue, then best power rank, unranked last, then seeded random) and the deterministic auto id; picked 2 s after the turn began (F.AUTO.delayMs); pref re-read before submit so OFF cancels. After an Undo the slot waits 10 s from the Undo (meta.resumeAt + F.AUTO.undoHoldMs) or the clock + grace, whichever first, shown as 'Auto re-pick in Ns'; re-pick gets the s26c8a u1 suffix. Badge: 🤖 AUTO on the clock card, lobby order list, board header, manager list.

| file | md5 | owner | why |
|---|---|---|---|
| js/core.js | 0469b8648e5b27afa7e7ee0a18c2f320 | Draft Room | +F.AUTO, F.autoBase, F.canSetAuto, F.autoDelayMs, F.undoHoldUntil (7 lines inserted before F.autoChoice) |
| js/room.js | 5bb6fe3589b22916932664fdc7b0797d | Draft Room | syncPrefs/pollOnce load all managers' prefs (badge); actAuto permission guard; autoTick 2 s delay from turn start, undo hold 10 s, fresh pref re-read; banner AUTO tag + countdown; tickClock countdown; AUTO badges (order list, board header, managers card); My Team 'Auto-draft me' card; click action autodraft |
| js/rules.js | 29ed1c9185222ce2311ca0a58316bd99 | Draft Room | Autopick text (about 2 s; Undo waits clock or 10 s); new section 8 'Can't make the draft?' (3 points); Scoring now 9 |
| js/version.js | 9d0c7b8947fa09c64cab2a705377467d | Draft Room | build 2026-11-01s26c8b |
| sw.js | 58794b1dd721869a4c7cf500f7db1380 | Draft Room | line 3 comment; cache fbnc-2026-11-01s26c8b |
| tests/test_autodraft_s26c8b.js, tests/test_unranked_pool_s26c8b.js, tests/e2e_autodraft_s26c8b.js, tests/bulk_autodraft_s26c8b.js, tests/shots_s26c8b.js (not in bundle) | - | Draft Room | new tests |
| tests/e2e_autopick_instant.js (not in bundle) | ecd2b58c2106485be38af19d86370561 | Draft Room | expectation: pick 5 within 4.5 s of pick 4 (2 s delay by design) |
| CHANGED-FILES.md / MD5SUMS.txt | - | Draft Room | this section / regenerated |

# s26c11 (build 2026-11-01s26c11): League-only release on s26c8a, League files from s26c11-league-full
Base: /workspace/fantasy-bball-releases/s26c8a (MD5SUMS.txt md5 7dec44f38f88a77ee8dc883e382300e6) plus the League-owned files from /workspace/fantasy-bball-releases/s26c11-league-full (MD5SUMS.txt md5 f90beb79c477b1e8d85e502ecb79aa7f). Staged only, not published. s26c11-league-full differs from s26c8a in no Draft Room file; js/shared-s25.js 8bdd1fd8d7928c3c7e085de801925234. tests/, shots/, node_modules, __pycache__ not listed in MD5SUMS.

League: Games cards (aligned pills, one-line owner row, no empty score box before tip-off); Standings > Breakdown (one row per school, same-width pills, one column per category + Tot); All teams (Team, Owner, Rec, Pts, Conf, AP, NET; owner filter chips); conf mapping (normalised conf names/ESPN codes via CFS, net.json ranks[].conf fallback, '–' until known).

| file | md5 | owner | why |
|---|---|---|---|
| league.html | 20d047f6fc4424e7521baac3f5781940 | League | from s26c11-league-full (s26c10: power.css / power-gen / power-render for the Recap tab) |
| js/leaguehome.js | 825c0b7138b69061e37e62e3a82770df | League | from s26c11-league-full: All teams Pts/Conf/owner filter, Breakdown, Games cards, Draft + Recap tabs (s26c10) |
| js/league-d.js | 08c81b13210f8f7e80baf64074e017ba | League | from s26c11-league-full: LRANK.netConfOf conf fallback |
| css/league-app.css | b9a6e7a038d730d3507b4c8be7ec533a | League | from s26c11-league-full: All teams, Breakdown, Games, Draft/Recap tab rules |
| js/version.js | 620087c42f9ec1642117e6273a5d7963 | Draft Room | build 2026-11-01s26c11 |
| sw.js | 66343772c1ed0614b560ae91ddb17c36 | Draft Room | line 3 build comment; cache -> fbnc-2026-11-01s26c11 |
| tests/e2e_allteams_s26c11.js, e2e_gamecards_s26c11.js, e2e_breakdown_s26c5.js, e2e_drafttabs_s26c10.js, e2e_toptabs.js (not in bundle) | see report | League | from league-site-work/tests-s26c8 |
| tests/mock10_s26c11.js (not in bundle) | - | Release | 10 solo mocks + league.html Games/Breakdown/All teams check |
| CHANGED-FILES.md / MD5SUMS.txt | (this file) | Release | s26c11 section; regenerated |

## s26c8 (update): js/leaguehome.js 59adf7e0 from League s26c10-league (SUB declared before topNow; fixes league.html init error)

# s26mo3 (build 2026-10-31s26mo3): queue drag-to-reorder fix + Show picked toggle + 'Draft order updated' toast, on s26c7s + s26mo2
Base: /workspace/fantasy-bball-releases/s26c7s (MD5SUMS.txt md5 20bb0d28a9b84b4ed468b743cd3984e1) plus js/mock.js, js/ui.js, js/recap.js from s26mo2 (s26-mock-options). Staged only, not published. No League-owned file changed; js/shared-s25.js 8bdd1fd8.

| file | md5 | owner | why |
|---|---|---|---|
| js/room.js | 2d95ea5c280da7a18d45b119e20aaf5c | Draft Room | s26c6s REG-1 room.js (fcfe8df8) + queue rows get a drag grip (pointer events, touch-action:none) for touch/mouse reorder; 'Show picked' chip (fbn.showpicked, off by default); 'Draft order updated' toast for non-commissioners (debounced, not on first load / wheel spin) |
| css/app.css | e689583c4d431f8e19da0145bf0b4eb2 | Draft Room | s26c6s app.css (36b60bf3) + .qgrip / .qrow.qdrag rules appended |
| js/mock.js | 35170418ed281974ec4edc467357a817 | Draft Room | from s26mo2 |
| js/ui.js | 5aa18165b81a3f7791885f84dd19a04d | Draft Room | from s26mo2 |
| js/recap.js | 6e54a3d4ca444814432b7c39d6d11517 | Draft Room | from s26mo2 |
| js/scoring.js | dea3951c79015c462034d16d386d2548 | Draft Room | from s26c7s |
| js/version.js | 888682c77fb28c69caafadcc3b851116 | Draft Room | build 2026-10-31s26mo3 |
| sw.js | 78e896058368cebbd0aa640f7828bc1a | Draft Room | line 3 build comment; cache -> fbnc-2026-10-31s26mo3 |
| tests/e2e_queue_touch_s26mo3.js (not in bundle) | b3ead7e9773a2d5b370c800a6ca82d41 | Draft Room | new e2e (Playwright, touch at 390) |
| tests/e2e_showpicked_order_s26mo3.js (not in bundle) | 1fbda12b043cc9253c0d8033bc8f7e0f | Draft Room | new e2e (Playwright, touch at 390) |
| CHANGED-FILES.md | (this file) | Draft Room | s26mo3 section |

# s26c7s (build 2026-10-31s26c7s): s26c7 (STOOPIDS conference points) rebuilt on s26c6s
Base: /workspace/fantasy-bball-releases/s26c6s (MD5SUMS.txt md5 0c9f2aad2e5e6508586e8c86a5527d2a). Staged only, not published. Only js/scoring.js (from s26c7r) added vs s26c6s. No League-owned file changed; css/app.css 36b60bf31b742d92cfcd183ba79e193b; js/shared-s25.js 8bdd1fd8d7928c3c7e085de801925234. tests/, shots/, node_modules not listed in MD5SUMS.

| file | md5 | owner | why |
|---|---|---|---|
| js/scoring.js | dea3951c79015c462034d16d386d2548 | Draft Room | from s26c7r/s26-confpts: conf_reg/conf_tourn, S.confPoints, S.leagueTotals |
| js/room.js | fcfe8df8a6b46b3cc34dca6560ba608d | Draft Room | from s26c6s (REG-1 fix) |
| js/version.js | d8c6fe002588512177bc48622016da98 | Draft Room | build 2026-10-31s26c7s |
| sw.js | 01d1b9e5d8a30eb3334af5c0179881f2 | Draft Room | line 3 build comment; cache -> fbnc-2026-10-31s26c7s |
| tests/test_core.js (not in bundle) | 1c370c8348101b56191d126ae9f8037f | Draft Room | expectations: also allow js/scoring.js comments naming the STOOPIDS 'win' / conf_reg rules |
| tests/test_confpts.js (not in bundle) | 2512fdf1954dc0cc9af59c5e85456186 | Draft Room | unit tests |
| CHANGED-FILES.md | (this file) | Draft Room | s26c7s section |
| MD5SUMS.txt | - | Draft Room | regenerated |

# s26c6s (build 2026-10-31s26c6s): fix QA REG-1 (s25m mock-room scroll jump) on s26c6r
Base: /workspace/fantasy-bball-releases/s26c6r (= s26c6/s25m rebased on live 26dc465). Staged only, not published. No League-owned file changed; css/app.css unchanged (36b60bf31b742d92cfcd183ba79e193b); js/shared-s25.js unchanged (8bdd1fd8d7928c3c7e085de801925234). tests/, shots/, node_modules not listed in MD5SUMS.
Root cause: s25m holdY() did window.scrollBy(0,dh) whenever the banner (On the clock card) was wholly above the viewport and changed height. In the mock room bots pick every few seconds, so the banner changes height on most picks and scrollY moved 24-25 px each time (Teams +24, More -25 at 390). Fix: while the banner is above the viewport its height is frozen (height + overflow:hidden, nothing of it is on screen), so neither content nor scrollY moves; it is released when it scrolls back into view (one scrollBy only if still scrolled past its top). BUG-3 Teams anchor still dy=0.

| file | md5 | owner | why |
|---|---|---|---|
| js/room.js | fcfe8df8a6b46b3cc34dca6560ba608d | Draft Room | REG-1: holdY freezes an off-screen banner instead of scrollBy(dh) |
| js/version.js | 33496342bcbf7ad12669613619f32fca | Draft Room | build 2026-10-31s26c6s |
| sw.js | 874b330a7c8971862a8aa0da1b5c0e98 | Draft Room | line 3 build comment; cache follows FBN_BUILD -> fbnc-2026-10-31s26c6s |
| CHANGED-FILES.md | (this file) | Draft Room | s26c6s section |
| MD5SUMS.txt | - | Draft Room | regenerated |
| tests/test_core.js (not in bundle) | 1c370c8348101b56191d126ae9f8037f | Draft Room | expectations: allow the s26c STOOPIDS 2026-27 import references in js/recap.js and README |
| tests/e2e_profile_btns_s25g.js (not in bundle) | c141955cc6608073fe7c17f58ece6c07 | Draft Room | expectations: under 360 px labels may wrap to 2 lines (s25m BUG-2), never clipped, >=44 px |

# s26c6r (build 2026-10-31s26c6r): s26c6 (= s25m Draft Room fixes) rebased onto live 26dc465 (tag 2026-10-31s26mo)
Base: live commit 26dc465 = /workspace/fantasy-bball-releases/s26-mock-options (MD5SUMS.txt md5 39c6179492f027d67b6ef1db81c1a564; all app files byte-identical to the repo at 26dc465). Staged only, not published. No conflicts: s26c6 changed css/app.css + js/room.js vs s26c4, live s26mo changed js/mock.js + mock.html vs s26c4; disjoint. mock.js/mock.html kept from live. No League-owned file changed; js/shared-s25.js unchanged (8bdd1fd8d7928c3c7e085de801925234). tests/, shots/, node_modules not listed in MD5SUMS.

| file | md5 | owner | why |
|---|---|---|---|
| css/app.css | 36b60bf31b742d92cfcd183ba79e193b | Draft Room | from s26c6/s25m (loader size, BUG-1 alert bar, BUG-2 profile buttons <360px) |
| js/room.js | 799dc0e3d7ce38f413191d983dfa7869 | Draft Room | from s26c6/s25m (BUG-3 holdY) |
| js/version.js | c1fdb2c7f3760893ae7fde6aee0a1afa | Draft Room | build 2026-10-31s26c6r |
| sw.js | 6f1a2e4918e267bcec341702d21819f5 | Draft Room | line 3 build comment; cache follows FBN_BUILD -> fbnc-2026-10-31s26c6r |
| js/mock.js | 1cc07c3c42401757f817f6c4ba749799 | Draft Room | unchanged from live s26mo |
| mock.html | 6332a6756cea5487f30b2cc3471b753a | Draft Room | unchanged from live s26mo |
| CHANGED-FILES.md | (this file) | Draft Room | s26c6r section |
| MD5SUMS.txt | - | Draft Room | regenerated |

Tests: test_scoring 21/21, e2e_lobby_compact_dr2 25/25, mock.html smoke (390 + 1280, solo mock create, mock-keys-only) 12/12.

# s26-mock-options (build 2026-10-31s26mo): changed files vs s26c4
Draft Room staged test build (not published). Mock setup options: Your draft seat (Any (random) default, or 1-8; solo mocks: the order is fixed when the mock is made, so no wheel spin is needed and you land in your seat), Order (snake / straight = type linear, 1-8 every round), Pick clock (the room's F.CLOCKS: 30, 60, 90 sec, 2 min, 3 min, no clock), Bot draft style (best available / random). Query presets: mock.html?seat=1-8|any&order=snake|straight&clock=30|60|90|120|180|0&bots=best|random. No core.js / room.js change: the random bot style wraps F.autoChoice inside js/mock.js, only for a mock this device created (localStorage mockopts.<id>). New dev-copy test tests/e2e_mock_options_s26.js (not in the bundle). tests/, shots/ and node_modules not listed.

| file | md5 | owner | why |
|---|---|---|---|
| js/mock.js | 1cc07c3c42401757f817f6c4ba749799 | Draft Room | seat, order, clock, bot style options; meta.mockOpts |
| mock.html | 6332a6756cea5487f30b2cc3471b753a | Draft Room | inline style: option grid, selects min-height 44px |
| js/version.js | dddd057c57b509124c68d04bcbfcb7ea | Draft Room | build 2026-10-31s26mo |
| sw.js | 422a736718e6de5b64ae00d172131cca | Draft Room | build comment 2026-10-31s26mo (cache name follows FBN_BUILD) |

# s26c2-loader (staged on 2026-10-31s26c2 / 76f05fe5; MD5SUMS.txt before md5 b9c8f5980308df031a34305559c26b30)
Bigger bouncing-basketball loader (Paul): balls 30px -> clamp(56px,22vw,90px) via --bs; bounce height, shadow, gaps and "Loading…" text scale with it. Only the BALL-LOADER blocks changed. version.js / sw.js NOT bumped (Draft Room owns them).

| file | md5 | why |
|---|---|---|
| css/league-app.css | 7d1af2d09adce41691998788dd9dc53a | BALL-LOADER block: huge balls |
| css/power.css | 422f06d20e818a28f93262854539b3da | BALL-LOADER copy: huge balls |
| CHANGED-FILES.md | (this file) | s26c2-loader section |

# s26c2 (build 2026-10-31s26c2): changed files vs s26c (MD5SUMS.txt md5 028bfc8fa7f29b93c501b2f2ddb1b5f6)
League-approved team names in the JSON, card headers and text; build bump. No League-owned file changed; js/shared-s25.js md5 8bdd1fd8d7928c3c7e085de801925234.

| file | md5 | why |
|---|---|---|
| README.md | 262bee0799369fbf2298360c827e790f | s26c2 note |
| import/README.md | c0a54150fbc6f123b758c2a7fccef478 | s26c2 note |
| import/stoopids-draft-results.json | cb2f334310b363a0e1c6d957ba52bc4e | approved team names, build tag |
| js/version.js | 7c1921767ab955e29cdcb9d16ed8feb8 | build 2026-10-31s26c2 |
| sw.js | a0dfd08d9ac68c3982964792b1fc527a | cache follows build (comment) |
| tools/gen_stoopids_import.js | 806c1ebcb679950c59121f0d77b3528e | team-name override map |
| tools/stoopids-2026-27-text.js | 68b4e52ce8e8b897bb68f602a93ba901 | team names in text |
| CHANGED-FILES.md | (this file) | s26c2 section |

# s26c (build 2026-10-31s26c): changed files vs s25-full (2026-10-30s25l, MD5SUMS.txt md5 48957c8a1f000b6c8c2cb5c08f2411fa)
STOOPIDS 2026-27 Draft recap from a static import: recap.html?import=stoopids-2026-27. Draft Room files only; no League-owned file changed (league.html, leaguehome.js, league-*.js, power-*.js, css/power.css, css/league-app.css, data/, help.html untouched); js/shared-s25.js md5 8bdd1fd8d7928c3c7e085de801925234 unchanged. Wisconsin (275) on Jake confirmed by Stoopids Site (overall 63, R8 P7), graded normally.

| file | md5 | why |
|---|---|---|
| README.md | 85a362a734e132de8a2375eeaab3c4cc | s26c section |
| import/README.md | e64c43f45fcff1ed2b863575ae9c80e9 | contract v1 spec, grading method, Wisconsin note |
| import/stoopids-draft-results.json | 010c945a1e46f82409e7b4c6af2e1595 | contract v1 data (64 picks, 8 grades) |
| js/recap.js | 1a855e97cd40670942d4d9e5bf6ede71 | import mode: 3 sections (Congratulations, Take a look at your draft recap!, League site) |
| js/version.js | f83718e2beea5ce445e1759c260e0894 | build 2026-10-31s26c |
| sw.js | dde0ac8afb22c640c7f2018da83a0393 | cache follows build; import JSON in SHELL |
| tools/gen_stoopids_import.js | 2c88e77aafb9db3f192638bba3de421a | regenerates the import JSON with js/power-gen.js |
| tools/stoopids-2026-27-text.js | 1632a74d4f523344a620b259cd30c425 | wording pass: hand-written 4- and 10-sentence text per manager |
| CHANGED-FILES.md | (this file) | s26c section |

Test-only: headless Chromium at 390 and 1280 px; screenshots in /workspace/fantasy-bball-releases/s26c-shots/.

# s25-full (build 2026-10-30s25l): changed files vs s25b
Draft room NCAA checklist (a)-(k), DR2 rules/lobby, SS recap grid, League restage merged. s25k: League leaguehome.js, league-bets.js, league-app.css re-copied unchanged from s25b-league; shared-s25.js kept (League b8c38b44 + QA focus({preventScroll:true}) at line 247). power-render.js md5 f41ca47bcf06390f70dd76b03c8df980 (League, unchanged by Draft Room). tests/, shots/ and node_modules not listed. s25l: version bump only (test-only fix: tests/xss_safe_exprs.json reviews the League Bets sub-tab exprs; no app file changed).

| file | md5 | owner | why |
|---|---|---|---|
| CHANGE-NOTES-s25.md | fdb538b9a8247a3f56406fb69fa80031 | Draft Room | notes |
| UNCLEAR.md | dc050cbfbdc4a7acac091c14b90bb9d0 | DR2 (merged) | new: merged as delivered |
| assets/cheer.mp3 | d64b4a5bc83d7d701430bd795594d5bf | Draft Room | new: draft-done cheer (16 KB, tools/make_cheer.js) |
| css/app.css | 31e8991b30ba2628129c48404da8b909 | Draft Room | room/recap s25-full styles (trow min-height, queue panel, picks-away, invite card, recap layout) |
| css/league-app.css | 16a417545f7e791990662317f7c28c40 | League | s25k: re-copied unchanged from s25b-league, unchanged by Draft Room |
| css/recap-rosters.css | b9f73c3f451d83ad9229aafeb5ea9368 | Stoopids Site (merged) | new: merged as delivered |
| css/rules-lobby.css | 23ec9ff1f0f2d44fee14f4436484d8da | DR2 (merged) | new: merged as delivered |
| data/net.json | 2931bf38f01c5f4dc10f27d05bf98f9f | League | new: League restage merge (65b8fe80 / s25b-league), unchanged by Draft Room |
| js/core.js | bdd69382fb06819e7a0c2fd39c63caae | Draft Room | legacy autoPick:false derives auto-pick on (stored setting untouched) |
| js/league-bets.js | d4a0f8ebbd87670d28ab4d91f008b6b9 | League | s25k: re-copied unchanged from s25b-league, unchanged by Draft Room |
| js/league-d.js | 4be068d4c9248ec9e691d22ced01df11 | League | League restage merge (65b8fe80 / s25b-league), unchanged by Draft Room |
| js/league-sched.js | 93bef2c3d8fb3e2699766d943fc00b57 | League | League restage merge (65b8fe80 / s25b-league), unchanged by Draft Room |
| js/leaguehome.js | e350c22642ffdf508e8bb42b88a85203 | League | s25k: re-copied unchanged from s25b-league, unchanged by Draft Room |
| js/links-card.js | 500c5794a8653c2d5efba42f02d9a996 | Draft Room | links card markup tweaks |
| js/power-render.js | f41ca47bcf06390f70dd76b03c8df980 | League | League restage merge (65b8fe80 / s25b-league), unchanged by Draft Room |
| js/recap.js | 05298d87ae7ba8f247c66491c9b8fb20 | Draft Room | compact hero, layout reorg (What's next top, How grades + build small print last), rounds collapsible, no How the order was set, compact rosters, inline mock recap, XSS esc; s25j: scroll-spy picks section nearest the top line (deep link #tab=awards kept) |
| js/redraft.js | 757c3c165a79010c4b592f2eeffcb64c | Draft Room | Draft Room redraft wording |
| js/room.js | 77b68136eaf36c364596393a471abc04 | Draft Room | row-tap on turn + confirm modal, no ESPN in Teams/pop-up, Queued chip, star removed, legend, queue panel, picks-away line, invite+Mock Draft card, instant autopick, autonote in commish tools, clock-out read-only, Rules buttons, cheer, Links h3 spacing, scroll anchor by data-k |
| js/rules.js | a132aa8407a9547d9a0b393c2f975d90 | DR2 (merged) | new: merged as delivered |
| js/setup.js | 325fd1c31be3daa075c692517c505d03 | Draft Room | clock-out step info only, no Wait option |
| js/shared-s25.js | 8bdd1fd8d7928c3c7e085de801925234 | shared (s25d partner, scroll focus) | League b8c38b44 + QA-requested focus({preventScroll:true}) at line 247; kept as is in s25k |
| js/ui.js | 492ccd9c76149ab8aa02333f688bf449 | Draft Room | rosters {compact:1}, focus preventScroll |
| js/version.js | dbbe6d30e570c02b7c4c63b08ac399f3 | Draft Room | build 2026-10-30s25l + FBN_TITLE |
| league.html | d3b6f53ee707b59cd40376a4074ae674 | League | League restage merge (65b8fe80 / s25b-league), unchanged by Draft Room |
| recap.html | 0f266bd8a433e2e46c44f4ba05dd5fa6 | Draft Room | loads recap-rosters.css |
| room.html | 134e6e7647318ff230f715f573896a66 | Draft Room | loads rules.js, rules-lobby.css |
| sw.js | 29fa7a2305fe68ea6dec70da0098dcd6 | Draft Room | build 2026-10-30s25l (comment; cache name follows FBN_BUILD); precache rules.js, rules-lobby.css, recap-rosters.css, cheer.mp3 |
| tools/make_bundle.sh | 1760e479a35e108232d3af8f0bb4ce33 | Draft Room | new: bundle helper |
| tools/make_cheer.js | eec74fd3057df72e16b0c7f1ede9dbde | Draft Room | new: generates cheer.mp3 |
| tools/mock_textdb.js | 564a76fc93bd657cffacd255c20ebb3e | Draft Room | new: local test server |

## League changes vs s25j (copied from s25b-league/CHANGED-FILES.md; s25k/s25l re-copied these League files)
- js/league-bets.js: the Bets sub-tabs ('✏️ Write it Up' / '💰 Tally', the obSeg() bar placed before the form); Tally with netted pushup settle lines; the Who Owes Who 8x8 grid always shown, with the "Nothing settled yet (N bets still open)" note; team nicknames in CAPS.
- js/leaguehome.js: nav tab renamed '💵 Bets' (icon approved by Paul via NCAA at 18:43 WIB); keepPos/LKEEP scroll restore; manual scrollRestoration; a tab's first open goes to the top; a user scroll of more than 40px cancels the snap; focus() calls use preventScroll.
- css/league-app.css: the .ob-seg / .tabs.ob-seg sub-tab bar (max-width 440px on purpose, copied from the partner build at owes_s25i_upload L132), 44px taps.
- js/shared-s25.js: L247 Escape focus uses preventScroll (from Draft Room/QA).

# s25b (build 2026-10-30s25b): changed files vs s25
Recap layout, mock coaching tips, viewer time zone, home Archive. League files same as s25 (incl. s25-league-links patch).

| file | md5 | owner | why |
|---|---|---|---|
| css/app.css | 3c7c07d5a6fddd6f0f87ec00a21d1aa7 | Draft Room | recap s25b layout (small card, grade line, How grades work, Your 8 picks, coaching tips), archive section styles |
| js/core.js | 223470587db1bb11a20a0bfbbe975b0c | Draft Room | viewer time zone helpers F.zoneAbbr/zoneLabel/fmtClock/fmtLong (Intl timeZoneName short); no hard-coded ET |
| js/index.js | d5a4b4dd98032b2bdbd076984e172487 | Draft Room | home: Archive / Restore per league (device-only), collapsed Archived leagues (N), League site button skips archived |
| js/links-card.js | bdce9a228602e1bef4d663b0149aa1ad | Draft Room | links text uses viewer time + zone label |
| js/recap.js | 8c3d2b0ae183c07552278669b522e5f1 | Draft Room | s25b real/mock recap layout, See my grade, mock coaching tips (better pick available checked vs pick log), viewer time zone |
| js/room.js | f1a8554eee006f7068aeb73c9deeff27 | Draft Room | pick/chat/countdown times in viewer time zone with short label |
| js/setup.js | da167626cb22246d75ce8852bb7314d5 | Draft Room | date/time step shows commissioner local time + zone label (live), stores UTC |
| js/ui.js | 926fd500f4199fd4437097458d9fc4f7 | Draft Room | U.archivedIds/isArchived/setArchived; lastPlace (resume) skips archived |
| js/version.js | c74e5d26735628fea75ada7df0c46510 | Draft Room | tag 2026-10-30s25b |

# s25 (build 2026-10-30s25): changed files vs s24c (MD5SUMS.txt md5 5edc883171e2a8c389c52dbb943adb83)
Draft Room setup polish (items 1-11) + League s25 merged. League CHANGED-FILES (s25-league) entries folded in below.

| file | md5 | owner | why |
|---|---|---|---|
| setup.html | ba0bad6039db68759ec53e44ca6569dd | Draft Room | items 1-6: banner img, setup.css + links-card.js |
| css/setup.css | d1d9f2f57bdc8060aedc91603cfcc6f4 | Draft Room | new: setup-only styles (body.setup): centered 560px card, nav right under the form (not sticky), banner, What you get, league photo, locked continue |
| assets/setup-banner.svg | 8495ef48ff34e2986385d382d6572174 | Draft Room | new: original basketball banner (own SVG, no hotlink) |
| js/setup.js | 6363ec7ea117ef9766855e0b4ae53f3b | Draft Room | step 1 What you get list (8 managers, snake draft, 64 picks, season-long scoring, pushup challenges); optional league photo (on-device resize to 256px JPEG under 40 KB, preview, remove, polite errors, saved in meta.settings.photo); links card replaces Email me these links, continue locked until one is used; Copy draft reminder |
| js/links-card.js | 0be80f3f4322500bd839f2c0f51546ae | Draft Room (shared) | new shared module window.LinksCard: Share / Copy all / Download file (.txt Blob) / Email; fromDevice() rebuilds links from localStorage; no network, no logging |
| js/room.js | 3f54f4fe9ca4ac60c8d9b9aabdfd92f8 | Draft Room | Your links (commissioner only, More tab); Send invite link / Copy draft reminder; How your queue works note under Auto-pick for me |
| room.html | 20abfd684bfb969d32e49a3ce6454576 | Draft Room | loads js/links-card.js |
| js/core.js | dbe3338bb3c204b7b216f1f00c29bbf3 | Draft Room | settings.photo kept through normalizeSettings / normalizeMeta / mSettings (F.leaguePhotoOk, JPEG data URL <= 40 KB) |
| js/recap.js | 39ddb4c17679265daec1faa2119355bd | Draft Room | seeded one-liners on Top 3 steals / reaches (stable per league); compact end card markup (.rctop) |
| css/app.css | 085e73354eb3fb616db7447bb21ec789 | Draft Room | .lcbtns shared links card; .rcquip; compact end card (mock + real); recap tab bar wraps (4 per row, 3 under 360px, one row on desktop), no sideways scroll |
| sw.js | 02d95fb2f5e4aab59cfb0f31b9df4d72 | shared | SHELL adds css/setup.css, assets/setup-banner.svg, js/links-card.js, js/shared-s25.js; cache name from version.js |
| js/version.js | 928375802fe6d6d35b8e82eea125a9c6 | shared | build tag 2026-10-30s25 (sw cache fbnc-2026-10-30s25) |
| js/league-bets.js | bcea3db8d1aee74cd8aab09e9217b85b | League | copied unchanged from s25-league |
| css/league-app.css | 4d56a407d5291815a000770b8bcc9626 | League | copied unchanged from s25-league |
| js/leaguehome.js | af7e882e8ec318d27bf0cb81910898e0 | League | copied unchanged from s25-league |
| js/power-gen.js | e23c8f96ab3ce7de4c03ce8625002c85 | League | copied unchanged from s25-league |
| help.html | 8e37f14c044757c2c7e89fc62efb0488 | League | copied unchanged from s25-league |
| league.html | dc9cc1c5fb21a7f9e380ddf454f75b32 | League | copied unchanged from s25-league |
| js/shared-s25.js | 8e463fd88a7a4978a6ab52fb24091a3d | League | new, copied unchanged from s25-league (partner League edition) |
| CHANGE-NOTES-s25.md | 108a443c72ab6889d9d59526369887b2 | League | copied unchanged from s25-league |
| CHANGED-FILES.md | (this file) | | s25 section |

Test-only (not shipped): tests/e2e_setup_s25.js, e2e_links_s25.js, e2e_tabbars_s25.js, quip_shots.js (new); test_core.js (help limit 2900; settings.photo test; no word-rule exception); test_xss_static.js (3 reviewed constant exprs; League shared-s25 skip + meme img-only check); e2e_tabs.js (Ctrl-click check scrolls the non-sticky phone tab bar into view first); League tests copied from s25-league.

## League s25 entries (from s25-league/CHANGED-FILES.md)

# s25-league (build 2026-10-30s25): changed files vs s24-league
Base: /workspace/fantasy-bball-releases/s24-league (MD5SUMS.txt md5 605cfe478a857ada34be07488c2ba4a8). Stage only. Notes: CHANGE-NOTES-s25.md. Shipped: the partner's League edition js/shared-s25.js (md5 8e463fd88a7a4978a6ab52fb24091a3d). Its first version, shared-s25.js (md5 eb87a816…), was not shipped because it broke the word rule. Shared spec: league-site-work/s25-autosettle-spec.md.

| file | md5 | why |
|---|---|---|
| js/league-bets.js | bcea3db8d1aee74cd8aab09e9217b85b | creator-only settle for new actions; v:25 marker, unmarked (pre-s25) settles keep the s24 rule; save confirm; bet reading; proposed result from the final score; settle sound = shared synth (S25.synth), pop-up = shared SVG memes as <img> data URL (our mute / reduced-motion / after-tap rules kept); reactions; card grid wrappers |
| css/league-app.css | 4d56a407d5291815a000770b8bcc9626 | read-as / proposal / sound / pop-up / reactions styles; card grid 1 / 2 (700px, partner breakpoint) / 3 (1400px); tab bar wraps into equal-width rows (3 per row at 360px and below, 4 per row 361-559px, one row from 560px when the tabs fit, else wraps; same as the partner site), not sticky under 760px |
| js/leaguehome.js | af7e882e8ec318d27bf0cb81910898e0 | tagline (one placeholder line, 2-day rotation from 2026-11-01 ET); league photo hook (meta.settings.photo as the banner fallback, validated) |
| js/power-gen.js | e23c8f96ab3ce7de4c03ce8625002c85 | funnier power-ranking text (kind one-liners appended to existing sentences); facts, grades and 4 / 10 sentence counts unchanged |
| help.html | 8e37f14c044757c2c7e89fc62efb0488 | "How your queue works" in the Managers card (text from draftroom-notes/s25-setup/HELP-QUEUE.md) |
| js/version.js | 928375802fe6d6d35b8e82eea125a9c6 | build tag 2026-10-30s25 |
| js/shared-s25.js | 8e463fd88a7a4978a6ab52fb24091a3d | new: partner site's League-safe shared file (shared-s25-league.js), copied unchanged; md5 matches the source |
| league.html | dc9cc1c5fb21a7f9e380ddf454f75b32 | loads js/shared-s25.js before league-bets.js |
| sw.js | f8c093770c96f522fe8a7bd9491bc13a | **OVERLAP (shared file)**: 'js/shared-s25.js' added to the SHELL list (test_core requires every loaded script in it); nothing else changed |
| CHANGE-NOTES-s25.md | 108a443c72ab6889d9d59526369887b2 | new |
| CHANGED-FILES.md | (this file) | s25 section |

Test-only (not shipped): tests/e2e_tabs_s25.js (new, 27a6ccfecc6129ce45344cf2118059a7; checks 320, 359, 360, 361, 390, 559, 560, 700, 760, 1280); tests/e2e_s25_addon.js (new, a82d7bdc121a1f07d0e09e440a99153a); tests/test_powerfun_s25.js (new, 8c01d23d24dd807a8aabafe9ef272b64); tests/e2e_lsite.js (dea5e4de2779aaca26d5457eaeacffae) and tests/e2e_alignment.js (a6a302adce9debe7847635ba362917d5): tab bar now wraps instead of scrolling; tests/test_core.js (20e7ad0371cb31a8aee695830e149f3a): help length limit 2600 -> 2900 for the approved queue note; tests/e2e_s25.js now 2d5a30d7182e89e706a45f47f9d8ec9c (grid checks at 699 / 700px; shared synth + memes); tests/test_xss_static.js (0bd1486014b380eff3e28b5821211dbe): js/shared-s25.js skipped for the attribute check (SVG from numeric literals), plus a check that the memes are used only as an <img> data URL; tests/e2e_legacy_s25.js (new, 0d70c60457da4101a7c5df33abf8f30e); tests/e2e_s25.js (new, 82323d1fac965136318cfc48c75036a9); tests/test_tagline_s25.js (new, 0dd65a886b73c62caa45adb874a9216d); tests/e2e_bets.js (b5cf2b869d7fe04f5013dbd3913f281b), tests/e2e_bets_s24.js (26c3ff8dff1b8cef3bdf8693812a4ffd), tests/e2e_betfilter_s24.js (7e7b62b46a4a546d76cfb375ed2acc88): updated for creator-only settle and the card grid (e2e_betfilter_s24 is back to the s24 expectations for its legacy reports: only the card selector and intro wording changed).


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

## League site part of s23 = the s22 League items (partner-site Bets page + Quick bet)
Merged in `/workspace/fantasy-bball-releases/s23-full` (= s23 + these files). League changes copied unchanged from `/workspace/fantasy-bball-releases/s22`; build tag stays 2026-10-29s23; sw.js unchanged (no new files).

| file | md5 | why |
|---|---|---|
| js/league-bets.js | 8d01f9c584fb8682b3c641b196fc6527 | Quick bet picker (Winner only; no lines in data), undo bets placed together (30 s), new-bets badge |
| js/leaguehome.js | 83d3c73fa9870b7d390ddc46bdc141fa | Quick bet pill hook on Games cards, chat bar panel (league chat key), Bets nav badge |
| css/league-app.css | 417564e23154768827df0ac9946d538d | qb-*, chat panel, nav badge styles |
| README.md | see MD5SUMS.txt | s23 README + the s22 "Bets tab and Games cards" section |

## s26c4 = s26c2-loader (League huge ball loader) + version bump
Base: `/workspace/fantasy-bball-releases/s26c2-loader`. Build tag 2026-10-31s26c4; sw.js cache name follows FBN_BUILD (fbnc-2026-10-31s26c4), only the line 3 build comment changed.

| file | md5 | why |
|---|---|---|
| js/version.js | 8188679c5f3d35b5addf53e0af6ea180 | build tag 2026-10-31s26c4 |
| sw.js | bc56dd427517a61e2cfccd736d82b2aa | line 3 build comment |
| CHANGED-FILES.md | (this file) | s26c4 section |

## s26c8 = s26mo3 + s26-refresh-conf + League s26c8-league
Base: `/workspace/fantasy-bball-releases/s26mo3` (contains s26c6s, s26c7s, s26mo2). Build tag 2026-10-31s26c8; sw.js cache fbnc-2026-10-31s26c8, only line 3 comment changed. js/shared-s25.js unchanged (8bdd1fd8). s26c9-league not included.

| file | md5 | source / why |
|---|---|---|
| tools/refresh_data.py | e4e39ff31d500374f55f2608a32cfe38 | s26-refresh-conf (conf map writer) |
| data/FORMAT.md | 52813fdc903155a9c2ed83d89e8ab49d | hand merge: s26-refresh-conf conf row + League conf section/League total text |
| css/league-app.css | 506fea4551564150db362a018bb42dc0 | League s26c8-league |
| help.html | 21176772a3a2aeabee6db958d0e57220 | League s26c8-league |
| js/league-d.js | 9d29a81ab1be0c02b76fe9f491e3b3ee | League s26c8-league |
| js/leaguehome.js | 2e22aeffd7f254e00991d3f842c0d201 | League s26c8-league |
| js/version.js | 906d061a5374db9ac6b6e9297ebe7bb3 | build tag 2026-10-31s26c8 |
| sw.js | 0cfb732202e2d92e9bf8c6ad14bcbd84 | line 3 build comment |
| README.md | unchanged | |
| CHANGED-FILES.md | (this file) | s26c8 section |

Test-only (not shipped): tests/test_refresh_conf.py (s26-refresh-conf); League tests e2e_banner_s26c5.js, e2e_breakdown_s26c5.js, e2e_noscrolljump_s25.js, e2e_ownerbreak_s26c3.js, e2e_toptabs.js, e2e_totals_s26c8.js, fixture_s26c3.js, open_s26c3.js.

## s26c8a = s26c8 + fix: Undo leaves the next pick stuck on "0:00 AUTO-PICKING" (QA s26c8-live20 BUG-1, r02/r07/r17)
Base: `/workspace/fantasy-bball-releases/s26c8` (MD5SUMS 31fc0b1c9712f0fa0b7251df85be7e72). Build tag 2026-10-31s26c8a; sw.js cache fbnc-2026-10-31s26c8a (name follows FBN_BUILD; only the line 3 comment changed). js/shared-s25.js unchanged (8bdd1fd8). No League-owned file touched.
Root cause (two parts, both needed):
1. js/room.js:209 (s26c8) post-Undo hold: "do not re-pick a voided slot unless reason==='expired'". F.autoReason (js/core.js:331) returns 'auto'/'away' BEFORE it checks the clock, so for a bot / auto-pick-on manager the reason is never 'expired' and the hold never ends -> 0:00 AUTO-PICKING forever.
2. js/core.js:299 F.makeEntry: auto-pick ids are deterministic (epoch-slot-team-prev). After the Undo the bot re-picks the same team with the same prev, so the new pick gets the voided id, F.entryProblem (core.js:301) says 'voided' and the replay drops it -> stuck again.
Fix: makeEntry takes `voided` and, when the computed id is on it, adds a deterministic `u<k>` suffix (same on every phone; manual ids are random and unaffected unless they collide). room.js submitPick passes M.voided. The post-Undo hold now also ends when the pick clock has run out (deadline+grace), and does not apply to mock bots (they re-pick after their usual 1-2 s).

| file | md5 | why |
|---|---|---|
| js/core.js | dca9873aae77266fe95f8a1918cad4a1 | makeEntry: void applies only to the original instance (u<k> suffix) |
| js/room.js | 571425ffc9e122426ef7bb06305a0790 | submitPick passes voided; post-Undo hold ends at clock expiry, not for bots |
| js/version.js | d6f164d5b9136473bbcc756bb8ba578a | build tag 2026-10-31s26c8a |
| sw.js | fb40644887afdf2250b23ce4b7f85d7f | line 3 build comment |
| CHANGED-FILES.md | (this file) | s26c8a section |

Test-only (not shipped): tests/e2e_undo_repick_s26c8a.js (Playwright; undo auto pick, double undo, undo manual pick + re-pick same team, draft keeps advancing; 390 and 1280 px; fbn.store mock, textdb.dev aborted).
