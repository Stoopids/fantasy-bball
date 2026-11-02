/* s25-full: the browser never restores an old scroll position over a live list */try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}/* the room keeps the view steady itself (keepAnchor), the same on every browser */try{document.documentElement.style.overflowAnchor='none'}catch(e){}
/* Draft room: lobby, live draft, complete. Adapted from the hardened room (per-slot first-pick-wins log, replay, resync on wake,
   queue, auto-pick, shared clock, pause/undo with passcode lock, chat separate from picks, presence, spin wheel, sort & group). */
(function(){
/* ===== s28 undecided product switches (Paul). Flip here; nothing else needs to change. =====
   TEAM_NAME_ON_TOP: true (shipped default, Paul 1 Nov 2026) = board headers, chat, managers lists and the top bar show the TEAM name on top and the real name under it.
                     false = s27 behaviour (real name on top, team under it).
   ALLOW_PHOTO:      true (default) = My settings offers photo + emoji; false = emoji only (saving there drops any old photo).
   Tests only: on localhost a JSON object in localStorage 'fbn.flags' can override these (ignored on any other host). */
const FLAGS0={TEAM_NAME_ON_TOP:true,ALLOW_PHOTO:true};
const FLAGS=(()=>{const f=Object.assign({},FLAGS0);try{if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){const o=JSON.parse(localStorage.getItem('fbn.flags')||'null');if(o&&typeof o==='object')Object.keys(FLAGS0).forEach(k=>{if(typeof o[k]==='boolean')f[k]=o[k]})}}catch(e){}return f})();
const TEAM_NAME_ON_TOP=FLAGS.TEAM_NAME_ON_TOP,ALLOW_PHOTO=FLAGS.ALLOW_PHOTO;
const NT=m=>TEAM_NAME_ON_TOP?(m.team||m.name):m.name,NB=m=>TEAM_NAME_ON_TOP?(m.team?m.name:''):m.team;
const {esc,$,sleep,lsGet,lsSet}=UI;const F=FBN;
const P=UI.qs();const LID=F.parseCode(P.get('l')||'');const WATCH=P.get('watch')==='1';
/* secrets arrive in the URL fragment (#cm=… commissioner, #as=…&k=… manager); read once, then the fragment is removed from the address bar and history */
const FR0=F.consumeUrlSecret(['cm','as','k']);/* s25-full: secrets leave the address bar (hash and query) and history at once; the device key is the only later sign-in */const CMFRAG=F.extractSecret(FR0.cm||'','cm');const ASFRAG=FR0.as||'',KFRAG=FR0.k||'';const FR=new URLSearchParams((location.hash||'').replace(/^#/,''));/* hash left after the secrets are stripped (tab=) */
if(!LID){location.replace('index.html');return}
const K=F.Keys(LID);const T=UI.loadTeams();const {TEAMS,POOL,POOLSET,META}=T;const TZ=UI.tz();
const CFG={stuckHoldMs:15000,pollLobbyMs:4000,pollLiveMs:2500,pollDoneMs:15000,backoffMaxMs:30000,graceMs:1800};
const L=k=>'x.'+LID+'.'+k;
/* s24: a mock (practice league) is never added to "Your leagues"; it goes to the device's last-5 mock list instead */
const isMock=()=>!!(M&&M.mock);let savedOnce=false;/* saved on open and on tab changes only, so a room left open in the background does not keep claiming to be the last place */const saveLast=()=>{if(M&&!notFound)UI.saveLast('room',LID,tab,isMock())};
function remember(role){if(isMock())UI.rememberMock({id:LID,name:M.name,parent:M.parent||'',solo:!!M.solo});else UI.rememberLeague(LID,M.name,role)}
const isBot=mid=>!!(M&&M.mock&&M.over[mid]&&M.over[mid].bot);
/* ===================== state ===================== */
let M=null,Mraw='',notFound=false,CL={},CLraw={},PROF={},PROFraw={},profAt={},MG=[],S=null,C=F.normChat(null),Craw='',pendingChat=[];
window.DR2_meta=()=>M?{name:M.name,mock:!!M.mock,status:M.status,settings:Object.assign({},M.settings)}:null;/* DR2: read-only meta view for js/rules.js (no secrets) */
let ENT={},ENTraw={},PREF={},PREFraw={},SPIN={},SPINraw={},logReady=false,prefsLoaded=false,epochSeen=0,pollNo=0,sweepAt=0,srvOff=0,srvSync=0,srvInfo='device clock';
let badMetaN=0,loaded=false,lastOk=0,failCount=0,polling=false,pendingKick=false,lastSig='',busy=false,resumeErr='';
let me=UI.getMe(LID);
let tSynced=false;const bootAt=Date.now();/* s28 item 3: the clock is not shown until the server-time offset is known (or 2 s passed) */
const WRITER=lsGet('writer')||(function(){const w=F.hexId(6);lsSet('writer',w);return w})();
const nowSrv=()=>Date.now()+srvOff;
const NOCONN="Can't reach the draft server. Check your connection and try again.";
const storeOk=()=>{lastOk=Date.now();failCount=0;renderConn()};  /* any successful store call clears the Offline pill at once and ends the back-off */
const readRaw=url=>Store.get(url).then(r=>{storeOk();return r});const postJ=(url,obj)=>Store.set(url,obj).then(r=>{storeOk();return r});
const mg=mid=>MG.find(m=>m.mid===mid)||{mid,name:M&&M.seatNames&&M.seatNames[mid]?M.seatNames[mid]:M&&M.over&&M.over[mid]&&M.over[mid].ph?'Empty seat':'Former manager',team:'',emoji:'',photo:'',away:false};/* s27b: a placeholder seat whose claim is not read yet (spectator first paint) says 'Empty seat', never 'Former manager' */
let CM_OK=false,CM_KEY='',ME_OK=false,ME_KEY='',authReady=false;
const myMid=()=>me&&ME_OK&&MG.some(m=>m.mid===me.mid&&!m.left)?me.mid:null;
const removed=()=>!!(me&&ME_OK&&MG.some(m=>m.mid===me.mid&&m.left));
const isSpec=()=>WATCH||!myMid();
const commish=()=>CM_OK;
const tn=tid=>(TEAMS[tid]&&(TEAMS[tid].short||TEAMS[tid].name))||tid;
const chip=(tid,o)=>UI.chip(TEAMS,tid,o);
/* school chip inside its ESPN team link (UI.teamLink stops the tap from reaching any row, cell or button handler) */
const lchip=(tid,o)=>UI.teamChip(TEAMS,tid,o);
const joinedMids=()=>MG.map(m=>m.mid);
/* the draft needs exactly F.MANAGERS (8) managers: no shorter start path anywhere */
const missing=()=>Math.max(0,F.MANAGERS-MG.length);const waitTxt=()=>'Waiting for '+missing()+' more manager'+(missing()===1?'':'s');const full8=()=>MG.length===F.MANAGERS;const phTxt=()=>missing()+' empty seat'+(missing()===1?'':'s')+' will be auto-picked';
/* ===================== time sync ===================== */
async function syncTime(){try{const t0=Date.now();const ac=new AbortController();const to=setTimeout(()=>ac.abort(),5000);let h;try{const r=await fetch(location.href.split('#')[0],{method:'HEAD',cache:'no-store',signal:ac.signal});h=r.headers.get('Date')}finally{clearTimeout(to)}
  const t1=Date.now();const off=F.offsetFromDate(h,t0,t1);/* s28c: a slow answer under load gives a poor estimate; once synced, keep the old offset unless the round trip was short */if(off!=null&&F.sane(off)&&!(srvSync&&t1-t0>2500)){srvOff=off;srvSync=Date.now();srvInfo=Math.abs(off)<1500?'in sync with server time':'device clock is '+(off>0?'behind':'ahead')+' by '+Math.round(Math.abs(off)/1000)+'s (corrected)'}}catch(e){}if(!tSynced){tSynced=true;try{renderBanner();tickClock()}catch(e){}}}
/* ===================== derive + paint ===================== */
function signature(){return Mraw+'|'+Object.keys(CLraw).map(k=>k+CLraw[k]).join(',')+'|'+Object.keys(PROFraw).map(k=>k+PROFraw[k].length+PROFraw[k].slice(-12)).join(',')+'|'+Object.keys(ENTraw).map(k=>k+':'+ENTraw[k]).join(',')+'|'+JSON.stringify(PREF)+'|'+Object.keys(SPINraw).map(k=>k+':'+SPINraw[k]).join(',')+'|'+logReady}
function rebuild(force){const sig=signature();if(!force&&sig===lastSig)return;lastSig=sig;
  if(!Mraw||notFound){S=null;renderAll();return}
  M=F.normalizeMeta(F.parseJ(Mraw));MG=F.managersView(M,CL,PROF);const prev=S;S=F.deriveState(M,ENT,PREF,POOLSET);if(!savedOnce){savedOnce=true;saveLast()}S.logReady=logReady;onOrderChange();onState(prev,S);onSpinState();renderAll();saveLogCache()}
/* s26mo3: other managers see 'Draft order updated' when the commissioner moves or randomizes the lobby order (not on first load, not after a wheel spin, not on the commissioner's own device); rapid drags give one toast */
const ORDW={o:null,sp:null,t:0,last:0};function onOrderChange(){if(!M)return;const o=JSON.stringify(M.order||[]),sp=M.respins.length+'|'+resId();
  if(ORDW.o!=null&&o!==ORDW.o&&sp===ORDW.sp&&M.status==='lobby'&&!commish()){clearTimeout(ORDW.t);ORDW.t=setTimeout(()=>{if(Date.now()-ORDW.last<10000)return;ORDW.last=Date.now();toast('Draft order updated')},2500)}ORDW.o=o;ORDW.sp=sp}
function saveLogCache(){if(!logReady||!M)return;try{lsSet(L('logc'),JSON.stringify({e:M.epoch,raw:ENTraw}))}catch(e){}}
function loadLogCache(){try{const c=JSON.parse(lsGet(L('logc'))||'null');if(c&&c.e&&c.raw){epochSeen=c.e;Object.keys(c.raw).forEach(k=>{ENTraw[k]=c.raw[k];ENT[k]=F.parseEntry(c.raw[k])})}}catch(e){}}
/* ===================== polling ===================== */
async function fetchSlot(n){const raw=await readRaw(K.pick(M.epoch,n));if(ENTraw[n]===raw)return false;ENTraw[n]=raw;ENT[n]=F.parseEntry(raw);return true}
async function syncLog(){const tot=S?S.total:0;if(!tot)return false;let ch=false;const k=F.replay(M,ENT,POOLSET).picks.length;const want=[];
  if(k>=1&&(pollNo%4===0||!logReady))want.push(k);if(k>=2&&pollNo%6===0)want.push(k-1);if(pollNo%14===0&&k>2){sweepAt=(sweepAt%(k-2))+1;want.push(sweepAt)}
  const batch=logReady?1:6;let from=k+1;let gap=false;
  for(let g=0;g<30&&from<=tot;g++){const ns=[];for(let i=0;i<batch&&from+i<=tot;i++)ns.push(from+i);if(g===0)want.forEach(n=>{if(ns.indexOf(n)<0)ns.push(n)});
    const rs=await Promise.all(ns.map(n=>fetchSlot(n).catch(e=>e&&e.stuck?false:null)));   /* a slot the server cannot read (e.stuck, Pick stuck banner) counts as not changed / not filled, so the board still loads and the on-the-clock manager can pick via the backup spot */
    if(rs.some(r=>r===true))ch=true;if(rs.some(r=>r===null))return ch;
    const nk=F.replay(M,ENT,POOLSET).picks.length;if(nk>=from+batch-1&&nk>=from){from=nk+1;if(ch)rebuild()}else{gap=true;break}}
  if(from>tot)gap=true;if(gap&&!logReady){logReady=true;ch=true}return ch}
async function syncClaims(){if(!M)return false;const N=M.settings.managers;let ch=false;
  /* an empty seat is checked every time; a filled seat only every 8th poll (a removal changes the seat generation in meta, which forces a re-read) */
  const rs=await Promise.all(Array.from({length:N},(_,k)=>k+1).filter(i=>!CL[i]||!CLraw[i]||pollNo%8===0).map(async i=>{const key=K.slot(i,M.slotGen[i]||0);const raw=await readRaw(key).catch(()=>null);if(raw==null)return false;
    if(CLraw[i]===key+'|'+raw)return false;CLraw[i]=key+'|'+raw;CL[i]=F.parseClaim(raw);return true}));rs.forEach(r=>{if(r)ch=true});return ch}
async function syncProfiles(){if(!M)return false;const joined=F.joinedList(M,CL);const age=M.status==='lobby'?30000:90000;const now=Date.now();let ch=false;
  const due=joined.filter(c=>!profAt[c.mid]||now-profAt[c.mid]>age).sort((a,b)=>(profAt[a.mid]||0)-(profAt[b.mid]||0)).slice(0,5);
  await Promise.all(due.map(async c=>{try{const raw=await readRaw(K.mgr(c.mid));profAt[c.mid]=Date.now();if(PROFraw[c.mid]===raw)return;PROFraw[c.mid]=raw;const p=F.parseProfile(raw);if(p&&p.mid===c.mid)PROF[c.mid]=p;ch=true}catch(e){}}));return ch}
async function readPref(mid){const raw=await readRaw(K.pref(mid));if(PREFraw[mid]===raw&&PREF[mid]&&!prefBusy(mid))return false;const d=F.parseJ(raw);const doc=parsePrefDoc(d);if(prefBusy(mid)&&PREFV[mid]&&doc.v<PREFV[mid].v)return false;/* s28: a read that left before our own write landed is older than what we wrote: ignore it */PREFraw[mid]=raw;PREFV[mid]=doc;PREF[mid]=prefBusy(mid)?applyPending(mid,doc):doc;return true}
function parsePrefDoc(d){return (d&&typeof d==='object')?{queue:Array.isArray(d.queue)?d.queue.map(String).filter(t=>F.safeId(t)&&POOLSET.has(t)).slice(0,200):[],auto:!!d.auto,v:+d.v||0}:{queue:[],auto:false,v:0}}
let prefClockN=-1,prefNow=false;
async function syncPrefs(){const want=new Set();const mm=myMid();if(mm&&!WATCH)want.add(mm);const cl=S&&S.status==='live'?F.onClock(S):null;if(cl)want.add(cl.owner);if(pollNo%8===1||joinedMids().some(o=>!PREF[o]))joinedMids().forEach(o=>want.add(o))/* s26c8b: everyone's Auto-draft switch for the AUTO badge */;
  const rs=await Promise.all(Array.from(want).map(o=>readPref(o).catch(()=>false)));return rs.some(Boolean)}
async function syncSpin(){if(!M||!M.spin||M.spin.done||M.status!=='lobby')return false;let ch=false;const tot=M.spin.players.length;const have=F.spinReplay(M,SPIN).winners.length;const ns=[];/* first look at a spin (nothing loaded yet): read every slot at once, so a reopened page knows at once that all results are saved; afterwards one new slot per poll */const ahead=Object.keys(SPIN).length===0?tot:1;for(let k=have+1;k<=tot&&k<=have+ahead;k++)ns.push(k);if(have>=1&&pollNo%4===0)ns.push(have);
  const rs=await Promise.all(ns.map(async n=>{const raw=await readRaw(K.spin(M.epoch,M.spin.gen,n)).catch(()=>null);if(raw==null||SPINraw[n]===raw)return false;SPINraw[n]=raw;SPIN[n]=F.parseSpin(raw);return true}));return rs.some(Boolean)}
const normChatRaw=txt=>F.normChat(F.parseJ(txt));
async function pollOnce(){if(polling){pendingKick=true;return}polling=true;
  try{pollNo++;
    const pMeta=readRaw(K.meta).then(a=>{lastOk=Date.now();failCount=0;
      if(a!==Mraw||!loaded){const good=F.exists(F.parseJ(a));
        /* s23 (BUG-5): a read that succeeds but is not a league (e.g. a transient empty 200 from the store) never replaces a league we already have; only after ~20 such reads in a row is it shown as not found */
        if(!good&&M&&F.exists(F.parseJ(Mraw))&&++badMetaN<20){}else{if(good)badMetaN=0;Mraw=a;notFound=!good}}else badMetaN=0
      if(!loaded)loaded=true;
      if(!notFound){const mm=F.normalizeMeta(F.parseJ(Mraw));if(epochSeen!==mm.epoch){ENT={};ENTraw={};SPIN={};SPINraw={};logReady=false;epochSeen=mm.epoch}
        if(JSON.stringify(mm.slotGen)!==JSON.stringify((M||{}).slotGen||{}))CLraw={}}
      rebuild(true);return true});
    const doChat=(pollNo%3===1||tab==='chat'||!loaded);
    const pChat=doChat?readRaw(K.chat).then(b=>{if(b!==Craw||pendingChat.length){Craw=b;const pc=C;C=F.mergeChat(normChatRaw(b),pendingChat);onChat(pc,C)}chatHeal(normChatRaw(b))}).catch(()=>{}):Promise.resolve();
    const metaOk=await pMeta.catch(e=>{failCount++;return false});
    if(metaOk&&!notFound&&M){const paint=r=>{if(r)rebuild(true);return r};const rest=[];
      if(M.status==='lobby'||pollNo%6===0||!Object.keys(CLraw).length)rest.push(syncClaims().catch(()=>false).then(paint));
      rest.push(syncProfiles().catch(()=>false).then(paint));
      if(M.status!=='lobby')rest.push(syncLog().catch(()=>false).then(paint));
      rest.push(syncSpin().catch(()=>false).then(paint));
      {const oc=S&&S.status==='live'?F.onClock(S):null;const ocn=oc?oc.n:0;if(ocn!==prefClockN){prefClockN=ocn;prefNow=true}}/* s25-full: a new turn reads the on-clock manager's Auto-pick switch at once (instant auto-pick) */
      if(prefNow||pollNo%4===1||!prefsLoaded||joinedMids().some(o=>!PREF[o])/* s26c8b */){prefNow=false;rest.push(syncPrefs().then(r=>{prefsLoaded=true;return r}).catch(()=>false).then(paint))}
      await Promise.all(rest);await refreshAuth();await resumeCheck()}
    await pChat;
  }catch(e){failCount++}finally{polling=false;renderConn();if(pendingKick){pendingKick=false;pollOnce()}}}
const kick=()=>pollOnce();
/* polling: only while this tab is visible; slower in the lobby, quicker while a draft is live, exponential backoff with jitter after errors */
let loopT=0;
function pollDelay(){const j=0.85+Math.random()*0.3;
  if(failCount>0)return Math.round(Math.min(CFG.backoffMaxMs,CFG.pollLobbyMs*Math.pow(2,Math.min(failCount,6)))*j);
  if(S&&S.status==='complete'&&logReady)return Math.round(CFG.pollDoneMs*j);
  if(S&&S.status==='live'&&M&&!M.paused)return Math.round(CFG.pollLiveMs*j);
  return Math.round(CFG.pollLobbyMs*j)}
function armLoop(){clearTimeout(loopT);loopT=0;if(document.hidden)return;loopT=setTimeout(loop,pollDelay())}
async function loop(){clearTimeout(loopT);loopT=0;if(document.hidden)return;await pollOnce();armLoop()}
function connState(){const age=Date.now()-lastOk;if(lastOk>0&&age<20000)return'live';return lastOk>0?'offline':'connecting'}
function renderConn(){const c=$('conn');if(!c)return;const st=connState();c.className='pill '+(st==='live'?'live':'bad');c.innerHTML=st==='live'?'<i></i>Live':st==='offline'?'<i></i>Offline, retrying…':'<i></i>Connecting…'}
/* ---- who is allowed to act: the commissioner secret must match the salted hash in meta; a manager's secret must match the hash in their claim ---- */
async function refreshAuth(){let ch=false;
  if(M){const tok=lsGet('cm.'+LID)||'';const key=(M.pass?M.pass.hash:'')+'|'+tok;if(key!==CM_KEY){CM_KEY=key;const ok=!!(tok&&await F.checkPass(M,tok));if(ok!==CM_OK){CM_OK=ok;ch=true}}}
  if(M&&me){const c=F.joinedList(M,CL).find(c=>c.mid===me.mid);const key=me.mid+'|'+(c?c.sh:'-')+'|'+(me.k||'');if(key!==ME_KEY){ME_KEY=key;const ok=!!(c&&await F.checkMgrSecret(c,me.k));if(ok!==ME_OK){ME_OK=ok;ch=true}}}
  else if(ME_OK){ME_OK=false;ch=true}
  if(M&&(!me||Object.keys(CLraw).length))authReady=true;setTimeout(maybeReveal,0);
  if(ch)rebuild(true)}
/* private manager link: #as=<mid>&k=<secret>  (older links used ?as=&k=; both are read once and then removed from the address bar) */
let resumeDone=false,cmDone=false;
async function adoptManager(as,k){const c=F.joinedList(M,CL).find(c=>c.mid===as);
  if(!c){if(Object.keys(CLraw).length>=M.settings.managers)return'That manager link does not match anyone in this league (they may have been removed).';return null}
  if(!(await F.checkMgrSecret(c,k)))return'That manager link is not valid for '+c.name+'.';
  me={mid:as,k};UI.setMe(LID,me);remember('manager');ME_KEY='';await refreshAuth();rebuild(true);UI.toast('Welcome back, '+c.name);return'';}
async function resumeCheck(){if(!M)return;
  if(!cmDone&&CMFRAG){cmDone=true;if(await F.checkPass(M,CMFRAG)){lsSet('cm.'+LID,CMFRAG);CM_KEY='';await refreshAuth();remember('commissioner');UI.toast('Commissioner tools unlocked on this phone')}else resumeErr='That commissioner link is not valid for this league.'}
  if(resumeDone||!ASFRAG||!KFRAG)return;const r=await adoptManager(ASFRAG,KFRAG);if(r===null)return;resumeDone=true;if(r)resumeErr=r}
/* ---- meta writes (commissioner actions): re-read -> apply to the fresh copy -> POST -> verify -> retry ---- */
async function mutateMeta(fn,verify){
  for(let attempt=0;attempt<3;attempt++){let raw;try{raw=await readRaw(K.meta)}catch(e){return{ok:false,msg:NOCONN}}
    const cur=F.normalizeMeta(F.parseJ(raw));const r=fn(cur,F.deriveState(cur,ENT,PREF,POOLSET));if(r.error)return{ok:false,invalid:true,msg:r.error};if(r.noop)return{ok:true,noop:true};
    const ns=r.state;ns.version=(cur.version||0)+1;ns.updated=new Date().toISOString();
    try{await postJ(K.meta,ns)}catch(e){return{ok:false,msg:'Save failed (server hiccup). Nothing was changed — try again.'}}
    Mraw=JSON.stringify(ns);rebuild();await sleep(650);
    try{const chk=F.normalizeMeta(F.parseJ(await readRaw(K.meta)));if(verify(chk,ns)){Mraw=JSON.stringify(chk);rebuild();return{ok:true,state:ns,undone:r.undone,freed:r.freed}}}catch(e){return{ok:true,state:ns,unverified:true}}}
  return{ok:false,lost:true,msg:'Someone else saved at the same moment and your change did not stick. Look at the screen and try again.'}}
/* s25-full: pref writes for one manager run one at a time, so two quick Q+ taps can't read the same old queue and drop one */
/* s28 item 6: queue/auto taps are coalesced: each tap applies at once on this screen (optimistic), and after ~300 ms of quiet all pending ops for that manager go out in ONE read-merge-write
   (re-read the server doc, apply the pending ops on top in tap order, write). The tap resolves after the write; a background read-back checks every op and re-applies the ones a simultaneous
   write from another device dropped (ops are idempotent: add / remove / move / set auto), up to 4 rounds. Flushes for one manager never overlap. */
const PREFQ={},PENDQ={},PREFT={},PREFFIRST={},PREFV={};const PREF_DEBOUNCE=300,PREF_MAXWAIT=1200;
const blankPref=()=>({queue:[],auto:false,v:0});
function applyPending(mid,base){let cur=F.clone(base||blankPref());(PENDQ[mid]||[]).forEach(op=>{if(op.written)return;try{cur=op.fn(cur)||cur}catch(e){}});return cur}
function mutatePref(mid,fn,verify,tag){return new Promise(res=>{const op={fn,verify,res,tries:0,tag:tag||null};(PENDQ[mid]=PENDQ[mid]||[]).push(op);
  try{PREF[mid]=applyPending(mid,PREFV[mid]||(PENDQ[mid].length===1&&PREF[mid]?F.clone(PREF[mid]):blankPref()));rebuild(true)}catch(e){}
  schedPref(mid)})}
function schedPref(mid){const now=Date.now();if(!PREFFIRST[mid])PREFFIRST[mid]=now;clearTimeout(PREFT[mid]);const wait=Math.max(0,Math.min(PREF_DEBOUNCE,PREFFIRST[mid]+PREF_MAXWAIT-now));
  PREFT[mid]=setTimeout(()=>{PREFFIRST[mid]=0;const p=(PREFQ[mid]||Promise.resolve()).then(()=>flushPref(mid));PREFQ[mid]=p.catch(()=>{})},wait)}
async function flushPref(mid){const batch=(PENDQ[mid]||[]).filter(o=>!o.sent);if(!batch.length)return;batch.forEach(o=>o.sent=true);const url=K.pref(mid);
  const fail=msg=>{batch.forEach(o=>{o.res({ok:false,msg});const q=PENDQ[mid]||[];const k=q.indexOf(o);if(k>=0)q.splice(k,1)});PREF[mid]=applyPending(mid,PREFV[mid]||blankPref());rebuild(true)};
  let srv;try{const raw=await readRaw(url);srv=parsePrefDoc(F.parseJ(raw))}catch(e){return fail(NOCONN)}
  let ns=F.clone(srv);batch.forEach(o=>{try{ns=o.fn(ns)||ns}catch(e){}});ns.v=(srv.v||0)+1;
  try{await postJ(url,ns)}catch(e){return fail('Save failed — try again.')}
  batch.forEach(o=>o.written=true);PREFV[mid]=F.clone(ns);PREFraw[mid]=JSON.stringify(ns);PREF[mid]=applyPending(mid,ns);rebuild(true);batch.forEach(o=>o.res({ok:true}));
  setTimeout(()=>verifyPref(mid,batch),500)}
async function verifyPref(mid,batch){let d=null;try{d=F.parseJ(await readRaw(K.pref(mid)))}catch(e){}
  const q=PENDQ[mid]||[];const drop=o=>{const k=q.indexOf(o);if(k>=0)q.splice(k,1)};
  if(!d||typeof d!=='object'){batch.forEach(drop);return}const doc=parsePrefDoc(d);
  let redo=false;const later=o=>{if(!o.tag)return false;const all=q;const i=all.indexOf(o);return all.slice(i+1).some(x=>x.tag&&x.tag.t===o.tag.t)};/* an add followed by a remove of the same team (or the reverse) only checks the latest */batch.forEach(o=>{let good=true;try{good=later(o)||!o.verify||!!o.verify(doc)}catch(e){}if(good||o.tries>=4)drop(o);else{o.tries++;o.sent=false;o.written=false;redo=true}});
  PREFV[mid]=doc;PREFraw[mid]=JSON.stringify(d);PREF[mid]=applyPending(mid,doc);rebuild(true);
  if(redo){clearTimeout(PREFT[mid]);PREFT[mid]=setTimeout(()=>{const p=(PREFQ[mid]||Promise.resolve()).then(()=>flushPref(mid));PREFQ[mid]=p.catch(()=>{})},150+Math.random()*400)}}
const prefBusy=mid=>!!(PENDQ[mid]&&PENDQ[mid].length);
/* is tid in mid's queue as this device last decided it (latest pending add/remove wins, else the shown queue) */
function inQueueNow(mid,t){const q=PENDQ[mid]||[];for(let i=q.length-1;i>=0;i--){const g=q[i].tag;if(g&&g.t===t)return g.want}return ((PREF[mid]&&PREF[mid].queue)||[]).includes(t)}
async function submitPick(n,owner,tid,by,o){o=o||{};if(by==='auto'&&(preStart()||startGate()||HL.stalled()||(F.autoReason(S,nowSrv(),0)==='expired'&&localEarly())))return{ok:false,msg:'held'};/* s28c: last guard for every auto-pick write */const prevId=n>1&&S.picks.length===n-1?S.picks[n-2].id:(n>1?null:'');const entry=F.makeEntry(n,owner,tid,{by,now:stampNow(),writer:WRITER,epoch:M.epoch,prev:prevId,voided:M.voided});
  const io={read:u=>Store.get(u,undefined,{write:1}).then(r=>{storeOk();return r}),write:postJ,sleep,adopt:(k,e)=>{ENT[k]=e||null;ENTraw[k]=e?JSON.stringify(e):'';rebuild()},later:fn=>{fn()},alert:k=>toast('Pick #'+k+' was replaced by a simultaneous write — check the board.',6000)};
  return F.submitSlot(io,{meta:M,url:K.pick(M.epoch,n),n,entry,taken:F.takenMap({picks:S.picks.filter(p=>p.n<n),kept:S.kept}),pool:POOLSET,prevId:prevId==null?undefined:prevId,fast:o.fast})}
/* s23 (BUG-2): the chat is one key (read-modify-write), so two people sending at the same moment can overwrite each other. Every message this device sent is remembered for 3 minutes; if a later read of the chat does not have it, it is shown again at once and written back (merged), until it sticks. */
let SENTCHAT=[],chatHealing=false;
function chatHeal(srv){const now=Date.now();SENTCHAT=SENTCHAT.filter(x=>now-x.at<180000);if(chatHealing||!srv)return;const miss=SENTCHAT.filter(x=>now-x.at>2500&&!srv.msgs.some(m=>m.id===x.m.id)).map(x=>x.m);if(!miss.length)return;
  miss.forEach(m=>{if(!pendingChat.some(p=>p.id===m.id))pendingChat.push(m)});const pc=C;C=F.mergeChat(srv,pendingChat);onChat(pc,C);chatHealing=true;
  chatWrite(cur=>{let st=cur;miss.forEach(m=>{if(!st.msgs.some(x=>x.id===m.id))st=F.addMsg(st,m)});return{state:st}},chk=>miss.every(m=>chk.msgs.some(x=>x.id===m.id))).catch(()=>{}).finally(()=>{chatHealing=false})}
async function chatWrite(fn,verify){for(let attempt=0;attempt<4;attempt++){let raw;try{raw=await readRaw(K.chat)}catch(e){return{ok:false,msg:NOCONN}}
    const cur=normChatRaw(raw);const r=fn(cur);if(r.error)return{ok:false,msg:r.error};const ns=r.state;ns.version=(cur.version||0)+1;
    try{await postJ(K.chat,ns)}catch(e){return{ok:false,msg:'Message not sent (server hiccup).'}}
    Craw=JSON.stringify(ns);const pc=C;C=F.mergeChat(ns,pendingChat);onChat(pc,C);await sleep(600);
    try{const chk=normChatRaw(await readRaw(K.chat));if(verify(chk,ns)){pendingChat=pendingChat.filter(m=>!chk.msgs.some(x=>x.id===m.id));Craw=JSON.stringify(chk);const p2=C;C=F.mergeChat(chk,pendingChat);onChat(p2,C);return{ok:true}}}catch(e){return{ok:true}}}
  return{ok:false,msg:'Message may not have been delivered (busy server). It will retry on the next refresh.'}}
/* ===================== actions ===================== */
const toast=UI.toast;
function needUnlock(){if(commish())return true;toast('Commissioner tools are locked. Open your commissioner link, or paste it under More → Unlock.',4500);return false}
const forWho=o=>o===myMid()?'you':mg(o).name;
async function doPick(tid,forOwner,opt){opt=opt||{};const cs0=S&&F.onClock(S);const slot0=cs0?cs0.n:-1;if(busy&&busy===slot0){if(!opt.auto)toast('Still saving your pick, one moment…',2500);return}const mySlot=slot0;busy=slot0;
  try{await pollOnce();if(preStart()||startGate()){toast('The draft starts in '+UI.fmtClock(+M.startedAt-nowSrv())+'. Picks open at 0:00.',4000);return false}const v=F.validatePick(S,forOwner,String(tid),{pool:POOLSET});
    if(v.error){const tk=F.takenMap(S)[String(tid)];if(tk&&tk.owner===forOwner)toast('Already picked for '+forWho(forOwner)+': '+tn(tid)+' (pick #'+tk.n+'). Nothing more to do.',6000);
      else if(tk)toast('Someone beat you to it: '+tn(tid)+' was just taken by '+mg(tk.owner).name+' (pick #'+tk.n+'). Pick another.',6000);
      else if(v.turn){const s=F.onClock(S);toast("It's "+(s?mg(s.owner).name:'someone else')+"'s turn now (pick #"+(s?s.n:'?')+'). The board moved while you were choosing.',6000)}else toast(v.error,5000);return false}
    if(forOwner!==myMid()&&!opt.auto&&!needUnlock())return false;
    const by=opt.auto?'auto':(forOwner!==myMid()?'commish':'owner');const res=await submitPick(v.slot.n,forOwner,tid,by);
    if(res.ok){toast(mg(forOwner).name+' drafted '+tn(tid)+' (#'+res.pick.n+')');markDone(res.pick.n);return true}
    if(res.beaten){const w=res.by||{};toast(w.owner===forOwner?'Pick #'+v.slot.n+' was already made for '+forWho(forOwner)+': '+tn(w.tid)+'. Check the board.':'Someone beat you to it: pick #'+v.slot.n+' was just made ('+tn(w.tid)+' by '+mg(w.owner).name+'). Check the board.',6500);showConflict(v.slot.n,tid,w,forOwner);return false}
    toast(res.msg,5000);return false}finally{if(busy===mySlot)busy=false}}
/* Commissioner: force the best available pick for the manager on the clock (same save path as every pick, so it uses the backup spot when the main one is stuck). Asks for the commissioner passcode like other host actions. */
async function actForce(){if(!commish()||!S||S.status!=='live')return;await pollOnce();const s=F.onClock(S);if(!s)return;if(!needUnlock())return;if(S.paused){toast('The draft is paused. Resume it first (More tab, Draft controls), then tap Force.',6000);return}
  const ch=F.autoChoice(S,s.owner,POOL,F.mulberry(s.n*7919),autoRankOf);if(!ch){toast('No team is available to pick.',4000);return}
  const ok=await doPick(ch.tid,s.owner,{});if(!ok)toast('Still could not save pick #'+s.n+'. Nothing was changed. Wait a minute and tap Force again.',6000)}
let conflictMsg='';
function showConflict(n,tid,w,forOwner){conflictMsg=w.owner===forOwner?'<b>Already picked for '+esc(forWho(forOwner))+'.</b> Pick #'+n+' was already made — <b>'+esc(tn(w.tid))+'</b>. Your pick of '+esc(tn(tid))+' was <b>not</b> saved.':'<b>Someone beat you to it.</b> Pick #'+n+' was already made — <b>'+esc(tn(w.tid))+'</b> by '+esc(mg(w.owner).name)+'. Your pick of '+esc(tn(tid))+' was <b>not</b> saved.';renderBanner();setTimeout(()=>{conflictMsg='';renderBanner()},12000)}
/* s26c16c: the final pick marks the meta complete (status + endedAt), like End draft but endedEarly stays false */
function markDone(n){if(!S||!(S.total>0)||n<S.total)return;simple(m=>m.status!=='live'||m.endedAt?{noop:true}:{state:Object.assign(F.clone(m),{status:'complete',endedEarly:false,endedAt:nowSrv(),paused:false,pausedLeft:null})},null,chk=>chk.status==='complete').catch(()=>{})}
async function simple(fn,okMsg,verify){const res=await mutateMeta(fn,verify);if(!res.ok&&!res.noop)toast(res.msg,5000);else if(okMsg)toast(okMsg);return res}
const seedOf=m=>m.id+':'+(m.settings.startAt||0);
async function actStart(auto){if(!auto&&!needUnlock())return;await pollOnce();
  /* s23 (BUG-4): every wheel result is saved but the order was not applied yet (e.g. the wheel was hidden during "saving…"): apply the wheel order first, never start with a different order */
  if(M&&M.status==='lobby'&&M.spin&&!F.spinCompleted(M)&&spinInfo().done){if(!await applySpin()){if(!auto)toast('Could not save the wheel order. Tap Start again.',5000);return}await pollOnce();if(!F.spinCompleted(M))return}
  /* s26c16: fewer than 8 joined: each empty row of the lobby order gets a placeholder seat first (first write wins per seat, like joining), then the start puts each one in its row */
  if(M&&M.status==='lobby'&&!full8()){if(!MG.length)return;if(!await fillPlaceholders()){if(!auto)toast('Could not set up the empty seats. Tap Start again.',5000);return}await pollOnce();rebuild(true);if(!full8()){if(!auto)toast('Could not set up the empty seats. Tap Start again.',5000);return}}
  const phm=phMap();const hasPh=Object.keys(phm).length>0;
  /* s28 item 4: a commissioner's Start (real league, not the scheduled auto-start, not a mock) is a 60 s 'Draft starts in' countdown: the meta stores the start instant (startedAt = resumeAt = now+60 s, startCd = 60000), so pick #1's clock starts from it on every device, reloads included; no picks before it */
  const cd=!auto&&!isMock();
  return simple(m=>{const r=F.mStart(m,joinedMids(),nowSrv(),seedOf(m),POOL.length,Object.assign(hasPh?{autoSpin:!!auto,phMap:phm}:{autoSpin:!!auto},isMock()?{}:{fixed:true}));if(cd&&r.state){const t=r.state.startedAt+START_CD_MS;r.state.startedAt=t;r.state.resumeAt=t;r.state.startCd=START_CD_MS}return r},auto?null:(cd?'Draft starts in 1 minute':'The draft is LIVE!'),chk=>chk.status==='live')}
const START_CD_MS=60000;
/* s28c (bug B): nothing auto-picks or expires before the server start instant (meta startedAt / resumeAt, server time), whatever the local timer or a stale on-screen state says */
const startGate=()=>!!(M&&M.status==='live'&&!M.paused&&nowSrv()<Math.max(+M.startedAt||0,+M.resumeAt||0)&&!startedLocal()&&!(S&&S.picks&&S.picks.some(p=>!p.skip&&(+p.ts||0)>=(+M.startedAt||0))));
/* s28d: the start gate holds the clock DISPLAY only while the stored start instant is still ahead by this device's own clock too; with no start time, or once it has passed locally, the display counts down (a stale/failed/huge server offset can no longer freeze it at full time). Auto-pick and its save keep using startGate() (server time). */
const startSt=()=>M?Math.max(+M.startedAt||0,+M.resumeAt||0):0;const dispHold=()=>{const st=startSt();return st>0&&Date.now()<st&&startGate()};const dispNow=()=>{const st=startSt();const n=nowSrv();return st>0&&n<st&&Date.now()>=st?Date.now():n};
const preStart=()=>!!(M&&M.status==='live'&&M.startCd&&nowSrv()<(+M.startedAt||0)&&!startedLocal()&&!(S&&S.picks&&S.picks.length));
async function actStartNow(){if(!needUnlock())return;const r=await simple(m=>{const now=nowSrv();if(m.status!=='live'||!m.startCd||!(+m.startedAt>now))return{noop:true};const n=F.clone(m);n.startedAt=now;n.resumeAt=now;return{state:n}},'The draft is LIVE!',chk=>!(+chk.startedAt>nowSrv()+1000));preWas=null;rebuild(true);return r}
let preWas=null;
/* s26c16: placeholder seats (NOT bots): the same seat-claim mechanism as a mock's fillBots (js/mock.js); claim w:'ph:<empty row id>', the secret thrown away */
function phMap(){const o={};if(!M)return o;F.joinedList(M,CL).forEach(c=>{const w=String(c.w||'');if(w.indexOf('ph:')===0&&!(M.over[c.mid]&&M.over[c.mid].bot)&&!o[w.slice(3)])o[w.slice(3)]=c.mid});return o}
async function fillPlaceholders(){try{const N=M.settings.managers;const claims={};
  await Promise.all(Array.from({length:N},(_,k)=>k+1).map(async i=>{claims[i]=F.parseClaim(await readRaw(K.slot(i,M.slotGen[i]||0)).catch(()=>''))}));
  const real=F.joinedList(M,claims).filter(c=>String(c.w||'').indexOf('ph:')!==0).map(c=>c.mid);const lo=F.lobbyOrder(M,real);
  const have={};F.joinedList(M,claims).forEach(c=>{const w=String(c.w||'');if(w.indexOf('ph:')===0)have[w.slice(3)]=1});
  const empties=lo.filter(x=>F.isEmptyId(x)&&!have[x]);const free=F.freeSlots(M,claims);const io={read:k=>Store.get(k),write:(k,v)=>Store.set(k,v),sleep:UI.sleep};
  for(let q=0;q<empties.length&&q<free.length;q++){const eid=empties[q],i=free[q];const gen=M.slotGen[i]||0;const mid=F.hexId(12);const name=F.placeholderName(M,eid,lo.indexOf(eid)+1);const sh=await F.mgrHash(mid,F.newSecret());
    const claim=F.makeClaim({mid,i,gen,name,team:name,sh,w:'ph:'+eid});
    const r=await F.claimKey(io,{url:K.slot(i,gen),mine:claim,parse:F.parseClaim,same:(a,c)=>a.mid===c.mid,held:a=>a.i===i&&a.gen===gen,wait:400});
    if(r.ok)await Store.set(K.mgr(mid),F.makeProfile({mid,name,team:name,pv:0}));else if(!r.taken)return false}
  return true}catch(e){return false}}
const actPause=p=>{if(p&&preStart()){toast('The draft has not started yet. Tap Start now, or wait for the countdown.',5000);return}return needUnlock()&&simple((m,st)=>F.mPause(m,st,p,nowSrv()),p?'Paused':'Resumed',chk=>chk.paused===p)};
const actUndo=async exp=>{if(!needUnlock())return;await pollOnce();return simple((m,st)=>F.mUndo(m,st,exp||null,nowSrv()),'Last pick undone',(chk,ns)=>chk.voided.length>=ns.voided.length)};
const actClock=s=>needUnlock()&&simple(m=>F.mClock(m,s,nowSrv()),s?'Pick clock: '+s+'s':'Pick clock off',(chk,ns)=>chk.settings.clockSecs===ns.settings.clockSecs);
const actFlags=f=>needUnlock()&&simple(m=>F.mFlags(m,f),null,(chk,ns)=>chk.settings.warn15===ns.settings.warn15&&chk.settings.autoPick===ns.settings.autoPick&&chk.notes===ns.notes);
const actOrderMove=(mid,d)=>needUnlock()&&simple(m=>F.mMove(m,joinedMids(),mid,d),null,(chk,ns)=>JSON.stringify(chk.order)===JSON.stringify(ns.order));
const actOrderSet=o=>needUnlock()&&simple(m=>F.mSetOrder(m,joinedMids(),o),null,(chk,ns)=>JSON.stringify(chk.order)===JSON.stringify(ns.order));
const actRandomize=()=>needUnlock()&&simple(m=>F.mRandomize(m,joinedMids(),()=>F.randInt(1e6)/1e6),'Order randomized',(chk,ns)=>JSON.stringify(chk.order)===JSON.stringify(ns.order));
const actAway=(mid,on)=>needUnlock()&&simple(m=>F.mAway(m,mid,on),on?mg(mid).name+' is marked away — auto-pick covers them':mg(mid).name+' is back',chk=>!!(chk.over[mid]&&chk.over[mid].away)===on);
const actRename=(mid,patch)=>needUnlock()&&simple(m=>F.mRename(m,mid,Object.assign({ts:Math.round(nowSrv())},patch),MG.filter(x=>x.mid!==mid).map(x=>x.name)),'Saved',()=>true);
const actRemove=mid=>{if(!needUnlock())return;const slotI=(MG.find(x=>x.mid===mid)||{}).i;return simple(m=>F.mRemove(m,mid,slotI),M.status==='lobby'?mg(mid).name+' was removed':mg(mid).name+' left — auto-pick covers the rest',()=>true)};
const actEnd=()=>needUnlock()&&simple(m=>F.mEnd(m,nowSrv()),'Draft ended',chk=>chk.status==='complete');
const actReset=()=>needUnlock()&&simple(m=>F.mReset(m),'Draft reset to the lobby',chk=>chk.epoch>0&&chk.status==='lobby');
const actQueue=(mid,tid)=>{const t=String(tid);const want=!inQueueNow(mid,t);/* s28: the tap means add or remove as seen on screen (idempotent, so a re-apply after a lost write is safe) */return mutatePref(mid,cur=>{const q0=(cur.queue||[]).map(String);if(want===q0.includes(t))return cur;cur.queue=want?q0.concat([t]):q0.filter(x=>x!==t);return cur},d=>Array.isArray(d.queue)&&d.queue.includes(String(tid))===want,{t,want}).then(r=>{if(!r.ok)toast(r.msg)})};
const actQMove=(mid,tid,d)=>mutatePref(mid,cur=>{const q=cur.queue,i=q.indexOf(String(tid)),j=i+d;if(i>=0&&j>=0&&j<q.length)[q[i],q[j]]=[q[j],q[i]];return cur},()=>true).then(r=>{if(!r.ok)toast(r.msg)});
const actAuto=(mid,on)=>!F.canSetAuto(myMid(),commish(),mid)?(toast('You can only change your own Auto-draft.',4000),Promise.resolve()):mutatePref(mid,cur=>{cur.auto=!!on;return cur},d=>!!d.auto===!!on).then(r=>{if(!r.ok)toast(r.msg);else toast(mid!==myMid()?(mg(mid).name+': Auto-draft '+(on?'ON':'off')):on?'Auto-draft ON for you':'Auto-draft off')});
let pinTries=0,pinLock=0;
async function actUnlock(pass){if(Date.now()<pinLock)return{ok:false,msg:'Too many wrong tries. Wait '+Math.ceil((pinLock-Date.now())/1000)+'s.'};
  const sec=F.extractSecret(pass,'cm');if(sec&&await F.checkPass(M,sec)){pinTries=0;lsSet('cm.'+LID,sec);CM_KEY='';await refreshAuth();return{ok:true}}
  pinTries++;if(pinTries>=5){pinLock=Date.now()+30000;pinTries=0;return{ok:false,msg:'That is not the commissioner secret. Locked for 30 seconds.'}}return{ok:false,msg:'That is not the commissioner secret. Paste the whole commissioner link, or its 32-character code ('+(5-pinTries)+' tries left).'}}
const prankOf=t=>(META[t]||{}).p||0;/* s26c14 (Paul: 'Use Kenpom for AUTODRAFT'): auto-pick ranks by KenPom (meta.o, lower is better); teams without o go last, p only as their tie-break. prankOf (p) stays for notes/grades/display */const autoRankOf=t=>{const m=META[t]||{};return m.o>0?+m.o:m.p>0?100000+(+m.p):0};
let autoPlan={n:0,at:0},autoBusy=false;
/* s28 R1: store health of THIS page. Every request (Store.fetchT) is timed. Stalled when: a request has been in flight > 8 s; the last 2 finished requests each took > 8 s or failed; 3+ failures in 20 s; or (visible and online) no successful request for 12 s; or the device is offline.
   Healthy again only after 20 s with 4+ successes and p90 < 2.5 s (enter fast, leave slow). Test hook (localhost only): localStorage fbn.healthOff=1 turns the guard off. */
const HL=(function(){const ev=[],fly=new Map();let seq=0,lastOk=Date.now(),stallOn=false,stallSince=0,quietFrom=0,recUntil=0;const REC_MS=5000;
  const off=()=>{try{return /^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&localStorage.getItem('fbn.healthOff')==='1'}catch(e){return false}};
  try{const f0=Store.fetchT;Store.fetchT=function(url,opt,ms){const id=++seq,t=Date.now();fly.set(id,t);const done=ok=>{fly.delete(id);const now=Date.now();ev.push({ok,ms:now-t,at:now});if(ok)lastOk=now;while(ev.length&&now-ev[0].at>60000)ev.shift()};
    return f0.call(this,url,opt,ms).then(r=>{done(true);return r},e=>{done(false);throw e})}}catch(e){}
  function bad(now){if(typeof navigator!=='undefined'&&navigator.onLine===false)return true;for(const t of fly.values())if(now-t>8000)return true;
    const fin=ev.slice(-2);if(fin.length===2&&fin.every(e=>!e.ok||e.ms>8000))return true;if(ev.filter(e=>!e.ok&&now-e.at<20000).length>=3)return true;
    if(!document.hidden&&now-lastOk>12000)return true;return false}
  function healthy(now){const w=ev.filter(e=>e.at>=quietFrom);if(now-quietFrom<20000||w.length<4||w.some(e=>!e.ok))return false;const ms=w.map(e=>e.ms).sort((a,b)=>a-b);return ms[Math.floor(ms.length*.9)]<2500}
  function stalled(){if(off())return false;const now=Date.now();if(bad(now)){if(!stallOn){stallOn=true;stallSince=now}quietFrom=now;return true}if(stallOn){if(healthy(now)){stallOn=false;recUntil=now+REC_MS}else return true}return now<recUntil}
  /* s28c (bug A): the stall state is evaluated on its own 500 ms timer, not only from autoTick (which returns early while busy / auto-pick in flight / log not ready), so a page can never miss a stall and then treat the recovery as healthy at once */
  try{setInterval(()=>{try{if(typeof S!=='undefined'&&S&&S.status==='live'&&!S.paused)stalled()}catch(e){}},500)}catch(e){}/* only while a draft is running (the lobby polls slowly) */
  return{stalled,seen:()=>{lastOk=Math.max(lastOk,Date.now()-4000)},info:()=>{try{if(S&&S.status==='live')stalled()}catch(e){}return{stalled:stallOn,recovering:Date.now()<recUntil,since:stallSince,inflight:fly.size,recent:ev.slice(-5)}}}})();
window.FBN_health=()=>HL.info();
try{document.addEventListener('visibilitychange',()=>{if(!document.hidden)HL.seen()})}catch(e){}
function autoTick(){if(!S||!loaded||autoBusy||busy||!S.logReady)return;if(preStart()||startGate()){autoPlan={n:0,at:0};return}
  /* s28 R1 (reliability plan 2b): this page never auto-picks while its own store requests are stalling (slow / failing / no answer); it is a local freeze, no write needed */
  if(HL.stalled()){autoPlan={n:0,at:0};return}
  /* s28 R2: a stuck on-clock slot is never auto-picked because the clock ran out (the 15 s go-ahead is gone for 'expired'); away / auto-draft / placeholder seats keep the 15 s hold, then go through the backup spot. A stuck slot that is not on the clock holds auto-pick as before. */
  {const stk=Store.stuck();if(stk.length){const cs=F.onClock(S);const sk=cs&&stk.find(x=>x.n===cs.n);if(!sk)return;const rs=autoR(CFG.graceMs);if(!rs||rs==='expired')return;if(Date.now()-(sk.since||Date.now())<CFG.stuckHoldMs)return}}   /* s23: a stuck slot gets a short hold (manager / commissioner first), then auto-pick goes ahead through the backup spot; never for a stuck slot that is not the one on the clock */
  const s=F.onClock(S);if(!s){autoPlan={n:0,at:0};return}
  const reason=autoR(CFG.graceMs);if(!reason){autoPlan={n:0,at:0};return}
  /* s23: right after an Undo the slot is the manager's again: an away / auto-pick-on manager is not re-picked for at once (only when the pick clock runs out) */
  /* s26c8a: autoReason reports 'auto'/'away' before 'expired', so check the clock here too (else the hold never ends: 0:00 AUTO-PICKING forever); bots are not held */
  {const ue=ENT[s.n];if(!S.clockSecs&&!isBot(s.owner)&&F.undoHoldUntil(M,ue,false)){autoPlan={n:0,at:0};return}/* s28 item 5: No clock + commissioner Undo of this slot: auto-pick stays frozen for it until someone picks by hand */const ran=S.autoPick&&S.clockSecs&&S.deadline&&nowSrv()>S.deadline+CFG.graceMs;if(reason!=='expired'&&!ran&&nowSrv()<F.undoHoldUntil(M,ue,isBot(s.owner))){autoPlan={n:0,at:0};return}}/* s26c8b: the hold ends 10 s after the Undo (countdown on the On the clock card) */
  /* s25-full (Paul via NCAA): an auto-pick-on or away manager is picked for at once when the turn starts (delay 0); bots keep 1-2 s; a run-out clock is 0 as before */
  if(autoPlan.n!==s.n){autoPlan={n:s.n,at:Date.now()+(reason!=='expired'&&!isBot(s.owner)?Math.max(0,F.autoBase(M,S.picks)+F.AUTO.delayMs-nowSrv()):F.autoDelayMs(reason,isBot(s.owner)))}/* s26c8b: auto/away go 2 s after the turn began (last pick / start / resume), not after this phone noticed it */}if(Date.now()<autoPlan.at)return;
  autoBusy=true;autoPlan.at=Date.now()+5000;const n=s.n;
  (async()=>{{const s1=F.onClock(S);const rp=s1&&s1.n===n&&!isBot(s1.owner)?readPref(s1.owner).catch(()=>false):null;await pollOnce();if(rp){await rp;rebuild()}}/* s26c8b: fresh switch, so OFF cancels a pending fast pick on every phone */const s2=F.onClock(S);if(!s2||s2.n!==n||!autoR(CFG.graceMs-200))return;/* s28c: the store may have stalled or the start countdown may still run (server start time) while we waited for the poll */if(HL.stalled()||startGate())return;
    const ch=F.autoChoice(S,s2.owner,POOL,F.mulberry(n*7919),autoRankOf);if(!ch)return;const r=await submitPick(n,s2.owner,ch.tid,'auto');if(r&&r.ok){toast('Auto-pick: '+tn(ch.tid)+' for '+mg(s2.owner).name);markDone(n)}})().finally(()=>{autoBusy=false;setTimeout(autoTick,50)/* s25-full: the next auto-pick-on turn goes at once */})}
let startTried=0;
function autoStartTick(){/* s24: a solo mock (you + 7 bots) starts at once on the creator's page */if(M&&!busy&&M.status==='lobby'&&M.mock&&M.solo&&commish()&&full8()&&Date.now()>=startTried){startTried=Date.now()+4000;actStart(true);return}
  if(!M||busy||M.status!=='lobby'||M.settings.startMode!=='auto'||M.settings.startAt==null)return;if(nowSrv()<M.settings.startAt+500)return;if(!MG.length)return;/* s26c16: starts with fewer than 8; empty rows become placeholder seats */if(Date.now()<startTried)return;
  /* s23 (item 12): a wheel spin that is running right now is left to finish first (it is stale after 60 s, then the auto-spin takes over) */
  if(M.spin&&!F.spinCompleted(M)&&!spinInfo().done&&spinState()==='fresh')return;
  startTried=Date.now()+4000+Math.random()*2500;actStart(true)}
async function sendMsg(text){text=(text||'').trim().slice(0,280);const mm=myMid();if(!text||!mm||WATCH)return;const id=Math.random().toString(36).slice(2,10);const msg={id,ts:nowSrv(),who:mm,text};SENTCHAT.push({m:msg,at:Date.now()});pendingChat.push(msg);
  const pc=C;C=F.mergeChat(C,pendingChat);onChat(pc,C);const r=await chatWrite(cur=>({state:F.addMsg(cur,msg)}),chk=>chk.msgs.some(m=>m.id===id));if(!r.ok)toast(r.msg)}
async function react(id,emoji){const mm=myMid();if(!mm||WATCH){toast('Only managers can react.');return}
  const r=await chatWrite(cur=>F.toggleReact(cur,id,emoji,mm),(chk,ns)=>{const a=((ns.msgs.find(m=>m.id===id)||{}).r||{})[emoji]||[];const b=((chk.msgs.find(m=>m.id===id)||{}).r||{})[emoji]||[];return a.includes(mm)===b.includes(mm)});if(!r.ok)toast(r.msg)}
/* ===================== draft-order wheel ===================== */
const WH={open:false,playing:false,queue:[],shown:null,gen:0,resp:null,all:false,cur:null,busy:false,reduced:(function(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}})()};
const wlabel=mid=>mg(mid).name;
/* viewers can hide the wheel with a tap at any time; the commissioner only once the order is set (a tap must not end a spin) */
const wheelTapClose=()=>!!M&&(!commish()||(M.spin&&M.spin.done&&!WH.playing));
const seenKey=()=>'fbn.spinseen.'+LID;const seenId=()=>{try{return localStorage.getItem(seenKey())||''}catch(e){return''}};const setSeen=id=>{try{localStorage.setItem(seenKey(),id)}catch(e){}};
function spinInfo(){return M&&M.spin&&!M.spin.done?F.spinReplay(M,SPIN):{winners:[],recs:[],done:false,total:0}}
/* s23 (item 6): everyone sees the spin. A manager who opens the room while a spin is running sees the wheel with the results so far; one who opens it after the order was set sees the result once. */
const resKey=()=>'fbn.spinres.'+LID;const resId=()=>M&&M.spin?String(M.spin.sid||M.spin.gen||'')+'-'+(M.spin.ts||''):'';
function setResSeen(){try{localStorage.setItem(resKey(),resId())}catch(e){}}
function lateSpinView(){if(!M||M.status!=='lobby'||commish()||WATCH||!(me||KFRAG)||!M.spin)return;let seen='';try{seen=localStorage.getItem(resKey())||''}catch(e){}
  if(F.spinCompleted(M)){if(seen!==resId()){WH.open=true;setResSeen()}return}
  const st=F.spinStatus(M,SPIN,nowSrv());if(st.state!=='stale')WH.open=true}
function onSpinState(){if(!M)return;const gen=M.spin&&!M.spin.done?M.spin.gen:0;
  if(WH.resp==null){WH.resp=M.respins.length;lateSpinView()}else if(M.respins.length>WH.resp){WH.resp=M.respins.length;toast((M.respins[M.respins.length-1]||{}).auto?'The wheel spun by itself at the start time and set the draft order.':'The commissioner set the draft order with the wheel.',5000);setResSeen();if(M.status==='lobby'&&!commish()&&!WH.open)WH.open=true}
  if(gen!==WH.gen){WH.gen=gen;SPIN={};SPINraw={};if(WH.shown!=null){WH.shown=0;WH.queue=[]}}
  const sp=spinInfo();if(WH.shown==null){WH.shown=sp.winners.length;return}
  if(!WH.loadTs)WH.loadTs=nowSrv();
  sp.recs.forEach(r=>{if(r.n>WH.shown&&!WH.queue.some(q=>q.n===r.n)&&!(WH.cur&&WH.cur.rec.n===r.n)){if(!F.spinShouldPlay(r,{seenId:seenId(),loadTs:WH.loadTs,now:nowSrv(),playing:WH.playing,shown:WH.shown})){WH.shown=r.n;setSeen(r.id)}else{WH.queue.push(r);if(!WH.open&&M.spin&&!M.spin.done)WH.open=true}}});
  renderWheel();pumpWheel()}
function wheelSVG(players,rot){const n=players.length,seg=360/n,R=140,Cc=150;const pal=['#ffd23f','#4ade80','#60a5fa','#f472b6','#fb923c','#a78bfa','#2dd4bf','#f87171'];let w='';
  if(n===1){w=`<circle cx="${Cc}" cy="${Cc}" r="${R}" fill="${pal[0]}"/><text x="${Cc}" y="${Cc+6}" text-anchor="middle" font-size="16" font-weight="900" fill="#111">${esc(wlabel(players[0]))}</text>`}
  else players.forEach((p,i)=>{const a0=(i*seg-90)*Math.PI/180,a1=((i+1)*seg-90)*Math.PI/180;const x0=Cc+R*Math.cos(a0),y0=Cc+R*Math.sin(a0),x1=Cc+R*Math.cos(a1),y1=Cc+R*Math.sin(a1);
    w+=`<path d="M${Cc} ${Cc}L${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 ${seg>180?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z" fill="${pal[i%pal.length]}" stroke="#10131a" stroke-width="2"/>`;
    const mid=(i+.5)*seg;const nm=wlabel(p);const s=nm.length>11?nm.slice(0,10)+'…':nm;w+=`<g transform="rotate(${mid-90} ${Cc} ${Cc})"><text x="${Cc+46}" y="${Cc+4}" font-size="${n>6?12:14}" font-weight="900" fill="#111">${esc(s)}</text></g>`});
  return `<svg viewBox="0 0 300 300" role="img" aria-label="Draft order wheel"><g id="wg" style="transform-box:view-box;transform-origin:150px 150px;transform:rotate(${rot||0}deg)">${w}</g><circle cx="150" cy="150" r="16" fill="#10131a" stroke="#ffd23f" stroke-width="3"/></svg>`}
function slotsHTML(winners,total,nextN){let h='';for(let i=1;i<=total;i++){const w=winners[i-1];h+=`<div class="wslot${w?'':(i===nextN?' next':' empty')}"><b>${i}</b><span>${w?esc(wlabel(w)):(i===nextN?'next spin…':'—')}</span></div>`}return h}
function wheelNote(cm){const p=WH.phase=wheelPhase();if(p==='stuck')return cm?'The order has not been saved yet.':'The order is not saved yet. The commissioner needs to finish it.';return 'Order complete — saving…'}
function closeWheelEl(el){UI.dialogOut(el);el.remove()}
function renderWheel(){let el=document.getElementById('wheelov');if(WH.open&&M&&M.status!=='lobby'&&!WH.playing)WH.open=false;if(!WH.open){if(el)closeWheelEl(el);return}
  const sp=spinInfo();const cm=commish();if(!el){el=document.createElement('div');el.id='wheelov';el.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('button,a,input,select'))return;if(wheelTapClose()){clearTimeout(WH.autoT);WH.autoT=0;WH.open=false;WH.all=false;renderWheel()}});
    /* Escape only hides the overlay: it never stops or cancels a spin (WH.all and the saved results stay as they are) */
    el._esc=()=>{clearTimeout(WH.autoT);WH.autoT=0;WH.open=false;renderWheel()};document.body.appendChild(el);UI.dialogIn(el,'Draft order spin')}
  if(WH.playing&&el.querySelector('#wg')){const ws=el.querySelector('#wslots');if(ws)ws.innerHTML=slotsHTML(sp.winners.slice(0,WH.shown),sp.total||MG.length,WH.shown+1);return}
  const shown=sp.winners.slice(0,WH.shown||0);const players=M.spin&&!M.spin.done?F.remainingPlayers(M.spin.players,shown):joinedMids();const total=sp.total||MG.length;
  if(M.spin&&M.spin.done&&!WH.playing){el.innerHTML=`<div class="wbox"><h2>Order set</h2>${orderListHTML(false)}<div class="small mut" style="margin-top:6px">Tap anywhere to close. This closes by itself.</div><div class="row" style="margin-top:10px"><button class="btn pri grow" data-a="wclose" id="wclose">Close</button></div></div>`;if(!WH.autoT)WH.autoT=setTimeout(()=>{WH.autoT=0;if(!WH.playing){WH.open=false;WH.all=false;renderWheel()}},WH.reduced?3000:F.SPIN.autoCloseMs);return}
  el.innerHTML=`<div class="wbox"><h2>Spin for draft order</h2><div class="small mut">Each spin picks one manager for the next draft slot; they leave the wheel. The result is decided once on the commissioner’s phone and shown the same way on every phone.</div>
   <div class="wheelwrap"><div class="wptr"></div>${players.length?wheelSVG(players,0):'<div class="card mut" style="text-align:center">All slots filled</div>'}</div>
   <div class="wwin" id="wwin" aria-live="polite">${shown.length===total&&total?wheelNote(cm):(shown.length?'Last: '+esc(wlabel(shown[shown.length-1]))+' → pick #'+shown.length:'')}</div>
   <div class="wslots" id="wslots">${slotsHTML(shown,total,shown.length+1)}</div>
   <div class="row" id="wbtns">${cm&&shown.length===total&&total&&WH.phase&&!WH.finishing?'<button class="btn pri grow" data-a="spinfinish" id="spinfinish2">Finish setting the order</button>':''}${cm&&shown.length<total?(WH.all?'<button class="btn bad grow" data-a="spinstop">Stop after this spin</button>':(spinState()==='stale'?'<button class="btn pri grow" data-a="respin" id="respin">Spin again (last spin didn’t finish)</button>':'<button class="btn pri grow" data-a="spinnext" id="spinnext">Spin</button><button class="btn grow" data-a="spinall" id="spinall">Spin all</button>')):''}<button class="btn grow" data-a="wclose" id="wclose">${cm?'Hide':'Close'}</button></div>${cm?'':'<div class="small mut" style="margin-top:6px">Only the commissioner can spin. This view updates by itself.</div>'}</div>`}
