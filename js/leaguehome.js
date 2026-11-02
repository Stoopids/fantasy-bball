/* s26c14 (partner s26w, no sticky bet hash): a #bets/<id> or #games/<id> link scrolls to its card only on a fresh open not seen before on this device; a reload,
   back/forward or repeat open is cleaned to the tab hash. Runs before the route is read below. */
(function(){
  try{var m=/^#(bets|games)\/([A-Za-z0-9_-]{1,60})(?:$|[&?\/])/i.exec(location.hash||'');
    if(m){var nv=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0],fresh=!nv||nv.type==='navigate',seen={};
      try{seen=JSON.parse(localStorage.getItem('fbn.linkseen')||'{}')||{}}catch(e){seen={}}
      var k=(new URLSearchParams(location.search).get('l')||'')+':'+m[1].toLowerCase()+'/'+m[2];
      if(fresh&&!seen[k]){seen[k]=Date.now();var ks=Object.keys(seen).sort(function(a,b){return seen[b]-seen[a]}).slice(0,200),o={};ks.forEach(function(x){o[x]=seen[x]});try{localStorage.setItem('fbn.linkseen',JSON.stringify(o))}catch(e){}}
      else history.replaceState(null,'',location.pathname+location.search+'#'+m[1].toLowerCase())}}catch(e){}
})();
/* League site. Built as a league standings page (banner, big title, one-row tab bar, rank cards with school chips) and fed by the league's own
   draft: owners, team names, emoji, photos and rosters come from the draft data; scores come from data/scores.json (+ an optional live ESPN overlay).
   It exists the moment the draft is complete: every owner is 0-0 and tied for first (T-1) until games are played.
   Tabs: Standings, Games, Rosters, Bets, All teams, Postseason, Redraft, Archive, Rules, plus Draft (link to the draft room).
   No inline scripts or handlers: clicks go through data-a attributes (UI.bind). Every interpolated value goes through esc(). */
(function(){const F=FBN,U=UI,esc=U.esc,S=FBNScore,A=FBNLeagueD;const id=F.parseCode(U.qs().get('l')||'')||'';
/* s25h: every tab opens at the top. The browser must not restore an old scroll position; first loads of a tab end at (0,0) unless a deep link (#bets/<id>, #games/<id>) is open */
try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}
let PJV=false;
let TOP0=true;   /* true until the open tab has finished its first full render (or the user scrolls by hand); live refreshes never jump */
const topReady=()=>!!D&&(tab!=='bets'||!(window.LBETS&&LBETS._state&&LBETS._state.state==='init'));
let SUB=null,MISS=null;
const topNow=()=>{if(SUB)return;try{window.scrollTo(0,0)}catch(e){}};
/* s25j no scroll jump: any re-render / async height change keeps the element the reader is looking at in the same place on screen (an anchor + offset restore).
   Works without CSS scroll anchoring (iOS Safari has none). Not used for the first open of a tab (TOP0) or a deep link, which move on purpose. */
let SELFSCROLL=0;const selfScroll=y=>{SELFSCROLL=Date.now();window.scrollTo(0,Math.max(0,y))};
const AKEYS=['data-gid','data-bet','data-mid','data-tid','id'];
function aSel(e){for(const k of AKEYS){const v=e.getAttribute(k);if(v)return k==='id'?'#'+CSS.escape(v):'['+k+'="'+CSS.escape(v)+'"]'}return null}
/* a tap / key press that opens or closes something (Quick bet panel, a toggle) keeps the thing you touched where it is; content below it may move */
let LTAP={e:null,t:0};const tapKey=e=>{const m=document.getElementById('main');const k=e&&e.closest&&e.closest('[data-gid],[data-bet],[data-mid],[data-tid],[id]');LTAP={e:k&&m&&m.contains(k)?k:null,t:Date.now()}};
document.addEventListener('click',ev=>tapKey(ev.target),true);document.addEventListener('keydown',ev=>{if(/^(Enter| |Escape)$/.test(ev.key))tapKey(document.activeElement)},true);
function aTake(){const m=document.getElementById('main');if(!m||window.scrollY<1)return null;
  if(LTAP.e&&LTAP.e.isConnected&&Date.now()-LTAP.t<1500){const sel=aSel(LTAP.e),r=LTAP.e.getBoundingClientRect();if(sel&&r.height)return {y:window.scrollY,tap:1,a:[{sel,i:[...m.querySelectorAll(sel)].indexOf(LTAP.e),top:r.top}]}}const nv=document.getElementById('ltabs'),nr=nv&&nv.getBoundingClientRect(),line=nr&&nr.top<=1&&nr.bottom>0?nr.bottom:0;
  /* up to 12 keyed elements (game, bet, manager, team, or an id) on screen or spanning its top; each is found again by its key afterwards */
  const ks=app.querySelectorAll('[data-gid],[data-bet],[data-mid],[data-tid],[id]'),out=[],cnt={};   /* the header too: a line inserted ON screen (not above it) moves nothing that was above it */
  for(const e of ks){const sel=aSel(e);cnt[sel]=(cnt[sel]||0)+1;if(e.closest('#ltabs,#chat'))continue;const r=e.getBoundingClientRect();if(!r.height||r.bottom<=line||r.top>=innerHeight)continue;out.push({sel,i:cnt[sel]-1,top:r.top});if(out.length>=12&&r.top>=line)break}
  const ap=document.getElementById('lapp');return {y:window.scrollY,a:out,bot:!out.length&&ap?ap.getBoundingClientRect().bottom:null}}   /* nothing keyed on screen (below the page content): keep the end of the page put */
/* after the update: the shift most of them agree on (within 2px) is the one undone, so a list that re-orders (standings after new scores) does not drag the page after one row */
function aPut(k){if(!k)return;const m=k.tap?document.getElementById('main'):app;const ds=[];if(m)for(const x of k.a||[]){const e=m.querySelectorAll(x.sel)[x.i];if(e)ds.push(e.getBoundingClientRect().top-x.top)}
  if(!ds.length&&k.bot!=null){const a=document.getElementById('lapp');if(a)ds.push(a.getBoundingClientRect().bottom-k.bot)}
  if(!ds.length){if(Math.abs(window.scrollY-k.y)>=1)selfScroll(k.y);return}
  let best=ds[0],bn=0;for(const d of ds){const c=ds.filter(z=>Math.abs(z-d)<=2).length;if(c>bn||(c===bn&&Math.abs(d)<Math.abs(best))){bn=c;best=d}}
  if(Math.abs(best)>=1)selfScroll(window.scrollY+best)}
function keepPos(fn){const k=aTake();try{return fn()}finally{aPut(k)}}
window.LKEEP=keepPos;
/* a scroll the reader made (scrollbar drag, fling, find-in-page...) also ends the first-open "go to top" */
window.addEventListener('scroll',()=>{if(Date.now()-SELFSCROLL>300&&window.scrollY>40)TOP0=false},{passive:true});
['wheel','touchmove','keydown'].forEach(ev=>window.addEventListener(ev,e=>{if(ev!=='keydown'||/^(PageDown|PageUp|ArrowDown|ArrowUp|End|Home| )$/.test(e.key))TOP0=false},{passive:true}));
window.addEventListener('pageshow',()=>{TOP0=true;topNow()});const T=U.loadTeams();
const DEMO=U.qs().get('demo')==='1';const DATA=DEMO?'data/demo/':'data/';
const app=document.getElementById('app');app.id='lapp';const $=s=>document.querySelector(s);
const plural=(n,a,b)=>n+' '+(n===1?a:b);
const homeLink=()=>'<a href="index.html">Home</a>';
if(!id){app.innerHTML='<main><div class="card"><b>No league</b><div class="note">Open this page from your league link.</div><p><a class="btn" href="index.html">Home</a></p></div></main>';return}
/* s24: one shared loader for every League site loading state; 3 bouncing 🏀, CSS only in css/league-app.css .bl*), role=status */
const LLOADER=window.LLOADER=t=>{const b='<span class="bl-b"><i>🏀</i><s></s></span>';return '<div class="bl" role="status" aria-live="polite"><div class="bl-row" aria-hidden="true">'+b+b+b+'</div><div class="bl-t">'+esc(t||'Loading…')+'</div></div>'};
app.innerHTML='<main><div id="loading">'+LLOADER('Loading…')+'</div></main>';
/* ---------- state ---------- */
const TABS=[['standings','🏆 Standings','Ranks','Standings'],['games','📅 Games','Games','Games'],['bets','💵 Bets','Bets','Bets'],['teams','🏀 All teams','Teams','All teams'],['recap','🎓 Recap','Recap','Recap'],['redraft','🔄 Redraft','Redraft','Redraft'],['rules','📖 Rules','Rules','Rules'],['profile','👤 Profile','Profile','Profile']]   /* s28j item 10: Profile replaces Share in the same (last) slot; #share -> #profile */;   /* s28: partner order (Standings, Games, Bets, All teams, Recap, Rules) + Share as its own last tab; s28: no Archive tab in League (partner-only), #archive falls back to Standings; League-only Rosters and date-windowed Redraft kept in their partner-like slots */   /* s27: Draft tab folded into Recap (#draft -> #recap) */   /* s26c10: Recap (draft grades + weekly write-ups; replaces the footer / Rules 'Draft recap' links) and Draft (room link / pick board) tabs */   /* s25 order (Paul) */
const KEYS=TABS.map(t=>t[0]);
let tab='standings',ownerSel=null,openTeam={},gOwner='all',gMode=null,gDay='all',gH2H=false,gAll=false;
let L=null,D=null,SC=null,TN=null,errS='',errT='',CM=false,HERO_CUSTOM=null,MG=[];
/* s24 routes: every tab has its own hash (#standings #games #rosters #bets #teams #postseason #redraft #archive #rules), plus deep links #bets/<betId> and #games/<gameId>.
   URLs written by this page (pushState for tab switches, replaceState for the first normalization) and every shared / copied link are built ONLY from
   origin + path + ?l=CODE (+ &demo=1 in the demo) + the route hash: never a manager id, k=, cm= or any other query value. */
const SUBOK=v=>/^[A-Za-z0-9_.:-]{1,64}$/.test(v);
const FRE=/^bets\/f=(all|me|[1-8])-(all|waiting|open|settled|wash)(?:\/q=([^\/]{1,180}))?$/;   /* Bets filter in the hash: person (all / me / position 1-8 in the league, never a manager id) - status */
function readRoute(hs){try{const h=String(hs||'').replace(/^#/,'').split('&')[0];const fm=FRE.exec(h);if(fm)return{t:'bets',sub:null,f:fm[1]+'-'+fm[2],q:fm[3]?decodeURIComponent(fm[3]):''};if(!h||h.indexOf('=')>=0)return null;const p=h.split('/');let t=p[0],sub=p[1]?decodeURIComponent(p[1]):null;if(sub&&!SUBOK(sub))sub=null;
  if(t==='postseason'||(t==='standings'&&(p[1]==='tournament'||p[1]==='points'||p[1]==='breakdown')))return{t:'standings',sub:null,pv:true};/* s26c4: no Postseason tab; these open Standings > Breakdown (#standings/points is an alias) */if(t==='power'||t==='draftrecap'||t==='draft-recap'||t==='powerrank'||t==='draft'||t==='picks')t='recap';if(t==='schedule')t='games';if(t==='archive')t='standings';if(t==='share')t='profile';if(t==='rosters')t='teams';   /* s28j item 15: no Rosters tab (the reference site tab set); #rosters lands on All teams */if(!KEYS.includes(t))return null;if(t!=='bets'&&t!=='games')sub=null;return{t,sub}}catch(e){return null}}
const standalone=()=>{try{return !!(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true}catch(e){return false}};
/* read before anything strips the fragment. No route in the URL: a reload / back-forward, or any open inside the home-screen app, falls back to the last tab of
   this browser tab (sessionStorage) and then to the last tab used for THIS league on this device (localStorage fbn.x.<league>.ltab). A plain open in the browser
   (e.g. from the draft room) still starts on Standings. */
const ROUTE0=(()=>{const r=readRoute(location.hash);if(r)return r;try{const nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];if((nav&&(nav.type==='reload'||nav.type==='back_forward'))||standalone()){const x=readRoute(sessionStorage.getItem('fbn.ltab.'+id)||'')||readRoute(U.lsGet('x.'+id+'.ltab')||'');if(x)return{t:x.t,sub:null}}}catch(e){}return null})();
/* s24 (draft room HOOK.md, hook 1): mock leagues (meta.mock) never write or use the last-tab / fbn.lastsite memory; any old record of this mock league is cleared */
if(ROUTE0&&ROUTE0.pv)PJV=true;   /* s26c4: first open on #postseason / #standings/points */
const MOCK=()=>!!(L&&L.meta&&L.meta.mock===true);
function saveLast(){const mk=MOCK();try{if(!mk)sessionStorage.setItem('fbn.ltab.'+id,routeHash());else sessionStorage.removeItem('fbn.ltab.'+id);sessionStorage.setItem('fbn.launched','1')}catch(_){}
  if(mk){U.lsSet('x.'+id+'.ltab',null);const ll=U.lsJSON('lastsite',null);if(ll&&ll.id===id)U.lsSet('lastsite',null);return}
  if(DEMO)return;U.lsSet('x.'+id+'.ltab',tab);U.lsSet('lastsite',JSON.stringify({id,t:tab,at:Date.now()}))}
const fHash=()=>{try{return tab==='bets'&&window.LBETS&&LBETS.filterHash?LBETS.filterHash():''}catch(e){return''}};
const routeHash=()=>tab+(tab==='standings'&&(()=>{try{return SVIEW==='breakdown'}catch(e){return false}})()?'/breakdown':'')+(SUB?'/'+encodeURIComponent(SUB):fHash()?'/'+fHash():'');
const cleanPath=h=>location.pathname+'?l='+encodeURIComponent(id)+(DEMO?'&demo=1':'')+(h?'#'+h:'');
/* s28j item 9: the managers' regular link = origin + path + ?l=<league id> only (no view, admin, key, commish or token params, no hash) */
const mgrUrl=()=>location.origin+location.pathname+'?l='+encodeURIComponent(id);
const shareUrl=h=>location.origin+location.pathname+'?l='+encodeURIComponent(id)+'&view=1'+(h?'#'+h:'');   /* s28c: every shared link opens view-only (?view=1, js/league-d.js); built only from origin + path + l + view=1 (every other param dropped, demo too, as STOOPIDS s29b) + route hash: never k=, cm=, a commissioner key or a manager id */
function hashPut(push){try{const want=cleanPath(routeHash());saveLast();if(location.pathname+location.search+location.hash===want)return;history[push?'pushState':'replaceState'](null,'',want)}catch(e){}}
function applyRoute(r){if(r.t!==tab||r.sub!==SUB)MISS=null;tab=r.t;SUB=r.sub;if(r.f&&window.LBETS&&LBETS.setFilterHash)LBETS.setFilterHash(r.f,r.q);if(tab==='games'&&SUB&&D){const g=(D.games||[]).find(x=>String(x.id)===SUB);if(g){gOwner='all';gDay='all';gH2H=false;if(!gOwned(g))gAll=true;gMode=g.status==='final'?'scores':'upcoming'}}}
function normalizeUrl(){saveLast();try{if(ROUTE0){history.replaceState(null,'',cleanPath(routeHash()))}else if(location.hash||location.search!==cleanPath('').slice(location.pathname.length))history.replaceState(null,'',cleanPath(''))}catch(e){}}
const missHtml=()=>MISS&&MISS===tab?`<div class="card note" id="dlmiss" role="status">${tab==='bets'?'That bet was not found. It may have been removed, or the link is incomplete. Here are all the bets.':'That game was not found. It may have moved or been removed. Here are the games.'}</div>`:'';
function deepGo(){const t=tab,sub=SUB;if(!sub)return;let n=0;
  const go=()=>{if(tab!==t||SUB!==sub)return;const sel=t==='bets'?'[data-bet="'+CSS.escape(sub)+'"]':'[data-gid="'+CSS.escape(sub)+'"]';const el=document.querySelector('#lbody '+sel);
    if(el){el.scrollIntoView({block:'center'});el.classList.add('dl-hl');setTimeout(()=>{const e2=document.querySelector('#lbody '+sel);if(e2)e2.classList.remove('dl-hl')},2600);return}
    if(t==='bets'&&window.LBETS&&LBETS._state&&LBETS._state.state==='init'&&n++<80){setTimeout(go,250);return}
    if(t==='bets'&&window.LBETS&&LBETS.reveal&&LBETS.reveal(sub)&&n++<90){render();setTimeout(go,30);return}   /* the bet exists but the Bets filter hides it: filters go back to Everyone / All */
    MISS=t;const dn=document.getElementById('dlnote');if(dn)dn.innerHTML=missHtml()};
  setTimeout(go,30)}
function onNav(){const r=readRoute(location.hash)||{t:'standings',sub:null};if(r.pv){SVIEW='breakdown';const re=tab!=='standings';applyRoute(r);saveLast();if(re)TOP0=true;hashPut(false);render();if(re)window.scrollTo(0,0);return}if(r.t===tab&&r.sub===SUB&&(!r.f||'f='+r.f+(r.q?'/q='+encodeURIComponent(r.q):'')===(fHash()||'f=all-all'))){if(!r.f&&fHash())hashPut(false);return}applyRoute(r);saveLast();TOP0=true;render();if(SUB)deepGo();else window.scrollTo(0,0)}
const canShare=()=>!!(navigator.share&&window.isSecureContext);
function copyText(url){const done=()=>U.toast('Link copied',2600),fall=()=>{try{const ta=document.createElement('textarea');ta.value=url;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const okc=document.execCommand('copy');ta.remove();if(okc){done();return}}catch(e){}U.toast('Copy this link: '+url,8000)};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,fall);else fall()}
function shareLink(h,title){const url=shareUrl(h);if(canShare()){navigator.share({title,url}).catch(e=>{if(!(e&&e.name==='AbortError'))copyText(url)})}else copyText(url)}
const tabTitle=()=>{const t=TABS.find(x=>x[0]===tab);return (L&&L.meta?L.meta.name+' · ':'')+(t?t[3]:'League site')};
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
  const url=teamHref(tid);const inner=`${logo}<span class="cn${/\s/.test(nm)?'':' one'}">${rkB(tid)}${esc(nm)}</span>`;const sty=`background:${bg};color:${fg};border-color:${alt}`;const cl=`chip school-chip${o.big?' big':''}${o.out?' out':''}`;
  return url?`<a class="${cl}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Open ${esc(t.name||nm)} on ESPN" data-ini="${ini}" style="${sty}">${inner}</a>`:`<span class="${cl} nolink" title="${esc(t.name||nm)}" data-ini="${ini}" style="${sty}">${inner}</span>`}
