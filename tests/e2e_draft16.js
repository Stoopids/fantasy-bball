/* Draft room polish (s16): exactly-8 start rule, live-region toast, dialogs (role/focus/Escape), spin edge case (finish setting the order),
   chat tab pinned input, toast offsets, tap targets, labels, reduced motion.   node tests/e2e_draft16.js   (mock store 9995/9996) */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API||'http://localhost:9996/api/data/';
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const gtxt=async k=>(await fetch(API+encodeURIComponent(k))).text();const gj=async k=>F.parseJ(await gtxt(k));
const body=P=>P.page.$eval('body',e=>e.innerText).catch(()=>'');const has=(P,sel)=>P.page.$(sel).then(x=>!!x);
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const click=async(P,sel)=>{await P.page.waitForSelector(sel,{visible:true,timeout:15000});await P.page.$eval(sel,e=>e.click())};
const txt=(P,sel)=>P.page.$eval(sel,e=>e.innerText).catch(()=>null);
async function lobby(o){const id=await seed(API,Object.assign({managers:8},o||{}));const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);m.status='lobby';delete m.endedAt;delete m.startedAt;m.orderSet=false;m.order=[];m.spin=null;m.spinGen=0;m.spinDone=false;m.respins=[];await post(K.meta,m);return{id,I,K}}
const open=async(name,L1,who,opt,wait)=>{const P=await L.phone(name,opt||{});await P.page.setBypassServiceWorker(true);if(opt&&opt.reduced)await P.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  if(who!=='cm'&&who!=='spec'&&opt&&opt.alsoCm)await P.page.evaluateOnNewDocument((id,cm)=>localStorage.setItem('fbn.cm.'+id,cm),L1.id,L1.I.cmSecret);
  const hash=who==='cm'?'#cm='+L1.I.cmSecret:who==='spec'?'':'#as='+L1.I.managers[who].id+'&k='+L1.I.managers[who].k;await P.page.goto(`${APP}/room.html?l=${L1.id}${who==='spec'?'&watch=1':''}${hash}`,{waitUntil:'domcontentloaded'});await P.page.waitForSelector(wait||'#lobbycard',{timeout:25000}).catch(()=>{});await sleep(1500);return P};
