/* s26c14 parity: ?view=1 view-only League page (top of js/league-d.js, port of STOOPIDS s26t) + open-at-top (s26w).
   A device that HAS a manager identity opens league.html?l=<id>&view=1: guest forced, chat/bet/photo controls absent, ZERO write requests
   (every non-GET to the mock store and any request to textdb.dev is recorded; textdb is aborted), a direct Store.set is refused, and the saved
   identity is untouched (a normal tab in the same browser still signs in). Open-at-top: scrollRestoration manual, a reload opens at 0,
   a repeat #bets/<id> open is cleaned to #bets. 320/390/1280.  APP / API env (mock store). */
const L=require('./lib.js');const {seed}=require('./seed_league.js');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
async function mk(w,id,me){const P=await L.phone('vw'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:w>=760?900:800});
  await P.page.evaluateOnNewDocument((id,me)=>{try{if(!localStorage.getItem('fbn.me.'+id))localStorage.setItem('fbn.me.'+id,JSON.stringify(me))}catch(e){}},id,me);
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);P.writes=[];P.remote=[];
  P.page.on('request',r=>{const u=new URL(r.url());if(/textdb\.dev/.test(u.hostname)){P.remote.push(r.method()+' '+u.href);return r.abort()}
    if(r.method()!=='GET'&&r.method()!=='HEAD')P.writes.push(r.method()+' '+u.pathname);
    if(u.hostname==='site.api.espn.com')return r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:/rankings/.test(u.pathname)?'{"rankings":[]}':'{"events":[]}'});r.continue()});
  return P}
const go=async(P,u)=>{await P.go(u);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(1200)};
const chatState=async P=>{await P.page.evaluate(()=>{const b=document.getElementById('chatbar');if(b)b.click()});await L.sleep(700);return P.page.evaluate(()=>({form:!!document.getElementById('chatform')&&!!document.getElementById('chatform').getClientRects().length,watch:!!document.getElementById('chatwatch')}))};
(async()=>{try{const id=await seed(null,{name:"BALL DON'T LIE",rounds:8});const info=seed.info;const me={mid:info.managers[0].id,k:info.managers[0].k};
  for(const w of [320,390,1280]){const tag=w+'px';const P=await mk(w,id,me);
    await go(P,'league.html?l='+id+'&view=1#standings');
    const v=await P.page.evaluate(()=>({lv:window.LVIEW,cls:document.documentElement.classList.contains('viewonly'),ss:sessionStorage.getItem('fbn.view'),me:localStorage.getItem('fbn.me.'+new URLSearchParams(location.search).get('l'))}));
    ok(tag+' view=1: LVIEW on, html.viewonly, kept in sessionStorage, identity reads empty',v.lv===true&&v.cls&&v.ss==='1'&&v.me===null,v);
    const c=await chatState(P);ok(tag+' view=1: chat has no write form, shows watching note',!c.form&&c.watch,c);
    for(const t of ['bets','games','rosters','teams','recap','draft','rules']){await P.page.evaluate(t=>{location.hash='#'+t},t);await L.sleep(900)}
    await P.page.evaluate(()=>{location.hash='#bets'});await L.sleep(1200);
    const b=await P.page.evaluate(()=>({acts:[...document.querySelectorAll('#lbody .b27-act,#lbody .qb-btn,#lbody .qb-pick,#lbody form')].filter(e=>e.getClientRects().length).length,sw:document.documentElement.scrollWidth,iw:innerWidth}));
    ok(tag+' view=1: Bets tab shows no bet/accept/quick-bet controls',b.acts===0,b);ok(tag+' view=1: no overflow',b.sw<=b.iw,b);
    const f=await P.page.evaluate(async()=>{let rej=false;try{await Store.set('fbn-view-probe','x')}catch(e){rej=true}let x=false;try{const q=new XMLHttpRequest();q.open('POST','/api/data/probe');q.send('x')}catch(e){x=true}return{rej,x,blocked:window.LVIEW_BLOCKED,beacon:navigator.sendBeacon?navigator.sendBeacon('/api/data/probe','x'):false}});
    ok(tag+' view=1: direct Store.set / XHR POST / sendBeacon refused in code',f.rej&&f.x&&f.beacon===false&&f.blocked>=2,f);
    await go(P,'league.html?l='+id+'#rosters');const v2=await P.page.evaluate(()=>window.LVIEW);ok(tag+' view-only sticks for this browser tab (sessionStorage) after a link without view=1',v2===true,v2);
    ok(tag+' view=1: ZERO write requests reached any store',P.writes.length===0,P.writes);ok(tag+' view=1: no request to the remote store',P.remote.length===0,P.remote);
    /* the same browser, a normal tab: identity intact, chat form present */
    const pg=await P.ctx.newPage();await pg.setBypassServiceWorker(true);await pg.setViewport({width:w,height:800});await pg.goto(L.APP+'/league.html?l='+id+'#standings',{waitUntil:'domcontentloaded'});await pg.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(1000);
    const n2=await pg.evaluate(async()=>{const b=document.getElementById('chatbar');if(b)b.click();await new Promise(r=>setTimeout(r,700));return{lv:window.LVIEW,me:!!localStorage.getItem('fbn.me.'+new URLSearchParams(location.search).get('l')),form:!!document.getElementById('chatform')}});
    ok(tag+' normal tab: identity untouched, signed in (chat form), not view-only',n2.lv===false&&n2.me&&n2.form,n2);await pg.close();
    /* open at top */
    await P.page.evaluate(()=>{sessionStorage.removeItem('fbn.view')});await go(P,'league.html?l='+id+'#teams');await P.page.evaluate(()=>window.scrollTo(0,600));await L.sleep(300);
    await P.page.reload({waitUntil:'domcontentloaded'});await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(1500);
    const s=await P.page.evaluate(()=>({y:scrollY,sr:history.scrollRestoration}));ok(tag+' open-at-top: reload after scrolling opens at 0, scrollRestoration manual',s.y===0&&s.sr==='manual',s);
    await go(P,'league.html?l='+id+'#bets/zz'+w);const h1=await P.page.evaluate(()=>location.hash);await P.page.reload({waitUntil:'domcontentloaded'});await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(800);const h2=await P.page.evaluate(()=>location.hash);
    ok(tag+' no sticky bet hash: a reload of #bets/<id> is cleaned to #bets',/^#bets\/zz/.test(h1)&&h2==='#bets',{h1,h2});
    ok(tag+' no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.close()}
 }catch(e){bad++;console.log('FAIL exception',e&&e.stack)}finally{await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)}})();
