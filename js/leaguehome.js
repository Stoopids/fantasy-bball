/* League site. Built as a league standings page (banner, big title, one-row tab bar, rank cards with school chips) and fed by the league's own
   draft: owners, team names, emoji, photos and rosters come from the draft data; scores come from data/scores.json (+ an optional live ESPN overlay).
   It exists the moment the draft is complete: every owner is 0-0 and tied for first (T-1) until games are played.
   Tabs: Standings, Games, Rosters, Bets, All teams, Postseason, Redraft, Archive, Rules, plus Draft (link to the draft room).
   No inline scripts or handlers: clicks go through data-a attributes (UI.bind). Every interpolated value goes through esc(). */
(function(){const F=FBN,U=UI,esc=U.esc,S=FBNScore,A=FBNLeagueD;const id=F.parseCode(U.qs().get('l')||'')||'';const T=U.loadTeams();
const DEMO=U.qs().get('demo')==='1';const DATA=DEMO?'data/demo/':'data/';
const app=document.getElementById('app');app.id='lapp';const $=s=>document.querySelector(s);
const plural=(n,a,b)=>n+' '+(n===1?a:b);
const homeLink=()=>'<a href="index.html">Home</a>';
if(!id){app.innerHTML='<main><div class="card"><b>No league</b><div class="note">Open this page from your league link.</div><p><a class="btn" href="index.html">Home</a></p></div></main>';return}
app.innerHTML='<main><div class="card" id="loading">Loading the league…</div></main>';
/* ---------- state ---------- */
const TABS=[['standings','🏆 Standings','Ranks','Standings'],['games','📅 Games','Games','Games'],['rosters','👥 Rosters','Squads','Rosters'],['bets','💪 Bets','Bets','Bets'],['teams','🏀 All teams','Teams','All teams'],['postseason','✅ Postseason','Post','Postseason'],['redraft','🔄 Redraft','Redraft','Redraft'],['archive','🗂️ Archive','Past','Archive'],['rules','📖 Rules','Rules','Rules']];
const KEYS=TABS.map(t=>t[0]);
let tab='standings',ownerSel=null,openTeam={},gOwner='all',gMode=null,gDay='all',gH2H=false,gAll=false;
let L=null,D=null,SC=null,TN=null,errS='',errT='',CM=false,HERO_CUSTOM=null,MG=[];
const hashSet=()=>{const h=(location.hash||'').replace('#','').split('/');let t=h[0];if(t==='teams'&&!h[1]){}if(t==='standings'&&h[1]==='tournament')t='postseason';if(t==='power')t='standings';if(KEYS.includes(t))tab=t};
const hashPut=()=>{try{history.replaceState(null,'','#'+tab)}catch(e){}};
async function getJ(p){const r=await fetch(p+'?b='+encodeURIComponent(window.FBN_BUILD||'')+'&t='+Date.now().toString(36));if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
/* ---------- helpers (from the template page) ---------- */
function initials(n){n=String(n||'').replace(/\(.*?\)/g,' ').replace(/[^A-Za-z0-9 ]/g,' ').trim();if(!n||/^\d+$/.test(n))return '?';const w=n.split(/\s+/);return (w.length>1?w[0][0]+w[1][0]:n.slice(0,2)).toUpperCase()}
const hexOk=v=>{v=String(v==null?'':v).replace('#','');return /^[0-9a-f]{6}$/i.test(v)?'#'+v:/^[0-9a-f]{3}$/i.test(v)?'#'+v:null};
/* every school name links to its ESPN team page (outbound link only: no ESPN images are loaded for the link). Uses Draft Room's F.espnUrl(id); a team without a numeric id is shown as plain text, never as a link. */
const espnUrl=id=>F.espnUrl?F.espnUrl(id==null?null:String(id)):(/^\d{1,8}$/.test(String(id==null?'':id))?'https://www.espn.com/mens-college-basketball/team/_/id/'+id:null);
const teamHref=tid=>{const t=T.TEAMS[tid];return t?espnUrl(t.espn_id):null};
function tlink(tid,txt,cls){const u=teamHref(tid),t=T.TEAMS[tid]||{};return u?`<a class="tl${cls?' '+cls:''}" href="${esc(u)}" target="_blank" rel="noopener noreferrer" title="Open ${esc(t.name||txt)} on ESPN">${esc(txt)}</a>`:esc(txt)}
function chip(tid,o){o=o||{};const t=T.TEAMS[tid]||{};const nm=t.short||t.name||o.name||String(tid);const bg=hexOk(t.color)||'#3a4256',alt=hexOk(t.alt)||'#ffffff';const fg=U.textOn(bg);const ini=esc(initials(nm));
  const logo=t.logo?`<img src="${esc(t.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-ini="${ini}">`:`<span class="nologo" aria-hidden="true">${ini}</span>`;
  const url=teamHref(tid);const inner=`${logo}<span class="cn${/\s/.test(nm)?'':' one'}">${esc(nm)}</span>`;const sty=`background:${bg};color:${fg};border-color:${alt}`;const cl=`chip school-chip${o.big?' big':''}${o.out?' out':''}`;
  return url?`<a class="${cl}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Open ${esc(t.name||nm)} on ESPN" style="${sty}">${inner}</a>`:`<span class="${cl} nolink" title="${esc(t.name||nm)}" style="${sty}">${inner}</span>`}
const rec=tid=>{const r=(D.records||{})[tid]||{w:0,l:0};return r.w+'-'+r.l};
const chipRec=(tid,o)=>chip(tid,o).replace(/<\/(a|span)>$/,(m0,tg)=>'<span class="cr" title="Season record (W-L)">'+rec(tid)+'</span></'+tg+'>');
const sign=n=>n>0?'+'+n:String(n);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function fmtDate(k,wd){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(k||'');if(!m)return k||'';const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],12));return (wd?DOW[d.getUTCDay()]+', ':'')+MON[+m[2]-1]+' '+(+m[3])+', '+m[1]}
/* times: the viewer's own time zone, labelled */
const TZ_NAME=(()=>{try{const p=new Intl.DateTimeFormat('en-US',{timeZoneName:'short'}).formatToParts(new Date()).find(x=>x.type==='timeZoneName');return p?p.value:U.tz()}catch(e){return U.tz()}})();
const FT=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
const FK=new Intl.DateTimeFormat('en-CA');
const FSTAMP=new Intl.DateTimeFormat('en-US',{weekday:'short',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
const ETHM=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'numeric',hourCycle:'h23'});
function etKey(g){if(g.start){const d=new Date(g.start);if(!isNaN(d))return FK.format(d)}return g.day}
const etLabel=k=>fmtDate(k,true);
/* ESPN uses 12:00 AM / 11:59 PM ET as "no tip time yet" placeholders */
function isTBD(g){if(!g.start)return true;const d=new Date(g.start);if(isNaN(d))return true;const p={};ETHM.formatToParts(d).forEach(x=>p[x.type]=+x.value);const h=p.hour%24,m=p.minute;return (h===0&&m===0)||(h===23&&m===59)}
function etTime(g){return isTBD(g)?'time TBD':FT.format(new Date(g.start))+' '+TZ_NAME}
function genDate(){const u=D&&D.meta&&D.meta.generated_at_utc,d=u?new Date(u):null;return d&&!isNaN(d)?d:null}
function stampLocal(){const d=genDate();if(!d)return '';const p={};FSTAMP.formatToParts(d).forEach(x=>p[x.type]=x.value);return p.weekday+', '+MON[+p.month-1]+' '+(+p.day)+', '+p.year+', '+p.hour+':'+p.minute+' '+p.dayPeriod+' '+TZ_NAME}
/* ---------- weekly tagline in the header slot (same line all week; changes Monday) ---------- */
const TAGLINES=["Every pick looks brilliant right now.","Bracket confidence: sky high. Evidence: none.","Everyone is a genius until the first tip-off.","Eight managers, one trophy, zero excuses.","The scoreboard remembers everything.","Blame the refs. Take the credit.","Somebody's mid-major is carrying them. Somebody's blue blood is not.","Bragging rights are updated all season long.","A good draft is a quiet confidence. A bad one is a group chat.","Float like a butterfly, sting like a 12-seed.","Nobody is out of it in October.","Draft smart. Brag louder."];
function tagFor(){const now=new Date();const mon=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-((now.getDay()+6)%7)*864e5;const w=Math.round(mon/(7*864e5));let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;return TAGLINES[(((w+h)%TAGLINES.length)+TAGLINES.length)%TAGLINES.length]}
/* ---------- freshness line + live scores (ESPN overlay on games already in the data; in memory only, GET only) ---------- */
function relAgo(ms){if(typeof ms!=='number'||!isFinite(ms))return null;const m=Math.floor(Math.max(0,ms)/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.floor(m/60);if(h<24)return h+(h===1?' hour':' hours')+' ago';const d=Math.floor(h/24);return d+(d===1?' day':' days')+' ago'}
const FR={exact:false,timer:null,vis:false};
function freshTick(){try{lvUI()}catch(_){}
  const el=document.getElementById('fresh');if(!el)return;const d=D?genDate():null,rel=d?relAgo(Date.now()-d.getTime()):null;
  if(!d||rel===null){el.hidden=true;return}
  const ex=stampLocal(),lead='Standings updated ',txt=lead+(FR.exact?ex:rel),sp=el.firstElementChild;
  if(sp.textContent!==txt)sp.textContent=txt;el.title=lead+ex+' (tap to '+(FR.exact?'show how long ago':'show the exact time')+')';el.hidden=false}
function freshToggle(){FR.exact=!FR.exact;freshTick()}
function freshStart(){clearInterval(FR.timer);FR.timer=setInterval(freshTick,30000);if(!FR.vis){FR.vis=true;document.addEventListener('visibilitychange',()=>{if(!document.hidden)freshTick()})}freshTick()}
const LVC={url:'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',minGap:20000,fastMs:45000,fastBigMs:60000,slowMs:300000,maxFails:5,backMax:600000,timeoutMs:10000,aheadMs:30*60000,behindMs:8*3600000,maxDays:2};
const LV={on:false,started:false,busy:false,timer:null,lastStart:0,lastOk:0,fails:0,paused:false,err:null,polls:0,events:0,matched:0,changed:0,days:[],ov:{},nextAt:0,mode:'slow'};
const LV_RANK={scheduled:0,live:1,final:2};
function lvStatus(e){const n=((((e||{}).status||{}).type)||{}).name||'';const m={STATUS_FINAL:'final',STATUS_SCHEDULED:'scheduled',STATUS_POSTPONED:'postponed',STATUS_CANCELED:'canceled',STATUS_SUSPENDED:'postponed',STATUS_DELAYED:'live'};
  if(Object.prototype.hasOwnProperty.call(m,n))return m[n];return /PROGRESS|HALF|END_|OVERTIME/.test(n)?'live':'other'}
function lvParse(e){try{const c=(e.competitions||[])[0];if(!c)return null;const stype=(e.season||{}).type;if(stype===1)return null;
    const note=(((c.notes||[])[0])||{}).headline||'';const ncaa=stype===3&&note.indexOf("NCAA Men's Basketball Championship")===0;const comps=c.competitors||[];if(comps.length!==2)return null;
    const side=x=>{const t=x.team||{};let sc=x.score;sc=(sc!=null&&/^-?\d+$/.test(String(sc).trim()))?parseInt(sc,10):null;const seed=(x.curatedRank||{}).current;return {id:t.id?String(t.id):null,score:sc,win:!!x.winner,seed:(ncaa&&seed&&seed<99)?seed:null}};
    const home=comps.find(x=>x.homeAway==='home')||comps[0],away=comps.find(x=>x.homeAway==='away')||comps[1];const st=e.status||{},ty=st.type||{};
    return {id:String(e.id),status:lvStatus(e),detail:String(ty.shortDetail||ty.detail||''),start:e.date||null,home:side(home),away:side(away)}}catch(_){return null}}
const lvSame=(g,ev)=>{const a=[String(g.home.id),String(g.away.id)].sort().join('|'),b=[String(ev.home.id),String(ev.away.id)].sort().join('|');return a===b};
function lvFind(ev){const games=(D&&D.games)||[];for(const g of games)if(String(g.id)===ev.id)return lvSame(g,ev)?g:null;
  const t=ev.start?Date.parse(ev.start):NaN,c=games.filter(g=>lvSame(g,ev)&&g.start&&!isNaN(t)&&Math.abs(Date.parse(g.start)-t)<=18*3600000);return c.length===1?c[0]:null}
function lvSide(g,id){return String(g.home.id)===String(id)?g.home:String(g.away.id)===String(id)?g.away:null}
function lvApply(ev){const g=lvFind(ev);if(!g)return false;if(ev.status==='other')return false;const cur=g.status;
  if(cur==='final'&&!g._lv)return false;if(!g._lv&&LV_RANK[ev.status]!=null&&LV_RANK[cur]!=null&&LV_RANK[ev.status]<LV_RANK[cur])return false;
  const before=JSON.stringify([g.status,g.home.score,g.away.score,g.home.win,g.away.win,g.home.seed,g.away.seed,g._lv&&g._lv.detail]);g.status=ev.status;const show=ev.status==='live'||ev.status==='final';
  [g.home,g.away].forEach(s=>{const src=String(ev.home.id)===String(s.id)?ev.home:ev.away;if(show&&src.score!=null)s.score=src.score;s.win=ev.status==='final'?src.win:false;if(src.seed!=null&&s.seed==null)s.seed=src.seed});
  if(show)g._lv={detail:ev.detail,status:ev.status};else if(g._lv)g._lv=null;
  const after=JSON.stringify([g.status,g.home.score,g.away.score,g.home.win,g.away.win,g.home.seed,g.away.seed,g._lv&&g._lv.detail]);
  [g.home,g.away].forEach(s=>{const tg=(D.team_games||{})[String(s.id)]||[];tg.forEach(x=>{if(String(x.id)!==String(g.id))return;x.status=g.status;const us=lvSide(g,s.id),them=us===g.home?g.away:g.home;
    if(show&&us.score!=null&&them.score!=null){x.us=us.score;x.them=them.score;if(g.status==='final'&&us.score!==them.score)x.res=us.score>them.score?'W':'L'}x._lv=show?true:null})});
  return before!==after}
function lvRun(events){let matched=0,changed=0;const ov={};(events||[]).forEach(e=>{const ev=lvParse(e);if(!ev)return;const g=lvFind(ev);if(!g)return;matched++;if(lvApply(ev))changed++;
    if(ev.status==='live'||ev.status==='final'||ev.status==='postponed'||ev.status==='canceled')ov[ev.id]=ev;else if(ev.status==='scheduled')delete LV.ov[ev.id]});LV.ov=Object.assign(LV.ov,ov);return {events:(events||[]).length,matched,changed}}
function lvReapply(){if(!LV.on||!D)return 0;let n=0;Object.keys(LV.ov).forEach(i=>{const ev=LV.ov[i],g=lvFind(ev);if(!g||(g.status==='final'&&!g._lv)){delete LV.ov[i];return}if(lvApply(ev))n++});return n}
function lvHot(g,now){if(!g||g.status==='final'&&!g._lv)return false;if(g.status==='live')return true;if(g.status!=='scheduled'&&g.status!=='other')return false;const t=g.start?Date.parse(g.start):NaN;if(isNaN(t)||isTBD(g))return false;return t-now<=LVC.aheadMs&&now-t<=LVC.behindMs}
function lvDays(now){const today=FK.format(new Date(now)),hot=((D&&D.games)||[]).filter(g=>lvHot(g,now)),set=[...new Set(hot.map(g=>g.day).filter(Boolean))];if(!set.length)return [today];
  set.sort((a,b)=>Math.abs(Date.parse(a)-Date.parse(today))-Math.abs(Date.parse(b)-Date.parse(today)));return set.slice(0,LVC.maxDays).sort()}
const lvActive=now=>((D&&D.games)||[]).some(g=>lvHot(g,now));
function lvDelay(now){const base=lvActive(now)?(LV.events>100?LVC.fastBigMs:LVC.fastMs):LVC.slowMs,back=Math.min(LVC.backMax,base*Math.pow(2,Math.min(LV.fails,6)));return Math.round(back*(0.9+Math.random()*0.2))}
async function lvFetchDay(day){const ctl=typeof AbortController!=='undefined'?new AbortController():null,tm=ctl?setTimeout(()=>ctl.abort(),LVC.timeoutMs):null;
  try{const r=await fetch(LVC.url+'?dates='+day.replace(/-/g,'')+'&groups=50&limit=500',{credentials:'omit',signal:ctl?ctl.signal:undefined});if(!r.ok){const e=new Error('http '+r.status);e.status=r.status;throw e}
    const j=await r.json();if(!j||!Array.isArray(j.events))throw new Error('bad payload');return j.events}finally{if(tm)clearTimeout(tm)}}
async function lvCheck(manual){if(!LV.on||!D||LV.busy)return 'busy';if(!manual&&!(D.games&&D.games.length))return 'idle';const now=Date.now();
  if(now-LV.lastStart<LVC.minGap){if(!LV.timer)lvSchedule();lvUI();return 'debounced'}
  LV.busy=true;LV.lastStart=now;LV.polls++;lvUI();let events=[],ok=false;
  try{LV.days=lvDays(now);for(const day of LV.days)events=events.concat(await lvFetchDay(day));ok=true}catch(e){LV.err=(e&&e.status===429)?'rate':'net';LV.fails+=(e&&e.status===429)?2:1}
  if(ok){LV.fails=0;LV.err=null;LV.paused=false;LV.lastOk=Date.now();try{const r=lvRun(events);LV.events=r.events;LV.matched=r.matched;LV.changed=r.changed;if(r.changed)lvRerender()}catch(_){}}
  LV.busy=false;lvSchedule();lvUI();try{freshTick()}catch(_){}return ok?'ok':'fail'}
function lvSchedule(){clearTimeout(LV.timer);LV.timer=null;if(!LV.on||document.hidden||!(D&&D.games&&D.games.length))return;if(LV.fails>=LVC.maxFails){LV.paused=true;return}
  const now=Date.now(),d=lvDelay(now);LV.mode=lvActive(now)?'fast':'slow';LV.nextAt=now+d;LV.timer=setTimeout(()=>{LV.timer=null;lvCheck(false).catch(()=>{})},d)}
function lvManual(){LV.fails=0;LV.paused=false;lvCheck(true).catch(()=>{})}
function lvRerender(){const a=document.activeElement,t=a&&a.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;if(tab==='games'||tab==='rosters')render()}
function lvInit(){if(LV.started||!D)return;LV.started=true;LV.on=!DEMO&&!(D.meta&&D.meta.mode==='demo');if(!LV.on){lvUI();return}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(LV.timer);LV.timer=null;return}LV.fails=0;LV.paused=false;lvCheck(false).catch(()=>{})});
  if(!document.hidden)lvCheck(false).catch(()=>{});lvUI()}
