/* s24c (QA LOW): the standalone resume never opens a mock, even when the store returns 503, the network fails or the device is offline.
   Mock detection is LOCAL (MK id prefix, the record's kind / mock field, this device's mock lists fbn.mocks + fbn.mockids). The in-room / recap last-tab fallback ignores mocks too.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_resume_mock.js */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API||'http://localhost:9996/api/data/';
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const standalone=async page=>{const c=await page.target().createCDPSession();await c.send('Emulation.setEmulatedMedia',{features:[{name:'display-mode',value:'standalone'}]}).catch(()=>{});
  await page.evaluateOnNewDocument(()=>{try{Object.defineProperty(navigator,'standalone',{get:()=>true,configurable:true})}catch(e){}})};
(async()=>{try{
  const real=await seed(API,{rounds:2});const I=seed.info;const me=I.managers[0];
  const mkMock=F.makeMockId();await seed(API,{rounds:2,mock:true,id:mkMock});          /* new-style mock id (MK prefix) */
  const listMock=F.makeLeagueId();await seed(API,{rounds:2,mock:true,id:listMock});     /* old-style id, known only from this device's mock list */
  ok('core: real league ids never start with MK; mock ids always do',Array.from({length:3000},()=>F.makeLeagueId()).every(x=>x.slice(0,2)!=='MK')&&Array.from({length:50},()=>F.makeMockId()).every(x=>/^MK[0-9A-Z]{14}$/.test(x)));
  for(const w of [390,1280]){const pre=w+'px ';const opt=w===1280?{desktop:true,w:1280,h:900}:{};const P=await L.phone('rm'+w,opt);await standalone(P.page);
    /* sign in to the real league and let the service worker take control (for the offline launches) */
    await P.go('room.html?l='+real+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#tabs [data-t]')),20000);await sleep(1200);
    await P.page.reload({waitUntil:'domcontentloaded'});await waitFor(()=>P.page.evaluate(()=>!!(navigator.serviceWorker&&navigator.serviceWorker.controller)),15000);
    await P.go('index.html');await sleep(800);await P.go('league.html?l='+real);await sleep(1500);
    await P.page.evaluate(id=>{localStorage.setItem('fbn.mocks',JSON.stringify([{id,name:'Mock draft',parent:'',solo:true,ts:Date.now()}]))},listMock);
    const setRec=(nav,site)=>P.page.evaluate((nav,site)=>{if(nav)localStorage.setItem('fbn.lastnav',JSON.stringify(nav));else localStorage.removeItem('fbn.lastnav');if(site)localStorage.setItem('fbn.lastsite',JSON.stringify(site));else localStorage.removeItem('fbn.lastsite')},nav,site);
    const nav=(id,kind,ago,tab)=>({kind:kind||'room',id,path:'/room.html?l='+id,tab:tab||'teams',ts:Date.now()-(ago||0)});const site=(id,ago)=>({id,t:'standings',at:Date.now()-(ago||0)});
    const launch=async mode=>{const Q=await P.ctx.newPage();await Q.setViewport({width:w,height:w===1280?900:844,isMobile:w!==1280,hasTouch:w!==1280});await standalone(Q);
      if(mode==='503'||mode==='fail'){await Q.setRequestInterception(true);Q.on('request',r=>{if(r.url().indexOf('/api/data/')>=0){if(mode==='503')r.respond({status:503,contentType:'text/plain',body:'Service Unavailable'});else r.abort('internetdisconnected')}else r.continue()})}
      if(mode==='offline')await Q.setOfflineMode(true);
      await Q.goto(L.APP+'/index.html',{waitUntil:'domcontentloaded'}).catch(()=>{});await sleep(2500);await waitFor(()=>Q.evaluate(()=>!document.getElementById('relaunching')),9000);await sleep(600);
      const a=await Q.evaluate(()=>({path:location.pathname.replace(/^.*\//,''),search:location.search,hash:location.hash,home:!!document.getElementById('landing')})).catch(e=>({err:String(e)}));await Q.close();return a};
    const isMockUrl=a=>[mkMock,listMock].some(m=>(a.search||'').indexOf(m)>=0);
    const cases=[
      ['old lastnav -> MK mock, no lastsite','home',nav(mkMock),null],
      ['old lastnav -> mock from the device list, lastsite -> real (older)','league',nav(listMock),site(real,60e3)],
      ['old lastsite -> MK mock, lastnav -> real room (older)','room',nav(real,'room',60e3),site(mkMock)],
      ['both records point at mocks','home',nav(listMock),site(mkMock,1000)],
      ['lastnav with kind "mock" / mock flag','home',Object.assign(nav(real),{kind:'mock'}),null],
      ['lastsite carrying mock:true','home',null,Object.assign(site(real),{mock:true})],
      ['forged recap record -> mock from the device list (fbn.mocks)','home',Object.assign(nav(listMock,'recap'),{path:'/recap.html?l='+listMock,tab:'grades'}),null],
      ['forged recap record -> MK mock, lastsite -> real (older)','league',Object.assign(nav(mkMock,'recap'),{path:'/recap.html?l='+mkMock,tab:'grades'}),site(real,60e3)],
      ['control: real lastnav','room',nav(real),null]];
    for(const mode of ['503','fail','offline','online'])for(const [lab,want,a1,b1] of cases){await setRec(a1,b1);const a=await launch(mode);
      const good=!isMockUrl(a)&&(want==='home'?a.home:want==='room'?a.path==='room.html'&&a.search.indexOf(real)>=0:a.path==='league.html'&&a.search.indexOf(real)>=0);
      ok(pre+'['+mode+'] '+lab+': ends on '+(want==='home'?'Home':'the real league ('+want+')')+', never a mock',good,a)}
    /* in-room / recap last-tab fallback ignores mocks */
    await setRec(null,null);
    await P.page.evaluate(id=>{localStorage.setItem('fbn.x.'+id+'.tab','chat');localStorage.setItem('fbn.last.'+id,JSON.stringify({page:'recap',tab:'awards',t:Date.now()}))},listMock);
    await P.go('room.html?l='+listMock);await waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#tabs [data-t]')),20000);await sleep(800);
    let r=await P.page.evaluate(()=>({tab:document.body.dataset.tab,hash:location.hash}));ok(pre+'mock room without a hash ignores the saved last tab (opens Board)',r.tab==='board',r);
    const lnav=await P.page.evaluate(()=>localStorage.getItem('fbn.lastnav'));ok(pre+'mock room writes no lastnav',!lnav,lnav);
    await P.go('recap.html?l='+listMock);await sleep(3000);r=await P.page.evaluate(()=>location.hash);ok(pre+'mock recap without a hash ignores the saved section',r!=='#tab=awards',r);
    await P.page.evaluate(id=>localStorage.setItem('fbn.x.'+id+'.tab','chat'),real);await P.go('room.html?l='+real);await waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#tabs [data-t]')),20000);await sleep(800);
    r=await P.page.evaluate(()=>document.body.dataset.tab);ok(pre+'control: real room without a hash still opens its last tab (Chat)',r==='chat',r);
    const lp=await P.page.evaluate((a,b)=>{const out=[];for(const id of [a,b]){localStorage.setItem('fbn.lastnav',JSON.stringify({kind:'recap',id,path:'/recap.html?l='+id,tab:'grades',ts:Date.now()}));localStorage.removeItem('fbn.lastsite');out.push(UI.lastPlace())}localStorage.removeItem('fbn.lastnav');return out},listMock,mkMock);
    ok(pre+'UI.lastPlace refuses a forged mock recap record (device list and MK prefix)',lp.every(x=>x===null),lp);
    const u=await P.page.evaluate((a,b,c)=>[UI.isMockId(a),UI.isMockId(b),UI.isMockId(c)],mkMock,listMock,real);ok(pre+'UI.isMockId: MK id yes, listed id yes, real no',u.join()==='true,true,false',u);
    ok(pre+'no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e)}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));await L.close();process.exit(bad?1:0)})();
