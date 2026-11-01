/* s27qa: 'STOOPIDS PRESENTS' kicker directly above #ltitle in #lhead, once, muted small caps letter-spaced, centered over the title; no overflow at 320/390/1280. SHOTS=dir -> hero-<w>.png */
const L=require('./lib.js'),path=require('path');const {seed}=require('./seed_league.js');
let n=0,bad=0;function ok(t,c,x){n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
(async()=>{try{const id=await seed(null,{name:"Ball Don't Lie"});const SH=process.env.SHOTS;
  for(const w of [320,390,1280]){const P=await L.phone('hp'+w,{desktop:w>=760,w,h:w>=760?900:844});await P.page.setBypassServiceWorker(true);await P.go('league.html?l='+id);await P.page.waitForSelector('#ltitle',{timeout:25000});await L.sleep(1200);
    const r=await P.page.evaluate(()=>{const p=document.querySelectorAll('.s27-pres'),t=document.getElementById('ltitle');const e=p[0];if(!e)return{n:0};const cs=getComputedStyle(e),a=e.getBoundingClientRect(),b=t.getBoundingClientRect();
      return{n:p.length,all:(document.body.innerText.match(/stoopids presents/ig)||[]).length,txt:e.innerText.trim(),fv:cs.fontVariantCaps,ls:parseFloat(cs.letterSpacing),col:cs.color,mut:getComputedStyle(document.documentElement).getPropertyValue('--mut').trim(),next:e.nextElementSibling&&e.nextElementSibling.contains(t),gap:b.top-a.bottom,cx:Math.abs((a.left+a.right)/2-(innerWidth/2)),sw:document.documentElement.scrollWidth,iw:innerWidth}});
    ok(w+'px one STOOPIDS PRESENTS line on the page, in #lhead directly above the league name',r.n===1&&r.all===1&&r.next&&r.gap>=0&&r.gap<16&&/^stoopids presents$/i.test(r.txt),r);
    ok(w+'px muted small caps, letter-spaced, centered',r.fv==='small-caps'&&r.ls>1&&r.cx<4,r);
    ok(w+'px no horizontal overflow',r.sw<=r.iw,r);ok(w+'px no page errors',!P.errs.length,P.errs);
    if(SH&&w!==320)await P.page.screenshot({path:path.join(SH,'hero-'+w+'.png')});await P.close()}
  {/* default hero: brand-new league with no banner (no hero key, no settings.photo) -> arena photo assets/hero-banner.jpg (F.HERO.file) + kicker */
    const id2=await seed(null,{name:'Fresh League No Banner'});const P=await L.phone('hpd',{w:390,h:844});await P.page.setBypassServiceWorker(true);await P.go('league.html?l='+id2);await P.page.waitForSelector('#ltitle',{timeout:25000});await L.sleep(1500);
    const st=await (await fetch(L.API+encodeURIComponent('fbn.'+id2+'.hero'))).text().catch(()=>'');
    const r=await P.page.evaluate(()=>{const h=document.getElementById('hero');const bg=getComputedStyle(h).backgroundImage;const R=h.getBoundingClientRect();return{bg,file:FBN.HERO.file,h:R.height,pres:(document.querySelector('#lhead .s27-pres')||{}).innerText||''}});
    ok('no-banner league: default hero is the arena photo ('+r.file+'), visible',/hero-banner\.jpg/.test(r.bg)&&r.h>80,r);
    ok('no-banner league: STOOPIDS PRESENTS above the name',/stoopids presents/i.test(r.pres),r);
    ok('no-banner league: no page errors',!P.errs.length,P.errs);if(SH)await P.page.screenshot({path:path.join(SH,'hero-default-390.png')});await P.close()}
}catch(e){bad++;console.log('FAIL exception: '+(e&&e.stack||e))}await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));process.exit(bad?1:0)})();