function lvNote(g){if(!g||!g._lv)return '';let s=' <span class="mut">· live ESPN feed, unofficial until the next data update</span>';
  if(g.status==='final'){const w=g.home.win?g.home:g.away.win?g.away:null,l=w===g.home?g.away:g.home;if(w&&g.kind==='ncaa'&&w.seed!=null&&l.seed!=null&&+w.seed>+l.seed)s+=' <span class="up ns">😱 UPSET (by seed, no points until the next data update)</span>'}return s}
function lvUI(){const el=document.getElementById('live'),t=document.getElementById('lvT'),b=document.getElementById('lvB');if(!el||!t||!b)return;
  if(!LV.on||!D){el.hidden=true;return}
  const txt=LV.err?'Couldn\u2019t reach ESPN right now'+(LV.paused?' \u00B7 paused':''):'';if(t.textContent!==txt)t.textContent=txt;
  const bh=LV.busy?'<i class="lvsp" aria-hidden="true"></i>Refreshing\u2026':'\u21BB Refresh Live Games';if(b.innerHTML!==bh)b.innerHTML=bh;
  const u=document.getElementById('lvU');if(u){const lu=LV.lastOk?'Last updated '+FT.format(new Date(LV.lastOk))+' '+TZ_NAME:'';if(u.textContent!==lu)u.textContent=lu;u.hidden=!lu}
  b.disabled=!!LV.busy;el.title='Live scores come straight from ESPN and are unofficial until the next data update. Standings and points only change when the site data updates.';el.hidden=false}
