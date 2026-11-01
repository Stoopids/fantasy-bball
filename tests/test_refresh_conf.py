"""python3 -m unittest tests/test_refresh_conf.py  (no network: ESPN is mocked)"""
import importlib.util, json, os, sys, tempfile, unittest
from unittest import mock
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("refresh_data", os.path.join(HERE, "..", "tools", "refresh_data.py"))
R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
R.time.sleep = lambda *_: None

def ent(tid, w, l):
    return {"team": {"id": tid}, "stats": [{"type": "vsconf_wins", "value": w}, {"type": "vsconf_losses", "value": l},
            {"type": "vsconf_winpercent", "value": (w / (w + l)) if w + l else 0}]}
# ACC: 150 champ outright. Big 12: 12 and 2305 co-champs. America East: no tourney game yet.
STANDINGS = {"children": [
    {"abbreviation": "acc", "standings": {"entries": [ent("150", 19, 1), ent("153", 15, 5), ent("258", 14, 6)]}},
    {"abbreviation": "big12", "standings": {"entries": [ent("12", 15, 5), ent("2305", 15, 5), ent("66", 12, 8)]}},
    {"abbreviation": "aeast", "standings": {"entries": [ent("2378", 12, 4), ent("2066", 4, 12)]}}]}
PRE = {"children": [{"abbreviation": "acc", "standings": {"entries": [ent("150", 0, 0), ent("153", 0, 0)]}}]}

def ev(i, h, a, hs, as_, note, status="STATUS_FINAL"):
    return {"id": i, "date": "2027-03-14T18:00Z", "season": {"type": 2}, "status": {"type": {"name": status}},
            "competitions": [{"tournamentId": 3, "conferenceCompetition": True, "neutralSite": True, "notes": [{"headline": note}],
                              "competitors": [{"homeAway": "home", "score": str(hs), "team": {"id": h}},
                                              {"homeAway": "away", "score": str(as_), "team": {"id": a}}]}]}
SB = {"20270313": {"events": [ev("1", "150", "153", 70, 60, "ACC Tournament - Semifinal"), ev("2", "12", "66", 80, 70, "Big 12 Tournament - Quarterfinal")]},
      "20270314": {"events": [ev("3", "258", "150", 75, 72, "ACC Tournament - Final")]}}
POOL = ["150", "153", "258", "12", "2305", "66", "2378", "2066"]

def fake(standings, fail_standings=False, fail_all=False):
    def h(url, tries=3):
        if fail_all or ("standings" in url and fail_standings):
            raise OSError("network down")
        if "standings" in url:
            return standings
        if "scoreboard?dates=" in url:
            return SB.get(url.split("dates=")[1][:8], {"events": []})
        raise OSError("relay down")
    return h

