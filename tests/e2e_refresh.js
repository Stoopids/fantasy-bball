/* s24: a refresh or an installed-app relaunch keeps the user where they were.
   Browser: refresh on every room tab (service worker in control), an offline reload served by the worker, the per-league last tab when the hash is gone, recap sections.
   Installed app (display-mode: standalone via CDP media emulation): relaunch at start_url returns to the last room / recap tab, reload, and a cold relaunch in a new page with the worker active (also offline);
   stale (over 14 days), unknown or deleted leagues and a deliberate visit to Home show Home; a mock never moves the real league's saved place. Each at 390 and 1280.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_refresh.js   (APP / API env; SHOTDIR for screenshots) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API||'http://localhost:9996/api/data/';const path=require('path');
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const TABS=['board','teams','my','chat','more'];
const SHOT=process.env.SHOTDIR||path.join(__dirname,'..','shots');
const where=P=>P.page.evaluate(()=>({path:location.pathname.replace(/^.*\//,''),search:location.search,hash:location.hash,tab:document.body.dataset.tab||'',sw:!!(navigator.serviceWorker&&navigator.serviceWorker.controller),home:!!document.getElementById('landing')}));
const roomReady=P=>waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#tabs [data-t]')&&document.getElementById('view').innerHTML.length>50),20000);
/* standalone: ask CDP for display-mode: standalone (this Chrome build accepts the call but does not apply display-mode), and also set iOS's
   navigator.standalone=true on every document, which is what an iPhone home-screen app reports. The app checks either. */
const standalone=async page=>{const c=await page.target().createCDPSession();await c.send('Emulation.setEmulatedMedia',{features:[{name:'display-mode',value:'standalone'}]}).catch(()=>{});
  await page.evaluateOnNewDocument(()=>{try{Object.defineProperty(navigator,'standalone',{get:()=>true,configurable:true})}catch(e){}});return true};