function pumpWheel(){if(WH.playing||!WH.queue.length||!WH.open)return;const rec=WH.queue.shift();const sp=M.spin;if(!sp||rec.gen!==sp.gen)return pumpWheel();
  const before=sp.players.filter(p=>!spinInfo().winners.slice(0,rec.n-1).includes(p));WH.playing=true;setSeen(rec.id);WH.cur={rec,players:before};const el=document.getElementById('wheelov');if(!el)return;
  const wrap=el.querySelector('.wheelwrap');if(wrap)wrap.innerHTML='<div class="wptr"></div>'+wheelSVG(before,0);const g=el.querySelector('#wg');const target=F.wheelTarget(before.length,rec.idx,rec.nonce);const dur=WH.reduced?200:3600;
  if(g){if(WH.reduced)g.style.transform='rotate('+(target%360)+'deg)';else{void g.getBoundingClientRect();g.style.transition='transform '+dur+'ms cubic-bezier(.12,.6,.1,1)';g.style.transform='rotate('+target+'deg)'}}
  const ww=el.querySelector('#wwin');if(ww)ww.textContent='…';vib([30]);
  setTimeout(()=>{WH.shown=rec.n;WH.playing=false;WH.cur=null;const e2=document.getElementById('wheelov');const w2=e2&&e2.querySelector('#wwin');if(w2)w2.textContent=wlabel(rec.winner)+' takes pick #'+rec.n+'!';
    setTimeout(()=>{if(!WH.playing){renderWheel();pumpWheel()}},WH.reduced?150:1100)},dur+150)}
