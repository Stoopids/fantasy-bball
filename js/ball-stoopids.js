/* Ball data layer for the STOOPIDS page (league.html is built from STOOPIDS index.html).
   Reads one Ball league (?l=code) from the fbn1- store, Ball scores, and Ball scoring, and hands the page the same D object STOOPIDS uses.
   Bet logs and chat are read through js/ball-bets.js and a chat translation.
   The page's request and bet saves land on Ball keys only (fbn1-<league>-requests and fbn1-<league>-bets-doc, plus an appended settle event on the poster's own log). Nothing here writes a STOOPIDS key or rewrites an existing bet event. */
(function(){'use strict';
const S=window.BALL;if(!S)return;
const q=new URLSearchParams(location.search);
let id=String(q.get(S.leagueParam)||'').trim().replace(/[^A-Za-z0-9]/g,'').slice(0,40);
const B=window.BALL;
B.id=id;B.me=null;B.mid=null;B.cmOk=false;B.cmName=S.commissioner;B.meta=null;B.L=null;B.mids=[];B.keyOf={};B.mOf={};B.D=null;B.dataName='';
B.draftUrl='room.html'+(id?'?l='+encodeURIComponent(id):'');
window.HK=S.deviceRoot+(id?id.toLowerCase()+'.':'');
window.ARCHIVE={seasons:[]};
window.BALL_OWNER_DISP={};window.BALL_OLD_PN={};window.BALL_LEGACY_OWNER={};
window.BALL_DRAFT27={season:'2026-27',slots:[],order:{}};
window.BALL_DRAFT27_RESULTS={contract:'v1',season:'2026-27',league:'',build:'',draft:{type:'snake',rounds:0,managers:0,date:S.draftDate},source:{},order:[],picks:[],grades:{}};
const isLocal=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const base=(()=>{try{const o=isLocal&&localStorage.getItem('fbn.store');if(o)return new URL(o,location.href).href}catch(e){}return S.store})();
const enc=k=>base+encodeURIComponent(k);
B.url=function(k){return enc((window.FBN?FBN.Keys(id).base:S.keyPrefix+id.toLowerCase())+'-'+k)};
const realFetch=window.fetch.bind(window);
function jsonRes(obj,status){return new Response(JSON.stringify(obj),{status:status||200,headers:{'Content-Type':'text/plain'}})}
function textRes(t,status){return new Response(t==null?'':String(t),{status:status||200,headers:{'Content-Type':'text/plain'}})}
const lsJ=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
function nameOf(mid){return B.keyOf[mid]||''}
function chatSafe(id0){const s=String(id0||'').toLowerCase().replace(/[^a-z0-9]/g,'');if(/^[a-z0-9]{6,20}$/.test(s))return s;let h=2166136261;const str=String(id0||'');for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return ('c'+('00000000'+(h>>>0).toString(16)).slice(-8)).slice(0,12)}
async function readKey(key){const r=await realFetch(enc(key),{cache:'no-store'});if(!r.ok)return '';return r.text()}
/* A missing requests document is an empty list. Any other failure must not look like an empty list, or the next full-document save would wipe rows the read never saw. */
async function readReqBody(){const r=await realFetch(enc(reqKey())+'?t='+Date.now(),{cache:'no-store'});if(r.status===404)return {ok:true,text:''};if(!r.ok)return {ok:false,status:r.status};return {ok:true,text:await r.text()}}
/* Historical bets are baked into data.js. The live document is one read; it carries new bets and later status changes. */
async function betsGet(){
  const snap=(typeof window!=='undefined'&&window.BALL_DATA&&window.BALL_DATA.bets_snapshot)||{bets:[],reqs:[]};
  let side='';try{side=await readKey(FBN.Keys(id).base+'-bets-doc')}catch(e){}
  let extra=[];try{let d=JSON.parse(side||'{}');if(typeof d==='string')d=JSON.parse(d);extra=d&&Array.isArray(d.bets)?d.bets:[]}catch(e){extra=[]}
  const by={};(snap.bets||[]).forEach(b=>{if(b&&b.id)by[b.id]=b});
  extra.forEach(b=>{if(b&&b.id)by[b.id]=Object.assign({},by[b.id]||{},b)});
  B._reqs=snap.reqs||[];
  return jsonRes({v:1,bets:Object.keys(by).map(k=>by[k])})}
function parseDoc(raw){try{let d=JSON.parse(raw||'{}');if(typeof d==='string')d=JSON.parse(d);return d&&typeof d==='object'?d:null}catch(e){return null}}
async function readLogs(){const logs={};await Promise.all((B.mids||[]).map(async mid=>{logs[mid]=await readKey(FBN.Keys(id).base+'-bets-'+mid).catch(()=>'')}));return logs}
/* Append one event onto one manager's log. Existing events are copied through unchanged. A log that is not empty JSON is left alone. */
async function appendEvent(mid,ev){
  const key=FBN.Keys(id).base+'-bets-'+mid;
  const raw=await readKey(key).catch(()=>'');
  let evs=[];
  if(String(raw||'').trim()){const d=parseDoc(raw);if(!d||!Array.isArray(d.ev))return false;evs=d.ev.slice()}
  if(evs.some(e=>e&&(e.u===ev.u||(e.k==='s'&&e.id===ev.id))))return true;
  evs.push(ev);
  const w=await realFetch(enc(key),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({v:1,ev:evs})});
  return !!w.ok}
async function betsPost(init){
  let body='';try{body=init&&init.body?String(init.body):''}catch(e){}
  let incoming=[];try{let d=JSON.parse(body||'{}');if(typeof d==='string')d=JSON.parse(d);incoming=d&&Array.isArray(d.bets)?d.bets:[]}catch(e){return textRes('',400)}
  const logs=await readLogs();
  const base=window.BALLBets.view(logs,B.keyOf,'');
  const known=new Set((base.bets||[]).map(b=>b.id));
  const byId={};(base.bets||[]).forEach(b=>{if(b&&b.id)byId[b.id]=b});
  const R={backer:'b',other:'o',push:'p'};
  for(const b of incoming){const old=b&&byId[b.id];if(!old||old.status!=='open')continue;const r=R[b.status];if(!r)continue;
    const mid=B.mOf&&B.mOf[b.backer]&&B.mOf[b.backer].mid;if(!mid)return textRes('',409);
    let u=('s'+String(b.id)).toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,24);if(u.length<6)continue;
    const ok=await appendEvent(mid,{k:'s',u,ts:Date.now(),id:b.id,r,v:25});if(!ok)return textRes('',502)}
  const fresh=incoming.filter(b=>b&&b.id&&!known.has(b.id));
  const overlay=incoming.filter(b=>b&&b.id&&known.has(b.id)&&b.status&&b.status!=='open');
  let prev=[];try{let d=JSON.parse(await readKey(FBN.Keys(id).base+'-bets-doc')||'{}');if(typeof d==='string')d=JSON.parse(d);prev=d&&Array.isArray(d.bets)?d.bets:[]}catch(e){}
  const out={};prev.forEach(b=>{if(b&&b.id)out[b.id]=b});fresh.forEach(b=>{out[b.id]=b});overlay.forEach(b=>{out[b.id]=Object.assign({},out[b.id]||{},b)});
  const w=await realFetch(enc(FBN.Keys(id).base+'-bets-doc'),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({v:1,bets:Object.keys(out).map(k=>out[k])})});
  if(!w.ok)return textRes('',w.status);return textRes('ok')}
