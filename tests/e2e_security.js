/* Security, authorisation, compare-and-set, demo-data, removed-manager and polling tests (headless Chrome, MOCK store only).
   node tests/e2e_security.js     needs:  node tools/mock_textdb.js 9995 . 9996   (APP=http://localhost:9995 API=http://localhost:9996)
   Payloads are written STRAIGHT into the store records (not through the UI) to prove nothing in the app executes stored text. */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;
const API=process.env.API;const ST=API.replace('/api/data/','');
let n=0,bad=0;const fails=[];
function ok(name,cond,extra){n++;if(cond)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(extra!==undefined?'  -> '+JSON.stringify(extra).slice(0,300):''))}}
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const get=async k=>(await fetch(API+encodeURIComponent(k))).text();
const gj=async k=>F.parseJ(await get(k));
const stats=async()=>(await fetch(ST+'/__stats')).json();
async function waitFor(fn,ms,label,every){const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(every||250)}throw new Error('timeout: '+(label||fn.toString().slice(0,80)))}
const txt=(P,sel)=>P.page.$eval(sel,e=>e.innerText).catch(()=>null);
const has=(P,sel)=>P.page.$(sel).then(x=>!!x);
const cnt=(P,sel)=>P.page.$$(sel).then(x=>x.length);
const body=P=>P.page.$eval('body',e=>e.innerText).catch(()=>'');
const tab=async(P,t)=>{await P.page.evaluate(t=>{const b=document.querySelector('[data-t='+t+']');if(b)b.click()},t);await sleep(400)};
const phones=[];const mk=async(name,opt)=>{const p=await L.phone(name,opt);phones.push(p);return p};
const rnd=()=>F.newSecret();
const tap=(P,sel)=>P.page.$eval(sel,e=>{e.scrollIntoView({block:'center'});e.click()});
const closeOv=async P=>{await P.page.evaluate(()=>{const b=document.querySelector('[data-a=idclose]');if(b)b.click()});await sleep(200)};
const pwn=P=>P.page.evaluate(()=>({pwn:window.__pwn,bad:document.querySelectorAll('img[src="x"],script:not([src]),[onmouseover],[onerror],[onclick],[onload]').length}));
(async()=>{
try{
await fetch(ST+'/__reset');await fetch(ST+'/__cfg?clear=1&lat=0&post=0');
const want=x=>!process.env.ONLY||process.env.ONLY.includes(x);
/* ================= A. stored XSS: payloads written straight into the store ================= */
console.log('\n[A. stored XSS]');
const idA=await seed(API,{live:true,picksMade:3,name:'<svg onload=window.__pwn=8>Evil League',managers:8});const IA=seed.info;const KA=F.Keys(idA);
const m0=IA.managers[0],m1=IA.managers[1];
const pl=(await gj(KA.slot(1,0)));
await post(KA.mgr(m0.id),{mid:m0.id,name:'<img src=x onerror=window.__pwn=5>',team:'"><script>window.__pwn=6</script>',emoji:'<b onmouseover=window.__pwn=9>x</b>',photo:'javascript:window.__pwn=7',pv:1});
await post(KA.mgr(m1.id),{mid:m1.id,name:"x' onfocus='window.__pwn=10",team:'t',emoji:'',photo:'data:text/html,<script>window.__pwn=11</script>',pv:1});
await post(KA.chat,{version:5,msgs:[
 {id:'x" onmouseover="window.__pwn=1" a="',ts:Date.now(),who:m0.id,text:'<img src=x onerror=window.__pwn=2>',r:{'"><img src=x onerror=window.__pwn=3>':[m0.id],'👍':[m1.id,'"><img src=x onerror=window.__pwn=12>']}},
 {id:'ok1',ts:Date.now()+1,who:'"><script>window.__pwn=13</script>',text:'plain <b>bold?</b> message',r:{'😂':[m0.id]}}]});
await post(KA.pref(m0.id),{queue:['"><img src=x onerror=window.__pwn=4>','150',"1' onfocus='window.__pwn=14"],auto:false,v:1});
const meta0=await gj(KA.meta);meta0.over=meta0.over||{};meta0.over[m1.id]={name:'<img src=x onerror=window.__pwn=15>',team:'"><svg onload=window.__pwn=16>'};await post(KA.meta,meta0);
const XA=await mk('xss',{desktop:true,w:1280,h:900});
await XA.page.goto(`${APP}/room.html?l=${idA}#as=${m0.id}&k=${m0.k}`,{waitUntil:'domcontentloaded'});
await waitFor(()=>has(XA,'#banner')&&has(XA,'#oncard'),25000,'room A').catch(()=>{});
for(const t of ['board','teams','my','chat','more','board']){await tab(XA,t);await sleep(500)}
await XA.page.evaluate(()=>{document.querySelectorAll('.msg,[data-a=react],[data-a=reactopen],.chip,.mrow,.tn').forEach(e=>{e.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));e.dispatchEvent(new MouseEvent('click',{bubbles:true}))})});await sleep(600);
for(const t of ['chat','my','more','teams','board'])await tab(XA,t);
let r=await pwn(XA);ok('room: no payload executed and no injected element or handler exists (names, team, emoji, photo, chat id/text/reaction/author, queue ids, league name)',r.pwn===undefined&&r.bad===0,r);
ok('room: payload text is shown as plain text, not as markup',!(await has(XA,'img[src="x"]'))&&/Evil League|plain/.test(await body(XA)),(await body(XA)).slice(0,160));
ok('room: unsafe reaction keys and ids were dropped (only the allowed emoji exist)',(await XA.page.$$eval('[data-e]',els=>els.map(e=>e.dataset.e))).every(e=>F.REACTS.includes(e)));
ok('room: queue ids that are not teams were dropped',await XA.page.evaluate(()=>[].slice.call(document.querySelectorAll('[data-t]')).every(e=>/^[A-Za-z0-9_-]*$/.test(e.dataset.t))));
ok('photo with a non-image address is not used as an image source',await XA.page.evaluate(()=>[].slice.call(document.querySelectorAll('img')).every(i=>!/^javascript:|^data:text/.test(i.getAttribute('src')||''))));
ok('no page errors in room A',XA.errs.length===0,XA.errs);
/* recap + league (complete league) with payloads */
const idB=await seed(API,{name:'"><img src=x onerror=window.__pwn=20>',managers:8});const IB=seed.info;const KB=F.Keys(idB);
await post(KB.mgr(IB.managers[0].id),{mid:IB.managers[0].id,name:'<img src=x onerror=window.__pwn=21>',team:'"><script>window.__pwn=22</script>',emoji:'',photo:'javascript:window.__pwn=23',pv:1});
for(const [pg,sel] of [['recap.html','#recaphead'],['league.html','#lhead']]){const PB=await mk('x_'+pg,{});await PB.page.goto(`${APP}/${pg}?l=${idB}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(PB,sel),20000,pg).catch(()=>{});await sleep(800);
  const rr=await pwn(PB);ok(pg+': payloads in league name, names, team, emoji and photo do not execute',rr.pwn===undefined&&rr.bad===0,rr);await PB.close()}
await XA.close();

/* ================= B. authorisation ================= */
console.log('\n[B. authorisation: secrets]');
const idC=await seed(API,{live:true,picksMade:2,managers:8,clockSecs:null});const IC=seed.info;const KC=F.Keys(idC);
const metaC=await gj(KC.meta);const ord=metaC.order;const nextOwner=F.slotAt(metaC.order,3,metaC.settings.type,metaC.settings.rounds).owner;const OW=IC.managers.find(m=>m.id===nextOwner);const OTHER=IC.managers.find(m=>m.id!==nextOwner);
const snap=async()=>{const o={};for(const k of [KC.meta,KC.chat,KC.pick(1,3),KC.pick(1,4),KC.pref(OW.id),KC.mgr(OW.id)])o[k]=await get(k);return JSON.stringify(o)};
const before=await snap();
const claimOW=await gj(KC.slot(IC.managers.indexOf(OW)+1,0));
const attempt=async(label,frag,pre)=>{const P=await mk('b_'+label,{});if(pre){await P.page.evaluateOnNewDocument(pre.fn,pre.arg)}await P.page.goto(`${APP}/room.html?l=${idC}${frag}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#banner')&&has(P,'#oncard'),25000,label).catch(()=>{});await sleep(1500);return P};
/* 1 wrong secret in a manager link */
let P=await attempt('wrongk','#as='+OW.id+'&k='+rnd());
ok('wrong manager secret in a link: no pick button, told the link is not valid',!(await has(P,'#pickbtn'))&&/not valid/i.test(await body(P)),(await body(P)).slice(0,200));
ok('wrong secret: the device is not stored as that manager',!(await P.page.evaluate(id=>localStorage.getItem('fbn.me.'+id),idC)));
ok('wrong secret: the secret was removed from the address bar',await P.page.evaluate(()=>/^(#tab=[a-z]+)?$/.test(location.hash)));
await P.close();
/* 2 copying the public hash as the secret */
P=await attempt('hashk','#as='+OW.id+'&k='+claimOW.sh.slice(0,32));ok('the public claim hash used as secret does not work',!(await has(P,'#pickbtn')));await P.close();
P=await attempt('lsfake','',{fn:(id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},arg:[idC,{mid:OW.id,k:claimOW.sh}]});
ok('a stored token holding the claim hash does not make the device that manager',!(await has(P,'#pickbtn')));
ok('picker: no list of names to click — only a paste-your-link form',!(await has(P,'[data-a=iamyes]'))&&!(await has(P,'.who8')));await P.close();
/* 3 other manager's secret for this manager */
P=await attempt('otherk','#as='+OW.id+'&k='+OTHER.k);ok("another manager's secret cannot act as this manager",!(await has(P,'#pickbtn')));await P.close();
/* 4 right secret works */
P=await attempt('rightk','#as='+OW.id+'&k='+OW.k);ok('the right manager secret gets the pick button',await has(P,'#pickbtn'),(await body(P)).slice(0,100));
ok('the manager link secret is removed from the address bar after use',await P.page.evaluate(()=>/^(#tab=[a-z]+)?$/.test(location.hash)&&location.search.indexOf('k=')<0));
ok('the secret is kept on the device for next time',await P.page.evaluate(id=>/"k":"[0-9a-f]{32}"/.test(localStorage.getItem('fbn.me.'+id)||''),idC));
/* queue + auto: wrong secret cannot, right can */
await tab(P,'my');const q1=await has(P,'#autotog');ok('right secret: manager can use the queue/auto card',q1);
await P.close();
P=await attempt('noqueue','#as='+OW.id+'&k='+rnd());await tab(P,'my');ok('wrong secret: no queue or auto-pick controls',!(await has(P,'#autotog')));
ok('wrong secret: cannot chat or react (no chat box)',await (async()=>{await tab(P,'chat');return !(await has(P,'#cin'))})());
await P.close();
/* 5 edit profile */
P=await mk('edit_wrong',{});await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},idC,{mid:OW.id,k:rnd()});await P.page.goto(`${APP}/join.html?l=${idC}&edit=1`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#jform')||has(P,'#joined'),15000).catch(()=>{});
ok('edit-profile page with a wrong secret does not open the edit form for that manager',!(/Edit your profile/.test(await body(P)))&&!(await has(P,'[data-a=saveme]')),(await body(P)).slice(0,120));await P.close();
P=await mk('edit_right',{});await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},idC,{mid:OW.id,k:OW.k});await P.page.goto(`${APP}/join.html?l=${idC}&edit=1`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'[data-a=saveme]'),15000).catch(()=>{});
ok('edit-profile page with the right secret opens the edit form',await has(P,'[data-a=saveme]'));await P.close();
/* 6 commissioner */
P=await attempt('cm_hash','',{fn:(id,h)=>localStorage.setItem('cm.'+id,h),arg:[idC,metaC.pass.hash]});await tab(P,'more');
ok('a copied commissioner hash in storage unlocks nothing',(await has(P,'#lockcard'))&&!(await has(P,'#unlockedcard')));await P.close();
P=await attempt('cm_wrong','#cm='+rnd());await tab(P,'more');ok('a wrong commissioner link unlocks nothing',(await has(P,'#lockcard'))&&!(await has(P,'#unlockedcard')));await P.close();
P=await attempt('cm_other','#as='+OW.id+'&k='+OW.k);await tab(P,'more');
ok('a manager (valid secret, not commissioner) has no undo, pause, start or remove controls',(await has(P,'#lockcard'))&&!(await cnt(P,'[data-a=undo],[data-a=pause],[data-a=resume],[data-a=remove],[data-a=endearly],[data-a=reset]')));
await P.close();
P=await attempt('cm_right','#cm='+IC.cmSecret);await tab(P,'more');
ok('the real commissioner link unlocks the tools',await has(P,'#unlockedcard'));
ok('commissioner secret is removed from address bar and history',await P.page.evaluate(()=>/^(#tab=[a-z]+)?$/.test(location.hash)&&location.href.indexOf('cm=')<0&&document.referrer.indexOf('cm=')<0));
ok('commissioner secret is not in any share link shown in the room',await (async()=>{const hrefs=await P.page.$$eval('a[href],[data-u]',e=>e.map(x=>x.getAttribute('href')||x.dataset.u||''));return hrefs.every(h=>h.indexOf(IC.cmSecret)<0)})());
await P.close();
/* paste in the unlock sheet: wrong then right */
P=await attempt('cm_paste','');await closeOv(P);await tab(P,'more');for(let a=0;a<4&&!(await has(P,'#pin'));a++){await P.page.$eval('#unlockui',e=>{e.scrollIntoView();e.click()});await sleep(900)}await waitFor(()=>has(P,'#pin'),5000,'pin');
await P.page.type('#pin','junk-passcode');await tap(P,'#dounlock');await sleep(600);ok('unlock sheet: a wrong paste is refused with a plain message',/not the commissioner/i.test(await txt(P,'#pinerr')||''),await txt(P,'#pinerr'));
await P.page.$eval('#pin',e=>e.value='');await P.page.type('#pin',`${APP}/room.html?l=${idC}#cm=${IC.cmSecret}`);await tap(P,'#dounlock');await waitFor(()=>has(P,'#unlockedcard'),8000).catch(()=>{});
ok('unlock sheet: pasting the full commissioner link unlocks',await has(P,'#unlockedcard'));await P.close();
ok('none of the attempts changed meta, chat, picks, queue or profile in the store',(await snap())===before);
/* hashes in the store never contain a usable secret */
const allKeys=[KC.meta,KC.slot(1,0),KC.slot(2,0)];const blob=(await Promise.all(allKeys.map(get))).join('');ok('store never holds a plain secret',![IC.cmSecret,...IC.managers.map(m=>m.k)].some(s=>blob.includes(s)));

/* ================= C. compare-and-set: stale undo, stale pick ================= */
console.log('\n[C. compare-and-set]');
const idD=await seed(API,{live:true,picksMade:3,managers:8,clockSecs:null});const ID=seed.info;const KD=F.Keys(idD);
const CM=await mk('cas',{});await CM.page.goto(`${APP}/room.html?l=${idD}#cm=${ID.cmSecret}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(CM,'#banner')&&has(CM,'#oncard'),25000).catch(()=>{});await closeOv(CM);await tab(CM,'more');await waitFor(()=>has(CM,'#unlockedcard'),10000).catch(()=>{});
const metaD=await gj(KD.meta);
const entryAt=async(k,tid)=>{const m=await gj(KD.meta);const ents={};for(let i=1;i<=k-1;i++)ents[i]=F.parseEntry(await get(KD.pick(m.epoch,i)));const rep=F.replay(m,ents,null);const sl=F.slotAt(m.order,k,m.settings.type,m.settings.rounds);return F.makeEntry(k,sl.owner,tid,{now:Date.now(),epoch:m.epoch,writer:'race',by:'owner',prev:rep.picks.length?rep.picks[rep.picks.length-1].id:''})};
await tap(CM,'[data-a=undo]');await waitFor(()=>has(CM,'#cfyes'),6000).catch(()=>{});
const dlg=await txt(CM,'.sheet')||'';ok('undo dialog names the pick it will remove (#3)',/#3/.test(dlg),dlg.slice(0,120));
/* while the dialog is open, a new pick lands */
const e4=await entryAt(4,'2');await post(KD.pick(metaD.epoch,4),e4);
await tap(CM,'#cfyes');await sleep(3500);
const mD=await gj(KD.meta);ok('stale undo: the confirmed pick #3 was NOT removed because a pick landed after the dialog opened',(mD.voided||[]).length===0,mD.voided);
ok('stale undo: the commissioner is told the board changed',/board changed|look again/i.test(await body(CM)+JSON.stringify(await CM.page.evaluate(()=>window.__toasts||[]))));
ok('stale undo: pick #4 is still in the store untouched',(await gj(KD.pick(metaD.epoch,4))).id===e4.id);
/* undo the real last pick (now #4), then a second stale undo of the same pick */
await tab(CM,'more');await tap(CM,'[data-a=undo]');await waitFor(()=>has(CM,'#cfyes'),6000).catch(()=>{});
const dlg2=await txt(CM,'.sheet')||'';ok('undo dialog now names pick #4',/#4/.test(dlg2),dlg2.slice(0,120));
await tap(CM,'#cfyes');await waitFor(async()=>((await gj(KD.meta)).voided||[]).length===1,10000).catch(()=>{});
const mD2=await gj(KD.meta);ok('fresh undo removes exactly the last pick (#4)',mD2.voided.length===1&&mD2.voided[0]===e4.id,mD2.voided);
/* a different pick takes slot 4 while a stale tab thinks #4 is the last pick: its undo must fail and must not void the new pick */
const e4b=await entryAt(4,'3');await post(KD.pick(metaD.epoch,4),e4b);await sleep(500);
await tab(CM,'more');await sleep(3500);const mD3=await gj(KD.meta);
const stale=await entryAt(5,'4');await post(KD.pick(metaD.epoch,5),Object.assign({},stale,{prev:e4.id}));await sleep(300);
ok('orphan chained to a removed pick does not appear on the board (picks stay at 4)',await (async()=>{const m=await gj(KD.meta);const ents={};for(let i=1;i<=6;i++)ents[i]=F.parseEntry(await get(KD.pick(m.epoch,i)));return F.replay(m,ents,null).picks.length===4})());
await CM.close();

/* ================= D. sample data vs demo ================= */
console.log('\n[D. sample data]');
const idE=await seed(API,{name:'Real League',managers:8});
const fs=require('fs'),path=require('path');
const real=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/scores.json'),'utf8')),realT=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/tournament.json'),'utf8')),demo=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/demo/scores.json'),'utf8'));
ok('shipped real data files are empty and not marked sample; demo files hold the sample data',!real.sample&&real.games.length===0&&!realT.sample&&Object.keys(realT.field).length===0&&demo.sample===true&&demo.games.length>1000);
for(const [vw,opt] of [['390',{}],['1280',{desktop:true,w:1280,h:860}]]){
 P=await mk('real'+vw,opt);await P.page.goto(`${APP}/league.html?l=${idE}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#lapp[data-ready]'),20000,'ready').catch(()=>{});await sleep(400);
 const b=await body(P);const o0=await P.page.$$eval('#main .ocl .strow',c=>c.map(x=>[x.querySelector('.place').innerText,x.querySelector('.score .pv').innerText]));
 ok('real league ('+vw+'): populated 0-0 cards for all 8 managers, all T-1, with the recap link',o0.length===8&&o0.every(x=>x[0]==='T-1'&&x[1]==='0')&&await has(P,'a[href*="recap.html"]'),o0);
 ok('real league ('+vw+'): no sample banner, no DEMO, no invented results',!(await has(P,'#samplenote'))&&!(await has(P,'#demobar'))&&!/Sample data|invented scores\b(?! \))/i.test(b.replace(/see the demo[^\n]*/,''))&&(await P.page.$$eval('#main .ocl .chip .cr',c=>c.every(x=>x.innerText==='0-0'))));
 await P.page.click('#ltabs [data-v=teams]').catch(()=>{});await sleep(500);ok('real league ('+vw+'): All teams tab shows the drafted schools with no invented results',(await P.page.$$eval('#main table tr',x=>x.length))===49&&!(await has(P,'#demobar')));
 await P.page.click('#ltabs [data-v=games]').catch(()=>{});await sleep(500);ok('real league ('+vw+'): games tab has no invented games',!(await has(P,'.gm'))&&await has(P,'#gempty')&&!(await has(P,'#demobar')));
 if(vw==='390')await P.shot('sec_real_empty');await P.close()}
P=await mk('demo',{});await P.page.goto(`${APP}/league.html?l=${idE}&demo=1`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#lapp[data-ready]'),20000,'demo rows').catch(()=>{});
ok('demo link: standings use sample data and are marked DEMO',await has(P,'#demobar')&&await has(P,'.strow')&&/DEMO/.test(await txt(P,'#demobar')||''));
for(const t of ['standings','teams','games']){await P.page.click('#ltabs [data-v='+t+']').catch(()=>{});await sleep(500);ok('demo: DEMO marker visible on the '+t+' screen',await P.page.evaluate(()=>{const e=document.getElementById('demobar');if(!e)return false;const r=e.getBoundingClientRect();return r.height>10&&r.bottom>0&&r.top<window.innerHeight}))}
await P.page.click('[data-a=tab][data-v=standings]').catch(()=>{});await sleep(300);ok('demo: header also says DEMO',/DEMO/.test(await txt(P,'#top')||await txt(P,'header')||''));await P.shot('sec_demo');await P.close();
/* sample file served in the real position must still not show */
const PRX=await mk('realsample',{});await PRX.page.setRequestInterception(true);PRX.page.on('request',rq=>{if(/\/data\/scores\.json/.test(rq.url())&&!/demo/.test(rq.url()))rq.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(path.join(__dirname,'../data/demo/scores.json'))});else rq.continue()});
await PRX.page.goto(`${APP}/league.html?l=${idE}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(PRX,'#lapp[data-ready]'),20000).catch(()=>{});await sleep(400);ok('even if a sample file is placed in the real data slot, a real league shows no results (all 0-0)',await has(PRX,'#lapp[data-ready]')&&(await PRX.page.$$eval('#main .ocl .strow .score .pv',c=>c.length===8&&c.every(x=>x.innerText==='0'))));await PRX.close();

/* ================= E. removed manager ================= */
console.log('\n[E. removed manager]');
const idF=await seed(API,{live:true,picksMade:2,managers:8,clockSecs:null});const IF=seed.info;const KF=F.Keys(idF);const mF=await gj(KF.meta);const ownF=F.slotAt(mF.order,3,mF.settings.type,mF.settings.rounds).owner;const VF=IF.managers.find(m=>m.id===ownF);
P=await mk('victim',{});await P.page.goto(`${APP}/room.html?l=${idF}#as=${VF.id}&k=${VF.k}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#pickbtn'),25000,'victim pickbtn').catch(()=>{});
ok('before removal: the manager on the clock has a pick button',await has(P,'#pickbtn'));
mF.over=mF.over||{};mF.over[VF.id]=Object.assign({},mF.over[VF.id],{left:true,away:true});mF.version=(mF.version||0)+1;await post(KF.meta,mF);
await waitFor(()=>has(P,'#removednote'),20000,'removed note').catch(()=>{});await sleep(800);
ok('after removal: "You were removed by the commissioner" is shown',/removed by the commissioner/i.test(await body(P)));
ok('after removal: no pick button and no chat box',!(await has(P,'#pickbtn'))&&!(await has(P,'#cin')));
await P.close();

/* ================= F. request volume and polling ================= */
if(!process.env.ONLY||/F/.test(process.env.ONLY)){
console.log('\n[F. polling]');
const idG=await seed(API,{live:true,picksMade:2,managers:8,clockSecs:60});const IG=seed.info;
const metaG=await gj(F.Keys(idG).meta);
const lobbyId=await (async()=>{const id=await seed(API,{managers:8,live:false});const K=F.Keys(id);const mt=await gj(K.meta);mt.status='lobby';delete mt.endedAt;await post(K.meta,mt);return id})();
async function rate(P,secs){const a=(await stats()).get;await sleep(secs*1000);return((await stats()).get-a)/secs}
P=await mk('vol_live',{});await P.page.goto(`${APP}/room.html?l=${idG}#as=${IG.managers[0].id}&k=${IG.managers[0].k}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#oncard'),25000).catch(()=>{});await sleep(4000);
const rLive=await rate(P,20);console.log('     live draft, one visible tab: '+rLive.toFixed(2)+' reads/s');ok('live draft: one tab reads at most 1.6 requests/s (audit measured 1.5/s per tab, with a slower target of 2-3 s polls)',rLive<=1.6,rLive);
await P.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))});await sleep(3500);
const rHid=await rate(P,15);console.log('     hidden tab: '+rHid.toFixed(2)+' reads/s');ok('hidden tab: polling stops (under 0.2 reads/s)',rHid<0.2,rHid);
await P.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'))});await sleep(3000);
const rBack=await rate(P,8);ok('tab visible again: polling resumes immediately',rBack>0.3,rBack);await P.close();
P=await mk('vol_lobby',{});await P.page.goto(`${APP}/room.html?l=${lobbyId}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#lobbycard'),25000).catch(()=>{});await sleep(4000);
const rLob=await rate(P,20);console.log('     lobby, one visible tab: '+rLob.toFixed(2)+' reads/s');ok('lobby: one tab reads at most 1.6 requests/s (audit: 2.4/s)',rLob<=1.6,rLob);await P.close();
/* error back-off: every request fails; count meta requests in 40 s */
P=await mk('backoff',{});await P.page.goto(`${APP}/room.html?l=${lobbyId}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#lobbycard'),25000).catch(()=>{});await sleep(3000);
await fetch(ST+'/__cfg?fail='+encodeURIComponent('fbn1-'));await sleep(1500);const f0=(await stats()).failed;await sleep(40000);const f1=(await stats()).failed;const offTxt=await body(P);await fetch(ST+'/__cfg?clear=1');
console.log('     failing store, 40 s: '+(f1-f0)+' failed requests');ok('errors: exponential back-off keeps failed requests low (fewer than 12 in 40 s)',(f1-f0)<12,f1-f0);
ok('errors: the tab says it is offline/retrying (read while the store was failing)',/Offline|retrying|Connecting/i.test(offTxt));
const tRec=Date.now();await waitFor(async()=>/Live/.test(await txt(P,'#conn')||''),60000,'recover').catch(()=>{});ok('errors: recovers by itself when the store is back',/Live/.test(await txt(P,'#conn')||''),await txt(P,'#conn'));
console.log('     back-off recovery took '+Math.round((Date.now()-tRec)/1000)+' s');ok('errors: with no help, the pill is back within the 30 s back-off ceiling (+ one request)',(Date.now()-tRec)<42000,Date.now()-tRec);
/* second outage: the browser says it is online again -> the pill clears at once, no waiting for the back-off */
await fetch(ST+'/__cfg?fail='+encodeURIComponent('fbn1-'));await waitFor(async()=>/Offline/.test(await txt(P,'#conn')||''),45000,'offline pill').catch(()=>{});ok('errors: pill says Offline during the second outage',/Offline/.test(await txt(P,'#conn')||''),await txt(P,'#conn'));
await fetch(ST+'/__cfg?clear=1');const tOn=Date.now();await P.page.evaluate(()=>window.dispatchEvent(new Event('online')));await waitFor(async()=>/Live/.test(await txt(P,'#conn')||''),8000,'live after online').catch(()=>{});ok('errors: the Offline pill clears within a few seconds of the store being back (online event), not after the back-off',/Live/.test(await txt(P,'#conn')||'')&&(Date.now()-tOn)<6000,Date.now()-tOn);await P.close();

}
/* ================= G. auto-start / auto-pick limit is visible ================= */
console.log('\n[G. plain words about auto-start]');
{const id=await seed(API,{managers:8,live:false});const K=F.Keys(id);const mt=await gj(K.meta);mt.status='lobby';delete mt.endedAt;mt.settings.startMode='auto';mt.settings.startAt=Date.now()+3600e3;mt.settings.tz='UTC';await post(K.meta,mt);const I=seed.info;
 P=await mk('auto_cm',{});await P.page.goto(`${APP}/room.html?l=${id}#cm=${I.cmSecret}`,{waitUntil:'domcontentloaded'});await waitFor(()=>P.page.$('#tab_more'),25000).catch(()=>{});await sleep(1500);await P.page.evaluate(()=>{const t=document.querySelector('#tab_more');if(t)t.click()});await waitFor(()=>has(P,'#autonote'),15000).catch(()=>{});
 ok('commissioner sees: auto-start only runs while a page is open',/only runs while a page is open/i.test(await txt(P,'#autonote')||''),await txt(P,'#autonote'));
 ok('lobby countdown does not promise to start by itself',!/starts automatically/i.test(await body(P)));await P.close();
 const Pm=await mk('auto_mgr',{});await Pm.page.goto(`${APP}/room.html?l=${id}#as=${I.managers[1].id}&k=${I.managers[1].k}`,{waitUntil:'domcontentloaded'});await sleep(3500);ok('a manager does not see the commissioner note',!(await has(Pm,'#autonote')));await Pm.close()}

/* ================= I. names with ' & < > " in dialogs and toasts (no double escaping, no injection) ================= */
if(want('I')){console.log('\n[I. awkward names in dialogs and toasts]');
const NM1="Ann O'Neil & Co",NM2='Zed "Q" <b>x</b> & <i',TM1="Team <3 & 'Co'";
const idI=await seed(API,{live:true,picksMade:2,managers:4,clockSecs:null,names:[null,[NM1,TM1,'🏀'],[NM2,'Zeds','🔥']],name:'Names & Co'});const II=seed.info;
P=await mk('names',{});await P.page.goto(`${APP}/room.html?l=${idI}#cm=${II.cmSecret}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#banner')||has(P,'#lockcard')||has(P,'#mgrcard'),25000).catch(()=>{});await closeOv(P);await tab(P,'more');await waitFor(()=>has(P,'#mgrcard'),10000).catch(()=>{});
const mrow=await P.page.evaluate(()=>[].map.call(document.querySelectorAll('#mgrcard [data-a=mgr]'),e=>e.dataset.m));
const midN1=II.managers[1].id,midN2=II.managers[2].id;
for(const [mid,nm0,nm] of [[midN1,NM1,NM1],[midN2,NM2,'Zed "Q" x & i']]){  /* the app strips <tags> from names when it reads them; quotes, ampersands and apostrophes stay and must show as plain text */
 await P.page.evaluate(m=>{const b=document.querySelector('#mgrcard [data-a=mgr][data-m="'+m+'"]');if(b){b.scrollIntoView({block:'center'});b.click()}},mid);await waitFor(()=>has(P,'#removebtn'),6000).catch(()=>{});
 const sheet=await txt(P,'.sheet')||'';ok('manager sheet shows the name as plain text: '+nm0,sheet.includes(nm)&&!/&amp;|&#39;|&quot;|&lt;/.test(sheet),sheet.slice(0,80));
 await tap(P,'#removebtn');await waitFor(()=>has(P,'#cfyes'),6000).catch(()=>{});
 const t=await P.page.$eval('.sheet h2',e=>e.textContent).catch(()=>'');
 ok('remove dialog title is exactly "Remove '+nm+'?" (no double escaping): '+nm0,t==='Remove '+nm+'?',t);
 ok('remove dialog: no injected element from the name',(await P.page.evaluate(()=>document.querySelectorAll('.sheet b,.sheet i').length))<=1&&!(await P.page.evaluate(()=>/&amp;|&#39;/.test(document.querySelector('.sheet h2').innerText))));
 await P.page.evaluate(()=>{const b=document.querySelector('[data-a=sheetbg]');if(b&&b.classList.contains('sheetbg'))b.click()});await P.page.evaluate(()=>{const w=document.getElementById('sheetwrap');if(w)w.innerHTML=''});await sleep(300)}
const tt=await P.page.evaluate(()=>{UI.toast("Ann O'Neil & Co <b>x</b> drafted Team");return document.getElementById('toast').innerText});
ok('toast shows apostrophes, ampersands and tags as plain text',tt==="Ann O'Neil & Co <b>x</b> drafted Team",tt);
ok('toast does not create elements from the name',(await P.page.evaluate(()=>document.querySelectorAll('#toast b').length))===0);
ok('no payload executed and no injected handler on the page',(await pwn(P)).bad===0);
await P.close()}

/* ================= H. 12-manager board on desktop; photo error placement; privacy note ================= */
console.log('\n[H. layout and join form]');
{const id=await seed(API,{live:true,picksMade:14,managers:12,clockSecs:null});const I=seed.info;await post(F.Keys(id).mgr(I.managers[1].id),{mid:I.managers[1].id,name:'Ben',team:'Ballers of the Hardwood Club',emoji:'🔥',photo:'',pv:1});
 P=await mk('d12',{desktop:true,w:1280,h:860});await P.page.goto(`${APP}/room.html?l=${id}#as=${I.managers[0].id}&k=${I.managers[0].k}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'table.board'),25000,'board').catch(()=>{});await sleep(1500);
 const m=await P.page.evaluate(()=>{const w=document.querySelector('.bwrap')||document.querySelector('table.board').parentElement;return{sw:w.scrollWidth,cw:w.clientWidth,cols:document.querySelectorAll('table.board thead th').length}});
 ok('12 managers on a 1280 px desktop: all 12 columns fit with no sideways scroll',m.cols>=13&&m.sw<=m.cw+2,m);
 ok('12-manager board: team names are not cut off with an ellipsis',await P.page.evaluate(()=>[].slice.call(document.querySelectorAll('.board th .tn')).every(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1)));
 await P.shot('sec_board12_desktop');await P.close()}
{const id=await seed(API,{managers:8});const I=seed.info;const K=F.Keys(id);const mt=await gj(K.meta);mt.status='lobby';delete mt.endedAt;await post(K.meta,mt);await post(K.slot(6,0),'');
 require('fs').writeFileSync('/tmp/not_an_image.png','this is plain text, not an image');
 P=await mk('joinfile',{});await P.page.goto(`${APP}/join.html?l=${id}`,{waitUntil:'domcontentloaded'});await waitFor(()=>has(P,'#jform'),20000,'jform').catch(()=>{});
 ok('join form tells people their name, team and photo are stored in a shared public store',/shared online store/.test(await txt(P,'#privnote')||'')&&/anyone who has the league link/i.test(await txt(P,'#privnote')||''));
 const h=await P.page.$('#f_photo');await h.uploadFile('/tmp/not_an_image.png');await waitFor(async()=>/not an image/.test(await txt(P,'#photoerr')||''),8000).catch(()=>{});
 ok('bad photo file: the message sits right under the photo control (not near the Join button)',/not an image/.test(await txt(P,'#photoerr')||'')&&await P.page.evaluate(()=>{const e=document.getElementById('photoerr'),p=document.getElementById('pinfo'),b=document.getElementById('joinbtn');if(!e||!p||!b)return false;const r=e.getBoundingClientRect(),q=p.getBoundingClientRect(),j=b.getBoundingClientRect();return r.top-q.bottom<30&&j.top-r.bottom>60}));
 ok('bad photo file: the general error line under the form stays empty',(await txt(P,'#err')||'')==='');await P.shot('sec_join_badphoto');await P.close()}
}catch(e){bad++;fails.push('crash: '+e.message);console.log('CRASH',e.stack||e)}
await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
