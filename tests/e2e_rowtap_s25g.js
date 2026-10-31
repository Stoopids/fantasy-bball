/* s25g row-tap everywhere (NCAA confirmed): no per-team Draft buttons on any pick surface (Teams list, Pick a team pop-up, My Team queue, mock draft).
   Tapping a pickable row opens the usual confirm step; s25-full (Paul via NCAA): no ESPN link or icon in any draft-room team row; tapping the name or row drafts (confirm first).  node tests/e2e_rowtap_s25g.js (APP/API env, mock store) */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const draftBtns=P=>P.page.evaluate(()=>[...document.querySelectorAll('button,a,[role=button]')].filter(b=>!b.classList.contains('trow')&&/^\s*Draft\b/.test(b.textContent||'')&&!/Draft (it|recap|room|complete)/.test(b.textContent)&&b.id!=='confirmpick').map(b=>(b.id||b.className)+': '+b.textContent.trim().slice(0,30)));
(async()=>{try{
for(const [w,h] of [[390,844],[1280,800]]){const opt=w>700?{desktop:true,w,h}:{w,h};
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:3});const I=seed.info;const K=F.Keys(id);const meta=F.parseJ(await raw(K.meta));
 const slot=F.slotAt(meta.order,4,meta.settings.type,meta.settings.rounds);const owner=I.managers.find(m=>m.id===slot.owner);
 const P=await L.phone('rt'+w,opt);await P.go('room.html?l='+id+'#as='+owner.id+'&k='+owner.k);await waitFor(()=>P.page.$('#pickbtn'),25000);await sleep(1200);
 /* Teams list */
 await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await waitFor(()=>P.page.$('#tlist .trow.go[data-a=draftrow]'),10000);
 ok(w+'px Teams list: no per-team Draft buttons',(await draftBtns(P)).length===0,await draftBtns(P));
 const rows=await P.page.evaluate(()=>[...document.querySelectorAll('#tlist .trow.go')].slice(0,5).map(r=>({h:r.getBoundingClientRect().height,a:r.dataset.a,espn:!!r.querySelector('a.espn'),tl:!!r.querySelector('a.tlink')})));
 ok(w+'px Teams list: pickable rows are the tap target (>= 44 px), no ESPN icon and no school-name link',rows.length>0&&rows.every(r=>r.a==='draftrow'&&r.h>=44&&!r.espn&&!r.tl),rows);
 const anyA=await P.page.evaluate(()=>[...document.querySelectorAll('#tlist .trow a,#tlist .trow .espn')].map(a=>a.outerHTML.slice(0,80)));ok(w+'px Teams list: no ESPN anchors or icons in any row (pickable or not)',anyA.length===0,anyA);
 await P.page.$eval('#tlist .trow.go[data-a=draftrow] .tm .chip,#tlist .trow.go[data-a=draftrow] .tm',e=>e.click());ok(w+'px Teams list: tapping the team name opens the confirm step',!!(await waitFor(()=>P.page.$('#confirmpick'),6000)));
 await P.page.evaluate(()=>{const b=document.querySelector('#sheetwrap [data-a=sheetbg].btn,[data-a=sheetbg]');if(b)b.click()});await sleep(400);
 /* Pick a team pop-up */
 await P.page.$eval('#pickbtn',e=>e.click());await waitFor(()=>P.page.$('#pickov .trow.go'),10000);await sleep(600);
 ok(w+'px Pick a team pop-up: no per-team Draft buttons',(await draftBtns(P)).length===0,await draftBtns(P));
 const pr=await P.page.evaluate(()=>[...document.querySelectorAll('#pickov .trow.go')].slice(0,5).map(r=>({h:r.getBoundingClientRect().height,a:r.dataset.a})));ok(w+'px pop-up rows are the tap target, >= 60 px',pr.length&&pr.every(r=>r.a==='draftrow'&&r.h>=59.5),pr);
 const popA=await P.page.evaluate(()=>[...document.querySelectorAll('#pickov .trow a,#pickov .trow .espn')].length);ok(w+'px pop-up: no ESPN anchors or icons in rows',popA===0,popA);
 await P.page.focus('#pickov input');await P.page.keyboard.type('state');await sleep(800);const sr=await P.page.evaluate(()=>({n:document.querySelectorAll('#pickov .trow.go').length,a:document.querySelectorAll('#pickov .trow a,#pickov .trow .espn').length}));ok(w+'px pop-up search results: rows, none with an ESPN anchor/icon',sr.n>0&&sr.a===0,sr);
 await P.page.$eval('#pickov .trow.go .tm',e=>e.click());ok(w+'px pop-up (search result): tapping the team name opens the confirm step',!!(await waitFor(()=>P.page.$('#confirmpick'),6000)));
 await P.page.evaluate(()=>{const b=document.querySelector('[data-a=sheetbg]');if(b)b.click()});await sleep(300);await P.page.evaluate(()=>{const b=document.querySelector('[data-a=pclose]');if(b)b.click()});await sleep(300);
 /* s25-full: on-turn confirm pop-up shot */
 if(process.env.OUT){await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await sleep(800);await P.page.$eval('#tlist .trow.go[data-a=draftrow] .tm',e=>e.click());await waitFor(()=>P.page.$('#confirmpick'),6000);await sleep(400);await P.page.screenshot({path:process.env.OUT+'/onturn_confirm_'+w+'.png'});await P.page.evaluate(()=>{const b=document.querySelector('[data-a=sheetbg]');if(b)b.click()});await sleep(300)}
 /* s25-full (Paul via NCAA): the Board keeps its ESPN links */
 await P.page.evaluate(()=>document.querySelector('#tab_board').click());await sleep(1000);{const nb=await P.page.evaluate(()=>document.querySelectorAll('.board a[href*="espn.com"]').length);ok(w+'px Board grid still has ESPN links on the team pills',nb>0,nb)}
 /* off-turn: a tap does nothing (no pop-up, no pick) */
 {const other=I.managers.find(m=>m.id!==owner.id);const O=await L.phone('rto'+w,opt);await O.go('room.html?l='+id+'#as='+other.id+'&k='+other.k);await sleep(3000);await O.page.evaluate(()=>document.querySelector('#tab_teams').click());await waitFor(()=>O.page.$('#tlist .trow[data-k]'),10000);
  const before=await raw(K.pick(meta.epoch||1,4));const st=await O.page.evaluate(()=>{const r=document.querySelector('#tlist .trow[data-k]');return{a:r.dataset.a||'',go:r.classList.contains('go'),cur:getComputedStyle(r).cursor}});
  ok(w+'px off-turn: rows carry no draft action or pointer affordance',!st.a&&!st.go&&st.cur!=='pointer',st);
  await O.page.$eval('#tlist .trow[data-k] .tm',e=>e.click());await sleep(500);await O.page.$eval('#tlist .trow[data-k]',e=>e.click());await sleep(1200);
  const pop=await O.page.evaluate(()=>!!document.querySelector('#confirmpick,.sheetbg.cmodal,#sheetwrap .sheet'));const after=await raw(K.pick(meta.epoch||1,4));
  ok(w+'px off-turn: tapping a team name or row opens no pop-up',!pop,pop);ok(w+'px off-turn: the tap makes no pick',before===after,{before:before.slice(0,80),after:after.slice(0,80)});ok(w+'px off-turn page: no page errors',O.errs.length===0,O.errs);await O.close()}
 /* My Team / queue */
 await P.page.evaluate(()=>document.querySelector('#tab_my').click());await sleep(800);ok(w+'px My Team / queue: no per-team Draft buttons',(await draftBtns(P)).length===0,await draftBtns(P));
 ok(w+'px no page errors',P.errs.length===0,P.errs);await P.close();
 /* mock draft */
 const M=await L.phone('rtm'+w,opt);await M.go('mock.html');await M.page.waitForSelector('#startmock',{timeout:15000}).catch(()=>{});await M.page.click('#startmock').catch(()=>{});await M.page.waitForFunction(()=>/room\.html/.test(location.href),{timeout:20000}).catch(()=>{});await sleep(2500);
 const onRoom=/room\.html/.test(M.page.url());if(onRoom){await waitFor(()=>M.page.$('#pickbtn,#tab_teams'),20000);await M.page.evaluate(()=>{const t=document.querySelector('#tab_teams');if(t)t.click()});await sleep(1200)}
 ok(w+'px mock draft: no per-team Draft buttons',(await draftBtns(M)).length===0,{url:M.page.url(),b:await draftBtns(M)});await M.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