function chatDoc(raw){let d={};try{d=JSON.parse(raw||'{}');if(typeof d==='string')d=JSON.parse(d)}catch(e){d={}}if(!d||typeof d!=='object')d={};if(!Array.isArray(d.msgs))d.msgs=[];return d}
async function chatGet(){
  let raw='';try{raw=await readKey(FBN.Keys(id).base+'-chat')}catch(e){}
  const msgs=chatDoc(raw).msgs;
  const m=msgs.filter(x=>x&&x.text).map(x=>({i:chatSafe(x.id),w:nameOf(x.who)||'guest',t:Number(x.ts)||0,x:String(x.text).slice(0,200)})).filter(x=>x.t>0);
  return jsonRes({v:1,m})}
async function chatPost(init){
  if(!B.mid)return textRes('',403);
  let incoming=[];try{let d=JSON.parse(String(init&&init.body||'{}'));if(typeof d==='string')d=JSON.parse(d);incoming=d&&Array.isArray(d.m)?d.m:[]}catch(e){return textRes('',400)}
  const key=FBN.Keys(id).base+'-chat';
  const raw=await readKey(key);
  const doc=chatDoc(raw);
  if(String(raw||'').trim()&&!doc.msgs.length)return textRes('',409);
  const have=new Set(doc.msgs.map(m=>chatSafe(m.id)));
  incoming.forEach(x=>{const i=x&&chatSafe(x.i);if(!i||have.has(i))return;have.add(i);
    doc.msgs.push({id:i,ts:Number(x.t)||Date.now(),who:B.mid,text:String(x.x||'').slice(0,280),r:{}})});
  const w=await realFetch(enc(key),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(doc)});
  return w.ok?textRes('ok'):textRes('',w.status)}