async function writeSpin(rec){const url=K.spin(M.epoch,rec.gen,rec.n);
  for(let a=0;a<3;a++){let ex=null;try{ex=F.parseSpin(await readRaw(url))}catch(e){return null}const winners=F.spinReplay(M,SPIN).winners;
    if(ex&&ex.id!==rec.id&&F.spinValid(M,winners,ex)){SPIN[rec.n]=ex;SPINraw[rec.n]=JSON.stringify(ex);rebuild(true);return ex}
    if(!ex||ex.id!==rec.id){try{await postJ(url,rec)}catch(e){continue}}SPIN[rec.n]=rec;SPINraw[rec.n]=JSON.stringify(rec);rebuild(true);
    await sleep(500);try{const chk=F.parseSpin(await readRaw(url));if(chk&&chk.id===rec.id)return rec;if(chk&&F.spinValid(M,winners,chk)){SPIN[rec.n]=chk;SPINraw[rec.n]=JSON.stringify(chk);rebuild(true);return chk}}catch(e){return rec}}return null}
async function spinOne(){if(WH.busy||WH.playing||!needUnlock())return false;WH.busy=true;
  try{await pollOnce();if(M.status!=='lobby'){toast('The draft already started.');return false}
    if(!full8()){toast(waitTxt()+' before the wheel can spin.',4000);return false}
    if(F.spinCompleted(M)){toast('The order was already set with the wheel. There is only one spin.',5000);WH.all=false;renderWheel();return false}
    if(!M.spin){const r=await simple(m=>F.mSpinStart(m,joinedMids(),nowSrv(),0),null,(chk,ns)=>!!chk.spin&&chk.spin.sid===ns.spin.sid);if(!r.ok){await pollOnce();renderWheel();return false}await pollOnce()}
    let sp=spinInfo();if(sp.done){WH.finishing=true;renderWheel();await applySpin();return false}
    if(spinState()==='stale'){toast('The last spin did not finish. Tap “Spin again”.',5000);WH.all=false;renderWheel();return false}
    const rec=F.makeSpin(M,sp.winners,nowSrv());const w=await writeSpin(rec);if(!w){toast('Could not save the spin — try again.');return false}
    sp=spinInfo();if(sp.done){WH.finishing=true;renderWheel();await sleep(WH.reduced?5500:9500);await applySpin()}return true}finally{WH.busy=false;WH.finishing=false;renderWheel()}}
/* the commissioner finishes a spin whose results are all saved but whose order was not applied */
async function finishSpin(){if(WH.busy||WH.playing){toast('Still saving the order, one moment…',3000);return false}if(!needUnlock())return false;WH.busy=true;WH.finishing=true;renderWheel();
  try{await pollOnce();if(M.status!=='lobby'){toast('The draft already started.');return false}
    if(F.spinCompleted(M)){toast('The order was already set with the wheel.',4000);return false}
    if(!spinInfo().done){toast('The spin is not finished yet. Open the wheel to continue it.',5000);return false}
    return await applySpin()}finally{WH.busy=false;WH.finishing=false;renderWheel()}}
/* what the overlay says once all results are in: saving (the commissioner page is waiting to apply) or stuck (nobody applied it) */
function wheelPhase(){if(!M||F.spinCompleted(M)||!spinInfo().done)return'';if(WH.finishing)return'saving';const last=F.spinStatus(M,SPIN,nowSrv()).lastTs;return nowSrv()-last<(WH.reduced?5500:9500)+8000?'saving':'stuck'}
function wheelTick(){if(!WH.open||WH.playing||!M||M.status!=='lobby')return;const p=wheelPhase();if(p&&p!==WH.phase)renderWheel()}
const spinState=()=>M?F.spinStatus(M,SPIN,nowSrv()).state:'none';
async function respin(){if(WH.busy||WH.playing||!needUnlock())return false;WH.busy=true;
  try{await pollOnce();if(F.spinCompleted(M)){toast('The order was already set with the wheel. There is only one spin.',5000);renderWheel();return false}
    if(spinInfo().done){await applySpin();renderWheel();return false}
    const r=await simple(m=>F.mSpinStart(m,joinedMids(),nowSrv(),F.spinStatus(m,SPIN,nowSrv()).lastTs),null,(chk,ns)=>!!chk.spin&&chk.spin.sid===ns.spin.sid);
    SPIN={};SPINraw={};WH.shown=0;WH.queue=[];await pollOnce();renderWheel();return r.ok}finally{WH.busy=false}}
async function applySpin(){const sp=spinInfo();const r=await mutateMeta(m=>F.mSpinApply(m,sp.winners,joinedMids(),nowSrv()),chk=>chk.orderSet&&chk.spin&&chk.spin.done);if(r.ok)toast('Draft order set!');else toast(r.msg||'Could not save the order');return r.ok}
async function spinAll(){if(WH.all)return;WH.all=true;renderWheel();while(WH.all){const ok=await spinOne();if(!ok)break;if(spinInfo().done)break;await sleep(WH.reduced?500:5200)}WH.all=false;renderWheel()}
/* ===================== presence ===================== */
const PR={recs:{},busy:false,timer:null};
async function presBeat(){if(PR.busy||document.hidden||!M||M.status==='complete')return;PR.busy=true;
  try{const owner=myMid();if(owner&&!WATCH){try{await postJ(K.pres(owner),{t:nowSrv(),n:owner});PR.recs[owner]={t:nowSrv()}}catch(e){}}
    await Promise.all(MG.filter(x=>x.mid!==owner).map(async x=>{try{const r=F.parsePresence(await readRaw(K.pres(x.mid)));if(r)PR.recs[x.mid]=r}catch(e){}}))}finally{PR.busy=false;renderPresence()}}
function presTick(){clearInterval(PR.timer);PR.timer=null;if(!document.hidden)PR.timer=setInterval(presBeat,F.PRES.beatMs)}
/* s26c9: viewer highlight (display only): gold outline + YOU tag; never for spectators / no identity */
const meV=()=>!isSpec()&&!WATCH?myMid():null;const youTag='<span class="youtag">YOU</span>';
function renderPresence(){const el=$('presence');if(!el)return;const owner=myMid();const v=F.presenceView(PR.recs,nowSrv(),WATCH?null:owner,joinedMids());
  if((!v.online.length&&!v.away.length)||!S||S.status==='complete'||tab==='chat'){el.hidden=true;el.innerHTML='';return}
  const vm=meV();const chp=(o,on)=>{const m=mg(o.mid);const y=vm&&o.mid===vm;return `<span class="pc ${on?'on':'off'}${o.mid===owner?' me':''}${y?' you':''}" title="${on?'online':'last seen '+esc(o.text)}">${UI.avatar(m,20)}<span>${esc(NT(m))}</span>${y?youTag:''}</span>`};
  if(vm){const i=v.online.findIndex(o=>o.mid===vm);if(i>0)v.online=[v.online[i]].concat(v.online.filter((o,k)=>k!==i))}/* display copy only: the viewer first */
  el.hidden=false;el.innerHTML='<div class="pr"><span class="prl">Online</span>'+v.online.map(o=>chp(o,true)).join('')+v.away.map(o=>chp(o,false)).join('')+'</div>'}
/* ===================== alerts ===================== */
let flashT=null,seenChat=+(lsGet(L('seenChat'))||0),warnedFor='';
function setFavicon(on){const l=$('fav');if(!on){l.href='icons/icon-192.png';return}try{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#ffd23f';x.beginPath();x.arc(32,32,32,0,7);x.fill();x.fillStyle='#111';x.font='900 40px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText('!',32,34);l.href=c.toDataURL('image/png')}catch(e){}}
function vib(p){try{if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return;navigator.vibrate&&navigator.vibrate(p)}catch(e){}}
function setAlertBar(html){$('alertbar').innerHTML=html?`<div class="alertbar">${html}</div>`:''}
function onState(prev,next){if(!prev){updateTitle();return}
  for(let i=0;i<Math.min(prev.picks.length,next.picks.length);i++){if(prev.picks[i].id&&prev.picks[i].id!==next.picks[i].id){toast('Pick #'+next.picks[i].n+' changed to '+tn(next.picks[i].tid)+' — a simultaneous write was resolved.',6500);break}}
  if(prev.epoch!==next.epoch)toast('The draft was reset by the commissioner.',5000);
  const wasLive=prev.status==='live',nowLive=next.status==='live';
  if(prev.status==='lobby'&&nowLive)toast('The draft is LIVE!');
  if(next.status==='complete'&&prev.status!=='complete'){toast(next.endedEarly?'The commissioner ended the draft.':'Draft complete! Opening the recap…',6000);
    /* s23 (item 9): the end of the draft goes straight to the recap page (only when it ends while this page is open; opening a finished draft later stays here) */
    if(prev.status==='live'&&prev.logReady&&!NOREDIR){/* DR2: hand the recap the exact server text already read here, so it can render at once */try{sessionStorage.setItem('fbn.recapseed.'+LID,JSON.stringify({id:LID,ts:Date.now(),epoch:M&&M.epoch,meta:Mraw,claims:CLraw,profiles:PROFraw,entries:ENTraw}))}catch(e){}
      setTimeout(()=>{location.href=recapUrl()},1800)}}
  const mm=myMid();
  if(mm&&!WATCH&&nowLive){const a=F.picksAway(next,mm),pa=wasLive?F.picksAway(prev,mm):null;
    if(a===0&&pa!==0){vib([250,120,250,120,500]);setAlertBar('')}
    else if(a===2&&pa!==2){vib([120,80,120]);setAlertBar('<b>You\'re 2 picks away.</b> Start thinking — add a few teams to your queue.');setTimeout(()=>{if(F.picksAway(S,mm)!==0)setAlertBar('')},9000)}
    if(a!==0&&pa===0)setAlertBar('')}
  if(!nowLive)setAlertBar('');updateTitle()}
function onChat(prev,next){if(tab==='chat'&&chatSub==='chat'){seenChat=next.msgs.length;lsSet(L('seenChat'),String(seenChat))}
  if(prev&&next.msgs.length>prev.msgs.length&&tab!=='chat'){const m=next.msgs[next.msgs.length-1];if(m&&m.who!==myMid()&&MG.some(x=>x.mid===m.who))toast(mg(m.who).name+': '+m.text.slice(0,60))}renderTabs();updateChatView()}
function updateTitle(){try{seatBeep()}catch(e){}const base=(M?M.name+' · ':'')+'Fantasy BBALL NCAA';const mm=myMid();const mineNow=S&&mm&&!WATCH&&F.picksAway(S,mm)===0&&!preStart();clearInterval(flashT);flashT=null;
  if(mineNow){setFavicon(true);if(document.hidden){let k=0;flashT=setInterval(()=>{document.title=(k++%2)?base:'YOUR PICK!'},900);document.title='YOUR PICK!'}else document.title='Your pick! · '+base}
  else{setFavicon(false);document.title=S&&S.status==='live'?base+' · #'+(S.picks.length+1):base}}
function beep(){try{if(lsGet('sound')==='0'||beepMuted())return;const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const c=beep.c||(beep.c=new A());const o=c.createOscillator(),g=c.createGain();o.frequency.value=880;g.gain.value=.08;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.18)}catch(e){}}
/* s26c16d (Paul): 3-beep sound when THIS device's seat goes on the clock. WebAudio oscillators, no file. Once per pick (epoch:n remembered in localStorage, so reloads/polls/re-renders never repeat it). Mute: localStorage fbn.beepMute ('Turn sound' on the More tab). Never for spectators, the commissioner without a seat, auto-picks, paused/complete/lobby. Everything in try/catch. */
function beepMuted(){try{return localStorage.getItem('fbn.beepMute')==='1'}catch(e){return false}}
function beepCtx(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!beep.c)beep.c=new A();if(beep.c.state==='suspended'&&beep.c.resume)beep.c.resume().catch(()=>{});return beep.c}catch(e){return null}}
try{const un=()=>{try{beepCtx()}catch(e){}};document.addEventListener('pointerdown',un,{capture:true,passive:true});document.addEventListener('keydown',un,{capture:true})}catch(e){}
function beepN(k,gap,dur,lim){try{if(beepMuted())return;const c=beepCtx();if(!c)return;gap=gap||.28;dur=dur||.16;const t0=c.currentTime+.02;for(let i=0;i<k;i++){if(lim!=null&&(i*gap+dur)*1000>lim)break;/* never past 0:00 */const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=gap<.28?1175:988;g.gain.value=.12;o.connect(g);g.connect(c.destination);o.start(t0+i*gap);o.stop(t0+i*gap+dur)}}catch(e){}}
let cueSeen='';/* s26c16d spec update: 3 beeps on the clock (n:start), 2 at 30 s left (n:30), 1 at 10 s left (n:10); each at most once per pick (localStorage), own seat only; thresholds already passed when this page first sees the pick are skipped silently; at most one cue per check (never a burst) */
function seatBeep(){try{if(WATCH||!S||!M)return;const mm=myMid();if(!mm||isSpec())return;if(M.status==='lobby'||S.status!=='live'||S.paused||M.paused)return;
  if(preStart())return;const sl=F.onClock(S);if(!sl||sl.owner!==mm)return;if(autoR(0))return;
  const key='fbn.beepLast.'+LID,v=(S.epoch||0)+':'+sl.n;let r=null;try{r=JSON.parse(localStorage.getItem(key)||'null')}catch(e){}if(!r||r.k!==v||!Array.isArray(r.d))r={k:v,d:[]};
  const fresh=cueSeen!==v;cueSeen=v;let fire=0;const rem=S.clockSecs?remaining():null;if(rem!=null&&rem<=0)return;
  if(r.d.indexOf(sl.n+':start')<0){r.d.push(sl.n+':start');fire=3}
  if(rem!=null){const id=sl.n+':30';if(rem<=30000&&r.d.indexOf(id)<0){r.d.push(id);if(!fresh&&!fire)fire=2}}
  /* s28 item 2: one beep per second from 10 s down to 3 s, then rapid beeps (4 per second) in the last 2 s. Each second at most once (localStorage); a second already passed is skipped (never a burst after a reload, a fresh page or a throttled background tab) */
  let fast=0;if(rem!=null&&rem<=10000){const sec=Math.ceil(rem/1000);const id=sl.n+':s'+sec;if(r.d.indexOf(id)<0){for(let q=sec+1;q<=10;q++){const pid=sl.n+':s'+q;if(r.d.indexOf(pid)<0)r.d.push(pid)}r.d.push(id);if(r.d.indexOf(sl.n+':30')<0)r.d.push(sl.n+':30');if(!fresh&&!fire&&sec*1000-rem<1500){if(sec<=2)fast=sec;else fire=1}}}
  try{localStorage.setItem(key,JSON.stringify(r))}catch(e){}if(fire)beepN(fire);else if(fast)beepN(4,.25,.1,rem)}catch(e){}}
