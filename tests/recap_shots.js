/* Draft recap screenshots (page top + each section) at 390 and 1280, seeded complete 8 x 8 league. node tests/recap_shots.js <outdir> [power]  (APP / API env) */
const L=require('./lib.js');const {seedRecap}=require('./recap_seed.js');const {sleep}=L;const out=process.argv[2]||'/tmp';const power=process.argv[3]==='power';
(async()=>{try{
 const id=await seedRecap(null,{power});const info=seedRecap.info;const me=info.managers[5];
 for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
  const P=await L.phone('r'+w,desk?{desktop:true,w,h}:{w,h});await P.page.setBypassServiceWorker(true);
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,me);
  await P.go('recap.html?l='+id);await P.page.waitForSelector('#rc_foot',{timeout:20000});await sleep(1200);
  const tag=(power?'example-':'generated-')+w;await P.page.screenshot({path:out+'/recap-'+tag+'-top.png'});
  for(const s of ['powerrecap_s','rc_order','rc_spin','rc_rosters','rc_outlook','rc_conf','rc_times','rc_awards','rc_site','rc_foot']){const el=await P.page.$('#'+s);if(!el)continue;await el.evaluate(e=>e.scrollIntoView({block:'start'}));await sleep(250);await P.page.screenshot({path:out+'/recap-'+tag+'-'+s+'.png'})}
  await P.page.evaluate(()=>window.scrollTo(0,0));await P.page.screenshot({path:out+'/recap-'+tag+'-full.png',fullPage:true});
  console.log(w,'errs',JSON.stringify(P.errs));await P.close()}
 console.log('league',id)}catch(e){console.log(e.stack)}finally{await L.close()}})();
