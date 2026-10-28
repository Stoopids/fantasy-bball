#!/usr/bin/env python3
"""Refresh data/scores.json and data/tournament.json (real data, never the demo files) from public scoreboards (no API key, Python standard library only).

Sources (public scoreboards):
  1. ESPN scoreboard   https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=YYYYMMDD&groups=50&limit=500
  2. fallback, per day  https://ncaa-api.henrygd.me/scoreboard/basketball-men/d1/<y>/<m>/<d>/all-conf   (names are matched to ids through assets/teams.js)
Only scores, dates, rounds and seeds are read. Games without a team from assets/teams.js are dropped.

Examples:
  python3 tools/refresh_data.py                              # season start .. today + 7 days
  python3 tools/refresh_data.py --start 2027-03-15 --end 2027-04-06 --merge   # update just a window, keep older games
  python3 tools/refresh_data.py --out /tmp/test-data         # write somewhere else first
  python3 tools/refresh_data.py --self-test                  # parse check on built-in sample payloads, no network
"""
import argparse, datetime as dt, json, os, re, sys, time, urllib.request, concurrent.futures as cf

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ESPN = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball"
NCAA_RELAY = "https://ncaa-api.henrygd.me"
ROUNDS = ["First Four", "1st Round", "2nd Round", "Sweet 16", "Elite 8", "Final Four", "National Championship"]
NCAA_ROUND = {"First Four": "First Four", "First Round": "1st Round", "Second Round": "2nd Round", "Sweet 16": "Sweet 16",
              "Elite Eight": "Elite 8", "Final Four": "Final Four", "National Championship": "National Championship"}


def log(*a):
    print(*a, file=sys.stderr)


def http_json(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "fantasy-bball-refresh/1"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as ex:
            last = ex
            time.sleep(1.5 * (i + 1))
    raise last


def load_pool():
    s = open(os.path.join(ROOT, "assets/teams.js"), encoding="utf-8").read()
    d = json.loads(s[s.index("{"):s.rindex("}") + 1])
    ids = {t[0] for t in d["teams"]}
    names = {}
    for t in d["teams"]:
        for n in (t[1], t[2]):
            names[norm(n)] = t[0]
    return ids, names


def norm(s):
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower().replace("&", "and").replace("state", "st"))


def status_of(e):
    n = e["status"]["type"]["name"]
    if n == "STATUS_FINAL":
        return "final"
    if n == "STATUS_SCHEDULED":
        return "scheduled"
    if n in ("STATUS_POSTPONED", "STATUS_CANCELED", "STATUS_SUSPENDED"):
        return None
    return "live"


def espn_game(e, day):
    c = e["competitions"][0]
    st = status_of(e)
    if st is None:
        return None
    stype = (e.get("season") or {}).get("type")
    if stype == 1:
        return None   # preseason / exhibition
    note = ((c.get("notes") or [{}])[0].get("headline") or "")
    rnd, kind = "", "reg"
    if stype == 3:
        if note.startswith("NCAA Men's Basketball Championship"):
            kind = "ncaa"
            rnd = note.split(" - ")[-1]
            if rnd not in ROUNDS:
                rnd = NCAA_ROUND.get(rnd, rnd)
        else:
            return None   # NIT and other postseason events are not scored
    elif c.get("tournamentId") and c.get("conferenceCompetition"):
        kind = "conf"
        rnd = note.split(" - ")[-1] if " - " in note else ""
    elif c.get("conferenceCompetition"):
        kind = "conf"
    comps = c.get("competitors") or []
    if len(comps) != 2:
        return None

    def side(x):
        t = x.get("team") or {}
        try:
            sc = int(x.get("score"))
        except Exception:
            sc = None
        seed = (x.get("curatedRank") or {}).get("current")
        return {"id": str(t.get("id")) if t.get("id") else None, "score": sc if st != "scheduled" else None,
                "seed": seed if (kind == "ncaa" and isinstance(seed, int) and 0 < seed < 99) else None, "short": t.get("shortDisplayName") or t.get("location")}
    home = next((x for x in comps if x.get("homeAway") == "home"), comps[0])
    away = next((x for x in comps if x.get("homeAway") == "away"), comps[1])
    return {"id": str(e["id"]), "day": day, "start": e.get("date"), "status": st, "kind": kind, "round": rnd,
            "neutral": bool(c.get("neutralSite")), "home": side(home), "away": side(away)}


