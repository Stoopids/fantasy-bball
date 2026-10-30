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
