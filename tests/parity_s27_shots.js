/* s27 parity: League shots matching /workspace/audit/s27 names, composed side by side (STOOPIDS left, League right) into ../../parity-s27 */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const OUT='/workspace/league-site-work/parity-s27/';
(async()=>{try{const id=await seed();const info=seed.info;
 for(const [w,opt] of [['390',{}],['1280',{desktop:true,w:1280,h:900}]]){
  const P=await L.phone('p'+w,opt);await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});await P.page.setBypassServiceWorker(true);await P.go('league.html?l='+id);await sleep(1800);
  const tab=async t=>{await P.page.evaluate(t=>{const b=document.querySelector('[data-a=tab][data-v='+t+']');b&&b.click()},t);await sleep(700);await P.page.evaluate(()=>window.scrollTo(0,0));await sleep(200)};
  const s=async n=>P.page.screenshot({path:OUT+'L-'+n+'-'+w+'.png'});
  await s('header');for(const t of ['standings','teams','games','recap','bets']){await tab(t);await s(t)}
  await tab('bets');const ok=await P.page.evaluate(()=>{const b=document.querySelector('.s27-tipk');if(!b)return false;b.click();return true});await sleep(300);if(ok){await P.page.evaluate(()=>document.querySelector('.s27-tipk').scrollIntoView({block:'center'}));await sleep(200);await s('betform-popup')}
  await P.page.evaluate(()=>{const b=document.querySelector('[data-lb=howto]');b&&b.click()});await sleep(500);await s('howto');
  await tab('teams');await P.page.evaluate(()=>{const b=document.querySelector('[data-a=atsort][data-k=kp]');b&&b.click()});await sleep(400);await s('teams-kpsort');
  const m=await P.page.evaluate(()=>({ow:document.documentElement.scrollWidth>innerWidth}));console.log(w,'overflow',m.ow,'errs',P.errs.length);await P.close()}
 console.log('done')}catch(e){console.log(e.stack)}finally{await L.close()}})();