class T(unittest.TestCase):
    def run_main(self, out, start, end, standings=STANDINGS, merge=False, **kw):
        argv = ["x", "--year", "2027", "--start", start, "--end", end, "--out", out, "--workers", "2"] + (["--merge"] if merge else [])
        with mock.patch.object(R, "http_json", fake(standings, **kw)), mock.patch.object(R, "load_pool", lambda: (set(POOL), {})), \
                mock.patch.object(sys, "argv", argv), mock.patch.object(R, "log", lambda *a: None):
            rc = R.main()
        return rc, json.load(open(os.path.join(out, "scores.json")))

    def test_in_season_champs_and_tourney(self):
        with tempfile.TemporaryDirectory() as d:
            _, s = self.run_main(d, "2027-03-13", "2027-03-14")
            c = s["conf"]
            self.assertEqual(c["150"], {"conf": "acc", "confRegChamp": True, "confTournChamp": False, "confTournStarted": True})
            self.assertTrue(c["258"]["confTournChamp"] and not c["258"]["confRegChamp"])
            self.assertTrue(c["153"]["confTournStarted"])

    def test_co_champs(self):
        _, reg = R.parse_standings(STANDINGS)
        self.assertEqual(reg, {"150", "12", "2305", "2378"})

    def test_tourney_started_or_not(self):
        with tempfile.TemporaryDirectory() as d:
            _, s = self.run_main(d, "2027-03-13", "2027-03-13")
            c = s["conf"]
            self.assertTrue(c["2305"]["confTournStarted"])  # Big 12 mate, did not play yet
            self.assertFalse(c["2378"]["confTournStarted"]); self.assertFalse(c["2066"]["confTournStarted"])
            self.assertFalse(any(v["confTournChamp"] for v in c.values()))

    def test_out_of_season_defaults(self):
        with tempfile.TemporaryDirectory() as d:
            _, s = self.run_main(d, "2026-10-31", "2026-10-31", standings=PRE)
            self.assertEqual(set(s["conf"]), set(POOL))
            for v in s["conf"].values():
                self.assertEqual((v["confRegChamp"], v["confTournChamp"], v["confTournStarted"]), (False, False, False))
            self.assertEqual(R.parse_standings({}), ({}, set())); self.assertEqual(R.parse_standings(None), ({}, set()))

    def test_network_failure(self):
        with tempfile.TemporaryDirectory() as d:
            rc, s = self.run_main(d, "2026-10-31", "2026-10-31", fail_all=True)
            self.assertEqual(rc, 2)  # existing behaviour: failed days -> exit 2, files still written
            self.assertTrue(all(not v["confRegChamp"] for v in s["conf"].values()))

    def test_merge_keeps_conf(self):
        with tempfile.TemporaryDirectory() as d:
            self.run_main(d, "2027-03-13", "2027-03-14")
            # later window, standings endpoint down: everything from the earlier run is kept
            _, s = self.run_main(d, "2027-03-20", "2027-03-20", merge=True, fail_standings=True)
            c = s["conf"]
            self.assertTrue(c["150"]["confRegChamp"] and c["258"]["confTournChamp"] and c["2305"]["confRegChamp"])
            self.assertEqual(c["150"]["conf"], "acc")
            # without --merge the old conf is not used
            _, s2 = self.run_main(d, "2027-03-20", "2027-03-20", fail_standings=True)
            self.assertFalse(s2["conf"]["258"]["confTournChamp"])

    # s26c11-conf: League's Conf column reads scores.json conf[<espnId>].conf (js/leaguehome.js vTeams, cf());
    # the same key/value is copied onto data/net.json "ranks" rows.
    NET = {"format": 1, "label": "NET", "through": "2027-03-01", "ranks": [{"rank": 1, "id": "150", "school": "Duke"},
           {"rank": 2, "id": "12", "school": "Arizona"}, {"rank": 3, "id": "9999", "school": "Elsewhere"}]}

    def league_conf(self, scores, tid):  # mirrors js/leaguehome.js: const cf=tid=>{const c=CF[String(tid)];return c&&c.conf?String(c.conf):''}
        c = (scores.get("conf") or {}).get(str(tid)); return str(c["conf"]) if c and c.get("conf") else ""

    def write_net(self, d):
        json.dump(self.NET, open(os.path.join(d, "net.json"), "w"))

    def test_league_conf_field_every_school(self):
        with tempfile.TemporaryDirectory() as d:
            _, s = self.run_main(d, "2027-03-13", "2027-03-14")
            self.assertEqual({t: self.league_conf(s, t) for t in POOL},
                             {"150": "acc", "153": "acc", "258": "acc", "12": "big12", "2305": "big12", "66": "big12", "2378": "aeast", "2066": "aeast"})

    def test_net_rows_get_conf(self):
        with tempfile.TemporaryDirectory() as d:
            self.write_net(d)
            self.run_main(d, "2027-03-13", "2027-03-14")
            n = json.load(open(os.path.join(d, "net.json")))
            self.assertEqual([r.get("conf") for r in n["ranks"]], ["acc", "big12", None])
            self.assertEqual({k: v for k, v in n.items() if k != "ranks"}, {k: v for k, v in self.NET.items() if k != "ranks"})
            self.assertEqual([{k: v for k, v in r.items() if k != "conf"} for r in n["ranks"]], self.NET["ranks"])

    def test_no_net_file_not_created(self):
        with tempfile.TemporaryDirectory() as d:
            self.run_main(d, "2027-03-13", "2027-03-14")
            self.assertFalse(os.path.exists(os.path.join(d, "net.json")))

    def test_merge_keeps_conf_in_both_files(self):
        with tempfile.TemporaryDirectory() as d:
            self.write_net(d)
            self.run_main(d, "2027-03-13", "2027-03-14")
            _, s = self.run_main(d, "2027-03-20", "2027-03-20", merge=True, fail_standings=True)
            self.assertEqual(self.league_conf(s, "12"), "big12")
            self.assertEqual(json.load(open(os.path.join(d, "net.json")))["ranks"][1]["conf"], "big12")

    def test_net_odd_shapes(self):
        for bad in (None, {}, {"ranks": None}, {"ranks": "x"}, {"ranks": [None, 3, {"id": None}]}, []):
            self.assertEqual(R.annotate_net(bad, {"150": {"conf": "acc"}}), 0)
        with tempfile.TemporaryDirectory() as d:
            open(os.path.join(d, "net.json"), "w").write("not json")
            rc, s = self.run_main(d, "2027-03-13", "2027-03-14")
            self.assertEqual(open(os.path.join(d, "net.json")).read(), "not json")
            self.assertEqual(self.league_conf(s, "150"), "acc")

if __name__ == "__main__":
    unittest.main()