/* ---------- views ---------- */
const rankTxt=o=>(o.tied?'T-':'')+o.rank;
const ownerEmoji=n=>{const o=D.owners.find(x=>x.name===n);return o?o.emoji:''};
const opills=a=>a&&a.length?a.map(n=>`<span class="opill">${esc(ownerEmoji(n))} ${esc(n)}</span>`).join(''):'';
function vStandings(){const mx=Math.max(10,...D.owners.map(o=>o.total));
  return '<div class="ocl">'+D.owners.map(o=>`<div class="card oc strow" data-mid="${esc(o.mid)}"><div class="lb" role="button" tabindex="0" data-a="owner" data-mid="${esc(o.mid)}" aria-label="${esc(o.name)}, ${esc(rankTxt(o))}, ${o.total} points. Open the full breakdown">
    <div class="rank place">${esc(rankTxt(o))}</div>
    <div class="who"><b class="nm">${esc(o.emoji)} ${esc(o.name)}</b><small>${esc(o.team_name)}</small></div>
    <div class="pts score"><span class="pv">${o.total}</span><small>points</small></div></div>
    <div class="bar"><i style="width:${Math.max(0,o.total)/mx*100}%"></i></div>
    <div class="chips school-grid">${o.teams.map(t=>chipRec(t.tid,{cn:1})).join('')}</div></div>`).join('')+'</div>'+
    `<p class="note">Tap an owner for the full breakdown.</p>`}
function goOwner(mid){ownerSel=mid;tab='rosters';hashPut();render();window.scrollTo(0,0)}
function gOwned(g){return !!((g.home.owners&&g.home.owners.length)||(g.away.owners&&g.away.owners.length))}
function gameCard(g){const fin=g.status==='final',live=g.status==='live';
  const row=s=>{const lose=fin&&!s.win;return `<div class="gside${lose?' lose':''}"><div class="nm">${chip(s.id,{big:1,name:s.short})}${s.seed?`<span class="seed">(${esc(s.seed)})</span>`:''}${opills(s.owners)}</div><div class="sc2">${(fin||live)&&s.score!=null?s.score:''}</div></div>`};
  let head=`<span>${fin?'FINAL':live?'<b class="good">LIVE</b>'+(g._lv&&g._lv.detail?' <span class="mut">'+esc(g._lv.detail)+'</span>':''):'<b>'+esc(etTime(g))+'</b>'}</span>`;
  if(g.round)head+=`<span>· ${esc(g.round)}</span>`;else if(g.kind==='conf')head+='<span>· Conf tournament</span>';
  if(g.neutral)head+='<span>· neutral site</span>';
  if(g.h2h)head+=`<span class="h2b">🥊 ${esc(g.away.owners.join('/'))} vs ${esc(g.home.owners.join('/'))}</span>`;
  if(g.civil)head+=`<span class="h2b">🙃 SAME OWNER (${esc(g.away.owners.join('/'))} wins either way)</span>`;
  let foot='';if(fin&&g.upset&&g.kind==='ncaa'){if(g.upset.is)foot+=` <span class="up">😱 UPSET +${esc(D.meta.points.upset)}</span>`}
  foot+=lvNote(g);
  return `<div class="gm${g.h2h||g.civil?' h2h':''}"><div class="gh">${head}</div>${row(g.away)}${row(g.home)}${foot.trim()?`<div class="gl">${foot}</div>`:''}</div>`}
