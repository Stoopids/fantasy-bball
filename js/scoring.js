/* Scoring for the league site. Pure functions, no DOM, no network: loaded in the browser as FBNScore and in Node tests via require().
   Inputs: games (data/scores.json -> games[]), owners {teamId: managerId}, managers [{mid,name,...}], field (data/tournament.json -> field). */
(function(root){
'use strict';
const S={};
S.ROUNDS=['First Four','1st Round','2nd Round','Sweet 16','Elite 8','Final Four','National Championship'];
S.POINTS={entry:5,playin_win:1,win:2,upset:4,final4:3,champ:4,missed:-1,conf_reg:4,conf_tourn:4};
/* s26c7: points per Full Season win (STOOPIDS 'win' = 1). S.POINTS.win stays the NCAA-win value (2) for compatibility. */
S.SEASON_WIN=1;
S.FIELD_LOCKED_MIN=64;
const num=v=>(typeof v==='number'&&isFinite(v))?v:null;
S.isFinal=g=>g&&g.status==='final'&&g.home&&g.away&&num(g.home.score)!=null&&num(g.away.score)!=null&&g.home.score!==g.away.score;
S.winnerSide=g=>!S.isFinal(g)?null:(g.home.score>g.away.score?g.home:g.away);
S.loserSide=g=>!S.isFinal(g)?null:(g.home.score>g.away.score?g.away:g.home);
S.roundIndex=r=>S.ROUNDS.indexOf(r);
/* owners map from the drafted picks of a derived draft state */
S.ownerMap=function(picks){const m={};(picks||[]).forEach(p=>{m[String(p.tid)]=p.owner});return m};
/* seed-based upset: the winner's seed NUMBER is higher (a worse seed) than the loser's. Equal seeds or missing seeds: no upset. First Four is not judged. */
S.isUpset=function(g){if(!S.isFinal(g)||g.kind!=='ncaa'||g.round==='First Four')return false;const w=S.winnerSide(g),l=S.loserSide(g);return num(w.seed)!=null&&num(l.seed)!=null&&w.seed>l.seed};
const isSeason=g=>g.kind==='reg'||g.kind==='conf';
/* ---------- Full Season: wins ---------- */
S.fullSeason=function(games,owners,managers){const rows={};managers.forEach(m=>{rows[m.mid]={mid:m.mid,name:m.name,wins:0,losses:0,diff:0,teams:{}}});
  (games||[]).forEach(g=>{if(!isSeason(g)||!S.isFinal(g))return;const w=S.winnerSide(g),l=S.loserSide(g),d=Math.abs(g.home.score-g.away.score);
    [[w,1],[l,0]].forEach(([side,won])=>{const o=owners[String(side.id)];if(!o||!rows[o])return;const r=rows[o];const t=r.teams[side.id]||(r.teams[side.id]={tid:String(side.id),w:0,l:0,diff:0});
      if(won){r.wins++;t.w++;r.diff+=d;t.diff+=d}else{r.losses++;t.l++;r.diff-=d;t.diff-=d}})});
  const list=Object.values(rows).map(r=>{const gp=r.wins+r.losses;r.pct=gp?r.wins/gp:0;r.gp=gp;r.score=r.wins;r.teamList=Object.values(r.teams).sort((a,b)=>b.w-a.w||b.diff-a.diff);return r});
  list.sort((a,b)=>b.wins-a.wins||b.pct-a.pct||b.diff-a.diff||a.name.localeCompare(b.name));return S.rank(list,r=>[r.wins,r.pct,r.diff])};
/* rank with shared places for fully tied rows */
S.rank=function(list,keyf){let prev=null,place=0;list.forEach((r,i)=>{const k=JSON.stringify(keyf(r));if(k!==prev){place=i+1;prev=k}r.place=place;r.tied=false});list.forEach(r=>{r.tied=list.filter(x=>x.place===r.place).length>1});return list};
/* ---------- NCAA Tournament: seed-based points ---------- */
/* field: {teamId:{seed,region}} ; fieldOpen: true when the field list is complete (>=64 teams) so "missed the field" counts */
S.tournament=function(games,field,owners,managers,points){const P=Object.assign({},S.POINTS,points||{});const rows={};managers.forEach(m=>{rows[m.mid]={mid:m.mid,name:m.name,score:0,wins:0,upsets:0,events:[],teams:{}}});
  const fieldIds=Object.keys(field||{});const locked=fieldIds.length>=S.FIELD_LOCKED_MIN;const nc=(games||[]).filter(g=>g.kind==='ncaa');
  const team=(o,tid)=>{const r=rows[o];return r.teams[tid]||(r.teams[tid]={tid:String(tid),pts:0,w:0,upsets:0,rounds:[],entered:false})};
  const add=(o,tid,pts,label,extra)=>{if(!o||!rows[o]||!pts&&!extra)return;const r=rows[o];r.score+=pts;const t=team(o,tid);t.pts+=pts;r.events.push(Object.assign({tid:String(tid),pts,label},extra||{}))};
  /* entry: every owned team in the field list or seen in an NCAA game (First Four teams count when they play in) */
  const seen=new Set(fieldIds);nc.forEach(g=>{[g.home,g.away].forEach(s=>{if(s&&s.id!=null)seen.add(String(s.id))})});
  seen.forEach(tid=>{const o=owners[tid];if(!o||!rows[o])return;team(o,tid).entered=true;
    add(o,tid,P.entry,'Made the NCAA tournament',{kind:'entry'})});
  /* games, oldest round first so the event list reads in order */
  const ordered=nc.slice().sort((a,b)=>(a.day||'').localeCompare(b.day||'')||S.roundIndex(a.round)-S.roundIndex(b.round));
  ordered.forEach(g=>{if(!S.isFinal(g))return;const w=S.winnerSide(g),l=S.loserSide(g),ow=owners[String(w.id)];const rnd=g.round||'';
    if(ow&&rows[ow]){const r=rows[ow];const t=team(ow,w.id);t.rounds.push(rnd);
      if(rnd==='First Four'){add(ow,w.id,P.playin_win,'Won the play-in game',{kind:'playin',round:rnd,vs:l.id})}
      else{r.wins++;t.w++;add(ow,w.id,P.win,'Won '+(rnd||'a tournament game'),{kind:'win',round:rnd,vs:l.id});
        if(S.isUpset(g)){r.upsets++;t.upsets++;add(ow,w.id,P.upset,'Upset: seed '+w.seed+' beat seed '+l.seed,{kind:'upset',round:rnd,vs:l.id,seeds:[w.seed,l.seed]})}
      }
    }
  });
  return S._finish(rows,nc,field,owners,P,locked)};
S._finish=function(rows,nc,field,owners,P,locked){
  /* Final Four points: once per team that reached it (won an Elite 8 game, or appears in a Final Four / championship game) */
  const f4=new Set();nc.forEach(g=>{if(g.round==='Final Four'||g.round==='National Championship')[g.home,g.away].forEach(s=>{if(s&&s.id!=null)f4.add(String(s.id))});
    if(g.round==='Elite 8'&&S.isFinal(g))f4.add(String(S.winnerSide(g).id))});
  f4.forEach(tid=>{const o=owners[tid];if(!o||!rows[o])return;const r=rows[o];const t=r.teams[tid]||(r.teams[tid]={tid,pts:0,w:0,upsets:0,rounds:[],entered:true});r.score+=P.final4;t.pts+=P.final4;r.events.push({tid,pts:P.final4,label:'Reached the Final Four',kind:'final4'})});
  /* champion: winner of the National Championship game */
  nc.forEach(g=>{if(g.round==='National Championship'&&S.isFinal(g)){const w=S.winnerSide(g),o=owners[String(w.id)];if(o&&rows[o]){const r=rows[o];const t=r.teams[w.id]||(r.teams[w.id]={tid:String(w.id),pts:0,w:0,upsets:0,rounds:[],entered:true});r.score+=P.champ;t.pts+=P.champ;r.events.push({tid:String(w.id),pts:P.champ,label:'National champion',kind:'champ'})}}});
  /* missed the field: only once the field list is complete */
  const inField=new Set(Object.keys(field||{}));nc.forEach(g=>[g.home,g.away].forEach(s=>{if(s&&s.id!=null)inField.add(String(s.id))}));
  const missed=[];if(locked){Object.keys(owners).forEach(tid=>{const o=owners[tid];if(!rows[o]||inField.has(tid))return;const r=rows[o];const t=r.teams[tid]||(r.teams[tid]={tid,pts:0,w:0,upsets:0,rounds:[],entered:false});r.score+=P.missed;t.pts+=P.missed;r.events.push({tid,pts:P.missed,label:'Missed the tournament',kind:'missed'});missed.push(tid)})}
  const list=Object.values(rows).map(r=>{r.teamList=Object.values(r.teams).sort((a,b)=>b.pts-a.pts);return r});
  list.sort((a,b)=>b.score-a.score||b.upsets-a.upsets||b.wins-a.wins||a.name.localeCompare(b.name));
  S.rank(list,r=>[r.score,r.upsets,r.wins]);list.locked=locked;list.missed=missed;return list};
/* all seed upsets in the tournament (any owner), newest first */
S.upsets=function(games,owners){return (games||[]).filter(S.isUpset).sort((a,b)=>(b.day||'').localeCompare(a.day||'')).map(g=>({game:g,winner:S.winnerSide(g),loser:S.loserSide(g),owner:owners[String(S.winnerSide(g).id)]||null}))};
/* where a team stands in the NCAA tournament: {seed, state:'none'|'alive'|'out'|'champ', round} (round = round it lost in, or the next round it plays) */
S.teamTourney=function(tid,games,field){tid=String(tid);const f=(field||{})[tid];let seed=f&&f.seed!=null?f.seed:null;const g=(games||[]).filter(x=>x.kind==='ncaa'&&x.home&&x.away&&(String(x.home.id)===tid||String(x.away.id)===tid));
  g.forEach(x=>{const sd=String(x.home.id)===tid?x.home:x.away;if(seed==null&&sd.seed!=null)seed=sd.seed});
  if(!g.length&&!f)return{seed:null,state:'none',round:null};
  const fin=g.filter(S.isFinal).sort((a,b)=>S.roundIndex(a.round)-S.roundIndex(b.round)||(a.day||'').localeCompare(b.day||''));
  const lost=fin.find(x=>String(S.loserSide(x).id)===tid);
  if(lost)return{seed,state:'out',round:lost.round};
  const champ=fin.find(x=>x.round==='National Championship'&&String(S.winnerSide(x).id)===tid);if(champ)return{seed,state:'champ',round:'National Championship'};
  const next=g.filter(x=>!S.isFinal(x)).sort((a,b)=>S.roundIndex(a.round)-S.roundIndex(b.round))[0];
  if(next)return{seed,state:'alive',round:next.round};
  const last=fin[fin.length-1];return{seed,state:'alive',round:last?S.ROUNDS[Math.min(S.roundIndex(last.round)+1,S.ROUNDS.length-1)]:'1st Round'}};
/* ---------- games page ---------- */
/* only games that involve at least one drafted team; filter by manager id; split into results (newest first) and upcoming (soonest first) */
S.gamesView=function(games,owners,opt){opt=opt||{};const mine=g=>{const a=owners[String(g.home&&g.home.id)],b=owners[String(g.away&&g.away.id)];return{a,b,any:!!(a||b)}};
  const inv=(games||[]).filter(g=>g&&g.home&&g.away).map(g=>Object.assign({},g,{_o:mine(g)})).filter(g=>g._o.any).filter(g=>!opt.mid||g._o.a===opt.mid||g._o.b===opt.mid).filter(g=>!opt.kind||(opt.kind==='ncaa'?g.kind==='ncaa':g.kind!=='ncaa'));
  const res=inv.filter(g=>g.status==='final').sort((a,b)=>(b.start||b.day||'').localeCompare(a.start||a.day||''));
  const up=inv.filter(g=>g.status==='scheduled'||g.status==='live').sort((a,b)=>(a.start||a.day||'').localeCompare(b.start||b.day||''));
  return{results:res,upcoming:up,total:inv.length}};
/* ---------- s26c7: conference points (STOOPIDS conf_reg / conf_tourn) ----------
   confTeams (scores.json -> "conf", optional): {teamId:{conf:'ACC',confRegChamp:true,confTournChamp:true,confTournStarted:true}}
   - confRegChamp: top seed of its conference tournament (regular-season champ). Scored conf_reg ONCE, and only once the conference
     tournament has started: confTournStarted===true, or confTournChamp===true, or a live/final kind:'conf' game with a non-empty
     round involves this team or any team listed with the same conf.
   - confTournChamp: won the conference tournament. Scored conf_tourn ONCE.
   Returns rows like S.tournament: {mid,name,score,events[],teams{}} (events kind 'conf_reg' | 'conf_tourn'). */
S.confStarted=function(tid,confTeams,games){tid=String(tid);const ct=confTeams||{};const me=ct[tid]||{};if(me.confTournStarted===true||me.confTournChamp===true)return true;
  const mates=new Set([tid]);if(me.conf)Object.keys(ct).forEach(k=>{if(ct[k]&&ct[k].conf===me.conf)mates.add(String(k))});
  return (games||[]).some(g=>g&&g.kind==='conf'&&g.round&&(g.status==='final'||g.status==='live')&&g.home&&g.away&&(mates.has(String(g.home.id))||mates.has(String(g.away.id))))};
S.confPoints=function(confTeams,games,owners,managers,points){const P=Object.assign({},S.POINTS,points||{});const rows={};managers.forEach(m=>{rows[m.mid]={mid:m.mid,name:m.name,score:0,events:[],teams:{}}});
  const ct=(confTeams&&typeof confTeams==='object'&&!Array.isArray(confTeams))?confTeams:{};
  Object.keys(ct).forEach(tid=>{const c=ct[tid]||{};const o=(owners||{})[String(tid)];if(!o||!rows[o])return;const r=rows[o];const t=r.teams[tid]||(r.teams[tid]={tid:String(tid),pts:0});
    const give=(kind,pts,label)=>{if(r.events.some(e=>e.tid===String(tid)&&e.kind===kind))return;r.score+=pts;t.pts+=pts;r.events.push({tid:String(tid),pts,label,kind})};
    if(c.confRegChamp===true&&S.confStarted(tid,ct,games))give('conf_reg',P.conf_reg,'Conference regular-season champion');
    if(c.confTournChamp===true)give('conf_tourn',P.conf_tourn,'Conference tournament champion')});
  return Object.values(rows)};
/* League total = Full Season wins x SEASON_WIN + NCAA tournament points + conference points; breakdown sums to total.
   season = S.fullSeason(...), tour = S.tournament(...), conf = S.confPoints(...) (optional). */
S.leagueTotals=function(season,tour,conf){const by=(l)=>Object.fromEntries((l||[]).map(r=>[r.mid,r]));const T=by(tour),C=by(conf);
  const list=(season||[]).map(r=>{const t=T[r.mid]||{score:0,upsets:0,wins:0},c=C[r.mid]||{score:0,events:[]};
    const ce=k=>(c.events||[]).filter(e=>e.kind===k).reduce((a,e)=>a+e.pts,0);
    const breakdown={season_wins:r.wins*S.SEASON_WIN,ncaa:t.score||0,conf_reg:ce('conf_reg'),conf_tourn:ce('conf_tourn')};
    const total=Object.values(breakdown).reduce((a,b)=>a+b,0);
    return{mid:r.mid,name:r.name,wins:r.wins,pct:r.pct,diff:r.diff,breakdown,total}});
  list.sort((a,b)=>b.total-a.total||b.wins-a.wins||b.pct-a.pct||b.diff-a.diff||a.name.localeCompare(b.name));return S.rank(list,r=>[r.total,r.wins,r.pct,r.diff])};
S.validateScores=function(d){if(!d||typeof d!=='object'||!Array.isArray(d.games))return'The scores file is missing or not in the expected format.';
  for(const g of d.games){if(!g||!g.home||!g.away||g.home.id==null||g.away.id==null)return'The scores file has a game without two teams.'}return null};
S.validateTournament=function(d){if(!d||typeof d!=='object'||typeof d.field!=='object'||d.field==null||Array.isArray(d.field))return'The tournament file is missing or not in the expected format.';return null};
if(typeof module!=='undefined'&&module.exports)module.exports=S;else root.FBNScore=S;
})(typeof window!=='undefined'?window:globalThis);