try{setInterval(()=>{try{if(S&&S.clockSecs&&S.status==='live'&&!S.paused){const r=remaining();if(r!=null&&r>0&&r<=11500)tickClock()/* display + beep in step */}}catch(e){}},200)}catch(e){}/* s28: the countdown beeps are checked 5x a second, so each second is caught near its start */
/* ===================== render ===================== */
const QTAB=new URLSearchParams(location.search).get('tab');const NOREDIR=new URLSearchParams(location.search).get('stay')==='1';const TABN=['board','teams','my','chat','rules','more'];/* s24: #tab=<name> wins (a shared link or a refresh), an unknown tab in the hash falls back to Board */const HT=FR.has('tab')?(TABN.indexOf(FR.get('tab'))>=0?FR.get('tab'):'board'):null;
let tab=HT||(TABN.indexOf(QTAB)>=0?QTAB:null)||(!UI.isMockId(LID)&&TABN.indexOf(lsGet(L('tab')))>=0?lsGet(L('tab')):null)||'board',chatSub='chat',viewOwner=null,reactOpen=null,identityShown=false;
const TABS=[['board','Board','🧩'],['teams','Teams','🏀'],['my','My Team','👤'],['chat','Chat','💬'],['rules','Rules','📋'],['more','More','⚙️']];/* s26c14 (Paul): Rules tab between Chat and More; replaces the header Rules buttons and the post-draft Rules card on More */
function stickySite(){let el=$('stickysite');const done=false;/* s23: the sticky League site bar is gone (the end card has the button) */if(!done){if(el)el.remove();document.body.classList.remove('hasstick');return}
  if(!el){el=document.createElement('a');el.id='stickysite';el.className='stickysite btn pri';el.textContent='League site';document.body.appendChild(el)}
  const show=tab!=='chat';el.href=siteUrl();el.hidden=!show||bigVis;document.body.classList.toggle('hasstick',show);watchBig()}
/* the sticky League site button only shows while the big one at the top of the end-of-draft banner is off screen, so two big buttons are never visible together */
let bigVis=false,bigObs=null,bigEl=null;
function watchBig(){if(!('IntersectionObserver' in window))return;const b=$('bigsite');if(b===bigEl)return;if(bigObs){bigObs.disconnect();bigObs=null}bigEl=b;bigVis=false;
  if(b){bigObs=new IntersectionObserver(es=>{bigVis=es[es.length-1].isIntersecting;const el=$('stickysite');if(el)el.hidden=tab==='chat'||bigVis});bigObs.observe(b)}}
function measureTabs(){const h=$('tabs').offsetHeight;if(h)document.body.style.setProperty('--tabh',h+'px')}
window.addEventListener('resize',()=>{if($('tabs'))measureTabs()});
function renderTabs(){stickySite();const unread=Math.max(0,C.msgs.length-seenChat);const el=$('tabs');const af=document.activeElement&&el.contains(document.activeElement)?document.activeElement.dataset.t:null;
  patchHTML(el,TABS.map(t=>`<a role="tab" href="#tab=${t[0]}" id="tab_${t[0]}" aria-selected="${tab===t[0]?'true':'false'}" aria-controls="view" tabindex="${tab===t[0]?'0':'-1'}" class="${tab===t[0]?'on':''}" data-a="tab" data-t="${t[0]}"><span aria-hidden="true">${t[2]}</span>${t[1]}${t[0]==='chat'&&unread&&tab!=='chat'?`<i class="bd"><span aria-hidden="true">${unread>9?'9+':unread}</span><span class="sr">${unread} unread message${unread===1?'':'s'}</span></i>`:''}</a>`).join(''));
  $('view').setAttribute('aria-labelledby','tab_'+tab);measureTabs();/* s25-full Teams scroll fix: tabs are patched in place, so focus normally survives; if it did not, restore it WITHOUT scrolling (a plain focus() made iOS Safari jump to the top on every poll) */if(af&&!el.contains(document.activeElement)){const b=el.querySelector('[data-t="'+af+'"]');if(b)b.focus({preventScroll:true})}}
$('tabs').addEventListener('keydown',e=>{const k=e.key;if(!['ArrowLeft','ArrowRight','Home','End'].includes(k))return;const bs=[...$('tabs').querySelectorAll('[data-t]')];let i=bs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();i=k==='Home'?0:k==='End'?bs.length-1:(i+(k==='ArrowRight'?1:-1)+bs.length)%bs.length;setTab(bs[i].dataset.t);const nb=$('tabs').querySelector('[data-t="'+TABS[i][0]+'"]');if(nb)nb.focus({preventScroll:true})});
/* s26c9: League site buttons read '<League name> League site →' (name escaped, truncated with an ellipsis, arrow kept); full text in title + aria-label */
const siteName=()=>{const n=String((M&&M.name)||'').trim();return n==='League'?'':n};/* core.js normalises a blank name to 'League' */
const siteText=()=>{const n=siteName();return(n?n+' ':'')+'League site →'};
const siteLbl=()=>{const n=siteName();return n?`<span class="snm">${esc(n)}</span> <span class="sfx">League site →</span>`:'<span class="sfx">League site →</span>'};
const siteAttr=()=>`title="${esc(siteText())}" aria-label="${esc(siteText())}"`;
const siteUrl=()=>UI.pageUrl('league.html',{l:LID}),recapUrl=()=>UI.pageUrl('recap.html',{l:LID});
function renderTop(){const done=!!(S&&S.status==='complete');const site=isMock()?'<span class="pill prac" id="pracpill">Practice</span>':done?`<a class="pill sitebtn" id="sitelink" href="${esc(siteUrl())}" ${siteAttr()}>${siteLbl()}</a>`:'<span class="pill dis" id="sitelink" aria-disabled="true">League site · after the draft</span>';const who=WATCH?'<span class="pill" id="who">Spectator</span>':(myMid()?`<span class="pill${meV()?' you':''}" id="who">${UI.avatar(mg(myMid()),18)} <span class="whonm">${esc(NT(mg(myMid())))}</span>${TEAM_NAME_ON_TOP?`<span class="whosub small mut"> · ${esc(NB(mg(myMid())))}</span>`:''}${commish()?' · commissioner':''}${meV()?youTag:''}</span>`:((me||KFRAG)&&!authReady&&!removed()?'<span class="pill" id="who">Checking your link…</span>':'<span class="pill" id="who">Not joined</span>'));/* s23 (LOW-2): no "Not joined" while a private link is still being checked */
  $('top').innerHTML=UI.header({below:true,sub:M?M.name:'Draft room',right:'<span id="conn" class="pill bad"><i></i>Connecting…</span>'+who+site/* s26c14: header Rules buttons replaced by the Rules tab */});renderConn()}
/* s25-full (Paul via NCAA): the Rules page. Every line comes from the code and this league's own settings (M.settings, read live); nothing is invented. Questions are in draftroom-notes/s25-full/rules/UNCLEAR.md */
function canPick(){if(!S||!S.logReady)return false;if(preStart())return false;if(WATCH)return false;const s=F.onClock(S);if(!s||S.paused)return false;return(!isSpec()&&s.owner===myMid())||commish()}
/* s28g: local turn timer. The turn start (last pick ts / startedAt / resumeAt) is stamped by whichever page wrote it, in that page's server time; if THIS page's server time is ahead of the writer's by the time left (failed sync on a skewed device, a proxy with a wrong Date header), the server deadline is already past here: 0 beeps and an instant 'expired' auto-pick. So every page also keeps its own deadline on its own clock, from when it first saw the turn: if it saw the turn begin (it had an earlier state), a full clock (+ a pending start/resume delay, at most START_CD_MS); if it opened mid-turn, the time left by server time at that moment (0..clock). 'expired' is never trusted before this local deadline; the display/beeps follow the local timer when the two differ by more than 5 s. */
const TL={k:null,seen:false,dl:0},LS={k:null,at:0,lobby:false,seen:false};
/* s28g: local start instant: when this page saw the draft go live from the lobby with the 60 s start countdown, the start is that countdown (by server time, capped 60 s; the full 60 s if the server time says it already passed); a start/resume instant that changes while live (Start now, Resume, Undo) starts at once; opened mid-countdown: server time left, capped 60 s */
function localStartAt(){if(!M)return null;if(M.status!=='live'){LS.seen=true;LS.lobby=M.status==='lobby';LS.k=null;return null}if(!tSynced&&Date.now()-bootAt<2000)return null;const st=startSt();if(!st)return null;const k=(M.epoch||0)+':'+st;
  if(LS.k!==k){const now=Date.now(),d=st-nowSrv();LS.at=now+(!LS.seen?Math.min(START_CD_MS,Math.max(0,d)):LS.lobby&&M.startCd&&!(S&&S.picks&&S.picks.length)?(d>0?Math.min(START_CD_MS,d):Math.min(START_CD_MS,+M.startCd||START_CD_MS)):0);LS.k=k;LS.seen=true;LS.lobby=false}return LS.at}
const startedLocal=()=>{const a=localStartAt();return a!=null&&Date.now()>=a};/* s28g: the start instant has passed by this page's own timer */
function turnLocal(){if(!S||!M||S.status!=='live'||S.paused||!S.clockSecs||!S.deadline){if(S)TL.seen=true;TL.k=null;try{localStartAt()}catch(e){}return null}if(!tSynced&&Date.now()-bootAt<2000)return null;const s=F.onClock(S);if(!s)return null;
  const cap=S.clockSecs*1000,k=(S.epoch||0)+':'+s.n+':'+startSt()+':'+S.clockSecs;
  if(TL.k!==k){const now=Date.now(),lsa=localStartAt();TL.dl=TL.seen?Math.max(now,lsa||0)+cap:now+Math.max(0,Math.min(cap+START_CD_MS,S.deadline-nowSrv()));TL.k=k;TL.seen=true}
  return TL.dl}
const autoR=g=>{const r=F.autoReason(S,nowSrv(),g);return r==='expired'&&localEarly()?null:r};/* s28g: 'expired' is not trusted while this page's own turn timer still runs */
const localEarly=()=>{const dl=turnLocal();return dl!=null&&Date.now()<dl+CFG.graceMs};/* s28g: true while this page's own clock says the turn still has time */
const stampNow=()=>{const n=nowSrv();try{return S&&M?Math.max(n,F.autoBase(M,S.picks)+1):n}catch(e){return n}};/* s28g: a new turn never starts before the one it follows (a writer whose clock is behind cannot stamp an already-expired turn) */
function remaining(){if(!S||!S.clockSecs)return null;const cap=S.clockSecs*1000;/* s28 item 3: never more than the clock length (a server-offset or rounding error showed 11 for a 10 s hold) */if(S.paused)return S.pausedLeft==null?null:Math.min(cap,S.pausedLeft);if(!tSynced&&Date.now()-bootAt<2000)return null;if(dispHold())return cap;/* s28c: never 0:00 before the start instant; s28d: fail-open by local time */if(!S.deadline)return null;{const r=Math.min(cap,S.deadline-dispNow());const dl=turnLocal();if(dl!=null){const lr=Math.min(cap,dl-Date.now());if(Math.abs(lr-r)>5000)return lr}return r}}/* s28g: follow this page's own turn timer when the server deadline is implausible */
const holdLeftS=hu=>Math.max(0,Math.min(Math.ceil(F.AUTO.undoHoldMs/1000),Math.ceil((hu-nowSrv())/1000)));/* s28 item 3: re-pick hold countdown clamped to the hold length */
function autoNote(){if(!commish()||!S||!loaded||WATCH)return'';const s=M.settings;
  if(M.status==='lobby'&&s.startMode==='auto'&&s.startAt!=null){const due=nowSrv()>=s.startAt+500&&full8();
    return `<div class="note" id="autonote"><b>Auto-start only runs while a page is open.</b> The draft starts at the set time if at least one phone or computer has this room open. If everyone has closed it, nothing starts until someone opens it again.${due?'<div style="margin-top:6px"><button class="btn pri sm" data-a="catchup" id="catchup">Start the draft now</button></div>':''}</div>`}
  if(S.status==='live'&&!S.paused&&S.autoPick&&S.clockSecs){const r=autoR(0);
    return `<div class="note" id="autonote"><b>Auto-pick only runs while a page is open.</b> If every phone has this room closed, a missed turn waits until someone opens it again.${r==='expired'?'<div style="margin-top:6px"><button class="btn pri sm" data-a="catchup" id="catchup">Make the auto-pick now</button></div>':''}</div>`}
  return''}
/* s25-full scroll hold (all tabs): a re-render that briefly shrinks or swaps content keeps the page where the user left it. Reserve the old height while swapping, then restore window.scrollY if the browser moved it. */
/* s25m (QA BUG-3): when the banner is wholly above the viewport and its height changes (e.g. the On the clock card shrinks after your pick), scroll by the same amount so what the user sees does not move (was a 24 px jump on Teams at 390) */
/* s26c6s (QA REG-1): the s25m fix scrolled by the banner's height change (scrollBy dh) while the banner was above the viewport. In the mock room bots pick every few seconds, so the On the clock card changes height on almost every pick and scrollY moved 24-25 px each time (Teams/More at 390). Now, while the banner is wholly above the viewport, its height is frozen (height + overflow hidden; nothing of it is on screen) so neither the content nor scrollY moves. It is released when it scrolls back into view (or the tab changes), with a one-off scrollBy only if the user is still scrolled past its top. */
let frozenEl=null;
function unfreezeY(){const el=frozenEl;if(!el)return;frozenEl=null;const h=el.offsetHeight;el.style.height='';el.style.overflow='';const dh=el.offsetHeight-h;if(dh&&window.scrollY>0&&el.getBoundingClientRect().top<0)window.scrollBy(0,dh)}
addEventListener('scroll',()=>{if(frozenEl&&frozenEl.getBoundingClientRect().bottom>0)unfreezeY()},{passive:true});
function holdY(el,fn){const y=window.scrollY,h=el?el.offsetHeight:0,above=!!(el&&h&&el.getBoundingClientRect().bottom<=0);
  if(above){el.style.height=h+'px';el.style.overflow='hidden';frozenEl=el;try{fn()}finally{if(Math.abs(window.scrollY-y)>1&&!(tab==='chat'&&chatNearBottom))window.scrollTo(0,y)}return}
  if(el&&el===frozenEl)unfreezeY();
  if(el&&h)el.style.minHeight=h+'px';try{fn()}finally{if(el)el.style.minHeight='';if(Math.abs(window.scrollY-y)>1&&!(tab==='chat'&&chatNearBottom))window.scrollTo(0,y)}}
let chatNearBottom=false;
function renderBanner(){holdY($('banner'),renderBannerH)}
function renderBannerH(){const keep=document.activeElement&&document.activeElement.id==='pickbtn';renderBanner0();/* s25-full (Paul via NCAA): the Auto-pick for me switch sits right under the On the clock card (managers only) */{const oc=$('oncard');const mm=myMid();if(oc&&mm&&!isSpec()&&S&&S.status==='live'){const au=!!(S.auto&&S.auto[mm]);$('banner').insertAdjacentHTML('beforeend',`<label class="sw atog" id="autotogwrap"><input type="checkbox" data-a="autotog" id="autotog" ${au?'checked':''}> Auto-pick for me</label>`)}}if(isMock()&&$('banner'))$('banner').insertAdjacentHTML('afterbegin',UI.practiceBanner(M.solo?'You against 7 bots. Not your real league: nothing here changes it.':'Not your real league: nothing here changes it.'));if(removed()&&$('banner'))$('banner').insertAdjacentHTML('afterbegin','<div class="note" id="removednote"><b>You were removed by the commissioner.</b> You can still watch the draft and read the chat.</div>');/* s25-full (Paul via NCAA): the auto-pick / auto-start notes are no longer in the banner; the commissioner sees them in More > Commissioner tools */if(S&&loaded&&S.status==='live'&&canPick()&&(!isMock()||(F.onClock(S)||{}).owner===myMid())&&$('banner'))$('banner').insertAdjacentHTML('beforeend','<button class="btn pri pickbtn" data-a="popen" id="pickbtn">Pick a team</button>');
  if($('pickov')){const cs=S&&F.onClock(S);if(!canPick()||!cs||String(cs.n)!==$('pickov').dataset.n)closePick();else updateTeams()}if(conflictMsg&&$('banner'))$('banner').insertAdjacentHTML('beforeend',`<div class="cflict" id="conflict">${conflictMsg}</div>`);const sb=stuckBar();if(sb&&$('banner'))$('banner').insertAdjacentHTML('afterbegin',sb);
  if(keep){const b=$('pickbtn');if(b&&document.activeElement!==b)b.focus({preventScroll:true})}}
/* Pick stuck: a pick slot the draft server cannot read or save right now (Store.stuck). Plain wording; the on-the-clock manager and the commissioner still have a way forward. */
function stuckBar(){if(!M||!S||!loaded)return'';const st=Store.stuck();if(!st.length)return'';const ns=st.map(x=>'#'+x.n).join(', ');const cur=S.status==='live'?F.onClock(S):null;const cm=commish()&&!WATCH&&cur&&!S.paused;
  return `<div class="alertbar stuckbar" id="stuckbar" role="status"><b>Pick stuck.</b> The draft server is not answering for pick ${esc(ns)}. This is a problem on the server's side, not with your phone. Nothing is lost: the picks already made are safe, and we keep trying every few seconds. ${S.paused?'The draft is paused. When the manager is ready, the commissioner resumes it (More tab, Draft controls, Resume); the pick clock then starts fresh.':(cur?'The manager on the clock can still pick; the pick is saved to a backup spot automatically and counts the same.':'')}<div class="row" style="margin-top:6px"><button class="btn sm" data-a="stuckretry" id="stuckretry">Try again now</button>${cm?'<button class="btn sm pri" data-a="force" id="forcepick">Force a pick for '+esc(mg(cur.owner).name)+'</button>':''}</div></div>`}
function mockEndBtns(){const bk=UI.mockBack(M);return `<a class="btn pri" id="bnrecap" href="${esc(recapUrl())}">Draft recap</a><a class="btn" id="mockagain" href="${esc(UI.mockAgain(M))}">Run another</a><a class="btn" id="mockback" href="${esc(bk.href)}">${esc(bk.label)}</a>`}
function renderBanner0(){const b=$('banner');
  if(!loaded||(!S&&!notFound)){const off=connState()==='offline';b.innerHTML=`<div class="banner"><div class="bm"><div class="nm">${off?'Offline, retrying…':'Connecting…'}</div><div class="sb">${off?'Trying to reach the draft server again':'Reaching the draft server'}</div></div></div>`;return}
  if(notFound||S.status==='lobby'){b.innerHTML='';return}
  if(S.status==='live'&&!S.logReady){b.innerHTML=`<div class="banner"><div class="bm"><div class="nm">Loading the board…</div><div class="sb">Fetching picks made so far</div></div></div>`;return}
  /* s23 (item 10): one compact end-of-draft card: small FINAL line, title, three equal buttons (See my team / Draft recap / League site). No giant League site bar, no "locked" text. */
  if(S.status==='complete'){const isMgr=!!myMid();const rd=M.redraft&&M.redraft.phase==='live';b.innerHTML=`<div class="banner finalbn" id="finalbanner"><div id="donecard" class="dcwrap"><div class="dccheer">${cheerBtn()}</div><div class="bm"><div class="lbl" id="finallbl">${S.endedEarly?'ENDED EARLY':'FINAL'} · ${S.real.length} of ${S.realTotal} picks</div><div class="nm" id="finalhead">${S.endedEarly?(isMock()?'Mock draft ended early':'Draft ended early'):(isMock()?'Mock draft complete 🎉':(rd?'Redraft complete 🎉':'Draft complete 🎉'))}</div></div><div class="endbtns3">${isMock()?mockEndBtns():`<button class="btn" id="seemy" data-a="tab" data-t="my">${isMgr?'See my team':'See the teams'}</button><a class="btn pri" id="bnrecap" href="${esc(recapUrl())}">Draft recap</a><a class="btn sitebtn" id="bigsite" href="${esc(siteUrl())}" ${siteAttr()}>${siteLbl()}</a>`}${dcExtra()}</div></div></div>`;stickySite();return}
  stickySite();
  if(preStart()){const s0=F.onClock(S),o0=s0?mg(s0.owner):null;const left=+M.startedAt-nowSrv();preWas=true;
    b.innerHTML=`<div class="banner prestart" id="precard"><div class="bm"><div class="lbl">GET READY</div><div class="nm" id="prehead">Draft starts in <span id="precd">${UI.fmtClock(Math.min(START_CD_MS,left))}</span></div><div class="sb">${o0?'Pick #1: '+esc(o0.name)+(!isSpec()&&s0.owner===myMid()?' (you)':'')+' · ':''}${S.clockSecs?S.clockSecs+' sec per pick':'no pick clock'}</div></div>${commish()?'<button class="btn pri" data-a="startnow" id="startnow">Start now</button>':''}</div>`;return}
  const s=F.onClock(S),o=mg(s.owner),mine=!isSpec()&&myMid()===s.owner;const myA=(!isSpec())?F.picksAway(S,myMid()):null;
  let sub='Pick #'+s.n+' · Round '+s.round+' of '+S.rounds+(o.team&&!TEAM_NAME_ON_TOP?' · '+esc(o.team):'');/* s25-full (Paul via NCAA): picks-away is its own big yellow line, not part of the sub line */const awayLine=(!mine&&myA!=null)?`<div class="away-big" id="awaybig">${myA===1?'You\'re up next!':'You\'re '+myA+' picks away'}</div>`:'';
  const rem=remaining();let cd='';
  if(S.clockSecs){cd=S.paused?`<div class="cd">⏸<small>PAUSED ${rem!=null?UI.fmtClock(rem):''}</small></div>`:`<div class="cd${rem!=null&&rem<(S.warn15?15000:10000)?' low':''}" id="cdv">${rem!=null?(rem<=0?'0:00':UI.fmtClock(rem)):'–'}<small>${rem!=null&&rem<=0?(S.autoPick?'AUTO-PICKING':"TIME'S UP · waiting"):'PICK CLOCK'}</small></div>`}
  else if(S.paused)cd=`<div class="cd">⏸<small>PAUSED</small></div>`;
  const tags=(isBot(s.owner)?' · bot, picks by itself':S.away[s.owner]?' · away, auto-pick':S.auto[s.owner]?' · 🤖 AUTO':'');{const hu=!isBot(s.owner)&&(S.away[s.owner]||S.auto[s.owner])&&!S.paused?F.undoHoldUntil(M,ENT[s.n],false):0;if(!S.clockSecs&&!isBot(s.owner)&&F.undoHoldUntil(M,ENT[s.n],false))sub+=' · <b id="autofrz">Auto-pick frozen after Undo (No clock) · pick by hand</b>';else if(hu&&nowSrv()<hu)sub+=' · <b id="autohold">'+(!tSynced&&Date.now()-bootAt<2000?'Auto re-pick soon':'Auto re-pick in '+holdLeftS(hu)+'s')+'</b>'}
  b.innerHTML=`<div class="banner${mine?' me':''}" id="oncard">${UI.avatar(o,mine?52:46)}<div class="bm"><div class="lbl">${mine?"YOU'RE ON THE CLOCK":'ON THE CLOCK'}</div><div class="nm">${mine?'Make your pick, '+esc(TEAM_NAME_ON_TOP?NT(o):o.name):esc(NT(o))}${esc(tags)}</div>${TEAM_NAME_ON_TOP&&NB(o)?`<div class="sb nbsub">${esc(NB(o))}</div>`:''}<div class="sb">${sub}</div>${awayLine}</div>${cd}</div>`}
function tickClock(){try{tickClock0()}catch(e){}try{seatBeep()}catch(e){}}/* s28: the clock text is updated first, then the beep for that second */
function tickClock0(){{const pc=$('precd');if(pc&&M){const l=+M.startedAt-nowSrv();if(l>0)pc.textContent=UI.fmtClock(Math.min(START_CD_MS,l))}if(preWas&&!preStart()){preWas=null;try{rebuild(true);updateTitle()}catch(e){}}}try{tickPcd()}catch(e){}{const ah=$('autohold');if(ah&&S&&M){const s=F.onClock(S);const hu=s?F.undoHoldUntil(M,ENT[s.n],isBot(s.owner)):0;const l=(!tSynced&&Date.now()-bootAt<2000)?-1:holdLeftS(hu);if(l<0)ah.textContent='Auto re-pick soon';else if(l>0)ah.textContent='Auto re-pick in '+l+'s';else ah.textContent='Auto re-picking…'}}/* s26c8b */const lc=$('lobbycd');if(lc&&M&&S&&S.status==='lobby'){const hx=lobbyCdHTML();if(lc._h!==hx){lc.innerHTML=hx;lc._h=hx}}const el=$('cdv');if(!el||!S)return;const rem=remaining();if(rem==null)return;
  el.firstChild.nodeValue=rem<=0?'0:00':UI.fmtClock(rem);el.classList.toggle('low',rem<(S.warn15?15000:10000));const sm=el.querySelector('small');if(sm)sm.textContent=rem<=0?(S.autoPick?'AUTO-PICKING':"TIME'S UP · waiting"):'PICK CLOCK';
  const sl=F.onClock(S);const wk=sl?S.epoch+':'+sl.n:'';el.classList.toggle('warn',!!(S.warn15&&rem>0&&rem<=15000));
  if(S.warn15&&sl&&rem>0&&rem<=15000&&warnedFor!==wk){warnedFor=wk;if(!isSpec()&&myMid()===sl.owner){vib([200,100,200]);/* s26c16d: the 10 s seat cue replaces the old single 15 s beep */toast('15 seconds left!',3000)}}}
