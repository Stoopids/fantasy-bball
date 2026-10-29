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
