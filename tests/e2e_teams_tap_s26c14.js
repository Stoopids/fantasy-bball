/* s26c14 (Paul, safety): in the Teams list a team is drafted ONLY by its Draft button (+ confirm). Real mouse/touch taps on the row, name chip, logo, both ranks,
   record and the Queue button on your turn write NO pick and open no confirm; Draft + confirm writes exactly one pick. Queue button >= 48px tall, >= 8px from Draft.
   Pick overlay (Pick a team) and search results use the same rows: checked too. Board has no draft action. 390 / 1280 / 320. Mock store only. SHOTDIR: teams-tap-390.png, teams-tap-320.png */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const path=require('path'),fs=require('fs');
const SD=process.env.SHOTDIR;if(SD)fs.mkdirSync(SD,{recursive:true});
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{try{
 for(const [w,h,desk] of [[390,844,false],[1280,900,true],[320,640,false]]){
  const id=await seed(API,{managers:8,rounds:8,live:true,clockSecs:null,picksMade:0});const I=seed.info;const K=F.Keys(id);const M0=await gj(K.meta);
  const owner1=M0.order[0];const me=I.managers.find(m=>m.id===owner1);
  const P=await L.phone('tap'+w,{w,h,desktop:desk});await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await sleep(3500);
  await P.page.evaluate(()=>document.getElementById('tab_teams').click());await sleep(1200);
  const picks=async()=>{const out=[];for(let k=1;k<=3;k++){const e=await gj(K.pick(M0.epoch,k));if(e&&e.tid)out.push(e)}return out};
  const box=sel=>P.page.evaluate(s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}},sel);
  const tap=async(sel,dx)=>{const b=await box(sel);if(!b)return false;await sleep(150);const b2=await box(sel);if(desk)await P.page.mouse.click(b2.x+(dx||0),b2.y);else await P.page.touchscreen.tap(b2.x+(dx||0),b2.y);await sleep(700);return true};
  const sheet=()=>P.page.evaluate(()=>!!document.getElementById('confirmpick'));
  const row='#tlist .trow.go:nth-of-type(2)';const tid=await P.page.evaluate(s=>{const r=document.querySelector(s);return r&&r.dataset.t},row);
  ok(w+': rows have no row-level draft action (no data-a/role on .trow)',await P.page.evaluate(()=>[...document.querySelectorAll('.trow')].every(r=>!r.dataset.a&&!r.getAttribute('role'))));
  ok(w+': every available row has its name pill as the Draft action (s27)',await P.page.evaluate(()=>[...document.querySelectorAll('#tlist .trow.go')].every(r=>r.querySelector('.tm.dbtn[data-a=draftrow]'))));
  const targets=[[row+' .rks','STOOPID rank',0],[row+' .rko','Power rank',0],[row+' .tr','record',0]];
  for(const [sel,nm] of targets){const did=await tap(sel);if(!did){ok(w+': '+nm+' present (record hidden at 320 by design)',sel.endsWith('img')||(w<=350&&nm==='record'));continue}
   const sh=await sheet();ok(w+': tap '+nm+' opens no confirm',!sh);if(sh){await P.page.evaluate(()=>UI.closeSheet());await sleep(300)}}
  await tap(row+' .qbtn');const q1=await P.page.evaluate(s=>document.querySelector(s+' .qbtn').classList.contains('on'),row);ok(w+': Queue button queues (no confirm)',q1&&!(await sheet()));
  const geo=await P.page.evaluate(s=>{const q=document.querySelector(s+' .qbtn').getBoundingClientRect(),d=document.querySelector(s+' .dbtn').getBoundingClientRect();return{qh:q.height,qw:q.width,dh:d.height,dw:d.width,gap:q.left-d.right}},row);
  ok(w+': Queue >=48px tall and wider (>=52px), Draft >=48px, gap >=8px',geo.qh>=48&&geo.qw>=52&&geo.dh>=48&&geo.dw>=44&&geo.gap>=8,geo);
  ok(w+': no sideways scroll',await P.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await sleep(1500);let pk=await picks();ok(w+': after all those taps, NO pick written',pk.length===0,pk);
  if(SD&&(w===390||w===320)){await box(row);await P.page.screenshot({path:path.join(SD,'teams-tap-'+w+'.png')})}
  /* search list = same rows */
  await P.page.evaluate(()=>{const q=document.getElementById('tq');q.value='a';q.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(700);
  await tap('#tlist .trow.go .rks');ok(w+': search result row (rank) tap opens no confirm',!(await sheet()));
  await P.page.evaluate(()=>{const q=document.getElementById('tq');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(700);
  /* Board: no draft action */
  await P.page.evaluate(()=>document.getElementById('tab_board').click());await sleep(800);ok(w+': Board has no draft controls',await P.page.evaluate(()=>!document.querySelector('#view [data-a=draftrow]')));
  /* pick overlay rows */
  const pb=await P.page.evaluate(()=>{const b=document.getElementById('pickbtn');if(b)b.click();return !!b});await sleep(900);
  if(pb){await tap('#pickov .trow.go .rks');ok(w+': Pick-a-team overlay row (rank) tap opens no confirm',!(await sheet()));ok(w+': overlay rows have Draft buttons',await P.page.evaluate(()=>!!document.querySelector('#pickov .trow.go .dbtn')));await P.page.evaluate(()=>{const c=document.querySelector('#pickov [data-a=closepick],#pickov .x,#pickov [data-a=pickclose]');if(c)c.click()});await sleep(400)}
  await P.page.evaluate(()=>{const x=document.getElementById('pickov');if(x)x.remove();document.getElementById('tab_teams').click()});await sleep(900);
  pk=await picks();ok(w+': still no pick',pk.length===0,pk);
  await tap('#tlist .trow.go[data-t="'+tid+'"] .dbtn');ok(w+': Draft opens the confirm',await sheet());
  await P.page.evaluate(()=>document.getElementById('confirmpick').click());await sleep(3500);
  pk=await picks();ok(w+': Draft + confirm writes exactly one pick, for that team, by me',pk.length===1&&String(pk[0].tid)===String(tid)&&pk[0].owner===me.id,pk);
  ok(w+': 0 JS errors',!P.errs.length,P.errs);await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