function vGames(){const every=D.games||[],nHidden=every.filter(g=>!gOwned(g)).length;if(!nHidden)gAll=false;const all=gAll?every:every.filter(gOwned);
  const ups=all.filter(g=>g.status!=='final'),fin=all.filter(g=>g.status==='final');if(!gMode)gMode=ups.length?'upcoming':'scores';
  let list=(gMode==='upcoming'?ups:fin.slice().reverse());if(gOwner!=='all')list=list.filter(g=>g.home.owners.includes(gOwner)||g.away.owners.includes(gOwner));if(gH2H)list=list.filter(g=>g.h2h||g.civil);
  const days=[...new Set(list.map(etKey))];if(gDay!=='all'&&!days.includes(gDay))gDay='all';if(gDay!=='all')list=list.filter(g=>etKey(g)===gDay);
  if(gMode==='upcoming'){const sk=g=>etKey(g)+(isTBD(g)?'~':' ')+(g.start||'');list.sort((a,b)=>sk(a).localeCompare(sk(b)))}
  let h=`<div class="card"><div class="tabs" style="margin:0 0 8px"><button data-a="gmode" data-v="upcoming" class="${gMode==='upcoming'?'on':''}">⏭ Upcoming (${ups.length})</button><button data-a="gmode" data-v="scores" class="${gMode==='scores'?'on':''}">✅ Scores (${fin.length})</button></div>
   <div class="tabs" style="margin:0"><select id="gOwnerSel" aria-label="Owner"><option value="all">All owners</option>${D.owners.map(o=>`<option value="${esc(o.name)}"${o.name===gOwner?' selected':''}>${esc(o.emoji)} ${esc(o.name)}</option>`).join('')}</select>
   <select id="gDaySel" aria-label="Day"><option value="all">All days</option>${days.map(k=>`<option value="${esc(k)}"${k===gDay?' selected':''}>${esc(etLabel(k))}</option>`).join('')}</select>
   <button data-a="gh2h" class="${gH2H?'on':''}" aria-pressed="${gH2H?'true':'false'}">🥊 Owner vs owner only</button></div>${nHidden?`<label class="gUn"><input type="checkbox" id="gUnowned"${gAll?' checked':''}> Show unowned games <span class="mut">(${nHidden} hidden)</span></label>`:''}
   <div class="note" style="margin-top:6px">Times in your time zone (${esc(TZ_NAME)}).</div></div>`;
  if(!list.length)return h+`<div class="card" id="gempty">${all.length?'Nothing matches those filters.':nHidden?'No games with an owned team right now 🏀 Check back soon. (Games where nobody in the league owns either team are hidden.)':'No games for rostered teams yet. The schedule and scores show up here as soon as games are played. Everything refreshes automatically.'}</div>`;
  let cur=null;list.slice(0,300).forEach(g=>{const k=etKey(g);if(k!==cur){cur=k;h+=`<div class="gday">${esc(etLabel(k))}</div>`}h+=gameCard(g)});
  if(list.length>300)h+=`<div class="card note">Showing the first 300 games. Use the filters to narrow the list.</div>`;return h}
function gameLine(g){const fin=g.status==='final';let up='';if(fin&&g.kind==='ncaa'&&g.res==='W'&&g.seed!=null&&g.oppSeed!=null&&+g.seed>+g.oppSeed)up=' <span class="up">😱 UPSET</span>';return up?`<div class="mut" style="font-size:12px">${up}</div>`:''}
const noPts='No points yet. Everyone starts at 0.';
function vRosters(){if(!ownerSel||!D.owners.some(x=>x.mid===ownerSel))ownerSel=D.owners[0].mid;const o=D.owners.find(x=>x.mid===ownerSel);const mg=MG.find(m=>m.mid===o.mid)||o;
  let h=`<div class="tabs" role="tablist" aria-label="Owner">${D.owners.map(x=>`<button role="tab" aria-selected="${x.mid===ownerSel?'true':'false'}" data-a="pickowner" data-mid="${esc(x.mid)}" class="${x.mid===ownerSel?'on':''}">${esc(x.emoji)} ${esc(x.name)}</button>`).join('')}</div>`;
  const cats=Object.entries(o.by_cat).filter(([k,v])=>v!==0);
  h+=`<div class="card" id="ownercard"><div class="oh">${U.avatar(dm(mg),48)}<div><b style="font-size:20px">${esc(o.emoji)} ${esc(o.name)} — ${o.total} pts</b> <span class="mut">(${o.tied?'T-'+o.rank:'#'+o.rank})</span><div class="note">${esc(o.team_name)}</div></div></div>
    <div style="margin-top:6px">${cats.length?cats.map(([k,v])=>`<span class="pill">${esc(D.meta.cat_labels[k]||k)}: <b class="${v<0?'bad':''}">${sign(v)}</b></span>`).join(''):'<span class="mut">'+esc(noPts)+'</span>'}</div></div>`;
  h+=`<div class="card sc"><table><tr><th>Team</th><th class="n">Record</th><th class="n">Wins</th><th class="n">NCAA pts</th></tr>`;
  o.teams.forEach((t,ix)=>{const key=o.mid+'|'+t.tid;
    h+=`<tr class="trow" tabindex="0" role="button" aria-expanded="${openTeam[key]?'true':'false'}" data-a="teamrow" data-key="${esc(key)}"><td>${chip(t.tid,{big:1})}</td><td class="n">${esc(rec(t.tid))}</td><td class="n">${t.wins}</td><td class="n"><b>${t.tpts}</b></td></tr>`;
    if(openTeam[key]){h+=`<tr><td colspan="4"><div class="det">`;
      const evs=t.events||[];h+=`<span class="pill">Wins: <b>${sign(t.wins)}</b></span><span class="pill">NCAA Tournament points: <b>${sign(t.tpts)}</b></span>`;
      if(evs.length)h+=`<ul class="it">${evs.map(i=>`<li><b class="${i.pts<0?'bad':'good'}">${sign(i.pts)}</b> ${esc(i.label)}</li>`).join('')}</ul>`;
      const tg=(D.team_games[t.tid]||[]);const gs=tg.filter(g=>g.status==='final').slice(-8).reverse();const nx=tg.filter(g=>g.status!=='final').slice(0,3);
      if(!tg.length)h+=`<div class="note" style="margin-top:6px">No games yet. Scores show up here once games are played.</div>`;
      if(gs.length)h+=`<div class="note" style="margin-top:6px">Last games</div>`+gs.map(g=>`<div style="margin:3px 0">${g.res==='W'?'<b class="good">W</b>':'<b class="bad">L</b>'} ${g.us}-${g.them} ${g.site==='A'?'@':g.site==='N'?'vs (N)':'vs'} ${g.oppId?tlink(g.oppId,g.opp):esc(g.opp)} <span class="mut">${esc(fmtDate(g.day))}${g.round?' · '+esc(g.round):''}</span>${g._lv?' <span class="mut">· live ESPN feed, unofficial</span>':''}${gameLine(g)}</div>`).join('');
      if(nx.length)h+=`<div class="note" style="margin-top:6px">Up next</div>`+nx.map(g=>`<div style="margin:3px 0">${g.status==='live'?'<b class="good">LIVE '+g.us+'-'+g.them+'</b> ':''}${g.site==='A'?'@':'vs'} ${esc(g.opp)} <span class="mut">${esc(g.start?etLabel(etKey(g))+', '+etTime(g):fmtDate(g.day))}</span></div>`).join('');
      h+=`</div></td></tr>`}});
  return h+`</table></div>`}
