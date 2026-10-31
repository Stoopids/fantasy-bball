/* s26mo3 (Paul, phone): queue add / reorder (up-down + touch drag) / remove with REAL touch taps (Playwright, hasTouch+isMobile, iPhone UA) at 390,
   and mouse at 1280, in a solo mock from mock.html and in a room.html league. Every tap is hit-tested (elementFromPoint) so overlays fail the test.
   needs: node tools/mock_textdb.js <p> "$PWD" <p+1>; APP / API env; OUT = screenshot dir, VIDEO=1 records 390x844 video into OUT; TAG = file prefix */
const {chromium}=require('playwright');const F=require('../js/core.js');const {seed}=require('./seed_league.js');
const APP=process.env.APP||'http://localhost:9995',API=process.env.API||'http://localhost:9996/api/data/',OUT=process.env.OUT,TAG=process.env.TAG||'q',VIDEO=!!process.env.VIDEO;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let n=0,bad=0;const fails=[];
const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const order=p=>p.evaluate(()=>[...document.querySelectorAll('#qpanel .qrow')].map(r=>r.dataset.t));
/* tap the element's centre after scrolling it in; report what is actually under the finger */
async function hit(p,sel,touch){const h=await p.$(sel);if(!h)return{miss:'nosel '+sel};await h.evaluate(e=>e.scrollIntoView({block:'center'}));await sleep(150);const b=await h.boundingBox();if(!b)return{miss:'nobox'};
  const x=b.x+b.width/2,y=b.y+b.height/2;const top=await p.evaluate(([x,y,s])=>{const e=document.elementFromPoint(x,y),t=document.querySelector(s);return{same:!!(e&&t&&(e===t||t.contains(e))),at:e?(e.tagName+'#'+e.id+'.'+e.className).slice(0,80):null}},[x,y,sel]);
  if(touch)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);return top}
async function touchDrag(p,fromSel,dy){const b=await (await p.$(fromSel)).boundingBox();const x=b.x+30,y=b.y+b.height/2;const c=await p.context().newCDPSession(p);
  const tp=y=>[{x,y,id:1,radiusX:4,radiusY:4,force:1}];await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tp(y)});await sleep(250);
  for(let i=1;i<=10;i++){await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:tp(y+dy*i/10)});await sleep(30)}await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach()}
