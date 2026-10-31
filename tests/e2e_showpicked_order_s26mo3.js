/* s26mo3: (A) 'Show picked' toggle in the Teams list (room + mock room): off by default; on lists picked teams greyed out with the manager's name,
   no draft / queue actions on them; remembered per device (fbn.showpicked) after reload; fits 320/390/1280, 44 px tap target.
   (B) 'Draft order updated' toast: commissioner moves a manager in the lobby (and taps Randomize) -> another manager's room toasts ONCE per burst;
   not on first load, not on the commissioner's device. Playwright, touch at 390. APP/API env, OUT=shots dir. */
const {chromium}=require('playwright');const F=require('../js/core.js');const {seed}=require('./seed_league.js');
const APP=process.env.APP||'http://localhost:9995',API=process.env.API||'http://localhost:9996/api/data/',OUT=process.env.OUT;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let n=0,bad=0;const fails=[];
const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let br;const mk=async(w,init)=>{const touch=w<700;const ctx=await br.newContext(touch?{viewport:{width:w,height:w===320?640:844},hasTouch:true,isMobile:true,deviceScaleFactor:2,userAgent:UA,serviceWorkers:'block'}:{viewport:{width:w,height:800},serviceWorkers:'block'});
  await ctx.addInitScript(()=>{try{localStorage.setItem('fbn.store','/api/data/')}catch(e){}
    window.__toasts=[];let shown=false;new MutationObserver(()=>{const t=document.getElementById('toast');const on=!!t&&!t.classList.contains('hide')&&!!t.textContent;if(on&&!shown)window.__toasts.push(t.textContent);shown=on}).observe(document,{subtree:true,childList:true,attributes:true,characterData:true})});
  if(init)await ctx.addInitScript(init.fn,init.arg);await ctx.route(/textdb\.dev/,r=>r.abort());const p=await ctx.newPage();p._errs=[];p.on('pageerror',e=>p._errs.push(e.message));p._touch=touch;return p};
const tap=async(p,sel)=>{const h=await p.$(sel);await h.evaluate(e=>e.scrollIntoView({block:'center'}));await sleep(150);const b=await h.boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;
  const same=await p.evaluate(([x,y,s])=>{const e=document.elementFromPoint(x,y),t=document.querySelector(s);return!!(e&&t&&(e===t||t.contains(e)))},[x,y,sel]);if(p._touch)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);return same};
async function showPicked(p,tag,w){const pre=tag+' '+w+'px: ';await tap(p,'#tab_teams');await waitFor(()=>p.$('#tspk'),15000);await sleep(500);
  const st=()=>p.evaluate(()=>{const rows=[...document.querySelectorAll('#tlist .trow.taken')];const b=document.getElementById('tspk').getBoundingClientRect();
    return{pressed:document.getElementById('tspk').getAttribute('aria-pressed'),taken:rows.length,acts:rows.filter(r=>r.dataset.a||r.querySelector('[data-a=q],[data-a=draftrow]')).length,named:rows.filter(r=>/✔ \S/.test(r.innerText)).length,
      op:rows[0]?+getComputedStyle(rows[0]).opacity:null,h:Math.round(b.height),fit:b.right<=innerWidth+1&&b.left>=0,over:document.documentElement.scrollWidth<=innerWidth+1,money:/\$|bet|wager|money/i.test(document.getElementById('tspk').textContent)}});
  let s=await st();ok(pre+'Show picked is off by default, picked teams hidden',s.pressed==='false'&&s.taken===0,s);ok(pre+'toggle is >= 44 px, fits, no sideways scroll, no money wording',s.h>=44&&s.fit&&s.over&&!s.money,s);
  if(OUT&&w===390)await p.screenshot({path:OUT+'/showpicked_off_390'+(tag==='mock'?'_mock':'')+'.png'});
  ok(pre+'tap lands on the toggle',await tap(p,'#tspk'));if(tag==='mock'&&w>700){}s=await waitFor(async()=>{const x=await st();return x.taken>0?x:null},5000)||await st();
  ok(pre+'on: picked teams listed greyed out with the manager name',s.pressed==='true'&&s.taken>0&&s.named===s.taken&&s.op<1,s);ok(pre+'on: no draft / queue action on picked rows',s.acts===0,s);
  if(s.taken){const t=await p.$eval('#tlist .trow.taken',r=>r.dataset.k);const q0=await p.evaluate(()=>document.querySelectorAll('#qpanel .qrow').length);await tap(p,`#tlist .trow.taken[data-k="${t}"] .tm`);await sleep(800);
    const after=await p.evaluate(t=>({q:document.querySelectorAll('#qpanel .qrow').length,sheet:!!document.querySelector('#confirmpick'),inq:!!document.querySelector('#qpanel .qrow[data-t="'+t+'"]')}),t);ok(pre+'tapping a picked team does nothing (no confirm, not queued)',!after.sheet&&!after.inq&&after.q===q0,after)}
  if(OUT&&w===390)await p.screenshot({path:OUT+'/showpicked_on_390'+(tag==='mock'?'_mock':'')+'.png'});
  ok(pre+'saved per device',await p.evaluate(()=>localStorage.getItem('fbn.showpicked'))==='1');await p.reload();await waitFor(()=>p.$('#tab_teams'),20000);await sleep(1200);await tap(p,'#tab_teams');await waitFor(()=>p.$('#tspk'),15000);await sleep(800);
  s=await st();ok(pre+'still on after reload',s.pressed==='true'&&s.taken>0,s);await tap(p,'#tspk');await sleep(500);ok(pre+'off again hides them',(await st()).taken===0);ok(pre+'no page errors',p._errs.length===0,p._errs)}