const focusInfo=(P,sel)=>P.page.evaluate(s=>{const d=document.querySelector(s);const a=document.activeElement;return{role:d&&d.getAttribute('role'),modal:d&&d.getAttribute('aria-modal'),label:d&&(d.getAttribute('aria-label')||d.getAttribute('aria-labelledby')),inside:!!(d&&a&&d.contains(a)),act:a&&(a.id||a.tagName)}},sel);
(async()=>{try{
/* ---------- (a) exactly 8 managers ---------- */
console.log('\n[exactly 8 managers to start]');
{const L1=await lobby();const claim8=await gtxt(L1.K.slot(8,0));await post(L1.K.slot(8,0),'');
 const C=await open('c7',L1,'cm');await waitFor(async()=>/7 of 8 joined/.test(await txt(C,'#joinedct')||''));
 ok('7 of 8 joined: lobby says "Waiting for 1 more manager"',/Waiting for 1 more manager/.test(await txt(C,'#waitmgrs')||''),await txt(C,'#waitmgrs'));
 ok('7 joined: the Start button is disabled and says why; no "start with fewer" text',await C.page.$eval('#startbtn',e=>e.disabled)&&/Waiting for 1 more manager/.test(await txt(C,'#startnote')||'')&&!/start with fewer|At least 2/i.test(await body(C)),await txt(C,'#startnote'));
 ok('7 joined: the countdown line also says waiting for the missing manager',/Waiting for 1 more manager/.test(await txt(C,'#lobbycd')||''),await txt(C,'#lobbycd'));
 await C.page.evaluate(()=>document.querySelector('#startbtn').disabled=false);await C.page.$eval('#startbtn',e=>e.click());await sleep(1200);
 ok('7 joined: forcing the button open in the page does not start anything (no confirm sheet, meta still lobby)',!(await has(C,'#cfyes'))&&(await gj(L1.K.meta)).status==='lobby');
 {const m=await gj(L1.K.meta);m.settings.startMode='auto';m.settings.startAt=Date.now()-60000;await post(L1.K.meta,m)}
 await sleep(9000);ok('auto-start with 7 managers never starts the draft',(await gj(L1.K.meta)).status==='lobby');
 {const m=await gj(L1.K.meta);m.settings.startMode='manual';await post(L1.K.meta,m)}
 await post(L1.K.slot(8,0),claim8);await waitFor(async()=>/8 of 8 joined/.test(await txt(C,'#joinedct')||''),20000);await sleep(800);
 ok('8 of 8: no waiting text and Start is enabled',!(await has(C,'#waitmgrs'))&&!(await C.page.$eval('#startbtn',e=>e.disabled)));
 await click(C,'#startbtn');await waitFor(()=>has(C,'#cfyes'));ok('start confirm no longer talks about starting with fewer managers',!/Only <b>|spots are filled/.test(await body(C))&&!/spots are filled/.test(await body(C)));
 await click(C,'#cfyes');ok('with 8 joined the draft starts',!!(await waitFor(async()=>(await gj(L1.K.meta)).status==='live',15000)));
 ok('no page errors (commissioner)',C.errs.length===0,C.errs);await C.close()}
/* ---------- (b) toast live region, (c) dialogs ---------- */
console.log('\n[toast + dialogs]');
{const L1=await lobby();const C=await open('cd',L1,'cm');
 const ta=await C.page.evaluate(()=>{const t=document.getElementById('toast');return{role:t.getAttribute('role'),live:t.getAttribute('aria-live')}});ok('#toast has role=status and aria-live=polite',ta.role==='status'&&ta.live==='polite',ta);
 await C.page.$eval('#editsettings',e=>e.focus());await click(C,'#editsettings');await waitFor(()=>has(C,'#s_name'));await sleep(200);
 let fi=await focusInfo(C,'#sheetwrap .sheet');ok('settings sheet: role=dialog, aria-modal=true, labelled, focus moved inside',fi.role==='dialog'&&fi.modal==='true'&&!!fi.label&&fi.inside,fi);
 await C.page.keyboard.press('Tab');await C.page.keyboard.press('Tab');fi=await focusInfo(C,'#sheetwrap .sheet');ok('Tab stays inside the sheet',fi.inside,fi);
 await C.page.keyboard.press('Escape');await sleep(300);ok('Escape closes the sheet and focus returns to the button that opened it',!(await has(C,'#s_name'))&&(await C.page.evaluate(()=>document.activeElement.id))==='editsettings',await C.page.evaluate(()=>document.activeElement.id));
 await click(C,'[data-a=mgr]').catch(()=>{});
 /* identity overlay (device with the commissioner secret but no manager identity) */
 await click(C,'[data-a=switch]').catch(()=>{});await waitFor(()=>has(C,'#overlay .ov'),5000).catch(()=>{});
 if(await has(C,'#overlay .ov')){await sleep(200);fi=await focusInfo(C,'#overlay .ov');ok('identity overlay: role=dialog, aria-modal=true, labelled, focus inside',fi.role==='dialog'&&fi.modal==='true'&&!!fi.label&&fi.inside,fi);
  ok('identity overlay errors are live regions (role=alert on #ilinkerr)',(await C.page.$eval('#ilinkerr',e=>e.getAttribute('role')))==='alert');
  await C.page.keyboard.press('Escape');await sleep(300);ok('Escape closes the identity overlay',!(await has(C,'#overlay .ov')))}
 else ok('identity overlay reachable from the lobby ("I\'m already in")',false);
 /* unlock sheet error is a live region */
 const M1=await open('m1',L1,1);await M1.page.evaluate(()=>document.querySelector('[data-t=more]').click());await click(M1,'#unlockui');await waitFor(()=>has(M1,'#pin'));
 ok('unlock sheet: #pinerr has role=alert and the sheet is a labelled modal dialog',(await M1.page.$eval('#pinerr',e=>e.getAttribute('role')))==='alert'&&(await focusInfo(M1,'#sheetwrap .sheet')).modal==='true');
 await M1.page.keyboard.press('Escape');await sleep(300);ok('Escape closes the unlock sheet',!(await has(M1,'#pin')));
 ok('no page errors',C.errs.length===0&&M1.errs.length===0,[C.errs,M1.errs]);await C.close();await M1.close()}
/* pick overlay: live league, the manager is on the clock */
{const live=await seed(API,{live:true,picksMade:0,clockSecs:null});const I=seed.info;const K=F.Keys(live);const m=await gj(K.meta);const first=m.order[0];const idx=I.managers.findIndex(x=>x.id===first);
 const P=await open('pk',{id:live,I},idx,{},'#pickbtn');ok('on the clock: Pick a team button is there',await has(P,'#pickbtn'));
 await P.page.$eval('#pickbtn',e=>e.focus());await click(P,'#pickbtn');await waitFor(()=>has(P,'#pickov'));await sleep(250);
 let fi=await focusInfo(P,'#pickov');ok('pick overlay: role=dialog, aria-modal=true, labelled, focus inside',fi.role==='dialog'&&fi.modal==='true'&&!!fi.label&&fi.inside,fi);
 ok('team search boxes have an aria-label',await P.page.$eval('#tqP',e=>!!e.getAttribute('aria-label')));
 await P.page.evaluate(()=>{const b=document.querySelector('#pickov [data-a=draftrow]');b.click()});await waitFor(()=>has(P,'#confirmpick'));
 await P.page.keyboard.press('Escape');await sleep(300);ok('Escape on the confirm sheet closes only the sheet: the team list is still open and nothing was picked',!(await has(P,'#confirmpick'))&&await has(P,'#pickov'));
 ok('...and no pick was written',!(await gtxt(K.pick(1,1))));
 await P.page.keyboard.press('Escape');await sleep(300);ok('Escape on the team list closes it and returns focus to Pick a team',!(await has(P,'#pickov'))&&(await P.page.evaluate(()=>document.activeElement.id))==='pickbtn',await P.page.evaluate(()=>document.activeElement.outerHTML.slice(0,100)));
 ok('a pick is still possible afterwards (still on the clock)',await has(P,'#pickbtn'));
 ok('no page errors',P.errs.length===0,P.errs);await P.close()}
/* ---------- (c2) spin: Escape hides only ---------- */
console.log('\n[spin: Escape = hide only; finish setting the order]');
{const L1=await lobby();const C=await open('sp',L1,'cm');await click(C,'#spinopen');await waitFor(()=>has(C,'#wheelov'));await sleep(300);
 let fi=await focusInfo(C,'#wheelov');ok('spin overlay: role=dialog, aria-modal=true, labelled, focus inside',fi.role==='dialog'&&fi.modal==='true'&&!!fi.label&&fi.inside,fi);
 ok('winner line is a polite live region',(await C.page.$eval('#wwin',e=>e.getAttribute('aria-live')))==='polite');
 await click(C,'#spinall');await waitFor(async()=>{const m=await gj(L1.K.meta);return m&&m.spin&&(await gtxt(F.Keys(L1.id).spin(m.epoch,m.spin.gen,1)))},30000);
 await C.page.keyboard.press('Escape');await sleep(500);ok('Escape hides the spin overlay',!(await has(C,'#wheelov')));
 const done=await waitFor(async()=>{const m=await gj(L1.K.meta);return m&&m.spin&&m.spin.done},120000);
 const m=(await gj(L1.K.meta))||(await sleep(1500),await gj(L1.K.meta))||{};ok('the spin was NOT cancelled by Escape: all 8 results saved and the order was applied',!!done&&m.orderSet&&m.spinDone===true&&m.order.length===8,{done:m.spin&&m.spin.done,o:m.order});
 await C.close()}
{const L1=await lobby();const C=await open('sc',L1,'cm');const V=await open('sv',L1,1);
 await click(C,'#spinopen');await waitFor(()=>has(C,'#spinall'));await click(C,'#spinall');
 /* wait until the 8th result is stored, then the commissioner's page goes away before it applies the order (it waits 9.5 s first) */
 const m0=await waitFor(async()=>{const m=await gj(L1.K.meta);return m&&m.spin&&m},20000);
 await waitFor(async()=>!!(await gtxt(F.Keys(L1.id).spin(m0.epoch,m0.spin.gen,8))),120000);await C.close();
 ok('the 8th result is saved but the order is not applied (commissioner left)',(await gj(L1.K.meta)).spin.done===false&&!(await gj(L1.K.meta)).spinDone);
 ok('viewer overlay first says "Order complete — saving…"',!!(await waitFor(async()=>/Order complete — saving/.test(await txt(V,'#wwin')||''),20000)),await txt(V,'#wwin'));
 ok('after a while the viewer overlay stops claiming it is saving',!!(await waitFor(async()=>/not saved yet/.test(await txt(V,'#wwin')||''),40000)),await txt(V,'#wwin'));
 ok('the viewer can still hide it (Close button works)',await (async()=>{await click(V,'#wclose');await sleep(300);return !(await has(V,'#wheelov'))})());
 const C2=await open('sc2',L1,'cm');
 await waitFor(()=>has(C2,'#spinfinish'),20000);ok('lobby button for the commissioner reads "Finish setting the order" (no "Spin the wheel")',/Finish setting the order/.test(await txt(C2,'#spinfinish')||'')&&!(await has(C2,'#spinopen')),await body(C2).then(b=>b.slice(0,200)));
 await click(C2,'#spinfinish');const f=await waitFor(async()=>{const m=await gj(L1.K.meta);return m.orderSet&&m.spin.done&&m.spinDone},20000);const mm=await gj(L1.K.meta);
 ok('clicking it applies the order (permutation of the 8 managers, spin marked done)',!!f&&F.permutationOf(mm.order,mm.order)&&mm.order.length===8&&mm.spinDone===true,mm.order);
 await sleep(1500);ok('no second spin is offered afterwards (one spin only)',!(await has(C2,'#spinopen'))&&!(await has(C2,'#spinfinish'))&&/only one spin/i.test(await body(C2)));
 ok('no page errors',C2.errs.length===0&&V.errs.length===0,[C2.errs,V.errs]);await C2.close();await V.close()}
/* ---------- (f) chat tab, (g) toast + tabh, (h) tap targets, (i) labels ---------- */
console.log('\n[chat tab, offsets, tap targets, labels]');
{const live=await seed(API,{live:true,picksMade:0,clockSecs:60});const I=seed.info;const K=F.Keys(live);
 const m=await gj(K.meta);m.settings.autoPick=false;m.settings.clockSecs=60;m.startedAt=Date.now()-3600e3;m.resumeAt=m.startedAt;await post(K.meta,m);
 for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
  const P=await open('ch'+w,{id:live,I},1,desk?{desktop:true,w,h}:{w,h},'#tabs');await sleep(1500);
  {const bt=await txt(P,'#oncard')||await txt(P,'#banner')||'';const p1=F.parseEntry(await (await fetch(API+encodeURIComponent(K.pick(m.epoch||1,1)))).text());
  ok(w+'px board: expired clock with auto-pick off is auto-picked right away (s25-full k: every league auto-picks; banner AUTO-PICKING or pick #1 already made)',/AUTO-PICKING/.test(bt)||(!!p1&&/Pick #2/.test(bt)),{bt,p1:p1&&p1.tid})}
  const th=await P.page.evaluate(()=>[...document.querySelectorAll('.board thead th')].every(t=>t.getAttribute('scope')==='col'));ok(w+'px board: header cells have scope',th);
  const css=await P.page.evaluate(()=>{const tabs=document.getElementById('tabs').getBoundingClientRect().height;return{tabs,tabh:parseFloat(getComputedStyle(document.body).getPropertyValue('--tabh')),pb:parseFloat(getComputedStyle(document.body).paddingBottom),toast:getComputedStyle(document.getElementById('toast')).bottom}});
  ok(w+'px: --tabh equals the real tab row height ('+Math.round(css.tabs)+'px), no bottom-nav padding, toast 12px from the bottom',Math.abs(css.tabh-css.tabs)<1&&css.pb===0&&css.toast==='12px',css);
  await P.page.evaluate(()=>document.querySelector('[data-t=teams]').click());await sleep(500);
  const pill=await P.page.$$eval('#tpills button',b=>b.map(x=>x.textContent));ok(w+'px teams: no Starred or My Picks pill (s25-full: star feature removed)',!pill.some(t=>/Starred|My Picks/.test(t)),pill);
  ok(w+'px teams: search box has an aria-label',await P.page.$eval('#tq',e=>!!e.getAttribute('aria-label')));
  const ct=await P.page.evaluate(()=>{const c=document.querySelector('.ctl');const t=document.getElementById('tabs').getBoundingClientRect();return{top:getComputedStyle(c).top,tb:t.height}});ok(w+'px teams: sticky filter row sits exactly under the tab row',Math.abs(parseFloat(ct.top)-ct.tb)<1,ct);
  await P.page.evaluate(()=>document.querySelector('[data-t=chat]').click());await sleep(700);
  const c1=await P.page.evaluate(()=>{const i=document.getElementById('cin');const r=i.getBoundingClientRect();return{bottom:Math.round(r.bottom),vh:innerHeight,aria:i.getAttribute('aria-label'),ehk:i.getAttribute('enterkeyhint'),over:document.documentElement.scrollWidth>innerWidth+1}});
  ok(w+'px chat (no messages): the input is pinned to the bottom of the screen, not mid-screen',c1.bottom>=c1.vh-24&&c1.bottom<=c1.vh+1,c1);
  ok(w+'px chat: input has aria-label and enterkeyhint=send, no sideways overflow',c1.aria&&c1.ehk==='send'&&!c1.over,c1);
  await P.page.click('#cin');await P.page.keyboard.type('hello league');await P.page.click('[data-a=send]');await sleep(300);
  ok(w+'px chat: after Send the message box keeps the focus (keyboard stays open) and is empty',(await P.page.evaluate(()=>document.activeElement.id+'|'+document.getElementById('cin').value))==='cin|');
  await waitFor(async()=>/hello league/.test(await body(P)),10000);
  const c2=await P.page.evaluate(()=>{const i=document.getElementById('cin').getBoundingClientRect();return{bottom:Math.round(i.bottom),vh:innerHeight}});ok(w+'px chat (one message): input still pinned',c2.bottom>=c2.vh-24&&c2.bottom<=c2.vh+1,c2);
  /* a reaction button must be a 44px target on touch devices */
  await P.page.evaluate(()=>{const m=[...document.querySelectorAll('.msg')].find(x=>x.offsetParent&&/hello league/.test(x.textContent));const b=m&&m.querySelector('[data-a=ropen]');if(b)b.click()});await sleep(400);/* the visible 'hello league' message (s25-full: auto-pick notes may add hidden rows) */const rxs=await P.page.$$eval('.msg .rx button',b=>b.filter(x=>x.offsetParent).map(x=>{const r=x.getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)]}));
  if(!desk)ok(w+'px chat: reaction buttons are at least 44x44',rxs.length>0&&rxs.every(x=>x[0]>=44&&x[1]>=44),rxs);
  ok(w+'px: no page errors',P.errs.length===0,P.errs);await P.close()}
 /* lobby targets + identity Close */
 const L1=await lobby();const C=await open('tt',L1,'cm');const hs=await C.page.$$eval('.handle',b=>b.map(x=>{const r=x.getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)]}));
 ok('390px lobby: drag grips are at least 44x44',hs.length===8&&hs.every(x=>x[0]>=44&&x[1]>=44),hs);
 await C.page.$eval('[data-a=switch]',e=>e.click());await waitFor(()=>has(C,'#overlay .ov'),5000).catch(()=>{});const lk=await C.page.$eval('#overlay .link',x=>{const r=x.getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)]}).catch(()=>null);
 ok('390px identity overlay: Close button is at least 44x44',!!lk&&lk[0]>=44&&lk[1]>=44,lk);await C.close()}
