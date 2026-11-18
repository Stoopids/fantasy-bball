#!/usr/bin/env node
/* Build data.js for the Ball league page. Read-only.
   One textdb GET per key (a missing pick is tried once on its backup key, then left out).
   Scores and the schedule come from data/scores.json, the same file the score refresh writes.
   Nothing here POSTs. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const F = require(path.join(root, 'js/core.js'));
const LeagueD = require(path.join(root, 'js/league-d.js'));
const Bets = require(path.join(root, 'js/ball-bets.js'));

const settings = fs.readFileSync(path.join(root, 'js/ball-settings.js'), 'utf8');
const idm = /realLeague:"([A-Za-z0-9]+)"/.exec(settings);
if (!idm) { console.error('ball-settings.js has no realLeague'); process.exit(1); }
const id = idm[1];
const base = F.Keys(id).base;

function httpGet(key) {
  const url = 'https://textdb.dev/api/data/' + encodeURIComponent(key);
  return fetch(url, { headers: { 'Cache-Control': 'no-cache' } }).then(async r => {
    if (r.status === 404) return '';
    if (!r.ok) return '';
    return r.text();
  }).catch(() => '');
}

function teamTable() {
  const w = {};
  new Function('window', fs.readFileSync(path.join(root, 'assets/teams.js'), 'utf8'))(w);
  const TEAMS = {}, POOL = [];
  (w.TEAMS_DATA.teams || []).forEach(r => {
    TEAMS[r[0]] = { name: r[1], short: r[2], abbr: r[3], color: r[4], alt: r[5], logo: r[6], logo_dark: r[6], mascot: r[7] || '', espn_id: r[0] };
    POOL.push(r[0]);
  });
  return { TEAMS, POOL, meta: w.TEAMS_DATA.meta || {} };
}

function uniq(MG) {
  const seen = {};
  return MG.map(m => {
    let n = String(m.name || m.team || 'Manager').trim().slice(0, 24) || 'Manager';
    let k = n, i = 2;
    while (seen[k]) k = n + ' ' + (i++);
    seen[k] = 1;
    return k;
  });
}

async function main() {
  const { TEAMS, POOL, meta: teamMeta } = teamTable();
  const meta = F.normalizeMeta(F.parseJ(await httpGet(base + '-meta')));
  if (!meta) { console.error('league meta was not readable'); process.exit(1); }
  const claims = {};
  await Promise.all(Array.from({ length: meta.settings.managers }, (_, k) => k + 1).map(async i => {
    claims[i] = F.parseClaim(await httpGet(F.Keys(id).slot(i, meta.slotGen[i] || 0)));
  }));
  const joined = F.joinedList(meta, claims);
  const profiles = {};
  await Promise.all(joined.map(async c => {
    const p = F.parseProfile(await httpGet(F.Keys(id).mgr(c.mid)));
    if (p) profiles[c.mid] = p;
  }));
  const managers = F.managersView(meta, claims, profiles);
  const entries = {};
  let missing = 0;
  if (meta.status !== 'lobby') {
    const tot = F.totalPicks(meta.order, meta.settings.rounds);
    const real = [];
    for (let k = 1; k <= tot; k++) {
      const sl = F.slotAt(meta.order, k, meta.settings.type, meta.settings.rounds);
      if (!(sl && F.redraftSkip(meta, sl))) real.push(k);
    }
    await Promise.all(real.map(async n => {
      const key = F.Keys(id).pick(meta.epoch, n);
      let txt = await httpGet(key);
      if (!F.parseEntry(txt)) txt = await httpGet(key + '-a1');
      const e = F.parseEntry(txt);
      if (e) entries[n] = e; else missing++;
    }));
  }
  const state = F.deriveState(meta, entries, {}, new Set(POOL));
  const SC = JSON.parse(fs.readFileSync(path.join(root, 'data/scores.json'), 'utf8'));
  let TN = null;
  try { TN = JSON.parse(fs.readFileSync(path.join(root, 'data/tournament.json'), 'utf8')); if (TN && TN.sample) TN = null; } catch (e) { TN = null; }
  let roster = ((state.roster && state.roster.length) ? state.roster : (state.real && state.real.length) ? state.real : state.picks) || [];
  roster = roster.filter(p => p && p.tid != null && p.tid !== '');
  const built = LeagueD.build({
    leagueName: meta.name, managers, roster, order: state.order || meta.order,
    teams: TEAMS, SC, TN, demo: false, season: '2026-27', testLeague: false
  });
  const keys = uniq(managers);
  const keyOf = {}, mOf = {};
  managers.forEach((m, i) => { keyOf[m.mid] = keys[i]; mOf[keys[i]] = m; });
  const nm = mid => keyOf[mid] || '';
  const owners = (built.owners || []).map(o => {
    const key = nm(o.mid);
    const by = { win: 0, conf_reg: 0, conf_tourn: 0, ncaa_entry: 0, playin_win: 0, ncaa_win: 0, upset: 0, final4: 0, champ: 0, missed_dance: 0 };
    (o.teams || []).forEach(t => { (t.events || []).forEach(e => { const c = { entry: 'ncaa_entry', playin: 'playin_win', win: 'ncaa_win', upset: 'upset', final4: 'final4', champ: 'champ', missed: 'missed_dance', conf_reg: 'conf_reg', conf_tourn: 'conf_tourn' }[e.kind]; if (c) by[c] = (by[c] || 0) + (+e.pts || 0); }); });
    by.win = (o.by_cat && o.by_cat.win) || 0;
    const teams = (o.teams || []).map(t => ({ tid: String(t.tid), window: { start: null, end: null }, status: 'active', wins_counted: t.wins || 0, by: { win: t.wins || 0 }, total: (t.wins || 0) + (t.tpts || 0), items: [] }));
    return { name: key, team_name: o.team_name || key, emoji: o.emoji || '🏀', photo: o.photo || '', total: o.total || 0, by_cat: by, teams, rank: o.rank, tied: !!o.tied, _mid: o.mid };
  });
  const games = (built.games || []).map(g => {
    const side = s => Object.assign({}, s, { pool: !!(s.owners && s.owners.length) });
    return Object.assign({}, g, { home: side(g.home), away: side(g.away), src: 'espn' });
  });
  const ranks = { teams: {}, sources: { kenpom: { as_of: '' }, ap: {}, net: {} } };
  Object.keys(TEAMS).forEach(t => {
    const m = teamMeta[t] || {};
    ranks.teams[t] = { ap: null, net: null, kenpom: m.o != null ? +m.o : null, stoopid: m.p != null ? +m.p : null, stoopid_current: m.p != null ? +m.p : null };
  });
  const P = require(path.join(root, 'js/scoring.js')).POINTS || {};
  const now = new Date();
  const D = {
    meta: {
      app: 'Ball Don\'t Lie', league: meta.name, season: '2026-27', mode: built.meta && built.meta.mode || 'live',
      today_et: now.toISOString().slice(0, 10),
      generated_at_utc: (SC && SC.as_of) ? SC.as_of + 'T12:00:00Z' : now.toISOString(),
      generated_at_wib: '', games_loaded: games.length, final_games: games.filter(g => g.status === 'final').length,
      roster_source: 'draft room', sheet_ok: true, sheet_error: null, standings_ok: true,
      fetch: {}, odds: { games_needing_line: 0, lines_found: 0, missing_line_ids: [] },
      assets: { missing_color: [], missing_alt_color: [], missing_logo: [] }, warnings: [],
      points: { win: 1, ncaa_entry: P.entry || 5, playin_win: P.playin_win || 1, ncaa_win: P.win || 2, upset: P.upset || 4, final4: P.final4 || 3, champ: P.champ || 4, missed_dance: P.missed || -1, conf_reg: P.conf_reg || 4, conf_tourn: P.conf_tourn || 4 },
      rules: { upset_games: ['ncaa'], upset_first_four: false, first_four_loser_penalty: false, count_non_d1_wins: true },
      redraft: null, overrides_active: {}, field: { locked: !!(built.meta && built.meta.locked), teams_seen: built.meta && built.meta.fieldN || 0 }, games_view: {}, ranks_fetch: { at: now.toISOString() }
    },
    owners, teams: TEAMS, records: built.records || {}, team_games: built.team_games || {}, checklist: built.checklist || {},
    upset_audit: [], conf_audit: [],
    bets: { currency: {}, people: [], bets: [], tallies: {}, fines: {}, coverage: {} },
    games, cat_labels: {}, windows: {}, ranks
  };
  owners.forEach(o => { D.windows[o.name] = o.teams.map(t => ({ tid: t.tid, start: null, end: null, sheet_name: (TEAMS[t.tid] || {}).short || t.tid })); });
  const picks = (state.picks || []).filter(p => p && p.tid != null && p.tid !== '');
  const order = (state.order && state.order.length ? state.order : managers.map(m => m.mid)).filter(m => keyOf[m]);
  D.picks = picks.map((p, i) => ({ overall: i + 1, round: p.round || 0, pick: p.pick || 0, n: p.n, manager: keyOf[p.owner] || '', teamId: String(p.tid), team: (TEAMS[p.tid] || {}).short || String(p.tid) }));
  D.slots = order.map((mid, i) => ({ slot: i + 1, manager: keyOf[mid], mid }));
  D.profiles = {};
  managers.forEach(m => {
    const p = profiles[m.mid] || {};
    D.profiles[keyOf[m.mid]] = { team: m.team || p.team || '', emoji: m.emoji || p.emoji || '', photo: m.photo || p.photo || '' };
  });
  D.who = keyOf;
  const logs = {};
  await Promise.all(managers.map(async m => { logs[m.mid] = await httpGet(base + '-bets-' + m.mid); }));
  const side = await httpGet(base + '-bets-doc');
  const view = Bets.view(logs, keyOf, side);
  D.bets_snapshot = { bets: view.bets || [], reqs: view.reqs || [] };
  D.identity = { meta, claims, managers: managers.map(m => ({ mid: m.mid, name: m.name, team: m.team || '', emoji: m.emoji || '', photo: m.photo || '' })) };
  const out = path.join(root, 'data.js');
  fs.writeFileSync(out, 'window.BALL_DATA = ' + JSON.stringify(D) + ';\n');
  console.error('data.js owners=' + owners.length + ' games=' + games.length + ' picks=' + D.picks.length + ' missing_pick_slots=' + missing + ' bytes=' + fs.statSync(out).size);
}

main().catch(e => { console.error(e && e.message ? e.message : e); process.exit(1); });