(async()=>{try{br=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});if(OUT)require('fs').mkdirSync(OUT,{recursive:true});
 for(const w of [320,390,1280]){const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:5});const I=seed.info;const meta=F.parseJ(await raw(F.Keys(id).meta));
   const sl=F.slotAt(meta.order,6,meta.settings.type,meta.settings.rounds);const me=I.managers.find(m=>m.id===sl.owner);const p=await mk(w);await p.goto(APP+'/room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>p.$('#oncard'),25000);await sleep(1000);
   await showPicked(p,'room',w);await p.context().close();
   if(w!==320){const m=await mk(w);await m.goto(APP+'/mock.html');await sleep(2000);await m.evaluate(()=>{const b=document.querySelector('#solo,[data-a=solo],#startsolo,button.pri');if(b)b.click()});
     await waitFor(()=>/room\.html/.test(m.url()),20000);await waitFor(()=>m.$('#oncard'),40000);await waitFor(()=>m.evaluate(()=>document.querySelectorAll('#board .pick,.bcell.f,[data-n]').length>0),5000);await sleep(1500);if(!(await m.$('#board .pick,.taken'))){await m.evaluate(()=>document.querySelector('#tab_teams').click());const d=await waitFor(()=>m.$('#tlist [data-a=draftrow]'),8000);if(d){await d.click();const c=await waitFor(()=>m.$('#confirmpick'),5000);if(c)await c.click()}}await sleep(4000);await showPicked(m,'mock',w);await m.context().close()}}
 /* (B) order toast */
 const id=await seed(API,{managers:8});const I=seed.info;const K=F.Keys(id);const m0=F.parseJ(await raw(K.meta));m0.status='lobby';delete m0.endedAt;delete m0.startedAt;m0.settings.startAt=Date.now()+864e5;m0.settings.startMode='manual';m0.orderSet=true;m0.spin=null;m0.respins=[];await post(K.meta,m0);
 const cmM=I.managers[0],oth=I.managers[3];
 const C=await mk(390,{fn:([id,cm])=>localStorage.setItem('fbn.cm.'+id,cm),arg:[id,I.cmSecret]});await C.goto(APP+'/room.html?l='+id+'#as='+cmM.id+'&k='+cmM.k);
 const O=await mk(390);await O.goto(APP+'/room.html?l='+id+'#as='+oth.id+'&k='+oth.k);await sleep(4000);
 const omSel='[data-a=om][data-d="1"]';const got=await waitFor(async()=>{if(await C.$(omSel))return true;for(const t of ['#tab_board','#tab_more']){const b=await C.$(t);if(b&&!(await C.$(omSel))){await b.click();await sleep(800)}}return!!(await C.$(omSel))},20000);
 ok('order: commissioner sees move arrows',!!got);const tO=()=>O.evaluate(()=>window.__toasts.filter(t=>t==='Draft order updated').length),tC=()=>C.evaluate(()=>window.__toasts.filter(t=>t==='Draft order updated').length);
 ok('order: no toast on first load',(await tO())===0);
 const order0=F.parseJ(await raw(K.meta)).order.join();for(let i=0;i<3;i++){await C.locator(omSel).nth(i).tap();await sleep(500)}
 await waitFor(async()=>F.parseJ(await raw(K.meta)).order.join()!==order0,8000);await sleep(9000);
 ok('order: the other manager sees "Draft order updated" exactly once for a burst of 3 moves',(await tO())===1,await O.evaluate(()=>window.__toasts));ok('order: no such toast on the commissioner device',(await tC())===0,await C.evaluate(()=>window.__toasts));
 if(OUT)await O.screenshot({path:OUT+'/order_toast_other_390.png'});
 const rb=await C.$('[data-a=randomize]');if(rb){await C.locator('[data-a=randomize]').first().tap();await sleep(800);const cf=await C.$('#sheetwrap [data-a]:not([data-a=sheetbg]).pri');if(cf)await cf.tap();await sleep(9000);await sleep(3000);ok('order: Randomize (11 s later) toasts once more',(await tO())===2,await O.evaluate(()=>window.__toasts))}
 ok('order: no page errors',C._errs.length===0&&O._errs.length===0,C._errs.concat(O._errs));
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}finally{if(br)await br.close()}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