/* Open requests live in Ball's own fbn1-<league>-requests document.
   Agreed bets are a different path: append-only per-manager logs, which js/ball-bets.js reads into All bets.
   This document used to be replaced by whatever list the browser last held. A read that missed the new rows (or only had the log-derived pending rows) then wrote that shorter list back, so Awaiting acceptance flickered. A save now updates the rows it sent and keeps every stored row it did not send. */
function reqKey(){return FBN.Keys(id).base+'-requests'}
function storedReqs(raw){const d=parseDoc(raw);return d&&Array.isArray(d.reqs)?d.reqs.filter(r=>r&&r.id):[]}
function mergeReqs(prev,incoming){const by={};(prev||[]).forEach(r=>{if(r&&r.id)by[r.id]=r});(incoming||[]).forEach(r=>{if(r&&r.id)by[r.id]=Object.assign({},by[r.id]||{},r)});return Object.keys(by).map(k=>by[k])}
async function reqGet(){
  let got;try{got=await readReqBody()}catch(e){return textRes('',503)}
  if(!got.ok)return textRes('',got.status||503);
  const by={};
  (B._reqs||[]).forEach(r=>{if(r&&r.id)by[r.id]=r});
  storedReqs(got.text).forEach(r=>{if(r&&r.id)by[r.id]=r});
  return jsonRes({v:1,reqs:Object.keys(by).map(k=>by[k])})}
async function reqPost(init){
  let body='';try{body=String(init&&init.body||'')}catch(e){}
  let reqs=[];try{let d=JSON.parse(body||'{}');if(typeof d==='string')d=JSON.parse(d);if(!d||!Array.isArray(d.reqs))return textRes('',400);reqs=d.reqs}catch(e){return textRes('',400)}
  let got;try{got=await readReqBody()}catch(e){return textRes('',503)}
  if(!got.ok)return textRes('',got.status||503);
  const prev=storedReqs(got.text);
  if(!reqs.length&&prev.length)return textRes('',409);
  const merged=mergeReqs(prev,reqs);
  const w=await realFetch(enc(reqKey()),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({v:1,reqs:merged})});
  if(!w.ok)return textRes('',w.status);return textRes('ok')}
