/* s25 tab bar: wraps into rows (no sideways scroll), all tabs in view, taps >= 44px, labels not cut, active state kept. node tests/e2e_tabs_s25.js (APP / API env) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s25';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
(async()=>{try{const id=await seed();
  for(const [w,per] of [[320,3],[359,3],[360,3],[361,4],[390,4],[559,4],[560,99],[700,99],[760,99],[1280,99]]){const P=await L.phone('tb'+w,{desktop:w>=760,w,h:900});await P.go('league.html?l='+id+'#bets');await P.page.waitForSelector('#ltabs',{timeout:25000});await sleep(1200);
    const r=await P.page.evaluate(()=>{const n=document.getElementById('ltabs'),nr=n.getBoundingClientRect();const it=[...n.querySelectorAll('a,button')];
      const b=it.map(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(n);const labs=[...e.querySelectorAll('.nl')].filter(s=>getComputedStyle(s).display!=='none');
        return{t:e.innerText.replace(/\s+/g,' ').trim(),l:r.left,r:r.right,t0:r.top,b:r.bottom,w:r.width,h:r.height,cut:labs.some(s=>s.scrollWidth>s.clientWidth+1||s.getBoundingClientRect().right>r.right+1||s.getBoundingClientRect().left<r.left-1),on:e.classList.contains('on')}});
      const cs=getComputedStyle(n);return{pos:cs.position,sw:n.scrollWidth,cw:n.clientWidth,ox:cs.overflowX,ws:cs.whiteSpace,nl:nr.left,nrr:nr.right,b,dw:document.documentElement.scrollWidth,iw:innerWidth,rows:[...new Set(b.map(x=>Math.round(x.t0)))].length,cols:[...new Set(b.map(x=>Math.round(x.l)))].length,eq:Math.max(...b.map(x=>x.w))-Math.min(...b.map(x=>x.w))}});
    ok(w+'px: tab bar scrollWidth <= clientWidth, no sideways scroll on the bar or the page',r.sw<=r.cw&&r.ox!=='auto'&&r.ox!=='scroll'&&r.dw<=w,{sw:r.sw,cw:r.cw,ox:r.ox,dw:r.dw});
    ok(w+'px: every tab fully in view ('+r.b.length+' tabs)',r.b.every(x=>x.l>=r.nl-0.5&&x.r<=r.nrr+0.5&&x.r<=w&&x.l>=0),r.b.map(x=>[x.t,Math.round(x.l),Math.round(x.r)]));
    ok(w+'px: taps >= 44 x 44, labels not cut off',r.b.every(x=>x.w>=44&&x.h>=44&&!x.cut),r.b.filter(x=>x.w<44||x.h<44||x.cut));
    if(per<99)ok(w+'px: '+per+' equal-width tabs per row ('+r.rows+' rows)',r.cols===per&&r.eq<1.5&&r.rows===Math.ceil(r.b.length/per),{cols:r.cols,rows:r.rows,eq:r.eq});
    else ok(w+'px: one row when the tabs fit (they do at this width)',r.rows===1,{rows:r.rows});
    ok(w+'px: bar is '+(w<760?'not sticky':'sticky'),r.pos===(w<760?'static':'sticky'),r.pos);
    ok(w+'px: active tab kept (Bets highlighted, aria-current)',r.b.filter(x=>x.on).length===1&&/Bets/.test(r.b.find(x=>x.on).t)&&!!(await P.page.$('#ltabs [aria-current=page][data-v=bets]')));
    await P.page.evaluate(()=>scrollTo(0,0));if([320,360,390,1280].includes(w))await P.page.screenshot({path:SH+'/s25_tabs_'+w+'.png',clip:{x:0,y:0,width:w,height:Math.min(900,Math.ceil(r.b[r.b.length-1].b)+260)}});await P.page.close()}
  {const P=await L.phone('tb760',{desktop:true,w:760,h:900});await P.go('league.html?l='+id);await P.page.waitForSelector('#ltabs',{timeout:25000});await sleep(800);
    const r=await P.page.evaluate(()=>{const n=document.getElementById('ltabs');return{sw:n.scrollWidth,cw:n.clientWidth,dw:document.documentElement.scrollWidth}});ok('760px: no sideways scroll',r.sw<=r.cw&&r.dw<=760,r);await P.page.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
