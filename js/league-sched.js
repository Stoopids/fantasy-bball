/* League site schedule (s21): fills the Games / Standings / Rosters / Postseason views by itself, with no maintainer step.
   For each school in this league (the 64 picked schools) it GET-fetches the school's ESPN schedule from site.api.espn.com (already in the CSP connect-src; GET only, no key, no images):
     https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/<espn id>/schedule?season=<year>&seasontype=2     (regular season incl. conference tournaments)
     ... and seasontype=3 as well from March on (postseason: only the NCAA tournament games are used, the way tools/refresh_data.py does).
   Each event is turned into the same game object as data/scores.json (id, day, start, status, kind, round, neutral, home/away {id,score,seed,short}), the games of all schools are de-duplicated by ESPN event id,
   and merge(SC) adds them to the scores.json games: when scores.json has the SAME game (same id, or same two teams within 18 h) the FILE wins, ESPN only fills the rest.
   Politeness: per-school cache in localStorage (key fbn.sched.v1.<id>, stamped; TTL 30 min when that school has a live game or a game today, else 6 h); at most 4 requests in flight, started 90 ms apart;
   ONE fetch cycle per page visit (a second visit inside the TTL makes zero requests); 10 s timeout; after errors the next visit waits (2 min x 2^n, up to 30 min) before trying again; HTTP 429 stops the cycle.
   Never blocks rendering: the page draws from scores.json + the cache first and redraws once when the cycle ends.  window.LSCHED = {init,start,merge,games,has,line,state,parse,ttlFor,_cfg}. */
(function(){
'use strict';
const C={base:'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/',conc:4,gapMs:90,timeoutMs:10000,ttlLive:30*60000,ttlIdle:6*3600000,failBase:2*60000,failMax:30*60000,maxErrStop:8,pairMs:18*3600000,pre:'fbn.sched.v1.'};
const ROUNDS=['First Four','1st Round','2nd Round','Sweet 16','Elite 8','Final Four','National Championship'];
const NCAA_ROUND={'First Four':'First Four','First Round':'1st Round','Second Round':'2nd Round','Sweet 16':'Sweet 16','Elite Eight':'Elite 8','Final Four':'Final Four','National Championship':'National Championship'};
const ST={opts:null,busy:false,done:false,err:false,errN:0,fetched:0,requests:0,inflight:0,maxInflight:0,cacheAt:null,okAt:null,cache:{},ids:[],started:false};
const ls=(()=>{try{const k='__t';localStorage.setItem(k,'1');localStorage.removeItem(k);return localStorage}catch(e){return null}})();
const num=v=>(typeof v==='number'&&isFinite(v))?v:null;
const etDay=ms=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms))}catch(e){return new Date(ms).toISOString().slice(0,10)}};
function status(e,c){const n=(((c||{}).status||(e||{}).status||{}).type||{}).name||'';if(n==='STATUS_FINAL')return 'final';if(n==='STATUS_SCHEDULED')return 'scheduled';if(/POSTPONED|CANCELED|CANCELLED|SUSPENDED/.test(n))return null;return n?'live':'scheduled'}
function scoreOf(x){const s=x&&x.score;let v=null;if(s&&typeof s==='object')v=s.value!=null?s.value:s.displayValue;else v=s;if(v==null||v==='')return null;const t=Number(v);return isFinite(t)?Math.round(t):null}
/* one ESPN schedule event -> one scores.json game, or null (preseason, postponed, NIT and other postseason events, malformed) */
function parse(e,wantType){try{if(!e||e.id==null)return null;const c=(e.competitions||[])[0];if(!c)return null;const comps=c.competitors||[];if(comps.length!==2)return null;
  const stype=(e.seasonType&&+e.seasonType.type)||(e.season&&+e.season.type)||wantType||2;if(stype===1)return null;
  const st=status(e,c);if(!st)return null;const note=(((c.notes||[])[0])||{}).headline||'';let kind='reg',round='';
  if(stype===3){if(note.indexOf("NCAA Men's Basketball Championship")!==0)return null;kind='ncaa';const r=note.split(' - ').pop();round=ROUNDS.indexOf(r)>=0?r:(NCAA_ROUND[r]||r)}
  else if(c.conferenceCompetition)kind='conf';
  const side=x=>{const t=x.team||{};const seed=(x.curatedRank||{}).current;return{id:t.id!=null?String(t.id):(x.id!=null?String(x.id):null),score:st==='scheduled'?null:scoreOf(x),seed:(kind==='ncaa'&&typeof seed==='number'&&seed>0&&seed<99)?seed:null,short:String(t.shortDisplayName||t.location||t.displayName||'').slice(0,40)}};
  const home=comps.find(x=>x.homeAway==='home')||comps[0],away=comps.find(x=>x.homeAway==='away')||comps[1];const h=side(home),a=side(away);if(!h.id||!a.id||h.id===a.id)return null;
  const start=e.date||c.date||null;const t=start?Date.parse(start):NaN;if(isNaN(t))return null;
  if(st==='final'&&(h.score==null||a.score==null||h.score===a.score))return null;
  return{id:String(e.id),day:etDay(t),start:start,status:st,kind:kind,round:round,neutral:!!c.neutralSite,home:h,away:a}}catch(x){return null}}
