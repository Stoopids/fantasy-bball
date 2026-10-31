/* s24: shared League site loader (3 bouncing basketballs, STOOPIDS BALL-LOADER design). Loader shown while the league loads, accessible, no old "Loading the league" card,
   reduced motion stops the bounce, no overflow at 320/360/390/1280, Bets "Connecting…" uses the same loader.
   node tests/e2e_loader_s24.js  (APP / API env, mock store). Screenshot + clip frames to SHOTS (default /workspace/league-site-work/compare-s24). */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const fs=require('fs');
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s24';
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
async function held(w,o){o=o||{};const P=await L.phone('ld'+w+Math.random().toString(36).slice(2,5),{w,desktop:w>=1000});const q=[];let hold=true;
  if(o.rm)await P.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=r.url();if(hold&&(/\/api\/data\//.test(u)||/\.json(\?|$)/.test(u)&&!/manifest/.test(u)))q.push(r);else r.continue().catch(()=>{})});
  P.release=()=>{hold=false;q.splice(0).forEach(r=>r.continue().catch(()=>{}))};return P}
const info=P=>P.page.evaluate(()=>{const l=document.querySelector('#loading .bl');if(!l)return null;const b=[...l.querySelectorAll('.bl-b i')];const r=l.getBoundingClientRect();
  return{role:l.getAttribute('role'),live:l.getAttribute('aria-live'),text:l.querySelector('.bl-t').innerText.trim(),hid:l.querySelector('.bl-row').getAttribute('aria-hidden'),n:b.length,
    anim:b.map(e=>getComputedStyle(e).animationName),shadow:b.map(e=>getComputedStyle(e.parentNode.querySelector('s')).animationName),delay:b.map(e=>getComputedStyle(e).animationDelay),
    cx:Math.round(r.left+r.width/2),vw:innerWidth,over:document.documentElement.scrollWidth>innerWidth,body:document.body.innerText,oldCard:!!document.querySelector('.card#loading')}});
(async()=>{try{
  const id=await seed();
  for(const w of [390,320,360,1280]){const P=await held(w);await P.go('league.html?l='+id);await P.page.waitForSelector('#loading .bl',{timeout:15000});await sleep(500);const s=await info(P);
    if(w===390){
      ok('loader shown during load: 3 balls, role=status, aria-live=polite, "Loading…" readable, balls aria-hidden',s&&s.n===3&&s.role==='status'&&s.live==='polite'&&s.text==='Loading…'&&s.hid==='true',s);
      ok('no old "Loading the league…" card',!/Loading the league/.test(s.body)&&!s.oldCard,s);
      ok('balls bounce (blBounce) with staggered delays, shadows animate (blShadow)',s.anim.every(a=>a==='blBounce')&&new Set(s.delay).size===3&&s.shadow.every(a=>a==='blShadow'),s);
      await P.page.screenshot({path:SH+'/s24_loader_390.png'});
      fs.mkdirSync('/tmp/s24ld',{recursive:true});fs.readdirSync('/tmp/s24ld').forEach(f=>fs.unlinkSync('/tmp/s24ld/'+f));
      const box=await P.page.$eval('#loading .bl',e=>{const r=e.getBoundingClientRect();return{x:0,y:Math.max(0,r.top-20),width:innerWidth,height:r.height+40}});
      const t0=Date.now();let i=0;while(Date.now()-t0<2700){await P.page.screenshot({path:`/tmp/s24ld/f${String(i++).padStart(3,'0')}.png`,clip:box})}fs.writeFileSync('/tmp/s24ld/fps',String(i/((Date.now()-t0)/1000)))
    }
    ok(w+'px: loader centered, no overflow',s&&!s.over&&Math.abs(s.cx-s.vw/2)<=2,s);
    P.release();await P.page.waitForSelector('#lapp[data-ready]',{timeout:30000});ok(w+'px: loader gone after load',!(await P.page.$('#loading .bl')));await P.close()}
  {const P=await held(390,{rm:true});await P.go('league.html?l='+id);await P.page.waitForSelector('#loading .bl',{timeout:15000});await sleep(300);const s=await info(P);
    ok('prefers-reduced-motion: no bounce, no shadow animation, balls and "Loading…" still shown',s.anim.every(a=>a==='none')&&s.shadow.every(a=>a==='none')&&s.n===3&&s.text==='Loading…',s);
    await P.page.screenshot({path:SH+'/s24_loader_reduced_390.png'});P.release();await P.close()}
  {const P=await L.phone('ldb',{});await P.page.setRequestInterception(true);let hold=true;const q=[];
    P.page.on('request',r=>{if(hold&&/bets-/.test(r.url()))q.push(r);else r.continue().catch(()=>{})});
    await P.go('league.html?l='+id+'#bets');await P.page.waitForSelector('#b27Top',{timeout:30000});const t=await P.page.evaluate(()=>{const l=document.querySelector('#lbody .bl');return l?{role:l.getAttribute('role'),t:l.querySelector('.bl-t').innerText.trim(),top:document.getElementById('b27Top').innerText,owes:!!document.getElementById('b27Owes')}:null});
    ok('Bets while the bets load: the same loader (role=status, "Loading…") instead of the totals / list; live line says Connecting…',t&&t.role==='status'&&t.t==='Loading…'&&/Connecting/.test(t.top)&&!t.owes,t);hold=false;q.splice(0).forEach(r=>r.continue().catch(()=>{}));await P.close()}
  /* recap page: the power rankings loader (js/power-render.js + css/power.css) */
  {const {html,rjs}=require('./power_hook.js')(require('path').join(__dirname,'..'));
    for(const rm of [false,true]){const P=await L.phone('pw'+rm,{});if(rm)await P.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);let hold=true;const q=[];
      P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/recap.html')r.respond({status:200,contentType:'text/html; charset=utf-8',body:html});else if(u.pathname==='/js/recap.js')r.respond({status:200,contentType:'application/javascript; charset=utf-8',body:rjs});else if(hold&&/power-rankings\.json/.test(u.pathname))q.push(r);else r.continue().catch(()=>{})});
      await P.go('recap.html?l='+id);await P.page.waitForSelector('#prwait .bl',{timeout:30000});await sleep(500);
      const s=await P.page.evaluate(()=>{const l=document.querySelector('#prwait .bl');const b=[...l.querySelectorAll('.bl-b i')];const r=l.getBoundingClientRect();return{role:l.getAttribute('role'),live:l.getAttribute('aria-live'),t:l.querySelector('.bl-t').innerText.trim(),n:b.length,anim:b.map(e=>getComputedStyle(e).animationName),sh:b.map(e=>getComputedStyle(e.parentNode.querySelector('s')).animationName),over:document.documentElement.scrollWidth>innerWidth,cx:Math.round(r.left+r.width/2),old:/Loading the power rankings…/.test(document.querySelector('#prwait').innerText.replace(/[\s\S]*🏀/,''))&&!!document.querySelector('.card#prwait')}});
      if(!rm){ok('recap power rankings: ball loader (3 balls, role=status, aria-live=polite, "Loading the power rankings…"), animated, no old card, no overflow',s.role==='status'&&s.live==='polite'&&s.t==='Loading the power rankings…'&&s.n===3&&s.anim.every(a=>a==='blBounce')&&s.sh.every(a=>a==='blShadow')&&!s.over&&!s.old,s);
        await P.page.evaluate(()=>document.getElementById('prwait').scrollIntoView({block:'center'}));await sleep(300);await P.page.screenshot({path:SH+'/s24_power_loader_390.png'})}
      else ok('recap power loader, reduced motion: no bounce / shadow animation',s.anim.every(a=>a==='none')&&s.sh.every(a=>a==='none')&&s.n===3,s);
      hold=false;q.splice(0).forEach(r=>r.continue().catch(()=>{}));await P.page.waitForFunction(()=>!document.querySelector('#prwait'),{timeout:20000}).then(()=>ok((rm?'reduced: ':'')+'power loader gone once the rankings load',true)).catch(()=>ok('power loader gone once the rankings load',false));await P.close()}}
}catch(e){bad++;console.log('Error',e)}await L.close();console.log(`\n${n-bad} / ${n} checks passed`);if(bad){console.log(fails.join('\n'));process.exit(1)}process.exit(0)})();
