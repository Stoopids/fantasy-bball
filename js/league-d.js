/* s25 League URL secrets ("remember this device"): a shared or copied link never signs anyone in; League never builds a URL with k=.
   league.html loads core.js, scoring.js, then this file (league-d.js) before store.js / ui.js / any fetch, so the URL step runs first. as / k / cm in the query or the hash are taken out of the
   address bar AT ONCE (history.replaceState, other params kept, wrong values stripped too) and kept in memory only; leaguehome.js
   validates them once after the league loads and saves the device identity. league.html also sets <meta name="referrer" content="no-referrer">.
   TEMPORARY SHIM: Draft Room's s25-full core.js ships F.consumeUrlSecret(name) with this behaviour; when present it is used and this shim does nothing. */
(function(){if(typeof window==='undefined'||typeof location==='undefined')return;const F=window.FBN;if(!F)return;
  if(typeof F.consumeUrlSecret!=='function'){
    F.consumeUrlSecret=function(name){let v='';try{const u=new URL(location.href);const h=new URLSearchParams((u.hash||'').replace(/^#/,''));
      const hasQ=u.searchParams.has(name),hasH=/=/.test(u.hash)&&h.has(name);if(!hasQ&&!hasH)return'';
      v=(hasQ?u.searchParams.get(name):'')||(hasH?h.get(name):'')||'';if(hasQ)u.searchParams.delete(name);
      if(hasH){const rest=(u.hash||'').replace(/^#/,'').split('&').filter(x=>x&&x.split('=')[0]!==name).join('&');u.hash=rest?'#'+rest:''}   /* keeps a bare route hash such as the tab name */
      history.replaceState(history.state,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash)}catch(e){}return String(v||'')};
    F.consumeUrlSecret._leagueShim=true}
  const as=F.consumeUrlSecret('as'),k=F.consumeUrlSecret('k'),cm=F.consumeUrlSecret('cm');
  window.LURL={as:/^[0-9a-f]{8,32}$/i.test(as)?as.toLowerCase():'',k:F.extractSecret(k,'k'),cm:F.extractSecret(cm,'cm'),had:!!(as||k||cm)}})();
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
    const o={id:String(g.id),day:g.day||'',start:g.start||null,status:g.status||'scheduled',kind:g.kind||'reg',round:g.round||'',neutral:!!g.neutral,home,away};if(g.line&&typeof g.line==='object')o.line={fav:String(g.line.fav),sp:Number(g.line.sp),ou:Number(g.line.ou)};   /* s25: a posted line (when the data has one) for the Games card spread */
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
/* s25 LTIME: the ONE time helper of the League site. Every time and date shown is in the viewer's own device time zone (Intl.DateTimeFormat,
   no fixed zone anywhere), times carry a short zone label (timeZoneName:'short', e.g. WIB, PST), and day grouping uses local calendar dates. */
(function(){const g=typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null);if(!g)return;
  const mk=o=>{try{return new Intl.DateTimeFormat('en-US',o)}catch(e){return new Intl.DateTimeFormat('en-US')}};
  const FZS=[...new Set([].concat((typeof navigator!=='undefined'&&navigator.languages)||[],'en-US'))].map(l=>{try{return new Intl.DateTimeFormat(l,{timeZoneName:'short'})}catch(e){return null}}).filter(Boolean),FT=mk({hour:'numeric',minute:'2-digit',hour12:true}),FK=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}),
    FD=mk({weekday:'short',month:'short',day:'numeric'}),FDY=mk({weekday:'short',month:'short',day:'numeric',year:'numeric'}),FMD=mk({month:'short',day:'numeric'}),FW=mk({weekday:'short'});
  const D=x=>x instanceof Date?x:new Date(x),okD=d=>!isNaN(d.getTime());
  const T={
    zone(x){const d0=x==null?new Date():D(x),d=okD(d0)?d0:new Date();let first='';for(const f of FZS){try{const p=f.formatToParts(d).find(q=>q.type==='timeZoneName'),v=p?p.value:'';if(!first)first=v;if(v&&!/^(GMT|UTC)[+-]/.test(v))return v}catch(e){}}return first},   /* a named short zone (WIB, PST) when any device locale has one, else GMT+7 */
    time(x){const d=D(x);return okD(d)?FT.format(d)+' '+T.zone(d):''},              /* 7:00 PM WIB */
    stamp(x){const d=D(x);return okD(d)?FMD.format(d)+', '+FT.format(d)+' '+T.zone(d):''},   /* Nov 3, 7:00 PM WIB */
    wdTime(x){const d=D(x);return okD(d)?FW.format(d)+' '+FT.format(d)+' '+T.zone(d):''},     /* Tue 7:00 PM WIB */
    dayKey(x){const d=D(x);if(!okD(d))return'';const p={};FK.formatToParts(d).forEach(q=>p[q.type]=q.value);return p.year+'-'+p.month+'-'+p.day},   /* local YYYY-MM-DD */
    dayNum(k){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(k||'');return m?Math.round(Date.UTC(+m[1],+m[2]-1,+m[3])/864e5):NaN},
    daysSince(k0,x){return T.dayNum(T.dayKey(x))-T.dayNum(k0)},                     /* whole local days from key k0 to the local date of x */
    dayDate(k){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(k||'');return m?FD.format(new Date(+m[1],+m[2]-1,+m[3],12)).replace(/,/g,''):(k||'')},   /* Fri Oct 30 */
    dayLabel(k,now){const n=T.dayNum(k)-T.dayNum(T.dayKey(now==null?Date.now():now));const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(k||''),ds=m?FDY.format(new Date(+m[1],+m[2]-1,+m[3],12)):(k||'');   /* Mon, Mar 29, 2027 */
    return n===0?'Today · '+ds:n===1?'Tomorrow · '+ds:n===-1?'Yesterday · '+ds:ds}};
  g.LTIME=T})();
/* s25 LRANK: the ONE rank helper of the League site. AP Top 25 from ESPN's public rankings API (read in the browser, CORS open, GET only, cached 6 h),
   NET from the staged data/net.json (NCAA.com sends no CORS header; the file carries its own date). Real data only: a team with no rank renders nothing. */
(function(){const g=typeof window!=='undefined'?window:null;if(!g)return;
  const AP_URL='https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings',CK='fbn.rank.ap.v1',TTL=6*3600e3;
  const R={ap:{},apList:[],apDate:'',net:{},netList:[],netLabel:'',netThrough:'',ready:false,
    badge(tid){const r=R.ap[String(tid)];return Number.isInteger(r)&&r>=1&&r<=25?'<span class="rkb" title="AP Top 25">#'+r+'</span>':''},
    apOf:tid=>R.ap[String(tid)]||null,netOf:tid=>R.net[String(tid)]||null};
  const setAP=j=>{try{const p=(j&&j.rankings||[]).find(x=>x&&x.type==='ap');if(!p||!Array.isArray(p.ranks))return false;const m={},l=[];
      p.ranks.forEach(x=>{const r=Number(x.current),id=x&&x.team&&String(x.team.id);if(Number.isInteger(r)&&r>=1&&r<=25&&/^\d{1,8}$/.test(id||'')&&!(id in m)){m[id]=r;l.push({rank:r,id,school:String(x.team.location||x.team.nickname||'').slice(0,40)})}});
      if(!l.length)return false;R.ap=m;R.apList=l.sort((a,b)=>a.rank-b.rank);R.apDate=/^\d{4}-\d{2}-\d{2}/.test(p.date||'')?p.date.slice(0,10):'';return true}catch(e){return false}};
  const setNET=j=>{try{if(!j||!Array.isArray(j.ranks))return;const m={},l=[];j.ranks.forEach(x=>{const r=Number(x.rank),id=String(x.id||'');if(Number.isInteger(r)&&r>=1&&r<=400&&/^\d{1,8}$/.test(id)&&!(id in m)){m[id]=r;l.push({rank:r,id,school:String(x.school||'').slice(0,40)})}});
      R.net=m;R.netList=l.sort((a,b)=>a.rank-b.rank);R.netLabel=String(j.label||'NET').slice(0,80);R.netThrough=/^\d{4}-\d{2}-\d{2}$/.test(j.through||'')?j.through:''}catch(e){}};
  const get=async(u,o)=>{const c=typeof AbortController!=='undefined'?new AbortController():null,t=c?setTimeout(()=>c.abort(),10000):null;try{const r=await fetch(u,Object.assign({signal:c?c.signal:undefined},o||{}));if(!r.ok)throw new Error('http');return await r.json()}finally{if(t)clearTimeout(t)}};
  const slim=j=>({rankings:(j.rankings||[]).filter(x=>x&&x.type==='ap').map(x=>({type:'ap',date:x.date,ranks:(x.ranks||[]).map(y=>({current:y.current,team:{id:y.team&&y.team.id,location:y.team&&y.team.location}}))}))});
  R.load=async function(){let ch=false;
    try{const c=JSON.parse(localStorage.getItem(CK)||'null');if(c&&Date.now()-c.at<TTL&&setAP(c.j))ch=true;
      else{const j=await get(AP_URL,{credentials:'omit',cache:'no-store'});if(setAP(j)){ch=true;try{localStorage.setItem(CK,JSON.stringify({at:Date.now(),j:slim(j)}))}catch(e){}}}}catch(e){}
    try{setNET(await get('data/net.json',{cache:'no-cache'}));ch=true}catch(e){}R.ready=true;return ch};
  g.LRANK=R})();
/* s25 LTABS: which League tabs show on a given day (pure; local device dates; 'now' is injectable for tests).
   Redraft: from 2027-01-06 until the redraft is complete (league state); a league with no redraft state at all hides it after 2027-01-20 (end of that local day).
   Postseason: from 2027-03-01 through the NCAA championship game day + 1 when the data has that game, else through 2027-04-06. */
(function(){const g=typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null);if(!g)return;
  const W={REDRAFT_FROM:'2027-01-06',REDRAFT_LAST:'2027-01-20',POST_FROM:'2027-03-01',POST_LAST:'2027-04-06'};
  const plus1=k=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(k||'');if(!m)return null;const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]+1));return d.toISOString().slice(0,10)};
  W.visible=function(t,now,ctx){ctx=ctx||{};const k=g.LTIME.dayKey(now==null?Date.now():now);
    if(t==='redraft'){if(k<W.REDRAFT_FROM)return false;const s=ctx.redraft||'none';if(s==='done')return false;if(s==='none')return k<=W.REDRAFT_LAST;return true}
    if(t==='postseason'){const last=plus1(ctx.champDay)||W.POST_LAST;return k>=W.POST_FROM&&k<=last}
    return true};
  W.list=(tabs,now,ctx)=>tabs.filter(t=>W.visible(Array.isArray(t)?t[0]:t,now,ctx));
  /* Practice the Redraft button: Jan 6-20, 2027 by the viewer's local day, and hidden once the real Redraft is live (meta.redraft.phase==='live') */
  W.pracOpen=function(now,meta){const k=g.LTIME.dayKey(now);const r=meta&&meta.redraft;if(r&&r.phase==='live')return false;return k>=W.REDRAFT_FROM&&k<=W.REDRAFT_LAST};
  g.LTABS=W})();