def ncaa_games(j, day, names):
    out = []
    for item in j.get("games", []):
        g = item["game"]
        st = {"final": "final", "pre": "scheduled", "live": "live"}.get(g.get("gameState"))
        if not st:
            continue
        title = (g.get("championshipGame") or {}).get("round", {}).get("title", "")
        is_ncaa = title in NCAA_ROUND and "03-15" <= day[5:] <= "04-30"

        def side(x):
            nm = x["names"]["short"]
            try:
                sc = int(x.get("score"))
            except Exception:
                sc = None
            seed = int(x["seed"]) if is_ncaa and str(x.get("seed", "")).isdigit() else None
            return {"id": names.get(norm(nm)), "score": sc if st != "scheduled" else None, "seed": seed, "short": nm}
        start = None
        if str(g.get("startTimeEpoch", "")).isdigit():
            start = dt.datetime.fromtimestamp(int(g["startTimeEpoch"]), dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
        out.append({"id": "ncaa-" + str(g["gameID"]), "day": day, "start": start, "status": st, "kind": "ncaa" if is_ncaa else "reg",
                    "round": NCAA_ROUND.get(title, "") if is_ncaa else "", "neutral": False, "home": side(g["home"]), "away": side(g["away"])})
    return out


def fetch_day(day, names):
    try:
        d = http_json("%s/scoreboard?dates=%s&groups=50&limit=500" % (ESPN, day.replace("-", "")))
        return [g for g in (espn_game(e, day) for e in d.get("events", [])) if g], "espn"
    except Exception as ex:
        log("ESPN failed for", day, ex)
    y, m, d_ = day.split("-")
    j = http_json("%s/scoreboard/basketball-men/d1/%s/%s/%s/all-conf" % (NCAA_RELAY, y, m, d_))
    return ncaa_games(j, day, names), "ncaa"


def daterange(a, b):
    x, y = dt.date.fromisoformat(a), dt.date.fromisoformat(b)
    while x <= y:
        yield x.isoformat()
        x += dt.timedelta(1)


def trim(g, pool):
    """keep only games with a team from assets/teams.js"""
    ids = [g["home"]["id"], g["away"]["id"]]
    if not any(i in pool for i in ids) or None in ids:
        return None
    for s in (g["home"], g["away"]):
        if s["id"] in pool:
            s.pop("short", None)
    if g["home"]["score"] is not None and g["home"]["score"] == g["away"]["score"] and g["status"] == "final":
        return None
    return g


def build(games, year, season, as_of, src, extra_field=None):
    field = dict(extra_field or {})
    for g in games:
        if g["kind"] == "ncaa":
            for s in (g["home"], g["away"]):
                if s["seed"] is not None and s["id"] and s["id"] not in field:
                    field[s["id"]] = {"seed": s["seed"]}
    scores = {"format": 1, "sample": False, "label": "", "season": season, "as_of": as_of, "source": src, "games": games}
    tourney = {"format": 1, "sample": False, "label": "", "year": year, "as_of": as_of, "source": src, "field": field}
    return scores, tourney


def self_test():
    e = {"id": "1", "date": "2027-03-19T18:40Z", "season": {"type": 3}, "status": {"type": {"name": "STATUS_FINAL"}},
         "competitions": [{"neutralSite": True, "notes": [{"headline": "NCAA Men's Basketball Championship - East Region - 1st Round"}],
                           "competitors": [{"homeAway": "home", "score": "80", "winner": True, "curatedRank": {"current": 1}, "team": {"id": "150", "shortDisplayName": "Duke"}},
                                           {"homeAway": "away", "score": "70", "curatedRank": {"current": 16}, "team": {"id": "9999", "shortDisplayName": "Tiny"}}]}]}
    g = espn_game(e, "2027-03-19")
    assert g["kind"] == "ncaa" and g["home"]["seed"] == 1 and g["away"]["seed"] == 16 and g["status"] == "final", g
    e["competitions"][0]["notes"][0]["headline"] = "NCAA Men's Basketball Championship - Final Four"
    assert espn_game(e, "d")["round"] == "Final Four"
    e["status"]["type"]["name"] = "STATUS_POSTPONED"
    assert espn_game(e, "d") is None
    j = {"games": [{"game": {"gameID": "7", "gameState": "final", "startTimeEpoch": "1805000000", "championshipGame": {"round": {"title": "Sweet 16"}},
                             "home": {"names": {"short": "Duke"}, "score": "60", "seed": "1", "winner": True}, "away": {"names": {"short": "Iowa St."}, "score": "50", "seed": "4"}}}]}
    ng = ncaa_games(j, "2027-03-26", {"duke": "150", norm("Iowa St."): "66"})
    assert ng[0]["round"] == "Sweet 16" and ng[0]["home"]["id"] == "150" and ng[0]["away"]["id"] == "66" and ng[0]["away"]["seed"] == 4, ng
    sc, tn = build([g] , 2027, "2026-27", "2027-03-19", "test")
    assert tn["field"]["150"]["seed"] == 1
    print("self-test ok")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--year", type=int, help="season end year, e.g. 2027 for 2026-27 (default: from today)")
    ap.add_argument("--start", help="first day, YYYY-MM-DD (default Nov 1 of the season)")
    ap.add_argument("--end", help="last day (default today + 7 days, capped at Apr 15)")
    ap.add_argument("--out", default=os.path.join(ROOT, "data"), help="output folder (default data/)")
    ap.add_argument("--merge", action="store_true", help="keep games already in the output file that are outside the refreshed days")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    today = dt.date.today()
    year = a.year or (today.year + 1 if today.month >= 7 else today.year)
    start = a.start or "%d-11-01" % (year - 1)
    end = a.end or min(today + dt.timedelta(7), dt.date(year, 4, 15)).isoformat()
    pool, names = load_pool()
    days = list(daterange(start, end))
    log("refreshing %d days %s .. %s" % (len(days), start, end))
    games, srcs, failed = [], {}, []
    with cf.ThreadPoolExecutor(a.workers) as ex:
        futs = {ex.submit(fetch_day, d, names): d for d in days}
        for f in cf.as_completed(futs):
            d = futs[f]
            try:
                gs, src = f.result()
                srcs[src] = srcs.get(src, 0) + 1
                games += [g for g in (trim(x, pool) for x in gs) if g]
            except Exception as ex_:
                failed.append(d)
                log("FAILED", d, ex_)
    old_field = {}
    p_old = os.path.join(a.out, "scores.json")
    if a.merge and os.path.exists(p_old):
        old = json.load(open(p_old))
        keep = [g for g in old.get("games", []) if not (start <= g["day"] <= end)]
        games += keep
        try:
            old_field = json.load(open(os.path.join(a.out, "tournament.json"))).get("field", {})
        except Exception:
            pass
    seen, uniq = set(), []
    for g in sorted(games, key=lambda g: (g["day"], g.get("start") or "", g["id"])):
        if g["id"] not in seen:
            seen.add(g["id"])
            uniq.append(g)
    season = "%d-%02d" % (year - 1, year % 100)
    scores, tourney = build(uniq, year, season, min(today, dt.date.fromisoformat(end)).isoformat(), "espn" if srcs.get("espn") else "ncaa.com", old_field)
    os.makedirs(a.out, exist_ok=True)
    json.dump(scores, open(os.path.join(a.out, "scores.json"), "w"), separators=(",", ":"))
    json.dump(tourney, open(os.path.join(a.out, "tournament.json"), "w"), separators=(",", ":"))
    log("wrote %d games, %d teams in the tournament field; days from %s; failed days: %s" % (len(uniq), len(tourney["field"]), srcs, failed or "none"))
    if failed:
        log("Some days failed: run again (use --merge with --start/--end for just those days).")
        return 2


if __name__ == "__main__":
    sys.exit(main() or 0)
