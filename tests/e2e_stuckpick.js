/* Stuck pick slot (live-league incident: the read of pick slot #36 answered HTTP 500 for ever).
   Pick-slot keys have alternates <key>-a1..-a3; reads retry then fall back; the ORIGINAL key wins when it is readable and not empty, else the lowest alternate with a value; writes go to the alternate when the original keeps failing.
   Uses the mock's test-only fault options (/__cfg?fail=REGEX&failm=GET|POST&failn=N). Never touches a real store.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_stuckpick.js   (APP / API env; SHOTDIR=/path saves screenshots) */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;const SD=process.env.SHOTDIR;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}};
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const cfg=q=>fetch(API.replace('/api/data/','')+'/__cfg?'+q).then(r=>r.text());const dump=k=>fetch(API.replace('/api/data/','')+'/__dump/'+encodeURIComponent(k)).then(r=>r.text());
const stats=()=>fetch(API.replace('/api/data/','')+'/__stats').then(r=>r.json());
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const click=async(P,sel)=>{await P.page.waitForSelector(sel,{visible:true,timeout:20000});await P.page.$eval(sel,e=>e.click())};
const txt=(P,sel)=>P.page.$eval(sel,e=>e.innerText).catch(()=>null);
const open=async(name,id,hash,opt,watch)=>{const P=await L.phone(name,opt||{});await P.page.setBypassServiceWorker(true);await P.page.goto(`${APP}/room.html?l=${id}${watch?'&watch=1':''}${hash||''}`,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#banner',{timeout:25000}).catch(()=>{});await sleep(1500);return P};
/* a live league with 35 of 64 picks saved (8 managers x 8 rounds); pick #36 is on the clock */
async function mk(){await cfg('clear=1&failm=&failn=');const id=await seed(API,{managers:8,rounds:8,live:true,picksMade:35});const I=seed.info;const K=F.Keys(id);const meta=JSON.parse(await dump(K.meta));const s36=F.slotAt(meta.order,36,meta.settings.type,meta.settings.rounds);const mi=I.managers.findIndex(m=>m.id===s36.owner);const s37=F.slotAt(meta.order,37,meta.settings.type,meta.settings.rounds);const mj=I.managers.findIndex(m=>m.id===s37.owner);return{id,I,K,meta,on36:mi,on37:mj}}
const pickUI=async(P)=>{await click(P,'[data-a=tab][data-t=teams]');await sleep(700);await P.page.waitForSelector('#tlist [data-a=draftrow]',{timeout:20000});await P.page.$eval('#tlist [data-a=draftrow]',e=>e.click());await click(P,'#confirmpick');};
const entryOf=async k=>{const t=await dump(k);return t?F.parseEntry(t):null};
const boardCount=P=>P.page.evaluate(()=>[...document.querySelectorAll('.board td[data-n]')].filter(td=>td.querySelector('.chip,a.tlink')).length);
const leagueCount=async(id,page)=>{await page.goto(`${APP}/recap.html?l=${id}`,{waitUntil:'domcontentloaded'});await page.waitForSelector('#rapp,#app,.card',{timeout:20000});await sleep(800);return page.evaluate(async id=>{const d=await FBNLeague.load(id,{pool:(window.T&&T.POOL)||undefined});return d.state?d.state.picks.length:-1},id)};
(async()=>{try{
const sl=k=>fetch(API.replace('/api/data/','')+'/__cfg?fail='+k);
/* ---------- A. slot 36 persistently 500 (read and write); manager on the clock picks ---------- */
{let L1=await mk();const key36=L1.K.pick(1,36),key37=L1.K.pick(1,37),alt1=key36+'-a1';ok('seed: 35 picks saved, #36 and #37 empty',!!await dump(L1.K.pick(1,35))&&!await dump(key36)&&!await dump(key37));
  await cfg('fail='+encodeURIComponent('-e1-p36$')+'&code=500');
  const P=await open('mgr',L1.id,'#as='+L1.I.managers[L1.on36].id+'&k='+L1.I.managers[L1.on36].k);
  const bar=await waitFor(()=>P.page.$('#stuckbar'),25000);ok('A: the "Pick stuck" banner appears while slot 36 cannot be read',!!bar&&/Pick stuck/.test(await txt(P,'#stuckbar')||'')&&/#36/.test(await txt(P,'#stuckbar')||''),await txt(P,'#stuckbar'));
  const bt=await P.page.$$eval('#stuckbar button',b=>b.map(x=>({t:x.textContent,h:Math.round(x.getBoundingClientRect().height*10)/10})));ok('A: banner buttons are 44 px; a manager (not the commissioner) gets "Try again now" only',bt.length===1&&bt[0].h>=43.9&&/Try again/.test(bt[0].t),bt);
  ok('A: banner wording has no money/betting words',!/bet|wager|money|prize|\$|cash|odds/i.test(await txt(P,'#stuckbar')||''));
  if(SD){await P.page.screenshot({path:`${SD}/stuck-390-banner-manager.png`})}
  const b36=await boardCount(P);
  await pickUI(P);const landed=await waitFor(async()=>!!await dump(alt1),25000);
  ok('A: the manager\'s pick is saved to the alternate key (-a1) and not to the broken key',landed&&!await dump(key36),{alt:await dump(alt1)});
  const e36=await entryOf(alt1);ok('A: the saved entry is pick #36 by the manager on the clock',e36&&e36.n===36&&e36.owner===L1.I.managers[L1.on36].id,e36);
  ok('A: the banner clears once the pick is saved',await waitFor(async()=>!(await P.page.$('#stuckbar')),20000));
  await P.page.$eval('[data-a=tab][data-t=board]',e=>e.click());await sleep(800);
  ok('A: the board shows all 36 picks (35 + the alternate)',await waitFor(async()=>(await boardCount(P))===36,15000),await boardCount(P));
  /* a second device (spectator, fresh load) sees pick 36 from the alternate and no banner */
  const W=await open('spec',L1.id,'',{},true);await W.page.$eval('[data-a=tab][data-t=board]',e=>e.click());await sleep(1000);
  ok('A: a fresh device (watching) shows 36 picks and no banner',await waitFor(async()=>(await boardCount(W))===36,20000)&&!(await W.page.$('#stuckbar')),await boardCount(W));
  /* pick #37 by the next manager works (its own key is fine) */
  const P2=await open('mgr2',L1.id,'#as='+L1.I.managers[L1.on37].id+'&k='+L1.I.managers[L1.on37].k);
  ok('A: pick #37 is on the clock once #36 is held by the alternate',await waitFor(async()=>/Make your pick/.test(await txt(P2,'#banner')||''),25000),await txt(P2,'#banner'));
  await pickUI(P2);const l37=await waitFor(async()=>!!await dump(key37),25000);const e37=await entryOf(key37);
  ok('A: pick #37 saves to its own original key (only the stuck slot uses an alternate)',l37&&e37&&e37.n===37&&!await dump(key37+'-a1'),e37);
  await P2.page.$eval('[data-a=tab][data-t=board]',e=>e.click());await sleep(800);
  ok('A: the board shows 37 picks',await waitFor(async()=>(await boardCount(P2))===37,15000),await boardCount(P2));
  const W2=await L.phone('rc');await W2.page.setBypassServiceWorker(true);
  ok('A: the League loader (recap / redraft / league pages) counts 37 picks',(await leagueCount(L1.id,W2.page))===37);
  await W2.page.goto(`${APP}/redraft.html?l=${L1.id}`,{waitUntil:'domcontentloaded'});await sleep(1500);
  const rdc=await W2.page.evaluate(async id=>{const d=await FBNLeague.load(id,{pool:(window.T&&T.POOL)||undefined});return d.state?d.state.picks.length:-1},L1.id);ok('A: the Redraft page loader counts 37 picks',rdc===37,rdc);
  await W2.page.goto(`${APP}/recap.html?l=${L1.id}`,{waitUntil:'domcontentloaded'});await sleep(2500);
  ok('A: the recap page shows "37 of 64 picks"',/37 of 64 picks/.test(await W2.page.evaluate(()=>document.body.innerText)),(await W2.page.evaluate(()=>document.body.innerText.match(/\d+ of \d+ picks/))||[])[0]);
  ok('A: no page errors',P.errs.length+P2.errs.length+W.errs.length+W2.errs.length===0,[P.errs,P2.errs,W.errs,W2.errs]);
  /* ---------- C. the original key recovers later: precedence ---------- */
  await cfg('clear=1');
  const orig36=JSON.parse(JSON.stringify(e36));
  const probe=()=>W2.page.evaluate(async k=>{Store.retryNow();return await Store.get(k)},key36);
  ok('C: original recovered but EMPTY -> the alternate still counts (slot 36 resolves to the alternate value)',F.parseEntry(await probe())&&F.parseEntry(await probe()).id===orig36.id);
  const other=F.makeEntry(36,L1.I.managers[L1.on36].id,'duke',{now:Date.now(),epoch:1,writer:'late',by:'owner',prev:(await entryOf(L1.K.pick(1,35))).id});
  await post(key36,other);await sleep(300);
  const got=F.parseEntry(await probe());ok('C: original recovered and holding a value -> the ORIGINAL key wins',got&&got.id===other.id,got&&got.id);
  const still=await dump(alt1);ok('C: nothing in the alternate was deleted or changed',!!still&&F.parseEntry(still).id===orig36.id);
  for(const p of [P,P2,W,W2])await p.close()}
/* ---------- B. commissioner Force a pick while slot 36 is stuck ---------- */
{let L1=await mk();const key36=L1.K.pick(1,36),alt1=key36+'-a1';await cfg('fail='+encodeURIComponent('-e1-p36$')+'&code=500');
  const C=await open('cm',L1.id,'#cm='+L1.I.cmSecret);const fb=await waitFor(()=>C.page.$('#forcepick'),30000);
  ok('B: the commissioner sees "Force a pick for <manager>" in the Pick stuck banner',!!fb,await txt(C,'#banner'));
  if(SD&&fb){await C.page.screenshot({path:`${SD}/stuck-390-banner-host.png`})}
  const hb=await C.page.$$eval('#stuckbar button',b=>b.map(x=>Math.round(x.getBoundingClientRect().height*10)/10));ok('B: host controls are 44 px high',hb.length===2&&hb.every(h=>h>=43.9),hb);
  await C.page.$eval('#forcepick',e=>e.click());const landed=await waitFor(async()=>!!await dump(alt1),30000);const e36=landed?await entryOf(alt1):null;
  ok('B: Force saves pick #36 through the alternate key for the manager on the clock (by commish)',landed&&e36&&e36.n===36&&e36.owner===L1.I.managers[L1.on36].id&&e36.by==='commish'&&!await dump(key36),e36);
  ok('B: the banner clears after the forced pick',await waitFor(async()=>!(await C.page.$('#stuckbar')),20000));
  await C.close()}
/* ---------- D. transient 500 on the read (fails twice, then fine): retries, no alternate, no banner ---------- */
{let L1=await mk();const key36=L1.K.pick(1,36);const mgr=L1.I.managers[L1.on36];
  const P=await L.phone('mgrD');await P.page.setBypassServiceWorker(true);await P.page.evaluateOnNewDocument(()=>{window.__stuckSeen=false;document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{if(document.getElementById('stuckbar'))window.__stuckSeen=true}).observe(document.documentElement,{childList:true,subtree:true})})});
  await cfg('fail='+encodeURIComponent('-e1-p36$')+'&code=500&failm=GET&failn=2');
  await P.page.goto(`${APP}/room.html?l=${L1.id}#as=${mgr.id}&k=${mgr.k}`,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#banner',{timeout:25000});await sleep(4500);
  ok('D: it waited out two failed reads: the banner shows pick #36 on the clock',/Make your pick/.test(await txt(P,'#banner')||''),await txt(P,'#banner'));
  ok('D: no "Pick stuck" banner for a transient failure',!(await P.page.evaluate(()=>window.__stuckSeen)));
  await pickUI(P);const landed=await waitFor(async()=>!!await dump(key36),25000);const st=await stats();
  ok('D: the pick lands in the ORIGINAL key, the alternate is never used',landed&&!await dump(key36+'-a1')&&!st.byKey[key36+'-a1'],st.byKey);
  ok('D: no page errors',P.errs.length===0,P.errs);await P.close()}
/* ---------- E. writes fail (5xx) but reads are fine: the pick goes to the alternate, then resolves ---------- */
{let L1=await mk();const key36=L1.K.pick(1,36),alt1=key36+'-a1';const mgr=L1.I.managers[L1.on36];await cfg('fail='+encodeURIComponent('-e1-p36$')+'&code=503&failm=POST');
  const P=await open('mgrE',L1.id,'#as='+mgr.id+'&k='+mgr.k);ok('E: reading is fine, so no banner yet',!(await P.page.$('#stuckbar')));
  await pickUI(P);const landed=await waitFor(async()=>!!await dump(alt1),30000);ok('E: write 503 on the original -> saved to the alternate after retries; original untouched',landed&&!await dump(key36));
  await P.page.$eval('[data-a=tab][data-t=board]',e=>e.click());await sleep(800);ok('E: the board counts the pick (original reads empty, the alternate is consulted)',await waitFor(async()=>(await boardCount(P))===36,15000),await boardCount(P));
  ok('E: the retries were made (3 tries on the original before the alternate)',(await stats()).failed>=3,(await stats()).failed);
  await P.close()}
/* ---------- F. duplicate-team attempt first, then a valid pick (root-cause checks: a rejected attempt never writes) ---------- */
{/* unit: F.submitSlot refuses an entry the replay would reject BEFORE any write */
  const wr=[];const io={read:async()=>'',write:async(u,e)=>{wr.push(u)},sleep:async()=>{},adopt(){},later(){},alert(){}};
  const meta=F.normalizeMeta(JSON.parse(await dump(F.Keys((await seed(API,{managers:8,rounds:8,live:true,picksMade:35}))).meta)));const I0=seed.info;const s36=F.slotAt(meta.order,36,meta.settings.type,meta.settings.rounds);
  const takenTid=I0.picks[0].teamId;
  const dup=F.makeEntry(36,s36.owner,String(takenTid),{now:Date.now(),epoch:meta.epoch,writer:'t',by:'owner',prev:''});
  const r=await F.submitSlot(io,{meta,url:'k36',n:36,entry:dup,taken:{[takenTid]:{n:1}},pool:null,prevId:undefined});
  ok('F: submitSlot refuses a duplicate-team entry and writes nothing',r.ok===false&&r.rejected==='duplicate-team'&&wr.length===0,{r,wr});
  const good=F.makeEntry(36,s36.owner,'duke',{now:Date.now(),epoch:meta.epoch,writer:'t',by:'owner',prev:''});const r2=await F.submitSlot(Object.assign({},io,{read:async()=>wr.length?JSON.stringify(good):''}),{meta,url:'k36',n:36,entry:good,taken:{},pool:null,prevId:undefined,fast:true});
  ok('F: a valid entry is still written once',r2.ok===true&&wr.length===1,{r2,wr})}
{let L1=await mk();const key36=L1.K.pick(1,36),alt1=key36+'-a1';const mgr=L1.I.managers[L1.on36];const taken=L1.I.picks[0].teamId;
  await cfg('fail='+encodeURIComponent('-e1-p36$')+'&code=500');
  const P=await open('mgrF',L1.id,'#as='+mgr.id+'&k='+mgr.k);await waitFor(()=>P.page.$('#stuckbar'),25000);
  const before=await stats();
  await P.page.evaluate((t,o)=>{document.body.insertAdjacentHTML('beforeend','<button id="fakeconf" data-a="confirm" data-t="'+t+'" data-o="'+o+'">x</button>');document.getElementById('fakeconf').click()},taken,mgr.id);await sleep(2500);
  const mid=await stats();const tt=await txt(P,'#toast');
  ok('F: a duplicate-team attempt while slot 36 returns 500 is refused with a notice and writes NOTHING (original or alternate)',/taken|beat|already/i.test(tt||'')&&mid.post===before.post&&!await dump(key36)&&!await dump(alt1),{tt,before:before.post,mid:mid.post});
  ok('F: the banner is still the plain "Pick stuck" one (nothing else broke)',!!await P.page.$('#stuckbar'));
  await pickUI(P);const landed=await waitFor(async()=>!!await dump(alt1),25000);const e36=landed?await entryOf(alt1):null;
  ok('F: then a valid pick works through the alternate key',landed&&e36&&e36.n===36&&e36.tid!==taken,e36);await P.close()}
{let L1=await mk();const key36=L1.K.pick(1,36);const mgr=L1.I.managers[L1.on36];const taken=L1.I.picks[0].teamId;
  const P=await open('mgrF2',L1.id,'#as='+mgr.id+'&k='+mgr.k);await P.page.waitForSelector('#pickbtn',{timeout:20000}).catch(()=>{});
  await P.page.evaluate((t,o)=>{document.body.insertAdjacentHTML('beforeend','<button id="fakeconf" data-a="confirm" data-t="'+t+'" data-o="'+o+'">x</button>');document.getElementById('fakeconf').click()},taken,mgr.id);await sleep(2000);
  ok('F: healthy server: the duplicate attempt writes nothing, the slot stays empty',!await dump(key36)&&/taken|beat|already/i.test(await txt(P,'#toast')||''));
  await pickUI(P);ok('F: the next valid pick lands in the original key',await waitFor(async()=>!!await dump(key36),25000));await P.close()}
/* ---------- G. race: the manager and the commissioner (Force) act on slot 36 at the same moment ---------- */
{let L1=await mk();const key36=L1.K.pick(1,36);const mgr=L1.I.managers[L1.on36];
  const P=await open('mgrG',L1.id,'#as='+mgr.id+'&k='+mgr.k);const C=await open('cmG',L1.id,'#cm='+L1.I.cmSecret);
  await cfg('fail='+encodeURIComponent('-e1-p36$')+'&code=500');await waitFor(()=>C.page.$('#forcepick'),30000);
  await Promise.all([pickUI(P).catch(()=>0),C.page.$eval('#forcepick',e=>e.click())]);await sleep(9000);
  const a=await dump(key36+'-a1');const ent=a?F.parseEntry(a):null;
  ok('G: two quick attempts at the same slot leave exactly one valid pick #36 (no garbage, no gap)',!!ent&&ent.n===36&&!!ent.owner,a);
  const W=await L.phone('rcG');await W.page.setBypassServiceWorker(true);await cfg('clear=1');
  ok('G: the loader counts 36 picks and #37 is next',(await leagueCount(L1.id,W.page))===36);
  ok('G: no page errors',P.errs.length+C.errs.length===0,[P.errs,C.errs]);await P.close();await C.close();await W.close()}
/* ---------- H. leftover garbage or a rejected entry in slot 36 never freezes the draft ---------- */
{let L1=await mk();const key36=L1.K.pick(1,36);const mgr=L1.I.managers[L1.on36];await post(key36,'{"id":"x","n":36,"own');
  const P=await open('mgrH',L1.id,'#as='+mgr.id+'&k='+mgr.k);
  ok('H: a half-written value in the slot is treated as empty: the manager is on the clock',await waitFor(async()=>/Make your pick/.test(await txt(P,'#banner')||''),20000),await txt(P,'#banner'));
  await pickUI(P);const okp=await waitFor(async()=>{const t=await dump(key36);const e=t?F.parseEntry(t):null;return e&&e.n===36},25000);ok('H: a valid pick overwrites the garbage',!!okp);
  const W=await L.phone('rcH');await W.page.setBypassServiceWorker(true);ok('H: the loader counts 36 picks',(await leagueCount(L1.id,W.page))===36);await W.close();await P.close()}
{let L1=await mk();const key36=L1.K.pick(1,36);const mgr=L1.I.managers[L1.on36];const taken=L1.I.picks[0].teamId;
  const bad=F.makeEntry(36,mgr.id,String(taken),{now:Date.now(),epoch:1,writer:'old',by:'owner',prev:(await entryOf(L1.K.pick(1,35))).id});await post(key36,bad);
  const P=await open('mgrH2',L1.id,'#as='+mgr.id+'&k='+mgr.k);
  ok('H: a REJECTED entry (duplicate team) left in slot 36 leaves the manager on the clock',await waitFor(async()=>/Make your pick/.test(await txt(P,'#banner')||''),20000),await txt(P,'#banner'));
  await pickUI(P);const okp=await waitFor(async()=>{const e=F.parseEntry(await dump(key36));return e&&e.tid!==taken},25000);ok('H: a valid pick replaces the rejected entry',!!okp);await P.close()}
{/* garbage in the original + a valid pick in the alternate: the valid alternate is used; garbage alone reads as garbage (parsed as empty) */
  let L1=await mk();const key36=L1.K.pick(1,36);const mgr=L1.I.managers[L1.on36];const good=F.makeEntry(36,mgr.id,'duke',{now:Date.now(),epoch:1,writer:'t',by:'owner',prev:(await entryOf(L1.K.pick(1,35))).id});
  await post(key36,'garbage{');await post(key36+'-a1',good);const W=await L.phone('rcH3');await W.page.setBypassServiceWorker(true);
  ok('H: garbage in the original + a valid alternate -> the alternate counts (36 picks)',(await leagueCount(L1.id,W.page))===36);await W.close()}
await cfg('clear=1&failm=&failn=');
console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