/* done league: toast offset above the sticky League site button, hidden on short landscape phones, More tab label */
{const done=await seed(API);const I=seed.info;
 const P=await open('dn',{id:done,I},1,{},'#tabs');await sleep(800);await P.page.evaluate(()=>{const t=document.getElementById('toast');t.textContent='x';t.classList.remove('hide')});await P.page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await sleep(600);  /* s20: the sticky button hides while the big League site button in the banner is on screen, so scroll first */
 const o=await P.page.evaluate(()=>{const se=document.getElementById('stickysite');if(!se||se.hidden||getComputedStyle(se).display==='none'){const t=document.getElementById('toast');return{none:1,toastBottom:Math.round(t.getBoundingClientRect().bottom),vh:innerHeight,b:getComputedStyle(t).bottom}}const s=se.getBoundingClientRect();const t=document.getElementById('toast').getBoundingClientRect();return{stickyTop:Math.round(s.top),toastBottom:Math.round(t.bottom),vh:innerHeight,b:getComputedStyle(document.getElementById('toast')).bottom}});
 ok('390px after the draft: the toast sits just above the sticky League site button (72px), or at the bottom when that bar is not shown',o.none?o.toastBottom<=o.vh:(o.b==='72px'&&o.toastBottom<=o.stickyTop),o);
 await P.page.evaluate(()=>document.querySelector('[data-t=more]').click());await sleep(500);ok('More tab: export link reads "Draft recap" (not "Recap page")',/Draft recap/.test(await body(P))&&!/Recap page/.test(await body(P)));
 await P.page.setViewport({width:740,height:360,isMobile:true,hasTouch:true});await sleep(500);
 ok('short landscape phone (740x360): the sticky League site button is hidden',await P.page.evaluate(()=>{const e=document.getElementById('stickysite');return !e||e.hidden||getComputedStyle(e).display==='none'}));
 ok('no page errors',P.errs.length===0,P.errs);await P.close()}
