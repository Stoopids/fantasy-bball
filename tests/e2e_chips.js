/* Teams tab filter chips (Paul): no sideways-sliding strip. Search, then ONE wrapping flow (sort chips, Hide drafted / Starred / Queue, "Conference ▾"), every chip visible, 44 px high, header sticky;
   the conference list opens as a panel that wraps (up/down scroll only). Checked at 320, 390 and 1280.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_chips.js   (APP / API env; SHOTDIR=/path saves screenshots) */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;const SD=process.env.SHOTDIR;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}};
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
(async()=>{try{
const id=await seed(API,{managers:8,rounds:4,live:true,picksMade:0});const I=seed.info;const m0=I.managers[0];
for(const [w,h,d] of [[320,700,0],[390,844,0],[1280,900,1]]){
  const P=await L.phone('ch'+w,d?{desktop:true,w,h}:{w,h});await P.page.setBypassServiceWorker(true).catch(()=>{});
  await P.page.goto(`${APP}/room.html?l=${id}#as=${m0.id}&k=${m0.k}`,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#tabs',{timeout:25000});await sleep(900);
  await P.page.evaluate(()=>{const b=document.querySelector('[data-a=idclose]');if(b)b.click();document.querySelector('[data-t=teams]').click()});await waitFor(()=>P.page.$('.ctl #tsort button'),15000);await sleep(600);
  const pre=w+'px: ';
  await P.page.evaluate(()=>{const c=document.querySelector('.ctl');scrollTo(0,c.getBoundingClientRect().top+scrollY-1)});await sleep(400);/* s25-full: the On the clock card, auto-pick switch and queue bar sit above the list; measure with the sticky filter row at the top, as while browsing */
  const m=await P.page.evaluate(()=>{const c=document.querySelector('.ctl'),cr=c.getBoundingClientRect();const chips=[...c.querySelectorAll('#tsort button,#tpills button,#tqchip')].map(b=>{const r=b.getBoundingClientRect();return{t:b.textContent.trim(),top:Math.round(r.top),h:Math.round(r.height*10)/10,l:Math.round(r.left),r:Math.round(r.right),vis:b.offsetParent!==null}});
    const rows=[...new Set(chips.map(x=>x.top))].length;const tr=[...document.querySelectorAll('.trow')].map(e=>e.getBoundingClientRect());const si=document.querySelector('.ctl input[type=search]').getBoundingClientRect();
    return{n:chips.length,rows,minH:Math.min(...chips.map(x=>x.h)),allVis:chips.every(x=>x.vis),inside:chips.every(x=>x.l>=cr.left-1&&x.r<=cr.right+1),hdrH:Math.round(cr.height),hdrTop:Math.round(cr.top),searchH:Math.round(si.height),
      sw:document.documentElement.scrollWidth,iw:innerWidth,cs:c.scrollWidth<=c.clientWidth+1,wrapOv:getComputedStyle(c.querySelector('.cwrap')).overflowX,labels:chips.map(x=>x.t),
      visRows:tr.filter(r=>r.top>=cr.bottom-1&&r.bottom<=innerHeight).length}});
  ok(pre+'8 chips (6 sort + Queued filter chip + Conference; s25-full removed Hide drafted and Starred) all visible, none cut off at the side',m.n===8&&m.allVis&&m.inside,m);
  ok(pre+'no sideways scroll (page and header)',m.sw<=w+1&&m.cs&&m.wrapOv==='visible',m);
  ok(pre+'every chip is at least 44 px high',m.minH>=43.9,m.minH);
  ok(pre+'chips wrap into '+(d?'at most 2':w<=320?'at most 4':'at most 3')+' rows',m.rows<=(d?2:w<=320?4:3),m.rows);
  ok(pre+'header height '+m.hdrH+' px (search '+m.searchH+' px) leaves the list room: '+m.visRows+' team rows fully visible below it at the top of the page',m.hdrH<=(d?170:w<=320?250:215)&&(w<=320||m.visRows>=4),m);
  /* sticky */
  await P.page.evaluate(()=>window.scrollTo(0,700));await sleep(500);
  const st=await P.page.evaluate(()=>{const tb=document.getElementById('tabs').getBoundingClientRect().bottom;const c=document.querySelector('.ctl').getBoundingClientRect();const tr=[...document.querySelectorAll('.trow')].filter(e=>{const r=e.getBoundingClientRect();return r.top>=c.bottom-1&&r.bottom<=innerHeight});return{top:Math.round(c.top),tabs:Math.round(tb),rows:tr.length}});
  ok(pre+'header stays sticky (pinned right under the tab bar) while scrolling; '+st.rows+' team rows fully visible under it',Math.abs(st.top-st.tabs)<=1&&st.rows>=(w<=320?4:6),st);
  await P.page.evaluate(()=>window.scrollTo(0,0));await sleep(300);
  if(SD)await P.page.screenshot({path:`${SD}/teams-chips-${w}-top.png`});
  /* conference panel */
  const open=await P.page.evaluate(()=>{const b=document.getElementById('tconfbtn');const r=b.getBoundingClientRect();b.click();return{h:Math.round(r.height*10)/10,txt:b.textContent.trim()}});await sleep(500);
  ok(pre+'the "All conf. ▾" button is a 44 px control',open.h>=43.9&&/All conf/.test(open.txt),open);
  const pn=await P.page.evaluate(()=>{const p=document.getElementById('tconf');const bs=[...p.querySelectorAll('button')];const hs=bs.map(b=>b.getBoundingClientRect().height);const r=p.getBoundingClientRect();return{shown:!p.hidden&&p.offsetParent!==null,n:bs.length,minH:Math.min(...hs),noSide:p.scrollWidth<=p.clientWidth+1,ov:getComputedStyle(p).overflowX,labels:bs.map(b=>b.textContent.trim()).slice(0,8),right:Math.round(r.right),iw:innerWidth,expanded:document.getElementById('tconfbtn').getAttribute('aria-expanded')}});
  ok(pre+'the conference panel lists All + 32 conferences, wrapped, no sideways scroll, every chip >= 44 px',pn.shown&&pn.n===33&&pn.minH>=43.9&&pn.noSide&&pn.ov==='hidden'&&pn.right<=w+1&&pn.expanded==='true',pn);
  if(SD)await P.page.screenshot({path:`${SD}/teams-chips-${w}-panel.png`});
  const before=await P.page.evaluate(()=>document.querySelectorAll('.trow').length);
  await P.page.evaluate(()=>{const b=[...document.querySelectorAll('#tconf button')].find(x=>x.textContent.trim()==='SEC');b.click()});await sleep(600);
  const sec=await P.page.evaluate(()=>({rows:document.querySelectorAll('.trow').length,btn:document.getElementById('tconfbtn').textContent.trim(),on:document.getElementById('tconfbtn').classList.contains('on'),hidden:document.getElementById('tconf').hidden,txt:[...document.querySelectorAll('.trow .cf')].every(e=>/SEC/.test(e.textContent))}));
  ok(pre+'picking SEC filters the list (12 teams), closes the panel and the button reads "SEC ▾"',sec.rows===12&&sec.btn==='SEC ▾'&&sec.on&&sec.hidden&&sec.txt,{before,sec});
  await P.page.evaluate(()=>document.getElementById('tconfbtn').click());await sleep(300);await P.page.keyboard.press('Escape');await sleep(300);
  ok(pre+'Escape closes the open panel',await P.page.evaluate(()=>document.getElementById('tconf').hidden));
  await P.page.evaluate(()=>{document.getElementById('tconfbtn').click()});await sleep(200);await P.page.evaluate(()=>{[...document.querySelectorAll('#tconf button')].find(x=>/All conf/.test(x.textContent)).click()});await sleep(400);
  ok(pre+'"All conf." clears the filter',await P.page.evaluate(()=>document.querySelectorAll('.trow').length)===before);
  ok(pre+'no page errors',P.errs.length===0,P.errs);await P.close()}
console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
