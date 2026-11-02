#!/usr/bin/env python3
"""Fantasy BBALL NCAA - auto refresh job (STAGED ONLY).

Refreshes the data the app reads (game scores, conference standings, AP / NET / KenPom / STOOPID ranks
for the 365 schools in assets/teams.js) into a STAGING folder. It never writes to the base tree, a release
folder, the upload folder, or any git working tree (incl. the STOOPIDS repo), and it never touches any
textdb key. Python 3 standard library only, no keys, no secrets.

  python3 refresh_job.py                       # = --dry-run: writes ./out-dryrun/ + prints a diff summary
  python3 refresh_job.py --only ranks          # only one part (scores | standings | ranks; repeatable / comma list)
  python3 refresh_job.py --no-dry-run --out /tmp/stage   # write candidate files to an explicit staging folder
  python3 refresh_job.py --stoopids            # also write STOOPIDS-shaped files to <out>/stoopids-staging/

Output layout (mirrors the app tree so files can be compared 1:1):
  <out>/data/scores.json, <out>/data/tournament.json   (FORMAT.md format, built by the vendored s27 refresh_data.py)
  <out>/data/net.json                                   (same keys as today: format, source, label, through, fetched, note, ranks[{rank,id,school,conf}])
  <out>/assets/teams.js                                 (same file; only meta.o (KenPom rank) is replaced when a fresh KenPom table is read)
  <out>/extra/ranks.json, <out>/extra/standings.json    (NEW, proposals for League Site, not read by the app today)
  <out>/DIFF.md, <out>/report.json
"""
import argparse, datetime as dt, hashlib, html, json, os, re, sys, threading, time, urllib.request, urllib.error
import concurrent.futures as cf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "vendor"))
import refresh_data_s27 as RD  # unchanged copy of s27 tools/refresh_data.py (md5 6559e8a1...)

DEFAULT_BASE = "/workspace/fantasy-bball-releases/s27"
N_TEAMS = 365
UA = "fantasy-bball-refresh-job/1 (+static app data refresh; contact via repo)"
ESPN = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball"
ESPN_RANKINGS = ESPN + "/rankings"
ESPN_STANDINGS = "https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings?group=50&season=%d"
NET_JSON = "https://ncaa-api.henrygd.me/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings"  # public relay of NCAA.com
NET_PAGE = "https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings"
KENPOM = "https://kenpom.com/"
FORBIDDEN = ["/workspace/fantasy-bball-upload", "/workspace/fantasy-bball-releases", "/workspace/stoopids_pub",
             "/workspace/stoopids", "/workspace/league-site-work"]

# ---------------------------------------------------------------- polite HTTP
_lock = threading.Lock()
_last = {}
MIN_GAP = float(os.environ.get("REFRESH_MIN_GAP", "0.35"))  # seconds between requests to the same host (league mode: 1.0, serial)


def http_get(url, tries=3, timeout=25, as_json=True):
    host = url.split("/")[2]
    last = None
    for i in range(tries):
        with _lock:
            wait = _last.get(host, 0) + MIN_GAP - time.time()
            _last[host] = time.time() + max(0, wait)
        if wait > 0:
            time.sleep(wait)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json,text/html"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                b = r.read().decode("utf-8", "replace")
            return json.loads(b) if as_json else b
        except urllib.error.HTTPError as ex:
            last = ex
            if ex.code in (401, 403, 404):
                break  # blocked / not there: do not hammer
            time.sleep(2.0 * (i + 1) + (int(ex.headers.get("Retry-After", "0") or 0) if ex.code == 429 else 0))
        except Exception as ex:
            last = ex
            time.sleep(2.0 * (i + 1))
    raise last


RD.http_json = lambda url, tries=3: http_get(url, tries)  # vendored code uses our polite client


def log(*a):
    print(*a, file=sys.stderr)


def md5(path):
    try:
        return hashlib.md5(open(path, "rb").read()).hexdigest()
    except OSError:
        return None


# ---------------------------------------------------------------- base tree (read-only)
def load_teams(base):
    s = open(os.path.join(base, "assets", "teams.js"), encoding="utf-8").read()
    pre, body = s.split("window.TEAMS_DATA=", 1)
    return pre, json.loads(body.rstrip().rstrip(";")), s


def dump_teams(pre, D):
    return pre + "window.TEAMS_DATA=" + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n"


def load_json(path, default=None):
    try:
        return json.load(open(path, encoding="utf-8"))
    except Exception:
        return default