const rec=tid=>{const r=(D.records||{})[tid]||{w:0,l:0};return r.w+'-'+r.l};
const chipRec=(tid,o)=>chip(tid,o).replace(/<\/(a|span)>$/,(m0,tg)=>'<span class="cr" title="Season record (W-L)">'+rec(tid)+'</span></'+tg+'>');
const sign=n=>n>0?'+'+n:String(n);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function fmtDate(k,wd){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(k||'');if(!m)return k||'';const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],12));return (wd?DOW[d.getUTCDay()]+', ':'')+MON[+m[2]-1]+' '+(+m[3])+', '+m[1]}
/* times: the viewer's own time zone, labelled */
const TZ_NAME=(()=>{try{return LTIME.zone()||U.tz()}catch(e){return U.tz()}})();   /* s25: one helper (LTIME in js/league-d.js) for every League time */
const FT=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
const FK={format:d=>LTIME.dayKey(d)};   /* local calendar date YYYY-MM-DD */
const FSTAMP=new Intl.DateTimeFormat('en-US',{weekday:'short',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
function etKey(g){if(g.start){const d=new Date(g.start);if(!isNaN(d))return FK.format(d)}return g.day}
const etLabel=k=>LTIME.dayLabel(k);   /* Today · Fri Oct 30 / Tomorrow · … / Sat Oct 31, by the viewer's local date */
/* ESPN's "no tip time yet" placeholders are midnight and 11:59 PM on its US-East feed clock, i.e. 04:00/05:00 or 03:59/04:59 UTC (checked in UTC, no fixed zone) */
function isTBD(g){if(!g.start)return true;const d=new Date(g.start);if(isNaN(d))return true;const h=d.getUTCHours(),m=d.getUTCMinutes();return (m===0&&(h===4||h===5))||(m===59&&(h===3||h===4))}
function etTime(g){return isTBD(g)?'time TBD':LTIME.time(g.start)}
function genDate(){const u=D&&D.meta&&D.meta.generated_at_utc,d=u?new Date(u):null;return d&&!isNaN(d)?d:null}
function stampLocal(){const d=genDate();if(!d)return '';const p={};FSTAMP.formatToParts(d).forEach(x=>p[x.type]=x.value);return p.weekday+', '+MON[+p.month-1]+' '+(+p.day)+', '+p.year+', '+p.hour+':'+p.minute+' '+p.dayPeriod}
/* ---------- s25: rotating tagline in the header slot: index = floor(days since 2026-11-01 / 2) mod list length, by the viewer's LOCAL date (s25),
   so everyone sees the same line on the same date and it changes every 2 days. The list is ONE data array; the shared list is not approved yet,
   so it holds a single neutral placeholder line (add approved lines here only). ---------- */
const TAGLINES=["Eight managers. One season. Let's play."];
const TAG_EPOCH=Date.UTC(2026,10,1);   /* 2026-11-01, counted in the viewer's local calendar days */
function tagIdx(ms,n){const d=LTIME.daysSince('2026-11-01',ms);return((Math.floor(d/2)%n)+n)%n}
/* s25c upset line (js/shared-s25.js: upsets read from ESPN's public scoreboard, GET only, cached 1 h in sessionStorage): every S25.UPSET_EVERY-th 2-day slot,
   counted in LOCAL days since 2026-11-01, shows the biggest recent upset; no upset (or no data) = the normal line. */
let UPSET=null,UPL=false;
function upSlot(ms){return Math.floor(LTIME.daysSince('2026-11-01',ms)/2)}
function upLine(ms){const X=window.S25;if(!UPSET||!X||!Array.isArray(X.UPSET_TEMPLATES)||!X.UPSET_TEMPLATES.length)return null;const E=X.UPSET_EVERY||4,k=upSlot(ms);if(((k%E)+E)%E!==E-1)return null;
  const t=X.UPSET_TEMPLATES[X.upsetTemplateAt(Math.floor(k/E))]||'';const u=UPSET;return t.replace(/\{Winner\}/g,u.winner).replace(/\{Loser\}/g,u.loser).replace(/\{WS\}/g,String(u.ws)).replace(/\{LS\}/g,String(u.ls))||null}
function upLoad(){if(UPL||DEMO||!window.S25||typeof S25.loadUpset!=='function')return;UPL=true;let c=null;try{c=sessionStorage}catch(e){}
  S25.loadUpset({cache:c}).then(u=>{if(u&&u.winner&&u.loser){UPSET=u;const el=document.getElementById('tag');if(el)keepPos(()=>{el.textContent=tagFor()})}}).catch(()=>{})}
function tagFor(ms){ms=ms==null?Date.now():ms;return upLine(ms)||TAGLINES[tagIdx(ms,TAGLINES.length)]}
/* ---------- freshness line + live scores (ESPN overlay on games already in the data; in memory only, GET only) ---------- */
function relAgo(ms){if(typeof ms!=='number'||!isFinite(ms))return null;const m=Math.floor(Math.max(0,ms)/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.floor(m/60);if(h<24)return h+(h===1?' hour':' hours')+' ago';const d=Math.floor(h/24);return d+(d===1?' day':' days')+' ago'}
const FR={exact:false,timer:null,vis:false};
function freshTick(){keepPos(freshTick0)}
function freshTick0(){try{lvUI()}catch(_){}
  const el=document.getElementById('fresh');if(!el)return;const d=D?genDate():null,rel=d?relAgo(Date.now()-d.getTime()):null;
  if(!d||rel===null){el.hidden=true;return}
  const ex=stampLocal(),txt='Standings last updated '+ex,sp=el.firstElementChild;   /* s26c14: footer line (was 'Standings updated … ago' in the header) */
  if(sp.textContent!==txt)sp.textContent=txt;el.hidden=false}
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
function lvDays(now){const today=S25.etDay(now),hot=((D&&D.games)||[]).filter(g=>lvHot(g,now)),set=[...new Set(hot.map(g=>g.start?S25.etDay(g.start):g.day).filter(Boolean))];   /* scoreboard ?dates= are ESPN (US Eastern) game days */if(!set.length)return [today];
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
function lvUI(){keepPos(lvUI0)}
function lvUI0(){const el=document.getElementById('live'),t=document.getElementById('lvT'),b=document.getElementById('lvB');if(!el||!t||!b)return;
  if(!LV.on||!D){el.hidden=true;return}
  const txt=LV.err?'Couldn\u2019t reach ESPN right now'+(LV.paused?' \u00B7 paused':''):'';if(t.textContent!==txt)t.textContent=txt;
  const bh=LV.busy?'<i class="lvsp" aria-hidden="true"></i>Refreshing\u2026':'\u21BB Refresh Live Games';if(b.innerHTML!==bh)b.innerHTML=bh;
  const u=document.getElementById('lvU');if(u){const lu=LV.lastOk?'Last updated '+FT.format(new Date(LV.lastOk)):'';if(u.textContent!==lu)u.textContent=lu;u.hidden=!lu}
  b.disabled=!!LV.busy;el.title='Live scores come straight from ESPN and are unofficial until the next data update. Standings and points only change when the site data updates.';el.hidden=false}
/* ---------- views ---------- */
const rankTxt=o=>(o.tied?'T-':'')+o.rank;
/* s28 (Paul): TEAM name on top, the manager's real name under it, everywhere; names already 'Test '-stripped in league-d.js */
const TNm=o=>(o&&(o.team_name||o.name))||'',RNm=o=>(o&&o.team_name&&o.name&&o.team_name!==o.name)?o.name:'';const tnHtml=(o,cls)=>`<span class="tn2${cls?' '+cls:''}"><b class="tnt">${esc(TNm(o))}</b>${RNm(o)?`<small class="tnr">${esc(RNm(o))}</small>`:''}</span>`;
const ownerByName=n=>D.owners.find(x=>x.name===n);
const ownerEmoji=n=>{const o=D.owners.find(x=>x.name===n);return o?o.emoji:''};
const opills=a=>a&&a.length?a.map(n=>{const o=ownerByName(n);return `<span class="opill">${esc(ownerEmoji(n))} ${o?tnHtml(o,'tnin'):esc(n)}</span>`}).join(''):'';
/* s25 AP Top 25 badge: one helper (LRANK in js/league-d.js); '' when the team is unranked */
const rkB=tid=>{try{return window.LRANK?LRANK.badge(tid):''}catch(e){return''}};
/* s25 Standings toggle: League (default) | AP / NET, remembered in localStorage 'standingsView' */
let SVIEW=(()=>{if(PJV)return 'breakdown';try{return localStorage.getItem('standingsView')==='breakdown'?'breakdown':'league'}catch(e){return'league'}})();   /* s26c5: League | Breakdown */
const segHtml=()=>`<div class="segw"><div class="segv" role="group" aria-label="Standings view">${[['league','League'],['breakdown','Breakdown']].map(([v,l])=>`<button type="button" class="seg" data-a="stview" data-v="${v}" aria-pressed="${SVIEW===v}">${esc(l)}</button>`).join('')}</div></div>`;   /* s28c: no Copy link here (one Share: the Share tab) */   /* s28: partner toggle row with Copy link on the right (shareLink, no k=) */
function ownerOfTid(){const m={};D.owners.forEach(o=>o.teams.forEach(t=>{m[String(t.tid)]=o}));return m}
function vRankings(){const R=window.LRANK,own=ownerOfTid();if(!R||!R.ready)return '<div class="card note" id="rkload">Loading rankings…</div>';
  const row=x=>{const o=own[x.id],ap=R.apOf(x.id),nt=R.netOf(x.id),parts=[ap?'AP #'+ap:'',nt?'NET '+nt:''].filter(Boolean).join(' · ');
    return `<li class="rkrow" data-tid="${esc(x.id)}">${T.TEAMS[x.id]?chip(x.id,{}):`<span class="rkname">${esc(x.school)}</span>`}<span class="rkv">${esc(parts)}</span><span class="rko mut">${o?esc((o.emoji?o.emoji+' ':''))+tnHtml(o,'tnin'):'not drafted'}</span></li>`};
  let h=`<div class="card" id="rkap"><h2 class="rkh">AP Top 25</h2>`;h+=R.apList.length?`<ol class="rkl">${R.apList.map(row).join('')}</ol><div class="note">Source: AP poll via ESPN${R.apDate?', '+esc(fmtDate(R.apDate)):''}.</div>`:'<div class="note">The AP poll could not be loaded right now.</div>';
  h+=`</div><div class="card" id="rknet"><h2 class="rkh">NET</h2>`;const nl=R.netList.filter(x=>own[x.id]);
  h+=R.netList.length?`<div class="note">${esc(R.netLabel)}. Drafted teams only.</div><ol class="rkl">${nl.map(row).join('')}</ol><div class="note">Source: NCAA.com NET${R.netThrough?', through '+esc(fmtDate(R.netThrough)):''} (staged copy, data/net.json).</div>`:'<div class="note">The NET file could not be loaded.</div>';
  return h+'</div>'}
/* s25 GOLD-LINE (partner site s25f/s25g): one 🏆 per title under the name (s25g) = 1st-place finishes in this league's OWN past seasons.
   Source: the league meta record (<league>-meta).archive = {seasons:[{season:'2025-26',no_tournament?:true,final:[{mid,place}]}]}, the same data the Archive
   tab is for. Nothing writes it yet (no league has finished a season), so today every count is 0 and no line shows. Only place===1 counts, matched by manager id
   (never by name); a cancelled season (no_tournament) is not counted, same rule as the partner site. No data / 0 titles -> nothing shown. */
function goldN(mid){try{const A=L&&L.meta&&L.meta.archive;if(!A||!Array.isArray(A.seasons)||!mid)return 0;let n=0;
  A.seasons.forEach(se=>{if(!se||se.no_tournament||!Array.isArray(se.final))return;if(se.final.some(r=>r&&r.mid===mid&&Number(r.place)===1))n++});return n}catch(e){return 0}}
/* when anyone has a title, the others keep an empty line of the same height so the cards stay equal (nothing is shown in it) */
function goldLine(mid,any){const n=goldN(mid),t=n+' title'+(n>1?'s':'');return n?`<span class="gold" role="img" aria-label="${esc(t)}" title="${esc(t)}">${'🏆'.repeat(n)}</span>`:any?'<span class="gold gold0" aria-hidden="true"></span>':''}
function vStandings(){if(SVIEW==='breakdown')return segHtml()+vPoints();const anyG=D.owners.some(o=>goldN(o.mid)>0);const mx=Math.max(10,...D.owners.map(o=>o.total));
  return segHtml()+'<div class="ocl">'+D.owners.map(o=>`<div class="card oc strow" data-mid="${esc(o.mid)}"><div class="lb" role="button" tabindex="0" data-a="owner" data-mid="${esc(o.mid)}" aria-label="${esc(TNm(o))}${RNm(o)?' ('+esc(RNm(o))+')':''}, ${esc(rankTxt(o))}, ${o.total} points. Open the full breakdown">
    <div class="rank place">${esc(rankTxt(o))}</div>
    <div class="who"><b class="nm">${esc(o.emoji)} ${esc(TNm(o))}</b>${goldLine(o.mid,anyG)}<small>${esc(RNm(o))}</small></div>
    <div class="pts score"><span class="pv">${o.total}</span><small>points</small></div></div>
    <div class="bar"><i style="width:${Math.max(0,o.total)/mx*100}%"></i></div>
    <div class="chips school-grid">${o.teams.map(t=>chipRec(t.tid,{cn:1})).join('')}</div></div>`).join('')+'</div>'}   /* s28g: 'Tap an owner for the full breakdown' note removed */
function goOwner(mid){ownerSel=mid;ATOWN=mid;try{localStorage.setItem('fbn.atown',mid)}catch(e){}tab='teams';   /* s28j item 15 */SUB=null;MISS=null;TOP0=true;hashPut(true);render();window.scrollTo(0,0)}
function gOwned(g){return !!((g.home.owners&&g.home.owners.length)||(g.away.owners&&g.away.owners.length))}
/* s25 Games cards: two tight lines (1: teams + score, 2: time + spread + tags + link), Quick bet pinned to the bottom (full width).
   A finished game is a one-line row (teams, final score, Final): a real <button aria-expanded> (44px) that opens the full card below it. */
const GEXP=new Set();
const gxId=g=>'gx-'+String(g.id).replace(/[^A-Za-z0-9_-]/g,'_');
function gSpread(g){const ln=g.line&&typeof g.line==='object'?g.line:null,sp=ln&&Number(ln.sp);if(!ln||!isFinite(sp)||sp<=0)return '';const f=String(ln.fav)===String(g.home.id)?g.home:String(ln.fav)===String(g.away.id)?g.away:null;if(!f)return '';const t=T.TEAMS[f.id];return 'Spread '+((t&&(t.short||t.name))||f.short||'')+' -'+sp}
function gName(s){const t=T.TEAMS[s.id];return (t&&(t.short||t.name))||s.short||String(s.id)}
/* s28c per-card copy (Games + Bets, same button): copies clean multi-line text for WhatsApp, never a link; the button flips to 'Copied' for 2 s */
const CPI='Copy';const cpBtn=window.LCPBTN=(t,w)=>`<button type="button" class="s27-copy cpt" data-a="cptext" data-t="${esc(t)}" aria-label="Copy this ${esc(w)} as text" title="Copy this ${esc(w)}">${CPI}</button>`;   /* = STOOPIDS s29b .s27-copy */
function cpText(el){const t=String(el.dataset.t||'').replace(/https?:\/\/\S+/g,'').trim();const done=()=>{el.textContent='Copied';el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>{el.textContent=CPI;el.classList.remove('on')},2000)};
  const fall=()=>{try{const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}catch(e){}done()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fall);else fall()}
function gameText(g){/* the reference site s29b copy format (games_snippet.md): lines with missing data are left out; the date + time use the card's own LTIME formatters (device zone + label).
   s28j (= the reference site s29e): no 'Lines: <book>' line; owner lines read '<School>: <emoji> <manager>' (no 'Owner,'). */
  const fin=g.status==='final',live=g.status==='live',ln=g.line&&typeof g.line==='object'?g.line:{};
  const rk=s=>{const r=s.rank!=null&&s.rank!==''?s.rank:(s.seed!=null&&s.seed!==''?s.seed:null);return r!=null?'#'+r+' ':''};
  const fav=ln.fav!=null?(String(ln.fav)===String(g.home.id)?g.home:String(ln.fav)===String(g.away.id)?g.away:null):null,dog=fav?(fav===g.home?g.away:g.home):null;
  const mk=s=>(s===fav?' ⭐':s===dog?' 🐶':'');const sc=s=>(fin||live)&&s.score!=null?' '+s.score:'';const num_=v=>v!=null&&v!==''&&isFinite(+v);
  const out=[`${rk(g.away)}${gName(g.away)}${mk(g.away)}${sc(g.away)} vs ${rk(g.home)}${gName(g.home)}${mk(g.home)}${sc(g.home)}`];
  out.push(etLabel(etKey(g)).replace(/^(Today|Tomorrow|Yesterday) · /,'')+' · '+(fin?'Final':live?'LIVE':etTime(g)));
  const ven=g.venue&&(g.venue.name||g.venue)||'';if(ven)out.push(String(ven));if(g.neutral)out.push('Neutral site');
  if(g.round)out.push(String(g.round));
  const sp=gSpread(g);if(sp)out.push(sp.replace(/^Spread /,'Spread: '));
  const ml=s=>{const v=s===g.home?(ln.hml!=null?ln.hml:ln.mlH!=null?ln.mlH:ln.ml&&ln.ml.home):(ln.aml!=null?ln.aml:ln.mlA!=null?ln.mlA:ln.ml&&ln.ml.away);return num_(v)?(+v>0?'+':'')+v:''};
  if(ml(g.away)&&ml(g.home))out.push('Moneyline: '+gName(g.away)+' '+ml(g.away)+' / '+gName(g.home)+' '+ml(g.home));
  const ou=ln.ou!=null?ln.ou:ln.total;if(num_(ou)&&+ou>0)out.push('Over/under: '+ou);
  const em=n=>{const o=(D&&D.owners||[]).find(x=>x.name===n);return o&&o.emoji?o.emoji+' '+n:n};
  [g.away,g.home].forEach(s=>{if(s.owners&&s.owners.length)out.push(gName(s)+': '+s.owners.map(em).join(', '))});
  return out.join('\n')}
/* s28j item 13: Games card = the reference site gameCard structure (/workspace/s29d/games_kit.md = s29d/stage/index.html 1404-1434, read-only):
   .gh head (time · round · neutral site · 🥊 owner vs owner) + Copy top-right; two .gside rows (school pill, seed, ⭐/🐶) each with a .gow owner line;
   .gl foot = 'Line: <fav> -sp · Moneyline … · Over/under … · book'; .gsp spacer; Quick bet (LBETS.quickHtml = the reference site qbHtml port, wired to New bet / Paste).
   Finals collapse to the the reference site .gsum summary button (League gfin handler). Times: LTIME, no zone label (item 12). */
const gpills=a=>a&&a.length?a.map(n=>{const o=ownerByName(n);return `<span class="opill">${esc(ownerEmoji(n))} ${esc(o?TNm(o):n)}</span>`}).join(''):'';
const fml=n=>n==null?'–':(n>0?'+'+n:String(n));
const tShort=s=>{const t=T.TEAMS[s.id];return(t&&(t.short||t.name))||s.short||String(s.id)};
function lineTxt(g,fin){const ln=g.line&&typeof g.line==='object'?g.line:null;if(!ln)return null;const sp=isFinite(ln.sp)?ln.sp:null,ou=isFinite(ln.ou)&&ln.ou>0?ln.ou:null;
  const fs=String(ln.fav)===String(g.home.id)?g.home:String(ln.fav)===String(g.away.id)?g.away:null;
  const fav=fs&&sp!=null&&sp>0?`<b>${esc(tShort(fs))}</b> -${sp}`:'Pick\u2019em';
  const ml=(ln.aml!=null||ln.hml!=null)?` · Moneyline ${esc(tShort(g.away))} ${fml(ln.aml)} / ${esc(tShort(g.home))} ${fml(ln.hml)}`:'';
  const o=ou!=null?` · Over/under ${ou}`:'';
  return `${fin?(ln.type==='close'?'Closing line':'Last line'):'Line'}: ${fav}${ml}${o}${ln.p?` <span class="mut">· ${esc(ln.p)}</span>`:''}`}
function gameBody(g){const fin=g.status==='final',live=g.status==='live';const ln=g.line&&typeof g.line==='object'?g.line:null;
  const dog=ln?(ln.dog!=null?ln.dog:(String(ln.fav)===String(g.home.id)?g.away.id:String(ln.fav)===String(g.away.id)?g.home.id:null)):null;
  const row=s=>{const lose=fin&&!s.win;const tag=ln&&isFinite(ln.sp)&&ln.sp>0?(String(dog)===String(s.id)?' <span title="betting underdog">🐶</span>':(String(ln.fav)===String(s.id)?' <span title="betting favorite">⭐</span>':'')):'';
    return `<div class="gside${lose?' lose':''}"><div class="nm">${chip(s.id,{big:1,name:s.short})}${s.seed?`<span class="seed">(${esc(s.seed)})</span>`:''}${tag}</div><div class="sc2">${(fin||live)&&s.score!=null?esc(String(s.score)):''}</div></div><div class="gow"${s.owners&&s.owners.length?'':' aria-hidden="true"'}>${gpills(s.owners)||'&nbsp;'}</div>`};
  let head=`<span class="gtm">${fin?'FINAL':live?'<b class="good">LIVE</b>'+(g._lv&&g._lv.detail?' <span class="mut">'+esc(g._lv.detail)+'</span>':''):'<b>'+esc(etTime(g))+'</b>'}</span>`;
  if(g.round)head+=`<span>· ${esc(g.round)}</span>`;else if(g.kind==='conf')head+='<span>· Conf tournament</span>';
  if(g.neutral)head+='<span>· neutral site</span>';
  const on=a=>(a||[]).map(n=>{const o=ownerByName(n);return o?TNm(o):n}).join('/');
  if(g.h2h)head+=`<span class="h2b">🥊 ${esc(on(g.away.owners))} vs ${esc(on(g.home.owners))}</span>`;
  if(g.civil)head+=`<span class="h2b">🙃 SAME OWNER (${esc(on(g.away.owners))} wins either way)</span>`;
  let foot=lineTxt(g,fin)||(fin?'<span class="mut">No betting line on file for this game.</span>':'<span class="mut">📭 line not posted yet</span>');
  if(fin&&g.upset){const u=g.upset;if(g.kind==='ncaa'){if(u.is)foot+=` <span class="up">😱 UPSET +${esc(D.meta.points.upset)}</span>`;else if(u.is===false)foot+=' <span class="mut">· no upset</span>'}else if(u.is)foot+=' <span class="up ns">🐶 Underdog win</span>'}
  foot+=lvNote(g);
  return `<div class="gh">${head}${cpBtn(gameText(g),'game')}</div>${row(g.away)}${row(g.home)}<div class="gl">${foot}</div>`}
function gameCard(g){const fin=g.status==='final';const cls='gm'+(g.h2h||g.civil?' h2h':'');
  if(!fin)return `<div class="${esc(cls)}" data-gid="${esc(String(g.id))}">${gameBody(g)}<div class="gsp" aria-hidden="true"></div>${quick(g)}</div>`;
  const id=String(g.id),op=GEXP.has(id)||SUB===id,x=gxId(g),sc=s=>`${esc(tShort(s))} ${s.score!=null?esc(String(s.score)):''}`;
  return `<div class="${esc(cls)} gfin${op?' open':''}" data-gid="${esc(id)}"><button type="button" class="gsum" data-a="gfin" data-g="${esc(id)}" aria-expanded="${op}" aria-controls="${esc(x)}"><span class="gst">FINAL</span><span class="${g.away.win?'w':''}">${sc(g.away)}</span><span class="mut">·</span><span class="${g.home.win?'w':''}">${sc(g.home)}</span>${g.upset&&g.upset.is?'<span>😱</span>':''}<span class="gch" aria-hidden="true">${op?'▾':'▸'}</span></button><div class="gbody gx" id="${esc(x)}"${op?'':' hidden'}>${gameBody(g)}</div></div>`}
/* s22: the "Quick bet" pill + picker of a Games card is built by js/league-bets.js (it knows the managers, the viewer and the form); '' when it does not apply */
function quick(g){try{return window.LBETS&&LBETS.quickHtml?LBETS.quickHtml(g,{name:s=>{const t=T.TEAMS[s.id];return(t&&(t.short||t.name))||s.short||''}}):''}catch(e){return''}}
/* s26c14 (partner header/footer parity): Refresh Live Games + 'Last updated <time>' sit at the top of the Games tab only (was in the header); lvUI() fills them */
const liveRow=()=>'<div id="live" class="lv" hidden><span id="lvT" aria-live="polite"></span><button id="lvB" type="button" data-a="lvrefresh" aria-label="Refresh live games">&#8635; Refresh Live Games</button><span id="lvU" class="lvU" hidden></span></div>';
function vGames(){const every=D.games||[],nHidden=every.filter(g=>!gOwned(g)).length;if(!nHidden)gAll=false;const all=gAll?every:every.filter(gOwned);
  const ups=all.filter(g=>g.status!=='final'),fin=all.filter(g=>g.status==='final');if(!gMode)gMode=ups.length?'upcoming':'scores';
  let list=(gMode==='upcoming'?ups:fin.slice().reverse());if(gOwner!=='all')list=list.filter(g=>g.home.owners.includes(gOwner)||g.away.owners.includes(gOwner));if(gH2H)list=list.filter(g=>g.h2h||g.civil);
  /* s28g Games filters = STOOPIDS s29d (/workspace/s29d/games_filters_snippet.md, S29D-GF): row 1 = the plain .rkseg/.rkseg-b Upcoming | Past games toggle (no overrides);
     row 2 .gf2 (no card) = Owner, Month (jump to the first game day of that month), Day, + on Upcoming only League's 'Owner vs owner' pill (League has no Pool-only filter). */
  if(gMode!=='upcoming')gH2H=false;
  const days=[...new Set(list.map(etKey))];if(gDay!=='all'&&!days.includes(gDay))gDay='all';if(gDay!=='all')list=list.filter(g=>etKey(g)===gDay);
  let gCapped=0;if(gDay==='all'&&gMode==='upcoming'){const ns=new Set(days.slice().sort().slice(0,12)),n0=list.length;list=list.filter(g=>ns.has(etKey(g)));gCapped=n0-list.length}   /* = the reference site S26U-MONTH-JUMP: All days = next 12 game days */
  if(gMode==='upcoming'){const sk=g=>etKey(g)+(isTBD(g)?'~':' ')+(g.start||'');list.sort((a,b)=>sk(a).localeCompare(sk(b)))}
  const firstDay={};days.slice().sort().forEach(k=>{const m=String(k).slice(5,7);if(!firstDay[m])firstDay[m]=k});const curM=gDay!=='all'?String(gDay).slice(5,7):'';
  const monSel=`<select class="gf2-s gmon-sel${curM?' on':''}" id="gMonthSel" aria-label="Jump to month"><option value="">Month</option>${[['11','Nov'],['12','Dec'],['01','Jan'],['02','Feb'],['03','Mar'],['04','Apr']].map(([m,l])=>firstDay[m]?`<option value="${esc(firstDay[m])}" data-mon="${m}"${m===curM?' selected':''}>${l}</option>`:`<option value="" data-mon="${m}" disabled>${l}</option>`).join('')}</select>`;
  const daySel=`<select class="gf2-s${gDay!=='all'?' on':''}" id="gDaySel" aria-label="Day"><option value="all">All days</option>${days.map(k=>`<option value="${esc(k)}"${k===gDay?' selected':''}>${esc(etLabel(k))}</option>`).join('')}</select>`;
  const gb=(k,l)=>`<button type="button" class="rkseg-b${gMode===k?' on':''}" data-a="gmode" data-v="${k}" aria-pressed="${gMode===k}">${l}</button>`;
  let h=`<div class="rkseg gctl" role="group" aria-label="Games view">${gb('upcoming','Upcoming')}${gb('scores','Past games')}</div>
   <div class="gf2"><select id="gOwnerSel" class="gf2-s${gOwner!=='all'?' on':''}" aria-label="Owner"><option value="all">All owners</option>${D.owners.map(o=>`<option value="${esc(o.name)}"${o.name===gOwner?' selected':''}>${esc(o.emoji)} ${esc(TNm(o))}${RNm(o)?' · '+esc(RNm(o)):''}</option>`).join('')}</select>${monSel}${daySel}${gMode==='upcoming'?`<button type="button" data-a="gh2h" class="gf2-b${gH2H?' on':''}" aria-pressed="${gH2H?'true':'false'}" title="Only games where both teams are owned by league managers">Pool only</button>`:''}</div>${nHidden?`<label class="gUn s27-ck"><input type="checkbox" id="gUnowned"${gAll?' checked':''}> Show unowned games <span class="mut">(${nHidden} hidden)</span></label>`:''}`;
  if(!list.length)return h+`<div class="card" id="gempty">${all.length?'Nothing matches those filters.':nHidden?'No games with an owned team right now 🏀 Check back soon. (Games where nobody in the league owns either team are hidden.)':'No games for rostered teams yet. The schedule and scores show up here as soon as games are played. Everything refreshes automatically.'}</div>`;
  let cur=null;list.slice(0,300).forEach(g=>{const k=etKey(g);if(k!==cur){if(cur!==null)h+='</div>';cur=k;h+=`<div class="gday">${esc(etLabel(k))}</div><div class="${gMode==='scores'?'ggrid gfins':'ggrid'}">`}h+=gameCard(g)});if(cur!==null)h+='</div>';
  if(gCapped)h+=`<div class="card note gmore">+${gCapped} more games later in the season. Pick a day or a month above.</div>`;if(list.length>300)h+=`<div class="card note">Showing the first 300 games. Use the filters to narrow the list.</div>`;return h}
function gameLine(g){const fin=g.status==='final';let up='';if(fin&&g.kind==='ncaa'&&g.res==='W'&&g.seed!=null&&g.oppSeed!=null&&+g.seed>+g.oppSeed)up=' <span class="up">😱 UPSET</span>';return up?`<div class="mut" style="font-size:12px">${up}</div>`:''}
const noPts='No points yet. Everyone starts at 0.';
/* s26c5 Standings > Breakdown: per manager, the total, then each school with points per category (js/scoring.js values via teamCats(), the s26c3 owner breakdown),
   – for none, and the school total. Same compact grid as the Rosters breakdown (no sideways scroll on phones). */
const PCATS=[['wins','Season wins'],['conf_season','Conf. season champ'],['conf_tourney','Conf. tourney champ'],['entry','NCAA entry'],['playin','Play-in win'],['ncaa_wins','NCAA wins'],['upsets','Upsets'],['final4','Final Four'],['champ','National champ'],['missed','Missed dance']];
const PSHORT={wins:'W',conf_season:'CS',conf_tourney:'CT',entry:'In',playin:'PI',ncaa_wins:'NW',upsets:'Up',final4:'F4',champ:'Ch',missed:'Ms'};
function ptsCats(t){const c={};teamCats(t).forEach(x=>{c[x.k]=x.pts});return PCATS.map(([k,l])=>({k,l,pts:c[k]||0}))}
function vPoints(){const own=D.owners.map(o=>{const ts=o.teams.map(t=>{const cs=ptsCats(t);return{t,cs,tot:cs.reduce((x,c)=>x+c.pts,0)}});return{o,ts,tot:ts.reduce((x,r)=>x+r.tot,0)}});
  /* s26c11 (partner s26q parity): one row per school (same-width pills), one column per category, school total last; – = none */
  const hd='<tr class="obh"><th class="ptn" scope="col">Team</th>'+PCATS.map(([k,l])=>`<th scope="col" title="${esc(l)}">${PSHORT[k]}</th>`).join('')+'<th class="ptt" scope="col" title="School total">Tot</th></tr>';
  return '<div id="ptsv">'+own.map(({o,ts,tot})=>`<div class="card obk pk pq" data-mid="${esc(o.mid)}" data-total="${tot}"><div class="obtg"><b class="pkn">${esc(o.emoji)} ${esc(TNm(o))}${RNm(o)?`<small class="tnr">${esc(RNm(o))}</small>`:''}</b><b class="pkt"><span class="pv">${tot}</span> pts</b></div><div class="ptw"><table class="ptab">${hd}`+
    ts.map(({t,cs,tot})=>`<tr class="obr" data-tid="${esc(t.tid)}" data-total="${tot}"><td class="ptn"><span class="obt">${chip(t.tid)}</span></td>${cs.map(c=>`<td class="obp${c.pts===0?' z':c.pts<0?' neg':''}" data-cat="${esc(c.k)}" data-pts="${c.pts}" title="${esc(c.l)}"><b>${c.pts===0?'–':sign(c.pts)}</b></td>`).join('')}<td class="ptt"><b class="obtot">${tot}</b></td></tr>`).join('')+'</table></div></div>').join('')+
    `<p class="note">${PCATS.map(([k,l])=>`<b>${PSHORT[k]}</b> ${esc(l)}`).join(' · ')} · <b>Tot</b> school total. </p>`+
    `<p class="note">Season wins = 1 point each; losses score nothing (record only). Conference season champ +${D.meta.points.conf_reg}, conference tourney champ +${D.meta.points.conf_tourn}. NCAA points: entry +${D.meta.points.entry}, play-in win +${D.meta.points.playin_win}, each win +${D.meta.points.win}, each upset +${D.meta.points.upset}, Final Four +${D.meta.points.final4}, champion +${D.meta.points.champ}, missed the dance ${D.meta.points.missed}. – = none.</p></div>`}
let OBALL=false;let ATOWN=null;const ATS={k:null,d:1};   /* s27 All teams rank sort */   /* s26c11: All teams owner filter ('' = All) */   /* s26c3: owner breakdown shows every category (zeros too) */
/* s26c3/s26c8: every scoring category for one school, in the order of the rules. Wins x S.SEASON_WIN; NCAA categories = FBNScore.tournament events;
   conference titles = FBNScore.confPoints events (scores.json "conf" map; conf_reg only once that conference tournament has started). Losses score nothing (W-L record only). */
/* s26c3/s26c5: every scoring category for one school, in the order of the rules (losses score nothing, so they only show in the W-L record). */
function teamCats(t){const ev=t.events||[],sum=k=>ev.filter(e=>e.kind===k).reduce((x,e)=>x+(+e.pts||0),0);
  return[['wins','Wins',(t.wins||0)*(S.SEASON_WIN||1)],['conf_season','Conf. season champ',sum('conf_reg')],['conf_tourney','Conf. tourney champ',sum('conf_tourn')],   /* s26c8: conference points = FBNScore.confPoints events (scores.json "conf") */
    
    ['entry','NCAA entry',sum('entry')],['playin','Play-in win',sum('playin')],['ncaa_wins','NCAA wins',sum('win')],['upsets','Upsets',sum('upset')],
    ['final4','Final Four',sum('final4')],['champ','National champ',sum('champ')],['missed','Missed dance',sum('missed')]].map(([k,l,pts])=>({k,l,pts}))}
/* s26c14: team ranks in the Rosters school detail. p = STOOPID rank, o = Power rank (KenPom 2026-27 preseason ratings, 1-365), both from assets/teams.js meta
   (T.META[tid], keyed by ESPN id). Display only: grades and sorting stay on p. Missing / invalid value shows a muted '–'. */
const rkNum=v=>{const n=Number(v);return(v!=null&&v!==''&&Number.isInteger(n)&&n>=1&&n<=400)?n:null};
function rkPills(tid){const m=((T&&T.META)||{})[String(tid)]||{};const p=rkNum(m.p),o=rkNum(m.o);const v=n=>n==null?'<b class="mut">–</b>':'<b>#'+n+'</b>';
  return `<div class="rkp" data-p="${p==null?'':p}" data-o="${o==null?'':o}"><span class="pill rk-p">STOOPID rank: ${v(p)}</span><span class="pill rk-o">Power rank: ${v(o)}</span><div class="note rks">Power rank: KenPom 2026-27 preseason ratings</div></div>`}
function vRosters(){if(!ownerSel||!D.owners.some(x=>x.mid===ownerSel))ownerSel=D.owners[0].mid;const o=D.owners.find(x=>x.mid===ownerSel);const mg=MG.find(m=>m.mid===o.mid)||o;
  let h=`<div class="tabs" role="tablist" aria-label="Owner">${D.owners.map(x=>`<button role="tab" aria-selected="${x.mid===ownerSel?'true':'false'}" data-a="pickowner" data-mid="${esc(x.mid)}" class="${x.mid===ownerSel?'on':''}">${esc(x.emoji)} ${esc(TNm(x))}${RNm(x)?' · '+esc(RNm(x)):''}</button>`).join('')}</div>`;
  const cats=Object.entries(o.by_cat).filter(([k,v])=>v!==0);
  h+=`<div class="card ohc" id="ownercard"><div class="oh">${U.avatar(dm(mg),36)}<div class="ohn"><b>${esc(o.emoji)} ${esc(TNm(o))} — ${o.total} pts</b> <span class="mut">(${o.tied?'T-'+o.rank:'#'+o.rank})</span><div class="note">${esc(RNm(o))}</div></div></div>
    <div class="ohp">${cats.length?cats.map(([k,v])=>`<span class="pill">${esc(D.meta.cat_labels[k]||k)}: <b class="${v<0?'bad':''}">${sign(v)}</b></span>`).join(''):'<span class="mut">'+esc(noPts)+'</span>'}</div></div>`;
  /* s26c3 compact owner breakdown: one grid row per school (chip sized to its name, numbers right next to it, Total = sum of its category points)
     and under it a wrap of small category chips (non-zero only; "Show all categories" lists every category, zeros dimmed). Points come from
     FBNScore (js/scoring.js) through the league data: season wins x 1, NCAA events (entry, play-in, wins, upsets, Final Four, champ, missed) as scored. */
  const allC=!!OBALL;
  h+=`<div class="card obk"><div class="obtg"><span class="note">Points per category</span><button data-a="oball" aria-pressed="${allC?'true':'false'}" class="btn sec sm${allC?' on':''}">${allC?'Only non-zero':'Show all categories'}</button></div><div class="obh" aria-hidden="true"><span>Team</span><span class="n">Rec</span><span class="n">W</span><span class="n">NCAA</span><span class="n">Total</span></div>`;
  o.teams.forEach((t,ix)=>{const key=o.mid+'|'+t.tid;const cs=teamCats(t),tot=cs.reduce((x,c)=>x+c.pts,0);const show=allC?cs:cs.filter(c=>c.pts!==0);
    h+=`<div class="obr" data-tid="${esc(t.tid)}" data-total="${tot}"><div class="obl trow" tabindex="0" role="button" aria-expanded="${openTeam[key]?'true':'false'}" aria-label="${esc((T.TEAMS[t.tid]||{}).name||t.tid)}: ${tot} points. Show details" data-a="teamrow" data-key="${esc(key)}"><span class="obt">${chip(t.tid)}</span><span class="n">${esc(rec(t.tid))}</span><span class="n">${t.wins}</span><span class="n">${t.tpts}</span><b class="n obtot">${tot}</b></div>
      <div class="obc">${show.length?show.map(c=>`<span class="obp${c.pts===0?' z':c.pts<0?' neg':''}" data-cat="${esc(c.k)}" data-pts="${c.pts}">${esc(c.l)} <b>${c.pts===0?'0':sign(c.pts)}</b></span>`).join(''):'<span class="mut obz">No points yet</span>'}</div>`;
    if(openTeam[key]){h+=`<div class="det" id="obd-${ix}">`;
      const evs=t.events||[];h+=rkPills(t.tid)+`<span class="pill">Wins: <b>${sign(t.wins)}</b></span><span class="pill">NCAA Tournament points: <b>${sign(t.tpts)}</b></span>`;
      if(evs.length)h+=`<ul class="it">${evs.map(i=>`<li><b class="${i.pts<0?'bad':'good'}">${sign(i.pts)}</b> ${esc(i.label)}</li>`).join('')}</ul>`;
      const tg=(D.team_games[t.tid]||[]);const gs=tg.filter(g=>g.status==='final').slice(-8).reverse();const nx=tg.filter(g=>g.status!=='final').slice(0,3);
      if(!tg.length)h+=`<div class="note" style="margin-top:6px">No games yet. Scores show up here once games are played.</div>`;
      if(gs.length)h+=`<div class="note" style="margin-top:6px">Last games</div>`+gs.map(g=>`<div style="margin:3px 0">${g.res==='W'?'<b class="good">W</b>':'<b class="bad">L</b>'} ${g.us}-${g.them} ${g.site==='A'?'@':g.site==='N'?'vs (N)':'vs'} ${g.oppId?tlink(g.oppId,g.opp):esc(g.opp)} <span class="mut">${esc(fmtDate(g.day))}${g.round?' · '+esc(g.round):''}</span>${g._lv?' <span class="mut">· live ESPN feed, unofficial</span>':''}${gameLine(g)}</div>`).join('');
      if(nx.length)h+=`<div class="note" style="margin-top:6px">Up next</div>`+nx.map(g=>`<div style="margin:3px 0">${g.status==='live'?'<b class="good">LIVE '+g.us+'-'+g.them+'</b> ':''}${g.site==='A'?'@':'vs'} ${esc(g.opp)} <span class="mut">${esc(g.start?etLabel(etKey(g))+', '+etTime(g):fmtDate(g.day))}</span></div>`).join('');
      h+=`</div>`}h+=`</div>`});
  return h+`</div>`}

/* s26c11: conference labels for All teams. Keys are normalised (lowercase, no spaces/punctuation, trailing 'conference'/'league' dropped), so full names
   ('Big 12 Conference'), s26p names ('Big 12') and ESPN standings codes from tools/refresh_data.py ('big12', 'aeast', 'atl10', 'ASUN') all match; unknown codes show uppercase. */
const CFS={'bigten':'B10','big12':'B12','bigeast':'BE','atlantic10':'A10','mountainwest':'MWC','american':'AAC','americanathletic':'AAC','ivy':'Ivy','americaeast':'AE','bigsouth':'BSo','bigwest':'BWC','bigsky':'BSky','sunbelt':'SBC','summit':'Sum','horizon':'Hor','southland':'SLC','patriot':'Pat','atlanticcoast':'ACC','atlanticsun':'ASUN','coastalathletic':'CAA','colonialathletic':'CAA','conferenceusa':'CUSA','metroatlanticathletic':'MAAC','midamerican':'MAC','mideasternathletic':'MEAC','missourivalley':'MVC','northeast':'NEC','ohiovalley':'OVC','southeastern':'SEC','southern':'SoCon','southwesternathletic':'SWAC','unitedathletic':'UAC','westcoast':'WCC','westernathletic':'WAC','pac12':'Pac-12','metro':'MAAC','ameast':'AE','aeast':'AE','atl10':'A10','a10':'A10','acc':'ACC','asun':'ASUN','bige':'BE','bsky':'BSky','bsou':'BSo','big10':'B10','b1g':'B10','b10':'B10','b12':'B12','bigw':'BWC','col':'CAA','caa':'CAA','usa':'CUSA','cusa':'CUSA','hor':'Hor','midam':'MAC','mac':'MAC','meac':'MEAC','mvc':'MVC','mwest':'MWC','mwc':'MWC','neast':'NEC','nec':'NEC','ovc':'OVC','pat':'Pat','sec':'SEC','south':'SoCon','socon':'SoCon','land':'SLC','slc':'SLC','swac':'SWAC','summ':'Sum','belt':'SBC','sbc':'SBC','uac':'UAC','wcc':'WCC','wac':'WAC','maac':'MAAC','aac':'AAC','ae':'AE','be':'BE','pac':'Pac-12'};
const confKey=v=>{let k=String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');const t=k.replace(/(conference|league)$/,'');return t||k};
const confLabel=v=>{if(!v)return'';const k=confKey(v);return CFS[k]||String(v).toUpperCase()};
/* s28j item 15: folded in from the removed Rosters tab: (a) the owner card (avatar, total, place, non-zero category totals) above All teams when one owner is picked
   in the Owner filter (a Standings row opens it); (b) each school's Pts cell has a tooltip with its points per category. */
const ptsTip=t=>{const cs=teamCats(t).filter(c=>c.pts!==0);return cs.length?cs.map(c=>c.l+' '+sign(c.pts)).join(' · '):'No points yet'};
function ownerCard(o){if(!o)return '';const mg=MG.find(m=>m.mid===o.mid)||o;const cats=Object.entries(o.by_cat||{}).filter(([k,v])=>v!==0);
  return `<div class="card ohc" id="ownercard"><div class="oh">${U.avatar(dm(mg),36)}<div class="ohn"><b>${esc(o.emoji)} ${esc(TNm(o))} — ${o.total} pts</b> <span class="mut">(${o.tied?'T-'+o.rank:'#'+o.rank})</span><div class="note">${esc(RNm(o))}</div></div></div>
    <div class="ohp">${cats.length?cats.map(([k,v])=>`<span class="pill">${esc(D.meta.cat_labels[k]||k)}: <b class="${v<0?'bad':''}">${sign(v)}</b></span>`).join(''):'<span class="mut">'+esc(noPts)+'</span>'}</div></div>`}
function vTeams(){const R_=window.LRANK&&LRANK.ready?LRANK:null;const wl=tid=>(D.records||{})[tid]||{w:0,l:0};const pct=r=>r.w+r.l?r.w/(r.w+r.l):0;const nm=tid=>((T.TEAMS[tid]||{}).short||String(tid));
  /* s26c11: partner-style compact All teams: Team, Owner, Rec, Pts, Conf, AP, NET (partner s26p order); Owner filter (All + each manager, 'Test ' stripped). Pts = the Breakdown's per-school sum (teamCats: FBNScore via league-d.js);
     Conf = team meta (scores.json "conf" map, keyed by ESPN id; – until known). Best record first, then NET (unranked last). */
  const CF=(SC&&SC.conf)||{};
  const cf=tid=>{const c=CF[String(tid)];if(c&&c.conf)return String(c.conf);const n=window.LRANK&&LRANK.netConfOf?LRANK.netConfOf(tid):null;if(n)return n;const tm=window.TEAMS_DATA&&TEAMS_DATA.meta&&TEAMS_DATA.meta[String(tid)];return tm&&tm.c?String(tm.c):''};   /* scores.json conf, else the net.json row's conf, else assets/teams.js meta[id].c (s26c12 pool) */
  const own=D.owners.map(o=>({mid:o.mid,name:TNm(o)}));if(ATOWN==null){try{ATOWN=localStorage.getItem('fbn.atown')||''}catch(e){ATOWN=''}}if(ATOWN&&!own.some(o=>o.mid===ATOWN))ATOWN='';
  const rows=[];D.owners.forEach(o=>{if(ATOWN&&o.mid!==ATOWN)return;o.teams.forEach(t=>rows.push({o:TNm(o),on:RNm(o),t,r:wl(t.tid),pts:teamCats(t).reduce((x,c)=>x+c.pts,0)}))});
  const ap=tid=>R_?R_.apOf(tid):null,nt=tid=>R_?R_.netOf(tid):null;const nk=tid=>nt(tid)||1e9;
  rows.sort((a,b)=>pct(b.r)-pct(a.r)||b.r.w-a.r.w||a.r.l-b.r.l||nk(a.t.tid)-nk(b.t.tid)||nm(a.t.tid).localeCompare(nm(b.t.tid)));
  /* s27: power (teams.js meta p) and KenPom (meta o) rank columns; tap a header to sort (asc, desc, then back to best record). Display only. */
  const MT=(T&&T.META)||{};rows.forEach(x=>{const mm=MT[String(x.t.tid)]||{};x.sr=rkNum(mm.p);x.kp=rkNum(mm.o)});
  if(ATS.k){const k=ATS.k;rows.sort((a,b)=>(a[k]==null)-(b[k]==null)||ATS.d*((a[k]||0)-(b[k]||0))||String(a.t.tid).localeCompare(String(b.t.tid)))}
  const sth=(k,lf,ls,t)=>`<span class="n s27-sort" aria-sort="${ATS.k===k?(ATS.d>0?'ascending':'descending'):'none'}"><button type="button" data-a="atsort" data-k="${k}" title="${esc(t)}. Tap to sort"><span class="s27-lf">${lf}</span><span class="s27-ls">${ls}</span><i aria-hidden="true">${ATS.k===k?(ATS.d>0?'▲':'▼'):'↕'}</i></button></span>`;
  const fb=(mid,lab)=>`<button type="button" class="atf${(ATOWN||'')===mid?' on':''}" data-a="atown" data-mid="${esc(mid)}" aria-pressed="${(ATOWN||'')===mid?'true':'false'}">${esc(lab)}</button>`;
  const ocard=ATOWN?ownerCard(D.owners.find(o=>o.mid===ATOWN)):'';
  return ocard+`<div class="atfw" role="group" aria-label="Owner filter" id="atfilter"><span class="atfl">Owner</span>${fb('','All')}${own.map(o=>fb(o.mid,o.name)).join('')}</div>
  <div class="card obk atk" id="allteams"><div class="obh"><span>Team</span><span>Owner</span><span class="n">Rec</span><span class="n">Pts</span><span class="atc">Conf</span><span class="n">AP</span><span class="n">NET</span>${sth('sr','STOOPID','ST','STOOPID rank')}${sth('kp','KenPom','KP','KenPom rank')}</div>${rows.map(r=>`<div class="obr" data-tid="${esc(r.t.tid)}" data-w="${r.r.w}" data-l="${r.r.l}" data-pts="${r.pts}"><div class="obl"><span class="obt">${chip(r.t.tid)}</span><span class="ato" title="${esc(r.o)}${r.on?' · '+esc(r.on):''}"><b class="tnt">${esc(r.o)}</b>${r.on?`<small class="tnr">${esc(r.on)}</small>`:''}</span><span class="n">${esc(rec(r.t.tid))}</span><span class="n atp" title="${esc(ptsTip(r.t))}">${r.pts}</span><span class="atc" title="${esc(cf(r.t.tid))}">${esc(confLabel(cf(r.t.tid))||'–')}</span><span class="n">${ap(r.t.tid)?'#'+ap(r.t.tid):'–'}</span><span class="n">${nt(r.t.tid)||'–'}</span><span class="n ats">${r.sr==null?'<span class="mut">–</span>':r.sr}</span><span class="n ats">${r.kp==null?'<span class="mut">–</span>':r.kp}</span></div></div>`).join('')}</div><p class="note atn">${ATS.k?'Sorted by '+(ATS.k==='sr'?'STOOPID':'KenPom')+' rank (tap the header again to flip, a third time for best record).':'Sorted by record (best first), then NET. Tap STOOPID or KenPom to sort by that rank.'} STOOPID = STOOPID rank. KenPom = KenPom 2026-27 preseason ratings rank. Rec = regular-season and conference games. AP = AP Top 25 (ESPN)${R_&&R_.apDate?', '+esc(fmtDate(R_.apDate)):''}; NET = NCAA.com NET${R_&&R_.netThrough?', through '+esc(fmtDate(R_.netThrough)):''}${R_?'':' (loading…)'}. – = unranked. Pts = fantasy points so far (same as Standings › Breakdown). ${ATOWN?'Showing '+rows.length+' schools for one owner.':'Every school drafted in this league is listed, '+rows.length+' in all.'}</p>`}
function mark(f){if(!f)return '';if(f.v===true)return '✅';if(f.v===false)return '<span class="mut">·</span>';return '<span class="mut" title="not decided yet">⏳</span>'}
function vPostseason(){const M=D.meta;
  let h=`<div class="swipe">↔ Swipe sideways to see every column</div><div class="card sc"><table><tr><th>Team</th><th>Owner</th><th>Made NCAA</th><th>Play-in win</th><th class="n">NCAA wins</th><th class="n">Upsets</th><th>Final Four</th><th>National champ</th><th>Missed dance</th></tr>`;
  D.owners.forEach(o=>o.teams.forEach(t=>{const c=D.checklist[t.tid]||{};
    h+=`<tr><td>${chip(t.tid)}</td><td>${tnHtml(o,'tnin')}</td><td>${mark(c.ncaa_entry)}</td><td>${c.playin_win&&c.playin_win.v?'✅':'<span class="mut">·</span>'}</td><td class="n">${c.ncaa_wins||0}</td><td class="n">${c.upsets||0}</td><td>${mark(c.final4)}</td><td>${mark(c.champ)}</td><td>${mark(c.missed_dance)}</td></tr>`}));
  h+=`</table></div><p class="note">✅ yes · ⏳ not decided yet · · no</p>`;
  h+=`<h2>NCAA Tournament standings</h2>`;
  if(!M.haveNcaa)h+=`<div class="card" id="notourney"><b>The NCAA Tournament has not started.</b><div class="note">${errT?'The tournament file could not be loaded ('+esc(errT)+'). ':''}Standings appear here once the field is set in March 2027. Schools earn points for making the field, winning games, reaching the Final Four and winning the title, plus a bonus for each upset by seed. Until then everyone is at 0.</div></div>`;
  const TOU=D.tournament||[];const mx=Math.max(10,...TOU.map(r=>r.score));
  h+='<div class="ocl" id="tstand">'+TOU.map(r=>{const o=D.owners.find(x=>x.mid===r.mid)||{};return `<div class="card oc strow" data-mid="${esc(r.mid)}"><div class="lb"><div class="rank place">${esc((r.tied?'T-':'')+r.place)}</div><div class="who"><b class="nm">${esc(o.emoji||'')} ${esc(TNm(o)||r.name)}</b><small>${RNm(o)?esc(RNm(o))+' · ':''}${plural(r.wins,'win','wins')} · ${plural(r.upsets,'upset','upsets')}</small></div><div class="pts score"><span class="pv">${r.score}</span><small>points</small></div></div><div class="bar"><i style="width:${Math.max(0,r.score)/mx*100}%"></i></div><div class="chips school-grid">${(o.teams||[]).map(t=>{const x=r.teams&&r.teams[t.tid];return chip(t.tid,{cn:1}).replace(/<\/a>$/,'<span class="cr">'+(x?(x.pts>0?'+':'')+x.pts+' pts':'0 pts')+'</span></a>')}).join('')}</div></div>`}).join('')+'</div>';
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
  <p class="note"><a class="btn sec" href="${esc(U.pageUrl('help.html'))}">Help</a> <a class="btn sec" href="${esc(cleanPath('recap'))}" data-a="tab" data-v="recap">Draft recap</a></p>`}
function vArchive(){return `<h2>🗂️ Season archive</h2><div class="card" id="archempty"><b>No past seasons yet</b><div class="note">This league's first season is the one in progress. When a season is finished, its final standings and rosters are kept here. Nothing is made up.</div></div>`}
function vRedraft(){const m=L.meta,r=m.redraft,live=r&&r.phase==='live';const done=live&&L.state.status==='complete';const cd=F.redraftCountdown(Date.now(),U.tz());const can=!DEMO&&!m.endedEarly&&(r||cd.state!=='future');const dd=F.REDRAFT.asOfLabel;
  const line=m.endedEarly?'The first draft ended early, so there is no Redraft.':!r?(cd.state==='future'?'Opens '+dd+' · '+cd.text+'.':'The Redraft is ready to open. The commissioner starts it.'):r.phase==='open'?'The Redraft is open: owners can choose their drops now.':done?'The Redraft is complete.':'The Redraft is under way.';
  const href=U.pageUrl('redraft.html',{l:id});
  const btn=DEMO?'':can?`<a class="btn endbig" id="redraftlink" href="${esc(href)}">${live?'Open the Redraft':'Go to the Redraft page'}</a>`:`<button class="btn endbig" id="redraftlink" disabled aria-disabled="true">${m.endedEarly?'Not available':'Opens '+esc(dd)}</button> <a class="btn sec" id="redraftpreview" href="${esc(href)}">Preview the rules and standings</a>`;
  const prac=!DEMO&&tabOn('redraft')&&LTABS.pracOpen(nowMs(),L&&L.meta)?`<a class="btn block prac" id="redraftmock" href="${esc(REDRAFT_MOCK_URL(id))}">Practice the Redraft</a>`:'';
  let h=prac+`<div class="card" id="redraftcard"><b>\u{1F4C5} Redraft: ${esc(dd)}</b><ul class="it">
   <li><b>Snake draft</b> in standings order as of ${esc(dd)}. <b>Last place</b> chooses where they draft, then it moves up the standings.</li>
   <li><b>Tiebreaker:</b> same win percentage? The owner with fewer wins ranks lower.</li>
   <li>Each owner has the <b>option</b> to drop up to 2 teams and draft one team for each one dropped. Dropped teams go back into the pool.</li></ul>
   <p class="note" id="rdline">${esc(line)}</p><div class="rdbtns">${btn}</div></div>`;
  if(!(r&&r.keep&&Object.keys(r.keep).length))h+=`<div class="card">No Redraft moves yet. Each owner's drops and adds will show up here after the ${esc(dd)} Redraft.</div>`;
  h+=D.owners.map(o=>`<div class="card"><b>${esc(o.emoji)} ${esc(TNm(o))}</b><div class="note">${esc(RNm(o))}</div><div class="chips school-grid">${o.teams.map(t=>chip(t.tid)).join('')}</div></div>`).join('');return h}
const isTestL=()=>A.isTestLeague(L&&L.meta&&L.meta.name);const dm=m=>Object.assign({},m,{name:A.disp(m.name,isTestL()),team:A.disp(m.team,isTestL())});
/* s26c10 Draft tab: before the draft is complete a big room link; after, the pick board only (round by round, manager + school), no room link */
function draftBtn(){return `<div class="card" id="draftpre"><b>📝 The draft</b><div class="note">The draft is not complete yet. Picks, the clock and the chat are in the draft room.</div><p><a class="btn endbig" id="godraft" href="${esc(roomHref())}">Go to draft room</a></p></div>`}
/* the Draft tab counts the draft as done only when its completed time is set (completed_at; Draft Room writes it as meta.endedAt) AND every pick is made */
function draftComplete(m,st){const at=m.completed_at||st.completed_at||m.completedAt||m.endedAt;const P=(st.picks||[]).filter(p=>p&&p.tid!=null).length;const tot=st.total||((m.settings&&m.settings.rounds||0)*(MG.length||8));return (!!at&&tot>0&&P>=tot)||(tot>0&&P>=tot)}   /* s26c14: a natural finish (every pick made; Draft Room sets no endedAt then) also counts */
function vDraft(){const st=L.state||{},m=L.meta||{};if(!draftComplete(m,st))return draftBtn();const P=(st.picks||[]).filter(p=>p&&p.tid!=null);const n=MG.length||8;const ow={};(D.owners||[]).forEach(o=>{ow[o.mid]=o});
  const rounds=[];P.forEach((p,i)=>{const r=Math.floor(i/n);(rounds[r]=rounds[r]||[]).push({n:i+1,p})});
  return `<div class="card dbhead" id="dboard"><b>📝 Draft board</b><div class="note">${P.length} picks · ${rounds.length} rounds</div></div>`+rounds.map((R,ri)=>`<div class="card dround" data-round="${ri+1}"><b class="drt">Round ${ri+1}</b><ol class="dpicks">${R.map(x=>{const o=ow[x.p.owner]||{};return `<li class="dpick" data-pick="${x.n}"><span class="dpn">${x.n}</span><span class="dpm">${esc(o.emoji||'')} ${esc(o.name||'')}</span><span class="dps">${chip(x.p.tid)}</span></li>`}).join('')}</ol></div>`).join('')}
/* s26c10 Recap tab: the draft recap grade cards (power rankings, A+ to D) on top, then the weekly write-ups (newest first; placeholder until opening week) */
function vRecap(){/* s28: partner order: draft grades (two-column card grid on desktop, one column on phones), then weekly write-ups, then the draft board */const st=L.state||{},m=L.meta||{};
  return `<div class="s28-rc" id="recapcols"><section class="s28-rcc" id="recapgradescol"><h2>🎓 Draft grades</h2><div id="recapgrades"></div></section><section class="s28-rcc" id="recapweekly"><h2 class="wkh">📰 Weekly recaps</h2><div class="card" id="weeklyempty"><b>First recap coming after opening week</b></div></section></div>${draftComplete(m,st)?vDraft():''}${recapRoomLink()}`}
const recapRoomLink=()=>`<p class="rcroom"><a class="rcrl" id="recaproom" href="${esc(U.roomHref(id))}">Draft room →</a></p>`;
function recapMount(){const h=document.getElementById('recapgrades');if(!h||!window.FBNPower)return;FBNPower.mount(h,{id,done:true,managers:MG,state:L.state,teams:T.TEAMS,meta:(window.TEAMS_DATA&&TEAMS_DATA.meta)||L.meta})}/* s27qa BUG1: grades need the teams.js meta (o/p ranks), not the league meta */
/* s28c Share tab: pick the whole site or one tab; the link carries that route hash and ?view=1 */
const SHTABS=[['','Whole site'],['standings','Standings'],['games','Games'],['bets','Bets'],['teams','All teams'],['recap','Recap'],['rules','Rules']];let SHTAB='';
function vShare(){const u=shareUrl(SHTAB),nm=(L&&L.meta?A.disp(L.meta.name,isTestL()):'this league');   /* = STOOPIDS s29b .s29sh (League: no Archive) */
  return `<div class="card s29sh" id="sharecard"><h2>Share ${esc(nm)}</h2><p class="s29sh-sub" id="s29shSub">Read-only link for friends and family</p><label class="s29sh-l" for="s29shSel">What to share</label><select id="s29shSel">${SHTABS.map(([v,l])=>`<option value="${v}"${v===SHTAB?' selected':''}>${esc(l)}</option>`).join('')}</select><button type="button" class="rkseg-b on s29sh-b" id="s29shBtn" data-a="shareleague">${canShare()?'Share':'Copy link'}</button><div class="s29sh-u" id="s29shUrl">${esc(u)}</div><p class="mut">View-only link: people who open it can look around but can't add or change bets.</p>${window.LVIEW?'':`<div class="s29sh-mg" id="s29shMg"><span class="s29sh-ml">Managers: use the regular link</span> <span class="s29sh-u" id="s29shMgUrl">${esc(mgrUrl())}</span> <button type="button" class="s27-copy cpt" id="s29shMgCopy" data-a="copymgr" aria-label="Copy the regular managers link" title="Copy the regular managers link">${CPI}</button></div>`}</div>`}
/* s28j item 10 Profile tab (Paul via NCAA, = the reference site s29e): (1) 'You're using the site as' + team on top (TEAM_NAME_ON_TOP), real name under; (2) My settings = the
   existing Draft Room My settings (room.html?settings=1: core.js makeProfile / teamPick / teamTaken, latest save wins, duplicate block, photo cap, real name commissioner-only)
   opened from here, no new writes and no fork; (3) 'Notifications · Coming soon' placeholder (no controls); (4) the share section (item 9).
   View mode (?view=1) / no manager on this device: only 'You're viewing a read-only link' + the friends share section. */
function vProfile(){const o=ME&&D&&D.owners?D.owners.find(x=>x.mid===ME):null;
  if(window.LVIEW||!o)return `<h2>👤 Profile</h2><section class="card" id="profile-who"><p class="mut" id="profileRo" style="margin:0">You're viewing a read-only link</p></section><section id="profile-share">${vShare()}</section>`;
  const edit=U.pageUrl('room.html',{l:id,settings:1});
  return `<h2>👤 Profile</h2><section class="card" id="profile-who"><div class="mut small">You're using the site as</div><div class="row nw" style="gap:10px;margin-top:6px">${U.avatar(dm(o),46)}<div class="grow" style="min-width:0"><b class="pf-team" id="profileTeam">${esc(TNm(o))}</b>${RNm(o)?`<div class="mut small pf-name" id="profileName">${esc(RNm(o))}</div>`:''}</div></div></section>
   <section class="card" id="profile-settings"><h2 style="margin:0 0 6px">My settings</h2><div class="note">Team name, photo and emoji: how you appear on the board, in chat and on the league site. Only the commissioner can change your real name.</div><p style="margin:10px 0 0"><a class="btn" id="profileEdit" href="${esc(edit)}">✏️ Edit my settings</a></p></section>
   <section class="card" id="profile-notify"><h2 style="margin:0">Notifications · Coming soon</h2></section>
   <section id="profile-share">${vShare()}</section>`}
const VIEWS={profile:vProfile,share:vProfile,recap:vRecap,draft:vDraft,standings:vStandings,games:()=>vGames(),rosters:vRosters,bets:()=>LBETS.view(),teams:vTeams,postseason:vPostseason,redraft:vRedraft,archive:vArchive,rules:vRules};
/* one line per school name: shrink the font a step at a time until it fits (floor 9px), else ellipsis */
function chipFit(){/* chips are one fixed size; a long name is cut with an ellipsis (the title attribute has the full name), never shrunk or wrapped */}
try{let _cf=0;window.addEventListener('resize',()=>{clearTimeout(_cf);_cf=setTimeout(()=>{try{chipFit()}catch(_){}},120)});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{try{chipFit()}catch(_){}})}catch(_){}
/* ---------- page shell ---------- */
const roomHref=()=>U.roomHref(id),recapHref=()=>U.pageUrl('recap.html',{l:id});
function header(){const m=L.meta;
  const ctl=CM?`<div class="heroctl" id="heroctl"><button class="btn sm" data-a="yourlinks" id="yourlinks">🔗 Your links</button><button class="btn sm" data-a="herochange" id="herochange">Change photo</button>${HERO_CUSTOM?'<button class="btn sm" data-a="heroreset" id="heroreset">Reset to default</button>':''}<input type="file" id="herofile" accept="image/jpeg,image/png,image/webp,image/*" hidden></div>`:'';
  return `<header id="lhdr"><div class="herow" id="herow"><div class="hero" id="hero" role="img" aria-label="College basketball banner"></div>${ctl}</div><div class="titlebar" id="lhead"><p class="s27-pres" id="lpres">Stoopids presents</p><div class="s27-hd"><h1 id="ltitle">${esc(A.disp(m.name,isTestL()))}</h1></div>
  <p class="tag" id="tag">${esc(tagFor())}</p></div><div class="sub" id="badges" style="margin:0">${D.meta.mode==='demo'?'<span class="badge warn" id="samplenote">DEMO DATA</span>':''}</div></header>`}
const nbNew=on=>{try{return !on&&!DEMO&&window.LBETS&&LBETS.badge?(+LBETS.badge()||0):0}catch(e){return 0}};   /* s28g: a COUNT of new bets (yellow pill) */   /* s22: small "new" mark on the Bets tab when someone has added since this device last looked */
/* s25 date-windowed tabs (LTABS in js/league-d.js). nowMs(): the device clock; on localhost only, tests may set localStorage 'fbn.now' (like fbn.store). */
function nowMs(){try{if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){const v=Date.parse(localStorage.getItem('fbn.now')||'');if(!isNaN(v))return v}}catch(e){}return Date.now()}
function tabCtx(){const m=(L&&L.meta)||{},r=m.redraft;const st=r?(r.phase==='live'&&L.state&&L.state.status==='complete'?'done':'open'):'none';
  const ch=((D&&D.games)||[]).filter(g=>g.kind==='ncaa'&&/champ/i.test(g.round||'')).map(etKey).sort().pop()||null;return{redraft:st,champDay:ch}}
const tabOn=t=>{try{return LTABS.visible(t,nowMs(),tabCtx())}catch(e){return true}};
/* s25 League header title: three lines (presenter line, title, subtitle). Draft Room will ship the title as window.FBN_TITLE {pre,main,sub};
   until then the neutral fallback below is used: no presenter line (hidden), then the title and the subtitle. No brand name in League files. */
const LBRAND_FALLBACK={pre:'',main:'NCAA Fantasy Basketball',sub:'Season + Tournament'};   /* TEMP until window.FBN_TITLE exists */
function brandHtml(){const t=(window.FBN_TITLE&&window.FBN_TITLE.main)?window.FBN_TITLE:LBRAND_FALLBACK;
  return `<div class="lbrand" id="lbrand"><div class="lb-pre"${t.pre?'':' hidden'}><img class="lb-ball" src="icons/icon-192.png" alt="" width="24" height="24"><span>${esc(t.pre||'')}</span></div><div class="lb-main">${esc(t.main)}</div><div class="lb-sub">${esc(t.sub||'')}</div></div>`}
/* s25 "remember this device": the secret was taken out of the address bar before any script ran (top of js/league-d.js, F.consumeUrlSecret);
   here it is validated once against the seat's claim and, if right, stored on the device. A wrong one is dropped and never stored. */
async function urlSignIn(d){const X=window.LURL;if(window.LVIEW)return;if(!X||X.done||!X.had)return;X.done=true;const m=d.meta;
  try{if(X.as&&X.k){const c=F.joinedList(m,d.claims).find(c=>c.mid===X.as);if(c&&await F.checkMgrSecret(c,X.k)){U.setMe(id,{mid:X.as,k:X.k});U.toast&&U.toast('Signed in on this device as '+c.name)}else{U.toast&&U.toast('That manager link is not valid. This device was not signed in.')}}
    if(X.cm&&F.checkPass&&await F.checkPass(m,X.cm))U.lsSet('cm.'+id,X.cm)}catch(e){}
  X.as=X.k=X.cm=''}
const REDRAFT_MOCK_URL=lid=>U.pageUrl('mock.html',{l:lid,mode:'redraft'});   /* Draft Room's redraft mock (mock.html arrives in Draft Room s26) */
function navHtml(){return `<nav id="ltabs" aria-label="League site">${TABS.filter(t=>tabOn(t[0])).map(t=>{const sp=t[1].indexOf(' '),ic=t[1].slice(0,sp),full=t[1].slice(sp+1),on=t[0]===tab;
    return `<a class="${on?'on':''} tb" href="${esc(cleanPath(t[0]))}" data-a="tab" data-v="${esc(t[0])}" aria-label="${esc(full)}${t[0]==='bets'&&nbNew(on)?', '+nbNew(on)+' new bet'+(nbNew(on)===1?'':'s'):''}"${on?' aria-current="page"':''}><span class="ni" aria-hidden="true">${ic}</span>${t[0]==='bets'&&nbNew(on)?'<b class="nb" id="betsBadge" aria-hidden="true">'+Math.min(99,nbNew(on))+'</b>':''}<span class="nl f">${esc(full)}</span><span class="nl s" aria-hidden="true">${esc(t[2])}</span><span class="nl m" aria-hidden="true">${esc(t[3]||t[2])}</span></a>`}).join('')}</nav>`}
function chatBar(){const o=!!CHAT.open;return `<section id="chat" class="chat" aria-label="Chat"><button type="button" class="chat-t" id="chatbar" data-a="chatopen" aria-expanded="${o}" aria-controls="chatpanel"><span class="ca" aria-hidden="true">${o?'▾':'▸'}</span><span class="cbm"><span class="cb1" id="chatpres">💬 Chat with the league</span><span class="cb2 mut" id="chatlast">Tap to open the chat</span></span><i class="cdot" id="chatbadge" hidden></i></button><div class="chat-b" id="chatpanel" role="region" aria-label="League chat"${o?'':' hidden'}><div class="chat-h"><span class="note">The same chat as the draft room</span><a class="chat-room" id="chatroom" data-a="chatroom" href="${esc(roomHref())}">Open in the draft room</a></div><div class="chat-l" id="chatlist" role="log" aria-live="polite"></div>${ME&&!DEMO?'<form class="chat-f" id="chatform" autocomplete="off"><label class="sr" for="chatin">Message</label><input id="chatin" maxlength="280" autocomplete="off" enterkeyhint="send" placeholder="Message the league"><button type="submit" id="chatsend">Send</button></form>':'<div class="chat-p"><div class="note" id="chatwatch">👀 Watching only: you can read the chat. To write, open this page from your own manager link.</div></div>'}<div class="chat-m" id="chatmsg" role="status" aria-live="polite"></div></div></section>`}
function footer(){return `<footer id="foot"><div id="fresh" class="ffresh" hidden><span></span></div>${esc(A.disp(L.meta.name,isTestL()))} · times in your time zone${DEMO?` · <a href="${esc(U.pageUrl("league.html",{l:id}))}">back to the real league</a>`:""}</footer>`}   /* s28j #3: no Draft recap / Home / Build / Reload in the footer (= the reference site) */
const dataNote=()=>errS&&!(window.LSCHED&&LSCHED.has())&&(tab==='standings'||tab==='teams')?`<div class="card" id="nodata"><b>No scores yet.</b><div class="note">The scores file could not be loaded (${esc(errS)}), so everyone shows zero. A maintainer can refresh it; see the README.</div></div>`:'';
/* s20: before the season (the data has no game for any rostered school, so every manager is 0-0) say so, instead of an unexplained 0-0 / "No games". The live ESPN overlay only updates games that are
   already in data/scores.json, so with no game in the data it returns nothing either. The notice is gone as soon as any game exists in the data (any status). Not shown in the demo. */
/* s21: the quiet schedule status line (js/league-sched.js): "Schedule updated N min ago", or "Schedule temporarily unavailable, showing last saved" */
function schedLine(){return '';/* s28j item 13 / #2: no schedule status line (= the reference site) */if(DEMO||!window.LSCHED||!/^(standings|games|rosters|teams|postseason)$/.test(tab))return '';const t=LSCHED.line();return t?'<div class="note" id="schedline" role="status" style="margin:0 2px 8px">'+esc(t)+'</div>':''}
function schedUpdate(){try{rebuild()}catch(e){return}const a=document.activeElement,t=a&&a.tagName;if(tab==='bets'||tab==='redraft'||t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;render()}
function scoreNotice(){if(DEMO||!D||(D.games&&D.games.length)||!/^(standings|games|rosters|teams|postseason)$/.test(tab))return '';return '<div class="card note" id="noscores" role="note">\u{1F4C5} Scores update once games start (first games November 2, 2026)</div>'}
function render(){if(!tabOn(tab)){tab='standings';SUB=null;MISS=null;hashPut(false)}const keepScroll=window.scrollY,AK=TOP0?null:aTake();const nv0=document.getElementById('ltabs'),nsl=nv0?nv0.scrollLeft:0;
  const demo=DEMO?`<div class="demobar" id="demobar" role="note"><b>DEMO</b> · invented games and scores. These are not real results and not this league’s standings. <a href="${esc(U.pageUrl('league.html',{l:id}))}">Leave the demo</a></div>`:'';
  app.innerHTML=demo+header()+navHtml()+'<main id="main">'+(window.LVIEW?'<div class="vobadge" id="vobadge" role="status">👀 View only</div>':'')+(DEMO?'<div class="card note" id="demonote"><b>DEMO data.</b> Invented games and scores, to show how standings will look. Not real results.</div>':'')+offHtml()+dataNote()+scoreNotice()+schedLine()+`<div id="dlnote">${missHtml()}</div>`+'<div id="lbody">'+(VIEWS[tab]||vStandings)()+'</div></main>'+(window.LVIEW?'':chatBar())+footer();
  document.body.classList.add('lsite');document.body.dataset.ltab=tab;paintHero();paintChat();freshStart();try{chipFit()}catch(_){}try{titleFit()}catch(_){}try{if(window.LBETS&&LBETS.after)LBETS.after()}catch(_){}try{if(tab==='recap')recapMount()}catch(_){}syncChat();navScroll(nsl);if(TOP0&&topReady()){TOP0=false;topNow()}else if(AK)aPut(AK);else if(!TOP0&&keepScroll>0&&Math.abs(window.scrollY-keepScroll)>=1)selfScroll(keepScroll)}
/* phone: the tab bar scrolls sideways inside itself; keep its position and make sure the open tab is visible */
function navScroll(x){const n=document.getElementById('ltabs');if(!n)return;n.scrollLeft=x;const on=n.querySelector('.on');if(!on||n.scrollWidth<=n.clientWidth+1)return;const l=on.offsetLeft,r=l+on.offsetWidth;if(l<n.scrollLeft+8)n.scrollLeft=Math.max(0,l-8);else if(r>n.scrollLeft+n.clientWidth-8)n.scrollLeft=r-n.clientWidth+8}
function syncChat(){const s=document.getElementById('chat');document.documentElement.style.setProperty('--chatH',(s&&!s.hidden?s.offsetHeight:0)+'px');const d=document.getElementById('demobar');document.documentElement.style.setProperty('--demoh',(d?d.offsetHeight:0)+'px')}
window.addEventListener('resize',syncChat);
/* s28g: keep a long league name on one line: step #ltitle down from its CSS size (clamp in league-app.css) to a 60% floor; below the floor let it wrap.
   s28j: the fit sets --title-fs on #lhead (not the title's own font-size), so the kicker (.s27-pres = max(11px, --title-fs * --kicker-ratio)) follows the fitted size at every width. */
function titleFit(){const t=document.getElementById('ltitle'),hd=document.getElementById('lhead');if(!t||!hd)return;hd.style.removeProperty('--title-fs');t.style.fontSize='';t.style.whiteSpace='nowrap';const base=parseFloat(getComputedStyle(t).fontSize)||0,floor=Math.ceil(base*0.6);let fs=base;
  while(fs>floor&&t.scrollWidth>t.clientWidth+1){fs=Math.max(floor,fs-1);hd.style.setProperty('--title-fs',fs+'px')}
  if(t.scrollWidth>t.clientWidth+1)t.style.whiteSpace='';t.dataset.fit=fs<base?String(fs):''}
try{let _tf=0;window.addEventListener('resize',()=>{clearTimeout(_tf);_tf=setTimeout(()=>{try{titleFit()}catch(_){}},120)});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{try{titleFit()}catch(_){}})}catch(_){}
/* ---------- banner photo (default file; commissioner may change it; own small key, cached, never polled) ---------- */
/* s25 league photo hook: the optional photo from setup (meta.settings.photo, JPEG data URL) is the fallback when the commissioner has not set a banner photo.
   Validated exactly as the hook asks (and by F.heroOk again inside U.heroApply); never put into innerHTML. */
let BOOTM=null;   /* last league meta read (also before the draft, when L is not set yet) */
function leaguePhoto(){const M_=(L&&L.meta)||BOOTM,p=M_&&M_.settings&&M_.settings.photo;return typeof p==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p)&&F.heroOk(p)?p:null}
function paintHero(){const el=document.getElementById('hero');if(el)U.heroApply(el,HERO_CUSTOM||leaguePhoto()||F.HERO.file)}
async function loadHero(force){HERO_CUSTOM=DEMO?null:await U.heroLoad(id,force)}
function readImage(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();im.onload=()=>{URL.revokeObjectURL(url);res(im)};im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('That file is not a picture we can open.'))};im.src=url})}
const heroEncoder=im=>async(edge,q)=>{const w=edge,h=Math.round(edge*5/16);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const sc=Math.max(w/im.width,h/im.height);const dw=im.width*sc,dh=im.height*sc;x.fillStyle='#10131a';x.fillRect(0,0,w,h);x.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);return c.toDataURL('image/jpeg',q)};
async function heroWrite(rec){if(window.LVIEW)return false;for(let a=0;a<2;a++){try{await Store.set(F.Keys(id).hero,rec===null?'':rec)}catch(e){if(a)return false;continue}await U.sleep(500);try{const chk=F.parseHero(await Store.get(F.Keys(id).hero));if(rec===null?!chk:(chk&&chk.url===rec.url))return true}catch(e){return true}}return false}
async function heroChange(file){if(!F.heroWritable(CM)){U.toast('Only the commissioner can change the photo.',4500);return}
  try{if(!/^image\//.test(file.type||'')){U.toast('Choose a picture file.',4000);return}const im=await readImage(file);const fit=await F.fitHero(heroEncoder(im));if(!fit){U.toast('That picture is too big even after shrinking. Try another.',5000);return}
    if(!F.heroOk(fit.dataUrl)){U.toast('That picture cannot be used. Try another.',5000);return}
    const rec=F.makeHero(fit.dataUrl);if(await heroWrite(rec)){HERO_CUSTOM=fit.dataUrl;U.heroRemember(id,fit.dataUrl);U.toast('Photo changed.',3500);render()}else U.toast('Could not save the photo. Try again.',5000)}
  catch(e){U.toast(e&&e.message?e.message:'Could not use that picture.',5000)}}
async function heroReset(){if(!F.heroWritable(CM)){U.toast('Only the commissioner can change the photo.',4500);return}
  if(await heroWrite(null)){HERO_CUSTOM=null;U.heroRemember(id,null);U.toast('Back to the default photo.',3500);render()}else U.toast('Could not reset the photo. Try again.',5000)}
/* ---------- chat bar: last message + who is around (read-only; the chat itself lives in the draft room) ---------- */
let CHAT={n:0,last:null,msgs:[],open:false,pend:[],draft:'',sig:'',timer:null},PRES=[];
async function loadChat(){if(DEMO)return;try{const c=F.normChat(F.parseJ(await Store.get(F.Keys(id).chat)));CHAT.n=c.msgs.length;CHAT.msgs=c.msgs;CHAT.last=c.msgs.length?c.msgs[c.msgs.length-1]:null;FAIL.chat=false}catch(e){FAIL.chat=true}
  try{const now=Date.now();const rs=await Promise.all(MG.map(async m=>{try{const p=F.parsePresence(await Store.get(F.Keys(id).pres(m.mid)));return p&&now-p.t<=F.PRES.onlineMs?A.disp(m.name):null}catch(e){return null}}));PRES=rs.filter(Boolean)}catch(e){}}
const chatName=w=>{const m=MG.find(x=>x.mid===w);return m?A.disp(m.name,isTestL()):'Someone'};
const chatTime=ts=>{try{return Date.now()-ts>20*3600e3?LTIME.wdTime(ts):LTIME.time(ts)}catch(e){return''}};
function chatMsg(t,bad){const m=document.getElementById('chatmsg');if(m)m.innerHTML=t?`<span class="${bad?'bad':''}">${esc(t)}</span>`:''}
function paintChatList(){const el=document.getElementById('chatlist');if(!el||!CHAT.open)return;
  const have=new Set(CHAT.msgs.map(m=>m.id)),all=CHAT.msgs.concat(CHAT.pend.filter(m=>!have.has(m.id))).sort((a,b)=>(a.ts||0)-(b.ts||0));
  const sig=all.map(m=>m.id+(CHAT.pend.includes(m)?'p':'')).join(',')+'|'+all.length;if(sig===CHAT.sig&&el.childNodes.length)return;CHAT.sig=sig;
  const near=!el.childNodes.length||el.scrollHeight-el.scrollTop-el.clientHeight<80;
  el.innerHTML=all.length?all.map(m=>`<div class="cm${m.who&&m.who===ME?' me':''}${CHAT.pend.includes(m)?' pend':''}"><span class="cw">${esc(chatName(m.who))}</span><span class="ct">${esc(chatTime(m.ts))}</span><div class="cx">${esc(m.text)}</div></div>`).join(''):'<div class="ce">No messages yet.</div>';
  if(near)el.scrollTop=el.scrollHeight}
function chatPoll(){clearInterval(CHAT.timer);CHAT.timer=null;if(CHAT.open&&!DEMO)CHAT.timer=setInterval(()=>{if(!document.hidden)loadChat().then(()=>{paintChat()})},7000)}
async function sendChat(text){if(window.LVIEW)return;const key=F.Keys(id).chat,msg={id:Math.random().toString(36).slice(2,10),ts:Date.now(),who:ME,text:String(text).slice(0,280)};CHAT.pend.push(msg);paintChat();chatMsg('');
  const fail=t=>{CHAT.pend=CHAT.pend.filter(m=>m.id!==msg.id);CHAT.draft=msg.text;const i=document.getElementById('chatin');if(i)i.value=msg.text;chatMsg(t,1);paintChat()};
  for(let a=0;a<3;a++){let cur;try{cur=F.normChat(F.parseJ(await Store.get(key)))}catch(e){return fail('Message not sent (no connection). Tap Send again.')}
    const ns=F.addMsg(cur,msg);ns.version=(cur.version||0)+1;try{await Store.set(key,ns)}catch(e){return fail('Message not sent (server hiccup). Tap Send again.')}
    await new Promise(r=>setTimeout(r,600));try{const chk=F.normChat(F.parseJ(await Store.get(key)));if(chk.msgs.some(m=>m.id===msg.id)){CHAT.pend=CHAT.pend.filter(m=>m.id!==msg.id);CHAT.msgs=chk.msgs;CHAT.n=chk.msgs.length;CHAT.last=chk.msgs[chk.msgs.length-1]||null;paintChat();return}}catch(e){}}
  fail('Message may not have been delivered (busy server). Tap Send to try again.')}
function paintChat(){const last=document.getElementById('chatlast'),pr=document.getElementById('chatpres'),bd=document.getElementById('chatbadge');if(!last)return;
  if(pr)pr.textContent=PRES.length?'🟢 '+PRES.slice(0,3).join(', ')+(PRES.length>3?' +'+(PRES.length-3):'')+' online':'💬 Chat with the league';
  if(CHAT.last){const w=MG.find(m=>m.mid===CHAT.last.who);last.textContent=(w?A.disp(w.name,isTestL()):'Someone')+': '+CHAT.last.text;last.classList.remove('mut')}
  if(CHAT.open)U.lsSet('lchat.'+id,String(CHAT.n));
  if(bd){const seen=+(U.lsGet('lchat.'+id)||0);const un=Math.max(0,CHAT.n-seen);bd.hidden=!un;bd.textContent=un>9?'9+':String(un)}
  if(CHAT.open){const ci=document.getElementById('chatin');if(ci&&CHAT.draft&&!ci.value)ci.value=CHAT.draft;paintChatList()}}
/* a logo that fails to load becomes the plain initials chip (no inline handler) */
document.addEventListener('error',e=>{const t=e.target;if(!t||t.tagName!=='IMG')return;if(t.isConnected&&t.closest&&t.closest('.chip')){const s=document.createElement('span');s.className='nologo';s.setAttribute('aria-hidden','true');s.textContent=t.getAttribute('data-ini')||'?';t.replaceWith(s);return}
  /* s26c12: js/ui.js (loaded first) may already have swapped a broken logo for an EMPTY .nologo; fill it with the school initials (chip data-ini) */
  document.querySelectorAll('.chip[data-ini] .nologo:empty').forEach(n=>{n.textContent=n.closest('.chip').getAttribute('data-ini')||'?'})},true);
const ACT={trynow:()=>boot(true),
  /* s25 LINKS-HOOK (Draft Room js/links-card.js): commissioner-only "Your links" sheet. The links come only from this device's localStorage; secrets stay after the #. */
  yourlinks:async()=>{if(DEMO||!L||!window.LinksCard||!(await U.isCommish(L.meta)))return;const c=LinksCard.fromDevice(L.meta.id||id,L.meta.name);
    U.openSheet('<h2>Save these links</h2>'+LinksCard.html(c)+'<button class="btn block" data-a="sheetbg">Close</button>');LinksCard.mount(c)},herochange:()=>{const f=document.getElementById('herofile');if(f&&CM)f.click()},heroreset:()=>heroReset(),
  chatopen:()=>{CHAT.open=!CHAT.open;CHAT.sig='';const pn=document.getElementById('chatpanel'),bt=document.getElementById('chatbar');if(pn)pn.hidden=!CHAT.open;if(bt){bt.setAttribute('aria-expanded',String(CHAT.open));const ca=bt.querySelector('.ca');if(ca)ca.textContent=CHAT.open?'▾':'▸'}
    if(CHAT.open){U.lsSet('lchat.'+id,String(CHAT.n));paintChat();syncChat();loadChat().then(()=>{paintChat()});const ci=document.getElementById('chatin');if(ci)setTimeout(()=>ci.focus({preventScroll:true}),30)}else syncChat();chatPoll();paintChat()},
  chatroom:()=>{U.lsSet('x.'+id+'.tab','chat');U.lsSet('lchat.'+id,String(CHAT.n))},
  tab:(el,e)=>{if(e&&(e.defaultPrevented||e.button>0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey))return;if(e)e.preventDefault();tab=el.dataset.v;SUB=null;MISS=null;TOP0=true;hashPut(true);render();window.scrollTo(0,0)},
  shareleague:el=>{const url=shareUrl(SHTAB),done=()=>{if(!el)return;el.textContent='Copied';clearTimeout(el._t);el._t=setTimeout(()=>{el.textContent=canShare()?'Share':'Copy link'},2000)};if(canShare()){navigator.share({title:(L&&L.meta?L.meta.name:'League site'),url}).catch(e=>{if(!(e&&e.name==='AbortError')){copyText(url);done()}})}else{copyText(url);done()}},
  cptext:el=>cpText(el),
  copymgr:el=>{copyText(mgrUrl());if(!el)return;el.textContent='Copied';el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>{el.textContent=CPI;el.classList.remove('on')},2000)},
  cptab:()=>shareLink(tab+(fHash()?'/'+fHash():''),tabTitle()),
  cplink:el=>{const r=readRoute(el.dataset.h||'');if(r)shareLink(r.t+(r.sub?'/'+encodeURIComponent(r.sub):''),tabTitle())},
  owner:(el,e)=>{if(e.target.closest('a.chip,a.tl'))return;goOwner(el.dataset.mid)},
  pickowner:el=>{ownerSel=el.dataset.mid;render()},
  oball:()=>{OBALL=!OBALL;render()},
  atsort:el=>{const k=el.dataset.k;if(ATS.k!==k){ATS.k=k;ATS.d=1}else if(ATS.d>0)ATS.d=-1;else ATS.k=null;render()},
  atown:el=>{ATOWN=el.dataset.mid||'';try{localStorage.setItem('fbn.atown',ATOWN)}catch(e){}render()},
  teamrow:(el,e)=>{if(e.target.closest('a.chip,a.tl'))return;const k=el.dataset.key;openTeam[k]=!openTeam[k];render()},
  gfin:el=>{const id=el.dataset.g||'',o=el.getAttribute('aria-expanded')!=='true';if(o)GEXP.add(id);else GEXP.delete(id);el.setAttribute('aria-expanded',String(o));const c=el.closest('.gm'),x=c&&c.querySelector('.gx');if(x)x.hidden=!o;if(c)c.classList.toggle('open',o);{const ch=el.querySelector('.gch');if(ch)ch.textContent=o?'▾':'▸'}
    const a=el.getAttribute('aria-label')||'';el.setAttribute('aria-label',a.replace(/(Show|Hide) details$/,o?'Hide details':'Show details'))},
  stview:el=>{SVIEW=el.dataset.v==='breakdown'?'breakdown':'league';hashPut(false);try{localStorage.setItem('standingsView',SVIEW)}catch(e){}render()},
  gmode:el=>{gMode=el.dataset.v;gDay='all';if(gMode!=='upcoming')gH2H=false;render()},gh2h:()=>{gH2H=!gH2H;render()},
  fresh:()=>freshToggle(),lvrefresh:()=>lvManual()};
