/* QA gap-audit fixes for s20 (LOW items): emoji-first manager avatar (L1), long one-word names on the Redraft page at 320/360 (L7), empty Starred/Queue messages (L13), team names in the row button labels (L10).
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_qafix.js   (APP / API env) */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const has=(P,sel)=>P.page.$(sel).then(x=>!!x);
const LONG='W'.repeat(30);
(async()=>{try{
/* ---------- room: avatar, aria-labels, empty Starred / Queue ---------- */
const id=await seed(API,{managers:8,rounds:4,live:true,picksMade:0});const I=seed.info;const K=F.Keys(id);const m0=I.managers[0];
await post(K.slot(1,0),F.makeClaim({mid:m0.id,i:1,name:'🏀',team:'Aces',sh:await F.mgrHash(m0.id,m0.k)}));
await post(K.mgr(m0.id),F.makeProfile({mid:m0.id,name:'🏀',team:'Aces',emoji:''}));
const P=await L.phone('qa');await P.page.setBypassServiceWorker(true).catch(()=>{});
await P.page.goto(`${APP}/room.html?l=${id}#as=${m0.id}&k=${m0.k}`,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#tabs',{timeout:25000});
await waitFor(()=>P.page.evaluate(()=>/Aces|🏀/.test(document.body.innerText)),15000);
const av=await P.page.evaluate(()=>[...document.querySelectorAll('.av')].map(e=>e.textContent).filter(Boolean));
ok('manager named with an emoji: every avatar letter is a whole character (no lone surrogate), the emoji itself',av.length>0&&av.every(t=>!/[\ud800-\udbff](?![\udc00-\udfff])|^[\udc00-\udfff]/.test(t))&&av.includes('🏀'),av);
await P.page.evaluate(()=>{const b=document.querySelector('[data-t=teams]');if(b)b.click()});await waitFor(()=>has(P,'.trow'),15000);
const lab=await P.page.evaluate(()=>{const r=document.querySelector('.trow:not(.taken)');const g=s=>{const e=r.querySelector(s);return e?e.getAttribute('aria-label'):null};const nm=r.querySelector('a.tlink')?r.querySelector('a.tlink').textContent:'';return{star:g('.wstar'),q:g('.qbtn'),draft:r.dataset.a==='draftrow'?r.getAttribute('aria-label'):g('button[data-a=draftrow]'),name:nm.trim(),txt:r.innerText}});
const nmv=lab.draft&&lab.draft.replace(/^Draft /,'');
ok('a team row: the row-tap Draft target (s25-full) and Queue button carry the team name in their label; no Star button (removed)',!!lab.draft&&/^Draft .+/.test(lab.draft)&&lab.q==='Queue '+nmv&&lab.star==null&&lab.txt.includes(nmv.split(' ')[0]),lab);
const unnamed=await P.page.evaluate(()=>[...document.querySelectorAll('.trow button')].filter(b=>!(b.getAttribute('aria-label')||b.textContent).trim()).length);ok('no unnamed buttons in the team list',unnamed===0,unnamed);
const same=await P.page.evaluate(()=>{const l=[...document.querySelectorAll('.trow button[aria-label]')].map(b=>b.getAttribute('aria-label'));return l.length-new Set(l).size});ok('no two row buttons share the same label (the team name makes each one unique)',same===0,same);
/* s25-full: the star feature is gone (Paul via NCAA) */
ok('no star buttons or Starred filter on the Teams tab',!(await P.page.$('[data-a=twatch],.wstar')));
let t;
await P.page.evaluate(()=>document.querySelector('[data-a=tqueue]').click());await sleep(500);
t=await P.page.evaluate(()=>(document.getElementById('tempty')||{}).textContent||'');
ok('Queue with an empty queue says "Your queue is empty"',/Your queue is empty/.test(t)&&!/Hide drafted|No teams match/.test(t),t);
await P.page.evaluate(()=>document.querySelector('[data-a=tqueue]').click());await sleep(300);
await P.page.evaluate(()=>{const b=[...document.querySelectorAll('[data-a=tsearch],#tq,input[type=search]')][0];});
ok('no page errors in the room',P.errs.length===0,P.errs);await P.close();
/* ---------- redraft page: a long one-word name must not widen the page ---------- */
const fs=require('fs'),path=require('path');const TD=JSON.parse((s=>s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))(fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8')));
const id2=await seed(API,{managers:8,rounds:4});const I2=seed.info;const K2=F.Keys(id2);const a=I2.managers[1];
await post(K2.slot(2,0),F.makeClaim({mid:a.id,i:2,name:LONG,team:LONG,sh:await F.mgrHash(a.id,a.k)}));await post(K2.mgr(a.id),F.makeProfile({mid:a.id,name:LONG,team:LONG,emoji:'🔥'}));
const owned=new Set(I2.picks.map(p=>String(p.teamId)));const free=TD.teams.map(t=>String(t[0])).filter(t=>!owned.has(t));let g=0;const games=[];
I2.managers.forEach((m,mi)=>{const mine=String(I2.picks.find(p=>p.managerId===m.id).teamId);for(let i=0;i<8-mi;i++){games.push({id:'q'+(g++),day:'2027-01-1'+(i%9),start:'2027-01-1'+(i%9)+'T18:00Z',status:'final',kind:'reg',home:{id:mine,score:80},away:{id:free[g%free.length],score:70}})}for(let i=0;i<mi+1;i++){games.push({id:'q'+(g++),day:'2027-01-0'+(1+i%9),start:'2027-01-0'+(1+i%9)+'T18:00Z',status:'final',kind:'reg',home:{id:mine,score:60},away:{id:free[g%free.length],score:70}})}});
const scores={format:1,sample:false,label:'',season:'2026-27',as_of:'2027-01-22',source:'test',games};
for(const w of [320,360]){
  const R=await L.phone('rd'+w,{w,h:700});await R.page.setBypassServiceWorker(true).catch(()=>{});await R.page.setRequestInterception(true);R.page.on('request',r=>{if(/\/data\/scores\.json/.test(r.url()))r.respond({status:200,contentType:'application/json',body:JSON.stringify(scores)});else r.continue()});
  await R.page.goto(`${APP}/redraft.html?l=${id2}`,{waitUntil:'domcontentloaded'});await R.page.waitForSelector('#rapp[data-ready]',{timeout:25000}).catch(()=>{});await sleep(600);
  const m=await R.page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,hasLong:document.body.innerText.includes('WWWWWWWWWW'),rows:document.querySelectorAll('.strow2').length}));
  ok(w+' px Redraft page: the 30-letter one-word name is shown and the page does not scroll sideways',m.hasLong&&m.sw<=w+1,m);ok(w+' px Redraft page: no page errors',R.errs.length===0,R.errs);await R.close()}
console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