window.fetch=function(input,init){
  const url=typeof input==='string'?input:(input&&input.url)||'';
  const method=((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
  if(/stoopids-(bets|requests|presence|chat|commish)-/.test(url))return Promise.reject(new Error('Ball does not use STOOPIDS data'));
  if(id&&url.indexOf(encodeURIComponent(FBN.Keys(id).base+'-bets-view'))>=0)return method==='POST'?betsPost(init):betsGet();
  if(id&&url.indexOf(encodeURIComponent(FBN.Keys(id).base+'-page-chat'))>=0)return method==='POST'?chatPost(init):chatGet();
  if(id&&url.indexOf(encodeURIComponent(FBN.Keys(id).base+'-page-requests'))>=0)return method==='GET'||method==='HEAD'?reqGet():reqPost(init);
  return realFetch(input,init)};
const TD=()=>window.TEAMS_DATA||{teams:[],meta:{}};
function teamTable(){const TEAMS={},POOL=[];(TD().teams||[]).forEach(r=>{TEAMS[r[0]]={name:r[1],short:r[2],abbr:r[3],color:r[4],alt:r[5],logo:r[6],logo_dark:r[6],mascot:r[7]||'',espn_id:r[0]};POOL.push(r[0])});return{TEAMS,POOL}}
function uniq(MG){const seen={};return MG.map(m=>{let n=String(m.name||m.team||'Manager').trim().slice(0,24)||'Manager';let k=n,i=2;while(seen[k])k=n+' '+(i++);seen[k]=1;return k})}
const CAT={entry:'ncaa_entry',playin:'playin_win',win:'ncaa_win',upset:'upset',final4:'final4',champ:'champ',missed:'missed_dance',conf_reg:'conf_reg',conf_tourn:'conf_tourn'};
B.landingHtml=function(){const real=S.realLeague;
  return `<div class="card"><h3>${id?'League not found':esc(S.product)}</h3><p class="prof-note">${id?'No league with that code.':'Open your league with its link, or start a draft.'}</p>
   <p style="margin:12px 0 0;line-height:2.4">${real?`<a class="btn" href="league.html?l=${encodeURIComponent(real)}">${esc(S.product)}</a> `:''}<a class="btn sec" href="${esc(S.pages.setup)}">Start a draft</a> <a class="btn sec" href="${esc(S.pages.join)}">Join with a code</a></p></div>`};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
B.setTitle=function(name){const h=document.getElementById('ballLg');if(!h)return;const n=String(name||S.product).trim().toUpperCase().replace(/\s+/g,' ');const i=n.lastIndexOf(' ');
  h.textContent='';if(i>0){h.appendChild(document.createTextNode(n.slice(0,i+1)));const sp=document.createElement('span');sp.textContent=n.slice(i+1);h.appendChild(sp)}else h.textContent=n};
B.attach=async function(D){
  if(!id){B.setTitle(S.product);throw new Error('no league code')}
  if(!D||!D.identity||!D.identity.meta){B.setTitle(S.product);throw new Error('league not found')}
  const L={meta:D.identity.meta,claims:D.identity.claims||{},managers:D.identity.managers||[]};
  B.L=L;B.meta=L.meta;B.D=D;B.setTitle(L.meta.name||S.product);
  const MG=L.managers.filter(m=>m&&m.mid);B.mids=MG.map(m=>m.mid);
  B.keyOf=Object.assign({},D.who||{});B.mOf={};
  MG.forEach(m=>{if(B.keyOf[m.mid])B.mOf[B.keyOf[m.mid]]=m});
  B.mid=null;B.me=null;
  try{const link=window.LURL||{};let mid=link.as||'',k=link.k||'';
    if(!(mid&&k)){const saved=lsJ('fbn.me.'+id);if(saved&&saved.mid&&saved.k){mid=saved.mid;k=saved.k}}
    if(mid&&k){const c=FBN.joinedList(L.meta,L.claims).find(x=>x.mid===mid);if(c&&await FBN.checkMgrSecret(c,k)){B.mid=mid;B.me=B.keyOf[mid]||null;try{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid,k}))}catch(e){}}}}catch(e){}
  try{if(B.me)localStorage.setItem(HK+'who',B.me)}catch(e){}
  try{const cm=localStorage.getItem('fbn.cm.'+id);B.cmOk=!!(cm&&await FBN.checkPass(L.meta,cm))}catch(e){B.cmOk=false}
  const cmM=MG.find(m=>m.mid===L.meta.cm)||MG[0];B.cmName=(cmM&&cmM.name)||S.commissioner;
  B._photos=MG.map(m=>({name:B.keyOf[m.mid],team:(m.team||''),emoji:m.emoji||'',photo:m.photo||''}));
  const D27=window.BALL_DRAFT27;D27.slots.length=0;Object.keys(D27.order).forEach(k=>delete D27.order[k]);
  (D.slots||[]).forEach(s=>{if(s&&s.manager){D27.slots.push([s.manager,s.mid]);D27.order[s.manager]=(D.picks||[]).filter(p=>p.manager===s.manager).map(p=>String(p.teamId))}});
  const R=window.BALL_DRAFT27_RESULTS;R.league=L.meta.name;R.draft_date=L.meta.startedAt?new Date(L.meta.startedAt).toISOString():S.draftDate;R.completed_at=(L.meta.status==='complete'&&L.meta.endedAt)?new Date(L.meta.endedAt).toISOString():null;
  R.draft={type:(L.meta.settings||{}).type||'snake',rounds:(L.meta.settings||{}).rounds||0,managers:MG.length,date:S.draftDate};
  R.order=(D.slots||[]).map(s=>({manager:s.manager,mid:s.mid,slot:s.slot,owner_name:s.manager,team_name:(B.mOf[s.manager]||{}).team||s.manager}));
  R.picks=(D.picks||[]).map(p=>({overall:p.overall,round:p.round,pick:p.pick,manager:p.manager,teamId:String(p.teamId),team:p.team}));
  B.L.state={picks:(D.picks||[]).map(p=>({tid:p.teamId,owner:(MG.find(m=>B.keyOf[m.mid]===p.manager)||{}).mid})),order:MG.map(m=>m.mid)};
  return D};