document.addEventListener('change',e=>{const el=e.target;if(el.id==='herofile'){const f=el.files&&el.files[0];el.value='';if(f)heroChange(f);return}
  if(el.id==='s29shSel'){SHTAB=el.value;const i=document.getElementById('s29shUrl');if(i)i.textContent=shareUrl(SHTAB)}else if(el.id==='gOwnerSel'){gOwner=el.value;render()}else if(el.id==='gMonthSel'){if(el.value){gDay=el.value;render()}}else if(el.id==='gDaySel'){gDay=el.value;render()}else if(el.id==='gUnowned'){gAll=el.checked;render()}});
document.addEventListener('submit',e=>{if(e.target&&e.target.id==='chatform'){e.preventDefault();const i=document.getElementById('chatin');const t=i?i.value.trim():'';if(!t||!ME||DEMO)return;i.value='';CHAT.draft='';sendChat(t)}});
document.addEventListener('input',e=>{if(e.target&&e.target.id==='chatin')CHAT.draft=e.target.value});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&CHAT.open&&e.target&&e.target.closest&&e.target.closest('#chat')){ACT.chatopen();const b=document.getElementById('chatbar');if(b)b.focus({preventScroll:true})}});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const el=e.target;if(el&&el.getAttribute&&(el.getAttribute('role')==='button')&&el.dataset&&el.dataset.a&&el.tagName!=='BUTTON'){e.preventDefault();el.click()}});
U.bind(ACT);U.registerSW();
/* the first draft is over when every pick is made (derived from the picks, not from meta.status) or it was ended early; a started redraft (epoch 2+) implies it */
function draftDone(m,st){return st.status==='complete'||m.status==='complete'||!!m.endedEarly||(m.epoch||1)>1||!!(m.redraft&&m.redraft.phase)||!!(st.total&&st.picks&&st.picks.length>=st.total)}
let PH=null;function placeholder(m,st){PH=[m,st];const rc=/^#recap(\/|$)/.test(location.hash)||/^#(power|powerrank|draftrecap|draft-recap)$/.test(location.hash);const ru=!rc&&/^#rules(\/|$)/.test(location.hash);const cur=rc?'recap':ru?'rules':'draft';const base=location.pathname+'?l='+encodeURIComponent(id);const tb=(v,ic,l)=>{const on=v===cur;return `<a class="${on?'on ':''}tb" href="${esc(base+'#'+v)}" data-v="${v}" aria-label="${l}"${on?' aria-current="page"':''}><span class="ni" aria-hidden="true">${ic}</span><span class="nl f">${l}</span><span class="nl s" aria-hidden="true">${l}</span><span class="nl m" aria-hidden="true">${l}</span></a>`};app.innerHTML=`<nav id="ltabs" class="pre" aria-label="League site">${tb('rules','📖','Rules')}${tb('recap','🎓','Recap')}${tb('draft','📝','Draft')}</nav><main><div id="lbody">${ru?preRules(m):rc?`<h2>🎓 Recap</h2><div id="recapgrades"><div class="card" id="prempty"><b>Power rankings appear after the draft is analysed</b><div class="note">The draft recap grade cards (A+ to D) are written from each manager's full roster, once the draft is complete.</div></div></div><h2 class="wkh">📰 Weekly recaps</h2><div class="card" id="weeklyempty"><b>First recap coming after opening week</b></div>${recapRoomLink()}`:`<p class="gdw"><a class="btn endbig" id="godraft" href="${esc(U.roomHref(id))}">Go to draft room</a></p><div class="card" id="lhome"><b style="font-size:19px">League site</b><div class="note" id="avail">Available after the draft.</div><div class="note">${st&&m.status!=='lobby'?`The draft is in progress: ${st.picks.length} of ${st.total} picks made. `:''}Standings, team cards and scores appear here, for every manager, the moment the draft is complete.</div><p><a class="btn" id="back_room" href="${esc(U.roomHref(id))}">Draft room</a> <a class="btn sec" href="index.html">Home</a></p></div>`}</div></main><footer id="foot">${U.buildTag()}</footer>`}
window.addEventListener('hashchange',()=>{if(PH&&!BO.booted)placeholder(PH[0],PH[1])});
/* s26c13: Rules before the draft (#rules, league.html?l=<code>#rules; Draft Room lobby 'League Rules' button). Same vRules() renderer, fed the scoring
   table (FBNScore S.POINTS) instead of a built league, so it needs no rosters or picks; plus the league settings and season dates from the meta. */
function preRules(m){const keep=D;let h='';try{D={meta:{points:Object.assign({win:1},S.POINTS)},upsets:[]};h=vRules()}catch(e){h='<div class="card"><b>📖 League rules</b></div>'}finally{D=keep}
  const st=(m&&m.settings)||{};const at=+st.startAt||0;const nm=A.disp((m&&m.name)||'',A.isTestLeague(m&&m.name));
  const li=[['League',nm],['Managers',st.managers||F.MANAGERS],['Rounds',st.rounds],['Pick clock',st.clockSecs?st.clockSecs+' s':''],['Draft starts',at?new Date(at).toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):''],['Season','2026-27 college basketball season and the NCAA Tournament'],['Redraft',F.REDRAFT.asOfLabel]].filter(x=>x[1]!=null&&x[1]!=='');
  return `<h2>📖 Rules</h2><div class="card" id="presettings"><b>League settings</b><ul class="it">${li.map(x=>`<li><b>${esc(x[0])}:</b> ${esc(String(x[1]))}</li>`).join('')}</ul></div>`+h}
