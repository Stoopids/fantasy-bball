/* s25-full (Paul via NCAA): no "Hide drafted" control; "Queued" is a small pill chip (aria-pressed) in the search + sort row, not in a tab row,
   and it filters the list to queued teams. Teams tab and the pick pop-up, 390 + 1280. Mock store only. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
(async()=>{try{
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:3600,picksMade:3});const K=F.Keys(id);
 for(const [w,h,d] of [[390,844,false],[1280,800,true]]){const pre=w+'px: ';const me=seed.info.managers[w>700?3:2];const P=await L.phone('qk'+w,{w,h,desktop:d});await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await sleep(3000);
  await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await sleep(1200);
  const ks=await P.page.evaluate(()=>[...document.querySelectorAll('#tlist [data-k]')].slice(2,5).map(r=>r.dataset.k));
  for(const k of ks){await P.page.evaluate(k=>{const b=document.querySelector('#tlist [data-k="'+k+'"] .qbtn');if(b)b.click()},k);await sleep(900)}
  const r=await P.page.evaluate(()=>{const c=document.getElementById('tqchip');return{txt:document.body.innerText,hide:!!document.querySelector('[data-a=thide]'),c:!!c,label:c&&c.innerText.trim(),pressed:c&&c.getAttribute('aria-pressed'),
    inTabs:!!(c&&c.closest('#tsort,#tpills,[role=tablist],.tabs,nav')),inCtl:!!(c&&c.closest('.ctl')),rad:c?parseFloat(getComputedStyle(c).borderTopLeftRadius):0,h:c?Math.round(c.getBoundingClientRect().height):0,n:document.querySelectorAll('#tlist [data-k]').length}});
  ok(pre+'no "Hide drafted" control or text',!r.hide&&!/Hide drafted/i.test(r.txt));
  ok(pre+'"Queued" chip in the search + sort controls, NOT inside the tab/sort row',r.c&&r.label==='Queued'&&r.inCtl&&!r.inTabs,r);
  ok(pre+'chip is a pill (round) at least 44px tall, aria-pressed=false to start',r.rad>=15&&r.h>=44&&r.pressed==='false',r);
  await P.page.click('#tqchip');await sleep(800);
  const f=await P.page.evaluate(()=>({p:document.getElementById('tqchip').getAttribute('aria-pressed'),ks:[...document.querySelectorAll('#tlist [data-k]')].map(r=>r.dataset.k)}));
  ok(pre+'tapping Queued filters the list to exactly the queued teams, aria-pressed=true',f.p==='true'&&f.ks.length===ks.length&&ks.every(k=>f.ks.includes(k)),{f,ks});
  await P.page.click('#tqchip');await sleep(800);const g=await P.page.evaluate(()=>({p:document.getElementById('tqchip').getAttribute('aria-pressed'),n:document.querySelectorAll('#tlist [data-k]').length}));
  ok(pre+'tapping again shows all teams again',g.p==='false'&&g.n===r.n,g);
  /* pick pop-up */
  const hasPop=await P.page.evaluate(()=>{const b=document.querySelector('#pickbtn,[data-a=pickpop],[data-a=openpick]');if(b){b.click();return true}return false});
  if(hasPop){await sleep(1000);const q=await P.page.evaluate(()=>{const c=document.getElementById('tqchipP');return{c:!!c,inTabs:!!(c&&c.closest('#tsortP,#tpillsP,[role=tablist]')),hide:!!document.querySelector('[data-a=thide]')}});
   ok(pre+'pick pop-up: Queued chip present, outside the sort row, no Hide drafted',q.c&&!q.inTabs&&!q.hide,q)}
  ok(pre+'no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