B.load=function(){return B.attach(window.BALL_DATA)};
B.publish=function(SC){const C=B._ctx;if(!C)return null;SC=SC||C.SC;const L=C.L,MG=C.MG,st=C.st,roster=C.roster,TN=C.TN,TEAMS=C.TEAMS;
  const built=FBNLeagueD.build({leagueName:L.meta.name,managers:MG,roster,order:st.order||L.meta.order,teams:TEAMS,SC,TN,demo:false,season:'2026-27'});
  const nm=mid=>B.keyOf[mid]||'';
  const owners=(built.owners||[]).map(o=>{const key=nm(o.mid);const by={win:0,conf_reg:0,conf_tourn:0,ncaa_entry:0,playin_win:0,ncaa_win:0,upset:0,final4:0,champ:0,missed_dance:0};
    (o.teams||[]).forEach(t=>{(t.events||[]).forEach(e=>{const c=CAT[e.kind];if(c)by[c]=(by[c]||0)+(+e.pts||0)})});
    by.win=(o.by_cat&&o.by_cat.win)||0;
    const teams=(o.teams||[]).map(t=>({tid:String(t.tid),window:{start:null,end:null},status:'active',wins_counted:t.wins||0,by:{win:t.wins||0},total:(t.wins||0)+(t.tpts||0),items:[]}));
    return{name:key,team_name:o.team_name||key,emoji:o.emoji||'🏀',photo:o.photo||'',total:o.total||0,by_cat:by,teams,rank:o.rank,tied:!!o.tied,_mid:o.mid}});
  const OD=window.BALL_OWNER_DISP;Object.keys(OD).forEach(k=>delete OD[k]);
  owners.forEach(o=>{const m=B.mOf[o.name]||{};OD[o.name]={team:m.team||o.team_name||o.name,person:m.name||o.name}});
  const games=(built.games||[]).map(g=>{const side=s=>Object.assign({},s,{pool:!!(s.owners&&s.owners.length)});
    return Object.assign({},g,{home:side(g.home),away:side(g.away),src:'espn'})});
  const meta0=TD().meta||{};const ranks={teams:{},sources:{kenpom:{as_of:''},ap:{},net:{}}};
  Object.keys(TEAMS).forEach(t=>{const m=meta0[t]||{};ranks.teams[t]={ap:null,net:null,kenpom:m.o!=null?+m.o:null,stoopid:m.p!=null?+m.p:null,stoopid_current:m.p!=null?+m.p:null}});
  const P=(window.FBNScore&&FBNScore.POINTS)||{};const now=new Date();
  const checklist={};Object.keys(built.checklist||{}).forEach(t=>{checklist[t]=built.checklist[t]});
  const D={meta:{app:S.product,league:L.meta.name,season:'2026-27',mode:built.meta&&built.meta.mode||'live',today_et:now.toISOString().slice(0,10),generated_at_utc:(SC&&SC.as_of)?SC.as_of+'T12:00:00Z':now.toISOString(),generated_at_wib:'',games_loaded:games.length,final_games:games.filter(g=>g.status==='final').length,
      roster_source:'draft room',sheet_ok:true,sheet_error:null,standings_ok:true,fetch:{},odds:{games_needing_line:0,lines_found:0,missing_line_ids:[]},assets:{missing_color:[],missing_alt_color:[],missing_logo:[]},warnings:[],
      points:{win:(window.FBNScore&&FBNScore.SEASON_WIN)||1,ncaa_entry:P.entry||5,playin_win:P.playin_win||1,ncaa_win:P.win||2,upset:P.upset||4,final4:P.final4||3,champ:P.champ||4,missed_dance:P.missed||-1,conf_reg:P.conf_reg||4,conf_tourn:P.conf_tourn||4},
      rules:{upset_games:['ncaa'],upset_first_four:false,first_four_loser_penalty:false,count_non_d1_wins:true},redraft:null,overrides_active:{},field:{locked:!!(built.meta&&built.meta.locked),teams_seen:built.meta&&built.meta.fieldN||0},games_view:{},ranks_fetch:{at:now.toISOString()}},
    owners,teams:TEAMS,records:built.records||{},team_games:built.team_games||{},checklist,upset_audit:[],conf_audit:[],
    bets:{currency:{},people:[],bets:[],tallies:{},fines:{},coverage:{}},games,cat_labels:{},windows:{},ranks};
  owners.forEach(o=>{D.windows[o.name]=o.teams.map(t=>({tid:t.tid,start:null,end:null,sheet_name:(TEAMS[t.tid]||{}).short||t.tid}))});
  const picks=(st.picks||[]).filter(p=>p&&p.tid!=null);const order=(st.order&&st.order.length?st.order:MG.map(m=>m.mid)).filter(m=>B.keyOf[m]);
  const D27=window.BALL_DRAFT27;D27.slots.length=0;Object.keys(D27.order).forEach(k=>delete D27.order[k]);
  order.forEach(mid=>{D27.slots.push([B.keyOf[mid],mid]);D27.order[B.keyOf[mid]]=picks.filter(p=>p.owner===mid).map(p=>String(p.tid))});
  const R=window.BALL_DRAFT27_RESULTS;R.league=L.meta.name;R.draft_date=L.meta.startedAt?new Date(L.meta.startedAt).toISOString():S.draftDate;R.completed_at=(L.meta.status==='complete'&&L.meta.endedAt)?new Date(L.meta.endedAt).toISOString():null;
  R.draft={type:(L.meta.settings||{}).type||'snake',rounds:(L.meta.settings||{}).rounds||0,managers:MG.length,date:S.draftDate};
  R.order=order.map((mid,i)=>({manager:B.keyOf[mid],mid,slot:i+1,owner_name:B.keyOf[mid],team_name:(B.mOf[B.keyOf[mid]]||{}).team||B.keyOf[mid]}));
  R.picks=picks.map((p,i)=>({overall:i+1,round:p.round||0,pick:p.pick||0,manager:B.keyOf[p.owner],teamId:String(p.tid),team:(TEAMS[p.tid]||{}).short||String(p.tid)}));
  if(B.dataName)window[B.dataName]=D;B.D=D;B._photos=MG.map(m=>({name:B.keyOf[m.mid],team:(m.team||''),emoji:m.emoji||'',photo:m.photo||''}));return D};