/* ---- lobby ---- */
/* s23 (item 12): the start is stored as one UTC instant; every viewer sees it in their own zone with the zone named ("Saturday, November 7, 2026, 8:00 PM GMT+7"); the countdown is computed from the same instant, so it is identical everywhere */
function startLocal(t){try{const d=new Date(+t);const day=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:TZ});const tm=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:TZ,timeZoneName:'short'});return day+', '+tm}catch(e){return F.fmtUtc(t)}}
function lobbyCountdown(){const s=M.settings;if(s.startAt==null)return full8()?'Waiting for the commissioner to press Start':waitTxt();const d=s.startAt-nowSrv();
  if(d>0)return (s.startMode==='auto'?'Auto-start in ':'Scheduled in ')+F.countdownText(d);return s.startMode==='auto'?(full8()?(F.spinCompleted(M)||M.orderSet?'Starting now…':'Spinning for the order and starting now…'):(MG.length?'Starting now… '+phTxt()+'.':'Waiting for managers to join.')):(full8()?'Draft time has arrived — waiting for the commissioner to press Start':waitTxt())}
/* s26c9: the countdown is the hero of the lobby card: big tabular digits (days group past 99 h), HRS/MIN/SEC labels, start time under it */
function lobbyCdHTML(){const s=M.settings;const d=s.startAt!=null?s.startAt-nowSrv():0;if(s.startAt==null||d<=0)return `<div class="lcdtxt">${esc(lobbyCountdown())}</div>`;
  let x=Math.floor(d/1000);const sec=x%60;x=Math.floor(x/60);const min=x%60;let hr=Math.floor(x/60);let dy=0;if(hr>99){dy=Math.floor(hr/24);hr=hr%24}
  const p2=v=>String(v).padStart(2,'0');const g=(v,l)=>`<span class="cdg"><b>${v}</b><small>${l}</small></span>`;const sep='<span class="cdsep">:</span>';
  return `<div class="cdlbl">${s.startMode==='auto'?'Auto-start in':'Scheduled in'}</div><div class="cdhero" role="timer" aria-label="${esc((s.startMode==='auto'?'Auto-start in ':'Scheduled in ')+F.countdownText(d))}">${dy?g(dy,dy===1?'DAY':'DAYS')+sep:''}${g(p2(hr),'HRS')}${sep}${g(p2(min),'MIN')}${sep}${g(p2(sec),'SEC')}</div><div class="cdwhen small mut" id="cdwhen">${esc(startLocal(s.startAt))}</div>`}
function settingsLine(){const s=M.settings;return [s.type==='snake'?'Snake':'Linear',s.rounds+' teams each',s.clockSecs?s.clockSecs+' sec per pick':'no pick clock',true/* (k) always auto-pick */?'when the clock runs out we pick for you (that one pick only)':'waits when time runs out'].join(' · ')}
function orderListHTML(editable){const o=M.status==='lobby'?F.lobbyOrder(M,joinedMids()):F.effectiveOrder(M,joinedMids());const cm=editable&&commish()&&M.status==='lobby'&&!M.orderLock;const lk=editable&&commish()&&M.status==='lobby';
  return (lk?`<label class="row nw small" id="orderlockrow" style="margin:4px 0 6px;gap:6px"><input type="checkbox" id="orderlock" ${M.orderLock?'checked':''}> <b>Lock order</b> <span class="mut">rows stay put until Start; joiners take only unnamed empty rows</span></label>`:(M.orderLock&&M.status==='lobby'?'<div class="small mut" id="orderlocked">Order locked by the commissioner.</div>':''))+'<div id="orderlist">'+o.map((mid,i)=>{if(F.isEmptyId(mid)){const nm=(M.seatNames||{})[mid]||'';/* s26c16: empty row (nobody joined this seat yet) */return `<div class="mrow emptyrow" data-mid="${esc(mid)}"><span class="no">${i+1}</span><div class="grow" style="min-width:0"><div class="nm mut">Empty seat${nm?' — '+esc(nm):''}</div>${cm?`<div class="row nw" style="margin-top:4px"><input type="text" maxlength="30" class="seatname" id="sn_${esc(mid)}" placeholder="Seat ${esc(i+1)}" value="${esc(nm)}" aria-label="Name for empty seat ${esc(i+1)}"><button class="btn sm" data-a="seatname" data-m="${esc(mid)}">Save</button></div>`:`<div class="tm2">Auto-picked if nobody joins</div>`}</div>${cm?`<button class="btn sm" data-a="om" data-m="${esc(mid)}" data-d="-1" aria-label="Move up">▲</button><button class="btn sm" data-a="om" data-m="${esc(mid)}" data-d="1" aria-label="Move down">▼</button><span class="handle" data-handle="${esc(mid)}" aria-label="Drag to reorder" role="img">⠿</span>`:''}</div>`}const m=mg(mid);const y=meV()&&m.mid===meV();return `<div class="mrow${y?' you':''}" data-mid="${esc(mid)}"><span class="no">${i+1}</span>${UI.avatar(m,32)}<div class="grow" style="min-width:0"><div class="nm">${esc(NT(m))}${y?' '+youTag:(m.mid===myMid()?' <span class="tag mut">you</span>':'')}${S&&S.auto[mid]?' <span class="tag pri autotag">🤖 AUTO</span>':''}${m.cm?' <span class="tag ok">commissioner</span>':''}${m.away?' <span class="tag pri">away</span>':''}</div><div class="tm2">${esc(NB(m))}</div></div>${cm?`<button class="btn sm" data-a="om" data-m="${esc(mid)}" data-d="-1" aria-label="Move up">▲</button><button class="btn sm" data-a="om" data-m="${esc(mid)}" data-d="1" aria-label="Move down">▼</button><span class="handle" data-handle="${esc(mid)}" aria-label="Drag to reorder" role="img">⠿</span>`:''}</div>`}).join('')+'</div>'}
const spinTestHook=()=>{try{return /^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&localStorage.getItem('fbn.spin')==='1'}catch(e){return false}};
function spinBtn(j){if(F.spinCompleted(M))return '';if(!isMock()&&!spinTestHook())return '';/* s26c16 (Paul): no wheel in real leagues; fixed order as listed (code kept; localhost test hook fbn.spin=1 only) */
  /* every result is saved but the order was never applied (apply failed, or the commissioner's page closed during the wait): finish it, never spin a second time */
  if(spinInfo().done)return `<button class="btn pri grow" data-a="spinfinish" id="spinfinish">Finish setting the order</button>`;
  const st=spinState();const lbl=st==='stale'?'Spin again (last spin didn’t finish)':'Spin the wheel';return `<button class="btn grow" data-a="spinopen" id="spinopen" ${full8()?'':'disabled'}>${lbl}</button>`}
function lobbyView(){const s=M.settings;const j=MG;const N=s.managers;const cm=commish();let tl='';
  if(s.startAt!=null){tl=`<div style="margin-top:8px"><b style="color:var(--acc)" id="startsline">Starts ${esc(startLocal(s.startAt))}</b></div>`/* s26c14 (Paul): no grey UTC / commissioner-zone line under the start time */}
  const notIn=!WATCH&&!myMid();
  const orderNote=M.orderSet?'Order set by the commissioner. It can change until the draft starts.':(s.orderMode==='random'?'Random — decided when the draft starts. Shown in join order for now.':'The commissioner sets the order before the draft starts.');
  let h=`<div class="card" id="lobbycard"><span class="lrbtns"><button class="btn sm rulesbtn" data-a="rules" id="rulesbtn_lobby" aria-label="Draft rules">📋 Draft Rules</button>${isMock()?'':`<a class="btn sm rulesbtn lrules" id="leaguerules_lobby" href="${esc(UI.pageUrl('league.html',{l:LID}))}#rules" aria-label="League rules: scoring and season">📖 League Rules</a>`}</span><div class="small mut">LOBBY</div><h2 style="margin:2px 0 2px">${esc(M.name)}</h2><div class="small mut">${esc(settingsLine())}</div>${tl}<div style="margin-top:8px;font-weight:800" id="lobbycd">${lobbyCdHTML()}</div></div>`;
  if(notIn)h+=`<div class="card"><b>You haven't joined this league.</b><div class="row" style="margin-top:8px">${F.freeSlots(M,CL).length?`<a class="btn pri grow" id="joinlink" href="${esc(UI.pageUrl('join.html',{l:LID}))}">Join this league</a>`:'<span class="small mut grow">All spots are taken.</span>'}<button class="btn grow" data-a="switch">I'm already in</button></div></div>`;
  h+=`<div class="card" id="mgrs"><div class="row nw"><h3 class="grow" style="margin:0">Managers <span class="mut" id="joinedct">${j.length} of ${N} joined</span></h3>${cm?'<button class="btn sm" data-a="settings" id="editsettings">League settings</button>':''}</div>${full8()?'':`<div class="small" id="waitmgrs" style="margin:4px 0 0;font-weight:800;color:var(--acc)">${esc(waitTxt())}</div>`}<div class="small mut" style="margin:4px 0 6px">${esc(orderNote)}</div>${orderListHTML(true)}`;
  for(let i=j.length;i<N;i++)h+=`<div class="mrow open"><span class="no">${i+1}</span><span class="av" style="width:32px;height:32px;background:var(--card2);color:var(--mut)">+</span><div class="nm">Open spot</div></div>`;
  h+=`</div>`;
  if(cm){h+=`<div class="card"><h3>Draft order</h3><div class="row">${(isMock()||spinTestHook())?`<button class="btn grow" data-a="randomize" id="randomize" ${j.length<2?'disabled':''}>Randomize</button>`:''}${spinBtn(j)}</div><div class="small mut" style="margin-top:6px">${F.spinCompleted(M)?'The order was set with the wheel. There is only one spin. You can still move people by hand. ':''}Drag a manager by the ⠿ handle, or tap ▲ ▼. The order locks when the draft starts.</div></div>
    <div class="card"><h3>Start</h3><button class="btn pri block" data-a="start" id="startbtn" ${MG.length?'':'disabled'} style="margin-top:6px">Start draft</button><div class="small mut" style="margin-top:6px" id="startnote">${full8()?'Everyone is in.':esc(phTxt())+' if you start now.'}</div></div>`}
  /* s25-full FINAL SPEC (Paul via NCAA): no separate Practice card; Mock Draft is a small link inside the one invite card */
  if(isMock()&&cm&&!full8())h+=`<div class="card" id="botcard"><h3>Fill empty seats with bots</h3><div class="small mut">Every mock has exactly ${F.MANAGERS} seats. Bots take the open ones and pick by themselves.</div><button class="btn pri block" style="margin-top:8px" data-a="fillbots" id="fillbots">Fill ${esc(missing())} empty seat${missing()===1?'':'s'} with bots</button></div>`;
  h+=inviteCard();return h}
function inviteCard(){/* s25-full FINAL SPEC (Paul via NCAA): ONE compact card. Row 1: label + Copy invite link (yellow, flips to Copied!) + Share; row 2: small Mock Draft (new tab); More (commissioner only) */
  const u=UI.pageUrl('join.html',{l:LID});const cm=commish();
  return `<div class="card invc" id="invitecard"><div class="invr1"><b class="invlbl">Invite managers</b><span class="invbtns"><button class="btn sm" data-a="invcopy" data-u="${esc(u)}" id="invcopy">Copy invite link</button><button class="btn sm" data-a="share" id="invshare">Share</button>${isMock()?'':`<a class="btn pri sm invmockb" id="invmock" href="${esc(UI.pageUrl('mock.html',{from:LID}))}" target="_blank" rel="noopener">Mock Draft</a>`}</span></div>`
   +`${cm?'<div class="invr2"><button class="lnkbtn" data-a="invmore" id="invmore" aria-expanded="false" aria-controls="invmorebox">More</button></div>':''}`
   +(cm?`<div class="invmore" id="invmorebox" hidden><button class="btn sm" data-a="copyrem" id="copyrem">Copy reminder message</button><button class="btn sm" data-a="invite" id="showqr">Links &amp; QR</button></div>`:'')+`</div>`}
function reminderMsg(){const s=M.settings;return F.reminderText({name:M.name,startAt:s.startAt,timeLink:UI.pageUrl('time.html',{t:s.startAt||'',n:M.name}),inviteLink:UI.pageUrl('join.html',{l:LID}),rounds:s.rounds,type:s.type,clockSecs:s.clockSecs})}
/* ---- board ---- */
function boardTable(){const cur=F.onClock(S);const O=S.order;const L2=O.length;if(!L2)return'';const mm=myMid();
  let h=`<div class="small mut" style="margin:4px 2px">${S.redraft&&S.redraft.phase==='live'?'Redraft · '+S.realTotal+' pick'+(S.realTotal===1?'':'s')+' (owners who dropped a team pick one for each; others are skipped) · order reverses each round':(S.type==='snake'?'Snake':'Linear')+' draft · '+L2+' managers × '+S.rounds+' rounds = '+S.total+' picks'+(S.type==='snake'?' · order reverses each round':' · same order every round')}</div><div class="bwrap"><table class="board"><thead><tr><th class="rh" scope="col">Rd</th>${O.map(o=>{const m=mg(o);return `<th scope="col" class="${o===mm?'me':''}">${UI.avatar(m,26)}${esc(NT(m))}${S.auto[o]?' <span class="tag pri autotag">🤖 AUTO</span>':''}<span class="tn">${esc(NB(m))}</span></th>`}).join('')}</tr></thead><tbody>`;
  for(let r=0;r<S.rounds;r++){const rev=S.type==='snake'&&r%2;h+=`<tr><td class="rh">${r+1}<br>${S.type==='snake'?(rev?'←':'→'):''}</td>`;
    for(let c=0;c<L2;c++){const n=r*L2+(rev?L2-1-c:c)+1;const p=S.picks[n-1];const isCur=cur&&cur.n===n;const sk=p?!!p.skip:(F.redraftLive(M)&&F.redraftSkip(M,{round:r+1,owner:O[c]}));h+=`<td data-n="${n}" class="${isCur?'cur':''}${p&&p.owner===mm?' mine':''}${sk?' skip':''}"><span class="pn">${n}</span>${sk?'<span class="dim" title="no drop, no pick">–</span>':p?(p.auto?'<span class="au" title="auto-pick">A</span>':'')+lchip(p.tid,{sm:true,abbr:true,lcls:'bcl'}):`<span class="dim">${isCur?'•':'·'}</span>`}</td>`}h+='</tr>'}
  return h+'</tbody></table></div>'}
function whatsNext(){const cd=F.redraftCountdown(Date.now(),TZ);const rl=M.redraft&&M.redraft.phase==='live';
  const l3=rl?(S.status==='complete'?'The Redraft is complete.':'The Redraft is under way.'):'<b>Redraft, '+esc(F.REDRAFT.asOfLabel)+'</b> · '+esc(cd.text)+(cd.state==='past'?'. Open it from the league site.':'. Each owner may drop up to 2 teams first.');
  return `<div class="card" id="nextcard"><h3 style="margin:0 0 4px">What’s next</h3><ol class="nextlist small"><li id="nx1">${esc(F.NEXT.season)}</li><li id="nx2">${esc(F.NEXT.points)}</li><li id="nx3">${l3}</li></ol></div>`}
function inviteWatchCard(){const u=UI.pageUrl('room.html',{l:LID,watch:1});return `<div class="card" id="watchcard"><h3 style="margin:0 0 4px">Invite friends to watch</h3><div class="small mut">Anyone with this link can watch. They cannot pick.</div><div class="row" style="margin-top:8px"><button class="btn pri grow" data-a="shareu" data-u="${esc(u)}" id="sharewatch">Share</button><button class="btn grow" data-a="copy" data-u="${esc(u)}" id="copywatch">Copy link</button></div></div>`}
const homeTip=()=>`<div class="card small" id="hometip"><b>Save to your home screen.</b> iPhone: tap Share, then Add to Home Screen. Android: open the menu, then Install app.</div>`;
/* s25-full (Paul via NCAA): a short, soft, self-made crowd cheer (assets/cheer.mp3, tools/make_cheer.js) plays ONCE per draft when it completes, at volume 0.35.
   Remembered per league + draft epoch so a reload does not replay it; a device-wide mute toggle sits on the Draft complete card; a blocked autoplay fails silently. */
function maybeCheer(){if(!S||!M||S.status!=='complete'||S.endedEarly)return;const last=S.real.length?S.real[S.real.length-1].ts:0;UI.cheerOnce(LID,(M.epoch||1)+(M.redraft&&M.redraft.phase==='live'?'.rd':''),last,nowSrv())}
const cheerBtn=()=>UI.cheerBtn();
/* s26c9 (Paul): the Board's end-of-draft card is merged into the FINAL banner (#finalbanner > #donecard): Export CSV / JSON and Redraft join
   See my team / Draft recap / League site in one wrapping row. The extras (.dcx) and the cheer toggle only show on the Board tab (CSS body[data-tab=board]). */
function dcExtra(){return `<button class="btn dcx" data-a="csv" id="csvbtn">Export CSV</button><button class="btn dcx" data-a="json" id="jsonbtn">Export JSON</button>${S.endedEarly||isMock()?'':`<a class="btn dcx" id="redraftroomlink" href="${esc(UI.pageUrl('redraft.html',{l:LID}))}">Redraft · ${esc(F.REDRAFT.asOfLabel)}</a>`}`}
function completeCard(){return isMock()?'':'<div class="pdbx">'+whatsNext()+inviteWatchCard()+homeTip()+'</div>'}
function viewBoard(){if(!S)return'';if(S.status==='lobby')return lobbyView();return(S.status==='complete'?completeCard():'')+boardTable()}
/* ---- teams ---- */
let WATCHSET=new Set((()=>{try{return JSON.parse(lsGet(L('watch'))||'[]')}catch(e){return[]}})());
const saveWatch=()=>lsSet(L('watch'),JSON.stringify(Array.from(WATCHSET)));
const TF={showPicked:lsGet('showpicked')==='1',q:'',mode:(lsGet('tmode')&&F.TMODES.some(m=>m[0]===lsGet('tmode')))?lsGet('tmode'):'power',hide:lsGet('thide')!=='0',desc:false,watch:false,queue:false,conf:'',confOpen:false};
function viewTeams(s){s=s||'';return `<div class="ctl"><input type="search" id="tq${s}" placeholder="Search team, mascot, conference…" aria-label="Search teams" value="${esc(TF.q)}" autocomplete="off"><label class="sortlbl" for="tmode${s}">Sort &amp; group</label><select id="tmode${s}" class="sortsel" aria-label="Sort and group teams" tabindex="-1">${F.TMODES.map(m=>`<option value="${m[0]}" ${TF.mode===m[0]?'selected':''}>Sort: ${m[1]}</option>`).join('')}</select><div class="cwrap"><div class="pills srt" id="tsort${s}" role="group" aria-label="Sort teams"></div><button type="button" class="qchip" id="tqchip${esc(s)}" data-a="tqueue" aria-pressed="false">Queued</button><button type="button" class="qchip spk" id="tspk${esc(s)}" data-a="tspk" aria-pressed="false">Show picked</button><div class="pills tgl" id="tpills${s}"></div></div><div class="cfs" id="tconf${s}" role="group" aria-label="Filter by conference" hidden></div></div>${s?`<div id="tlist${s}"></div>`:`<div class="tqwrap"><div class="tqmain"><div id="tlist"></div></div><aside class="qpanel" id="qpanel" aria-label="My queue"></aside></div>`}`}
/* s25-full (Paul via NCAA): the queue beside the Teams list: side panel on wide screens, a collapsible "My queue (N)" bar on phones (collapsed by default) */
let QOPEN=false;
/* s26mo3 (Paul, phone): drag a queue row by its grip (pointer events, so touch and mouse; the grip has touch-action:none so the page does not scroll instead) */
let QDRAG=null;
document.addEventListener('pointerdown',e=>{const g=e.target.closest&&e.target.closest('[data-qgrip]');if(!g)return;const row=g.closest('.qrow');const rows=[...document.querySelectorAll('#qpanel .qrow')];if(!row||rows.length<2)return;e.preventDefault();
  try{g.setPointerCapture(e.pointerId)}catch(x){}QDRAG={row,rows,y0:e.clientY,idx:rows.indexOf(row),h:row.getBoundingClientRect().height||48,to:rows.indexOf(row),id:e.pointerId};row.classList.add('qdrag')});
document.addEventListener('pointermove',e=>{const d=QDRAG;if(!d||e.pointerId!==d.id)return;e.preventDefault();const dy=e.clientY-d.y0;d.row.style.transform='translateY('+dy+'px)';d.to=Math.max(0,Math.min(d.rows.length-1,d.idx+Math.round(dy/d.h)))},{passive:false});
const qdEnd=e=>{const d=QDRAG;if(!d||(e&&e.pointerId!==d.id))return;QDRAG=null;d.row.style.transform='';d.row.classList.remove('qdrag');const mm=myMid();
  if(d.to===d.idx||!mm){renderQPanel();return}const tid=d.row.dataset.t;const want=d.rows.map(r=>r.dataset.t);want.splice(d.idx,1);want.splice(d.to,0,tid);
  mutatePref(mm,cur=>{const q=(cur.queue||[]).map(String);const rest=q.filter(t=>want.indexOf(t)<0);cur.queue=want.filter(t=>q.indexOf(t)>=0).concat(rest);return cur},()=>true).then(r=>{if(!r.ok)toast(r.msg)});renderQPanel()};
document.addEventListener('pointerup',qdEnd);document.addEventListener('pointercancel',qdEnd);
function renderQPanel(){const P=$('qpanel');if(!P||!S||QDRAG)return;const mm=myMid();if(!mm||isSpec()){P.hidden=true;return}P.hidden=false;const tk=F.takenMap(S);const q=((S.queues&&S.queues[mm])||[]).filter(t=>!tk[t]);
  const rows=q.length?q.map((t,i)=>`<div class="qrow" data-t="${esc(t)}"><span class="qgrip" data-qgrip="${esc(t)}" title="Drag to reorder" aria-hidden="true">⠿</span><span class="qn">${i+1}</span><span class="qtm">${chip(t)}</span><button class="btn sm qb" data-a="qm" data-t="${esc(t)}" data-d="-1" aria-label="${esc('Move '+tn(t)+' up')}" ${i===0?'disabled':''}>▲</button><button class="btn sm qb" data-a="qm" data-t="${esc(t)}" data-d="1" aria-label="${esc('Move '+tn(t)+' down')}" ${i===q.length-1?'disabled':''}>▼</button><button class="btn sm bad qb" data-a="qrm" data-t="${esc(t)}" aria-label="${esc('Remove '+tn(t)+' from your queue')}">✕</button></div>`).join(''):'<div class="mut small">Empty. Tap Q+ on a team to add it.</div>';
  const wide=window.innerWidth>=900;const open=wide||QOPEN;
  const anc=keepAnchor($('tlist'));patchHTML(P,`${wide?`<h3 id="qbar">My queue (${q.length})</h3>`:`<button class="qbar" id="qbar" data-a="qbar" aria-expanded="${open}" aria-controls="qbody">My queue (${q.length}) <span aria-hidden="true">${open?'▴':'▾'}</span></button>`}<div id="qbody" ${open?'':'hidden'}><div class="small mut" id="qhelp">Time runs out? We pick for you: your queue first, then best available.</div>${rows}</div>`);anc()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&TF.confOpen){TF.confOpen=false;updateTeams();const b=$('tconfbtn');if(b)b.focus({preventScroll:true})}});
function modeNote(){const m=TF.mode;const n=Object.values(META).filter(x=>x.p).length;
  if(m==='power')return 'STOOPID rank is our model of expected STOOPIDS points; '+n+' teams are ranked, the rest show –.';if(m==='kenpom')return 'Power rank is the overall rank from '+F.RANK_SRC+' (all 365 teams). Auto-pick uses it after your queue.';if(m==='tiers')return 'Tiers from STOOPID rank: Elite 1–12 · Solid 13–30 · Sleeper 31+ · Unranked.';
  if(m==='seed')return 'Projected 2027 tournament seed (an estimate, not official). — means not modeled.';if(m==='record')return 'Last season’s final overall record (ESPN standings). Best win % first.';if(m==='conf')return 'Conference for 2026-27 (ESPN standings).';return ''}
const SORTCH=[['power','STOOPID rank'],['kenpom','Power rank'],['record','Win %'],['alpha','A–Z'],['conf','Conference'],['seed','Proj. seed'],['tiers','Tiers']].filter(m=>F.TMODES.some(x=>x[0]===m[0]));
let CONFS=null;const confList=()=>{if(!CONFS){const n={};POOL.forEach(t=>{const c=META[t]&&META[t].c;if(c)n[c]=(n[c]||0)+1});CONFS=Object.keys(n).sort((a,b)=>n[b]-n[a]||a.localeCompare(b))}return CONFS};
/* s25-full Teams scroll fix: live updates patch the list in place (only rows whose markup changed are swapped), never replace the whole list mid-scroll */
function patchHTML(el,html){if(!el||el._ph===html)return;el._ph=html;const t=document.createElement('div');t.innerHTML=html;morphKids(el,t,0)}
function morphKids(a,b,d){const an=a.childNodes,bn=b.childNodes;const same=an.length===bn.length&&[...an].every((n,i)=>n.nodeType===1&&bn[i].nodeType===1&&n.tagName===bn[i].tagName);
  if(!same){a.replaceChildren(...bn);return}
  for(let i=bn.length-1;i>=0;i--){const x=an[i],y=bn[i];if(x.outerHTML===y.outerHTML)continue;
    const attrsSame=x.attributes.length===y.attributes.length&&[...y.attributes].every(at=>x.getAttribute(at.name)===at.value);
    if(d<3&&attrsSame&&x.children.length&&x.children.length===y.children.length&&document.activeElement!==x)morphKids(x,y,d+1);else x.replaceWith(y)}}