function vTeams(){const rows=[];D.owners.forEach(o=>o.teams.forEach(t=>rows.push({o:o.name,t})));rows.sort((a,b)=>b.t.wins-a.t.wins||(T.TEAMS[a.t.tid]&&T.TEAMS[b.t.tid]?T.TEAMS[a.t.tid].short.localeCompare(T.TEAMS[b.t.tid].short):0));
  return `<div class="card sc"><table><tr><th>Team</th><th>Owner</th><th class="n">Record</th><th class="n">Pts</th></tr>${rows.map(r=>`<tr><td>${chip(r.t.tid)}</td><td>${esc(r.o)}</td><td class="n">${esc(rec(r.t.tid))}</td><td class="n"><b>${r.t.wins}</b></td></tr>`).join('')}</table></div><p class="note">Record = regular-season and conference games (the same wins that make a manager's points). NCAA Tournament points are on the Postseason tab. Every school drafted in this league is listed, ${rows.length} in all.</p>`}
function mark(f){if(!f)return '';if(f.v===true)return '✅';if(f.v===false)return '<span class="mut">·</span>';return '<span class="mut" title="not decided yet">⏳</span>'}
function vPostseason(){const M=D.meta;
  let h=`<div class="swipe">↔ Swipe sideways to see every column</div><div class="card sc"><table><tr><th>Team</th><th>Owner</th><th>Made NCAA</th><th>Play-in win</th><th class="n">NCAA wins</th><th class="n">Upsets</th><th>Final Four</th><th>National champ</th><th>Missed dance</th></tr>`;
  D.owners.forEach(o=>o.teams.forEach(t=>{const c=D.checklist[t.tid]||{};
    h+=`<tr><td>${chip(t.tid)}</td><td>${esc(o.name)}</td><td>${mark(c.ncaa_entry)}</td><td>${c.playin_win&&c.playin_win.v?'✅':'<span class="mut">·</span>'}</td><td class="n">${c.ncaa_wins||0}</td><td class="n">${c.upsets||0}</td><td>${mark(c.final4)}</td><td>${mark(c.champ)}</td><td>${mark(c.missed_dance)}</td></tr>`}));
  h+=`</table></div><p class="note">✅ yes · ⏳ not decided yet · · no</p>`;
  h+=`<h2>NCAA Tournament standings</h2>`;
  if(!M.haveNcaa)h+=`<div class="card" id="notourney"><b>The NCAA Tournament has not started.</b><div class="note">${errT?'The tournament file could not be loaded ('+esc(errT)+'). ':''}Standings appear here once the field is set in March 2027. Schools earn points for making the field, winning games, reaching the Final Four and winning the title, plus a bonus for each upset by seed. Until then everyone is at 0.</div></div>`;
  const TOU=D.tournament||[];const mx=Math.max(10,...TOU.map(r=>r.score));
  h+='<div class="ocl" id="tstand">'+TOU.map(r=>{const o=D.owners.find(x=>x.mid===r.mid)||{};return `<div class="card oc strow" data-mid="${esc(r.mid)}"><div class="lb"><div class="rank place">${esc((r.tied?'T-':'')+r.place)}</div><div class="who"><b class="nm">${esc(o.emoji||'')} ${esc(o.name||r.name)}</b><small>${plural(r.wins,'win','wins')} · ${plural(r.upsets,'upset','upsets')}</small></div><div class="pts score"><span class="pv">${r.score}</span><small>points</small></div></div><div class="bar"><i style="width:${Math.max(0,r.score)/mx*100}%"></i></div><div class="chips school-grid">${(o.teams||[]).map(t=>{const x=r.teams&&r.teams[t.tid];return chip(t.tid,{cn:1}).replace(/<\/a>$/,'<span class="cr">'+(x?(x.pts>0?'+':'')+x.pts+' pts':'0 pts')+'</span></a>')}).join('')}</div></div>`}).join('')+'</div>';
  return h}
function vUpsets(){const A2=D.upsets||[];const P=D.meta.points;
  let h=`<div class="card"><b>😱 The upset rule</b><div class="note">Upset = in the NCAA tournament, a team <b>beats a better seed</b> (a bigger seed number beats a smaller one, e.g. a 12 over a 5). Equal seeds never count. Upsets are judged by seed only, and the First Four is not judged. A manager's school that wins an upset earns +${esc(P.upset)}.</div></div>`;
  if(!A2.length)return h+`<div class="card">No eligible games yet. Upsets are scored from the NCAA tournament in March.</div>`;
  return h+`<div class="card sc"><table><tr><th>Date</th><th>Game</th><th>Owner</th></tr>${A2.map(a=>`<tr><td>${esc(fmtDate(a.day))}<div class="note">${esc(a.round)}</div></td><td>${a.wseed?'('+esc(a.wseed)+') ':''}<b>${a.wid?tlink(a.wid,a.winner):esc(a.winner)}</b> ${esc(a.ws)}-${esc(a.ls)} ${a.lseed?'('+esc(a.lseed)+') ':''}${a.lid?tlink(a.lid,a.loser):esc(a.loser)}</td><td>${a.owner?esc(a.owner):'<span class="mut">no owner</span>'}</td></tr>`).join('')}</table></div>`}
function vRules(){const P=D.meta.points;
  const rows=[['Win (regular season and conference games, any opponent): 1 point in the Standings',1],['Make the NCAA field',P.entry],['Play-in (First Four) win',P.playin_win],['NCAA tournament win',P.win],['Upset (NCAA tournament: beat a better seed)',P.upset],['Final Four',P.final4],['National champ',P.champ],['Miss the NCAA field',P.missed]];
  return `<div class="card"><b>📖 League rules</b><ul class="it">
   <li><b>8 managers</b>, one draft. Each manager drafts college basketball schools; the same roster plays the whole season and the NCAA Tournament.</li>
   <li><b>Standings</b> count the wins of a manager's schools in regular-season and conference games. Ties: win %, then point difference.</li>
   <li><b>Postseason</b> points are separate: they come from the NCAA Tournament (table below). Ties there: more upsets, then more wins.</li>
   <li>Times are shown in your own time zone. Scores are loaded from the official game feeds; live scores are marked unofficial until the data updates.</li>
   <li>The <b>Redraft</b> tab describes the January 20, 2027 Redraft.</li></ul></div>
  <div class="card sc"><table><tr><th>Scoring</th><th class="n">Pts</th></tr>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td class="n">${sign(r[1])}</td></tr>`).join('')}</table></div>
  ${vUpsets()}
  <div class="card"><b>House interpretations</b><ul class="it">
   <li>Upset bonus applies to NCAA tournament games only. Equal seeds = no upset. First Four games are not judged for upsets.</li>
   <li>A First Four win = +${esc(P.playin_win)} play-in and +${esc(P.entry)} for making the field, but not the +${esc(P.win)} NCAA win. Missing the field counts only once the whole field list is loaded.</li>
   <li>NIT and other postseason events do not count. Postponed or canceled games give nothing.</li></ul></div>
  <p class="note"><a class="btn sec" href="${esc(U.pageUrl('help.html'))}">Help</a> <a class="btn sec" href="${esc(U.pageUrl('recap.html',{l:id}))}">Draft recap</a></p>`}
function vArchive(){return `<h2>🗂️ Season archive</h2><div class="card" id="archempty"><b>No past seasons yet</b><div class="note">This league's first season is the one in progress. When a season is finished, its final standings and rosters are kept here. Nothing is made up.</div></div>`}
function vRedraft(){const m=L.meta,r=m.redraft,live=r&&r.phase==='live';const done=live&&L.state.status==='complete';const cd=F.redraftCountdown(Date.now(),U.tz());const can=!DEMO&&!m.endedEarly&&(r||cd.state!=='future');const dd=F.REDRAFT.asOfLabel;
  const line=m.endedEarly?'The first draft ended early, so there is no Redraft.':!r?(cd.state==='future'?'Opens '+dd+' · '+cd.text+'.':'The Redraft is ready to open. The commissioner starts it.'):r.phase==='open'?'The Redraft is open: owners can choose their drops now.':done?'The Redraft is complete.':'The Redraft is under way.';
  const href=U.pageUrl('redraft.html',{l:id});
  const btn=DEMO?'':can?`<a class="btn endbig" id="redraftlink" href="${esc(href)}">${live?'Open the Redraft':'Go to the Redraft page'}</a>`:`<button class="btn endbig" id="redraftlink" disabled aria-disabled="true">${m.endedEarly?'Not available':'Opens '+esc(dd)}</button> <a class="btn sec" id="redraftpreview" href="${esc(href)}">Preview the rules and standings</a>`;
  let h=`<div class="card" id="redraftcard"><b>\u{1F4C5} Redraft: ${esc(dd)}</b><ul class="it">
   <li><b>Snake draft</b> in standings order as of ${esc(dd)}. <b>Last place</b> chooses where they draft, then it moves up the standings.</li>
   <li><b>Tiebreaker:</b> same win percentage? The owner with fewer wins ranks lower.</li>
   <li>Each owner has the <b>option</b> to drop up to 2 teams and draft one team for each one dropped. Dropped teams go back into the pool.</li></ul>
   <p class="note" id="rdline">${esc(line)}</p><div class="rdbtns">${btn}</div></div>`;
  if(!(r&&r.keep&&Object.keys(r.keep).length))h+=`<div class="card">No Redraft moves yet. Each owner's drops and adds will show up here after the ${esc(dd)} Redraft.</div>`;
  h+=D.owners.map(o=>`<div class="card"><b>${esc(o.emoji)} ${esc(o.name)}</b><div class="note">${esc(o.team_name)}</div><div class="chips school-grid">${o.teams.map(t=>chip(t.tid)).join('')}</div></div>`).join('');return h}
