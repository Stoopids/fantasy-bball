/* s24: refresh keeps the League site tab, with the service worker ACTIVE, in a normal mobile browser and in home-screen (standalone) mode, 390px.
   Also: a reload whose hash got lost, a standalone launch at the manifest start_url (index.html) reopening the last tab, Home still reachable, no identity in URLs.
   node tests/e2e_refresh_s24.js  (APP / API env, mock store). Screenshots to SHOTS (default /workspace/league-site-work/compare-s24). */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s24';
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const secretFree=(u,info)=>!/[?&#](k|as|cm|mid)=/i.test(u)&&!info.managers.some(m=>u.includes(m.k)||u.includes(m.id));
async function phone(id,info,o){o=o||{};const P=await L.phone('r'+Math.random().toString(36).slice(2,6),{});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  if(o.sa){await P.page.emulateMediaFeatures([{name:'display-mode',value:'standalone'}]).catch(()=>{});
    await P.page.evaluateOnNewDocument(()=>{try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});const mm=window.matchMedia.bind(window);window.matchMedia=q=>/display-mode:\s*standalone/.test(q)?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:mm(q)}catch(e){}})}
  return P}
const ready=P=>P.page.waitForSelector('#lapp[data-ready]',{timeout:30000});
const cur=P=>P.page.$eval('#ltabs [aria-current=page]',e=>e.dataset.v).catch(()=>null);
const swOn=P=>P.page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:20000}).then(()=>true).catch(()=>false);
async function reload(P){await P.page.reload({waitUntil:'domcontentloaded'});await ready(P);await sleep(400)}
(async()=>{try{
  const id=await seed();const info=seed.info;const exp=APP+'/league.html?l='+id;
  for(const mode of ['browser','standalone']){const sa=mode==='standalone';const P=await phone(id,info,{sa});
    await P.go('league.html?l='+id);await ready(P);await P.page.evaluate(()=>navigator.serviceWorker.ready.then(()=>1));await reload(P);
    const ctl=await swOn(P);ok(mode+': the service worker controls the page',ctl);
    ok(mode+': display-mode reads '+(sa?'standalone':'browser'),(await P.page.evaluate(()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true))===sa);
    await P.page.click('#ltabs [data-v="bets"]');await sleep(300);
    for(let i=1;i<=3;i++){await reload(P);ok(mode+': reload #'+i+' through the service worker stays on Bets, URL keeps ?l=CODE#bets',(await cur(P))==='bets'&&P.page.url()===exp+'#bets'&&!!(await P.page.evaluate(()=>navigator.serviceWorker.controller)),P.page.url())}
    await P.page.click('#ltabs [data-v="teams"]');await sleep(300);await reload(P);ok(mode+': switch to Teams, reload -> Teams',(await cur(P))==='teams');
    await P.page.waitForSelector('#ltabs');await P.page.screenshot({path:SH+'/s24_refresh_'+mode+'_390.png'});
    /* the hash got lost (e.g. a reload of a bare ?l=CODE URL) */
    await P.page.evaluate(id=>history.replaceState(null,'','league.html?l='+id),id);await reload(P);ok(mode+': reload of a URL that lost its hash reopens the last tab (Teams) and puts #teams back',(await cur(P))==='teams'&&P.page.url()===exp+'#teams',P.page.url());
    ok(mode+': every URL stays free of identity',secretFree(P.page.url(),info));
    /* slow network: the worker answers from its saved copy; the tab must still be kept */
    await fetch(APP+'/__cfg?lat=0').catch(()=>{});
    await P.page.click('#ltabs [data-v="games"]');await sleep(200);await P.page.setOfflineMode(true);await P.page.reload({waitUntil:'domcontentloaded'}).catch(()=>{});await sleep(1500);
    const offT=await P.page.evaluate(()=>({u:location.href,html:!!document.getElementById('lapp')||!!document.getElementById('app'),off:/You are offline/.test(document.body.innerText)}));await P.page.setOfflineMode(false);
    ok(mode+': offline reload is answered by the worker with the saved league page (not Home, not the offline notice) and keeps #games',offT.u===exp+'#games'&&offT.html&&!offT.off,offT);
    await P.page.reload({waitUntil:'domcontentloaded'});await ready(P);ok(mode+': back online, reload -> Games',(await cur(P))==='games');
    /* launch at the manifest start_url (a new app session = new page) */
    const Q=await P.ctx.newPage();await Q.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
    if(sa){await Q.emulateMediaFeatures([{name:'display-mode',value:'standalone'}]).catch(()=>{});await Q.evaluateOnNewDocument(()=>{try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});const mm=window.matchMedia.bind(window);window.matchMedia=q=>/display-mode:\s*standalone/.test(q)?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:mm(q)}catch(e){}})}
    await Q.goto(APP+'/index.html',{waitUntil:'domcontentloaded'});await sleep(2500);
    const qu=Q.url();const qtab=await Q.$eval('#ltabs [aria-current=page]',e=>e.dataset.v).catch(()=>null);
    if(sa){ok('standalone: launching the app at start_url (index.html) reopens the League site on the last tab (Games), no identity in the URL',qu===exp+'#games'&&qtab==='games'&&secretFree(qu,info),{qu,qtab});
      await Q.screenshot({path:SH+'/s24_refresh_standalone_launch_390.png'});
      await Q.goto(APP+'/index.html',{waitUntil:'domcontentloaded'});await sleep(800);ok('standalone: Home is still reachable in the same app session (no second redirect)',/index\.html$/.test(Q.url())&&!!(await Q.$('#landing')),Q.url())}
    else ok('browser: opening index.html is Home as before (no redirect)',/index\.html$/.test(qu)&&!!(await Q.$('#landing')),qu);
    await Q.close();
    /* plain open from elsewhere in the browser still starts on Standings */
    if(!sa){const R=await P.ctx.newPage();await R.goto(exp,{waitUntil:'domcontentloaded'});await R.waitForSelector('#lapp[data-ready]',{timeout:30000});await sleep(300);ok('browser: a fresh open of ?l=CODE (e.g. from the draft room) starts on Standings, URL unchanged',(await R.$eval('#ltabs [aria-current=page]',e=>e.dataset.v))==='standings'&&R.url()===exp,R.url());await R.close()}
    else{const R=await P.ctx.newPage();await R.emulateMediaFeatures([{name:'display-mode',value:'standalone'}]).catch(()=>{});await R.evaluateOnNewDocument(()=>{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true})});await R.goto(exp,{waitUntil:'domcontentloaded'});await R.waitForSelector('#lapp[data-ready]',{timeout:30000});await sleep(300);ok('standalone: an app launch straight at ?l=CODE without a hash reopens the last tab for this league',(await R.$eval('#ltabs [aria-current=page]',e=>e.dataset.v))==='games',R.url());await R.close()}
    ok(mode+': no page errors',P.errs.length===0,P.errs);await P.close()}
  /* s24 HOOK.md hook 1: a mock league (meta.mock) neither writes nor follows fbn.lastsite / the last-tab memory; a real league still does */
  {const idM=await seed(null,{mock:true});const infoM=seed.info;const P=await phone(idM,infoM,{});
    await P.page.evaluateOnNewDocument((idM)=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('fbn.lastsite',JSON.stringify({id:idM,t:'bets',at:Date.now()}));localStorage.setItem('fbn.x.'+idM+'.ltab','bets')}},idM);
    await P.go('league.html?l='+id);await ready(P);await P.page.click('#ltabs [data-v="games"]');await sleep(300);
    const r1=await P.page.evaluate(id=>({ls:JSON.parse(localStorage.getItem('fbn.lastsite')||'null'),lt:localStorage.getItem('fbn.x.'+id+'.ltab')}),id);
    ok('real league still writes fbn.lastsite {id,t,at} and its last tab',r1.ls&&r1.ls.id===id&&r1.ls.t==='games'&&r1.lt==='games',r1);
    await P.page.evaluate(idM=>{localStorage.setItem('fbn.lastsite',JSON.stringify({id:idM,t:'bets',at:Date.now()}));localStorage.setItem('fbn.x.'+idM+'.ltab','bets')},idM);
    await P.go('league.html?l='+idM);await ready(P);await sleep(300);
    ok('mock league opened without a hash does not follow the old last-tab memory (starts on Standings)',(await cur(P))==='standings',await cur(P));
    await P.page.click('#ltabs [data-v="teams"]');await sleep(300);await reload(P);
    const r2=await P.page.evaluate(idM=>({ls:localStorage.getItem('fbn.lastsite'),lt:localStorage.getItem('fbn.x.'+idM+'.ltab'),ss:sessionStorage.getItem('fbn.ltab.'+idM)}),idM);
    ok('mock league: no fbn.lastsite / last-tab / session tab written, its old record cleared (reload still keeps the tab from the URL hash)',r2.ls===null&&r2.lt===null&&r2.ss===null&&(await cur(P))==='teams',r2);
    await P.go('league.html?l='+id);await ready(P);await P.page.click('#ltabs [data-v="games"]');await sleep(300);await P.go('league.html?l='+idM+'#teams');await ready(P);await sleep(300);
    const r3=await P.page.evaluate(()=>JSON.parse(localStorage.getItem('fbn.lastsite')||'null'));
    ok('visiting a mock league after a real one leaves the real league\'s fbn.lastsite untouched',r3&&r3.id===id&&r3.t==='games',r3);
    const Q=await P.ctx.newPage();await Q.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await Q.emulateMediaFeatures([{name:'display-mode',value:'standalone'}]).catch(()=>{});await Q.evaluateOnNewDocument(()=>{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true})});
    await Q.goto(APP+'/index.html',{waitUntil:'domcontentloaded'});await Q.waitForSelector('#lapp[data-ready], #landing',{timeout:30000});await sleep(300);
    ok('standalone launch after mock + real: resumes the real league, never the mock',Q.url()===exp+'#games',Q.url());await Q.close();
    ok('mock check: no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