/* s25-full: when a picked row disappears above the viewport, keep what the user is looking at steady (iOS has no CSS scroll anchoring) */
/* s25-full QA (qa-2): a drafted row removed ABOVE the screen must not move the page or scrollY. Instead of scrolling, an empty spacer above the list takes
   up the removed height; it is folded away (with an equal scroll, so nothing moves) only when the user scrolls it into view. */
function tSpacer(L,d){if(!L||!L.parentNode)return false;let p=L.parentElement;while(p&&p!==document.body){const o=getComputedStyle(p).overflowY;if((o==='auto'||o==='scroll')&&p.scrollHeight>p.clientHeight+1)return false;p=p.parentElement}
  let sp=L.previousElementSibling;if(!sp||!sp.classList.contains('tspacer')){if(d>0)return false;sp=document.createElement('div');sp.className='tspacer';sp.setAttribute('aria-hidden','true');sp.style.height='0px';L.parentNode.insertBefore(sp,L)}
  const h=parseFloat(sp.style.height)||0;const nh=h-d;if(nh<0){sp.style.height='0px';window.scrollBy(0,-nh);return true}
  if(sp.getBoundingClientRect().top+nh>0&&d<0)return false;/* the gap would show on screen: scroll instead */
  sp.style.height=nh+'px';return true}
addEventListener('scroll',()=>{const sp=document.querySelector('.tspacer');if(!sp)return;const h=parseFloat(sp.style.height)||0;if(!h)return;const b=sp.getBoundingClientRect();if(b.bottom>-40){sp.style.height='0px';window.scrollBy(0,-h)}},{passive:true});
function keepAnchor(L){if(!L||L.offsetParent===null)return()=>{};const rows=[...L.querySelectorAll('[data-k]')];
  /* s25-full: anchor what the user is looking at: the first visible row (under the sticky filter row) in EACH column (the Teams list is a 2-column grid at 1280,
     where removing a picked team above moves later cards by one slot, i.e. half a row on average). The scroll fix is the mean shift of those anchors. */
  const top0=(()=>{const c=L.closest('.tqwrap')||L;let t=0;const h=document.querySelector('.ctl');if(h){const hb=h.getBoundingClientRect();if(hb.top<=1)t=hb.bottom}return Math.max(0,t)})(),byCol=new Map();for(const r of rows){const b=r.getBoundingClientRect();if(b.bottom<=top0+4||b.top>=innerHeight||!b.width)continue;const c=Math.round(b.left);const dd=Math.abs(b.top-top0);/* the first row the user sees under the sticky filter row, in each column */const o=byCol.get(c);if(!o||dd<o.dd)byCol.set(c,{r,dd})}
  const A=[...byCol.values()].map(({r})=>{const idx=rows.indexOf(r);return{next:rows.slice(idx,idx+8).map(x=>[x.dataset.k,x.getBoundingClientRect().top])}});/* each candidate keeps its own top: if the anchor row itself is the one drafted, the next surviving row is restored to where IT was */if(!A.length)return()=>{};
  return()=>{const ds=[];for(const a of A){let el=null,y0=0;for(const [kk,t] of a.next){el=L.querySelector('[data-k="'+CSS.escape(kk)+'"]');if(el){y0=t;break}}if(el)ds.push(el.getBoundingClientRect().top-y0)}if(!ds.length)return;
    const d=Math.round(ds.reduce((x,y)=>x+y,0)/ds.length);if(Math.abs(d)>=1&&tSpacer(L,d))return;if(Math.abs(d)>=1){let p=L;while(p&&p!==document.body){const o=getComputedStyle(p).overflowY;if((o==='auto'||o==='scroll')&&p.scrollHeight>p.clientHeight+1){p.scrollTop+=d;return}p=p.parentElement}window.scrollBy(0,d)}}}
const updateTeams=()=>{['','P'].forEach(updateTeamsIn);renderQPanel()};
function updateTeamsIn(sfx){const pills=$('tpills'+sfx);if(!pills)return;const qi=$('tq'+sfx);if(qi&&qi.value!==TF.q&&document.activeElement!==qi)qi.value=TF.q;const ms=$('tmode'+sfx);if(ms&&ms.value!==TF.mode)ms.value=TF.mode;
  {const sc=$('tspk'+sfx);if(sc){sc.classList.toggle('on',!!TF.showPicked);sc.setAttribute('aria-pressed',TF.showPicked?'true':'false')}}{const qc=$('tqchip'+sfx);if(qc){qc.classList.toggle('on',!!TF.queue);qc.setAttribute('aria-pressed',TF.queue?'true':'false')}}/* s25-full: Queued is a small filter chip, not a tab */
  patchHTML(pills,`<button class="${esc(TF.conf?'on':'')}" data-a="tconfopen" id="tconfbtn${esc(sfx)}" aria-expanded="${esc(TF.confOpen?'true':'false')}" aria-controls="tconf${esc(sfx)}">${esc(TF.conf?TF.conf:'All conf.')} ▾</button>`);
  const so=$('tsort'+sfx);if(so)patchHTML(so,SORTCH.map(m=>`<button class="${esc(TF.mode===m[0]?'on':'')}" data-a="tsort" data-m="${esc(m[0])}" aria-pressed="${esc(TF.mode===m[0]?'true':'false')}">${esc(m[1])}${TF.mode===m[0]&&TF.desc&&(m[0]==='power'||m[0]==='kenpom')?' ↓':''}</button>`).join(''));
  const cf=$('tconf'+sfx);if(cf){cf.hidden=!TF.confOpen}if(cf)cf.innerHTML=`<button class="${esc(TF.conf?'':'on')}" data-a="tconf" data-c="" aria-pressed="${esc(TF.conf?'false':'true')}">All conf.</button>`+confList().map(c=>`<button class="${esc(TF.conf===c?'on':'')}" data-a="tconf" data-c="${esc(c)}" aria-pressed="${esc(TF.conf===c?'true':'false')}">${esc(c)}</button>`).join('');
  if(!S){$('tlist'+sfx).innerHTML='';return}
  const mm=myMid();const taken=F.takenMap(S);const q=((S.queues&&S.queues[mm])||[]);
  const groups0=F.teamView({teams:TEAMS,meta:META,pool:POOL,taken,watch:new Set()/* s25-full: no stars any more; old saved stars are ignored */,q:TF.q,mode:TF.mode,hideDrafted:!TF.showPicked/* s26mo3: 'Show picked' (off by default) lists them greyed out with the manager's name; */ /* s25-full: picked teams are always removed from every available list (search included) */,onlyWatch:false,onlyQueue:TF.queue,queue:q,desc:TF.desc});
  const groups=groups0.map(g=>Object.assign({},g,{tids:TF.conf?g.tids.filter(t=>(META[t]||{}).c===TF.conf):g.tids})).filter(g=>g.tids.length);
  const can=canPick();const s=F.onClock(S);
  const head=can&&s?`<div class="card" style="margin:6px 0;border-color:var(--acc)">${s.owner===mm?"It's <b>your</b> pick — tap a team name to draft it.":'Commissioner: picking for <b>'+esc(NT(mg(s.owner)))+'</b>.'}</div>`:(!isSpec()?'':`<div class="small mut" style="margin:6px 2px">Spectating. These are the teams still available; picked teams are on the Board.</div>`);
  const total=groups.reduce((a,g)=>a+g.tids.length,0);
  const emptyMsg=()=>(TF.watch&&!WATCHSET.size)?'No starred teams yet. Tap the ☆ next to a team to save it here.':(TF.queue&&!q.length)?'Your queue is empty. Tap Q+ next to a team to add it.':'No available teams match. (Teams already picked are not listed; see the Board.)';
  const row=t=>{const x=TEAMS[t],tk=taken[t],m=META[t]||{};const inq=q.indexOf(t)>=0,w=WATCHSET.has(t);
    const seedv=TF.mode==='seed'?F.rowValue('seed',t,META):'';
    const l2=tk?'<span class="dr">✔ '+esc(NT(mg(tk.owner)))+(tk.kept?' (kept)':' #'+tk.n)+'</span>':esc([m.c||'',seedv&&seedv!=='—'?'proj. '+seedv:''].filter(Boolean).join(' · '));
    return `<div class="trow${tk?' taken':''}${can&&!tk?' go':''}" data-k="${esc(t)}" ${can&&!tk?`data-t="${esc(t)}"`:''}><span class="rkb rk2"><b class="rks" title="STOOPID rank"><small>S</small>${m.p?'#'+m.p:'–'}</b><b class="rko" title="${esc('Power rank ('+F.RANK_SRC+')')}"><small>P</small>${m.o?'#'+m.o:'–'}</b></span>${/* s25-full (Paul via NCAA): no ESPN link or icon in draft-room team rows; the name/row is the tap target */(can&&!tk?`<button type="button" class="tm dbtn" data-a="draftrow" data-t="${esc(t)}" aria-label="${esc('Draft '+x.name)}">`:'<span class="tm">')+chip(t,{wrap:1})+'<small class="cf">'+l2+'</small>'+(can&&!tk?'</button>':'</span>')/* s26c15 (Paul 'no need for another draft box'): on your turn the name pill IS the Draft action (same draftrow -> confirm path); off turn unchanged */}<div class="tr"><b class="rec">${esc(m.r||'—')}</b><small>2025-26</small></div>${tk||isSpec()?'':`<span class="tbtns">${isSpec()?'':`<button type="button" class="qbtn${inq?' on':''}" data-a="q" data-t="${esc(t)}" aria-label="${esc(inq?'Remove '+x.name+' from your queue':'Queue '+x.name)}"><b>${inq?'Q✓':'Q+'}</b><small>${inq?'Queued':'Queue'}</small></button>`}</span>`}</div>`};/* s26c14 (Paul, safety): the row never drafts; only its own Draft button does (same draftrow -> confirm path). Bigger Queue button, kept apart from Draft */
  const TL=$('tlist'+sfx),anc=keepAnchor(TL);patchHTML(TL,head+`<div class="tnote" id="tlegend${esc(sfx)}">S = STOOPID rank · P = Power rank (${esc(F.RANK_SRC)}) · record = last season</div>${TF.conf?'<div class="tnote2">Showing '+esc(TF.conf)+' only.</div>':''}`+(groups.map(g=>(g.flat?'':`<div class="grp"><span>${esc(g.label)}</span><small>${g.note?esc(g.note)+' · ':''}${g.tids.length} team${g.tids.length===1?'':'s'}</small></div>`)+'<div class="tgrid">'+g.tids.map(row).join('')+'</div>').join('')||'<div class="card mut" id="tempty">'+emptyMsg()+'</div>')+`<div class="small mut" style="margin:6px 2px">${total} team${total===1?'':'s'} shown</div>`);anc()}
function openPick(){if(!canPick()){toast('It is not your pick right now.');return}let el=$('pickov'),fresh=false;if(!el){fresh=true;el=document.createElement('div');el.id='pickov';
    /* Escape closes only the team list; nothing is lost (a pick is only made on the confirm sheet, and an in-flight save is never interrupted) */
    el._esc=()=>{if(!busy)closePick()};document.body.appendChild(el)}
  const s=F.onClock(S);el.dataset.n=s.n;/* s25-full: a re-render keeps the pop-up list where it was (and the search text) */const pst=fresh?0:el.scrollTop,pbst=fresh?0:((el.querySelector('.pbox')||{}).scrollTop||0),pq0=fresh?'':(($('tqP')||{}).value||'');el.innerHTML=`<div class="pbox"><div class="phead"><div><b>${s.owner===myMid()?"You're on the clock":'Picking for '+esc(NT(mg(s.owner)))}</b><small>Pick #${s.n} · Round ${s.round}</small></div><span class="pcd" id="pcd" aria-live="off"${pcdTxt()?'':' hidden'}>${esc(pcdTxt())}</span><button class="btn sm" data-a="pclose">Close</button></div>${viewTeams('P')}</div>`;if(pq0&&$('tqP'))$('tqP').value=pq0;updateTeams();if(!fresh){el.scrollTop=pst;const pb=el.querySelector('.pbox');if(pb)pb.scrollTop=pbst}{const ph=el.querySelector('.phead');if(ph)el.style.setProperty('--pheadh',ph.offsetHeight+'px')}/* s28: the team filter bar sticks just under the pinned header */if(fresh)UI.dialogIn(el,'Pick a team')}
/* s28 item 1: live pick countdown in the 'Pick a team' header ('Paused' when paused, hidden with no clock); the header is sticky (css) */
function pcdTxt(){if(!S||S.status!=='live')return '';if(S.paused)return 'Paused';if(!S.clockSecs)return '';const r=remaining();return r==null?'':(r<=0?'0:00':UI.fmtClock(r))}
function tickPcd(){const e=$('pcd');if(!e)return;const t=pcdTxt();if(e.textContent!==t)e.textContent=t;e.hidden=!t;const r=S&&!S.paused&&S.clockSecs?remaining():null;e.classList.toggle('low',r!=null&&r<10000);e.classList.toggle('paused',!!(S&&S.paused))}
function closePick(){const el=$('pickov');if(el){UI.dialogOut(el);el.remove()}}
function confirmDraft(tid){if(!S||!canPick())return;const s=F.onClock(S);if(!s)return;const taken=F.takenMap(S);if(taken[tid]){toast('Already taken by '+mg(taken[tid].owner).name);return}
  const x=TEAMS[tid],r=prankOf(tid);const onBehalf=s.owner!==myMid();
  UI.openSheet(`<h2>Draft ${esc(x.name)}?</h2><div style="margin:8px 0">${lchip(tid,{big:true})}</div><div class="small mut">Pick #${s.n} · Round ${s.round}${' · STOOPID rank '+(r?'#'+r:'–')+' · Power rank '+((META[tid]||{}).o?'#'+META[tid].o:'–')}</div>${onBehalf?`<div class="alertbar" style="margin-top:8px">Commissioner pick on behalf of <b>${esc(NT(mg(s.owner)))}</b>${TEAM_NAME_ON_TOP&&NB(mg(s.owner))?' ('+esc(NB(mg(s.owner)))+')':''}</div>`:''}<div class="row" style="margin-top:14px"><button class="btn pri grow" style="padding:12px" data-a="confirm" data-t="${esc(tid)}" data-o="${esc(s.owner)}" id="confirmpick">Draft it</button><button class="btn grow" style="padding:12px" data-a="sheetbg">Cancel</button></div>`);/* s25-full (Paul): the confirm box is a centred modal, slightly bigger than the old bottom sheet */{const bg=document.querySelector('#sheetwrap .sheetbg');if(bg)bg.classList.add('cmodal')}}
/* ---- my team ---- */
function viewMy(){if(!S)return'';const O=S.status==='lobby'?joinedMids():S.order;const mm=myMid();const who=viewOwner&&O.indexOf(viewOwner)>=0?viewOwner:(mm||O[0]);
  if(!who)return'<div class="card mut">No managers yet.</div>';const o=mg(who);const mine=(S.roster||S.real).filter(p=>p.owner===who);const isMe=!isSpec()&&who===mm;
  const vm=meV();const OD=vm&&O.indexOf(vm)>0?[vm].concat(O.filter(x=>x!==vm)):O;/* s26c9: display copy only, the viewer's chip first */
  let h=`<div class="opills">${OD.map(n=>`<button class="${n===who?'on':''}${vm&&n===vm?' you':''}" data-a="vo" data-m="${esc(n)}">${UI.avatar(mg(n),24)}${esc(mg(n).name)}${vm&&n===vm?youTag:(n===mm?' (you)':'')}</button>`).join('')}</div>`;
  const yv=meV()&&who===meV();h+=`<div class="card myhead${yv?' you':''}" id="myhead"><div class="row nw">${UI.avatar(o,60)}<div class="grow" style="min-width:0"><h3 class="mhteam" style="margin:0">${esc(o.team)}${yv?' '+youTag:''}</h3><div class="mut small"><span class="mhname">${esc(o.name)}</span> · ${mine.length}/${M.redraft&&M.redraft.phase==='live'?M.redraft.rounds0:M.settings.rounds} teams${S.status==='live'?' · '+(F.picksAway(S,who)===0?'<b style="color:var(--acc)">on the clock now</b>':F.picksAway(S,who)==null?'no picks left':'next pick #'+F.nextPickNo(S,who)+' · '+F.picksAway(S,who)+' away'):''}</div></div></div></div>`;
  h+=mine.length?mine.map(p=>{const note=M.notes?F.pickNote(p.n,prankOf(p.tid)):null;return `<div class="trow"><span class="qn">${p.kept?'•':p.round}</span>${UI.teamLink(TEAMS[p.tid],chip(p.tid,{big:true})+'<small>'+(p.kept?'Kept from the first draft':'Pick #'+p.n+(p.auto?' · auto-pick':''))+' · '+esc(TEAMS[p.tid].mascot||'')+'</small>','tm')}${note?`<span class="tag2 ${note}">${note.toUpperCase()}</span>`:''}</div>`}).join(''):'<div class="card mut">No picks yet.</div>';
  if(S.status!=='complete'&&!WATCH&&F.canSetAuto(isSpec()?null:mm,commish(),who)){const au=!!S.auto[who];h+=`<div class="card" id="autodcard"><label class="sw"><input type="checkbox" data-a="autodraft" data-m="${esc(who)}" id="autodraft" ${au?'checked':''}> 🤖 Auto-draft ${isMe?'me':esc(o.name)}</label><div class="small mut" style="margin-top:4px">Can't make it? When ${isMe?'you are':'they are'} on the clock we pick in about 2 s: ${isMe?'your':'their'} queue first, then best available. Turn it off any time.</div></div>`}/* s26c8b */
  if(isMe){const q=((S.queues&&S.queues[mm])||[]).filter(t=>!F.takenMap(S)[t]);const au=!!S.auto[mm];
    h+=`<div class="card"><h3>My pick queue</h3><div class="small mut" id="queuehow" style="margin:6px 0">Time runs out? We pick for you: your queue first, then best available.</div>`;
    h+=q.length?q.map((t,i)=>`<div class="qrow"><span class="qn">${i+1}</span>${lchip(t)}<span style="flex:1"></span><button class="btn sm" data-a="qm" data-t="${esc(t)}" data-d="-1">▲</button><button class="btn sm" data-a="qm" data-t="${esc(t)}" data-d="1">▼</button><button class="btn sm bad" data-a="q" data-t="${esc(t)}">✕</button></div>`).join(''):'<div class="mut small">Queue is empty — falls back to the best KenPom rank.</div>';h+='</div>'}
  /* s26c16 (NCAA): the commissioner (tools unlocked) viewing ANOTHER manager (real or placeholder) sees and edits that manager's queue (their own pref key); other devices unchanged */
  if(!isMe&&commish()&&S.status!=='complete'&&!WATCH){cmPrefPoll(who);const tk=F.takenMap(S);const q=((S.queues&&S.queues[who])||[]).filter(t=>!tk[t]);
    h+=`<div class="card" id="cmqueue"><h3>${esc(o.name)}'s queue</h3><div class="small mut" style="margin:6px 0">Commissioner view. Time runs out? Auto-pick takes this queue first, then the best KenPom rank.</div>`;
    h+=q.length?q.map((t,i)=>`<div class="qrow cmqrow" data-t="${esc(t)}"><span class="qn">${i+1}</span>${lchip(t)}<span style="flex:1"></span><button class="btn sm" data-a="cqm" data-m="${esc(who)}" data-t="${esc(t)}" data-d="-1" aria-label="Move up">▲</button><button class="btn sm" data-a="cqm" data-m="${esc(who)}" data-t="${esc(t)}" data-d="1" aria-label="Move down">▼</button><button class="btn sm" data-a="cqrm" data-m="${esc(who)}" data-t="${esc(t)}" aria-label="Remove">✕</button></div>`).join(''):'<div class="small mut">Empty.</div>';
    h+=`<button class="btn block" style="margin-top:8px" data-a="mgr" data-m="${esc(who)}" id="cqadd">Add to ${esc(o.name)}'s queue</button></div>`}
  return h}
const CMPQ={};function cmPrefPoll(mid){const t=Date.now();if(CMPQ[mid]&&t-CMPQ[mid]<5000)return;CMPQ[mid]=t;readPref(mid).then(ch=>{if(ch)rebuild(true)}).catch(()=>{})}
/* ---- chat ---- */
function viewChat(){return `<div class="seg"><button data-a="csub" data-v="chat" class="${chatSub==='chat'?'on':''}">Chat</button><button data-a="csub" data-v="picks" class="${chatSub==='picks'?'on':''}">Pick feed</button></div><div id="chatbody"></div>${chatSub==='chat'?(isSpec()?'<div class="card mut small">Spectators can read. Managers can chat and react.</div>':`<div class="chatbox"><input type="text" id="cin" maxlength="280" placeholder="Message the league…" aria-label="Message the league" enterkeyhint="send" autocomplete="off"><button class="btn pri" data-a="send">Send</button></div>`):''}`}
const REACTS=F.REACTS;
function updateChatView(){const el=$('chatbody');if(!el||tab!=='chat')return;
  if(chatSub==='chat'){const near=(document.documentElement.scrollHeight-window.scrollY-window.innerHeight)<=40;/* s25-full QA: only a user already AT the bottom follows new messages */chatNearBottom=near;const mm=myMid();
    const h=C.msgs.map(m=>{const w=mg(m.who);const rx=Object.keys(m.r||{}).map(e=>`<button class="${(m.r[e]||[]).includes(mm)?'on':''}" data-a="rx" data-id="${esc(m.id)}" data-e="${esc(e)}">${e} ${m.r[e].length}</button>`).join('');
      return `<div class="msg${m.who===mm?' mine':''}"><div class="who">${UI.avatar(w,18)}${esc(NT(w))}${TEAM_NAME_ON_TOP&&w.name?` <span class="mut small">${esc(w.name)}</span>`:''} <span class="mut" style="font-weight:600">${F.fmtClock(m.ts,TZ)}</span></div><div class="tx">${esc(m.text)}</div><div class="rx">${rx}${isSpec()?'':(reactOpen===m.id?REACTS.map(e=>`<button data-a="rx" data-id="${esc(m.id)}" data-e="${esc(e)}">${e}</button>`).join(''):`<button data-a="ropen" data-id="${esc(m.id)}">＋</button>`)}</div></div>`}).join('');
    el.innerHTML=h||'<div class="card mut">No messages yet. (Picks are not mixed in here — see the Pick feed tab.)</div>';if(near)window.scrollTo(0,document.documentElement.scrollHeight)}
  else{if(!S){el.innerHTML='';return}
    el.innerHTML=S.real.length?S.real.slice().reverse().map(p=>{const m=mg(p.owner);const note=M.notes?F.pickNote(p.n,prankOf(p.tid)):null;return `<div class="card" style="padding:9px 11px"><div class="row nw"><b style="color:var(--acc);min-width:34px">#${p.n}</b>${UI.avatar(m,26)}<div class="grow" style="min-width:0"><b>${esc(m.name)}</b> <span class="small mut">R${p.round}</span></div>${p.auto?'<span class="tag2 auto">AUTO</span>':''}${note?`<span class="tag2 ${note}">${note.toUpperCase()}</span>`:''}</div><div style="margin-top:2px">${lchip(p.tid)}</div></div>`}).join(''):'<div class="card mut">No picks yet.</div>'}}
/* ---- more (admin) ---- */
function linksBlock(){const pd=!!(S&&S.status==='complete');const L1=UI.pageUrl('join.html',{l:LID}),L2=UI.pageUrl('room.html',{l:LID}),L3=UI.pageUrl('room.html',{l:LID,watch:1});
  /* s26c9 (Paul): post-draft More is compact: short label rows (Invite link / Room link / Spectator link) with Copy + Share; Copy still copies the full URL. Pre-draft / in-draft rows unchanged. */
  if(pd)return `<div class="card lcompact pd" id="linkscard"><div class="pdhead"><h3>Links</h3><span class="small mut">League code <b class="code">${esc(F.formatCode(LID))}</b></span></div>
  ${[['Invite link',L1,'invite'],['Room link',L2,'room'],['Spectator link',L3,'watch']].map(x=>`<div class="lrow pdrow" id="pdl_${esc(x[2])}"><span class="pdlbl" title="${esc(x[1])}">${x[0]}</span><button class="btn sm" data-a="copy" data-u="${esc(x[1])}" aria-label="Copy ${esc(x[0].toLowerCase())}">Copy</button><button class="btn sm" data-a="pdshare" data-u="${esc(x[1])}" aria-label="Share ${esc(x[0].toLowerCase())}">Share</button></div>`).join('')}
  <div class="lextra"><button class="btn sm" data-a="invite">Show invite QR</button><button class="btn sm" data-a="copyrem" title="Copy reminder message">Copy reminder</button></div></div>`;
  return `<div class="card lcompact" id="linkscard"><h3>Links</h3> <div class="small mut">League code <b class="code" style="font-size:16px">${esc(F.formatCode(LID))}</b></div>
  ${[['Invite link',L1],['Draft room',L2],['Spectator (read-only)',L3]].map(x=>`<div class="lk small mut">${x[0]}</div><div class="lrow"><div class="urlbox">${esc(x[1])}</div><button class="btn sm" data-a="copy" data-u="${esc(x[1])}">Copy</button><button class="btn sm" data-a="shareu" data-u="${esc(x[1])}">Share</button></div>`).join('')}
  <div class="lextra"><button class="btn sm" data-a="invite">Show invite QR</button><button class="btn sm" data-a="copyrem" title="Copy reminder message">Copy reminder</button></div></div>`}