const isTestL=()=>A.isTestLeague(L&&L.meta&&L.meta.name);const dm=m=>Object.assign({},m,{name:A.disp(m.name,isTestL()),team:A.disp(m.team,isTestL())});
const VIEWS={standings:vStandings,games:vGames,rosters:vRosters,bets:()=>LBETS.view(),teams:vTeams,postseason:vPostseason,redraft:vRedraft,archive:vArchive,rules:vRules};
/* one line per school name: shrink the font a step at a time until it fits (floor 9px), else ellipsis */
function chipFit(){/* chips are one fixed size; a long name is cut with an ellipsis (the title attribute has the full name), never shrunk or wrapped */}
try{let _cf=0;window.addEventListener('resize',()=>{clearTimeout(_cf);_cf=setTimeout(()=>{try{chipFit()}catch(_){}},120)});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{try{chipFit()}catch(_){}})}catch(_){}
/* ---------- page shell ---------- */
const roomHref=()=>U.roomHref(id),recapHref=()=>U.pageUrl('recap.html',{l:id});
function header(){const m=L.meta;
  const ctl=CM?`<div class="heroctl" id="heroctl"><button class="btn sm" data-a="herochange" id="herochange">Change photo</button>${HERO_CUSTOM?'<button class="btn sm" data-a="heroreset" id="heroreset">Reset to default</button>':''}<input type="file" id="herofile" accept="image/jpeg,image/png,image/webp,image/*" hidden></div>`:'';
  return `<header id="lhdr"><div class="hero" id="hero" role="img" aria-label="College basketball banner"></div>${ctl}<div class="titlebar" id="lhead"><h1 id="ltitle">${esc(m.name)}</h1>
  <div id="fresh" class="fresh" role="button" tabindex="0" hidden data-a="fresh"><span></span></div>
  <div id="live" class="lv" hidden><span id="lvT" aria-live="polite"></span><button id="lvB" type="button" data-a="lvrefresh" aria-label="Refresh live games">&#8635; Refresh Live Games</button><span id="lvU" class="lvU" hidden></span></div>
  <p class="tag" id="tag">${esc(tagFor())}</p></div><div class="sub" id="badges" style="margin:0">${D.meta.mode==='demo'?'<span class="badge warn" id="samplenote">DEMO DATA</span>':''}</div></header>`}
function navHtml(){return `<nav id="ltabs" aria-label="League site">${TABS.map(t=>{const sp=t[1].indexOf(' '),ic=t[1].slice(0,sp),full=t[1].slice(sp+1),on=t[0]===tab;
    return `<button class="${on?'on':''}" data-a="tab" data-v="${esc(t[0])}" aria-label="${esc(full)}"${on?' aria-current="page"':''}><span class="ni" aria-hidden="true">${ic}</span><span class="nl f">${esc(full)}</span><span class="nl s" aria-hidden="true">${esc(t[2])}</span><span class="nl m" aria-hidden="true">${esc(t[3]||t[2])}</span></button>`}).join('')}<a class="nd" id="tab_room" href="${esc(roomHref())}" aria-label="Draft room (opens the draft room)"><span class="ni" aria-hidden="true">\u{1F4DD}</span><span class="nl f">Draft</span><span class="nl s" aria-hidden="true">Draft</span><span class="nl m" aria-hidden="true">Draft</span></a></nav>`}
function chatBar(){return `<section id="chat" class="chat" aria-label="Chat"><a class="chat-t" id="chatbar" data-a="chatopen" href="${esc(roomHref())}"><span class="ca" aria-hidden="true">▸</span><span class="cbm"><span class="cb1" id="chatpres">💬 Chat in the draft room</span><span class="cb2 mut" id="chatlast">Open the draft room chat</span></span><i class="cdot" id="chatbadge" hidden></i></a></section>`}
function footer(){return `<footer id="foot">${esc(L.meta.name)} · times in your time zone (${esc(TZ_NAME)}) · ${DEMO?`<a href="${esc(U.pageUrl('league.html',{l:id}))}">back to the real league</a>`:`<a id="demolink" href="${esc(U.pageUrl('league.html',{l:id,demo:1}))}">see the demo (invented scores)</a>`} · <a id="tab_recap" href="${esc(recapHref())}">Draft recap</a> · ${homeLink()}${U.buildTag()}</footer>`}
const dataNote=()=>errS&&!(window.LSCHED&&LSCHED.has())&&(tab==='standings'||tab==='teams')?`<div class="card" id="nodata"><b>No scores yet.</b><div class="note">The scores file could not be loaded (${esc(errS)}), so everyone shows zero. A maintainer can refresh it; see the README.</div></div>`:'';
/* s20: before the season (the data has no game for any rostered school, so every manager is 0-0) say so, instead of an unexplained 0-0 / "No games". The live ESPN overlay only updates games that are
   already in data/scores.json, so with no game in the data it returns nothing either. The notice is gone as soon as any game exists in the data (any status). Not shown in the demo. */
