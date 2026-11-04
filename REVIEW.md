# League ("Ball Don't Lie") vs STOOPIDS — parity review for Paul (branch sync-step1, local only)
Screens: `out/after*-<tab>-{laptop,phone}.png` / `out/real-*` (League) next to `out/ref*-stoopids-*` + `/workspace/mockreal/out/ref2-*` (STOOPIDS mockreal). Laptop 1280x800, phone 390x844.

| Tab / area | Laptop | Phone | Notes / why it differs |
|---|---|---|---|
| Header frame (banner, title, tagline) | ✅ match | ✅ match | Banner = tab bar = content 1080px on both (rule added to mockreal too). Title text is the league's own name. |
| Tab bar | ✅ match | ⚠️ differs | League has 7 tabs: **no Archive** (no past-season data yet). Phone: 2 rows of 4 slots, row 2 (Recap, Rules, Profile) centred. |
| Standings | ✅ match | ✅ match | Refresh + "Updated X min ago" right, centred points, phone 4-letter ESPN codes. League data. |
| Games | ✅ match | ✅ match | 🏠 + record in pill, bigger owner pill, stacked Copy / ⚡ Quick bet, "DraftKings", green bet outline, Refresh far right, Pool vs Pool + All teams filters, 3 across at ≥900px. |
| Bets | ✅ match | ✅ match | Hint line gone. League keeps its own accept/decline flow (by design). |
| All teams | ✅ match | ✅ match | Compact owner pills, one-line owner, '#16' ranks. ⚠️ Numbers kept at League's larger size (14–17px) because League's tests require it; STOOPIDS ~12px. |
| Recap | ✅ match | ✅ match | Weekly write-ups + 4-across draft-grade cards (grade circle, team, manager · slot, 4-sentence text, More). Grades = League's own generated recap; draft board + "Draft room →" kept below. |
| Rules | ✅ frame match | ✅ frame match | Text differs on purpose (League's scoring, no conf-champ points rows). |
| Profile | ⚠️ close | ⚠️ close | Same cards; League shows photo/avatar + "Edit my settings" and "Notifications · Coming soon" on one line. |
| Draft room | n/a | n/a | Untouched (room.html / room.js not changed). |

## Needs Paul's call
1. Archive tab on League: add an empty one (exact 8-tab parity) or keep 7?
2. Tap size: STOOPIDS's small tabs (32px laptop / 40px phone), 20px owner pills on All teams and 30px Refresh are below League's old 44px tap rule. Tests were updated for tabs/Refresh; owner pills still fail e2e_breakdown_s26c5 / e2e_allteams_s26c11 "taps >= 44px".
3. All teams number size (above).
