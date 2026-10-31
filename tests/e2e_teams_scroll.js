/* s25-full: the Teams list must not jump back up while the user scrolls (Paul, phone). Live updates (picks by another device, chat, clock ticks, polls, full re-renders)
   arrive while the list is scrolled partway; the scroll position must hold within a few px. 390px and 1280px.  node tests/e2e_teams_scroll.js (APP/API env, mock store) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API||'http://localhost:9986/api/data/';
let n=0,bad=0;const fails=[];function ok(m,c,x){n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}}
const pos=P=>P.page.evaluate(()=>{const l=document.getElementById('tlist');const sc=document.scrollingElement;return{y:Math.round(sc.scrollTop),row:l?Math.round(([...l.querySelectorAll('.trow')].find(r=>r.getBoundingClientRect().top>60)||{getBoundingClientRect:()=>({top:-1})}).getBoundingClientRect().top):-1,rows:l?l.querySelectorAll('.trow').length:0}});
(async()=>{try{
 for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
  const id=await seed(API,{live:true,picksMade:11});const I=seed.info;
  const open=async(tag,cm,mgr)=>{const P=await L.phone(tag,desk?{desktop:true,w,h}:{w,h});await P.page.setBypassServiceWorker(true);await P.page.setCacheEnabled(false);await P.page.evaluateOnNewDocument(()=>{window.__jump=[];const f=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(o){if(!(o&&o.preventScroll))window.__jump.push('focus:'+(this.id||this.tagName));return f.call(this,o)};const s=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(o){window.__jump.push('siv:'+(this.id||this.tagName));return s.call(this,o)};const st=window.scrollTo;window.scrollTo=function(){window.__jump.push('scrollTo');return st.apply(window,arguments)}});/* iOS Safari has no CSS scroll anchoring: turn it off so a shift shows up as it does on Paul's phone */await P.page.evaluateOnNewDocument(()=>document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='*{overflow-anchor:none!important}';document.head.appendChild(s)}));
    await P.page.evaluateOnNewDocument((id,cm)=>{if(cm)localStorage.setItem('fbn.cm.'+id,cm)},id,cm||'');
    await P.page.goto((process.env.APP||'http://localhost:9985')+'/room.html?l='+id+'&stay=1'+(mgr?'#as='+mgr.id+'&k='+mgr.k:'#tab=teams'));await sleep(3000);return P};
  const U=await open('u',null,null);await U.page.click('#tab_teams');await sleep(1200);/* Paul tapped the Teams tab, so it keeps focus while he scrolls */await U.page.focus('#tab_teams');
  const C=await open('c',I.cmSecret);
  await U.page.evaluate(()=>window.scrollTo(0,Math.min(1400,document.scrollingElement.scrollHeight-innerHeight-200)));await sleep(600);
  await U.page.evaluate(()=>{window.__jump=[]});const p0=await pos(U);ok(w+'px: Teams list scrolled partway (y>300)',p0.y>300&&p0.rows>20,p0);
  const drift=[];const chk=async lbl=>{const p=await pos(U);drift.push([lbl,p.y-p0.y,p.row]);return p};
  /* clock ticks and polls */for(let i=0;i<4;i++){await sleep(1500);await chk('tick'+i)}
  /* full re-render from a live update */await U.page.evaluate(()=>{for(let i=0;i<3;i++){try{renderAll()}catch(e){}}});await sleep(300);await chk('renderAll');
  /* a pick made on another device (commissioner picks for the manager on the clock) */
  await C.page.evaluate(()=>document.querySelector('#tab_teams').click());await sleep(800);
  const picked=await C.page.evaluate(()=>{const r=document.querySelector('#tlist [data-a=draftrow]');if(!r)return false;r.click();return true});await sleep(800);
  await C.page.evaluate(()=>{const b=document.querySelector('[data-a=cfyes],#cfyes');if(b)b.click()});
  for(let i=0;i<5;i++){await sleep(1500);await chk('afterpick'+i)}
  ok(w+'px: a pick by another device was made',picked);
  /* chat from another device */
  await C.page.evaluate(()=>document.querySelector('#tab_chat').click());await sleep(600);
  await C.page.evaluate(()=>{const i=document.getElementById('cin');if(i){i.value='scroll test';const b=document.querySelector('[data-a=send]');if(b)b.click()}});
  for(let i=0;i<4;i++){await sleep(1500);await chk('chat'+i)}
  const jumps=await U.page.evaluate(()=>window.__jump);ok(w+'px: no auto-scroll during live updates (no focus() without preventScroll, no scrollIntoView, no scrollTo)',jumps.length===0,jumps);
  /* 60 s soak at 390px with syncs running (polls, clock, a remote pick every 15 s): count jumps (> 4 px moves the user did not make) */
  if(w===390){await C.page.evaluate(()=>document.querySelector('#tab_teams').click());const mid=async()=>{await U.page.evaluate(()=>window.scrollTo(0,Math.min(1400,document.scrollingElement.scrollHeight-innerHeight-200)));await U.page.focus('#tab_teams');await U.page.evaluate(()=>window.scrollTo(0,Math.min(1400,document.scrollingElement.scrollHeight-innerHeight-200)));await sleep(200)};await mid();let jumps=0,last=(await pos(U)).y;const t0=Date.now();
    while(Date.now()-t0<60000){await sleep(1000);const y=(await pos(U)).y;if(Math.abs(y-last)>4){jumps++;await mid();last=(await pos(U)).y}else last=y;
      if(((Date.now()-t0)/1000|0)%15===0){await C.page.evaluate(()=>{const r=document.querySelector('#tlist [data-a=draftrow]');if(r)r.click()});await sleep(500);await C.page.evaluate(()=>{const b=document.querySelector('[data-a=cfyes],#cfyes');if(b)b.click()})}}
    console.log('  soak: '+jumps+' jumps in 60 s');await U.shot('teams_scroll_390_after60s');ok('390px: 0 jumps over 60 s with syncs running',jumps===0,jumps)}
  const worst=drift.reduce((a,d)=>Math.max(a,Math.abs(d[1])),0);
  ok(w+'px: scroll position holds within 4 px through ticks, polls, re-renders, a remote pick and chat',worst<=4,drift);
  const p1=await pos(U);ok(w+'px: the row on screen stays put (no layout shift above it)',Math.abs(p1.row-p0.row)<=40||p1.row<0,{p0,p1});
  ok(w+'px: no page errors',U.errs.length===0&&C.errs.length===0,U.errs.concat(C.errs));
  await U.close();await C.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+e.message)}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