/* s21: the quiet schedule status line (js/league-sched.js): "Schedule updated N min ago", or "Schedule temporarily unavailable, showing last saved" */
function schedLine(){if(DEMO||!window.LSCHED||!/^(standings|games|rosters|teams|postseason)$/.test(tab))return '';const t=LSCHED.line();return t?'<div class="note" id="schedline" role="status" style="margin:0 2px 8px">'+esc(t)+'</div>':''}
function schedUpdate(){try{rebuild()}catch(e){return}const a=document.activeElement,t=a&&a.tagName;if(tab==='bets'||tab==='redraft'||t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;render()}
function scoreNotice(){if(DEMO||!D||(D.games&&D.games.length)||!/^(standings|games|rosters|teams|postseason)$/.test(tab))return '';return '<div class="card note" id="noscores" role="note">\u{1F4C5} Scores update once games start (first games November 2, 2026)</div>'}
function render(){const keepScroll=window.scrollY;const nv0=document.getElementById('ltabs'),nsl=nv0?nv0.scrollLeft:0;
  const demo=DEMO?`<div class="demobar" id="demobar" role="note"><b>DEMO</b> · invented games and scores. These are not real results and not this league’s standings. <a href="${esc(U.pageUrl('league.html',{l:id}))}">Leave the demo</a></div>`:'';
  app.innerHTML=demo+header()+navHtml()+'<main id="main">'+(DEMO?'<div class="card note" id="demonote"><b>DEMO data.</b> Invented games and scores, to show how standings will look. Not real results.</div>':'')+offHtml()+dataNote()+scoreNotice()+schedLine()+'<div id="lbody">'+(VIEWS[tab]||vStandings)()+'</div></main>'+chatBar()+footer();
  document.body.classList.add('lsite');paintHero();paintChat();freshStart();try{chipFit()}catch(_){}syncChat();navScroll(nsl)}
/* phone: the tab bar scrolls sideways inside itself; keep its position and make sure the open tab is visible */
function navScroll(x){const n=document.getElementById('ltabs');if(!n)return;n.scrollLeft=x;const on=n.querySelector('.on');if(!on||n.scrollWidth<=n.clientWidth+1)return;const l=on.offsetLeft,r=l+on.offsetWidth;if(l<n.scrollLeft+8)n.scrollLeft=Math.max(0,l-8);else if(r>n.scrollLeft+n.clientWidth-8)n.scrollLeft=r-n.clientWidth+8}
function syncChat(){const s=document.getElementById('chat');document.documentElement.style.setProperty('--chatH',(s&&!s.hidden?s.offsetHeight:0)+'px');const d=document.getElementById('demobar');document.documentElement.style.setProperty('--demoh',(d?d.offsetHeight:0)+'px')}
window.addEventListener('resize',syncChat);
/* ---------- banner photo (default file; commissioner may change it; own small key, cached, never polled) ---------- */
function paintHero(){const el=document.getElementById('hero');if(el)U.heroApply(el,HERO_CUSTOM||F.HERO.file)}
async function loadHero(force){HERO_CUSTOM=DEMO?null:await U.heroLoad(id,force)}
function readImage(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();im.onload=()=>{URL.revokeObjectURL(url);res(im)};im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('That file is not a picture we can open.'))};im.src=url})}
const heroEncoder=im=>async(edge,q)=>{const w=edge,h=Math.round(edge*5/16);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const sc=Math.max(w/im.width,h/im.height);const dw=im.width*sc,dh=im.height*sc;x.fillStyle='#10131a';x.fillRect(0,0,w,h);x.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);return c.toDataURL('image/jpeg',q)};
async function heroWrite(rec){for(let a=0;a<2;a++){try{await Store.set(F.Keys(id).hero,rec===null?'':rec)}catch(e){if(a)return false;continue}await U.sleep(500);try{const chk=F.parseHero(await Store.get(F.Keys(id).hero));if(rec===null?!chk:(chk&&chk.url===rec.url))return true}catch(e){return true}}return false}
async function heroChange(file){if(!F.heroWritable(CM)){U.toast('Only the commissioner can change the photo.',4500);return}
  try{if(!/^image\//.test(file.type||'')){U.toast('Choose a picture file.',4000);return}const im=await readImage(file);const fit=await F.fitHero(heroEncoder(im));if(!fit){U.toast('That picture is too big even after shrinking. Try another.',5000);return}
    if(!F.heroOk(fit.dataUrl)){U.toast('That picture cannot be used. Try another.',5000);return}
    const rec=F.makeHero(fit.dataUrl);if(await heroWrite(rec)){HERO_CUSTOM=fit.dataUrl;U.heroRemember(id,fit.dataUrl);U.toast('Photo changed.',3500);render()}else U.toast('Could not save the photo. Try again.',5000)}
  catch(e){U.toast(e&&e.message?e.message:'Could not use that picture.',5000)}}
async function heroReset(){if(!F.heroWritable(CM)){U.toast('Only the commissioner can change the photo.',4500);return}
  if(await heroWrite(null)){HERO_CUSTOM=null;U.heroRemember(id,null);U.toast('Back to the default photo.',3500);render()}else U.toast('Could not reset the photo. Try again.',5000)}
/* ---------- chat bar: last message + who is around (read-only; the chat itself lives in the draft room) ---------- */
let CHAT={n:0,last:null},PRES=[];
async function loadChat(){if(DEMO)return;try{const c=F.normChat(F.parseJ(await Store.get(F.Keys(id).chat)));CHAT.n=c.msgs.length;CHAT.last=c.msgs.length?c.msgs[c.msgs.length-1]:null;FAIL.chat=false}catch(e){FAIL.chat=true}
  try{const now=Date.now();const rs=await Promise.all(MG.map(async m=>{try{const p=F.parsePresence(await Store.get(F.Keys(id).pres(m.mid)));return p&&now-p.t<=F.PRES.onlineMs?A.disp(m.name):null}catch(e){return null}}));PRES=rs.filter(Boolean)}catch(e){}}
function paintChat(){const last=document.getElementById('chatlast'),pr=document.getElementById('chatpres'),bd=document.getElementById('chatbadge');if(!last)return;
  if(pr)pr.textContent=PRES.length?'🟢 '+PRES.slice(0,3).join(', ')+(PRES.length>3?' +'+(PRES.length-3):'')+' online':'💬 Chat in the draft room';
  if(CHAT.last){const w=MG.find(m=>m.mid===CHAT.last.who);last.textContent=(w?A.disp(w.name,isTestL()):'Someone')+': '+CHAT.last.text;last.classList.remove('mut')}
  if(bd){const seen=+(U.lsGet('lchat.'+id)||0);const un=Math.max(0,CHAT.n-seen);bd.hidden=!un;bd.textContent=un>9?'9+':String(un)}}
/* a logo that fails to load becomes the plain initials chip (no inline handler) */
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.closest&&t.closest('.chip')){const s=document.createElement('span');s.className='nologo';s.setAttribute('aria-hidden','true');s.textContent=t.getAttribute('data-ini')||'?';t.replaceWith(s)}},true);
const ACT={trynow:()=>boot(true),herochange:()=>{const f=document.getElementById('herofile');if(f&&CM)f.click()},heroreset:()=>heroReset(),
  chatopen:()=>{U.lsSet('x.'+id+'.tab','chat');U.lsSet('lchat.'+id,String(CHAT.n))},
  tab:el=>{tab=el.dataset.v;hashPut();render();window.scrollTo(0,0)},
  owner:(el,e)=>{if(e.target.closest('a.chip,a.tl'))return;goOwner(el.dataset.mid)},
  pickowner:el=>{ownerSel=el.dataset.mid;render()},
  teamrow:(el,e)=>{if(e.target.closest('a.chip,a.tl'))return;const k=el.dataset.key;openTeam[k]=!openTeam[k];render()},
  gmode:el=>{gMode=el.dataset.v;gDay='all';render()},gh2h:()=>{gH2H=!gH2H;render()},
  fresh:()=>freshToggle(),lvrefresh:()=>lvManual()};
document.addEventListener('change',e=>{const el=e.target;if(el.id==='herofile'){const f=el.files&&el.files[0];el.value='';if(f)heroChange(f);return}
  if(el.id==='gOwnerSel'){gOwner=el.value;render()}else if(el.id==='gDaySel'){gDay=el.value;render()}else if(el.id==='gUnowned'){gAll=el.checked;render()}});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const el=e.target;if(el&&el.getAttribute&&(el.getAttribute('role')==='button')&&el.dataset&&el.dataset.a&&el.tagName!=='BUTTON'){e.preventDefault();el.click()}});