function viewMore(){if(!S)return'';const cm=commish();const mm=myMid();const s=M.settings;let h='';
  if(WATCH)h+=`<div class="card"><b>You're watching.</b><div class="small mut" style="margin-top:4px">Spectators can read the board, picks and chat. <a href="${esc(UI.pageUrl('room.html',{l:LID}))}">Open the room as a manager</a>.</div></div>`;
  else if(mm){const m=mg(mm);h+=`<div class="card ycompact${S.status==='complete'?' pd':''}" id="youcard"><div class="row nw">${UI.avatar(m,46)}<div class="grow"><h3 style="margin:0">${esc(m.team)}</h3><div class="small mut">${esc(m.name)}</div></div></div><div class="pbtns" style="margin-top:10px"><button class="btn sm" data-a="mysettings" id="mysettings" title="Team name &amp; photo">My settings</button><button class="btn sm" data-a="switch" title="Switch who I am">Switch user</button><button class="btn sm" data-a="copymine" id="copymine" title="Copy my private link">Copy my link</button></div><div class="small mut" style="margin-top:6px">Your private link opens this team on another phone. Anyone who has it can act as you.</div></div>`}
  else h+=`<div class="card"><b>You haven't picked who you are.</b><div class="row" style="margin-top:8px"><button class="btn pri" data-a="switch">Who are you?</button></div></div>`;
  if(myMid()&&!WATCH)h+=`<div class="card" id="soundcard"><h3>Alerts</h3><label class="sw"><input type="checkbox" id="beepon" ${beepMuted()?'':'checked'}> Turn sound</label><div class="small mut">3 beeps on this device when your pick comes up, 2 at 30 s left, then 1 beep a second from 10 s and fast beeps in the last 2 s. Only for your own pick; never while paused or with no pick clock. Sound starts after your first tap on the page.</div></div>`;/* s26c16d */
  h+=linksBlock();
  if(false)h+=`<div class="card pd" id="rulescard"><h3>Rules</h3><div class="rlrow"><button class="btn sm" data-a="rules" id="rulesbtn_more" aria-label="Draft rules">📋 Draft Rules</button>${isMock()?'':`<a class="btn sm" id="leaguerules_more" href="${esc(UI.pageUrl('league.html',{l:LID}))}#rules" aria-label="League rules: scoring and season">📖 League Rules</a>`}</div></div>`;/* s26c9 (Paul b): after the draft the Rules buttons live in More, not in the header */
  if(cm)h+=`<div class="card" id="yourlinkscard"><h3>Your links</h3><div class="small mut">Share, copy, download or email every link this phone holds, including your private commissioner link.</div><div class="row" style="margin-top:8px"><button class="btn sm pri" data-a="yourlinks" id="yourlinks">Your links</button></div></div>`;
  h+=`<div class="card"><h3>League</h3><div class="small mut">${esc(settingsLine())}</div>${s.startAt!=null?`<div class="small" style="margin-top:4px">${esc(F.startsLine(s.startAt,TZ,s.tz).you)}</div><div class="small mut">${esc(F.fmtUtc(s.startAt))}</div>`:''}<div style="margin-top:8px"><a id="leaguehome2" class="sitebtn" href="${esc(UI.pageUrl('league.html',{l:LID}))}" ${siteAttr()}>${S.status==='complete'?siteLbl()+'</a>':siteLbl()+'</a> <span class="small mut">— available after the draft</span>'}</div></div>`;
  if(!cm)h+=`<div class="card lockcard" id="lockcard"><h3>Commissioner tools</h3><div class="small mut">Start, pause, undo, order, managers and clock changes need the commissioner link: open it on this phone, or paste it with Unlock. The lock is a friendly one for a friends league, not real security.</div><button class="btn pri" style="margin-top:8px" data-a="unlockui" id="unlockui">Unlock</button></div>`;
  else h+=`<div class="card" id="unlockedcard"><h3>Commissioner tools unlocked</h3>${autoNote()}<div class="small mut">Unlocked on this device only.</div><div class="row" style="margin-top:8px"><button class="btn sm" data-a="lock">Lock now</button></div></div>`+commishTools();
  if(S.real.length)h+=`<div class="card"><h3>Export</h3><div class="row"><button class="btn sm" data-a="csv">CSV</button><button class="btn sm" data-a="json">JSON</button><a class="btn sm" href="${esc(UI.pageUrl('recap.html',{l:LID}))}">Draft recap</a></div></div>`;
  h+=`<div class="small mut" id="devline" style="padding:8px 2px">${POOL.length} teams available · league v${M.version} · round ${S.epoch} · clock: ${esc(srvInfo)} · code …${esc(LID.slice(-4))}</div>`+UI.buildTag();return h}
function commishTools(){const s=M.settings;let h='';
  h+=`<div class="card" id="controls"><h3>Draft controls</h3><div class="row">`+(S.status==='lobby'?`<button class="btn pri" data-a="start" ${MG.length?'':'disabled'}>Start draft</button><button class="btn" data-a="settings">League settings</button>`:'')+
   (S.status==='live'?`<button class="btn" data-a="${S.paused?'resume':'pause'}" id="pausebtn">${S.paused?'Resume':'Pause'}</button>`:'')+(S.real.length&&S.status!=='complete'?`<button class="btn" data-a="undo" id="undobtn">Undo last pick</button>`:'')+
   (S.status==='live'?`<button class="btn bad" data-a="endearly" id="endbtn">End draft early…</button>`:'')+(S.status!=='complete'&&!F.redraftLive(M)&&(S.status==='live'||S.picks.length||M.orderSet)?`<button class="btn bad" data-a="reset" id="resetbtn">Reset draft…</button>`:'')+`</div>${S.status==='complete'?'<div class="small mut" style="margin-top:6px">The draft is complete and locked.</div>':''}</div>`;
  if(S.status!=='complete')h+=`<div class="card" id="clockcard"><h3>Pick clock &amp; missed picks</h3><div class="row"><span class="small mut grow">Time per pick</span><select id="clk">${F.CLOCKS.map(v=>`<option value="${v}" ${s.clockSecs===v?'selected':''}>${v===0?'No clock':v>=120?(v/60)+' min':v+' sec'}</option>`).join('')}</select></div>
   <label class="sw" style="margin-top:10px"><input type="checkbox" id="w15" ${s.warn15?'checked':''}> 15-second warning</label>${true/* (k) always auto-pick */?'<div class="small mut" style="margin-top:8px" id="atimero">When the clock runs out, we pick for you: top of your queue, otherwise the best team left. It only covers that one pick.</div>':'<label class="sw" style="margin-top:8px"><input type="checkbox" id="atime"> Auto-pick when the clock hits 0</label><div class="small mut" id="atimenote">This league waits when the clock runs out (older setting). Once you switch to auto-pick it can\'t be changed back.</div>'}
   <div class="small mut" style="margin-top:6px">Auto-pick uses the manager's queue first, then the best KenPom rank (Power rank), then a random team. It goes through the same one-key-per-pick write as a manual pick, so two phones can never double-pick.</div>
   <label class="sw" style="margin-top:8px"><input type="checkbox" id="notes" ${M.notes?'checked':''}> Show pick notes (value / reach tags)</label></div>`;
  if(S.status!=='complete')h+=`<div class="card" id="mgrcard"><h3>Managers</h3>${MG.map(m=>`<div class="mrow"><span class="dot${(PR.recs[m.mid]&&nowSrv()-PR.recs[m.mid].t<F.PRES.onlineMs)||m.mid===myMid()?' on':''}"></span>${UI.avatar(m,30)}<div class="grow" style="min-width:0"><div class="nm">${esc(NT(m))}${m.away?' <span class="tag pri">away</span>':''}${S.auto[m.mid]?' <span class="tag pri autotag">🤖 AUTO</span>':''}${m.left?' <span class="tag mut">left</span>':''}</div><div class="tm2">${esc(NB(m))}</div></div><button class="btn sm" data-a="mgr" data-m="${esc(m.mid)}">Manage</button></div>`).join('')||'<div class="small mut">Nobody has joined yet.</div>'}</div>`;return h}
/* s26c16: the commissioner edits a placeholder seat's queue (same per-seat pref key K.pref(mid)); auto-pick at clock-out uses it first, then KenPom */
const isPh=mid=>!!(M&&M.over[mid]&&M.over[mid].ph);
function phQueueHTML(mid){const q=(PREF[mid]&&PREF[mid].queue)||[];const tk=S?F.takenMap(S):{};const av=POOL.filter(t=>!tk[t]&&q.indexOf(t)<0).sort((a,b)=>(autoRankOf(a)||1e9)-(autoRankOf(b)||1e9)).slice(0,80);
  return `<div class="card" style="margin:0"><b>${isPh(mid)?'Queue for this empty seat':esc(mg(mid).name)+'\'s queue'}</b><div class="small mut" style="margin:2px 0 6px">Auto-pick takes the first team still available here, then the best KenPom rank.</div>`+(q.length?q.map((t,i)=>`<div class="row nw phqrow" data-t="${esc(t)}"><span class="grow">${esc(i+1)}. ${esc(tn(t))}${tk[t]?' <span class="mut">(taken)</span>':''}</span><button class="btn sm" data-a="phqmv" data-m="${esc(mid)}" data-t="${esc(t)}" data-d="-1" aria-label="Move up">▲</button><button class="btn sm" data-a="phqmv" data-m="${esc(mid)}" data-t="${esc(t)}" data-d="1" aria-label="Move down">▼</button><button class="btn sm" data-a="phqrm" data-m="${esc(mid)}" data-t="${esc(t)}" aria-label="Remove">✕</button></div>`).join(''):'<div class="small mut">Empty.</div>')+
  `<div class="row nw" style="margin-top:6px"><select id="phq_sel" class="grow" aria-label="Team to add">${av.map(t=>`<option value="${esc(t)}">${esc(tn(t))}</option>`).join('')}</select><button class="btn sm" data-a="phqadd" data-m="${esc(mid)}" id="phqadd">Add to queue</button></div></div>`}
/* s28 mock (Paul): manager "My settings" sheet. The manager edits the TOP name (team) and photo / emoji; the BOTTOM name (real name) is
   read-only here, only the commissioner renames it (actRename, More > Manage). Saves to the manager's OWN profile key K.mgr(mid)
   (one writer per key), then re-reads it to confirm, like the per-slot write-and-verify pattern. */
const MS={team:'',emoji:'',photo:'',info:'',img:null,zoom:1,busy:false};
const msWebp=(()=>{try{return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp')===0}catch(e){return false}})();
function openMySettings(){const mid=myMid();if(!mid||WATCH)return;const m=mg(mid);const p=PROF[mid]||{};MS.team=m.team;MS.emoji=p.emoji||'';MS.photo=ALLOW_PHOTO?(p.photo||''):'';MS.info='';MS.img=null;MS.zoom=1;renderMySettings()}
function msAvatar(){const mid=myMid();return Object.assign({},mg(mid),{team:MS.team,emoji:MS.emoji,photo:MS.photo})}
function renderMySettings(){const mid=myMid();const m=mg(mid);const ov=(M.over||{})[mid]||{};
  UI.openSheet(`<div id="mysheet"><h2 style="margin:0 0 2px">My settings</h2><div class="small mut" style="margin-bottom:10px">How you appear on the board, in chat and on the league site.</div>
  <div class="card myhead" id="mspreview" style="margin:0 0 12px"><div class="row nw"><span id="msav">${UI.avatar(msAvatar(),56)}</span><div class="grow" style="min-width:0"><h3 class="mhteam" style="margin:0" id="msteamprev">${esc(F.clean(MS.team)||'Team name')}</h3><div class="mut small">${esc(m.name)}</div></div></div></div>
  <div class="stack">
   <div><label class="f" for="ms_team">Team name <span class="mut" style="font-weight:600">(top name)</span></label><input type="text" id="ms_team" maxlength="30" autocomplete="off" value="${esc(MS.team)}"><div class="err" id="msteamerr" role="alert"></div></div>
   <div id="msnamebox"><label class="f" for="ms_name">Your name <span class="mut" style="font-weight:600">(bottom name)</span></label><input type="text" id="ms_name" value="${esc(m.name)}" readonly aria-readonly="true" tabindex="-1" style="opacity:.65;cursor:not-allowed"><div class="hint" id="msnamenote">🔒 Only the commissioner can change this.</div></div>
   <div id="msavbox"><label class="f">${ALLOW_PHOTO?'Photo or emoji':'Emoji'}</label>
    ${ALLOW_PHOTO?`<div class="photo-prev"><div class="crop" aria-label="Photo preview"><canvas id="mscv" width="264" height="264"></canvas></div>
     <div class="grow"><label class="btn block" for="ms_photo" id="mspick">${MS.photo||MS.img?'Choose another':'Choose a photo'}</label><input type="file" id="ms_photo" accept="image/*" class="hide">
      <div class="hint" id="mspinfo">${esc(MS.info||'Square crop. Resized on your phone to a small picture.')}</div><div class="err" id="msperr" role="alert"></div>
      <div id="mszoomrow" class="${esc(MS.img?'':'hide')}"><label class="small mut" for="mszoom">Zoom</label><input type="range" id="mszoom" min="1" max="3" step="0.02" value="${esc(MS.zoom)}" style="width:100%"></div>
      ${MS.photo?'<button type="button" class="link" data-a="msrmphoto" style="margin-top:4px">Remove photo</button>':''}</div></div>
    <div class="small mut" style="margin-top:8px">No photo? Pick an emoji, or we use your initial:</div>`:'<div class="small mut" id="msemojionly">Pick an emoji, or we use your initial:</div>'}
    <div class="emojis" role="group" aria-label="Emoji avatar">${F.EMOJIS.map(e=>`<button type="button" data-a="msemoji" data-e="${esc(e)}" class="${esc(MS.emoji===e?'on':'')}" aria-label="${esc(e)}">${e}</button>`).join('')}</div></div>
  </div><div class="hint" style="margin-top:8px">Your team name ${ALLOW_PHOTO?'and photo are':'and emoji are'} saved in a shared online store. Anyone who has the league link can read them.</div><div class="err" id="mserr" role="alert"></div>
  <div class="row" style="margin-top:10px"><button class="btn pri grow" style="padding:12px" data-a="mssave" id="mssave">Save</button><button class="btn grow" style="padding:12px" data-a="sheetbg">Cancel</button></div></div>`);msDraw()}
function msDraw(){const cv=$('mscv');if(!cv)return;const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);
  if(MS.img){const r=F.cropRect(MS.img.width,MS.img.height,MS.zoom,0,0);x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);x.drawImage(MS.img,r.sx,r.sy,r.side,r.side,0,0,cv.width,cv.height);return}
  if(MS.photo){const im=new Image();im.onload=()=>x.drawImage(im,0,0,cv.width,cv.height);im.src=MS.photo;return}
  const a=F.avatarSpec(msAvatar());x.fillStyle=a.color;x.fillRect(0,0,cv.width,cv.height);x.fillStyle='#111';x.font='900 120px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(a.text||'?',cv.width/2,cv.height/2+6)}
function msPreview(){const a=$('msav');if(a)a.innerHTML=UI.avatar(msAvatar(),56);const t=$('msteamprev');if(t)t.textContent=F.clean(MS.team)||'Team name'}
async function msShrink(){if(!MS.img)return;const res=await F.fitPhoto(async(edge,q)=>{const c=document.createElement('canvas');c.width=c.height=edge;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,edge,edge);const r=F.cropRect(MS.img.width,MS.img.height,MS.zoom,0,0);x.drawImage(MS.img,r.sx,r.sy,r.side,r.side,0,0,edge,edge);return c.toDataURL(msWebp?'image/webp':'image/jpeg',q)});
  if(!res){MS.photo='';MS.info='Could not shrink that photo enough. Try a different one.'}else{MS.photo=res.dataUrl;MS.info='Ready: '+res.edge+'×'+res.edge+' px, '+(res.bytes/1024).toFixed(1)+' KB'}const pi=$('mspinfo');if(pi)pi.textContent=MS.info;msPreview()}
let msT=null;
document.addEventListener('change',async e=>{if(e.target.id!=='ms_photo')return;const f=e.target.files&&e.target.files[0];if(!f)return;
  try{$('msperr').textContent='';MS.img=window.createImageBitmap?await createImageBitmap(f,{imageOrientation:'from-image'}):await new Promise((res,rej)=>{const u=URL.createObjectURL(f);const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('That file is not an image we can read.'));im.src=u});
    MS.zoom=1;MS.emoji='';$('mszoomrow').classList.remove('hide');$('mszoom').value=1;document.querySelectorAll('#mysheet .emojis button').forEach(b=>b.classList.remove('on'));msDraw();$('mspinfo').textContent='Shrinking…';await msShrink();$('mspick').textContent='Choose another'}catch(err){$('msperr').textContent='That file is not an image we can read.'}});
document.addEventListener('input',e=>{if(e.target.id==='ms_team'){MS.team=e.target.value;{const te=$('msteamerr');if(te)te.textContent=''}msPreview();if(!MS.img&&!MS.photo)msDraw()}if(e.target.id==='mszoom'){MS.zoom=+e.target.value;msDraw();clearTimeout(msT);msT=setTimeout(msShrink,200)}});
async function saveMySettings(){if(MS.busy)return;const mid=myMid();if(!mid)return;const t=F.clean(MS.team);const er=$('mserr');
  if(!t){er.textContent='Enter a team name.';return}if(t.length>30){er.textContent='Keep the team name under 31 characters.';return}
  {const te=$('msteamerr');if(te)te.textContent='';const others=MG.filter(x=>x.mid!==mid).map(x=>x.team);if(F.teamTaken(t,others)){if(te)te.textContent='Another manager already uses “'+t+'”. Pick a different team name.';const ti=$('ms_team');if(ti)ti.focus({preventScroll:true});return}}
  MS.busy=true;const b=$('mssave');if(b){b.disabled=true;b.textContent='Saving…'}
  try{const p=PROF[mid]||{};const c=CL[MG.find(x=>x.mid===mid).i]||{};
    const prof=F.makeProfile({mid,name:p.name||c.name||mg(mid).name,team:t,emoji:MS.photo?'':MS.emoji,photo:ALLOW_PHOTO?MS.photo:'',pv:p.pv||0,tt:Math.round(nowSrv())});/* tt: latest save wins over an older commissioner rename (F.teamPick) *//* real name is carried over unchanged: never edited here */
    await postJ(K.mgr(mid),prof);await UI.sleep(600);const raw=await readRaw(K.mgr(mid));const back=F.parseProfile(raw);
    if(!back||back.mid!==mid||back.pv!==prof.pv||back.team!==prof.team||back.tt!==prof.tt)throw new Error('verify');
    PROF[mid]=back;PROFraw[mid]=raw;profAt[mid]=Date.now();MG=F.managersView(M,CL,PROF);UI.closeSheet();toast('Saved');renderAll()}
  catch(e){if(er)er.textContent='Could not save. Check your connection and try again.'}finally{MS.busy=false;const b2=$('mssave');if(b2){b2.disabled=false;b2.textContent='Save'}}}
function openMgr(mid){const m=mg(mid);const st=S.status;if(st!=='complete')readPref(mid).then(()=>{const el=document.getElementById('phq');if(el)el.innerHTML=phQueueHTML(mid)}).catch(()=>{});
  UI.openSheet(`<h2>${esc(m.name)}</h2><div class="small mut" style="margin-bottom:8px">${esc(m.team)}</div>
   <div class="stack">${st!=='complete'?`<div id="phq">${phQueueHTML(mid)}</div>`:''}<div class="row nw"><input type="text" id="rn_name" maxlength="30" value="${esc(m.name)}" aria-label="Manager name"><button class="btn sm" data-a="rename" data-m="${esc(mid)}" data-f="name">Rename</button></div>
   <div class="row nw"><input type="text" id="rn_team" maxlength="30" value="${esc(m.team)}" aria-label="Team name"><button class="btn sm" data-a="rename" data-m="${esc(mid)}" data-f="team">Rename</button></div>
   ${st!=='complete'?`<button class="btn block" data-a="${m.away?'unaway':'away'}" data-m="${esc(mid)}" id="awaybtn">${m.away?'Mark back (stop auto-pick)':'Mark away — auto-pick covers them'}</button>
   <button class="btn bad block" data-a="removemgr" data-m="${esc(mid)}" id="removebtn">${st==='lobby'?'Remove from league':'Remove (auto-pick makes their remaining picks)'}</button>`:''}
   <button class="btn block" data-a="reissue" data-m="${esc(mid)}" id="reissuebtn">Re-issue private link…</button>
   <div class="small mut">For ${esc(m.name)} if they lost their link or cleared their browser. Makes a new link; the old one stops working.</div>
   <button class="btn block" data-a="sheetbg">Close</button></div>`)}
/* commissioner "Re-issue link": new secret for the seat, claim rewritten with the new hash, old link stops verifying; the new link is shown once, on this phone only */
let REISSUE_URL='';
async function actReissue(mid){if(!needUnlock())return;const c=F.joinedList(M,CL).find(x=>x.mid===mid);if(!c){toast('That manager has no seat to re-issue.',4000);return}
  let r;try{r=await F.reissueSeat(c)}catch(e){toast('Could not make a new link. Try again.',4000);return}
  const key=K.slot(c.i,c.gen);
  try{await postJ(key,r.claim)}catch(e){toast(NOCONN);return}
  let raw;try{raw=await readRaw(key)}catch(e){toast(NOCONN);return}
  const back=F.parseClaim(raw);if(!back||back.sh!==r.claim.sh||back.mid!==mid){toast('Another phone changed this seat at the same moment. Tap Re-issue again.',5000);return}
  CLraw[c.i]=key+'|'+raw;CL[c.i]=back;
  if(me&&me.mid===mid){me={mid,k:r.k};UI.setMe(LID,me)}
  ME_KEY='';await refreshAuth();rebuild(true);
  /* s26c16: re-issuing a placeholder seat hands it to its real manager: the placeholder mark is cleared; the seat keeps its picks and behaves like any manager */
  if(M&&M.over[mid]&&M.over[mid].ph)await simple(m=>F.mClaimPh(m,mid),null,chk=>!(chk.over[mid]&&chk.over[mid].ph));
  REISSUE_URL=UI.pageUrl('room.html',{l:LID},{as:mid,k:r.k});
  UI.openSheet(`<h2>New link for ${esc(mg(mid).name)}</h2><div class="mut small" style="margin:6px 0 10px">Send this private link to ${esc(mg(mid).name)} only. The old link no longer works. Anyone who has this one can act as them.</div><input type="text" id="reissueurl" readonly value="${esc(REISSUE_URL)}" aria-label="New private link" style="margin-bottom:8px"><div class="row"><button class="btn pri grow" style="padding:12px" data-a="reissuecopy" id="reissuecopy">Copy link</button><button class="btn grow" style="padding:12px" data-a="sheetbg">Done</button></div>`)}