/* cache TTL: short when this school has a live game or a game within a day of now, long otherwise */
function ttlFor(games,now){const hot=(games||[]).some(g=>{if(g.status==='live')return true;const t=Date.parse(g.start);if(isNaN(t))return false;return g.status==='final'?now-t<=8*3600000:Math.abs(t-now)<=24*3600000});return hot?C.ttlLive:C.ttlIdle}
function readCache(id){if(!ls)return null;try{const j=JSON.parse(ls.getItem(C.pre+id)||'null');return j&&Array.isArray(j.g)&&typeof j.t==='number'?j:null}catch(e){return null}}
function writeCache(id,t,g){if(!ls)return;try{ls.setItem(C.pre+id,JSON.stringify({t:t,g:g}))}catch(e){try{ls.removeItem(C.pre+id)}catch(_){}}}
const failState=()=>{if(!ls)return{n:0,t:0};try{return JSON.parse(ls.getItem('fbn.sched.fail')||'{"n":0,"t":0}')}catch(e){return{n:0,t:0}}};
const setFail=o=>{if(ls)try{o.n?ls.setItem('fbn.sched.fail',JSON.stringify(o)):ls.removeItem('fbn.sched.fail')}catch(e){}};
function seasonYear(now){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit'}).formatToParts(new Date(now));const y=+p.find(x=>x.type==='year').value,m=+p.find(x=>x.type==='month').value;return{y:m>=8?y+1:y,m:m}}
function urls(id,now){const s=seasonYear(now);const u=[C.base+encodeURIComponent(id)+'/schedule?season='+s.y+'&seasontype=2'];if(s.m>=3&&s.m<=6)u.push(C.base+encodeURIComponent(id)+'/schedule?season='+s.y+'&seasontype=3');return u}
async function fetchJ(u){const ctl=typeof AbortController!=='undefined'?new AbortController():null,tm=ctl?setTimeout(()=>ctl.abort(),C.timeoutMs):null;
  try{const r=await fetch(u,{credentials:'omit',signal:ctl?ctl.signal:undefined});if(!r.ok){const e=new Error('http '+r.status);e.status=r.status;throw e}const j=await r.json();if(!j||!Array.isArray(j.events))throw new Error('bad payload');return j.events}finally{if(tm)clearTimeout(tm)}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchSchool(id,now){const out=[];const us=urls(id,now);for(let i=0;i<us.length;i++){ST.requests++;ST.inflight++;ST.maxInflight=Math.max(ST.maxInflight,ST.inflight);let ev;try{ev=await fetchJ(us[i])}finally{ST.inflight--}
    const want=us[i].indexOf('seasontype=3')>0?3:2;ev.forEach(e=>{const g=parse(e,want);if(g)out.push(g)})}return out}
/* one cycle: only the schools whose cache is missing or older than its TTL */
async function cycle(){const o=ST.opts,now=Date.now();const ids=ST.ids.slice();const stale=[];let oldest=null;
  ids.forEach(id=>{const c=readCache(id);if(c){ST.cache[id]=c.g;oldest=oldest==null?c.t:Math.min(oldest,c.t)}else oldest=0;if(!c||now-c.t>=ttlFor(c.g,now)||c.t>now+60000)stale.push(id)});
  ST.cacheAt=oldest;if(!stale.length){ST.done=true;ST.okAt=oldest;return}
  const f=failState();if(f.n&&now-f.t<Math.min(C.failMax,C.failBase*Math.pow(2,f.n-1))){ST.err=true;ST.done=true;return}      /* backing off after earlier errors: use what is saved */
  ST.busy=true;let i=0,errs=0,stop=false;const t0=Date.now();
  const worker=async()=>{while(!stop){const k=i++;if(k>=stale.length)return;const id=stale[k];await sleep(C.gapMs*(k%C.conc));
    try{const g=await fetchSchool(id,Date.now());ST.cache[id]=g;writeCache(id,Date.now(),g);ST.fetched++}catch(e){errs++;if(e&&e.status===429)stop=true;if(errs>=C.maxErrStop)stop=true}}};
  await Promise.all(Array.from({length:Math.min(C.conc,stale.length)},worker));
  ST.busy=false;ST.done=true;ST.err=errs>0;if(errs>0)setFail({n:Math.min(8,(f.n||0)+1),t:Date.now()});else setFail({n:0,t:0});
  if(errs<stale.length||!stale.length){const c2=ids.map(id=>readCache(id)).filter(Boolean);ST.okAt=c2.length?Math.min(...c2.map(c=>c.t)):Date.now()}}
function loadAllFromCache(){ST.ids.forEach(id=>{const c=readCache(id);if(c)ST.cache[id]=c.g});const ts=ST.ids.map(id=>readCache(id)).filter(Boolean).map(c=>c.t);ST.cacheAt=ts.length?Math.min(...ts):null;if(ST.okAt==null&&ts.length)ST.okAt=ts.length===ST.ids.length?Math.min(...ts):null}
/* all cached games of this league's schools, de-duplicated by ESPN event id */
function games(){const seen=new Map();ST.ids.forEach(id=>{(ST.cache[id]||[]).forEach(g=>{if(!seen.has(g.id)||(g.status!=='scheduled'&&seen.get(g.id).status==='scheduled'))seen.set(g.id,g)})});return Array.from(seen.values())}
const same=(a,b)=>{if(String(a.id)===String(b.id))return true;const p=g=>[String(g.home.id),String(g.away.id)].sort().join('|');if(p(a)!==p(b))return false;const x=Date.parse(a.start),y=Date.parse(b.start);return !isNaN(x)&&!isNaN(y)?Math.abs(x-y)<=C.pairMs:a.day===b.day}
/* scores.json (SC) + schedule games: the file wins for any game it has, the schedule adds the rest. Returns a scores-shaped object, or SC itself when there is nothing to add. */
function merge(SC){if(!ST.opts||(ST.opts.enabled&&!ST.opts.enabled()))return SC;const es=games();if(!es.length)return SC;const fg=(SC&&SC.games)||[];const byId=new Set(fg.map(g=>String(g.id)));
  const add=es.filter(g=>!byId.has(String(g.id))&&!fg.some(f=>same(f,g)));if(!add.length)return SC;
  return Object.assign({format:1,sample:false,label:'',season:'2026-27',as_of:null},SC||{},{games:fg.concat(add)})}
const has=()=>games().length>0;
function relAgo(ms){const m=Math.floor(Math.max(0,ms)/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.floor(m/60);if(h<24)return h+(h===1?' hour':' hours')+' ago';const d=Math.floor(h/24);return d+(d===1?' day':' days')+' ago'}
/* the quiet status line under the tab row: "Schedule updated N min ago", or the quiet failure text. Empty string = nothing to say. */
function line(){if(!ST.opts||(ST.opts.enabled&&!ST.opts.enabled()))return '';
  if(ST.err&&!has())return 'Schedule temporarily unavailable';if(ST.err)return 'Schedule temporarily unavailable, showing last saved';
  if(ST.okAt)return 'Schedule updated '+relAgo(Date.now()-ST.okAt);return ''}
function init(o){ST.opts=o;ST.ids=Array.from(new Set((o.ids?o.ids():[]).map(String)));loadAllFromCache()}
async function start(){if(ST.started||!ST.opts)return;ST.started=true;if(ST.opts.enabled&&!ST.opts.enabled())return;if(!ST.ids.length)return;
  try{await cycle()}catch(e){ST.err=true;ST.done=true}ST.busy=false;
  try{ST.opts.onUpdate&&ST.opts.onUpdate('done')}catch(e){}}
window.LSCHED={init,start,merge,games,has,line,parse,ttlFor,state:ST,_cfg:C,_urls:urls};
})();