U.bind(ACT);U.registerSW();
/* the first draft is over when every pick is made (derived from the picks, not from meta.status) or it was ended early; a started redraft (epoch 2+) implies it */
function draftDone(m,st){return st.status==='complete'||m.status==='complete'||!!m.endedEarly||(m.epoch||1)>1||!!(m.redraft&&m.redraft.phase)||!!(st.total&&st.picks&&st.picks.length>=st.total)}
function placeholder(m,st){app.innerHTML=`<main><div class="card" id="lhome"><b style="font-size:19px">League site</b><div class="note" id="avail">Available after the draft.</div><div class="note">${st&&m.status!=='lobby'?`The draft is in progress: ${st.picks.length} of ${st.total} picks made. `:''}Standings, team cards and scores appear here, for every manager, the moment the draft is complete.</div><p><a class="btn" id="back_room" href="${esc(U.roomHref(id))}">Draft room</a> <a class="btn sec" href="index.html">Home</a></p></div></main><footer id="foot">${U.buildTag()}</footer>`}
function rebuild(){D=A.build({leagueName:L.meta.name,managers:MG,roster:L.state.roster||L.state.picks,order:L.state.order,teams:T.TEAMS,SC:window.LSCHED?LSCHED.merge(SC):SC,TN,demo:DEMO,genAt:L.meta.endedAt||Math.max(0,...Object.values(L.entries||{}).map(e=>e&&+e.ts||0))||L.meta.startedAt||null,season:'2026-27'});lvReapply()}
/* a failed refresh never blanks the page: the last good scores stay, FAIL.sc/FAIL.tn raise the small "offline" note */
const FAIL={sc:false,tn:false,chat:false};let SCGOOD=false,TNGOOD=false,OFFN=false;
async function loadScores(){await Promise.all([getJ(DATA+'scores.json').then(j=>{const e=S.validateScores(j);if(e)throw new Error(e);if(j.sample&&!DEMO){SC=null}else{SC=j}errS='';SCGOOD=true;FAIL.sc=false}).catch(e=>{if(SCGOOD){FAIL.sc=true}else{errS=e.message||String(e);SC=null}}),getJ(DATA+'tournament.json').then(j=>{const e=S.validateTournament(j);if(e)throw new Error(e);if(j.sample&&!DEMO){TN=null}else{TN=j}errT='';TNGOOD=true;FAIL.tn=false}).catch(e=>{if(TNGOOD){FAIL.tn=true}else{errT=e.message||String(e);TN=null}})])}
const offHtml=()=>OFFN?'<div class="card offnote" id="offnote" role="status">📡 Offline: showing the last saved view. Retrying…</div>':'';
function setOff(){const on=!!(FAIL.sc||FAIL.tn||FAIL.chat);if(on===OFFN)return;OFFN=on;const e=document.getElementById('offnote');if(on&&!e){const mn=document.getElementById('main');if(mn)mn.insertAdjacentHTML('afterbegin',offHtml())}else if(!on&&e)e.remove()}
/* ---------- loading with recovery: any store error (503, network, timeout) keeps the page alive and retries with back-off ---------- */
const BO={n:0,timer:null,busy:false,booted:false,stop:false};
const backoff=n=>Math.min(30000,2000*Math.pow(2,Math.max(0,n-1)))*(0.75+Math.random()*0.5);
function noteTrouble(){const msg='<b>Having trouble reaching the league.</b><div class="note">Retrying… this page fills in by itself as soon as it can.</div>';
  const old=document.getElementById('trouble');if(old)return;
  const home=document.getElementById('lhome');
  if(home){home.insertAdjacentHTML('afterbegin','<div class="card bad" id="trouble" role="status" style="margin:0 0 10px">'+msg+'<p><button type="button" class="btn" id="tryNow" data-a="trynow">Try now</button></p></div>')}
  else app.innerHTML='<main><div class="card" id="trouble" role="status">'+msg+'<p><button type="button" class="btn" id="tryNow" data-a="trynow">Try now</button> <a class="btn sec" href="index.html">Home</a></p></div></main><footer id="foot">'+U.buildTag()+'</footer>'}
/* who am I: the manager link kept on this device, accepted only if its secret matches this league's claim (else: spectator, read only) */
let ME=null;
async function resolveMe(){try{if(DEMO)return null;const me=U.getMe(id);if(!me||!me.mid||!me.k)return null;const c=F.joinedList(L.meta,L.claims).find(x=>x.mid===me.mid);return c&&await F.checkMgrSecret(c,me.k)?me.mid:null}catch(e){return null}}
async function start(d){const m=d.meta;L=d;MG=d.managers;
  if(/[#&]cm=/.test(location.hash)){const fr=U.takeFragment();const cmF=F.extractSecret(fr.get('cm')||'','cm');if(cmF&&await F.checkPass(m,cmF)){U.lsSet('cm.'+id,cmF);U.rememberLeague(id,m.name,'commissioner')}}
  CM=!DEMO&&await U.isCommish(m);ME=await resolveMe();LBETS.init({id,demo:DEMO,owners:()=>D?D.owners:[],me:()=>ME,active:()=>tab==='bets'&&!document.hidden,roomHref:()=>U.roomHref(id),render:()=>{if(tab!=='bets')return;const b=document.getElementById('lbody');if(b){b.innerHTML=LBETS.view()}}});if(window.LSCHED&&!DEMO){LSCHED.init({ids:()=>(L.state.roster||L.state.picks||[]).map(p=>p&&p.tid).filter(x=>x!=null),enabled:()=>!DEMO,onUpdate:schedUpdate})}await loadHero(false);await loadScores();rebuild();hashSet();render();BO.booted=true;LBETS.start();if(window.LSCHED&&!DEMO)LSCHED.start();
  loadChat().then(()=>{paintChat();setOff()});setInterval(()=>{if(!document.hidden)loadChat().then(()=>{paintChat();setOff()})},30000);
  /* scores / tournament refresh every 5 min; after a failed refresh it retries with back-off and keeps the last good data on screen */
  let rf=0;const refresh=async()=>{const a=document.activeElement,t=a&&a.tagName;if(document.hidden||t==='INPUT'||t==='SELECT'){setTimeout(refresh,15000);return}
    await loadScores();rebuild();setOff();if(tab==='standings'||tab==='games'||tab==='rosters'||tab==='teams'||tab==='postseason'||tab==='rules')render();
    if(FAIL.sc||FAIL.tn){rf++;setTimeout(refresh,backoff(rf))}else{rf=0;setTimeout(refresh,5*60*1000)}};
  setTimeout(refresh,5*60*1000);
  window.addEventListener('hashchange',()=>{hashSet();render()});lvInit();app.setAttribute('data-ready','1')}
async function boot(manual){if(BO.busy||BO.stop||BO.booted)return;BO.busy=true;clearTimeout(BO.timer);let ok=true;
  if(document.hidden&&!manual){BO.busy=false;BO.timer=setTimeout(boot,5000);return}
  try{
    const d=await Promise.race([FBNLeague.load(id,{pool:T.POOL}),new Promise((_,rj)=>setTimeout(()=>rj(new Error('timeout')),25000))]);
    if(!d.meta){BO.stop=true;app.innerHTML='<main><div class="card" id="nf"><b>League not found</b><div class="note">Check the link.</div><p><a class="btn" href="index.html">Home</a></p></div></main>';return}
    const st=d.state,m=d.meta;
    if(m.status==='lobby'||!st||!draftDone(m,st)){BO.n=0;const had=document.getElementById('trouble');if(had)had.remove();if(!document.getElementById('lhome')||had||BO.ph!==(st&&st.picks?st.picks.length:-1)){placeholder(m,m.status==='lobby'?null:st);BO.ph=st&&st.picks?st.picks.length:-1}return}
    await start(d);BO.n=0
  }catch(e){if(!BO.booted){ok=false;BO.n++;noteTrouble()}}
  finally{BO.busy=false;if(!BO.booted&&!BO.stop)BO.timer=setTimeout(boot,ok?15000:backoff(BO.n))}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!BO.booted&&!BO.stop&&!BO.busy)boot(true)});window.addEventListener('online',()=>{if(!BO.booted&&!BO.stop&&!BO.busy)boot(true)});
boot();
})();