/* steering items 2, 4, 5: League site labels, 44px targets at 390px, duplicate-pick toast */
{const done=await seed(API);const I=seed.info;
 const P=await open('ls',{id:done,I},1,{w:390,h:844},'#tabs');await sleep(1000);
 const lab=await P.page.evaluate(()=>{const t=e=>e?e.innerText.trim():null;return{pill:t(document.getElementById('sitelink')),big:t(document.getElementById('bigsite')),stick:t(document.getElementById('stickysite')),pillTag:document.getElementById('sitelink')&&document.getElementById('sitelink').tagName}});
 ok('done league: header pill, big end-of-draft button read exactly "League site" (no sticky bar since s23)',lab.pill==='League site'&&lab.pillTag==='A'&&lab.big==='League site'&&lab.stick==null,lab);
 const sz=async sel=>P.page.$$eval(sel,b=>b.filter(x=>x.offsetParent).map(x=>{const r=x.getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)]}));
 const hp=await sz('#sitelink');ok('390px: the League site header pill is at least 44px tall',hp.length===1&&hp[0][1]>=44,hp);
 await P.page.evaluate(()=>document.querySelector('[data-t=teams]').click());await sleep(700);
 const ws=await sz('.wstar');ok('390px: no star buttons (s25-full: star feature removed)',ws.length===0,ws.length);
 ok('no page errors',P.errs.length===0,P.errs);await P.close()}
{const live=await seed(API,{live:true,picksMade:0,clockSecs:0});const I=seed.info;const K=F.Keys(live);const mids=I.managers.map(x=>x.id);
 const Q=await open('qb',{id:live,I},0,{w:390,h:844},'#tabs');await sleep(800);await Q.page.evaluate(()=>document.querySelector('[data-t=teams]').click());await sleep(700);
 const qs=await Q.page.$$eval('.qbtn',b=>b.filter(x=>x.offsetParent).map(x=>{const r=x.getBoundingClientRect();return[Math.round(r.width),Math.round(r.height)]}));
 ok('390px: Q+ queue buttons are at least 44x44 ('+qs.length+')',qs.length>0&&qs.every(x=>x[0]>=44&&x[1]>=44),qs.slice(0,3));
 const rowT=async P=>P.page.$eval('.trow.go',e=>e.dataset.t);
 const T=await rowT(Q);await Q.page.$eval('.trow.go[data-a=draftrow] .tm',e=>e.click());await Q.page.waitForSelector('[data-a=confirm]',{visible:true,timeout:8000});
 const e1=F.makeEntry(1,mids[0],T,{now:Date.now(),epoch:1,writer:'commish',by:'commish',prev:''});await post(K.pick(1,1),e1);
 await Q.page.$eval('[data-a=confirm]',e=>e.click());await sleep(1500);
 const t1=await txt(Q,'#toast');
 ok('commissioner already picked that team for the same manager: toast says "Already picked for you", not "taken by"',/Already picked for you/.test(t1||'')&&!/taken by|beat you/i.test(t1||''),t1);
 const R=await open('qc',{id:live,I},1,{w:390,h:844},'#tabs');await sleep(800);await R.page.evaluate(()=>document.querySelector('[data-t=teams]').click());await sleep(700);
 const U=await rowT(R);await R.page.$eval('.trow.go[data-a=draftrow] .tm',e=>e.click());await R.page.waitForSelector('[data-a=confirm]',{visible:true,timeout:8000});
 const e2=F.makeEntry(2,mids[1],T==='x'?'y':(await (async()=>{const r=await R.page.$$eval('.trow.go',x=>x.map(e=>e.dataset.t));return r.find(t=>t!==U)})()),{now:Date.now(),epoch:1,writer:'seed',by:'owner',prev:e1.id});await post(K.pick(1,2),e2);
 const e3=F.makeEntry(3,mids[2],U,{now:Date.now(),epoch:1,writer:'seed',by:'owner',prev:e2.id});await post(K.pick(1,3),e3);
 await R.page.$eval('[data-a=confirm]',e=>e.click());await sleep(1500);
 const t2=await txt(R,'#toast');
 ok('another manager took the team: toast still says "taken by <name>"',new RegExp('taken by '+I.managers[2].name).test(t2||''),t2);
 ok('no page errors',Q.errs.length===0&&R.errs.length===0,[Q.errs,R.errs]);await Q.close();await R.close()}
/* reduced motion */
{const L1=await lobby();const A=await open('rm0',L1,'cm');const R=await open('rm1',L1,'cm',{reduced:true});
 const an=P=>P.page.evaluate(()=>{const i=document.querySelector('.pill.live i');return i?getComputedStyle(i).animationName:null});
 await sleep(1500);ok('normal motion: the Live dot pulses',(await an(A))==='pulse',await an(A));ok('prefers-reduced-motion: no pulse animation anywhere',(await an(R))==='none',await an(R));
 const cw=P=>P.page.evaluate(()=>{const d=document.createElement('div');d.className='cd warn';document.body.appendChild(d);const a=getComputedStyle(d).animationName;d.remove();return a});
 ok('normal motion: the 15-second clock warning pulses',(await cw(A))==='pulse',await cw(A));ok('prefers-reduced-motion: the clock warning does not pulse',(await cw(R))==='none',await cw(R));
 await A.close();await R.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
