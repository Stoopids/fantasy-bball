/* League-site screenshots (390 phone + 1280 desktop), every tab, plus commissioner view. node tests/league_site_shots.js (mock store on 9995/9996) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;
(async()=>{try{const id=await seed();const info=seed.info;
 for(const [tag,opt] of [['390',{}],['1280',{desktop:true,w:1280,h:900}]]){
  const P=await L.phone('s'+tag,opt);await P.page.setBypassServiceWorker(true);await P.go('league.html?l='+id+'&demo=1');await sleep(1500);
  await P.shot('league_site_'+tag);await P.page.screenshot({path:'/workspace/fantasy-bball/shots/league_site_'+tag+'_full.png',fullPage:true});
  for(const t of ['teams','games','redraft']){await P.page.evaluate(t=>document.querySelector('[data-a=tab][data-v='+t+']').click(),t);await sleep(500);await P.shot('league_site_'+tag+'_tab_'+t)}
  await P.page.evaluate(()=>document.querySelector('[data-a=tab][data-v=standings]').click());await P.page.evaluate(()=>document.querySelector('[data-a=mode][data-v=tourney]').click());await sleep(400);await P.shot('league_site_'+tag+'_tourney');
  await P.close();
  const C=await L.phone('c'+tag,opt);await C.page.evaluateOnNewDocument((id,s)=>localStorage.setItem('fbn.cm.'+id,s),id,info.cmSecret);await C.page.setBypassServiceWorker(true);await C.go('league.html?l='+id);await sleep(1500);await C.shot('league_site_'+tag+'_commissioner');await C.close();
 }
 console.log('done',id)}catch(e){console.log(e.stack)}finally{await L.close()}})();
