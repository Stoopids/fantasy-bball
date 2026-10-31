# import/stoopids-draft-results.json — contract v1 (build 2026-10-31s26c2)

Static result of the STOOPIDS 2026-27 draft (8 managers, 8-round snake, 64 picks), shown by
`recap.html?import=stoopids-2026-27` (optional `&l=CODE` points the League site button at `league.html?l=CODE`;
without it the button opens https://stoopids.github.io/stoopids/). Unknown `import` values show "Draft recap not found".
No textdb, no network beyond this same-origin file. No contract spec file existed in /workspace/ss-s26c, so this README is the spec.

## Shape
```
{ contract:'v1', season:'2026-27', league:'STOOPIDS', build, draft:{type:'snake',rounds:8,managers:8},
  source:{file, md5, teams_built, notes},
  order:[{manager, mid, slot, owner_name, team_name}]            // slot 1..8 = round-1 pick order
  picks:[{overall, round, pick, manager, teamId, team}]          // 64, sorted by overall; teamId = ESPN id
  grades:{ <manager>: {grade, rank, strength, avgPowerRank, summary4, deep} } }
```
`summary4` is exactly 4 sentences, `deep` exactly 10. Grades: A+, A, A-, B+, B, B-, C, D. Dates are written "Month Day, Year".

Order: 1 Mark, 2 Jake, 3 Kurt, 4 Ken, 5 Murf, 6 Paul, 7 Jim, 8 Scotty (snake; every pick was checked against it).

Team names (s26c2): the league-approved names override `team_name` from the input: Mark Dirty Draymond, Jake Stock Rising, Kurt Kurmoji, Ken Kentut, Murf Murfcockchalkrock, Paul Party Paul, Jim Nasty Peacock, Scotty En Fuego.

## Source
`/workspace/ss-s26c/picks-2026-27-final.json` (md5 6ca1fda6de3b1a917e173b91f683dbe1, picks_order_known true). Teams exactly as given.

**Wisconsin (275) on Jake:** the input had it with no slot (order_conflict; Paul's list had Princeton there, which is already on Scotty at #57).
Stoopids Site CONFIRMED on October 31, 2026 that Wisconsin is Jake's pick. It is placed at overall 63 (round 8, pick 7), the only open slot
and Jake's round-8 turn in the snake, and is graded like any other pick.

## Grading method (no invented stats)
Grades and text come from the app's own deterministic generator `js/power-gen.js` (`FBNPowerGen.generate`, same as the in-app recap),
run on these 64 picks with `assets/teams.js` (TEAMS_DATA.meta, built 2026-10-28): per school `p` preseason power rank, `s` projected seed, `c` conference, `r` last record.
- School score = mean of available parts (each 0..1): (101 − power rank)/100 and (17 − projected seed)/16; a school with neither scores 0.
- Roster strength = mean school score of all 8 schools × 100. Rank = strength, highest first (ties by name).
- Grade by rank: 1 A+, 2 A, 3 A-, 4 B+, 5 B, 6 B-, 7 C, 8 D.
- Text (s26c wording pass): hand-written per manager in `tools/stoopids-2026-27-text.js`, playful and accurate; every number is checked against teams.js meta and the picks, team names match the card headers. Grade, rank and strength come from the generator. A rough preseason guide, just for fun.
Regenerate: `node tools/gen_stoopids_import.js` (reads /workspace/ss-s26c/picks-2026-27-final.json; same output byte for byte).
