/* s24: every draft room tab and every recap section keeps its place in the URL hash as #tab=<name> ONLY (never k=, a manager id, a seat or a secret).
   Refresh returns to the same tab, a shared link opens on it, back / forward follow the tabs, an unknown hash falls back to the default, the query string is kept; also in a mock draft.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_tabs.js   (APP / API env) */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API||'http://localhost:9996/api/data/';
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const TABS=['board','teams','my','chat','more'],RT=['top','grade','grades','order','howorder','rosters','outlook','conferences','times','awards','next','about','picks','details'];
const open=async(name,w)=>{const P=await L.phone(name,w===1280?{desktop:true,w:1280,h:900}:{});await P.page.setBypassServiceWorker(true).catch(()=>{});return P};
const loc=P=>P.page.evaluate(()=>({hash:location.hash,search:location.search,tab:document.body.dataset.tab||''}));
const roomReady=P=>waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#tabs [data-t]')&&document.getElementById('view').innerHTML.length>50),20000);
(async()=>{try{
const id=await seed(API,{rounds:2});const I=seed.info;const me=I.managers[0];const secrets=[me.k,me.id,I.cmSecret].concat(I.managers.map(m=>m.id));
const clean=(h,tabs)=>{const m=/^#tab=([a-z]+)$/.exec(h);return !!m&&tabs.indexOf(m[1])>=0&&!/k=|as=|cm=/.test(h)&&!secrets.some(s=>h.indexOf(s)>=0)};
const allHashes=[];
async function roomRun(P,lid,pre,mock){
  for(const t of TABS){await P.page.evaluate(t=>{const b=document.querySelector('#tabs [data-t="'+t+'"]');if(b)b.click()},t);await sleep(400);
    const a=await loc(P);allHashes.push(a.hash);ok(pre+'tap '+t+': hash is exactly #tab='+t+', query kept',a.hash==='#tab='+t&&/l=/.test(a.search)&&/stay=1/.test(a.search),a);
    await P.page.reload({waitUntil:'domcontentloaded'});await roomReady(P);await sleep(500);const b=await loc(P);allHashes.push(b.hash);
    ok(pre+'refresh on '+t+': same tab, same hash',b.tab===t&&b.hash==='#tab='+t,b)}
  await P.page.goBack();await sleep(700);let c=await loc(P);ok(pre+'Back: previous tab (chat)',c.tab==='chat'&&c.hash==='#tab=chat',c);
  await P.page.goForward();await sleep(700);c=await loc(P);ok(pre+'Forward: next tab (more)',c.tab==='more'&&c.hash==='#tab=more',c);
  await P.go('room.html?l='+lid+'&stay=1#tab=zzz');await roomReady(P);await sleep(500);c=await loc(P);ok(pre+'unknown #tab=zzz falls back to Board and the hash is corrected',c.tab==='board'&&c.hash==='#tab=board',c);
  await P.go('room.html?l='+lid+'&stay=1#k=abc');await roomReady(P);await sleep(500);c=await loc(P);ok(pre+'a hash that is not a tab is replaced by #tab=board',c.hash==='#tab=board'&&c.tab==='board',c);
  if(mock)ok(pre+'this is a mock (PRACTICE banner)',await P.page.evaluate(()=>!!document.getElementById('practicebn')))}
for(const w of [390,1280]){const pre=w+'px room: ';
  /* the private manager link: secrets in the fragment are read, then replaced by #tab=… only */
  const P=await open('r'+w,w);await P.go('room.html?l='+id+'&stay=1#as='+me.id+'&k='+me.k);await roomReady(P);await sleep(1500);
  let a=await loc(P);allHashes.push(a.hash);ok(pre+'manager link: the fragment secret is gone, the hash holds only #tab=board',a.hash==='#tab=board',a);
  ok(pre+'manager link still signed me in',await waitFor(()=>P.page.evaluate(n=>(document.getElementById('who')||{}).innerText.indexOf(n)>=0,me.name),10000));
  await roomRun(P,id,pre,false);
  /* shared link on a tab, on another device */
  const Q=await open('s'+w,w);await Q.go('room.html?l='+id+'&watch=1#tab=chat');await roomReady(Q);await sleep(500);a=await loc(Q);ok(pre+'shared link #tab=chat opens on Chat, query kept',a.tab==='chat'&&a.hash==='#tab=chat'&&/watch=1/.test(a.search),a);
  /* commissioner link + tab in one fragment */
  await Q.go('room.html?l='+id+'&stay=1#cm='+I.cmSecret+'&tab=more');await roomReady(Q);await sleep(1500);a=await loc(Q);allHashes.push(a.hash);ok(pre+'commissioner link with tab: secret stripped, opens on More, hash #tab=more only',a.tab==='more'&&a.hash==='#tab=more',a);await Q.close();
  /* recap */
  const R='recap.html?l='+id;await P.go(R+'#tab=grades');await waitFor(()=>P.page.evaluate(()=>{const e=document.getElementById('rc_grades');return e&&!e.hidden&&Math.abs(e.getBoundingClientRect().top)<90}),20000);
  a=await loc(P);ok(w+'px recap: shared link #tab=grades scrolls to League grades',a.hash==='#tab=grades'&&await P.page.evaluate(()=>Math.abs(document.getElementById('rc_grades').getBoundingClientRect().top)<90),a);
  for(const t of ['order','rosters','awards','grade']){await P.go(R+'#tab='+t);await sleep(300);await P.page.reload({waitUntil:'domcontentloaded'});
    const okk=await waitFor(()=>P.page.evaluate(t=>{const m={grade:'powerrecap_s',order:'rc_order',rosters:'rc_rosters',awards:'rc_awards'};const e=document.getElementById(m[t]);const r=e&&e.getBoundingClientRect();const bottom=scrollY+innerHeight>=document.documentElement.scrollHeight-2;return e&&(Math.abs(r.top)<90||(bottom&&r.top>=0&&r.top<innerHeight))&&location.hash==='#tab='+t},t),20000);
    a=await loc(P);allHashes.push(a.hash);ok(w+'px recap: refresh on '+t+' returns to that section (top of screen, or page end when it cannot scroll further), hash #tab='+t,!!okk&&/l=/.test(a.search),a)}
  await P.page.evaluate(()=>{location.hash='tab=order'});await sleep(1200);await P.page.goBack();await sleep(1500);a=await loc(P);ok(w+'px recap: Back follows the sections (order -> grade)',a.hash==='#tab=grade'&&await P.page.evaluate(()=>Math.abs(document.getElementById('powerrecap_s').getBoundingClientRect().top)<90),a);
  await P.go(R+'#tab=nope');await sleep(2500);a=await loc(P);ok(w+'px recap: unknown #tab=nope falls back to the top',a.hash==='#tab=top'&&await P.page.evaluate(()=>scrollY<5),a);
  await P.go(R+'#tab=top');await sleep(2500);await P.page.evaluate(()=>document.getElementById('rc_grades').scrollIntoView({block:'start'}));await sleep(900);a=await loc(P);allHashes.push(a.hash);
  ok(w+'px recap: while reading, the hash follows the section on screen (League grades; s25-full: My picks is no longer drawn)',a.hash==='#tab=grades',a);
  await P.close()}
/* tabs are real links: <a role=tab href="#tab=…">, 44 px, plain click in place, Ctrl-click opens a new tab, a new page on the href lands on the tab */
for(const w of [390,1280]){const P=await open('lk'+w,w);await P.page.evaluateOnNewDocument((o)=>{localStorage.setItem('fbn.me.'+o.id,JSON.stringify({mid:o.m.id,k:o.m.k}))},{id,m:me});
  await P.go('room.html?l='+id+'&stay=1');await roomReady(P);await sleep(800);
  const els=await P.page.evaluate(()=>[...document.querySelectorAll('#tabs [data-t]')].map(a=>{const r=a.getBoundingClientRect();return{tag:a.tagName,href:a.getAttribute('href'),role:a.getAttribute('role'),sel:a.getAttribute('aria-selected'),t:a.dataset.t,h:Math.round(r.height),w:Math.round(r.width)}}));
  ok(w+'px room: every tab is <a role="tab" href="#tab=<name>"> with aria-selected and a 44 px target',els.length===5&&els.every(e=>e.tag==='A'&&e.href==='#tab='+e.t&&e.role==='tab'&&(e.sel==='true'||e.sel==='false')&&e.h>=44&&e.w>=44),els);
  for(const t of TABS){await P.page.evaluate(()=>{window.__same=1});await P.page.click('#tabs [data-t="'+t+'"]');await sleep(400);
    const r=await P.page.evaluate(t=>({same:window.__same===1,tab:document.body.dataset.tab,hash:location.hash,sel:document.querySelector('#tabs [data-t="'+t+'"]').getAttribute('aria-selected')}),t);allHashes.push(r.hash);
    ok(w+'px room: plain click on '+t+' switches in place (no reload), aria-selected true',r.same&&r.tab===t&&r.hash==='#tab='+t&&r.sel==='true',r);
    const href=await P.page.evaluate(t=>document.querySelector('#tabs [data-t="'+t+'"]').href,t);const N=await open('n'+w+t,w);await N.page.evaluateOnNewDocument((o)=>{localStorage.setItem('fbn.me.'+o.id,JSON.stringify({mid:o.m.id,k:o.m.k}))},{id,m:me});
    await N.page.goto(href,{waitUntil:'domcontentloaded'});await roomReady(N);await sleep(400);const q=await loc(N);ok(w+'px room: a new page opened on the '+t+' link lands on '+t,q.tab===t&&q.hash==='#tab='+t,q);await N.close()}
  const b=await L.launch();const before=(await b.pages()).length;await P.page.keyboard.down('Control');await P.page.click('#tabs [data-t="teams"]');await P.page.keyboard.up('Control');await sleep(1500);
  const after=(await b.pages()).length;const st=await loc(P);ok(w+'px room: Ctrl-click on a tab is left to the browser (new tab opens, this page stays on '+st.tab+')',after>before&&st.tab!=='teams',{before,after,st});
  for(const pg of (await b.pages()).slice(before))await pg.close().catch(()=>{});
  /* recap section links */
  await P.go('recap.html?l='+id);await waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#rcnav a')),20000);
  const rl=await P.page.evaluate(()=>[...document.querySelectorAll('#rcnav a')].map(a=>({href:a.getAttribute('href'),k:a.dataset.rt,h:Math.round(a.getBoundingClientRect().height)})));
  ok(w+'px recap: section nav links (Top, My grade, Grades, Awards; s25-full dropped My picks/Details) are <a href="#tab=<name>"> with 44 px targets',rl.length>=4&&['top','grade','grades','awards'].every(k=>rl.some(x=>x.k===k))&&rl.every(x=>x.href==='#tab='+x.k&&x.h>=44),rl);
  ok(w+'px recap: My picks is gone (no #rc_mypicks, no picks link in the nav)',await P.page.evaluate(()=>!document.getElementById('rc_mypicks')&&!document.querySelector('#rcnav a[data-rt=picks]')));
  await P.page.evaluate(()=>{window.__same=1});await P.page.click('#rcnav a[data-rt=grades]');await sleep(1500);
  const rr=await P.page.evaluate(()=>({same:window.__same===1,hash:location.hash,top:Math.round(document.getElementById('rc_grades').getBoundingClientRect().top),cur:{rt:(document.querySelector('#rcnav a[aria-current]')||{dataset:{}}).dataset.rt}}));
  ok(w+'px recap: plain click on Grades jumps in place and marks it current',rr.same&&rr.hash==='#tab=grades'&&Math.abs(rr.top)<90&&rr.cur&&rr.cur.rt==='grades',rr);
  const N=await open('rn'+w,w);await N.page.goto(await P.page.evaluate(()=>document.querySelector('#rcnav a[data-rt=awards]').href),{waitUntil:'domcontentloaded'});
  ok(w+'px recap: a new page opened on the Awards link lands on Awards',!!await waitFor(()=>N.page.evaluate(()=>{const e=document.getElementById('rc_awards');const r=e&&e.getBoundingClientRect();return e&&location.hash==='#tab=awards'&&(Math.abs(r.top)<90||(scrollY+innerHeight>=document.documentElement.scrollHeight-2&&r.top<innerHeight))}),20000));await N.close();
  /* s25: the recap tab bar is no longer sticky on phones, so bring it into view first; the Ctrl-click itself must not change this page's hash */
  await P.page.$eval('#rcnav',e=>e.scrollIntoView());await sleep(600);const h0=(await loc(P)).hash;const before2=(await b.pages()).length;await P.page.keyboard.down('Control');await P.page.click('#rcnav a[data-rt=awards]');await P.page.keyboard.up('Control');await sleep(1500);
  ok(w+'px recap: Ctrl-click on a section link opens a new tab and leaves this page',(await b.pages()).length>before2&&(await loc(P)).hash===h0,{h0});for(const pg of (await b.pages()).slice(before2))await pg.close().catch(()=>{});
  await P.close()}
/* mock draft: same behaviour */
{const P=await open('mk',390);await P.go('mock.html');await P.page.waitForSelector('#startmock');await P.page.click('#startmock');await P.page.waitForFunction(()=>/room\.html\?l=/.test(location.href),{timeout:20000});
  const mid=new URL(P.page.url()).searchParams.get('l');await P.go('room.html?l='+mid+'&stay=1');await roomReady(P);await sleep(800);
  await roomRun(P,mid,'390px mock: ',true);await P.close()}
ok('every hash seen ('+allHashes.length+') is only "#tab=<known tab>": no k=, no manager id, no secret, nothing else',allHashes.every(h=>clean(h,TABS.concat(RT))),allHashes.filter(h=>!clean(h,TABS.concat(RT))));
}catch(e){ok('no exception',false,String(e&&e.stack||e))}
await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join(' | '):''));process.exit(bad?1:0)})();
