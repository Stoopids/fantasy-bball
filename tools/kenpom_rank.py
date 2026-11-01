#!/usr/bin/env python3
"""Power rank (meta.o) = KenPom 2026-27 preseason ratings rank, mapped to ESPN ids in assets/teams.js.
Usage: python3 tools/kenpom_rank.py [--src kenpom_o.json] [--write] [--unmatched FILE] [--json OUT]
--src: JSON list [{"rank":1,"team":"Duke"},...] (KenPom spelling). Matching: explicit ALIAS table first, then normalized names
(teams.js row elements 1-3: name, short name, abbreviation). Every KenPom team must map to exactly one pool id and every pool id
must get exactly one rank; anything else is listed in --unmatched (must be empty before release) and the exit code is 1.
Display only: auto-pick, grades and bots keep using meta.p (STOOPID rank)."""
import json, re, sys, html, os, argparse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAMS = os.path.join(ROOT, 'assets', 'teams.js')
ALIAS = {  # KenPom name -> ESPN id (names that do not normalize to a teams.js name)
    'Connecticut': '41',
    'Miami FL': '2390',
    'Mississippi': '145',
    'N.C. State': '152',
    'Seattle': '2547',
    'Illinois Chicago': '82',
    'San Jose St.': '23',
    'Sam Houston St.': '2534',
    'Queens': '2511',
    'Texas A&M Corpus Chris': '357',
    'Cal Baptist': '2856',
    'Appalachian St.': '2026',
    'Southeastern Louisiana': '2545',
    'Nebraska Omaha': '2437',
    'Southeast Missouri': '2546',
    'Tennessee Martin': '2630',
    'Grambling St.': '2755',
    'Louisiana Monroe': '2433',
    'USC Upstate': '2908',
    'Albany': '399',
    'LIU': '112358',            # Long Island University (ESPN id 112358)
}

def norm(s):
    s = html.unescape(s).lower().replace('&', ' and ').replace("'", '').replace('.', ' ')
    s = re.sub(r'\bst\b', 'state', s); s = re.sub(r'\bsaint\b', 'st', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--src', default='/workspace/kenpom/kenpom_o.json'); ap.add_argument('--write', action='store_true')
    ap.add_argument('--unmatched'); ap.add_argument('--json'); a = ap.parse_args()
    rows = [(int(r['rank']), r['team']) for r in json.load(open(a.src, encoding='utf-8'))]
    js = open(TEAMS, encoding='utf-8').read(); pre, body = js.split('window.TEAMS_DATA=', 1); D = json.loads(body.rstrip().rstrip(';'))
    idx = {}
    for t in D['teams']:
        for k in {norm(x) for x in t[1:4]}: idx.setdefault(k, []).append(t[0])
    pool = [t[0] for t in D['teams']]; name = {t[0]: t[1] for t in D['teams']}
    ranks, by_id, problems = {}, {}, []
    for rk, nm in rows:
        if nm in ALIAS: ids = [ALIAS[nm]]
        else: ids = idx.get(norm(nm), [])
        if len(ids) != 1: problems.append('UNMATCHED kenpom #%d %s%s' % (rk, nm, (' (ambiguous: %s)' % ids) if ids else '')); continue
        by_id.setdefault(ids[0], []).append((rk, nm)); ranks[ids[0]] = rk
    for tid, lst in by_id.items():
        if len(lst) > 1: problems.append('DUPLICATE %s %s <- %s' % (tid, name[tid], lst))
    for tid in pool:
        if tid not in by_id: problems.append('POOL MISSING %s %s' % (tid, name[tid]))
    if len(set(r for r, _ in rows)) != len(rows): problems.append('DUPLICATE RANK values in source')
    print('source %s: %d rows; matched %d/%d pool ids; problems %d' % (a.src, len(rows), len([t for t in pool if len(by_id.get(t, [])) == 1]), len(pool), len(problems)))
    for p in problems: print('  ' + p)
    if a.unmatched: open(a.unmatched, 'w').write(''.join(p + '\n' for p in problems))
    if a.json: json.dump(ranks, open(a.json, 'w'), indent=0, sort_keys=True)
    if a.write and not problems:
        for tid in pool: D['meta'].setdefault(tid, {})['o'] = ranks[tid]
        open(TEAMS, 'w', encoding='utf-8').write(pre + 'window.TEAMS_DATA=' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';\n')
        print('wrote meta.o into', TEAMS)
    sys.exit(1 if problems else 0)
main()