function openSettings(){const s=M.settings;const o=(arr,cur,fn)=>arr.map(v=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${fn?fn(v):v}</option>`).join('');
  UI.openSheet(`<h2>League settings</h2><div class="small mut" style="margin-bottom:8px">Editable until the draft starts.</div><div class="stack">
   <div><label class="f" for="s_name">League name</label><input type="text" id="s_name" maxlength="40" value="${esc(M.name)}"></div>
   <div class="row nw"><div class="grow"><div class="f">Managers</div><div id="s_mgrs_fixed" class="fixedval">${s.managers} (fixed)</div></div><div class="grow"><label class="f" for="s_rounds">Teams each</label><select id="s_rounds" style="width:100%">${o(Array.from({length:Math.max(s.rounds,F.maxRounds(s.managers,POOL.length))},(_,i)=>i+1),s.rounds)}</select></div></div>
   <div class="row nw"><div class="grow"><label class="f" for="s_type">Draft style</label><select id="s_type" style="width:100%">${o(['snake','linear'],s.type,v=>v==='snake'?'Snake':'Linear')}</select></div><div class="grow"><label class="f" for="s_order">Who picks first</label><select id="s_order" style="width:100%">${o(['random','manual'],s.orderMode,v=>v==='random'?'Random':'I set the order')}</select></div></div>
   <div><label class="f" for="s_when">Draft time (your time, ${esc(F.tzCity(TZ))}) — empty means “I press Start”</label><input type="datetime-local" id="s_when" value="${s.startAt!=null?F.localInputValue(s.startAt,TZ):''}"></div>
   <div class="row nw"><div class="grow"><label class="f" for="s_start">At the set time</label><select id="s_start" style="width:100%">${o(['manual','auto'],s.startMode,v=>v==='manual'?'I press Start':'Start by itself')}</select></div><div class="grow"><label class="f" for="s_clock">Pick clock</label><select id="s_clock" style="width:100%">${o(F.CLOCKS,s.clockSecs,v=>v===0?'No clock':v>=120?(v/60)+' min':v+' sec')}</select></div></div>
   <div><span class="f">If time runs out</span><div class="small" id="s_autoro">${true/* (k) always auto-pick */?'We pick for you: top of your queue, otherwise the best team left (that one pick only).':'Waits (older setting). Switch on with the Auto-pick switch in More; it can\'t be changed back.'}</div></div>
   <div class="err" id="s_err" role="alert"></div><div class="row"><button class="btn pri grow" data-a="savesettings" id="savesettings">Save</button><button class="btn grow" data-a="sheetbg">Cancel</button></div></div>`)}
async function saveSettings(){const g=id=>$(id).value;const s=M.settings;const patch={rounds:+g('s_rounds'),type:g('s_type'),orderMode:g('s_order'),clockSecs:+g('s_clock')};
  const nm=g('s_name');if(F.clean(nm)!==M.name)patch.name=nm;const w=g('s_when');const wv=w?F.parseLocalInput(w,TZ):null;if(wv!==s.startAt)patch.startAt=wv;
  const finalAt='startAt' in patch?patch.startAt:s.startAt;patch.startMode=finalAt==null?'manual':g('s_start');
  const r=await mutateMeta(m=>F.mSettings(m,patch,F.joinedList(m,CL),POOL.length,nowSrv()),(chk,ns)=>JSON.stringify(chk.settings)===JSON.stringify(ns.settings)&&chk.name===ns.name);
  if(!r.ok){$('s_err').textContent=r.msg;return}UI.closeSheet();toast('Settings saved')}
/* ---- confirm + unlock sheets ---- */
let confirmCb=null;
function askConfirm(o){confirmCb=o.onYes;UI.openSheet(`<h2>${esc(o.title)}</h2><div class="mut small" style="margin:6px 0 10px">${o.body}</div>${o.typed?`<input type="text" id="cft" placeholder='Type ${esc(o.typed)} to confirm' autocomplete="off" autocapitalize="characters"><div class="err" id="cferr" role="alert"></div>`:''}<div class="row" style="margin-top:10px"><button class="btn ${o.danger?'bad':'pri'} grow" style="padding:12px" data-a="cfyes" id="cfyes" ${o.typed?`data-typed="${esc(o.typed)}"`:''}>${esc(o.label)}</button><button class="btn grow" style="padding:12px" data-a="sheetbg">Cancel</button></div>`)}
function showUnlock(){UI.openSheet(`<h2>Commissioner unlock</h2><div class="mut small">Paste the commissioner link you saved when you created the league (or just its 32-character code).</div><input type="password" id="pin" placeholder="commissioner link or code" autocomplete="off" style="margin:10px 0 4px"><div class="err" id="pinerr" role="alert"></div><div class="row"><button class="btn pri grow" style="padding:12px" data-a="dounlock" id="dounlock">Unlock</button><button class="btn grow" style="padding:12px" data-a="sheetbg">Cancel</button></div><div class="small mut" style="margin-top:8px">Only a salted hash of the secret is stored in the league, so it cannot be recovered. This is a friendly lock, not real security.</div>`);setTimeout(()=>{const i=$('pin');if(i)i.focus({preventScroll:true})},50)}
function closeIdentity(){const o=document.querySelector('#overlay .ov');$('overlay').innerHTML='';if(o)UI.dialogOut(o)}
function showIdentity(){$('overlay').innerHTML=`<div class="ov"><h2 id="idh">Who are you?</h2><a class="btn" id="watchbtn" style="display:flex;align-items:center;justify-content:center;width:100%;max-width:340px;min-height:48px;box-sizing:border-box;margin:4px 0 10px" href="${esc(UI.pageUrl('room.html',{l:LID,watch:1}))}">Just watching (spectator)</a><div class="mut small" style="text-align:center;max-width:340px">No accounts. To play as a manager, open your private manager link (it was shown when you joined), or paste it here. A name alone is not enough: the link holds a secret.</div>
  <input type="password" id="ilink" placeholder="private manager link" autocomplete="off" style="margin:10px 0 4px;max-width:340px"><div class="err" id="ilinkerr" role="alert" style="max-width:340px"></div><button class="btn pri" data-a="ilinkgo" id="ilinkgo">Continue as that manager</button>
  ${S&&S.status==='lobby'&&F.freeSlots(M,CL).length?`<a class="btn pri" style="margin-top:8px" href="${esc(UI.pageUrl('join.html',{l:LID}))}">Join this league</a>`:''}<button class="link" style="margin-top:12px" data-a="idclose">Close</button></div>`;const ov=document.querySelector('#overlay .ov');if(ov){ov.setAttribute('aria-labelledby','idh');ov._esc=()=>ACT.idclose();UI.dialogIn(ov,'Who are you?')}}
/* ---- view plumbing ---- */
function renderView(){const v=$('view');if(notFound){v.innerHTML=`<div class="card" id="nf"><h2>League not found</h2><p class="small mut">No league exists for code ${esc(F.formatCode(LID))}. Check the link, or <a href="index.html">go home</a>.</p></div>`;return}
  if(!S){v.innerHTML='';return}
  maybeCheer();if(tab==='teams'){if(!$('tq')){v.innerHTML=viewTeams()}updateTeams();return}
  if(tab==='chat'){if(!$('chatbody')){v.innerHTML=viewChat()}holdY($('chatbody'),updateChatView)/* s25-full: chat / pick feed re-render keeps scrollY (chat still follows new messages when you are at the bottom) */;return}
  if(tab==='rules'){/* s26c14: Rules tab = Draft Rules (js/rules.js, incl. 10. Rankings) + League Rules link */const R=window.DR2Rules?window.DR2Rules.html(M):'';const lr=isMock()?'':`<a class="btn" id="leaguerules_tab" href="${esc(UI.pageUrl('league.html',{l:LID}))}#rules" aria-label="League rules: scoring and season">📖 League Rules</a>`;const html=`<div class="rulestab" id="rulestab">${lr?`<div class="card rltab"><div class="small mut">Scoring and season rules are on the league page.</div>${lr}</div>`:''}${R}</div>`;if(v._rt!==html){v._rt=html;v.innerHTML=html}return}v._rt=null;
  const old=tab==='board'?document.querySelector('.bwrap'):null,sl=old?old.scrollLeft:null,st=old?old.scrollTop:null;
  document.body.classList.toggle('pdmore',tab==='more'&&S.status==='complete');document.body.classList.toggle('inlobby',S.status==='lobby');document.body.classList.toggle('drdone',S.status==='complete');/* s26c9: compact post-draft More (CSS scoped to body.pdmore) */
  if(drag)return;holdY(v,()=>{v.innerHTML=tab==='board'?viewBoard():tab==='my'?viewMy():viewMore();if(tab==='board')centerBoard(sl,st)})}
let boardCenteredFor=-1;
function centerBoard(sl,st){const w=document.querySelector('.bwrap');if(!w||!S)return;const key=S.picks.length;if(sl!=null){w.scrollLeft=sl;w.scrollTop=st;boardCenteredFor=key;return}/* s25-full: a re-render (sync or pick) keeps the board where the user left it; it centres only when the board is first opened */
  boardCenteredFor=key;const c=w.querySelector('td.cur')||w.querySelector('td.mine');if(c){w.scrollLeft=Math.max(0,c.offsetLeft-34-(w.clientWidth-34)/2+c.offsetWidth/2);w.scrollTop=Math.max(0,c.offsetTop-w.clientHeight/2)}}
/* s25-full load flash: the room stays behind the loader (html.loading) until it has a settled first view:
   state loaded (or not found), and a solo mock already past its lobby. Then exactly the active tab is revealed. 8 s safety net. */
let revealed=false;function reveal(){if(revealed)return;revealed=true;document.documentElement.classList.remove('loading')}
setTimeout(reveal,8000);
function maybeReveal(){if(revealed)return;if(notFound){reveal();return}if(!loaded||!S||!M)return;if(M.mock&&M.solo&&M.status==='lobby')return;if(typeof authReady==='undefined'||!authReady)return;
  /* a new device: open "Who are you?" before the first reveal, so the board never flashes under it */if(!WATCH&&!myMid()&&!removed()&&!KFRAG&&(S.status!=='lobby'||me)&&!identityShown&&MG.length){identityShown=true;showIdentity()}reveal()}
/* s28: join.html?edit=1 now sends managers here (room.html?l=…&settings=1); open My settings once, as soon as we know who this phone is */
let msWant=P.get('settings')==='1';
function msAutoOpen(){if(!msWant||!loaded||!M)return;if(!myMid()||WATCH){if(authReady||WATCH)msWant=false;return}msWant=false;try{const u=new URL(location.href);u.searchParams.delete('settings');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}catch(e){}openMySettings()}
function renderAll(){if(msWant)setTimeout(msAutoOpen,0);document.body.dataset.tab=tab;renderTop();renderBanner();renderTabs();renderView();renderPresence();updateTitle();
  if(resumeErr&&$('view')&&S&&!$('resumeerr'))$('view').insertAdjacentHTML('afterbegin',`<div class="cflict" id="resumeerr">${esc(resumeErr)}</div>`);maybeReveal()}
function setTab(t,fromHistory){if(TABN.indexOf(t)<0)t='board';UI.setHashTab(t,!fromHistory&&t!==tab);tab=t;document.body.dataset.tab=t;lsSet(L('tab'),t);saveLast();$('view').innerHTML='';if(t==='chat'){seenChat=C.msgs.length;lsSet(L('seenChat'),String(seenChat))}renderTabs();renderView();renderPresence();window.scrollTo(0,0)}
/* ---- drag to reorder (lobby, commissioner) ---- */
let drag=null;
document.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-handle]');if(!h||!commish())return;e.preventDefault();const row=h.closest('.mrow');const rows=Array.from(document.querySelectorAll('#orderlist .mrow'));
  drag={mid:h.dataset.handle,row,rows,start:e.clientY,idx:rows.indexOf(row),h:row.getBoundingClientRect().height,to:rows.indexOf(row)};row.classList.add('drag');if(h.setPointerCapture)h.setPointerCapture(e.pointerId)});
document.addEventListener('pointermove',e=>{if(!drag)return;const dy=e.clientY-drag.start;drag.row.style.transform='translateY('+dy+'px)';drag.row.style.position='relative';drag.row.style.zIndex=5;drag.to=Math.max(0,Math.min(drag.rows.length-1,drag.idx+Math.round(dy/drag.h)))});
document.addEventListener('pointerup',async()=>{if(!drag)return;const d=drag;drag=null;d.row.style.transform='';d.row.classList.remove('drag');
  if(d.to!==d.idx){const cur=F.effectiveOrder(M,joinedMids());const no=F.moveTo(cur,d.mid,d.to);if(no)await actOrderSet(no)}else renderView()});
/* ===================== events ===================== */
const shareU=(u,t)=>UI.share({title:M.name,text:t||'Join '+M.name,url:u});
function openYourLinks(){if(!commish())return;const c=LinksCard.fromDevice(LID,(M&&M.name)||'',M&&M.settings?M.settings.startAt:null);UI.openSheet(`<h2>Save these links</h2><div class="small mut" style="margin-bottom:10px">Built on this phone from links it already holds. Nothing is sent anywhere.</div>${LinksCard.html(c)}<button class="btn block" style="margin-top:12px" data-a="sheetbg">Close</button>`);LinksCard.mount(c)}
const ACT={
 yourlinks:()=>openYourLinks(),
 fillbots:async el=>{if(!needUnlock()||!isMock()||!window.FBNMock)return;el.disabled=true;el.textContent='Adding bots…';
   try{const mids=await FBNMock.fillBots(M);if(mids.length){await simple(m=>{const n=F.clone(m);mids.forEach(x=>{n.over[x]=Object.assign({},n.over[x],{away:true,bot:true})});return{state:n}},null,chk=>mids.every(x=>chk.over[x]&&chk.over[x].bot))}await pollOnce();toast(mids.length?mids.length+' bot'+(mids.length===1?'':'s')+' joined':'No empty seats left')}catch(e){toast(NOCONN,5000)}rebuild(true);renderAll()},
 /* s24: tabs are real links (#tab=<name>): a plain left click switches in place; Ctrl / Cmd / Shift / Alt or a non-left button is left to the browser (new tab / window) */
 tab:(el,e)=>{if(el.tagName==='A'&&e&&(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey))return;if(e&&e.preventDefault)e.preventDefault();setTab(el.dataset.t)},switch:()=>{identityShown=true;showIdentity()},idclose:()=>{identityShown=false;closeIdentity()},
 ilinkgo:async()=>{const v=($('ilink')||{}).value||'';const x=F.extractMgr(v);const e=$('ilinkerr');if(!x){if(e)e.textContent='That does not look like a private manager link.';return}
   const r=await adoptManager(x.mid,x.k);if(r===null){if(e)e.textContent='That manager is not in this league (yet). Try again in a moment.';return}if(r){if(e)e.textContent=r;return}closeIdentity();identityShown=false;viewOwner=null;renderAll();kick();presBeat()},
 qbar:()=>{QOPEN=!QOPEN;renderQPanel()},qrm:(el,e)=>{if(e)e.stopPropagation();const mm=myMid();if(mm)actQueue(mm,el.dataset.t)}, rules:()=>{/* DR2: one Rules path (js/rules.js) */if(window.DR2Rules)window.DR2Rules.show(M)}, invite:()=>showInvite(),invcopy:el=>{UI.copy(el.dataset.u,'Copied');el.textContent='Copied!';clearTimeout(el._t);el._t=setTimeout(()=>{if(el.isConnected)el.textContent='Copy invite link'},2000)},invmore:el=>{const b=$('invmorebox');if(!b)return;b.hidden=!b.hidden;el.setAttribute('aria-expanded',String(!b.hidden))},share:()=>shareU(UI.pageUrl('join.html',{l:LID}),'Join '+M.name+' on Fantasy BBALL NCAA'),shareu:el=>shareU(el.dataset.u),pdshare:el=>{/* s26c9: native share sheet when there is one, otherwise a plain Copy of the full URL */const u=el.dataset.u;if(UI.canShare()){navigator.share({title:M.name,url:u}).catch(e=>{if(!(e&&e.name==='AbortError'))UI.copy(u,'Copied')})}else UI.copy(u,'Copied')},copy:el=>UI.copy(el.dataset.u,'Copied'),
 copyrem:()=>UI.copy(reminderMsg(),'Reminder message copied'),
 copymine:()=>{if(me&&ME_OK&&me.k)UI.copy(UI.pageUrl('room.html',{l:LID},{as:me.mid,k:me.k}),'Private link copied');else toast('This phone has no private link. Open the link you were given when you joined.')},
 popen:()=>openPick(),pclose:()=>closePick(),stuckretry:()=>{Store.retryNow();toast('Trying the draft server again…',2000);pollOnce()},force:()=>actForce(),
 tsort:el=>{const m=el.dataset.m;TF.desc=(m===TF.mode&&(m==='power'||m==='kenpom'))?!TF.desc:false;TF.mode=m;lsSet('tmode',TF.mode);updateTeams()},tconf:el=>{TF.conf=el.dataset.c||'';TF.confOpen=false;updateTeams()},tconfopen:()=>{TF.confOpen=!TF.confOpen;updateTeams()},thide:()=>{TF.hide=!TF.hide;lsSet('thide',TF.hide?'1':'0');updateTeams()},twatch:()=>{TF.watch=!TF.watch;updateTeams()},tqueue:()=>{TF.queue=!TF.queue;updateTeams()},tspk:()=>{TF.showPicked=!TF.showPicked;lsSet('showpicked',TF.showPicked?'1':'0');updateTeams()},
 watch:(el,e)=>{e.stopPropagation();const t=el.dataset.t;if(WATCHSET.has(t))WATCHSET.delete(t);else WATCHSET.add(t);saveWatch();updateTeams()},
 cheermute:el=>UI.cheerToggle(el),draftrow:(el,e)=>{if(e&&e.target&&e.target.closest&&e.target.closest('a,.qbtn,.wstar'))return;confirmDraft(el.dataset.t)},confirm:async el=>{UI.closeSheet();await doPick(el.dataset.t,el.dataset.o)},
 q:(el,e)=>{e.stopPropagation();const mm=myMid();if(mm)actQueue(mm,el.dataset.t)},qm:el=>actQMove(myMid(),el.dataset.t,+el.dataset.d),autotog:el=>actAuto(myMid(),el.checked),autodraft:el=>actAuto(el.dataset.m,el.checked),
 vo:el=>{viewOwner=el.dataset.m;renderView()},csub:el=>{chatSub=el.dataset.v;$('view').innerHTML='';renderView()},
 send:()=>{const i=$('cin');if(!i)return;const t=i.value;i.value='';sendMsg(t);i.focus({preventScroll:true})},rx:el=>{reactOpen=null;react(el.dataset.id,el.dataset.e)},ropen:el=>{reactOpen=el.dataset.id;updateChatView()},
 unlockui:()=>showUnlock(),lock:()=>{lsSet('cm.'+LID,null);CM_KEY='';CM_OK=false;toast('Locked');renderAll()},
 dounlock:async()=>{const r=await actUnlock(($('pin')||{}).value||'');if(r.ok){UI.closeSheet();toast('Unlocked on this device');renderAll()}else{const e=$('pinerr');if(e)e.textContent=r.msg;const i=$('pin');if(i){i.value='';i.focus({preventScroll:true})}}},
 cfyes:el=>{const need=el.dataset.typed;if(need){const v=(($('cft')||{}).value||'').trim().toUpperCase();if(v!==need){const e=$('cferr');if(e)e.textContent='Type '+need+' exactly to continue.';return}}const cb=confirmCb;confirmCb=null;UI.closeSheet();if(cb)cb()},
 catchup:()=>{if(!needUnlock())return;if(M.status==='lobby')return actStart(false);const sl=F.onClock(S);if(sl){autoPlan={n:sl.n,at:0};autoTick()}},
 start:()=>{if(!needUnlock())return;if(!MG.length){toast('Nobody has joined yet.');return}
   askConfirm({title:'Start the draft?',body:(full8()?'':'<b id="phconfirm">'+esc(phTxt())+'.</b> Re-issue a seat\'s link later and its manager takes it over, picks included. ')+'The order locks when you start'+(M.orderSet?'.':(M.spin&&spinInfo().done)?' and uses the wheel order.':' and is '+(isMock()&&M.settings.orderMode==='random'?'shuffled randomly.':'taken as listed.')),label:'Start draft',onYes:()=>actStart(false)})},
 pause:()=>actPause(true),startnow:()=>actStartNow(),resume:()=>actPause(false),
 undo:()=>{if(!needUnlock())return;const l=S.real[S.real.length-1];askConfirm({title:'Undo the last pick?',body:l?('Pick #'+l.n+' ('+esc(tn(l.tid))+' by '+esc(mg(l.owner).name)+') will be removed and the clock restarts.'):'',label:'Undo pick',danger:true,onYes:()=>actUndo(l?{n:l.n,id:l.id}:null)})},
 endearly:()=>{if(!needUnlock())return;askConfirm({title:'End the draft early?',body:'The draft is marked <b>complete and locked</b> with the '+S.real.length+' picks made so far ('+(S.realTotal-S.real.length)+' left empty). This cannot be undone.',label:'End draft',typed:'END',danger:true,onYes:actEnd})},
 reset:()=>{if(!needUnlock())return;askConfirm({title:'Reset the draft?',body:'This <b>clears every pick</b> and returns the league to the lobby. Managers stay joined and the commissioner link keeps working. Old pick records stay on the server but are never used again.',label:'Reset draft',typed:'RESET',danger:true,onYes:actReset})},
 randomize:()=>{if(!needUnlock())return;if(!isMock()&&!spinTestHook())return;/* s26c16b (Paul): no Randomize in real leagues */if(M.orderSet){askConfirm({title:'Randomize the order again?',body:'The current order is replaced by a new random one.',label:'Randomize',onYes:actRandomize})}else actRandomize()},
  cqm:el=>{if(needUnlock())actQMove(el.dataset.m,el.dataset.t,+el.dataset.d)},cqrm:el=>{if(needUnlock())actQueue(el.dataset.m,el.dataset.t)},
 phqadd:el=>{const mid=el.dataset.m,t=($('phq_sel')||{}).value;if(!t||!needUnlock())return;mutatePref(mid,cur=>{if(cur.queue.indexOf(String(t))<0)cur.queue.push(String(t));return cur},d=>Array.isArray(d.queue)&&d.queue.includes(String(t)),{t:String(t),want:true}).then(r=>{if(!r.ok)toast(r.msg);else toast('Queued '+tn(t)+' for '+mg(mid).name);openMgr(mid)})},
 phqrm:el=>{const mid=el.dataset.m,t=el.dataset.t;if(!needUnlock())return;actQueue(mid,t).then(()=>openMgr(mid))},
 phqmv:el=>{const mid=el.dataset.m;if(!needUnlock())return;actQMove(mid,el.dataset.t,+el.dataset.d).then(()=>openMgr(mid))},
 om:el=>actOrderMove(el.dataset.m,+el.dataset.d),seatname:el=>{const eid=el.dataset.m;const v=($('sn_'+eid)||{}).value||'';if(needUnlock())simple(m=>F.mSeatName(m,eid,v),'Saved',()=>true)},settings:()=>{if(needUnlock())openSettings()},savesettings:()=>saveSettings(),
 mgr:el=>{if(needUnlock())openMgr(el.dataset.m)},
 mysettings:()=>openMySettings(),mssave:()=>saveMySettings(),msrmphoto:()=>{MS.img=null;MS.photo='';MS.info='';renderMySettings()},
 msemoji:el=>{MS.emoji=MS.emoji===el.dataset.e?'':el.dataset.e;if(MS.emoji){MS.img=null;MS.photo='';MS.info=''}renderMySettings()},
 reissue:el=>{const mid=el.dataset.m;if(!needUnlock())return;UI.closeSheet();askConfirm({title:'Re-issue link for '+mg(mid).name+'?',body:'This makes a <b>new private link</b> for this seat. Their old link (and any phone using it) stops working. Send the new link only to '+esc(mg(mid).name)+'.',label:'Make new link',onYes:()=>actReissue(mid)})},reissuecopy:()=>{if(REISSUE_URL)UI.copy(REISSUE_URL,'Private link copied')},
 rename:async el=>{const mid=el.dataset.m;const f=el.dataset.f;const v=($(f==='name'?'rn_name':'rn_team')||{}).value;const r=await actRename(mid,{[f]:v});if(r&&r.ok)UI.closeSheet()},
 away:async el=>{await actAway(el.dataset.m,true);UI.closeSheet()},unaway:async el=>{await actAway(el.dataset.m,false);UI.closeSheet()},
 removemgr:el=>{const mid=el.dataset.m;UI.closeSheet();askConfirm({title:'Remove '+mg(mid).name+'?',body:M.status==='lobby'?'They lose their spot and it opens up again. They can rejoin with the invite link.':'The draft is under way, so they stay on the board and auto-pick makes their remaining picks.',label:'Remove',danger:true,onYes:()=>actRemove(mid)})},
 spinopen:()=>{if(needUnlock()){WH.open=true;renderWheel()}},spinfinish:()=>finishSpin(),wclose:()=>{WH.open=false;WH.all=false;renderWheel()},spinnext:()=>spinOne(),respin:()=>respin(),spinall:()=>spinAll(),spinstop:()=>{WH.all=false;renderWheel()},
 csv:()=>UI.download((M.name.replace(/[^a-z0-9]+/gi,'-')||'league')+'-draft.csv',F.toCSV(S,MG,TEAMS,META),'text/csv'),
 json:()=>UI.download((M.name.replace(/[^a-z0-9]+/gi,'-')||'league')+'-draft.json',JSON.stringify(F.toJSONExport(S,MG,TEAMS,META,M),null,2),'application/json')
};
function showInvite(){const url=UI.pageUrl('join.html',{l:LID});UI.openSheet(`<h2>Invite managers</h2><div class="small mut">Scan, tap Share, or copy the link. League code: <b class="code" style="font-size:15px">${esc(F.formatCode(LID))}</b></div><div style="text-align:center;margin:10px 0"><div class="qr">${UI.qrSvg(url)}</div></div><div class="urlbox">${esc(url)}</div>
  ${UI.shareRow({url,text:'Join '+M.name+' (draft invite)',subject:M.name+' draft invite',id:'srsheet'})}<div class="row" style="margin-top:8px"><button class="btn grow" data-a="copyrem">Copy reminder</button><button class="btn grow" data-a="sheetbg">Close</button></div>`)}
UI.bind(ACT);
UI.setHashTab(tab,false);
/* back / forward between tabs (the hash only ever holds the tab name) */
window.addEventListener('popstate',()=>{const t=UI.hashTab(TABN);const nt=t||'board';if(nt!==tab)setTab(nt,true);else if(t!==nt)UI.setHashTab(nt,false)});
document.addEventListener('change',e=>{const el=e.target;if(el.id==='orderlock'){const on=!!el.checked;if(!needUnlock()){el.checked=!on;return}simple(m=>F.mOrderLock(m,joinedMids(),on),on?'Order locked':'Order unlocked',chk=>!!chk.orderLock===on);return}if(el.id==='beepon'){try{if(el.checked)localStorage.removeItem('fbn.beepMute');else localStorage.setItem('fbn.beepMute','1');if(el.checked)beepCtx()}catch(e){}return}if(el.id==='w15')actFlags({warn15:el.checked});if(el.id==='atime'&&el.checked)actFlags({autoPick:true});if(el.id==='notes')actFlags({notes:el.checked});if(el.id==='clk')actClock(+el.value);
  if(el.id==='tmode'||el.id==='tmodeP'){TF.mode=el.value;TF.desc=false;lsSet('tmode',TF.mode);updateTeams()}});
document.addEventListener('input',e=>{if(e.target.id==='tq'||e.target.id==='tqP'){TF.q=e.target.value;updateTeams()}});
document.addEventListener('keydown',e=>{const rw=e.target&&e.target.closest&&e.target.closest('[data-a=draftrow]');if(rw&&e.target===rw&&(e.key==='Enter'||e.key===' ')){e.preventDefault();confirmDraft(rw.dataset.t);return}if(e.key==='Enter'&&e.target.id==='pin'){e.preventDefault();ACT.dounlock()}if(e.key==='Enter'&&e.target.id==='ilink'){e.preventDefault();ACT.ilinkgo()}if(e.key==='Enter'&&e.target.id==='cin'){e.preventDefault();ACT.send()}});
window.addEventListener('online',()=>{failCount=0;loop()});
window.addEventListener('fbn:pickstate',e=>{const d=e.detail||{};if(!loaded)return;if(d.state==='alt')toast('Pick #'+d.n+' was saved to a backup spot because the main spot is not answering. It counts the same.',6500);renderBanner()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){loop();updateTitle();renderBanner();presBeat();syncTime()}else updateTitle();presTick()});
window.addEventListener('focus',()=>{kick();syncTime()});window.addEventListener('pageshow',kick);
/* the Send button must not take focus from the message box (keeps the phone keyboard open) */
document.addEventListener('mousedown',e=>{if(e.target.closest&&e.target.closest('[data-a=send]'))e.preventDefault()});
let lastTick=Date.now(),presT=0;
setInterval(()=>{const now=Date.now();if(now-lastTick>6000&&!document.hidden){kick();syncTime()}lastTick=now;if(now-srvSync>300000)syncTime();if(++presT%10===0)renderPresence();try{turnLocal()}catch(e){}/* s28g */tickClock();wheelTick();autoTick();autoStartTick();renderConn()},1000);
/* ===================== boot ===================== */
(function boot(){loadLogCache();renderAll();syncTime();UI.registerSW();loop();presBeat();presTick();
  const t=setInterval(()=>{if(!M||!S)return;clearInterval(t);if(authReady&&!WATCH&&!myMid()&&!removed()&&!KFRAG&&(S.status!=='lobby'||me)&&!identityShown&&MG.length){identityShown=true;showIdentity()}},400)})();
})();
/* s26c9: every League site link in the draft room (#sitelink, #bigsite, #leaguehome2, any a[href*="league.html"]) opens in a NEW tab on desktop
   (pointer:fine and width > 900px); on phones (coarse pointer or <= 900px) it stays in the same tab. Decided at click time (capture phase, before navigation). */
(function(){const desk=()=>{try{return matchMedia('(pointer:fine)').matches&&window.innerWidth>900}catch(e){return false}};
  const pick=e=>{const a=e.target&&e.target.closest&&e.target.closest('a[href*="league.html"]');if(!a)return;
    if(desk()){a.target='_blank';a.rel='noopener noreferrer'}else{a.removeAttribute('target');a.removeAttribute('rel')}};
  document.addEventListener('click',pick,true);document.addEventListener('auxclick',pick,true);document.addEventListener('keydown',e=>{if(e.key==='Enter')pick(e)},true);
  window.FBN_siteNewTab=desk})();