async function run(p,tag,w,touch){const pre=tag+' '+w+'px: ';const sh=async s=>{if(OUT)await p.screenshot({path:`${OUT}/${TAG}_${tag}_${w}_${s}.png`})};
  await hit(p,'#tab_teams',touch);await waitFor(()=>p.$('#tlist [data-a=q]'),15000);await sleep(600);
  if(w<700){const e=await p.$eval('#qbar',b=>b.getAttribute('aria-expanded')).catch(()=>null);if(e!=='true')await hit(p,'#qbar',touch);await sleep(300)}
  const ts=await p.evaluate(()=>[...document.querySelectorAll('#tlist [data-k] [data-a=q]')].slice(5,8).map(b=>b.dataset.t));const hits=[];
  for(const t of ts){hits.push(await hit(p,`#tlist [data-a=q][data-t="${t}"]`,touch));await waitFor(async()=>(await order(p)).includes(t),5000)}
  const o1=await order(p);ok(pre+'tap Q+ adds 3 teams to the queue',ts.every(t=>o1.includes(t)),{o1,hits});ok(pre+'Q+ taps land on the button (no overlay)',hits.every(h=>h.same),hits);
  await p.evaluate(()=>{const q=document.getElementById('qpanel');if(q)q.scrollIntoView({block:'start'})});await sleep(300);await sh('1_added');
  let h=await hit(p,`#qpanel .qrow[data-t="${o1[0]}"] [data-a=qm][data-d="1"]`,touch);let o=await waitFor(async()=>{const x=await order(p);return x[1]===o1[0]?x:null},5000);ok(pre+'▼ moves a team down',!!o,{h,o:await order(p)});
  h=await hit(p,`#qpanel .qrow[data-t="${o1[2]}"] [data-a=qm][data-d="-1"]`,touch);o=await waitFor(async()=>{const x=await order(p);return x[1]===o1[2]?x:null},5000);ok(pre+'▲ moves a team up',!!o,{h,o:await order(p)});await sh('2_updown');
  const before=await order(p);const rowH=await p.$eval('#qpanel .qrow',r=>r.getBoundingClientRect().height);
  if(!await p.$(`#qpanel .qrow[data-t="${before[0]}"] .qgrip`)){ok(pre+'queue rows have a drag grip',false)}else{
  if(touch)await touchDrag(p,`#qpanel .qrow[data-t="${before[0]}"] .qgrip`,rowH*2.1);else{const b=await (await p.$(`#qpanel .qrow[data-t="${before[0]}"] .qgrip`)).boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2,b.y+b.height/2+rowH*2.1,{steps:10});await p.mouse.up()}
  o=await waitFor(async()=>{const x=await order(p);return x[2]===before[0]?x:null},6000);ok(pre+(touch?'touch':'mouse')+' drag on the grip reorders (1st -> 3rd)',!!o,{before,after:await order(p)});await sh('3_dragged')}
  const cur=await order(p);h=await hit(p,`#qpanel .qrow[data-t="${cur[0]}"] [data-a=qrm]`,touch);o=await waitFor(async()=>{const x=await order(p);return !x.includes(cur[0])?x:null},5000);ok(pre+'✕ removes a team',!!o&&o.length===2,{h,o:await order(p)});await sh('4_removed');
  const sv=await waitFor(async()=>{const mid=await p.evaluate(()=>window.DR2_myMid?DR2_myMid():null);return true},1000);
  ok(pre+'no page errors',p._errs.length===0,p._errs)}
(async()=>{let br;try{br=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});if(OUT)require('fs').mkdirSync(OUT,{recursive:true});
 const sizes=process.env.SIZES?process.env.SIZES.split(',').map(Number):[390,1280];
 for(const w of sizes){const touch=w<700;const mk=async()=>{const ctx=await br.newContext(touch?{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2,userAgent:UA,serviceWorkers:'block',recordVideo:VIDEO&&OUT?{dir:OUT,size:{width:390,height:844}}:undefined}:{viewport:{width:1280,height:800},serviceWorkers:'block'});
   await ctx.addInitScript(()=>{try{localStorage.setItem('fbn.store','/api/data/')}catch(e){}});await ctx.route(/textdb\.dev/,r=>r.abort());
   const p=await ctx.newPage();p._errs=[];p.on('pageerror',e=>p._errs.push(e.message));return p};
  /* room.html league, me on the clock */
  const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:3});const I=seed.info;const meta=F.parseJ(await raw(F.Keys(id).meta));
  const sl=F.slotAt(meta.order,4,meta.settings.type,meta.settings.rounds);const me=I.managers.find(m=>m.id===sl.owner);
  let p=await mk();await p.goto(APP+'/room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>p.$('#oncard'),25000);await sleep(1200);await run(p,'room',w,touch);
  const pq=F.parseJ(await raw(F.Keys(id).pref(me.id)))||{};ok('room '+w+'px: queue saved to the store ('+(pq.queue||[]).length+')',(pq.queue||[]).length===2,pq);await p.context().close();
  /* solo mock from mock.html */
  p=await mk();await p.goto(APP+'/mock.html');await sleep(2000);await p.evaluate(()=>{const b=document.querySelector('#solo,[data-a=solo],#startsolo,button.pri');if(b)b.click()});
  await waitFor(()=>/room\.html/.test(p.url()),20000);await waitFor(()=>p.$('#oncard'),40000);await sleep(1500);await run(p,'mock',w,touch);await p.context().close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}finally{if(br)await br.close()}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