/* s28j item 11: standings place = the reference site exactly (port of /workspace/s29d/stage/score.py 388-393 + index.html:1364 rankTxt, read-only source):
   stable sort by -total (ties keep league config order), rank = i+1 if total != previous total else previous rank (competition 1,1,3); no tiebreak beyond points.
   tied = another row shares the rank -> label 'T-'+rank ('#'+rank on the owner card when not tied). Pure: returns new rows, input untouched. */
function placeRanks(rows,tot){const L=(rows||[]).map((r,i)=>({r,i,t:Number(tot(r))||0}));L.sort((a,b)=>(b.t-a.t)||(a.i-b.i));let last=null;const out=[];
  L.forEach((x,i)=>{const rank=(i>0&&x.t===last)?out[i-1].rank:i+1;last=x.t;out.push(Object.assign({},x.r,{rank,place:rank}))});
  out.forEach(o=>{o.tied=out.filter(y=>y.rank===o.rank).length>1});return out}
const placeLabel=o=>(o.tied?'T-':'')+o.rank;window.LPLACE={placeRanks,placeLabel};
/* s28j item 14: one title constant for every document.title (static manifest / og:title untouched) */
const SITE_T='NCAA Fantasy';const titleFor=n=>(n?n+' · ':'')+SITE_T;
function setTitle(){try{const n=L&&L.meta&&L.meta.name?A.disp(L.meta.name,isTestL()):'';const t=titleFor(n);if(document.title!==t)document.title=t}catch(e){}}
function rebuild(){D=A.build({leagueName:L.meta.name,managers:MG,roster:L.state.roster||L.state.picks,order:L.state.order,teams:T.TEAMS,SC:window.LSCHED?LSCHED.merge(SC):SC,TN,demo:DEMO,genAt:L.meta.endedAt||Math.max(0,...Object.values(L.entries||{}).map(e=>e&&+e.ts||0))||L.meta.startedAt||null,season:'2026-27'});setTitle();{const ci=m=>{const i=MG.findIndex(x=>x.mid===m);return i<0?99:i};const cfg=l=>(l||[]).slice().sort((x,y)=>ci(x.mid)-ci(y.mid));D.owners=placeRanks(cfg(D.owners),o=>o.total);if(Array.isArray(D.tournament))D.tournament=placeRanks(cfg(D.tournament),r=>r.score)}lvReapply()}
/* a failed refresh never blanks the page: the last good scores stay, FAIL.sc/FAIL.tn raise the small "offline" note */
const FAIL={sc:false,tn:false,chat:false};let SCGOOD=false,TNGOOD=false,OFFN=false;
async function loadScores(){await Promise.all([getJ(DATA+'scores.json').then(j=>{const e=S.validateScores(j);if(e)throw new Error(e);if(j.sample&&!DEMO){SC=null}else{SC=j}errS='';SCGOOD=true;FAIL.sc=false}).catch(e=>{if(SCGOOD){FAIL.sc=true}else{errS=e.message||String(e);SC=null}}),getJ(DATA+'tournament.json').then(j=>{const e=S.validateTournament(j);if(e)throw new Error(e);if(j.sample&&!DEMO){TN=null}else{TN=j}errT='';TNGOOD=true;FAIL.tn=false}).catch(e=>{if(TNGOOD){FAIL.tn=true}else{errT=e.message||String(e);TN=null}})])}
const offHtml=()=>OFFN?'<div class="card offnote" id="offnote" role="status">📡 Offline: showing the last saved view. Retrying…</div>':'';
function setOff(){keepPos(setOff0)}   /* s25j: the offline note is inserted at the top of the page, above the reader */
function setOff0(){const on=!!(FAIL.sc||FAIL.tn||FAIL.chat);if(on===OFFN)return;OFFN=on;const e=document.getElementById('offnote');if(on&&!e){const mn=document.getElementById('main');if(mn)mn.insertAdjacentHTML('afterbegin',offHtml())}else if(!on&&e)e.remove()}
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
  CM=!DEMO&&!window.LVIEW&&await U.isCommish(m);ME=await resolveMe();LBETS.init({id,demo:DEMO,owners:()=>D?D.owners:[],me:()=>ME,games:()=>D?D.games:[],rerender:()=>render(),goBets:()=>{tab='bets';SUB=null;MISS=null;hashPut(true);render();window.scrollTo(0,0)},active:()=>tab==='bets'&&!document.hidden,roomHref:()=>U.roomHref(id),onFilter:()=>{SUB=null;MISS=null;hashPut(false)},render:()=>{if(tab!=='bets')return;const b=document.getElementById('lbody');if(b)keepPos(()=>{b.innerHTML=LBETS.view();try{LBETS.after()}catch(_){}})}});if(window.LSCHED&&!DEMO){LSCHED.init({ids:()=>(L.state.roster||L.state.picks||[]).map(p=>p&&p.tid).filter(x=>x!=null),enabled:()=>!DEMO,onUpdate:schedUpdate})}await loadHero(false);await loadScores();rebuild();if(ROUTE0)applyRoute(ROUTE0);normalizeUrl();render();BO.booted=true;LBETS.start();if(window.LSCHED&&!DEMO)LSCHED.start();
  loadChat().then(()=>{paintChat();setOff()});setInterval(()=>{if(!document.hidden)loadChat().then(()=>{paintChat();setOff()})},30000);
  /* scores / tournament refresh every 5 min; after a failed refresh it retries with back-off and keeps the last good data on screen */
  let rf=0;const refresh=async()=>{const a=document.activeElement,t=a&&a.tagName;if(document.hidden||t==='INPUT'||t==='SELECT'){setTimeout(refresh,15000);return}
    await loadScores();rebuild();setOff();if(tab==='standings'||tab==='games'||tab==='rosters'||tab==='teams'||tab==='postseason'||tab==='rules')render();
    if(FAIL.sc||FAIL.tn){rf++;setTimeout(refresh,backoff(rf))}else{rf=0;setTimeout(refresh,5*60*1000)}};
  setTimeout(refresh,5*60*1000);
  window.addEventListener('popstate',onNav);window.addEventListener('hashchange',onNav);if(SUB)deepGo();lvInit();app.setAttribute('data-ready','1')}
