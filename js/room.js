/* Draft room: lobby, live draft, complete. Adapted from the hardened room (per-slot first-pick-wins log, replay, resync on wake,
   queue, auto-pick, shared clock, pause/undo with passcode lock, chat separate from picks, presence, spin wheel, sort & group). */
(function(){
const {esc,$,sleep,lsGet,lsSet}=UI;const F=FBN;
const P=UI.qs();const LID=F.parseCode(P.get('l')||'');const WATCH=P.get('watch')==='1';
/* secrets arrive in the URL fragment (#cm=… commissioner, #as=…&k=… manager); read once, then the fragment is removed from the address bar and history */
const FR=UI.takeFragment();const CMFRAG=F.extractSecret(FR.get('cm')||'','cm');const ASFRAG=FR.get('as')||P.get('as')||'',KFRAG=FR.get('k')||P.get('k')||'';
if(!LID){location.replace('index.html');return}
const K=F.Keys(LID);const T=UI.loadTeams();const {TEAMS,POOL,POOLSET,META}=T;const TZ=UI.tz();
const CFG={pollLobbyMs:4000,pollLiveMs:2500,pollDoneMs:15000,backoffMaxMs:30000,graceMs:1800};
const L=k=>'x.'+LID+'.'+k;
/* ===================== state ===================== */
let M=null,Mraw='',notFound=false,CL={},CLraw={},PROF={},PROFraw={},profAt={},MG=[],S=null,C=F.normChat(null),Craw='',pendingChat=[];
let ENT={},ENTraw={},PREF={},PREFraw={},SPIN={},SPINraw={},logReady=false,prefsLoaded=false,epochSeen=0,pollNo=0,sweepAt=0,srvOff=0,srvSync=0,srvInfo='device clock';
let loaded=false,lastOk=0,failCount=0,polling=false,pendingKick=false,lastSig='',busy=false,resumeErr='';
let me=UI.getMe(LID);
const WRITER=lsGet('writer')||(function(){const w=F.hexId(6);lsSet('writer',w);return w})();
const nowSrv=()=>Date.now()+srvOff;
const NOCONN="Can't reach the draft server. Check your connection and try again.";
const storeOk=()=>{lastOk=Date.now();failCount=0;renderConn()};  /* any successful store call clears the Offline pill at once and ends the back-off */
const readRaw=url=>Store.get(url).then(r=>{storeOk();return r});const postJ=(url,obj)=>Store.set(url,obj).then(r=>{storeOk();return r});
const mg=mid=>MG.find(m=>m.mid===mid)||{mid,name:'Former manager',team:'',emoji:'',photo:'',away:false};
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
const missing=()=>Math.max(0,F.MANAGERS-MG.length);const waitTxt=()=>'Waiting for '+missing()+' more manager'+(missing()===1?'':'s');const full8=()=>MG.length===F.MANAGERS;
/* ===================== time sync ===================== */
async function syncTime(){try{const t0=Date.now();const ac=new AbortController();const to=setTimeout(()=>ac.abort(),5000);let h;try{const r=await fetch(location.href.split('#')[0],{method:'HEAD',cache:'no-store',signal:ac.signal});h=r.headers.get('Date')}finally{clearTimeout(to)}
  const t1=Date.now();const off=F.offsetFromDate(h,t0,t1);if(off!=null&&F.sane(off)){srvOff=off;srvSync=Date.now();srvInfo=Math.abs(off)<1500?'in sync with server time':'device clock is '+(off>0?'behind':'ahead')+' by '+Math.round(Math.abs(off)/1000)+'s (corrected)'}}catch(e){}}
/* ===================== derive + paint ===================== */
function signature(){return Mraw+'|'+Object.keys(CLraw).map(k=>k+CLraw[k]).join(',')+'|'+Object.keys(PROFraw).map(k=>k+PROFraw[k].length+PROFraw[k].slice(-12)).join(',')+'|'+Object.keys(ENTraw).map(k=>k+':'+ENTraw[k]).join(',')+'|'+JSON.stringify(PREF)+'|'+Object.keys(SPINraw).map(k=>k+':'+SPINraw[k]).join(',')+'|'+logReady}
function rebuild(force){const sig=signature();if(!force&&sig===lastSig)return;lastSig=sig;
  if(!Mraw||notFound){S=null;renderAll();return}
  M=F.normalizeMeta(F.parseJ(Mraw));MG=F.managersView(M,CL,PROF);const prev=S;S=F.deriveState(M,ENT,PREF,POOLSET);S.logReady=logReady;onState(prev,S);onSpinState();renderAll();saveLogCache()}
function saveLogCache(){if(!logReady||!M)return;try{lsSet(L('logc'),JSON.stringify({e:M.epoch,raw:ENTraw}))}catch(e){}}
function loadLogCache(){try{const c=JSON.parse(lsGet(L('logc'))||'null');if(c&&c.e&&c.raw){epochSeen=c.e;Object.keys(c.raw).forEach(k=>{ENTraw[k]=c.raw[k];ENT[k]=F.parseEntry(c.raw[k])})}}catch(e){}}
/* ===================== polling ===================== */
async function fetchSlot(n){const raw=await readRaw(K.pick(M.epoch,n));if(ENTraw[n]===raw)return false;ENTraw[n]=raw;ENT[n]=F.parseEntry(raw);return true}
async function syncLog(){const tot=S?S.total:0;if(!tot)return false;let ch=false;const k=F.replay(M,ENT,POOLSET).picks.length;const want=[];
  if(k>=1&&(pollNo%4===0||!logReady))want.push(k);if(k>=2&&pollNo%6===0)want.push(k-1);if(pollNo%14===0&&k>2){sweepAt=(sweepAt%(k-2))+1;want.push(sweepAt)}
  const batch=logReady?1:6;let from=k+1;let gap=false;
  for(let g=0;g<30&&from<=tot;g++){const ns=[];for(let i=0;i<batch&&from+i<=tot;i++)ns.push(from+i);if(g===0)want.forEach(n=>{if(ns.indexOf(n)<0)ns.push(n)});
    const rs=await Promise.all(ns.map(n=>fetchSlot(n).catch(()=>null)));if(rs.some(r=>r===true))ch=true;if(rs.some(r=>r===null))return ch;
    const nk=F.replay(M,ENT,POOLSET).picks.length;if(nk>=from+batch-1&&nk>=from){from=nk+1;if(ch)rebuild()}else{gap=true;break}}
  if(from>tot)gap=true;if(gap&&!logReady){logReady=true;ch=true}return ch}
async function syncClaims(){if(!M)return false;const N=M.settings.managers;let ch=false;
  /* an empty seat is checked every time; a filled seat only every 8th poll (a removal changes the seat generation in meta, which forces a re-read) */
  const rs=await Promise.all(Array.from({length:N},(_,k)=>k+1).filter(i=>!CL[i]||!CLraw[i]||pollNo%8===0).map(async i=>{const key=K.slot(i,M.slotGen[i]||0);const raw=await readRaw(key).catch(()=>null);if(raw==null)return false;
    if(CLraw[i]===key+'|'+raw)return false;CLraw[i]=key+'|'+raw;CL[i]=F.parseClaim(raw);return true}));rs.forEach(r=>{if(r)ch=true});return ch}
async function syncProfiles(){if(!M)return false;const joined=F.joinedList(M,CL);const age=M.status==='lobby'?30000:90000;const now=Date.now();let ch=false;
  const due=joined.filter(c=>!profAt[c.mid]||now-profAt[c.mid]>age).sort((a,b)=>(profAt[a.mid]||0)-(profAt[b.mid]||0)).slice(0,5);
  await Promise.all(due.map(async c=>{try{const raw=await readRaw(K.mgr(c.mid));profAt[c.mid]=Date.now();if(PROFraw[c.mid]===raw)return;PROFraw[c.mid]=raw;const p=F.parseProfile(raw);if(p&&p.mid===c.mid)PROF[c.mid]=p;ch=true}catch(e){}}));return ch}
async function readPref(mid){const raw=await readRaw(K.pref(mid));if(PREFraw[mid]===raw&&PREF[mid])return false;PREFraw[mid]=raw;const d=F.parseJ(raw);PREF[mid]=(d&&typeof d==='object')?{queue:Array.isArray(d.queue)?d.queue.map(String).filter(t=>F.safeId(t)&&POOLSET.has(t)).slice(0,200):[],auto:!!d.auto,v:+d.v||0}:{queue:[],auto:false,v:0};return true}
async function syncPrefs(){const want=new Set();const mm=myMid();if(mm&&!WATCH)want.add(mm);const cl=S&&S.status==='live'?F.onClock(S):null;if(cl)want.add(cl.owner);
  const rs=await Promise.all(Array.from(want).map(o=>readPref(o).catch(()=>false)));return rs.some(Boolean)}
async function syncSpin(){if(!M||!M.spin||M.spin.done||M.status!=='lobby')return false;let ch=false;const tot=M.spin.players.length;const have=F.spinReplay(M,SPIN).winners.length;const ns=[];/* first look at a spin (nothing loaded yet): read every slot at once, so a reopened page knows at once that all results are saved; afterwards one new slot per poll */const ahead=Object.keys(SPIN).length===0?tot:1;for(let k=have+1;k<=tot&&k<=have+ahead;k++)ns.push(k);if(have>=1&&pollNo%4===0)ns.push(have);
  const rs=await Promise.all(ns.map(async n=>{const raw=await readRaw(K.spin(M.epoch,M.spin.gen,n)).catch(()=>null);if(raw==null||SPINraw[n]===raw)return false;SPINraw[n]=raw;SPIN[n]=F.parseSpin(raw);return true}));return rs.some(Boolean)}
const normChatRaw=txt=>F.normChat(F.parseJ(txt));
async function pollOnce(){if(polling){pendingKick=true;return}polling=true;
  try{pollNo++;
    const pMeta=readRaw(K.meta).then(a=>{lastOk=Date.now();failCount=0;
      if(a!==Mraw||!loaded){Mraw=a;notFound=!F.exists(F.parseJ(a))}
      if(!loaded)loaded=true;
      if(!notFound){const mm=F.normalizeMeta(F.parseJ(Mraw));if(epochSeen!==mm.epoch){ENT={};ENTraw={};SPIN={};SPINraw={};logReady=false;epochSeen=mm.epoch}
        if(JSON.stringify(mm.slotGen)!==JSON.stringify((M||{}).slotGen||{}))CLraw={}}
      rebuild(true);return true});
    const doChat=(pollNo%3===1||tab==='chat'||!loaded);
    const pChat=doChat?readRaw(K.chat).then(b=>{if(b!==Craw||pendingChat.length){Craw=b;const pc=C;C=F.mergeChat(normChatRaw(b),pendingChat);onChat(pc,C)}}).catch(()=>{}):Promise.resolve();
    const metaOk=await pMeta.catch(e=>{failCount++;return false});
    if(metaOk&&!notFound&&M){const paint=r=>{if(r)rebuild(true);return r};const rest=[];
      if(M.status==='lobby'||pollNo%6===0||!Object.keys(CLraw).length)rest.push(syncClaims().catch(()=>false).then(paint));
      rest.push(syncProfiles().catch(()=>false).then(paint));
      if(M.status!=='lobby')rest.push(syncLog().catch(()=>false).then(paint));
      rest.push(syncSpin().catch(()=>false).then(paint));
      if(pollNo%4===1||!prefsLoaded)rest.push(syncPrefs().then(r=>{prefsLoaded=true;return r}).catch(()=>false).then(paint));
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
  if(M&&(!me||Object.keys(CLraw).length))authReady=true;
  if(ch)rebuild(true)}
/* private manager link: #as=<mid>&k=<secret>  (older links used ?as=&k=; both are read once and then removed from the address bar) */
let resumeDone=false,cmDone=false;
async function adoptManager(as,k){const c=F.joinedList(M,CL).find(c=>c.mid===as);
  if(!c){if(Object.keys(CLraw).length>=M.settings.managers)return'That manager link does not match anyone in this league (they may have been removed).';return null}
  if(!(await F.checkMgrSecret(c,k)))return'That manager link is not valid for '+c.name+'.';
  me={mid:as,k};UI.setMe(LID,me);UI.rememberLeague(LID,M.name,'manager');ME_KEY='';await refreshAuth();rebuild(true);UI.toast('Welcome back, '+c.name);return'';}
async function resumeCheck(){if(!M)return;
  if(!cmDone&&CMFRAG){cmDone=true;if(await F.checkPass(M,CMFRAG)){lsSet('cm.'+LID,CMFRAG);CM_KEY='';await refreshAuth();UI.rememberLeague(LID,M.name,'commissioner');UI.toast('Commissioner tools unlocked on this phone')}else resumeErr='That commissioner link is not valid for this league.'}
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
async function mutatePref(mid,fn,verify){for(let attempt=0;attempt<2;attempt++){const url=K.pref(mid);let cur;try{await readPref(mid);cur=F.clone(PREF[mid]||{queue:[],auto:false,v:0})}catch(e){return{ok:false,msg:NOCONN}}
    const ns=fn(cur);ns.v=(cur.v||0)+1;try{await postJ(url,ns)}catch(e){return{ok:false,msg:'Save failed — try again.'}}
    PREF[mid]=ns;PREFraw[mid]=JSON.stringify(ns);rebuild(true);await sleep(500);try{const d=F.parseJ(await readRaw(url));if(d&&verify(d))return{ok:true}}catch(e){return{ok:true}}}
  return{ok:false,msg:'Could not save that setting — try again.'}}
async function submitPick(n,owner,tid,by,o){o=o||{};const prevId=n>1&&S.picks.length===n-1?S.picks[n-2].id:(n>1?null:'');const entry=F.makeEntry(n,owner,tid,{by,now:nowSrv(),writer:WRITER,epoch:M.epoch,prev:prevId});
  const io={read:readRaw,write:postJ,sleep,adopt:(k,e)=>{ENT[k]=e||null;ENTraw[k]=e?JSON.stringify(e):'';rebuild()},later:fn=>{fn()},alert:k=>toast('Pick #'+k+' was replaced by a simultaneous write — check the board.',6000)};
  return F.submitSlot(io,{meta:M,url:K.pick(M.epoch,n),n,entry,taken:F.takenMap({picks:S.picks.filter(p=>p.n<n),kept:S.kept}),pool:POOLSET,prevId:prevId==null?undefined:prevId,fast:o.fast})}
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
  try{await pollOnce();const v=F.validatePick(S,forOwner,String(tid),{pool:POOLSET});
    if(v.error){const tk=F.takenMap(S)[String(tid)];if(tk&&tk.owner===forOwner)toast('Already picked for '+forWho(forOwner)+': '+tn(tid)+' (pick #'+tk.n+'). Nothing more to do.',6000);
      else if(tk)toast('Someone beat you to it: '+tn(tid)+' was just taken by '+mg(tk.owner).name+' (pick #'+tk.n+'). Pick another.',6000);
      else if(v.turn){const s=F.onClock(S);toast("It's "+(s?mg(s.owner).name:'someone else')+"'s turn now (pick #"+(s?s.n:'?')+'). The board moved while you were choosing.',6000)}else toast(v.error,5000);return false}
    if(forOwner!==myMid()&&!opt.auto&&!needUnlock())return false;
    const by=opt.auto?'auto':(forOwner!==myMid()?'commish':'owner');const res=await submitPick(v.slot.n,forOwner,tid,by);
    if(res.ok){toast(mg(forOwner).name+' drafted '+tn(tid)+' (#'+res.pick.n+')');return true}
    if(res.beaten){const w=res.by||{};toast(w.owner===forOwner?'Pick #'+v.slot.n+' was already made for '+forWho(forOwner)+': '+tn(w.tid)+'. Check the board.':'Someone beat you to it: pick #'+v.slot.n+' was just made ('+tn(w.tid)+' by '+mg(w.owner).name+'). Check the board.',6500);showConflict(v.slot.n,tid,w,forOwner);return false}
    toast(res.msg,5000);return false}finally{if(busy===mySlot)busy=false}}
let conflictMsg='';
function showConflict(n,tid,w,forOwner){conflictMsg=w.owner===forOwner?'<b>Already picked for '+esc(forWho(forOwner))+'.</b> Pick #'+n+' was already made — <b>'+esc(tn(w.tid))+'</b>. Your pick of '+esc(tn(tid))+' was <b>not</b> saved.':'<b>Someone beat you to it.</b> Pick #'+n+' was already made — <b>'+esc(tn(w.tid))+'</b> by '+esc(mg(w.owner).name)+'. Your pick of '+esc(tn(tid))+' was <b>not</b> saved.';renderBanner();setTimeout(()=>{conflictMsg='';renderBanner()},12000)}
async function simple(fn,okMsg,verify){const res=await mutateMeta(fn,verify);if(!res.ok&&!res.noop)toast(res.msg,5000);else if(okMsg)toast(okMsg);return res}
const seedOf=m=>m.id+':'+(m.settings.startAt||0);
async function actStart(auto){if(!auto&&!needUnlock())return;await pollOnce();
  return simple(m=>F.mStart(m,joinedMids(),nowSrv(),seedOf(m),POOL.length),auto?null:'The draft is LIVE!',chk=>chk.status==='live')}
const actPause=p=>needUnlock()&&simple((m,st)=>F.mPause(m,st,p,nowSrv()),p?'Paused':'Resumed',chk=>chk.paused===p);
const actUndo=async exp=>{if(!needUnlock())return;await pollOnce();return simple((m,st)=>F.mUndo(m,st,exp||null,nowSrv()),'Last pick undone',(chk,ns)=>chk.voided.length>=ns.voided.length)};
const actClock=s=>needUnlock()&&simple(m=>F.mClock(m,s,nowSrv()),s?'Pick clock: '+s+'s':'Pick clock off',(chk,ns)=>chk.settings.clockSecs===ns.settings.clockSecs);
const actFlags=f=>needUnlock()&&simple(m=>F.mFlags(m,f),null,(chk,ns)=>chk.settings.warn15===ns.settings.warn15&&chk.settings.autoPick===ns.settings.autoPick&&chk.notes===ns.notes);
const actOrderMove=(mid,d)=>needUnlock()&&simple(m=>F.mMove(m,joinedMids(),mid,d),null,(chk,ns)=>JSON.stringify(chk.order)===JSON.stringify(ns.order));
const actOrderSet=o=>needUnlock()&&simple(m=>F.mSetOrder(m,joinedMids(),o),null,(chk,ns)=>JSON.stringify(chk.order)===JSON.stringify(ns.order));
const actRandomize=()=>needUnlock()&&simple(m=>F.mRandomize(m,joinedMids(),()=>F.randInt(1e6)/1e6),'Order randomized',(chk,ns)=>JSON.stringify(chk.order)===JSON.stringify(ns.order));
const actAway=(mid,on)=>needUnlock()&&simple(m=>F.mAway(m,mid,on),on?mg(mid).name+' is marked away — auto-pick covers them':mg(mid).name+' is back',chk=>!!(chk.over[mid]&&chk.over[mid].away)===on);
const actRename=(mid,patch)=>needUnlock()&&simple(m=>F.mRename(m,mid,patch,MG.filter(x=>x.mid!==mid).map(x=>x.name)),'Saved',()=>true);
const actRemove=mid=>{if(!needUnlock())return;const slotI=(MG.find(x=>x.mid===mid)||{}).i;return simple(m=>F.mRemove(m,mid,slotI),M.status==='lobby'?mg(mid).name+' was removed':mg(mid).name+' left — auto-pick covers the rest',()=>true)};
const actEnd=()=>needUnlock()&&simple(m=>F.mEnd(m,nowSrv()),'Draft ended',chk=>chk.status==='complete');
const actReset=()=>needUnlock()&&simple(m=>F.mReset(m),'Draft reset to the lobby',chk=>chk.epoch>0&&chk.status==='lobby');
const actQueue=(mid,tid)=>mutatePref(mid,cur=>{cur.queue=F.watchToggle(cur.queue,tid);return cur},()=>true).then(r=>{if(!r.ok)toast(r.msg)});
const actQMove=(mid,tid,d)=>mutatePref(mid,cur=>{const q=cur.queue,i=q.indexOf(String(tid)),j=i+d;if(i>=0&&j>=0&&j<q.length)[q[i],q[j]]=[q[j],q[i]];return cur},()=>true).then(r=>{if(!r.ok)toast(r.msg)});
const actAuto=(mid,on)=>mutatePref(mid,cur=>{cur.auto=!!on;return cur},d=>!!d.auto===!!on).then(r=>{if(!r.ok)toast(r.msg);else toast(on?'Auto-pick ON for you':'Auto-pick off')});
let pinTries=0,pinLock=0;
async function actUnlock(pass){if(Date.now()<pinLock)return{ok:false,msg:'Too many wrong tries. Wait '+Math.ceil((pinLock-Date.now())/1000)+'s.'};
  const sec=F.extractSecret(pass,'cm');if(sec&&await F.checkPass(M,sec)){pinTries=0;lsSet('cm.'+LID,sec);CM_KEY='';await refreshAuth();return{ok:true}}
  pinTries++;if(pinTries>=5){pinLock=Date.now()+30000;pinTries=0;return{ok:false,msg:'That is not the commissioner secret. Locked for 30 seconds.'}}return{ok:false,msg:'That is not the commissioner secret. Paste the whole commissioner link, or its 32-character code ('+(5-pinTries)+' tries left).'}}
const prankOf=t=>(META[t]||{}).p||0;
let autoPlan={n:0,at:0},autoBusy=false;
function autoTick(){if(!S||!loaded||autoBusy||busy||!S.logReady)return;const s=F.onClock(S);if(!s){autoPlan={n:0,at:0};return}
  const reason=F.autoReason(S,nowSrv(),CFG.graceMs);if(!reason){autoPlan={n:0,at:0};return}
  if(autoPlan.n!==s.n){autoPlan={n:s.n,at:Date.now()+(reason==='expired'?0:900)+Math.random()*1500};return}if(Date.now()<autoPlan.at)return;
  autoBusy=true;autoPlan.at=Date.now()+5000;const n=s.n;
  (async()=>{await pollOnce();const s2=F.onClock(S);if(!s2||s2.n!==n||!F.autoReason(S,nowSrv(),CFG.graceMs-200))return;
    const ch=F.autoChoice(S,s2.owner,POOL,F.mulberry(n*7919),prankOf);if(!ch)return;const r=await submitPick(n,s2.owner,ch.tid,'auto');if(r&&r.ok)toast('Auto-pick: '+tn(ch.tid)+' for '+mg(s2.owner).name)})().finally(()=>{autoBusy=false})}
let startTried=0;
function autoStartTick(){if(!M||busy||M.status!=='lobby'||M.settings.startMode!=='auto'||M.settings.startAt==null)return;if(nowSrv()<M.settings.startAt+500)return;if(!full8())return;if(Date.now()<startTried)return;
  startTried=Date.now()+4000+Math.random()*2500;actStart(true)}
async function sendMsg(text){text=(text||'').trim().slice(0,280);const mm=myMid();if(!text||!mm||WATCH)return;const id=Math.random().toString(36).slice(2,10);const msg={id,ts:nowSrv(),who:mm,text};pendingChat.push(msg);
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
function onSpinState(){if(!M)return;const gen=M.spin&&!M.spin.done?M.spin.gen:0;
  if(WH.resp==null)WH.resp=M.respins.length;else if(M.respins.length>WH.resp){WH.resp=M.respins.length;toast('The commissioner set the draft order with the wheel.',5000)}
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
function renderPresence(){const el=$('presence');if(!el)return;const owner=myMid();const v=F.presenceView(PR.recs,nowSrv(),WATCH?null:owner,joinedMids());
  if((!v.online.length&&!v.away.length)||!S||S.status==='complete'||tab==='chat'){el.hidden=true;el.innerHTML='';return}
  const chp=(o,on)=>{const m=mg(o.mid);return `<span class="pc ${on?'on':'off'}${o.mid===owner?' me':''}" title="${on?'online':'last seen '+esc(o.text)}">${UI.avatar(m,20)}<span>${esc(m.name)}</span></span>`};
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
  if(next.status==='complete'&&prev.status!=='complete')toast(next.endedEarly?'The commissioner ended the draft.':'Draft complete!',6000);
  const mm=myMid();
  if(mm&&!WATCH&&nowLive){const a=F.picksAway(next,mm),pa=wasLive?F.picksAway(prev,mm):null;
    if(a===0&&pa!==0){vib([250,120,250,120,500]);setAlertBar('')}
    else if(a===2&&pa!==2){vib([120,80,120]);setAlertBar('<b>You\'re 2 picks away.</b> Start thinking — add a few teams to your queue.');setTimeout(()=>{if(F.picksAway(S,mm)!==0)setAlertBar('')},9000)}
    if(a!==0&&pa===0)setAlertBar('')}
  if(!nowLive)setAlertBar('');updateTitle()}
function onChat(prev,next){if(tab==='chat'&&chatSub==='chat'){seenChat=next.msgs.length;lsSet(L('seenChat'),String(seenChat))}
  if(prev&&next.msgs.length>prev.msgs.length&&tab!=='chat'){const m=next.msgs[next.msgs.length-1];if(m&&m.who!==myMid()&&MG.some(x=>x.mid===m.who))toast(mg(m.who).name+': '+m.text.slice(0,60))}renderTabs();updateChatView()}
function updateTitle(){const base=(M?M.name+' · ':'')+'Fantasy BBALL NCAA';const mm=myMid();const mineNow=S&&mm&&!WATCH&&F.picksAway(S,mm)===0;clearInterval(flashT);flashT=null;
  if(mineNow){setFavicon(true);if(document.hidden){let k=0;flashT=setInterval(()=>{document.title=(k++%2)?base:'YOUR PICK!'},900);document.title='YOUR PICK!'}else document.title='Your pick! · '+base}
  else{setFavicon(false);document.title=S&&S.status==='live'?base+' · #'+(S.picks.length+1):base}}
function beep(){try{if(lsGet('sound')==='0')return;const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const c=beep.c||(beep.c=new A());const o=c.createOscillator(),g=c.createGain();o.frequency.value=880;g.gain.value=.08;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.18)}catch(e){}}
/* ===================== render ===================== */
let tab=lsGet(L('tab'))||'board',chatSub='chat',viewOwner=null,reactOpen=null,identityShown=false;
const TABS=[['board','Board','🧩'],['teams','Teams','🏀'],['my','My Team','👤'],['chat','Chat','💬'],['more','More','⚙️']];
function stickySite(){let el=$('stickysite');const done=!!(S&&S.status==='complete');if(!done){if(el)el.remove();document.body.classList.remove('hasstick');return}
  if(!el){el=document.createElement('a');el.id='stickysite';el.className='stickysite btn pri';el.textContent='League site';document.body.appendChild(el)}
  const show=tab!=='chat';el.href=siteUrl();el.hidden=!show||bigVis;document.body.classList.toggle('hasstick',show);watchBig()}
/* the sticky League site button only shows while the big one at the top of the end-of-draft banner is off screen, so two big buttons are never visible together */
let bigVis=false,bigObs=null,bigEl=null;
function watchBig(){if(!('IntersectionObserver' in window))return;const b=$('bigsite');if(b===bigEl)return;if(bigObs){bigObs.disconnect();bigObs=null}bigEl=b;bigVis=false;
  if(b){bigObs=new IntersectionObserver(es=>{bigVis=es[es.length-1].isIntersecting;const el=$('stickysite');if(el)el.hidden=tab==='chat'||bigVis});bigObs.observe(b)}}
function measureTabs(){const h=$('tabs').offsetHeight;if(h)document.body.style.setProperty('--tabh',h+'px')}
window.addEventListener('resize',()=>{if($('tabs'))measureTabs()});
function renderTabs(){stickySite();const unread=Math.max(0,C.msgs.length-seenChat);const el=$('tabs');const af=document.activeElement&&el.contains(document.activeElement)?document.activeElement.dataset.t:null;
  el.innerHTML=TABS.map(t=>`<button role="tab" id="tab_${t[0]}" aria-selected="${tab===t[0]?'true':'false'}" aria-controls="view" tabindex="${tab===t[0]?'0':'-1'}" class="${tab===t[0]?'on':''}" data-a="tab" data-t="${t[0]}"><span aria-hidden="true">${t[2]}</span>${t[1]}${t[0]==='chat'&&unread&&tab!=='chat'?`<i class="bd"><span aria-hidden="true">${unread>9?'9+':unread}</span><span class="sr">${unread} unread message${unread===1?'':'s'}</span></i>`:''}</button>`).join('');
  $('view').setAttribute('aria-labelledby','tab_'+tab);measureTabs();if(af){const b=el.querySelector('[data-t="'+af+'"]');if(b)b.focus()}}
$('tabs').addEventListener('keydown',e=>{const k=e.key;if(!['ArrowLeft','ArrowRight','Home','End'].includes(k))return;const bs=[...$('tabs').querySelectorAll('button')];let i=bs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();i=k==='Home'?0:k==='End'?bs.length-1:(i+(k==='ArrowRight'?1:-1)+bs.length)%bs.length;setTab(bs[i].dataset.t);const nb=$('tabs').querySelector('[data-t="'+TABS[i][0]+'"]');if(nb)nb.focus()});
const siteUrl=()=>UI.pageUrl('league.html',{l:LID}),recapUrl=()=>UI.pageUrl('recap.html',{l:LID});
function renderTop(){const done=!!(S&&S.status==='complete');const site=done?`<a class="pill" id="sitelink" href="${esc(siteUrl())}">League site</a>`:'<span class="pill dis" id="sitelink" aria-disabled="true">League site · after the draft</span>';const who=WATCH?'<span class="pill" id="who">Spectator</span>':(myMid()?`<span class="pill" id="who">${UI.avatar(mg(myMid()),18)} ${esc(mg(myMid()).name)}${commish()?' · commissioner':''}</span>`:'<span class="pill" id="who">Not joined</span>');
  $('top').innerHTML=UI.header({below:true,sub:M?M.name:'Draft room',right:'<span id="conn" class="pill bad"><i></i>Connecting…</span>'+who+site});renderConn()}
function canPick(){if(!S||!S.logReady)return false;if(WATCH)return false;const s=F.onClock(S);if(!s||S.paused)return false;return(!isSpec()&&s.owner===myMid())||commish()}
function remaining(){if(!S||!S.clockSecs)return null;if(S.paused)return S.pausedLeft;return S.deadline?S.deadline-nowSrv():null}
function autoNote(){if(!commish()||!S||!loaded||WATCH)return'';const s=M.settings;
  if(M.status==='lobby'&&s.startMode==='auto'&&s.startAt!=null){const due=nowSrv()>=s.startAt+500&&full8();
    return `<div class="note" id="autonote"><b>Auto-start only runs while a page is open.</b> The draft starts at the set time if at least one phone or computer has this room open. If everyone has closed it, nothing starts until someone opens it again.${due?'<div style="margin-top:6px"><button class="btn pri sm" data-a="catchup" id="catchup">Start the draft now</button></div>':''}</div>`}
  if(S.status==='live'&&!S.paused&&S.autoPick&&S.clockSecs){const r=F.autoReason(S,nowSrv(),0);
    return `<div class="note" id="autonote"><b>Auto-pick only runs while a page is open.</b> If every phone has this room closed, a missed turn waits until someone opens it again.${r==='expired'?'<div style="margin-top:6px"><button class="btn pri sm" data-a="catchup" id="catchup">Make the auto-pick now</button></div>':''}</div>`}
  return''}
function renderBanner(){const keep=document.activeElement&&document.activeElement.id==='pickbtn';renderBanner0();if(removed()&&$('banner'))$('banner').insertAdjacentHTML('afterbegin','<div class="note" id="removednote"><b>You were removed by the commissioner.</b> You can still watch the draft and read the chat.</div>');const an=autoNote();if(an&&$('banner'))$('banner').insertAdjacentHTML('beforeend',an);if(S&&loaded&&S.status==='live'&&canPick()&&$('banner'))$('banner').insertAdjacentHTML('beforeend','<button class="btn pri pickbtn" data-a="popen" id="pickbtn">Pick a team</button>');
  if($('pickov')){const cs=S&&F.onClock(S);if(!canPick()||!cs||String(cs.n)!==$('pickov').dataset.n)closePick();else updateTeams()}if(conflictMsg&&$('banner'))$('banner').insertAdjacentHTML('beforeend',`<div class="cflict" id="conflict">${conflictMsg}</div>`);
  if(keep){const b=$('pickbtn');if(b&&document.activeElement!==b)b.focus({preventScroll:true})}}
function renderBanner0(){const b=$('banner');
  if(!loaded||(!S&&!notFound)){const off=connState()==='offline';b.innerHTML=`<div class="banner"><div class="bm"><div class="nm">${off?'Offline, retrying…':'Connecting…'}</div><div class="sb">${off?'Trying to reach the draft server again':'Reaching the draft server'}</div></div></div>`;return}
  if(notFound||S.status==='lobby'){b.innerHTML='';return}
  if(S.status==='live'&&!S.logReady){b.innerHTML=`<div class="banner"><div class="bm"><div class="nm">Loading the board…</div><div class="sb">Fetching picks made so far</div></div></div>`;return}
  if(S.status==='complete'){const isMgr=!!myMid();b.innerHTML=`<div class="banner finalbn" id="finalbanner"><a class="btn pri block endbig" id="bigsite" href="${esc(siteUrl())}">League site</a><div class="bm"><div class="lbl">${S.endedEarly?'ENDED EARLY':'FINAL'}</div><div class="nm" id="finalhead">${S.endedEarly?'Draft ended by the commissioner':(M.redraft&&M.redraft.phase==='live'?'Redraft complete':'Draft complete')}</div><div class="sb">${S.real.length} of ${S.realTotal} picks made · locked</div></div><button class="btn block endsec" id="seemy" data-a="tab" data-t="my">${isMgr?'See my team':'See the teams'}</button><div class="endsmall"><a class="btn sm" id="bnrecap" href="${esc(recapUrl())}">Draft recap</a></div></div>`;stickySite();return}
  stickySite();
  const s=F.onClock(S),o=mg(s.owner),mine=!isSpec()&&myMid()===s.owner;const myA=(!isSpec())?F.picksAway(S,myMid()):null;
  let sub='Pick #'+s.n+' · Round '+s.round+' of '+S.rounds+(o.team?' · '+esc(o.team):'');if(!mine&&myA!=null)sub+=` · <b>${myA===1?'You\'re up next':'You\'re '+myA+' picks away'}</b>`;
  const rem=remaining();let cd='';
  if(S.clockSecs){cd=S.paused?`<div class="cd">⏸<small>PAUSED ${rem!=null?UI.fmtClock(rem):''}</small></div>`:`<div class="cd${rem!=null&&rem<(S.warn15?15000:10000)?' low':''}" id="cdv">${rem!=null?(rem<=0?'0:00':UI.fmtClock(rem)):'–'}<small>${rem!=null&&rem<=0?(S.autoPick?'AUTO-PICKING':"TIME'S UP · waiting"):'PICK CLOCK'}</small></div>`}
  else if(S.paused)cd=`<div class="cd">⏸<small>PAUSED</small></div>`;
  const tags=(S.away[s.owner]?' · away, auto-pick':S.auto[s.owner]?' · auto-pick on':'');
  b.innerHTML=`<div class="banner${mine?' me':''}" id="oncard">${UI.avatar(o,mine?52:46)}<div class="bm"><div class="lbl">${mine?"YOU'RE ON THE CLOCK":'ON THE CLOCK'}</div><div class="nm">${mine?'Make your pick, '+esc(o.name):esc(o.name)}${esc(tags)}</div><div class="sb">${sub}</div></div>${cd}</div>`}
function tickClock(){const lc=$('lobbycd');if(lc&&M&&S&&S.status==='lobby')lc.textContent=lobbyCountdown();const el=$('cdv');if(!el||!S)return;const rem=remaining();if(rem==null)return;
  el.firstChild.nodeValue=rem<=0?'0:00':UI.fmtClock(rem);el.classList.toggle('low',rem<(S.warn15?15000:10000));const sm=el.querySelector('small');if(sm)sm.textContent=rem<=0?(S.autoPick?'AUTO-PICKING':"TIME'S UP · waiting"):'PICK CLOCK';
  const sl=F.onClock(S);const wk=sl?S.epoch+':'+sl.n:'';el.classList.toggle('warn',!!(S.warn15&&rem>0&&rem<=15000));
  if(S.warn15&&sl&&rem>0&&rem<=15000&&warnedFor!==wk){warnedFor=wk;if(!isSpec()&&myMid()===sl.owner){vib([200,100,200]);beep();toast('15 seconds left!',3000)}}}
/* ---- lobby ---- */
function lobbyCountdown(){const s=M.settings;if(s.startAt==null)return full8()?'Waiting for the commissioner to press Start':waitTxt();const d=s.startAt-nowSrv();
  if(d>0)return (s.startMode==='auto'?'Auto-start in ':'Scheduled in ')+F.countdownText(d);return s.startMode==='auto'?(full8()?'Starting now…':waitTxt()):(full8()?'Draft time has arrived — waiting for the commissioner to press Start':waitTxt())}
function settingsLine(){const s=M.settings;return [s.type==='snake'?'Snake':'Linear',s.rounds+' teams each',s.clockSecs?s.clockSecs+' sec per pick':'no pick clock',s.autoPick?'auto-pick when time runs out':'waits when time runs out'].join(' · ')}
function orderListHTML(editable){const o=F.effectiveOrder(M,joinedMids());const cm=editable&&commish()&&M.status==='lobby';
  return '<div id="orderlist">'+o.map((mid,i)=>{const m=mg(mid);return `<div class="mrow" data-mid="${esc(mid)}"><span class="no">${i+1}</span>${UI.avatar(m,32)}<div class="grow" style="min-width:0"><div class="nm">${esc(m.name)}${m.mid===myMid()?' <span class="tag mut">you</span>':''}${m.cm?' <span class="tag ok">commissioner</span>':''}${m.away?' <span class="tag pri">away</span>':''}</div><div class="tm2">${esc(m.team)}</div></div>${cm?`<button class="btn sm" data-a="om" data-m="${esc(mid)}" data-d="-1" aria-label="Move up">▲</button><button class="btn sm" data-a="om" data-m="${esc(mid)}" data-d="1" aria-label="Move down">▼</button><span class="handle" data-handle="${esc(mid)}" aria-label="Drag to reorder" role="img">⠿</span>`:''}</div>`}).join('')+'</div>'}
function spinBtn(j){if(F.spinCompleted(M))return '';
  /* every result is saved but the order was never applied (apply failed, or the commissioner's page closed during the wait): finish it, never spin a second time */
  if(spinInfo().done)return `<button class="btn pri grow" data-a="spinfinish" id="spinfinish">Finish setting the order</button>`;
  const st=spinState();const lbl=st==='stale'?'Spin again (last spin didn’t finish)':'Spin the wheel';return `<button class="btn grow" data-a="spinopen" id="spinopen" ${full8()?'':'disabled'}>${lbl}</button>`}
function lobbyView(){const s=M.settings;const j=MG;const N=s.managers;const cm=commish();let tl='';
  if(s.startAt!=null){const l=F.startsLine(s.startAt,TZ,s.tz);tl=`<div style="margin-top:8px"><b style="color:var(--acc)" id="startsline">${esc(l.you)}</b><div class="small mut">${esc(l.utc)}${l.commish?' · '+esc(l.commish):''}</div></div>`}
  const notIn=!WATCH&&!myMid();
  const orderNote=M.orderSet?'Order set by the commissioner. It can change until the draft starts.':(s.orderMode==='random'?'Random — decided when the draft starts. Shown in join order for now.':'The commissioner sets the order before the draft starts.');
  let h=`<div class="card" id="lobbycard"><div class="small mut">LOBBY</div><h2 style="margin:2px 0 2px">${esc(M.name)}</h2><div class="small mut">${esc(settingsLine())}</div>${tl}<div style="margin-top:8px;font-weight:800" id="lobbycd">${esc(lobbyCountdown())}</div></div>`;
  if(notIn)h+=`<div class="card"><b>You haven't joined this league.</b><div class="row" style="margin-top:8px">${F.freeSlots(M,CL).length?`<a class="btn pri grow" id="joinlink" href="${esc(UI.pageUrl('join.html',{l:LID}))}">Join this league</a>`:'<span class="small mut grow">All spots are taken.</span>'}<button class="btn grow" data-a="switch">I'm already in</button></div></div>`;
  h+=`<div class="card" id="mgrs"><div class="row nw"><h3 class="grow" style="margin:0">Managers <span class="mut" id="joinedct">${j.length} of ${N} joined</span></h3>${cm?'<button class="btn sm" data-a="settings" id="editsettings">League settings</button>':''}</div>${full8()?'':`<div class="small" id="waitmgrs" style="margin:4px 0 0;font-weight:800;color:var(--acc)">${esc(waitTxt())}</div>`}<div class="small mut" style="margin:4px 0 6px">${esc(orderNote)}</div>${orderListHTML(true)}`;
  for(let i=j.length;i<N;i++)h+=`<div class="mrow open"><span class="no">${i+1}</span><span class="av" style="width:32px;height:32px;background:var(--card2);color:var(--mut)">+</span><div class="nm">Open spot</div></div>`;
  h+=`</div>`;
  if(cm){h+=`<div class="card"><h3>Draft order</h3><div class="row"><button class="btn grow" data-a="randomize" id="randomize" ${j.length<2?'disabled':''}>Randomize</button>${spinBtn(j)}</div><div class="small mut" style="margin-top:6px">${F.spinCompleted(M)?'The order was set with the wheel. There is only one spin. You can still move people by hand. ':''}Drag a manager by the ⠿ handle, or tap ▲ ▼. The order locks when the draft starts.</div></div>
    <div class="card"><h3>Start</h3><button class="btn pri block" data-a="start" id="startbtn" ${full8()?'':'disabled'} style="margin-top:6px">Start draft</button><div class="small mut" style="margin-top:6px" id="startnote">${full8()?'Everyone is in.':esc(waitTxt())+'. The draft starts only when all '+F.MANAGERS+' managers have joined.'}</div></div>`}
  h+=inviteCard();return h}
function inviteCard(){return `<div class="card" id="invitecard"><h3>Invite managers</h3><div class="row"><button class="btn pri grow" data-a="share" id="shareinvite">Share invite</button><button class="btn grow" data-a="copyrem" id="copyrem">Copy reminder message</button></div><div class="row" style="margin-top:8px"><button class="btn grow" data-a="invite" id="showqr">Links &amp; QR</button></div></div>`}
function reminderMsg(){const s=M.settings;return F.reminderText({name:M.name,startAt:s.startAt,timeLink:UI.pageUrl('time.html',{t:s.startAt||'',n:M.name}),inviteLink:UI.pageUrl('join.html',{l:LID}),rounds:s.rounds,type:s.type,clockSecs:s.clockSecs})}
/* ---- board ---- */
function boardTable(){const cur=F.onClock(S);const O=S.order;const L2=O.length;if(!L2)return'';const mm=myMid();
  let h=`<div class="small mut" style="margin:4px 2px">${S.redraft&&S.redraft.phase==='live'?'Redraft · '+S.realTotal+' pick'+(S.realTotal===1?'':'s')+' (owners who dropped a team pick one for each; others are skipped) · order reverses each round':(S.type==='snake'?'Snake':'Linear')+' draft · '+L2+' managers × '+S.rounds+' rounds = '+S.total+' picks'+(S.type==='snake'?' · order reverses each round':' · same order every round')}</div><div class="bwrap"><table class="board"><thead><tr><th class="rh" scope="col">Rd</th>${O.map(o=>{const m=mg(o);return `<th scope="col" class="${o===mm?'me':''}">${UI.avatar(m,26)}${esc(m.name)}<span class="tn">${esc(m.team)}</span></th>`}).join('')}</tr></thead><tbody>`;
  for(let r=0;r<S.rounds;r++){const rev=S.type==='snake'&&r%2;h+=`<tr><td class="rh">${r+1}<br>${S.type==='snake'?(rev?'←':'→'):''}</td>`;
    for(let c=0;c<L2;c++){const n=r*L2+(rev?L2-1-c:c)+1;const p=S.picks[n-1];const isCur=cur&&cur.n===n;const sk=p?!!p.skip:(F.redraftLive(M)&&F.redraftSkip(M,{round:r+1,owner:O[c]}));h+=`<td data-n="${n}" class="${isCur?'cur':''}${p&&p.owner===mm?' mine':''}${sk?' skip':''}"><span class="pn">${n}</span>${sk?'<span class="dim" title="no drop, no pick">–</span>':p?(p.auto?'<span class="au" title="auto-pick">A</span>':'')+lchip(p.tid,{sm:true,abbr:true,lcls:'bcl'}):`<span class="dim">${isCur?'•':'·'}</span>`}</td>`}h+='</tr>'}
  return h+'</tbody></table></div>'}
function whatsNext(){const cd=F.redraftCountdown(Date.now(),TZ);const rl=M.redraft&&M.redraft.phase==='live';
  const l3=rl?(S.status==='complete'?'The Redraft is complete.':'The Redraft is under way.'):'<b>Redraft, '+esc(F.REDRAFT.asOfLabel)+'</b> · '+esc(cd.text)+(cd.state==='past'?'. Open it from the league site.':'. Each owner may drop up to 2 teams first.');
  return `<div class="card" id="nextcard"><h3 style="margin:0 0 4px">What’s next</h3><ol class="nextlist small"><li id="nx1">${esc(F.NEXT.season)}</li><li id="nx2">${esc(F.NEXT.points)}</li><li id="nx3">${l3}</li></ol></div>`}
function inviteWatchCard(){const u=UI.pageUrl('room.html',{l:LID,watch:1});return `<div class="card" id="watchcard"><h3 style="margin:0 0 4px">Invite friends to watch</h3><div class="small mut">Anyone with this link can watch. They cannot pick.</div><div class="row" style="margin-top:8px"><button class="btn pri grow" data-a="shareu" data-u="${esc(u)}" id="sharewatch">Share</button><button class="btn grow" data-a="copy" data-u="${esc(u)}" id="copywatch">Copy link</button></div></div>`}
const homeTip=()=>`<div class="card small" id="hometip"><b>Save to your home screen.</b> iPhone: tap Share, then Add to Home Screen. Android: open the menu, then Install app.</div>`;
function completeCard(){return `<div class="card" id="donecard"><h3>${S.endedEarly?'Draft ended early':(M.redraft&&M.redraft.phase==='live'?'Redraft complete':'Draft complete')}</h3><div class="small mut">${S.real.length} of ${S.realTotal} picks · the draft is locked.</div>
  <div class="row" style="margin-top:10px"><button class="btn grow" data-a="csv" id="csvbtn">Export CSV</button><button class="btn grow" data-a="json" id="jsonbtn">Export JSON</button></div>
  ${S.endedEarly?'':`<div style="margin-top:8px"><a class="btn block" id="redraftroomlink" href="${esc(UI.pageUrl('redraft.html',{l:LID}))}">Redraft · ${esc(F.REDRAFT.asOfLabel)}</a></div>`}</div>`+whatsNext()+inviteWatchCard()+homeTip()}
function viewBoard(){if(!S)return'';if(S.status==='lobby')return lobbyView();return(S.status==='complete'?completeCard():'')+boardTable()}
/* ---- teams ---- */
let WATCHSET=new Set((()=>{try{return JSON.parse(lsGet(L('watch'))||'[]')}catch(e){return[]}})());
const saveWatch=()=>lsSet(L('watch'),JSON.stringify(Array.from(WATCHSET)));
const TF={q:'',mode:(lsGet('tmode')&&F.TMODES.some(m=>m[0]===lsGet('tmode')))?lsGet('tmode'):'power',hide:lsGet('thide')!=='0',watch:false,queue:false,conf:''};
function viewTeams(s){s=s||'';return `<div class="ctl"><input type="search" id="tq${s}" placeholder="Search team, mascot, conference…" aria-label="Search teams" value="${esc(TF.q)}" autocomplete="off"><label class="sortlbl" for="tmode${s}">Sort &amp; group</label><select id="tmode${s}" class="sortsel" aria-label="Sort and group teams" tabindex="-1">${F.TMODES.map(m=>`<option value="${m[0]}" ${TF.mode===m[0]?'selected':''}>Sort: ${m[1]}</option>`).join('')}</select><div class="pills srt" id="tsort${s}" role="group" aria-label="Sort teams"></div><div class="ffil"><div class="pills tgl" id="tpills${s}"></div><div class="pills cfs" id="tconf${s}" role="group" aria-label="Filter by conference"></div></div></div><div id="tlist${s}"></div>`}
function modeNote(){const m=TF.mode;const n=Object.values(META).filter(x=>x.p).length;
  if(m==='power')return 'Power rank is a rough preseason ranking from our model; '+n+' teams are ranked, the rest show —.';if(m==='tiers')return 'Tiers from power rank: Elite 1–12 · Solid 13–30 · Sleeper 31+ · Unranked.';
  if(m==='seed')return 'Projected 2027 tournament seed (an estimate, not official). — means not modeled.';if(m==='record')return 'Last season’s final overall record (ESPN standings). Best win % first.';if(m==='conf')return 'Conference for 2026-27 (ESPN standings).';return ''}
const SORTCH=[['power','Power rank'],['record','Win %'],['alpha','A–Z'],['conf','Conference'],['seed','Proj. seed'],['tiers','Tiers']].filter(m=>F.TMODES.some(x=>x[0]===m[0]));
let CONFS=null;const confList=()=>{if(!CONFS){const n={};POOL.forEach(t=>{const c=META[t]&&META[t].c;if(c)n[c]=(n[c]||0)+1});CONFS=Object.keys(n).sort((a,b)=>n[b]-n[a]||a.localeCompare(b))}return CONFS};
const updateTeams=()=>['','P'].forEach(updateTeamsIn);
function updateTeamsIn(sfx){const pills=$('tpills'+sfx);if(!pills)return;const qi=$('tq'+sfx);if(qi&&qi.value!==TF.q&&document.activeElement!==qi)qi.value=TF.q;const ms=$('tmode'+sfx);if(ms&&ms.value!==TF.mode)ms.value=TF.mode;
  pills.innerHTML=`<button class="${TF.hide?'on':''}" data-a="thide">Hide drafted</button><button class="${TF.watch?'on':''}" data-a="twatch">⭐ Starred${WATCHSET.size?' ('+WATCHSET.size+')':''}</button><button class="${TF.queue?'on':''}" data-a="tqueue">Queue</button>`;
  const so=$('tsort'+sfx);if(so)so.innerHTML=SORTCH.map(m=>`<button class="${esc(TF.mode===m[0]?'on':'')}" data-a="tsort" data-m="${esc(m[0])}" aria-pressed="${esc(TF.mode===m[0]?'true':'false')}">${esc(m[1])}</button>`).join('');
  const cf=$('tconf'+sfx);if(cf)cf.innerHTML=`<button class="${esc(TF.conf?'':'on')}" data-a="tconf" data-c="" aria-pressed="${esc(TF.conf?'false':'true')}">All conf.</button>`+confList().map(c=>`<button class="${esc(TF.conf===c?'on':'')}" data-a="tconf" data-c="${esc(c)}" aria-pressed="${esc(TF.conf===c?'true':'false')}">${esc(c)}</button>`).join('');
  if(!S){$('tlist'+sfx).innerHTML='';return}
  const mm=myMid();const taken=F.takenMap(S);const q=((S.queues&&S.queues[mm])||[]);
  const groups0=F.teamView({teams:TEAMS,meta:META,pool:POOL,taken,watch:WATCHSET,q:TF.q,mode:TF.mode,hideDrafted:TF.hide,onlyWatch:TF.watch,onlyQueue:TF.queue,queue:q});
  const groups=groups0.map(g=>Object.assign({},g,{tids:TF.conf?g.tids.filter(t=>(META[t]||{}).c===TF.conf):g.tids})).filter(g=>g.tids.length);
  const can=canPick();const s=F.onClock(S);
  const head=can&&s?`<div class="card" style="margin:6px 0;border-color:var(--acc)">${s.owner===mm?"It's <b>your</b> pick — tap a team to draft it.":'Commissioner: picking for <b>'+esc(mg(s.owner).name)+'</b>.'}</div>`:(!isSpec()?`<div class="small mut" style="margin:6px 2px">⭐ saves a team to Starred (this device only); <b>Q</b> adds it to your auto-pick queue.</div>`:`<div class="small mut" style="margin:6px 2px">Spectating. Browse the pool and see who took each team.</div>`);
  const total=groups.reduce((a,g)=>a+g.tids.length,0);
  const emptyMsg=()=>(TF.watch&&!WATCHSET.size)?'No starred teams yet. Tap the ☆ next to a team to save it here.':(TF.queue&&!q.length)?'Your queue is empty. Tap Q+ next to a team to add it.':'No teams match.'+(TF.hide?' (Drafted teams are hidden — tap “Hide drafted” to show them.)':'');
  const row=t=>{const x=TEAMS[t],tk=taken[t],m=META[t]||{};const inq=q.indexOf(t)>=0,w=WATCHSET.has(t);
    const seedv=TF.mode==='seed'?F.rowValue('seed',t,META):'';
    const l2=tk?'<span class="dr">✔ '+esc(mg(tk.owner).name)+(tk.kept?' (kept)':' #'+tk.n)+'</span>':esc([m.c||'',seedv&&seedv!=='—'?'proj. '+seedv:''].filter(Boolean).join(' · '));
    return `<div class="trow${tk?' taken':''}${can&&!tk?' go':''}" ${can&&!tk?`data-a="draftrow" data-t="${esc(t)}"`:''}><button class="wstar${w?' on':''}" data-a="watch" data-t="${esc(t)}" aria-label="${esc((w?'Unstar ':'Star ')+x.name)}">${w?'★':'☆'}</button><span class="rkb" title="Power rank">${m.p?'#'+m.p:'—'}</span>${UI.teamLink(TEAMS[t],chip(t,{wrap:1})+'<small class="cf">'+l2+'</small>','tm')}<div class="tr"><b class="rec">${esc(m.r||'—')}</b><small>2025-26</small></div>${tk||isSpec()?'':`<button class="qbtn${inq?' on':''}" data-a="q" data-t="${esc(t)}" aria-label="${esc(inq?'Remove '+x.name+' from your queue':'Queue '+x.name)}">${inq?'Q✓':'Q+'}</button>`}${tk||!can?'':`<button class="btn pri sm" data-a="draftrow" data-t="${esc(t)}" aria-label="Draft ${esc(x.name)}">Draft</button>`}</div>`};
  $('tlist'+sfx).innerHTML=head+`<div class="tnote"><b>${total} team${total===1?'':'s'}</b> · # = power rank · record = 2025-26 final overall (W-L).${TF.conf?' Showing '+esc(TF.conf)+' only.':''}</div><div class="tnote2">${modeNote()}</div>`+(groups.map(g=>(g.flat?'':`<div class="grp"><span>${esc(g.label)}</span><small>${g.note?esc(g.note)+' · ':''}${g.tids.length} team${g.tids.length===1?'':'s'}</small></div>`)+'<div class="tgrid">'+g.tids.map(row).join('')+'</div>').join('')||'<div class="card mut" id="tempty">'+emptyMsg()+'</div>')+`<div class="small mut" style="margin:6px 2px">${total} team${total===1?'':'s'} shown</div>`}
function openPick(){if(!canPick()){toast('It is not your pick right now.');return}let el=$('pickov'),fresh=false;if(!el){fresh=true;el=document.createElement('div');el.id='pickov';
    /* Escape closes only the team list; nothing is lost (a pick is only made on the confirm sheet, and an in-flight save is never interrupted) */
    el._esc=()=>{if(!busy)closePick()};document.body.appendChild(el)}
  const s=F.onClock(S);el.dataset.n=s.n;el.innerHTML=`<div class="pbox"><div class="phead"><div><b>${s.owner===myMid()?"You're on the clock":'Picking for '+esc(mg(s.owner).name)}</b><small>Pick #${s.n} · Round ${s.round}</small></div><button class="btn sm" data-a="pclose">Close</button></div>${viewTeams('P')}</div>`;updateTeams();if(fresh)UI.dialogIn(el,'Pick a team')}
function closePick(){const el=$('pickov');if(el){UI.dialogOut(el);el.remove()}}
function confirmDraft(tid){if(!S||!canPick())return;const s=F.onClock(S);if(!s)return;const taken=F.takenMap(S);if(taken[tid]){toast('Already taken by '+mg(taken[tid].owner).name);return}
  const x=TEAMS[tid],r=prankOf(tid);const onBehalf=s.owner!==myMid();
  UI.openSheet(`<h2>Draft ${esc(x.name)}?</h2><div style="margin:8px 0">${lchip(tid,{big:true})}</div><div class="small mut">Pick #${s.n} · Round ${s.round}${r?' · power rank #'+r:' · unranked'}</div>${onBehalf?`<div class="alertbar" style="margin-top:8px">Commissioner pick on behalf of <b>${esc(mg(s.owner).name)}</b></div>`:''}<div class="row" style="margin-top:14px"><button class="btn pri grow" style="padding:12px" data-a="confirm" data-t="${esc(tid)}" data-o="${esc(s.owner)}" id="confirmpick">Draft it</button><button class="btn grow" style="padding:12px" data-a="sheetbg">Cancel</button></div>`)}
/* ---- my team ---- */
function viewMy(){if(!S)return'';const O=S.status==='lobby'?joinedMids():S.order;const mm=myMid();const who=viewOwner&&O.indexOf(viewOwner)>=0?viewOwner:(mm||O[0]);
  if(!who)return'<div class="card mut">No managers yet.</div>';const o=mg(who);const mine=(S.roster||S.real).filter(p=>p.owner===who);const isMe=!isSpec()&&who===mm;
  let h=`<div class="opills">${O.map(n=>`<button class="${n===who?'on':''}" data-a="vo" data-m="${esc(n)}">${UI.avatar(mg(n),24)}${esc(mg(n).name)}${n===mm?' (you)':''}</button>`).join('')}</div>`;
  h+=`<div class="card"><div class="row nw">${UI.avatar(o,48)}<div class="grow"><h3 style="margin:0">${esc(o.team)}</h3><div class="mut small">${esc(o.name)} · ${mine.length}/${M.redraft&&M.redraft.phase==='live'?M.redraft.rounds0:M.settings.rounds} teams${S.status==='live'?' · '+(F.picksAway(S,who)===0?'<b style="color:var(--acc)">on the clock now</b>':F.picksAway(S,who)==null?'no picks left':'next pick #'+F.nextPickNo(S,who)+' · '+F.picksAway(S,who)+' away'):''}</div></div></div></div>`;
  h+=mine.length?mine.map(p=>{const note=M.notes?F.pickNote(p.n,prankOf(p.tid)):null;return `<div class="trow"><span class="qn">${p.kept?'•':p.round}</span>${UI.teamLink(TEAMS[p.tid],chip(p.tid,{big:true})+'<small>'+(p.kept?'Kept from the first draft':'Pick #'+p.n+(p.auto?' · auto-pick':''))+' · '+esc(TEAMS[p.tid].mascot||'')+'</small>','tm')}${note?`<span class="tag2 ${note}">${note.toUpperCase()}</span>`:''}</div>`}).join(''):'<div class="card mut">No picks yet.</div>';
  if(isMe){const q=((S.queues&&S.queues[mm])||[]).filter(t=>!F.takenMap(S)[t]);const au=!!S.auto[mm];
    h+=`<div class="card"><h3>My pick queue</h3><label class="sw"><input type="checkbox" data-a="autotog" id="autotog" ${au?'checked':''}> Auto-pick for me</label><div class="small mut" style="margin:6px 0">If the clock runs out (and the league auto-picks), your queue goes first, then the best-ranked team left. Add teams with Q+ in the Teams tab.</div>`;
    h+=q.length?q.map((t,i)=>`<div class="qrow"><span class="qn">${i+1}</span>${lchip(t)}<span style="flex:1"></span><button class="btn sm" data-a="qm" data-t="${esc(t)}" data-d="-1">▲</button><button class="btn sm" data-a="qm" data-t="${esc(t)}" data-d="1">▼</button><button class="btn sm bad" data-a="q" data-t="${esc(t)}">✕</button></div>`).join(''):'<div class="mut small">Queue is empty — falls back to the best power rank.</div>';h+='</div>'}
  return h}
/* ---- chat ---- */
function viewChat(){return `<div class="seg"><button data-a="csub" data-v="chat" class="${chatSub==='chat'?'on':''}">Chat</button><button data-a="csub" data-v="picks" class="${chatSub==='picks'?'on':''}">Pick feed</button></div><div id="chatbody"></div>${chatSub==='chat'?(isSpec()?'<div class="card mut small">Spectators can read. Managers can chat and react.</div>':`<div class="chatbox"><input type="text" id="cin" maxlength="280" placeholder="Message the league…" aria-label="Message the league" enterkeyhint="send" autocomplete="off"><button class="btn pri" data-a="send">Send</button></div>`):''}`}
const REACTS=F.REACTS;
function updateChatView(){const el=$('chatbody');if(!el||tab!=='chat')return;
  if(chatSub==='chat'){const near=(document.documentElement.scrollHeight-window.scrollY-window.innerHeight)<160;const mm=myMid();
    const h=C.msgs.map(m=>{const w=mg(m.who);const rx=Object.keys(m.r||{}).map(e=>`<button class="${(m.r[e]||[]).includes(mm)?'on':''}" data-a="rx" data-id="${esc(m.id)}" data-e="${esc(e)}">${e} ${m.r[e].length}</button>`).join('');
      return `<div class="msg${m.who===mm?' mine':''}"><div class="who">${UI.avatar(w,18)}${esc(w.name)} <span class="mut" style="font-weight:600">${new Date(m.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div><div class="tx">${esc(m.text)}</div><div class="rx">${rx}${isSpec()?'':(reactOpen===m.id?REACTS.map(e=>`<button data-a="rx" data-id="${esc(m.id)}" data-e="${esc(e)}">${e}</button>`).join(''):`<button data-a="ropen" data-id="${esc(m.id)}">＋</button>`)}</div></div>`}).join('');
    el.innerHTML=h||'<div class="card mut">No messages yet. (Picks are not mixed in here — see the Pick feed tab.)</div>';if(near)window.scrollTo(0,document.documentElement.scrollHeight)}
  else{if(!S){el.innerHTML='';return}
    el.innerHTML=S.real.length?S.real.slice().reverse().map(p=>{const m=mg(p.owner);const note=M.notes?F.pickNote(p.n,prankOf(p.tid)):null;return `<div class="card" style="padding:9px 11px"><div class="row nw"><b style="color:var(--acc);min-width:34px">#${p.n}</b>${UI.avatar(m,26)}<div class="grow" style="min-width:0"><b>${esc(m.name)}</b> <span class="small mut">R${p.round}</span></div>${p.auto?'<span class="tag2 auto">AUTO</span>':''}${note?`<span class="tag2 ${note}">${note.toUpperCase()}</span>`:''}</div><div style="margin-top:2px">${lchip(p.tid)}</div></div>`}).join(''):'<div class="card mut">No picks yet.</div>'}}
/* ---- more (admin) ---- */
function linksBlock(){const L1=UI.pageUrl('join.html',{l:LID}),L2=UI.pageUrl('room.html',{l:LID}),L3=UI.pageUrl('room.html',{l:LID,watch:1});
  return `<div class="card" id="linkscard"><h3>Links</h3><div class="small mut">League code <b class="code" style="font-size:16px">${esc(F.formatCode(LID))}</b></div>
  ${[['Invite link',L1],['Draft room',L2],['Spectator (read-only)',L3]].map(x=>`<div style="margin-top:8px"><div class="small mut">${x[0]}</div><div class="urlbox">${esc(x[1])}</div><div class="row"><button class="btn sm" data-a="copy" data-u="${esc(x[1])}">Copy</button><button class="btn sm" data-a="shareu" data-u="${esc(x[1])}">Share</button></div></div>`).join('')}
  <div class="row" style="margin-top:10px"><button class="btn sm" data-a="invite">Show invite QR</button><button class="btn sm" data-a="copyrem">Copy reminder message</button></div></div>`}
function viewMore(){if(!S)return'';const cm=commish();const mm=myMid();const s=M.settings;let h='';
  if(WATCH)h+=`<div class="card"><b>You're watching.</b><div class="small mut" style="margin-top:4px">Spectators can read the board, picks and chat. <a href="${esc(UI.pageUrl('room.html',{l:LID}))}">Open the room as a manager</a>.</div></div>`;
  else if(mm){const m=mg(mm);h+=`<div class="card" id="youcard"><div class="row nw">${UI.avatar(m,46)}<div class="grow"><h3 style="margin:0">${esc(m.team)}</h3><div class="small mut">${esc(m.name)}</div></div></div><div class="row" style="margin-top:10px"><a class="btn sm" id="editprofile" href="${esc(UI.pageUrl('join.html',{l:LID,edit:1}))}">Edit profile &amp; photo</a><button class="btn sm" data-a="switch">Switch who I am</button><button class="btn sm" data-a="copymine">Copy my private link</button></div><div class="small mut" style="margin-top:6px">Your private link opens this team on another phone. Anyone who has it can act as you.</div></div>`}
  else h+=`<div class="card"><b>You haven't picked who you are.</b><div class="row" style="margin-top:8px"><button class="btn pri" data-a="switch">Who are you?</button></div></div>`;
  h+=linksBlock();
  h+=`<div class="card"><h3>League</h3><div class="small mut">${esc(settingsLine())}</div>${s.startAt!=null?`<div class="small" style="margin-top:4px">${esc(F.startsLine(s.startAt,TZ,s.tz).you)}</div><div class="small mut">${esc(F.fmtUtc(s.startAt))}</div>`:''}<div style="margin-top:8px"><a id="leaguehome2" href="${esc(UI.pageUrl('league.html',{l:LID}))}">${S.status==='complete'?'League site</a>':'League site</a> <span class="small mut">— available after the draft</span>'}</div></div>`;
  if(!cm)h+=`<div class="card lockcard" id="lockcard"><h3>Commissioner tools</h3><div class="small mut">Start, pause, undo, order, managers and clock changes need the commissioner link: open it on this phone, or paste it with Unlock. The lock is a friendly one for a friends league, not real security.</div><button class="btn pri" style="margin-top:8px" data-a="unlockui" id="unlockui">Unlock</button></div>`;
  else h+=`<div class="card" id="unlockedcard"><h3>Commissioner tools unlocked</h3><div class="small mut">Unlocked on this device only.</div><div class="row" style="margin-top:8px"><button class="btn sm" data-a="lock">Lock now</button></div></div>`+commishTools();
  if(S.real.length)h+=`<div class="card"><h3>Export</h3><div class="row"><button class="btn sm" data-a="csv">CSV</button><button class="btn sm" data-a="json">JSON</button><a class="btn sm" href="${esc(UI.pageUrl('recap.html',{l:LID}))}">Draft recap</a></div></div>`;
  h+=`<div class="small mut" id="devline" style="padding:8px 2px">${POOL.length} teams available · league v${M.version} · round ${S.epoch} · clock: ${esc(srvInfo)} · code …${esc(LID.slice(-4))}</div>`+UI.buildTag();return h}
function commishTools(){const s=M.settings;let h='';
  h+=`<div class="card" id="controls"><h3>Draft controls</h3><div class="row">`+(S.status==='lobby'?`<button class="btn pri" data-a="start" ${full8()?'':'disabled'}>Start draft</button><button class="btn" data-a="settings">League settings</button>`:'')+
   (S.status==='live'?`<button class="btn" data-a="${S.paused?'resume':'pause'}" id="pausebtn">${S.paused?'Resume':'Pause'}</button>`:'')+(S.real.length&&S.status!=='complete'?`<button class="btn" data-a="undo" id="undobtn">Undo last pick</button>`:'')+
   (S.status==='live'?`<button class="btn bad" data-a="endearly" id="endbtn">End draft early…</button>`:'')+(S.status!=='complete'&&!F.redraftLive(M)&&(S.status==='live'||S.picks.length||M.orderSet)?`<button class="btn bad" data-a="reset" id="resetbtn">Reset draft…</button>`:'')+`</div>${S.status==='complete'?'<div class="small mut" style="margin-top:6px">The draft is complete and locked.</div>':''}</div>`;
  if(S.status!=='complete')h+=`<div class="card" id="clockcard"><h3>Pick clock &amp; missed picks</h3><div class="row"><span class="small mut grow">Time per pick</span><select id="clk">${F.CLOCKS.map(v=>`<option value="${v}" ${s.clockSecs===v?'selected':''}>${v===0?'No clock':v>=120?(v/60)+' min':v+' sec'}</option>`).join('')}</select></div>
   <label class="sw" style="margin-top:10px"><input type="checkbox" id="w15" ${s.warn15?'checked':''}> 15-second warning</label><label class="sw" style="margin-top:8px"><input type="checkbox" id="atime" ${s.autoPick?'checked':''}> Auto-pick when the clock hits 0</label>
   <div class="small mut" style="margin-top:6px">Auto-pick uses the manager's queue first, then the best power rank, then a random team. It goes through the same one-key-per-pick write as a manual pick, so two phones can never double-pick.</div>
   <label class="sw" style="margin-top:8px"><input type="checkbox" id="notes" ${M.notes?'checked':''}> Show pick notes (value / reach tags)</label></div>`;
  if(S.status!=='complete')h+=`<div class="card" id="mgrcard"><h3>Managers</h3>${MG.map(m=>`<div class="mrow"><span class="dot${(PR.recs[m.mid]&&nowSrv()-PR.recs[m.mid].t<F.PRES.onlineMs)||m.mid===myMid()?' on':''}"></span>${UI.avatar(m,30)}<div class="grow" style="min-width:0"><div class="nm">${esc(m.name)}${m.away?' <span class="tag pri">away</span>':''}${m.left?' <span class="tag mut">left</span>':''}</div><div class="tm2">${esc(m.team)}</div></div><button class="btn sm" data-a="mgr" data-m="${esc(m.mid)}">Manage</button></div>`).join('')||'<div class="small mut">Nobody has joined yet.</div>'}</div>`;return h}
function openMgr(mid){const m=mg(mid);const st=S.status;
  UI.openSheet(`<h2>${esc(m.name)}</h2><div class="small mut" style="margin-bottom:8px">${esc(m.team)}</div>
   <div class="stack"><div class="row nw"><input type="text" id="rn_name" maxlength="30" value="${esc(m.name)}" aria-label="Manager name"><button class="btn sm" data-a="rename" data-m="${esc(mid)}" data-f="name">Rename</button></div>
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
  REISSUE_URL=UI.pageUrl('room.html',{l:LID},{as:mid,k:r.k});
  UI.openSheet(`<h2>New link for ${esc(mg(mid).name)}</h2><div class="mut small" style="margin:6px 0 10px">Send this private link to ${esc(mg(mid).name)} only. The old link no longer works. Anyone who has this one can act as them.</div><input type="text" id="reissueurl" readonly value="${esc(REISSUE_URL)}" aria-label="New private link" style="margin-bottom:8px"><div class="row"><button class="btn pri grow" style="padding:12px" data-a="reissuecopy" id="reissuecopy">Copy link</button><button class="btn grow" style="padding:12px" data-a="sheetbg">Done</button></div>`)}
function openSettings(){const s=M.settings;const o=(arr,cur,fn)=>arr.map(v=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${fn?fn(v):v}</option>`).join('');
  UI.openSheet(`<h2>League settings</h2><div class="small mut" style="margin-bottom:8px">Editable until the draft starts.</div><div class="stack">
   <div><label class="f" for="s_name">League name</label><input type="text" id="s_name" maxlength="40" value="${esc(M.name)}"></div>
   <div class="row nw"><div class="grow"><div class="f">Managers</div><div id="s_mgrs_fixed" class="fixedval">${s.managers} (fixed)</div></div><div class="grow"><label class="f" for="s_rounds">Teams each</label><select id="s_rounds" style="width:100%">${o(Array.from({length:Math.max(s.rounds,F.maxRounds(s.managers,POOL.length))},(_,i)=>i+1),s.rounds)}</select></div></div>
   <div class="row nw"><div class="grow"><label class="f" for="s_type">Draft style</label><select id="s_type" style="width:100%">${o(['snake','linear'],s.type,v=>v==='snake'?'Snake':'Linear')}</select></div><div class="grow"><label class="f" for="s_order">Who picks first</label><select id="s_order" style="width:100%">${o(['random','manual'],s.orderMode,v=>v==='random'?'Random':'I set the order')}</select></div></div>
   <div><label class="f" for="s_when">Draft time (your time, ${esc(F.tzCity(TZ))}) — empty means “I press Start”</label><input type="datetime-local" id="s_when" value="${s.startAt!=null?F.localInputValue(s.startAt,TZ):''}"></div>
   <div class="row nw"><div class="grow"><label class="f" for="s_start">At the set time</label><select id="s_start" style="width:100%">${o(['manual','auto'],s.startMode,v=>v==='manual'?'I press Start':'Start by itself')}</select></div><div class="grow"><label class="f" for="s_clock">Pick clock</label><select id="s_clock" style="width:100%">${o(F.CLOCKS,s.clockSecs,v=>v===0?'No clock':v>=120?(v/60)+' min':v+' sec')}</select></div></div>
   <div><label class="f" for="s_auto">If time runs out</label><select id="s_auto" style="width:100%">${o(['true','false'],String(s.autoPick),v=>v==='true'?'Auto-pick for them':'Wait for them')}</select></div>
   <div class="err" id="s_err" role="alert"></div><div class="row"><button class="btn pri grow" data-a="savesettings" id="savesettings">Save</button><button class="btn grow" data-a="sheetbg">Cancel</button></div></div>`)}
async function saveSettings(){const g=id=>$(id).value;const s=M.settings;const patch={rounds:+g('s_rounds'),type:g('s_type'),orderMode:g('s_order'),clockSecs:+g('s_clock'),autoPick:g('s_auto')==='true'};
  const nm=g('s_name');if(F.clean(nm)!==M.name)patch.name=nm;const w=g('s_when');const wv=w?F.parseLocalInput(w,TZ):null;if(wv!==s.startAt)patch.startAt=wv;
  const finalAt='startAt' in patch?patch.startAt:s.startAt;patch.startMode=finalAt==null?'manual':g('s_start');
  const r=await mutateMeta(m=>F.mSettings(m,patch,F.joinedList(m,CL),POOL.length,nowSrv()),(chk,ns)=>JSON.stringify(chk.settings)===JSON.stringify(ns.settings)&&chk.name===ns.name);
  if(!r.ok){$('s_err').textContent=r.msg;return}UI.closeSheet();toast('Settings saved')}
/* ---- confirm + unlock sheets ---- */
let confirmCb=null;
function askConfirm(o){confirmCb=o.onYes;UI.openSheet(`<h2>${esc(o.title)}</h2><div class="mut small" style="margin:6px 0 10px">${o.body}</div>${o.typed?`<input type="text" id="cft" placeholder='Type ${esc(o.typed)} to confirm' autocomplete="off" autocapitalize="characters"><div class="err" id="cferr" role="alert"></div>`:''}<div class="row" style="margin-top:10px"><button class="btn ${o.danger?'bad':'pri'} grow" style="padding:12px" data-a="cfyes" id="cfyes" ${o.typed?`data-typed="${esc(o.typed)}"`:''}>${esc(o.label)}</button><button class="btn grow" style="padding:12px" data-a="sheetbg">Cancel</button></div>`)}
function showUnlock(){UI.openSheet(`<h2>Commissioner unlock</h2><div class="mut small">Paste the commissioner link you saved when you created the league (or just its 32-character code).</div><input type="password" id="pin" placeholder="commissioner link or code" autocomplete="off" style="margin:10px 0 4px"><div class="err" id="pinerr" role="alert"></div><div class="row"><button class="btn pri grow" style="padding:12px" data-a="dounlock" id="dounlock">Unlock</button><button class="btn grow" style="padding:12px" data-a="sheetbg">Cancel</button></div><div class="small mut" style="margin-top:8px">Only a salted hash of the secret is stored in the league, so it cannot be recovered. This is a friendly lock, not real security.</div>`);setTimeout(()=>{const i=$('pin');if(i)i.focus()},50)}
function closeIdentity(){const o=document.querySelector('#overlay .ov');$('overlay').innerHTML='';if(o)UI.dialogOut(o)}
function showIdentity(){$('overlay').innerHTML=`<div class="ov"><h2 id="idh">Who are you?</h2><div class="mut small" style="text-align:center;max-width:340px">No accounts. To play as a manager, open your private manager link (it was shown when you joined), or paste it here. A name alone is not enough: the link holds a secret.</div>
  <input type="password" id="ilink" placeholder="private manager link" autocomplete="off" style="margin:10px 0 4px;max-width:340px"><div class="err" id="ilinkerr" role="alert" style="max-width:340px"></div><button class="btn pri" data-a="ilinkgo" id="ilinkgo">Continue as that manager</button>
  <a class="btn" id="watchbtn" style="margin-top:8px" href="${esc(UI.pageUrl('room.html',{l:LID,watch:1}))}">Just watching (spectator)</a>${S&&S.status==='lobby'&&F.freeSlots(M,CL).length?`<a class="btn pri" style="margin-top:8px" href="${esc(UI.pageUrl('join.html',{l:LID}))}">Join this league</a>`:''}<button class="link" style="margin-top:12px" data-a="idclose">Close</button></div>`;const ov=document.querySelector('#overlay .ov');if(ov){ov.setAttribute('aria-labelledby','idh');ov._esc=()=>ACT.idclose();UI.dialogIn(ov,'Who are you?')}}
/* ---- view plumbing ---- */
function renderView(){const v=$('view');if(notFound){v.innerHTML=`<div class="card" id="nf"><h2>League not found</h2><p class="small mut">No league exists for code ${esc(F.formatCode(LID))}. Check the link, or <a href="index.html">go home</a>.</p></div>`;return}
  if(!S){v.innerHTML='';return}
  if(tab==='teams'){if(!$('tq')){v.innerHTML=viewTeams()}updateTeams();return}
  if(tab==='chat'){if(!$('chatbody')){v.innerHTML=viewChat()}updateChatView();return}
  const old=tab==='board'?document.querySelector('.bwrap'):null,sl=old?old.scrollLeft:null,st=old?old.scrollTop:null;
  if(drag)return;v.innerHTML=tab==='board'?viewBoard():tab==='my'?viewMy():viewMore();if(tab==='board')centerBoard(sl,st)}
let boardCenteredFor=-1;
function centerBoard(sl,st){const w=document.querySelector('.bwrap');if(!w||!S)return;const key=S.picks.length;if(sl!=null&&key===boardCenteredFor){w.scrollLeft=sl;w.scrollTop=st;return}
  boardCenteredFor=key;const c=w.querySelector('td.cur')||w.querySelector('td.mine');if(c){w.scrollLeft=Math.max(0,c.offsetLeft-34-(w.clientWidth-34)/2+c.offsetWidth/2);w.scrollTop=Math.max(0,c.offsetTop-w.clientHeight/2)}}
function renderAll(){document.body.dataset.tab=tab;renderTop();renderBanner();renderTabs();renderView();renderPresence();updateTitle();
  if(resumeErr&&$('view')&&S)$('view').insertAdjacentHTML('afterbegin',`<div class="cflict" id="resumeerr">${esc(resumeErr)}</div>`)}
function setTab(t){tab=t;document.body.dataset.tab=t;lsSet(L('tab'),t);$('view').innerHTML='';if(t==='chat'){seenChat=C.msgs.length;lsSet(L('seenChat'),String(seenChat))}renderTabs();renderView();renderPresence();window.scrollTo(0,0)}
/* ---- drag to reorder (lobby, commissioner) ---- */
let drag=null;
document.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-handle]');if(!h||!commish())return;e.preventDefault();const row=h.closest('.mrow');const rows=Array.from(document.querySelectorAll('#orderlist .mrow'));
  drag={mid:h.dataset.handle,row,rows,start:e.clientY,idx:rows.indexOf(row),h:row.getBoundingClientRect().height,to:rows.indexOf(row)};row.classList.add('drag');if(h.setPointerCapture)h.setPointerCapture(e.pointerId)});
document.addEventListener('pointermove',e=>{if(!drag)return;const dy=e.clientY-drag.start;drag.row.style.transform='translateY('+dy+'px)';drag.row.style.position='relative';drag.row.style.zIndex=5;drag.to=Math.max(0,Math.min(drag.rows.length-1,drag.idx+Math.round(dy/drag.h)))});
document.addEventListener('pointerup',async()=>{if(!drag)return;const d=drag;drag=null;d.row.style.transform='';d.row.classList.remove('drag');
  if(d.to!==d.idx){const cur=F.effectiveOrder(M,joinedMids());const no=F.moveTo(cur,d.mid,d.to);if(no)await actOrderSet(no)}else renderView()});
/* ===================== events ===================== */
const shareU=(u,t)=>UI.share({title:M.name,text:t||'Join '+M.name,url:u});
const ACT={
 tab:el=>setTab(el.dataset.t),switch:()=>{identityShown=true;showIdentity()},idclose:()=>{identityShown=false;closeIdentity()},
 ilinkgo:async()=>{const v=($('ilink')||{}).value||'';const x=F.extractMgr(v);const e=$('ilinkerr');if(!x){if(e)e.textContent='That does not look like a private manager link.';return}
   const r=await adoptManager(x.mid,x.k);if(r===null){if(e)e.textContent='That manager is not in this league (yet). Try again in a moment.';return}if(r){if(e)e.textContent=r;return}closeIdentity();identityShown=false;viewOwner=null;renderAll();kick();presBeat()},
 invite:()=>showInvite(),share:()=>shareU(UI.pageUrl('join.html',{l:LID}),'Join '+M.name+' on Fantasy BBALL NCAA'),shareu:el=>shareU(el.dataset.u),copy:el=>UI.copy(el.dataset.u,'Copied'),
 copyrem:()=>UI.copy(reminderMsg(),'Reminder message copied'),
 copymine:()=>{if(me&&ME_OK&&me.k)UI.copy(UI.pageUrl('room.html',{l:LID},{as:me.mid,k:me.k}),'Private link copied');else toast('This phone has no private link. Open the link you were given when you joined.')},
 popen:()=>openPick(),pclose:()=>closePick(),
 tsort:el=>{TF.mode=el.dataset.m;lsSet('tmode',TF.mode);updateTeams()},tconf:el=>{TF.conf=el.dataset.c||'';updateTeams()},thide:()=>{TF.hide=!TF.hide;lsSet('thide',TF.hide?'1':'0');updateTeams()},twatch:()=>{TF.watch=!TF.watch;updateTeams()},tqueue:()=>{TF.queue=!TF.queue;updateTeams()},
 watch:(el,e)=>{e.stopPropagation();const t=el.dataset.t;if(WATCHSET.has(t))WATCHSET.delete(t);else WATCHSET.add(t);saveWatch();updateTeams()},
 draftrow:el=>confirmDraft(el.dataset.t),confirm:async el=>{UI.closeSheet();await doPick(el.dataset.t,el.dataset.o)},
 q:(el,e)=>{e.stopPropagation();const mm=myMid();if(mm)actQueue(mm,el.dataset.t)},qm:el=>actQMove(myMid(),el.dataset.t,+el.dataset.d),autotog:el=>actAuto(myMid(),el.checked),
 vo:el=>{viewOwner=el.dataset.m;renderView()},csub:el=>{chatSub=el.dataset.v;$('view').innerHTML='';renderView()},
 send:()=>{const i=$('cin');if(!i)return;const t=i.value;i.value='';sendMsg(t);i.focus({preventScroll:true})},rx:el=>{reactOpen=null;react(el.dataset.id,el.dataset.e)},ropen:el=>{reactOpen=el.dataset.id;updateChatView()},
 unlockui:()=>showUnlock(),lock:()=>{lsSet('cm.'+LID,null);CM_KEY='';CM_OK=false;toast('Locked');renderAll()},
 dounlock:async()=>{const r=await actUnlock(($('pin')||{}).value||'');if(r.ok){UI.closeSheet();toast('Unlocked on this device');renderAll()}else{const e=$('pinerr');if(e)e.textContent=r.msg;const i=$('pin');if(i){i.value='';i.focus()}}},
 cfyes:el=>{const need=el.dataset.typed;if(need){const v=(($('cft')||{}).value||'').trim().toUpperCase();if(v!==need){const e=$('cferr');if(e)e.textContent='Type '+need+' exactly to continue.';return}}const cb=confirmCb;confirmCb=null;UI.closeSheet();if(cb)cb()},
 catchup:()=>{if(!needUnlock())return;if(M.status==='lobby')return actStart(false);const sl=F.onClock(S);if(sl){autoPlan={n:sl.n,at:0};autoTick()}},
 start:()=>{if(!needUnlock())return;if(!full8()){toast(waitTxt()+'. The draft needs all '+F.MANAGERS+' managers.');return}
   askConfirm({title:'Start the draft?',body:'The order locks when you start'+(M.orderSet?'.':' and is '+(M.settings.orderMode==='random'?'shuffled randomly.':'taken as listed.')),label:'Start draft',onYes:()=>actStart(false)})},
 pause:()=>actPause(true),resume:()=>actPause(false),
 undo:()=>{if(!needUnlock())return;const l=S.real[S.real.length-1];askConfirm({title:'Undo the last pick?',body:l?('Pick #'+l.n+' ('+esc(tn(l.tid))+' by '+esc(mg(l.owner).name)+') will be removed and the clock restarts.'):'',label:'Undo pick',danger:true,onYes:()=>actUndo(l?{n:l.n,id:l.id}:null)})},
 endearly:()=>{if(!needUnlock())return;askConfirm({title:'End the draft early?',body:'The draft is marked <b>complete and locked</b> with the '+S.real.length+' picks made so far ('+(S.realTotal-S.real.length)+' left empty). This cannot be undone.',label:'End draft',typed:'END',danger:true,onYes:actEnd})},
 reset:()=>{if(!needUnlock())return;askConfirm({title:'Reset the draft?',body:'This <b>clears every pick</b> and returns the league to the lobby. Managers stay joined and the commissioner link keeps working. Old pick records stay on the server but are never used again.',label:'Reset draft',typed:'RESET',danger:true,onYes:actReset})},
 randomize:()=>{if(!needUnlock())return;if(M.orderSet){askConfirm({title:'Randomize the order again?',body:'The current order is replaced by a new random one.',label:'Randomize',onYes:actRandomize})}else actRandomize()},
 om:el=>actOrderMove(el.dataset.m,+el.dataset.d),settings:()=>{if(needUnlock())openSettings()},savesettings:()=>saveSettings(),
 mgr:el=>{if(needUnlock())openMgr(el.dataset.m)},
 reissue:el=>{const mid=el.dataset.m;if(!needUnlock())return;UI.closeSheet();askConfirm({title:'Re-issue link for '+mg(mid).name+'?',body:'This makes a <b>new private link</b> for this seat. Their old link (and any phone using it) stops working. Send the new link only to '+esc(mg(mid).name)+'.',label:'Make new link',onYes:()=>actReissue(mid)})},reissuecopy:()=>{if(REISSUE_URL)UI.copy(REISSUE_URL,'Private link copied')},
 rename:async el=>{const mid=el.dataset.m;const f=el.dataset.f;const v=($(f==='name'?'rn_name':'rn_team')||{}).value;const r=await actRename(mid,{[f]:v});if(r&&r.ok)UI.closeSheet()},
 away:async el=>{await actAway(el.dataset.m,true);UI.closeSheet()},unaway:async el=>{await actAway(el.dataset.m,false);UI.closeSheet()},
 removemgr:el=>{const mid=el.dataset.m;UI.closeSheet();askConfirm({title:'Remove '+mg(mid).name+'?',body:M.status==='lobby'?'They lose their spot and it opens up again. They can rejoin with the invite link.':'The draft is under way, so they stay on the board and auto-pick makes their remaining picks.',label:'Remove',danger:true,onYes:()=>actRemove(mid)})},
 spinopen:()=>{if(needUnlock()){WH.open=true;renderWheel()}},spinfinish:()=>finishSpin(),wclose:()=>{WH.open=false;WH.all=false;renderWheel()},spinnext:()=>spinOne(),respin:()=>respin(),spinall:()=>spinAll(),spinstop:()=>{WH.all=false;renderWheel()},
 csv:()=>UI.download((M.name.replace(/[^a-z0-9]+/gi,'-')||'league')+'-draft.csv',F.toCSV(S,MG,TEAMS,META),'text/csv'),
 json:()=>UI.download((M.name.replace(/[^a-z0-9]+/gi,'-')||'league')+'-draft.json',JSON.stringify(F.toJSONExport(S,MG,TEAMS,META,M),null,2),'application/json')
};
function showInvite(){const url=UI.pageUrl('join.html',{l:LID});UI.openSheet(`<h2>Invite managers</h2><div class="small mut">Scan, tap Share, or copy the link. League code: <b class="code" style="font-size:15px">${esc(F.formatCode(LID))}</b></div><div style="text-align:center;margin:10px 0"><div class="qr">${UI.qrSvg(url)}</div></div><div class="urlbox">${esc(url)}</div>
  <div class="row"><button class="btn pri grow" data-a="share">Share…</button><button class="btn grow" data-a="copy" data-u="${esc(url)}">Copy link</button><button class="btn grow" data-a="copyrem">Copy reminder</button><button class="btn grow" data-a="sheetbg">Close</button></div>`)}
UI.bind(ACT);
document.addEventListener('change',e=>{const el=e.target;if(el.id==='w15')actFlags({warn15:el.checked});if(el.id==='atime')actFlags({autoPick:el.checked});if(el.id==='notes')actFlags({notes:el.checked});if(el.id==='clk')actClock(+el.value);
  if(el.id==='tmode'||el.id==='tmodeP'){TF.mode=el.value;lsSet('tmode',TF.mode);updateTeams()}});
document.addEventListener('input',e=>{if(e.target.id==='tq'||e.target.id==='tqP'){TF.q=e.target.value;updateTeams()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='pin'){e.preventDefault();ACT.dounlock()}if(e.key==='Enter'&&e.target.id==='ilink'){e.preventDefault();ACT.ilinkgo()}if(e.key==='Enter'&&e.target.id==='cin'){e.preventDefault();ACT.send()}});
window.addEventListener('online',()=>{failCount=0;loop()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){loop();updateTitle();renderBanner();presBeat();syncTime()}else updateTitle();presTick()});
window.addEventListener('focus',()=>{kick();syncTime()});window.addEventListener('pageshow',kick);
/* the Send button must not take focus from the message box (keeps the phone keyboard open) */
document.addEventListener('mousedown',e=>{if(e.target.closest&&e.target.closest('[data-a=send]'))e.preventDefault()});
let lastTick=Date.now(),presT=0;
setInterval(()=>{const now=Date.now();if(now-lastTick>6000&&!document.hidden){kick();syncTime()}lastTick=now;if(now-srvSync>300000)syncTime();if(++presT%10===0)renderPresence();tickClock();wheelTick();autoTick();autoStartTick();renderConn()},1000);
/* ===================== boot ===================== */
(function boot(){loadLogCache();renderAll();syncTime();UI.registerSW();loop();presBeat();presTick();
  const t=setInterval(()=>{if(!M||!S)return;clearInterval(t);if(authReady&&!WATCH&&!myMid()&&!removed()&&!KFRAG&&(S.status!=='lobby'||me)&&!identityShown&&MG.length){identityShown=true;showIdentity()}},400)})();
})();
