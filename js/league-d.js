/* League site data adapter (pure, no DOM; loads in the browser as FBNLeagueD and in Node via require()).
   Turns a finished draft (managers, rosters) plus the static score files (data/scores.json, data/tournament.json) into the one object `D`
   that the League site page (js/leaguehome.js) draws: owners with rank / points / schools, per-school records, games with owners,
   per-school game lists, the postseason checklist. Nothing here is invented: with no games every owner is 0-0 and tied for first. */
(function(root){
'use strict';
const S=root.FBNScore||(typeof require!=='undefined'?require('./scoring.js'):null);
const A={};
/* display only. s20: a leading "Test " is stripped from manager / team names ONLY in the test league. Signal used (the most reliable one that exists): the LEAGUE NAME starts with the word "Test"
   (the example league is named "Test"; a real league's names are always shown exactly as written, e.g. a manager called "Test Kitchen"). A.disp(name, isTest): without isTest the name is returned as written. */
A.isTestLeague=n=>/^test(?![A-Za-z0-9])/i.test(String(n==null?'':n).trim());
A.disp=(n,isTest)=>{n=String(n==null?'':n);if(!isTest)return n;const t=n.replace(/^Test\s+(?=\S)/,'');return(!t.trim()||/^test$/i.test(t.trim()))?n:t};
const num=v=>(typeof v==='number'&&isFinite(v))?v:null;
/* args: {managers:[{mid,name,team,emoji,photo}], roster:[{tid,owner,...}], order:[mid], teams:{tid:{short,name,...}}, SC, TN, genAt:ms|null, demo:bool, redraft:{...}|null, season:'2026-27'} */
A.build=function(a){
  const MG=a.managers||[],roster=a.roster||[],TEAMS=a.teams||{};const SC=a.SC||null,TN=a.TN||null;const games0=SC&&SC.games?SC.games:[];
  const TST=a.testLeague!=null?!!a.testLeague:A.isTestLeague(a.leagueName);const own=S.ownerMap(roster);const nameOf={};MG.forEach(m=>{nameOf[m.mid]=A.disp(m.name,TST)});
  const SEA=S.fullSeason(games0,own,MG),TOU=S.tournament(games0,TN?TN.field||{}:{},own,MG,TN&&TN.points);
  const ord=(a.order||MG.map(m=>m.mid));const oi=mid=>{const i=ord.indexOf(mid);return i<0?99:i};
  /* standings: S.fullSeason ranks by wins, win %, point difference; fully tied owners keep the draft order and share the rank */
  const seaSorted=SEA.slice().sort((x,y)=>x.place-y.place||oi(x.mid)-oi(y.mid));
  const touBy={};TOU.forEach(r=>{touBy[r.mid]=r});
  const records={};const addRec=(tid,w)=>{const r=records[tid]||(records[tid]={w:0,l:0});if(w)r.w++;else r.l++};
  games0.forEach(g=>{if(!(g.kind==='reg'||g.kind==='conf')||!S.isFinal(g))return;const wn=S.winnerSide(g),ls=S.loserSide(g);if(own[String(wn.id)]!=null||true){addRec(String(wn.id),1);addRec(String(ls.id),0)}});
  const shortOf=(tid,fallback)=>{const t=TEAMS[tid];return(t&&(t.short||t.name))||fallback||String(tid)};
  /* games with owners; only games that involve a rostered school are kept (the rest is not this league's business) */
  const ownersOf=tid=>own[String(tid)]!=null?[nameOf[own[String(tid)]]||'']:[];
  const games=games0.filter(g=>g&&g.home&&g.away&&(own[String(g.home.id)]!=null||own[String(g.away.id)]!=null)).map(g=>{
    const f=S.isFinal(g),w=f?S.winnerSide(g):null;
    const side=s=>({id:String(s.id),short:shortOf(String(s.id),s.short),score:num(s.score),win:!!(w&&w===s),seed:num(s.seed),owners:ownersOf(s.id)});
    const home=side(g.home),away=side(g.away);
    const o={id:String(g.id),day:g.day||'',start:g.start||null,status:g.status||'scheduled',kind:g.kind||'reg',round:g.round||'',neutral:!!g.neutral,home,away};
    o.h2h=!!(home.owners.length&&away.owners.length&&home.owners[0]!==away.owners[0]);
    o.civil=!!(home.owners.length&&away.owners.length&&home.owners[0]===away.owners[0]);
    if(f&&g.kind==='ncaa')o.upset={is:S.isUpset(g),scored:true};
    return o});
  const team_games={};
  games.forEach(g=>{[['home','away'],['away','home']].forEach(([a1,b1])=>{const us=g[a1],them=g[b1];if(!(us.owners.length))return;
    const f=g.status==='final';const row={id:g.id,status:g.status,us:us.score,them:them.score,res:f&&us.score!=null&&them.score!=null?(us.score>them.score?'W':'L'):null,site:g.neutral?'N':(a1==='home'?'H':'A'),opp:them.short,oppId:String(them.id),day:g.day,start:g.start,round:g.round,kind:g.kind,seed:us.seed,oppSeed:them.seed};
    (team_games[us.id]||(team_games[us.id]=[])).push(row)})});
  Object.keys(team_games).forEach(k=>team_games[k].sort((x,y)=>(x.start||x.day||'').localeCompare(y.start||y.day||'')));
  /* owners (standings = Full Season wins) */
  const owners=seaSorted.map(r=>{const m=MG.find(x=>x.mid===r.mid)||{};const tr=touBy[r.mid]||{score:0,wins:0,upsets:0,teams:{}};
    const picks=roster.filter(p=>p.owner===r.mid);
    const teams=picks.map(p=>{const t=r.teams&&r.teams[p.tid];const tt=tr.teams&&tr.teams[p.tid];return{tid:String(p.tid),status:'kept',wins_counted:t?t.w:0,wins:t?t.w:0,losses:t?t.l:0,tpts:tt?tt.pts:0,total:t?t.w:0,window:{start:null,end:null},events:(tr.events||[]).filter(e=>e.tid===String(p.tid))}});
    return{mid:r.mid,name:A.disp(m.name||r.name,TST),emoji:m.emoji||'',photo:m.photo||'',team_name:A.disp(m.team||'',TST),rank:r.place,tied:!!r.tied,total:r.wins,losses:r.losses,tscore:tr.score||0,tupsets:tr.upsets||0,twins:tr.wins||0,teams,by_cat:{win:r.wins,tourney:tr.score||0}}});
  /* postseason checklist per rostered school */
  const field=TN&&TN.field?TN.field:{};const locked=TOU.locked===true;const missed=new Set(TOU.missed||[]);
  const checklist={};
  roster.forEach(p=>{const tid=String(p.tid);const r=touBy[p.owner];const t=r&&r.teams?r.teams[tid]:null;const ev=r?(r.events||[]).filter(e=>e.tid===tid):[];const has=k=>ev.some(e=>e.kind===k);
    const inField=!!(t&&t.entered);
    checklist[tid]={ncaa_entry:{v:inField?true:(locked?false:null)},playin_win:{v:has('playin')},ncaa_wins:t?t.w:0,upsets:t?t.upsets:0,final4:{v:has('final4')?true:(inField&&S.teamTourney(tid,games0,field).state==='out'?false:null)},champ:{v:has('champ')?true:null},missed_dance:{v:missed.has(tid)?true:(locked?false:null)}}});
  /* upset list (any owner's school) */
  const upsets=S.upsets(games0,own).map(u=>({day:u.game.day,round:u.game.round,winner:shortOf(String(u.winner.id),u.winner.short),wid:String(u.winner.id),loser:shortOf(String(u.loser.id),u.loser.short),lid:String(u.loser.id),wseed:u.winner.seed,lseed:u.loser.seed,ws:u.winner.score,ls:u.loser.score,owner:u.owner?nameOf[u.owner]:null}));
  const fieldN=Object.keys(field).length;const haveNcaa=fieldN>0||games0.some(g=>g.kind==='ncaa');
  const final_games=games0.filter(S.isFinal).length;
  const mode=a.demo?'demo':(final_games>0?'live':'preseason');
  const gen=(SC&&SC.as_of)?Date.parse(SC.as_of+'T12:00:00Z'):null;
  const generated=isFinite(gen)&&gen?gen:(a.genAt||null);
  return{owners,teams:TEAMS,records,games,team_games,checklist,upsets,tournament:TOU,season:SEA,
    meta:{mode,season:(SC&&SC.season)||a.season||'2026-27',generated_at_utc:generated?new Date(generated).toISOString():null,points:Object.assign({win:1},S.POINTS,TN&&TN.points||{}),
      redraft:a.redraft||null,final_games,games_loaded:games0.length,haveNcaa,fieldN,locked,
      cat_labels:{win:'Wins',tourney:'NCAA Tournament points'}}}
};
if(typeof module!=='undefined'&&module.exports)module.exports=A;else root.FBNLeagueD=A;
})(typeof window!=='undefined'?window:globalThis);