let RKL=false;function rankLoad(){if(RKL||!window.LRANK)return;RKL=true;LRANK.load().then(()=>{if(D&&(tab==='standings'||tab==='games'||tab==='rosters'||tab==='teams'||tab==='bets'))lvRerender2()}).catch(()=>{})}
function lvRerender2(){const a=document.activeElement,t=a&&a.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;render()}
async function boot(manual){rankLoad();try{upLoad()}catch(_){}if(BO.busy||BO.stop||BO.booted)return;BO.busy=true;clearTimeout(BO.timer);let ok=true;
  if(document.hidden&&!manual){BO.busy=false;BO.timer=setTimeout(boot,5000);return}
  try{
    const d=await Promise.race([FBNLeague.load(id,{pool:T.POOL}),new Promise((_,rj)=>setTimeout(()=>rj(new Error('timeout')),25000))]);
    if(!d.meta){BO.stop=true;app.innerHTML='<main><div class="card" id="nf"><b>League not found</b><div class="note">Check the link.</div><p><a class="btn" href="index.html">Home</a></p></div></main>';return}
    const st=d.state,m=d.meta;BOOTM=m;
    await urlSignIn(d);   /* s25: a k= / cm= that arrived in the URL (already stripped at the top of league-d.js) is checked once and saved on this device */
    if(m.status==='lobby'||!st||!draftDone(m,st)){BO.n=0;const had=document.getElementById('trouble');if(had)had.remove();if(!document.getElementById('lhome')||had||BO.ph!==(st&&st.picks?st.picks.length:-1)){placeholder(m,m.status==='lobby'?null:st);BO.ph=st&&st.picks?st.picks.length:-1}return}
    await start(d);BO.n=0
  }catch(e){if(!BO.booted){ok=false;BO.n++;noteTrouble()}}
  finally{BO.busy=false;if(!BO.booted&&!BO.stop)BO.timer=setTimeout(boot,ok?15000:backoff(BO.n))}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!BO.booted&&!BO.stop&&!BO.busy)boot(true)});window.addEventListener('online',()=>{if(!BO.booted&&!BO.stop&&!BO.busy)boot(true)});
boot();
})();
