/* Stage 5 checks: time.html input, sticky DEMO bar, CSV in the UI, help page, service worker on a slow link.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996   and   node tests/slow_static.js 9997 "$PWD"          node tests/e2e_stage5.js */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;const SLOW=process.env.SLOW||'http://localhost:9997';
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const body=P=>P.page.$eval('body',e=>e.innerText).catch(()=>'');
(async()=>{try{
/* ---- 0. exactly 8 managers (and old leagues with another count) ---- */
console.log('\n[8 managers fixed + legacy counts]');
{const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
 const lobbyOf=async o=>{const id=await seed(API,o);const I=seed.info;const K=F.Keys(id);const mt=await gj(K.meta);mt.status='lobby';delete mt.endedAt;await post(K.meta,mt);return {id,I,K}};
 for(const [cnt,maxR] of [[8,15],[6,15],[12,13],[4,15]]){
  const {id,I,K}=await lobbyOf(cnt===8?{}:{managers:cnt});const P=await L.phone('c'+cnt,{});await P.page.goto(`${APP}/room.html?l=${id}#cm=${I.cmSecret}`,{waitUntil:'domcontentloaded'});
  await P.page.waitForSelector('#editsettings',{timeout:20000}).catch(()=>{});await sleep(600);const lob=await body(P);
  ok((cnt===8?'new':'legacy')+' league with '+cnt+' managers: the lobby opens and says "'+cnt+' of '+cnt+' joined" (no crash)',new RegExp(cnt+' of '+cnt+' joined').test(lob)&&P.errs.length===0,{errs:P.errs,lob:lob.slice(0,120)});
  await P.page.evaluate(()=>document.getElementById('editsettings').click());await P.page.waitForSelector('#savesettings',{timeout:8000}).catch(()=>{});
  const st=await P.page.evaluate(()=>({sel:!!document.getElementById('s_mgrs'),fixed:(document.getElementById('s_mgrs_fixed')||{}).innerText,opts:[...document.querySelectorAll('#s_rounds option')].map(o=>+o.value)}));
  ok('settings sheet ('+cnt+'): no managers select, the count is fixed text "'+cnt+' (fixed)"',!st.sel&&st.fixed===cnt+' (fixed)',st);
  ok('settings sheet ('+cnt+'): "Teams each" goes up to '+maxR+' (what '+cnt+' managers allow from 162 teams)',Math.max(...st.opts)===maxR&&Math.min(...st.opts)===1,st.opts);
  await P.page.select('#s_rounds','5');await P.page.evaluate(()=>document.getElementById('savesettings').click());await sleep(1500);const mt=await gj(K.meta);
  ok('settings saved ('+cnt+'): rounds 5, manager count unchanged at '+cnt,mt.settings.rounds===5&&mt.settings.managers===cnt,mt.settings);
  ok('no page errors ('+cnt+')',P.errs.length===0,P.errs);await P.shot('lobby8_'+cnt);await P.close();
  const J=await L.phone('j'+cnt,{});await J.go('join.html?l='+id);await J.page.waitForSelector('#jform,#lcard',{timeout:15000}).catch(()=>{});await sleep(500);
  ok('join page ('+cnt+'): shows "'+cnt+' managers" for the league and no errors',new RegExp('of '+cnt+' managers').test(await body(J))&&J.errs.length===0,(await body(J)).slice(0,160));await J.close()}
 /* a stored odd count can never crash a page: huge, zero and text counts fall back */
 for(const bad of [0,'x',1000,-4]){const {id,I,K}=await lobbyOf({});const mt=await gj(K.meta);mt.settings.managers=bad;await post(K.meta,mt);const P=await L.phone('b',{});await P.go('room.html?l='+id+'&watch=1');await sleep(2500);ok('stored managers='+JSON.stringify(bad)+': room opens, no page error, shows 8 seats',P.errs.length===0&&/of 8 joined/.test(await body(P)),{e:P.errs,b:(await body(P)).slice(0,100)});await P.close()}
 /* a wizard left open on the old "managers" screen (saved in sessionStorage) recovers to the first screen */
 {const P=await L.phone('w',{});await P.go('setup.html');await P.page.evaluate(()=>sessionStorage.setItem('fbn.wizard',JSON.stringify({W:{name:'Old',managers:5,rounds:6},step:'managers'})));await P.go('setup.html');await P.page.waitForSelector('#next',{timeout:8000}).catch(()=>{});
  const t=await body(P);ok('old saved wizard on step "managers": opens at the first screen, count forced to 8, no error',P.errs.length===0&&/Name your league/.test(t)&&/Every league has 8 managers/.test(t),{e:P.errs,t:t.slice(0,80)});await P.close()}
 {const P=await L.phone('h',{});await P.go('help.html');await sleep(500);const t=await body(P);ok('help.html says every league has exactly 8 managers and no longer mentions choosing 4 to 12',/exactly\s+8 managers/.test(t)&&!/4 to 12|4-12|4–12/.test(t));await P.close()}
}
/* ---- 3. time.html bad input ---- */
console.log('\n[time.html input]');
for(const t of ['1e20','abc','-5','99999999999999999999','0','1e15','Infinity']){const P=await L.phone('t',{});await P.go('time.html?t='+t+'&n=x');await sleep(500);const b=await body(P);
  ok('time.html?t='+t+': plain message, no page error, no blank page',P.errs.length===0&&/not valid/i.test(b)&&b.length>40,{errs:P.errs,b:b.slice(0,80)});await P.close()}
{const P=await L.phone('t',{});await P.go('time.html?n=x');await sleep(400);ok('time.html with no t: "No draft time set"',/No draft time set/.test(await body(P))&&P.errs.length===0);await P.close()}
{const P=await L.phone('t',{});const t=Date.now()+864e5;await P.go('time.html?t='+t+'&n=Friday');await P.page.waitForSelector('#timecard',{timeout:8000}).catch(()=>{});ok('time.html with a good time still shows the card and countdown',/In /.test(await body(P))&&P.errs.length===0);await P.close()}
{const P=await L.phone('t',{});await P.go('time.html?t='+Date.UTC(2027,2,15,1,0)+'&n=%3Cb%3Ex%3C%2Fb%3E');await sleep(400);ok('time.html name stays plain text',!(await P.page.$('#timecard b'))&&P.errs.length===0);await P.close()}
/* ---- 2. sticky DEMO bar ---- */
console.log('\n[DEMO bar]');
const id=await seed(API,{managers:8});
for(const [vw,desk] of [[390,false],[1280,true]]){const P=await L.phone('d',{w:vw,h:desk?900:844,desktop:desk});await P.go('league.html?l='+id+'&demo=1');await P.page.waitForSelector('.strow',{timeout:15000}).catch(()=>{});await sleep(500);
  const r0=await P.page.evaluate(()=>{const b=document.getElementById('demobar');return b?b.getBoundingClientRect().top:null});
  await P.page.evaluate(()=>window.scrollTo(0,420));await sleep(300);const rs=await P.page.evaluate(()=>({sy:window.scrollY,top:document.getElementById('demobar').getBoundingClientRect().top}));ok('DEMO bar ('+vw+'): on the real page, scrolled down '+rs.sy+' px, the bar is still at the top',rs.sy>0&&Math.abs(rs.top)<=1,rs);await P.shot('demo_scrolled_real_'+vw);await P.page.evaluate(()=>window.scrollTo(0,0));
  await P.page.evaluate(()=>{const d=document.createElement('div');d.style.height='2500px';document.getElementById('lapp').appendChild(d)});
  await P.page.evaluate(()=>window.scrollTo(0,1400));await sleep(400);
  const r1=await P.page.evaluate(()=>{const b=document.getElementById('demobar');const r=b.getBoundingClientRect();return{top:r.top,h:r.height,sy:window.scrollY,vis:r.bottom>0&&r.top<window.innerHeight,txt:b.innerText}});
  ok('DEMO bar ('+vw+'): present at the top before scrolling',r0!==null&&r0<80,r0);
  ok('DEMO bar ('+vw+'): still pinned to the top of the screen after scrolling 1400 px',r1.sy>1000&&Math.abs(r1.top)<=1&&r1.vis&&/DEMO/.test(r1.txt),r1);
  ok('DEMO bar ('+vw+'): no page errors',P.errs.length===0,P.errs);await P.close()}
/* ---- 1. CSV in the UI ---- */
console.log('\n[CSV export in the browser]');
const idC=await seed(API,{managers:4,names:[['=1+1 "Hoops"','@evil team','🏀'],['+cmd|x','-neg','🔥'],['\tTab','=A1','⭐'],['plain','ok','🦅']]});
{const P=await L.phone('csv',{});await P.page.evaluateOnNewDocument(()=>{window.__blobs=[];const o=URL.createObjectURL;URL.createObjectURL=function(b){const r=new FileReader();r.onload=()=>window.__blobs.push(r.result);r.readAsText(b);return o.call(URL,b)}});
 await P.go('recap.html?l='+idC);await P.page.waitForSelector('#csvbtn',{timeout:15000});await P.page.evaluate(()=>document.getElementById('csvbtn').click());await sleep(1000);
 const csv=await P.page.evaluate(()=>window.__blobs[0]||'');const rows=csv.trim().split('\n').slice(1);const first=rows.map(r=>r.replace(/^"/,''));
 ok('Export CSV (recap page) produced rows',rows.length>=8,rows.length);
 ok('CSV: no line starts with = + - @ tab, and the hostile names carry an apostrophe',rows.every(r=>!/^[=+\-@\t\r]/.test(r))&&csv.includes("'=1+1")&&csv.includes("'@evil")&&csv.includes("'+cmd")&&csv.includes("'-neg")&&csv.includes("'=A1"),csv.slice(0,300));
 ok('CSV: ordinary names unchanged',/,plain,ok,/.test(csv));await P.close()}
/* ---- 8. help page ---- */
console.log('\n[help page]');
for(const [vw,desk] of [[390,false],[1280,true]]){const P=await L.phone('h',{w:vw,h:desk?900:844,desktop:desk});await P.go('index.html');await P.page.waitForSelector('#helplink',{timeout:10000}).catch(()=>{});
 ok('home page ('+vw+') has a help link',!!(await P.page.$('#helplink')));await P.page.evaluate(()=>document.getElementById('helplink').click());await P.page.waitForSelector('#helppage',{timeout:8000}).catch(()=>{});await sleep(400);
 ok('help ('+vw+'): link opens help.html',/help\.html$/.test(P.page.url()));
 const m=await P.page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth,h1:document.querySelector('h1').innerText,c:!!document.getElementById('commissioner'),m:!!document.getElementById('managers'),cards:document.querySelectorAll('#helppage .card').length,wide:[].filter.call(document.querySelectorAll('#helppage *'),e=>e.getBoundingClientRect().right>window.innerWidth+1).length,home:!!document.getElementById('helphome')}));
 ok('help ('+vw+'): title, Commissioner and Managers parts, five short cards',/How to run a league/.test(m.h1)&&m.c&&m.m&&m.cards===5,m);
 ok('help ('+vw+'): no horizontal overflow',m.sw<=m.iw&&m.wide===0,m);ok('help ('+vw+'): no page errors',P.errs.length===0,P.errs);
 await P.shot('help_'+vw);for(const a of ['managers','commissioner','spectators','after','limits']){await P.page.evaluate(()=>window.scrollTo(0,0));await sleep(150);await P.page.evaluate(x=>document.getElementById('helpjump').querySelector('a[href="#'+x+'"]').click(),a);await sleep(900);
 ok('help ('+vw+'): jump button scrolls to #'+a,await P.page.evaluate(x=>{const r=document.getElementById(x).getBoundingClientRect();return r.top<420&&r.top>-60||(window.innerHeight+window.scrollY>=document.body.scrollHeight-2&&r.top<window.innerHeight)},a))}
 await P.page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await P.shot('help_end_'+vw);await P.close()}
/* ---- 6. service worker on a slow link ---- */
console.log('\n[service worker, slow link]');
{await fetch(SLOW+'/__delay?ms=0');const P=await L.phone('sw',{});const pg=P.page;await pg.evaluateOnNewDocument(()=>{try{localStorage.removeItem('fbn.store')}catch(e){}});
 await pg.goto(SLOW+'/index.html',{waitUntil:'load'});await pg.evaluate(()=>navigator.serviceWorker.ready.then(()=>1));await sleep(2500);await pg.goto(SLOW+'/index.html',{waitUntil:'load'});await sleep(1500);
 const names=await pg.evaluate(async()=>(await caches.keys()));ok('SW cache is named from the build tag',names.length===1&&/^fbnc-\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(names[0]),names);
 ok('SW cached help.html in the shell',await pg.evaluate(async()=>{const c=await caches.open((await caches.keys())[0]);return !!(await c.match(new URL('help.html',location.href).href.split('?')[0]))}));
 await fetch(SLOW+'/__delay?ms=7000');const t0=Date.now();await pg.goto(SLOW+'/index.html',{waitUntil:'load',timeout:60000});const dt=Date.now()-t0;
 ok('7 s per request: a saved page is fully loaded in under 9 s (was 36 s)',dt<9000,dt);console.log('     slow-link load time '+dt+' ms');
 ok('slow link: the page really shows the app (saved copy)',/Create a league/.test(await body(P)));
 const t1=Date.now();await pg.goto(SLOW+'/help.html',{waitUntil:'load',timeout:60000});const d2=Date.now()-t1;ok('slow link: help.html (second page) also under 9 s',d2<9000&&/How to run a league/.test(await body(P)),d2);
 await fetch(SLOW+'/__delay?ms=0');await sleep(500);
 const t2=Date.now();await pg.goto(SLOW+'/index.html',{waitUntil:'load'});ok('fast link again: page loads quickly',Date.now()-t2<4000,Date.now()-t2);
 ok('SW: no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;fails.push('crash: '+e.message);console.log('CRASH',e.stack||e)}
await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
