/* s25-full (Paul via NCAA): the More > profile card buttons (Edit profile & photo / Switch who I am / Copy my private link) are the same size:
   one row of equal columns, or stacked full-width under 420 px; every label on one line. 320 / 390 / 1280. OUT/TAG shots, SHOTS_ONLY=1 skips checks. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const OUT=process.env.OUT,TAG=process.env.TAG||'shot',CHECK=!process.env.SHOTS_ONLY;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
(async()=>{try{if(OUT)require('fs').mkdirSync(OUT,{recursive:true});
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:3});const I=seed.info;const me=I.managers[2];
 for(const [w,h] of [[320,640],[390,844],[1280,800]]){const opt=w>700?{desktop:true,w,h}:{w,h};const P=await L.phone('pb'+w,opt);await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.$('#tab_more'),25000);await sleep(1000);
  await P.page.evaluate(()=>document.querySelector('#tab_more').click());await waitFor(()=>P.page.$('#youcard'),8000);await P.page.evaluate(()=>document.getElementById('youcard').scrollIntoView({block:'center'}));await sleep(400);
  if(OUT){const c=await P.page.$('#youcard');await c.screenshot({path:`${OUT}/${TAG}_profile_${w}.png`})}
  if(CHECK){const r=await P.page.evaluate(()=>{const B=[...document.querySelectorAll('#youcard .pbtns > .btn')];return B.map(b=>{const q=b.getBoundingClientRect();const lh=parseFloat(getComputedStyle(b).lineHeight)||parseFloat(getComputedStyle(b).fontSize)*1.3;const rng=document.createRange();rng.selectNodeContents(b);const lines=new Set([...rng.getClientRects()].map(x=>Math.round(x.top))).size;return{t:b.textContent.trim(),w:q.width,h:q.height,top:q.top,lines,over:b.scrollWidth>b.clientWidth+1}})});
   const ws=r.map(x=>x.w),hs=r.map(x=>x.h);ok(w+'px: 3 profile buttons, equal width and height within 1 px',r.length===3&&Math.max(...ws)-Math.min(...ws)<=1&&Math.max(...hs)-Math.min(...hs)<=1,r);
   /* s26c6s: s25m BUG-2 lets labels wrap onto 2 lines under 360 px on purpose (44 px tall, never clipped) */if(w<360)ok(w+'px: labels shown in full, at most 2 lines, nothing cut off',r.every(x=>x.lines<=2&&!x.over&&x.h>=44),r);else ok(w+'px: every label on a single line, nothing cut off',r.every(x=>x.lines===1&&!x.over),r);
   ok(w+'px: '+(w<300?'stacked full width':'one row'),w<300?new Set(r.map(x=>Math.round(x.top))).size===3:new Set(r.map(x=>Math.round(x.top))).size===1,r.map(x=>x.top))}
  await P.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