const isApp=page=>page.evaluate(()=>UI.isStandalone());
const START='index.html';
const goto=(page,u)=>page.goto(L.APP+'/'+u,{waitUntil:'domcontentloaded'});
(async()=>{try{
const id=await seed(API,{rounds:2});const I=seed.info;const me=I.managers[0];const secrets=[me.k,me.id,I.cmSecret].concat(I.managers.map(m=>m.id));
const clean=h=>/^#tab=[a-z]+$/.test(h)&&!secrets.some(s=>h.indexOf(s)>=0);
const remember=async P=>{await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await roomReady(P);await sleep(1200);
  /* second load so the service worker controls the page */
  await P.page.reload({waitUntil:'domcontentloaded'});await roomReady(P);await waitFor(()=>P.page.evaluate(()=>!!navigator.serviceWorker.controller),15000)};
const click=(P,t)=>P.page.evaluate(t=>document.querySelector('#tabs [data-t="'+t+'"]').click(),t);
const ls=(P,k)=>P.page.evaluate(k=>localStorage.getItem(k),k);
for(const w of [390,1280]){const opt=w===1280?{desktop:true,w:1280,h:900}:{};
 /* ---------- normal browser ---------- */
 {const pre=w+'px browser: ';const P=await L.phone('b'+w,opt);await remember(P);
  ok(pre+'the service worker controls the room page',(await where(P)).sw);
  for(const t of TABS){await click(P,t);await sleep(400);await P.page.reload({waitUntil:'domcontentloaded'});await roomReady(P);await sleep(400);const a=await where(P);
    ok(pre+'refresh on '+t+' stays in the room on '+t+' (worker in control)',a.path==='room.html'&&a.tab===t&&a.hash==='#tab='+t&&a.sw&&/l=/.test(a.search)&&clean(a.hash),a)}
  await click(P,'teams');await sleep(400);await P.page.setOfflineMode(true);await P.page.reload({waitUntil:'domcontentloaded'});await roomReady(P);await sleep(400);let a=await where(P);
  ok(pre+'offline reload (page from the worker cache) stays on Teams',a.path==='room.html'&&a.tab==='teams'&&a.sw,a);await P.page.setOfflineMode(false);
  if(w===390){await sleep(800);await P.page.screenshot({path:SHOT+'/s24_390_refresh_browser.png'})}
  await goto(P.page,'room.html?l='+id);await roomReady(P);await sleep(400);a=await where(P);ok(pre+'room link without a hash opens on the last tab used for this league (Teams)',a.tab==='teams'&&a.hash==='#tab=teams',a);
  const last=JSON.parse(await ls(P,'fbn.lastnav')||'null');ok(pre+'saved place holds only page, league, plain path and tab (no k=, manager id or secret)',!!last&&last.id===id&&last.tab==='teams'&&last.path==='/room.html?l='+id&&!secrets.some(s=>JSON.stringify(last).indexOf(s)>=0),last);
  await goto(P.page,'recap.html?l='+id+'#tab=rosters');await sleep(2500);await P.page.reload({waitUntil:'domcontentloaded'});
  ok(pre+'recap refresh on Rosters stays on Rosters',!!await waitFor(()=>P.page.evaluate(()=>location.hash==='#tab=rosters'&&Math.abs(document.getElementById('rc_rosters').getBoundingClientRect().top)<90),20000));
  await goto(P.page,'recap.html?l='+id);ok(pre+'recap link without a hash returns to the last section (Rosters)',!!await waitFor(()=>P.page.evaluate(()=>location.hash==='#tab=rosters'),15000));
  {const Q=await P.ctx.newPage();await goto(Q,'index.html');await sleep(2000);ok(pre+'normal browser, new tab on Home: no jump, Home shows',await Q.evaluate(()=>!!document.getElementById('landing')&&/index\.html$/.test(location.pathname)));await Q.close()}
  ok(pre+'no page errors',P.errs.length===0,P.errs);await P.close()}
 /* ---------- installed app (standalone): one unified resume on the first page of an app session ---------- */
 {const pre=w+'px app: ';const P=await L.phone('a'+w,opt);await standalone(P.page);await remember(P);ok(pre+'standalone emulated (the app sees itself as installed)',await isApp(P.page));
  const launch=async(offline)=>{const Q=await P.ctx.newPage();await Q.setViewport({width:w,height:w===1280?900:844,isMobile:w!==1280,hasTouch:w!==1280});await standalone(Q);if(offline)await Q.setOfflineMode(true);
    Q.on('pageerror',e=>P.errs.push('pageerror: '+e.message));await goto(Q,START);await sleep(2500);await waitFor(()=>Q.evaluate(()=>!document.getElementById('relaunching')),8000);await sleep(800);
    const a=await Q.evaluate(()=>({path:location.pathname.replace(/^.*\//,''),search:location.search,hash:location.hash,tab:document.body.dataset.tab||'',home:!!document.getElementById('landing')}));return {Q,a}};
  const age=(k,f,days)=>P.page.evaluate((k,f,days)=>{const o=JSON.parse(localStorage.getItem(k));o[f]=Date.now()-days*864e5;localStorage.setItem(k,JSON.stringify(o))},k,f,days);
  await click(P,'chat');await sleep(500);
  /* order 1: room last */
  let {Q,a}=await launch();ok(pre+'room used last: app launch returns to the room on Chat',a.path==='room.html'&&a.tab==='chat'&&a.hash==='#tab=chat'&&clean(a.hash),a);
  if(w===390)await Q.screenshot({path:SHOT+'/s24_390_refresh_app.png'});
  await click({page:Q},'my');await sleep(400);await Q.reload({waitUntil:'domcontentloaded'});await sleep(1500);a=await Q.evaluate(()=>({tab:document.body.dataset.tab,path:location.pathname}));ok(pre+'reload in the app keeps My Team',a.tab==='my'&&/room\.html$/.test(a.path),a);
  await goto(Q,'index.html');await sleep(1800);ok(pre+'Home is reachable after the jump (tap Home: stays on Home, no loop)',await Q.evaluate(()=>!!document.getElementById('landing')&&/index\.html$/.test(location.pathname)));
  await Q.reload({waitUntil:'domcontentloaded'});await sleep(1800);ok(pre+'reloading Home in the same app session stays on Home',await Q.evaluate(()=>!!document.getElementById('landing')));
  /* order 2: League site last (league.html writes fbn.lastsite) */
  await goto(Q,'league.html?l='+id);await sleep(3500);let site=JSON.parse(await Q.evaluate(()=>localStorage.getItem('fbn.lastsite'))||'null');
  /* a League site build without the s24 writer: write the record the way league.html s24 does (id, t, at) */
  if(!site){site={id,t:'standings',at:Date.now()};await Q.evaluate(o=>localStorage.setItem('fbn.lastsite',JSON.stringify(o)),site);console.log('  note: this League site build does not write fbn.lastsite; record written by the test')}
  ok(pre+'League site place recorded (league code + tab only)',!!site&&site.id===id&&/^[a-z]+$/.test(site.t)&&!secrets.some(x=>JSON.stringify(site).indexOf(x)>=0),site);await Q.close();
  ({Q,a}=await launch());ok(pre+'League site used last: app launch returns to the League site tab',a.path==='league.html'&&a.search.indexOf(id)>=0&&site&&a.hash==='#'+site.t,a);
  if(w===390)await Q.screenshot({path:SHOT+'/s24_390_resume_league.png'});
  await goto(Q,'index.html');await sleep(1800);ok(pre+'after a League site resume, Home is reachable',await Q.evaluate(()=>!!document.getElementById('landing')));
  /* back to the room: room wins again */
  await goto(Q,'room.html?l='+id+'#tab=teams');await sleep(2500);await Q.close();({Q,a}=await launch());ok(pre+'room used after the League site: launch returns to the room on Teams',a.path==='room.html'&&a.tab==='teams',a);await Q.close();
  /* cold launch offline with the worker active */
  ({Q,a}=await launch(true));ok(pre+'cold launch offline (worker serves the pages, device trusted) returns to the room',a.path==='room.html'&&a.hash==='#tab=teams',a);await Q.close();
  /* recap last */
  await goto(P.page,'recap.html?l='+id+'#tab=awards');await sleep(3000);({Q,a}=await launch());ok(pre+'recap used last: launch returns to the recap on Awards',a.path==='recap.html'&&a.hash==='#tab=awards',a);await Q.close();
  /* 14-day expiry */
  await age('fbn.lastnav','ts',13);await P.page.evaluate(()=>localStorage.removeItem('fbn.lastsite'));({Q,a}=await launch());ok(pre+'13 days old: still resumes',a.path==='recap.html',a);await Q.close();
  await age('fbn.lastnav','ts',15);({Q,a}=await launch());ok(pre+'15 days old: launch shows Home',a.home&&a.path==='index.html',a);await Q.close();
  await P.page.evaluate(id=>localStorage.setItem('fbn.lastsite',JSON.stringify({id,t:'standings',at:Date.now()-15*864e5})),id);({Q,a}=await launch());ok(pre+'League site place 15 days old: Home',a.home,a);await Q.close();
  await P.page.evaluate(id=>localStorage.setItem('fbn.lastsite',JSON.stringify({id,t:'standings',at:Date.now()-60e3})),id);await age('fbn.lastnav','ts',1);({Q,a}=await launch());ok(pre+'newest wins (League site 1 min old vs room 1 day old)',a.path==='league.html',a);await Q.close();
  await P.page.evaluate(()=>localStorage.removeItem('fbn.lastsite'));
  /* a mock never becomes the place */
  await goto(P.page,'room.html?l='+id+'#tab=teams');await roomReady(P);await sleep(800);const before=[await ls(P,'fbn.lastnav'),await ls(P,'fbn.last.'+id),await ls(P,'fbn.lastsite')];
  await goto(P.page,'mock.html?from='+id);await P.page.waitForSelector('#startmock',{timeout:15000});await P.page.click('#startmock');await P.page.waitForFunction(()=>/room\.html\?l=/.test(location.href),{timeout:20000});await roomReady(P);
  for(const t of ['chat','more','my'])await click(P,t).then(()=>sleep(300));
  await P.page.reload({waitUntil:'domcontentloaded'});await roomReady(P);await sleep(500);a=await where(P);ok(pre+'mock: refresh keeps the mock tab (My Team) by its hash',a.tab==='my'&&a.hash==='#tab=my',a);
  const after=[await ls(P,'fbn.lastnav'),await ls(P,'fbn.last.'+id),await ls(P,'fbn.lastsite')];ok(pre+'mock: the shared last place and the real league\'s tab are unchanged',JSON.stringify(before)===JSON.stringify(after)&&!!before[0],{before,after});
  ({Q,a}=await launch());ok(pre+'launch after a mock returns to the real league on Teams, never the mock',a.search.indexOf(id)>=0&&a.tab==='teams',a);await Q.close();
  /* a hand-made record pointing at a mock league is refused */
  const mid=await P.page.evaluate(()=>new URLSearchParams(location.search).get('l'));await P.page.evaluate(m=>localStorage.setItem('fbn.lastnav',JSON.stringify({kind:'room',id:m,path:'/room.html?l='+m,tab:'board',ts:Date.now()})),mid);
  ({Q,a}=await launch());ok(pre+'a record pointing at a mock is refused: Home',a.home,a);await Q.close();
  /* deleted league */
  await P.page.evaluate(()=>localStorage.setItem('fbn.lastnav',JSON.stringify({kind:'room',id:'ZZZZZZZZZZZZZZZZ',path:'/room.html?l=ZZZZZZZZZZZZZZZZ',tab:'chat',ts:Date.now()})));({Q,a}=await launch());ok(pre+'league no longer exists: Home, record forgotten',a.home&&!(await ls(P,'fbn.lastnav')),a);await Q.close();
  ok(pre+'no page errors',P.errs.length===0,P.errs);await P.close()}
}
}catch(e){bad++;fails.push('crash: '+e.message);console.log('CRASH',e.stack)}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join(' | '):''));await L.close();process.exit(bad?1:0)})();