# ---------------------------------------------------------------- name matching (same rules as tools/kenpom_rank.py)
KP_ALIAS = {'Connecticut': '41', 'Miami FL': '2390', 'Mississippi': '145', 'N.C. State': '152', 'Seattle': '2547',
            'Illinois Chicago': '82', 'San Jose St.': '23', 'Sam Houston St.': '2534', 'Queens': '2511',
            'Texas A&M Corpus Chris': '357', 'Cal Baptist': '2856', 'Appalachian St.': '2026', 'Southeastern Louisiana': '2545',
            'Nebraska Omaha': '2437', 'Southeast Missouri': '2546', 'Tennessee Martin': '2630', 'Grambling St.': '2755',
            'Louisiana Monroe': '2433', 'USC Upstate': '2908', 'Albany': '399', 'LIU': '112358'}


def knorm(s):
    s = html.unescape(s).lower().replace('&', ' and ').replace("'", '').replace('.', ' ')
    s = re.sub(r'\bst\b', 'state', s); s = re.sub(r'\bsaint\b', 'st', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


NET_ABBR = {"fla": "florida", "ill": "illinois", "colo": "colorado", "ark": "arkansas", "caro": "carolina", "mich": "michigan",
            "conn": "connecticut", "ky": "kentucky", "la": "louisiana", "ga": "georgia", "ariz": "arizona", "ala": "alabama",
            "ind": "indiana", "mo": "missouri", "wash": "washington", "val": "valley", "col": "college", "u": "", "university": ""}
NET_ALIAS = {"St. Thomas (MN)": "2900", "UTRGV": "292", "LMU (CA)": "2351", "A&M-Corpus Christi": "357", "Queens (NC)": "2511",
             "N.C. A&T": "2448", "N.C. Central": "2428", "Southern U.": "2582", "Army West Point": "349", "Alcorn": "2016",
             "CSU Bakersfield": "2934", "New Orleans": "2443", "Southeast Mo. St.": "2546",
             "Ark.-Pine Bluff": "2029", "Mississippi Val.": "2400", "Lamar University": "2320", "New Orleans": "2443",
             "Col. of Charleston": "232", "Central Conn. St.": "2115", "Southeastern La.": "2545"}
NEW_D1 = {"2697"}  # in the pool but not in the 2025-26 NET (new to D1); allowed to have no NET rank until the 2026-27 NET is out
NET_NOT_IN_POOL = {"Saint Francis"}  # left D1 after 2025-26 (NCAA name); rows ignored


def nnorm(s):
    k = knorm(s.strip())
    return " ".join(w for w in (NET_ABBR.get(x, x) for x in k.split()) if w)


def name_index(D, extra=None):
    idx = {}
    for t in D["teams"]:
        for k in {knorm(x) for x in t[1:4]}:
            idx.setdefault(k, set()).add(t[0])
    for nm, tid in (extra or {}).items():
        idx.setdefault(knorm(nm), set()).add(tid)
    return idx


def match_rows(rows, D, alias, extra=None, fuzzy=False, allow_missing=()):
    """rows [(rank, name)] -> ({id: rank}, problems). Every row must map to exactly one pool id and every pool id once."""
    idx, pool = name_index(D, extra), [t[0] for t in D["teams"]]
    out, probs, seen = {}, [], {}
    for rk, nm in rows:
        nm = nm.strip()
        ids = [alias[nm]] if nm in alias else sorted(idx.get(knorm(nm), []) or (idx.get(nnorm(nm), []) if fuzzy else []))
        if len(ids) != 1:
            probs.append("unmatched #%s %s %s" % (rk, nm, ids or "")); continue
        if ids[0] in seen:
            probs.append("duplicate %s <- %s and %s" % (ids[0], seen[ids[0]], nm)); continue
        seen[ids[0]] = nm; out[ids[0]] = rk
    probs += ["pool id without a rank: %s" % t for t in pool if t not in out and t not in allow_missing]
    return out, probs


# ---------------------------------------------------------------- sources
def parse_kenpom_html(s):
    rows = re.findall(r'<td class="hard_left">(\d+)</td><td class="next_left"><a href="team\.php\?team=[^"]*">([^<]+)</a>', s)
    return [(int(r), html.unescape(n).strip()) for r, n in rows]


def fetch_kenpom(D, src_file):
    """KenPom free ratings table (kenpom.com front page). KenPom sits behind a bot check; if the page is blocked or
    unreadable we fall back to a hand-saved table (--kenpom-src, kenpom_o.json or kenpom.html) and say so."""
    note, rows = "", []
    try:
        rows = parse_kenpom_html(http_get(KENPOM, tries=1, as_json=False))
        note = "kenpom.com (live)"
    except Exception as ex:
        note = "kenpom.com blocked/unreachable (%s)" % (getattr(ex, "code", None) or type(ex).__name__)
    if len(rows) < 300 and src_file and os.path.exists(src_file):
        if src_file.endswith(".json"):
            rows = [(int(r["rank"]), r["team"]) for r in json.load(open(src_file, encoding="utf-8"))]
        else:
            rows = parse_kenpom_html(open(src_file, encoding="utf-8", errors="replace").read())
        note += "; used saved file %s (mtime %s)" % (src_file, dt.datetime.fromtimestamp(os.path.getmtime(src_file)).strftime("%Y-%m-%d %H:%M"))
    elif len(rows) < 300:
        note += "; page parsed %d rows" % len(rows)
        return None, note, []
    ranks, probs = match_rows(rows, D, KP_ALIAS)
    return ranks, note, probs


def fetch_net(D, base_net):
    j = http_get(NET_JSON)
    rows = [(int(r["Rank"]), r["School"].strip()) for r in j.get("data", []) if str(r.get("Rank", "")).isdigit() and r["School"].strip() not in NET_NOT_IN_POOL]
    extra = {r.get("school"): r.get("id") for r in (base_net or {}).get("ranks", []) if r.get("school")}  # NCAA spellings already staged by hand
    alias = dict(KP_ALIAS); alias.update(NET_ALIAS); alias.update({k: v for k, v in extra.items() if k})
    ranks, probs = match_rows(rows, D, alias, extra, fuzzy=True, allow_missing=NEW_D1)
    through = j.get("updated", "")
    m = re.search(r"(\w{3})\.? (\d{1,2}),? (\d{4})", through)
    iso = ""
    if m:
        try:
            iso = dt.datetime.strptime("%s %s %s" % m.groups(), "%b %d %Y").date().isoformat()
        except ValueError:
            pass
    return ranks, {r[1]: r[0] for r in rows}, iso, through, probs


def parse_ap(j):
    p = next((x for x in (j or {}).get("rankings", []) if x and x.get("type") == "ap"), None)
    if not p:
        return {}, ""
    m = {}
    for x in p.get("ranks", []):
        tid, r = str((x.get("team") or {}).get("id") or ""), x.get("current")
        if isinstance(r, int) and 1 <= r <= 25 and tid and tid not in m:
            m[tid] = r
    return m, (p.get("date") or "")[:10]


def parse_standings_full(d):
    out = {}
    for ch in (d or {}).get("children") or []:
        conf = (ch.get("abbreviation") or "").lower()
        for e in ((ch.get("standings") or {}).get("entries")) or []:
            tid = str(((e.get("team") or {}).get("id")) or "")
            if not tid:
                continue
            g = lambda t: int(RD._stat(e, t) or 0)
            out[tid] = {"conf": conf, "w": g("wins"), "l": g("losses"), "confW": g("vsconf_wins"), "confL": g("vsconf_losses")}
    return out


# ---------------------------------------------------------------- STOOPID rank (mirror of js/core.js F.blendScore / F.blendRank)
def blend_rank(META, wo=0.5):
    ids = [t for t in META if isinstance(META[t], dict)]
    num = lambda v: float(v) if isinstance(v, (int, float)) or (isinstance(v, str) and re.match(r"^-?\d+(\.\d+)?$", v)) else 0.0
    maxP = max([num(META[t].get("p")) for t in ids if num(META[t].get("p")) > 0] or [0])

    def score(m):
        p, o = num(m.get("p")), num(m.get("o"))
        oo = o if o > 0 else (366 + p if p > 0 else 999)
        pp = p if p > 0 else maxP + oo
        return wo * oo + (1 - wo) * pp
    o_of = lambda t: num(META[t].get("o")) if num(META[t].get("o")) > 0 else 999
    order = sorted(ids, key=lambda t: (0 if num(META[t].get("p")) > 0 else 1, score(META[t]), o_of(t), t))
    return {t: i + 1 for i, t in enumerate(order)}


# ---------------------------------------------------------------- validation
def pct(n, d):
    return 100.0 * n / d if d else 0.0


def validate(cand, base, D, max_pct, move):
    errs, notes = [], []
    pool = [t[0] for t in D["teams"]]
    if len(pool) != N_TEAMS or len(set(pool)) != N_TEAMS:
        errs.append("teams.js has %d rows (%d unique), expected %d" % (len(pool), len(set(pool)), N_TEAMS))
    for t in D["teams"]:
        if len(t) != 8 or not all(isinstance(x, str) for x in t[:4]):
            errs.append("teams.js row malformed: %s" % t[:2]); break
    meta = D.get("meta") or {}
    if len(meta) != N_TEAMS or any(not isinstance(meta.get(t), dict) or "c" not in meta[t] or not (int(meta[t].get("o") or 0) > 0) for t in pool):
        errs.append("teams.js meta must have %d rows with c and o" % N_TEAMS)
    os_ = sorted(int(meta[t]["o"]) for t in pool if isinstance(meta.get(t), dict) and meta[t].get("o"))
    if os_ != list(range(1, N_TEAMS + 1)):
        errs.append("meta.o is not a 1..%d permutation" % N_TEAMS)
    sc = cand.get("scores")
    if sc is not None:
        for k in ("format", "season", "as_of", "games", "conf"):
            if k not in sc:
                errs.append("scores.json missing %s" % k)
        for g in sc.get("games", []):
            if not (g.get("id") and g.get("day") and g.get("status") in ("final", "scheduled", "live") and g.get("kind") in ("reg", "conf", "ncaa")
                    and (g.get("home") or {}).get("id") and (g.get("away") or {}).get("id")):
                errs.append("game missing required fields: %s" % g.get("id")); break
        conf = sc.get("conf") or {}
        if len(conf) != N_TEAMS or any(set(v) != {"conf", "confRegChamp", "confTournChamp", "confTournStarted"} for v in conf.values()):
            errs.append("scores.json conf must have %d rows with conf/confRegChamp/confTournChamp/confTournStarted (has %d)" % (N_TEAMS, len(conf)))
        nb = sum(1 for v in conf.values() if not v["conf"])
        if nb:
            errs.append("%d schools have no conference" % nb)
        old = {g["id"]: g for g in (base.get("scores") or {}).get("games", []) if g.get("status") == "final"}
        new = {g["id"]: g for g in sc.get("games", [])}
        changed = sum(1 for i, g in old.items() if i not in new or (new[i]["home"]["score"], new[i]["away"]["score"]) != (g["home"]["score"], g["away"]["score"]))
        if old and pct(changed, len(old)) > max_pct:
            errs.append("%d of %d final games vanished or changed score (%.1f%% > %s%%)" % (changed, len(old), pct(changed, len(old)), max_pct))
        oc = (base.get("scores") or {}).get("conf") or {}
        if oc:
            cc = sum(1 for t in conf if t in oc and oc[t].get("conf") != conf[t]["conf"])
            if pct(cc, len(oc)) > max_pct:
                errs.append("%.1f%% of schools changed conference (> %s%%)" % (pct(cc, len(oc)), max_pct))
    net = cand.get("net")
    if net is not None:
        rows = net.get("ranks", [])
        ids = [r.get("id") for r in rows]
        miss = set(pool) - set(ids)
        if len(set(ids)) != len(ids) or not set(ids) <= set(pool) or (miss - NEW_D1) or len(rows) + len(miss) != N_TEAMS:
            errs.append("net.json must have one row per pool school (%d rows + %d allowed new-D1 = %d, expected %d)" % (len(rows), len(miss & NEW_D1), len(rows) + len(miss), N_TEAMS))
        if any(not (isinstance(r.get("rank"), int) and r.get("id") and r.get("school")) for r in rows):
            errs.append("net.json row missing rank/id/school")
        ob = {r["id"]: r["rank"] for r in (base.get("net") or {}).get("ranks", [])}
        if net.get("through") != (base.get("net") or {}).get("through"):
            mv = sum(1 for r in rows if r["id"] in ob and abs(r["rank"] - ob[r["id"]]) > move)
            if ob and pct(mv, len(ob)) > max_pct:
                errs.append("NET: %d of %d schools moved > %d places (%.1f%% > %s%%)" % (mv, len(ob), move, pct(mv, len(ob)), max_pct))
    if cand.get("old_o"):
        oo = cand["old_o"]
        mv = sum(1 for t in pool if abs(int(meta[t]["o"]) - int(oo.get(t) or 0)) > move)
        if pct(mv, N_TEAMS) > max_pct:
            errs.append("KenPom: %d of %d schools moved > %d places (%.1f%% > %s%%)" % (mv, N_TEAMS, move, pct(mv, N_TEAMS), max_pct))
    rk = cand.get("ranks")
    if rk is not None:
        if len(rk.get("teams", [])) != N_TEAMS:
            errs.append("ranks.json must have %d rows" % N_TEAMS)
        for r in rk.get("teams", []):
            if not all(k in r for k in ("id", "school", "ap", "net", "kenpom", "stoopid", "stoopidBlend")):
                errs.append("ranks.json row missing fields: %s" % r.get("id")); break
    return errs, notes


# ---------------------------------------------------------------- safety
def check_out(out, base):
    p = os.path.realpath(out)
    bad = [os.path.realpath(base)] + [os.path.realpath(x) for x in FORBIDDEN]
    for b in bad:
        if p == b or p.startswith(b + os.sep):
            raise SystemExit("refusing to write to %s (inside %s: release/upload/League/STOOPIDS tree)" % (out, b))
    d = p
    while d and d != os.path.dirname(d):
        if os.path.exists(os.path.join(d, ".git")):
            raise SystemExit("refusing to write to %s (inside a git working tree %s)" % (out, d))
        d = os.path.dirname(d)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write(text)


# ---------------------------------------------------------------- main
def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", dest="dry", action="store_true", default=True, help="(default) write to the staging dir and print a diff summary")
    g.add_argument("--no-dry-run", dest="dry", action="store_false", help="write candidate files to --out (required); still never a release/live folder")
    ap.add_argument("--out", help="staging folder (default: <job>/out-dryrun)")
    ap.add_argument("--base", default=DEFAULT_BASE, help="current app tree to read (read-only)")
    ap.add_argument("--only", action="append", help="scores, standings, ranks (repeat or comma list; default all)")
    ap.add_argument("--start", help="first scoreboard day (default: Nov 1 of the season)")
    ap.add_argument("--end", help="last scoreboard day (default: today + 7, capped at Apr 15)")
    ap.add_argument("--max-change-pct", type=float, default=20.0, help="refuse to write when more than this %% of rows changed suddenly")
    ap.add_argument("--rank-move", type=int, default=40, help="a rank move bigger than this counts as a sudden change")
    ap.add_argument("--allow-big-change", action="store_true", help="skip the sudden-change check (e.g. the day a new-season NET appears)")
    ap.add_argument("--kenpom-src", default="/workspace/kenpom/kenpom_o.json", help="saved KenPom table used if kenpom.com is blocked")
    ap.add_argument("--stoopids", action="store_true", help="also write STOOPIDS-shaped files to <out>/stoopids-staging/ (files only)")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--league-only", action="store_true", help="League GitHub Actions mode: serial requests (1 worker, >=1.0 s gap), no KenPom fetch, writes ONLY data/scores.json, data/tournament.json, data/net.json (never assets/teams.js, extra/, stoopids-staging/; meta.p / meta.r untouched)")
    a = ap.parse_args(argv)
    only = {x.strip() for o in (a.only or ["scores,standings,ranks"]) for x in o.split(",") if x.strip()}
    if only - {"scores", "standings", "ranks"}:
        ap.error("--only takes scores, standings, ranks")
    if not a.dry and not a.out:
        ap.error("--no-dry-run needs an explicit --out staging folder")
    out = a.out or os.path.join(HERE, "out-dryrun")
    global MIN_GAP
    if a.league_only:
        a.workers, a.stoopids = 1, False
        MIN_GAP = max(MIN_GAP, 1.0)
    check_out(out, a.base)

    pre, D, teams_src = load_teams(a.base)
    pool = [t[0] for t in D["teams"]]
    school = {t[0]: t[1] for t in D["teams"]}
    base = {"scores": load_json(os.path.join(a.base, "data/scores.json"), {}), "net": load_json(os.path.join(a.base, "data/net.json"), {}),
            "tournament": load_json(os.path.join(a.base, "data/tournament.json"), {})}
    today = dt.date.today()
    year = today.year + 1 if today.month >= 7 else today.year
    season = "%d-%02d" % (year - 1, year % 100)
    report = {"job": "fantasy-bball refresh-job", "ran_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
              "mode": "dry-run" if a.dry else "stage", "only": sorted(only), "season": season, "sources": {}, "warnings": []}
    cand = {}
    scores = dict(base["scores"]) if base["scores"] else None
    tourney = None

    if "scores" in only:
        start = a.start or "%d-11-01" % (year - 1)
        end = a.end or min(today + dt.timedelta(7), dt.date(year, 4, 15)).isoformat()
        days = list(RD.daterange(start, end))
        games, srcs, failed = [], {}, []
        RD.ROOT = a.base
        pset, names = RD.load_pool()
        with cf.ThreadPoolExecutor(a.workers) as ex:
            futs = {ex.submit(RD.fetch_day, d, names): d for d in days}
            for f in cf.as_completed(futs):
                try:
                    gs, src = f.result(); srcs[src] = srcs.get(src, 0) + 1
                    games += [x for x in (RD.trim(y, pset) for y in gs) if x]
                except Exception as ex_:
                    failed.append(futs[f]); log("FAILED", futs[f], ex_)
        if failed:
            report["warnings"].append("scoreboard days failed: %s" % sorted(failed))
        keep = [x for x in (base["scores"] or {}).get("games", []) if not (start <= x["day"] <= end)]
        seen, uniq = set(), []
        for x in sorted(games + keep, key=lambda x: (x["day"], x.get("start") or "", x["id"])):
            if x["id"] not in seen:
                seen.add(x["id"]); uniq.append(x)
        old_conf = (base["scores"] or {}).get("conf") or {}
        scores, tourney = RD.build(uniq, year, season, min(today, dt.date.fromisoformat(end)).isoformat(), "espn" if srcs.get("espn") else "ncaa.com",
                                   (base["tournament"] or {}).get("field", {}), RD.build_conf(set(pool), uniq, None, old_conf))
        report["sources"]["scores"] = {"url": ESPN + "/scoreboard?dates=YYYYMMDD&groups=50&limit=500 (fallback ncaa-api.henrygd.me)",
                                       "days": "%s..%s (%d)" % (start, end, len(days)), "by_source": srcs, "failed_days": sorted(failed)}

    std = None
    if "standings" in only or "scores" in only:
        try:
            raw = http_get(ESPN_STANDINGS % year)
            std = parse_standings_full(raw)
            if scores is None or "games" not in scores:
                scores = {"format": 1, "sample": False, "label": "", "season": season, "as_of": today.isoformat(), "source": "espn", "games": [], "conf": {}}
            scores = dict(scores)
            scores["sample"] = False; scores.setdefault("label", ""); scores.setdefault("source", "espn")
            if not scores.get("as_of"):
                scores["as_of"] = today.isoformat()
            scores["conf"] = RD.build_conf(set(pool), scores.get("games", []), RD.parse_standings(raw), (base["scores"] or {}).get("conf") or {})
            report["sources"]["standings"] = {"url": ESPN_STANDINGS % year, "teams": len(std), "pool_matched": sum(1 for t in pool if t in std)}
        except Exception as ex:
            report["warnings"].append("standings fetch failed: %s" % ex)
    if scores is not None and ("scores" in only or "standings" in only):
        cand["scores"] = scores

    ap_rank, ap_date, net_rank, kp = {}, "", None, None
    if "ranks" in only:
        try:
            ap_rank, ap_date = parse_ap(http_get(ESPN_RANKINGS))
            report["sources"]["ap"] = {"url": ESPN_RANKINGS, "poll_date": ap_date, "ranked": len(ap_rank), "pool_matched": sum(1 for t in ap_rank if t in school)}
        except Exception as ex:
            report["warnings"].append("AP fetch failed: %s" % ex)
        try:
            net_rank, _, through, upd, probs = fetch_net(D, base["net"])
            report["sources"]["net"] = {"url": NET_JSON, "mirrors": NET_PAGE, "updated": upd, "matched": len(net_rank), "problems": probs}
            if probs:
                report["warnings"].append("NET name matching problems: %s" % probs[:10]); net_rank = None
            else:
                same = through and through == base["net"].get("through")
                n = {"format": 1, "source": NET_PAGE,
                     "label": base["net"].get("label") if same else "NCAA NET (through games %s)" % upd.replace("Through Games ", ""),
                     "through": through or base["net"].get("through"), "fetched": today.isoformat(),
                     "note": "Staged copy of NCAA.com NET via the public ncaa-api relay (NCAA.com sends no CORS header). %d of the %d schools in the app's pool (schools new to D1 have no NET yet). Written by refresh-job; candidate only." % (len(net_rank), N_TEAMS),
                     "ranks": [{"rank": net_rank[t], "id": t, "school": school[t]} for t in sorted(net_rank, key=lambda t: net_rank[t])]}
                oldsch = {r["id"]: r["school"] for r in base["net"].get("ranks", [])}
                for r in n["ranks"]:
                    r["school"] = oldsch.get(r["id"], r["school"])  # keep the NCAA spelling already staged where we have it
                cand["net"] = n
        except Exception as ex:
            report["warnings"].append("NET fetch failed: %s" % ex)
        kp, note, probs = (None, "skipped in --league-only (meta.o lives in assets/teams.js, not committed by the job)", []) if a.league_only else fetch_kenpom(D, a.kenpom_src)
        report["sources"]["kenpom"] = {"url": KENPOM, "note": note, "problems": probs}
        if kp and not probs:
            cand["old_o"] = {t: D["meta"][t].get("o") for t in pool}
            for t in pool:
                D["meta"][t]["o"] = kp[t]
        else:
            if not a.league_only: report["warnings"].append("KenPom not refreshed (meta.o kept): %s %s" % (note, probs[:5]))
    if "net" in cand and scores is not None and scores.get("conf"):
        RD.annotate_net(cand["net"], scores["conf"])

    meta = D["meta"]
    br = blend_rank(meta, 0.5)
    net_now = {r["id"]: r["rank"] for r in (cand.get("net") or base["net"] or {}).get("ranks", [])}
    if "ranks" in only:
        cand["ranks"] = {"format": 1, "as_of": today.isoformat(), "apPollDate": ap_date,
                         "note": "stoopid = meta.p (hand-set STOOPID rank, unchanged by this job); stoopidBlend = js/core.js F.blendRank(meta, 0.5) (50/50 KenPom/STOOPID); kenpom = meta.o",
                         "teams": [{"id": t, "school": school[t], "ap": ap_rank.get(t), "net": net_now.get(t), "kenpom": meta[t].get("o"),
                                    "stoopid": meta[t].get("p"), "stoopidBlend": br[t]} for t in sorted(pool, key=lambda t: br[t])]}
    if std is not None:
        cand["standings"] = {"format": 1, "season": season, "as_of": today.isoformat(), "source": "espn",
                             "teams": {t: std.get(t, {"conf": "", "w": 0, "l": 0, "confW": 0, "confL": 0}) for t in sorted(pool)}}

    errs, _ = validate(cand, base, D, 1e9 if a.allow_big_change else a.max_change_pct, a.rank_move)
    if std is not None and sum(1 for t in pool if t in std) != N_TEAMS:
        errs.append("standings matched %d of %d pool schools" % (sum(1 for t in pool if t in std), N_TEAMS))
    report["validation"] = {"ok": not errs, "errors": errs, "max_change_pct": a.max_change_pct, "rank_move": a.rank_move}

    # ------------------------------------------------ write (only when valid)
    files = {}
    if cand.get("scores") is not None:
        files["data/scores.json"] = json.dumps(cand["scores"], separators=(",", ":"))
    if tourney is not None:
        files["data/tournament.json"] = json.dumps(tourney, separators=(",", ":"))
    if "net" in cand:
        files["data/net.json"] = json.dumps(cand["net"], separators=(",", ":"), ensure_ascii=False)
    if "ranks" in only:
        files["assets/teams.js"] = dump_teams(pre, D)
        files["extra/ranks.json"] = json.dumps(cand["ranks"], indent=1, ensure_ascii=False)
    if "standings" in cand:
        files["extra/standings.json"] = json.dumps(cand["standings"], indent=1)
    if a.stoopids and cand.get("scores") is not None:
        sg = []
        for x in cand["scores"]["games"]:
            y = json.loads(json.dumps(x))
            hs, as_ = y["home"].get("score"), y["away"].get("score")
            for s, o in ((y["home"], as_), (y["away"], hs)):
                s.setdefault("short", school.get(s["id"], s.get("short") or s["id"]))
                s["win"] = bool(y["status"] == "final" and isinstance(s.get("score"), int) and isinstance(o, int) and s["score"] > o)
            sg.append(y)
        files["stoopids-staging/games.json"] = json.dumps({"season": season, "as_of": cand["scores"].get("as_of"), "games": sg}, separators=(",", ":"))
        if std is not None:
            files["stoopids-staging/records.json"] = json.dumps(cand["standings"]["teams"], indent=0)
        if "ranks" in cand:
            files["stoopids-staging/ranks.json"] = json.dumps({r["id"]: {k: r[k] for k in ("ap", "net", "kenpom", "stoopidBlend")} for r in cand["ranks"]["teams"]}, indent=0)

    if a.league_only:
        files = {k: v for k, v in files.items() if k in ("data/scores.json", "data/tournament.json", "data/net.json")}
    diff = diff_summary(files, a.base, cand, base, teams_src)
    report["diff"] = diff
    os.makedirs(out, exist_ok=True)
    if errs:
        report["written"] = []
        log("VALIDATION FAILED - no data files written:\n  " + "\n  ".join(errs))
    else:
        for rel, txt in files.items():
            write(os.path.join(out, rel), txt)
        report["written"] = sorted(files)
    write(os.path.join(out, "report.json"), json.dumps(report, indent=1, ensure_ascii=False))
    md = render_md(report)
    write(os.path.join(out, "DIFF.md"), md)
    print(md)
    return 1 if errs else 0


def diff_summary(files, basedir, cand, base, teams_src):
    d = {}
    for rel, txt in sorted(files.items()):
        bp = os.path.join(basedir, rel)
        new = hashlib.md5(txt.encode("utf-8")).hexdigest()
        d[rel] = {"base_md5": md5(bp), "new_md5": new, "same": md5(bp) == new, "base_bytes": os.path.getsize(bp) if os.path.exists(bp) else None, "new_bytes": len(txt.encode("utf-8"))}
    if cand.get("scores") is not None:
        ob = {g["id"]: g for g in (base["scores"] or {}).get("games", [])}
        nw = {g["id"]: g for g in cand["scores"]["games"]}
        st = {}
        for g in nw.values():
            st[g["status"]] = st.get(g["status"], 0) + 1
        d["scores"] = {"games_base": len(ob), "games_new": len(nw), "added": len(set(nw) - set(ob)), "removed": len(set(ob) - set(nw)),
                       "changed": sum(1 for i in set(nw) & set(ob) if nw[i] != ob[i]), "by_status": st,
                       "conf_rows_base": len((base["scores"] or {}).get("conf") or {}), "conf_rows_new": len(cand["scores"].get("conf") or {}),
                       "reg_champs": sum(1 for v in (cand["scores"].get("conf") or {}).values() if v["confRegChamp"])}
    if "net" in cand:
        ob = {r["id"]: r["rank"] for r in base["net"].get("ranks", [])}
        nr = {r["id"]: r["rank"] for r in cand["net"]["ranks"]}
        d["net"] = {"rows_base": len(ob), "rows_new": len(nr), "added": len(set(nr) - set(ob)), "rank_changed": sum(1 for t in ob if t in nr and nr[t] != ob[t]),
                    "through_base": base["net"].get("through"), "through_new": cand["net"]["through"]}
    if cand.get("old_o"):
        D = json.loads(teams_src.split("window.TEAMS_DATA=", 1)[1].rstrip().rstrip(";"))
        mv = [abs(int(D["meta"][t]["o"]) - int(cand["old_o"][t])) for t in cand["old_o"]]
        d["kenpom"] = {"changed": sum(1 for m in mv if m), "max_move": max(mv or [0])}
    if "ranks" in cand:
        r = cand["ranks"]["teams"]
        d["ranks"] = {"rows": len(r), "ap_ranked": sum(1 for x in r if x["ap"]), "net_ranked": sum(1 for x in r if x["net"]),
                      "stoopid_p_ranked": sum(1 for x in r if x["stoopid"]), "top10_blend": [x["school"] for x in r[:10]]}
    return d


def render_md(rp):
    L = ["# refresh-job %s (%s, only=%s)" % (rp["ran_at"], rp["mode"], ",".join(rp["only"])), "",
         "Validation: **%s**" % ("OK" if rp["validation"]["ok"] else "FAILED - nothing written")]
    L += ["- " + e for e in rp["validation"]["errors"]]
    L += ["", "## Sources"] + ["- %s: %s" % (k, json.dumps(v, ensure_ascii=False)) for k, v in rp["sources"].items()]
    if rp["warnings"]:
        L += ["", "## Warnings"] + ["- " + w for w in rp["warnings"]]
    L += ["", "## Files vs base", "", "| file | base md5 | new md5 | same | bytes base -> new |", "|---|---|---|---|---|"]
    for k, v in rp["diff"].items():
        if "/" in k:
            L.append("| %s | %s | %s | %s | %s -> %s |" % (k, (v["base_md5"] or "(none)")[:8], v["new_md5"][:8], "yes" if v["same"] else "no", v["base_bytes"], v["new_bytes"]))
    L += ["", "## Content diff"] + ["- %s: %s" % (k, json.dumps(v, ensure_ascii=False)) for k, v in rp["diff"].items() if "/" not in k]
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    sys.exit(main())
