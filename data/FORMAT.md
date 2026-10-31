# Data format for the league site

The league site (`league.html`) reads two static JSON files from this folder (and, for the DEMO link only, the same two files from `data/demo/`). Nothing is fetched from the internet by the site itself, so a maintainer refreshes the files (see `tools/refresh_data.py`) and commits them.

Team ids are **ESPN team ids as strings** (the same ids as `assets/teams.js`, for example `"150"` for Duke). A game that involves a team that nobody drafted is simply ignored.

## `data/scores.json`

```json
{
  "format": 1,
  "sample": false,
  "label": "",
  "season": "2026-27",
  "as_of": "2027-03-29",
  "source": "espn",
  "games": [
    {
      "id": "401700001",
      "day": "2027-03-19",
      "start": "2027-03-19T18:40Z",
      "status": "final",
      "kind": "ncaa",
      "round": "1st Round",
      "neutral": true,
      "home": { "id": "150", "score": 80, "seed": 1 },
      "away": { "id": "2641", "score": 70, "seed": 16 }
    }
  ]
}
```

| field | meaning |
|---|---|
| `sample` | `true` marks invented data. Files marked `sample` are **never shown for a real league**: the site ignores them and shows "Standings start when the season starts". Invented data lives only in `data/demo/` and is reachable only through the clearly marked DEMO link (`league.html?l=<id>&demo=1`). The files in `data/` that ship are empty (no games, no field). |
| `label` | free text. For sample files it starts with `SAMPLE`. |
| `as_of` | date (YYYY-MM-DD) the file was last refreshed, shown as "Scores as of". |
| `games[].day` | game date, YYYY-MM-DD. |
| `games[].start` | optional UTC start time, ISO text. Shown in the viewer's own time zone for upcoming games. |
| `games[].status` | `final`, `scheduled` or `live`. Postponed or canceled games are left out. Only `final` games with two different scores count. |
| `games[].kind` | `reg` regular season, `conf` conference game or conference tournament game, `ncaa` NCAA tournament. |
| `games[].round` | for `ncaa`: `First Four`, `1st Round`, `2nd Round`, `Sweet 16`, `Elite 8`, `Final Four`, `National Championship`. For conference tournaments: free text such as `Semifinals`. Empty otherwise. |
| `conf` | optional, written by `tools/refresh_data.py` (s26-refresh-conf): `{"<espnId>": {"conf": "acc", "confRegChamp": bool, "confTournChamp": bool, "confTournStarted": bool}}` for every school in `assets/teams.js`. Out of season every flag is `false`. Read by `S.confPoints` in `js/scoring.js`. Kept by `--merge`. |
| `home` / `away` | `id` (required), `score` (number or `null`), `seed` (number or `null`, only for `ncaa` games), optional `short` (display name, used only when the team is not in `assets/teams.js`). |
### Optional `conf` (conference titles, s26c7/s26c8)

A top-level `conf` object, keyed by ESPN team id (string). Leave it out (or `{}`) until conference titles are known; schools not listed simply score no conference points.

```json
"conf": {
  "150":  { "conf": "ACC", "confRegChamp": true,  "confTournChamp": false, "confTournStarted": true },
  "2509": { "conf": "B1G", "confRegChamp": false, "confTournChamp": true }
}
```

| field | meaning |
|---|---|
| `conf` | conference name or short code. Schools with the same value are one conference (used to tell whether its tournament has started). |
| `confRegChamp` | `true` = regular-season champion (the conference tournament's top seed). Scores `conf_reg` (+4) once, and **only once that conference tournament has started**: `confTournStarted` is `true`, or `confTournChamp` is `true`, or a `live`/`final` `kind:"conf"` game with a non-empty `round` involves a school of that conference. |
| `confTournChamp` | `true` = won the conference tournament. Scores `conf_tourn` (+4) once. |
| `confTournStarted` | optional `true` once the conference tournament has tipped off (otherwise it is read from the games). |

Points come from `js/scoring.js` (`S.POINTS.conf_reg`, `S.POINTS.conf_tourn`, via `S.confPoints`); the League total is `S.leagueTotals` = season wins x `S.SEASON_WIN` + NCAA tournament points + conference points.


## `data/tournament.json`

```json
{
  "format": 1,
  "sample": false,
  "label": "",
  "year": 2027,
  "as_of": "2027-03-16",
  "field": { "150": { "seed": 1, "region": "East" } },
  "points": { "win": 2 }
}
```

| field | meaning |
|---|---|
| `field` | every team in the NCAA tournament, by id, with its `seed` (1 to 16) and optional `region`. Needed so a school gets its "made the field" points before it plays, and so schools outside the field can be marked as missing it. Missing-the-field points are only applied once the list has 64 or more teams. |
| `points` | optional overrides of the point values (keys below). |

## Scoring rules (js/scoring.js)

**Full Season** = number of wins by a manager's schools in `reg` and `conf` games. Ties: higher win %, then higher point difference, then name. Managers that are still tied share a place.

**NCAA Tournament** (seeds only):

| event | points (key) |
|---|---|
| school is in the field | 5 (`entry`) |
| First Four win | 1 (`playin_win`) |
| each tournament win after the First Four | 2 (`win`) |
| upset: the winner's seed number is higher than the loser's seed number (equal seeds are not an upset, First Four games are not judged) | +4 (`upset`) |
| reached the Final Four (once per school) | +3 (`final4`) |
| national champion | +4 (`champ`) |
| missed the field (only when the field has 64+ teams) | -1 (`missed`) |

Ties: more upsets, then more wins, then name.


**Conference titles** (from the optional `conf` map above): regular-season champion +4 (`conf_reg`, once its conference tournament has started), conference tournament champion +4 (`conf_tourn`).

**League total** (Standings, s26c8) = Full Season wins x 1 (`S.SEASON_WIN`) + NCAA Tournament points + conference points (`S.leagueTotals`). Ties: more wins, then win %, then point difference, then name; still tied = shared place. Losses score nothing.
The point values are fixed in `js/scoring.js` (seed-based scoring only) and can be overridden with a `points` object in `data/tournament.json`.