B.applySched=function(){return B.D};
B.cmUnlock=async function(pass){if(!B.meta||!pass)return false;const ok=await FBN.checkPass(B.meta,pass);if(ok){try{localStorage.setItem('fbn.cm.'+id,pass)}catch(e){}B.cmOk=true}return ok};
B.cmLock=function(){try{localStorage.removeItem('fbn.cm.'+id)}catch(e){}B.cmOk=false};
B.decorate=function(){
  const main=document.getElementById('main');if(!main||!B.L)return;
  if(location.hash.indexOf('recap')>=0){[...main.querySelectorAll('section.d27')].forEach(el=>{if(/Draft grades/.test(el.innerText)&&/Grades coming soon/.test(el.innerText))el.remove()})}
  if(location.hash.indexOf('recap')>=0&&!main.querySelector('#powerrank')){
    if(!window.FBNPower){if(!B._power){B._power=1;if(!document.getElementById('ballPowerCss')){const l=document.createElement('link');l.id='ballPowerCss';l.rel='stylesheet';l.href='css/power.css';document.head.appendChild(l)}
      const load=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)});
      load('js/power-gen.js').then(()=>load('js/power-render.js')).then(()=>{B._power=0;try{B.decorate()}catch(e){}}).catch(()=>{B._power=0})}return}
    const host=document.createElement('div');host.id='ballPower';main.insertBefore(host,main.firstChild?main.firstChild.nextSibling:null);
    const st=B.L.state||{};FBNPower.mount(host,{id,done:B.L.meta&&B.L.meta.status==='complete',managers:B.L.managers,state:st,teams:(B.D&&B.D.teams)||{}})}
  if(location.hash.indexOf('profile')>=0&&B._photos&&!main.querySelector('#ballPhotos')){
    const box=document.createElement('div');box.className='card';box.id='ballPhotos';
    box.innerHTML='<b>Managers</b><div class="note">Photos and emoji from the draft.</div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">'+B._photos.map(p=>'<div style="width:88px;text-align:center">'+(p.photo?'<img alt="" src="'+esc(p.photo)+'" style="width:64px;height:64px;object-fit:cover;border-radius:50%">':'<div style="font-size:28px">'+(p.emoji||'🏀')+'</div>')+'<div style="font-size:12px;font-weight:700">'+esc(p.team||p.name)+'</div><div class="note">'+esc(p.name)+'</div></div>').join('')+'</div>';
    main.appendChild(box)}};
addEventListener('load',function(){const r0=window.render;if(typeof r0!=='function'||r0._ball)return;const w=function(){const x=r0.apply(this,arguments);try{B.decorate()}catch(e){}return x};w._ball=1;window.render=w});
})();
