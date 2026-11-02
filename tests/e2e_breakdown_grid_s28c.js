/* s28c Standings > Breakdown: cards use the full content width, 2 across from 900px (like the 2-column Recap), 1 column on phones; no overflow.
   node tests/e2e_breakdown_grid_s28c.js  (APP / API env; SHOTS=dir SHOTTAG=before|after for screenshots) */
const L=require('./lib.js');const path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;
const SH=process.env.SHOTS||'',TAG=process.env.SHOTTAG||'after';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
(async()=>{try{const id=await seed();
  for(const w of [390,1280,900,899]){const P=await L.phone('bk'+w,{desktop:w>=760,w,h:900});await P.page.setBypassServiceWorker(true);
    await P.go('league.html?l='+id+'#standings/breakdown');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await P.page.waitForSelector('#ptsv .pk',{timeout:20000});await sleep(500);
    const r=await P.page.evaluate(()=>{const cs=[...document.querySelectorAll('#ptsv > .pk')].map(e=>e.getBoundingClientRect());const b=document.querySelector('#lbody').getBoundingClientRect();
      const tops=new Set(cs.map(c=>Math.round(c.top)));const perRow=cs.filter(c=>Math.round(c.top)===Math.round(cs[0].top)).length;
      return{n:cs.length,perRow,rows:tops.size,left:Math.round(Math.min(...cs.map(c=>c.left))-b.left),right:Math.round(b.right-Math.max(...cs.map(c=>c.right))),bw:Math.round(b.width),sw:document.documentElement.scrollWidth,iw:innerWidth,
        wide:[...document.querySelectorAll('#ptsv .ptw')].filter(e=>e.scrollWidth>e.clientWidth+1).length}});
    if(SH&&(w===390||w===1280)){const f=path.join(SH,TAG+'_breakdown_'+w+'.png');await P.page.screenshot({path:f,fullPage:w===1280?false:false});console.log('  shot '+f)}
    if(TAG!=='before'){const want=w>=900?2:1;ok(w+'px: '+want+' card(s) across',r.n>=2&&r.perRow===want,r);
      if(w>=900)ok(w+'px: cards span the full content width (edges within 2px)',r.left<=2&&r.right<=2,r);
      ok(w+'px: no horizontal overflow (page or tables)',r.sw<=r.iw&&r.wide===0,r)}
    if(w===1280&&TAG!=='before'){await P.page.evaluate(()=>document.documentElement.classList.add('bd-a'));await sleep(300);const a=await P.page.evaluate(()=>{const cs=[...document.querySelectorAll('#ptsv > .pk')].map(e=>e.getBoundingClientRect());return{perRow:cs.filter(c=>Math.round(c.top)===Math.round(cs[0].top)).length,fs:getComputedStyle(document.querySelector('#ptsv .ptab')).fontSize,sw:document.documentElement.scrollWidth,iw:innerWidth}});
      ok('1280px html.bd-a (variant A): one full-width column, 15px stat table, no overflow',a.perRow===1&&a.fs==='15px'&&a.sw<=a.iw,a);if(SH){const f=path.join(SH,'after_breakdown_A_1280.png');await P.page.screenshot({path:f});console.log('  shot '+f)}}
    await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
