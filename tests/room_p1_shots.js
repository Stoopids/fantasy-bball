/* Teams tab, board, end-of-draft screen at 390 and 1280. node tests/room_p1_shots.js <outdir>  (APP / API env) */
const L=require('./lib.js');const {seedRecap}=require('./recap_seed.js');const {seed}=require('./seed_league.js');const {sleep}=L;const out=process.argv[2]||'/tmp';
(async()=>{try{
 const live=await seed(null,{live:true,picksMade:11,rounds:8});const li=seed.info;const me=li.managers[4];
 const done=await seedRecap(null,{});const di=seedRecap.info;const dm=di.managers[5];
 for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
  let P=await L.phone('a'+w,desk?{desktop:true,w,h}:{w,h});await P.page.setBypassServiceWorker(true);
  await P.go('room.html?l='+live+'#as='+me.id+'&k='+me.k);await sleep(2500);
  await P.page.click('#tab_teams');await sleep(900);await P.page.screenshot({path:out+'/teams-'+w+'.png'});
  await P.page.click('#tab_board');await sleep(900);await P.page.screenshot({path:out+'/board-'+w+'.png'});await P.close();
  P=await L.phone('b'+w,desk?{desktop:true,w,h}:{w,h});await P.page.setBypassServiceWorker(true);
  await P.go('room.html?l='+done+'#as='+dm.id+'&k='+dm.k);await sleep(2500);await P.page.screenshot({path:out+'/enddraft-'+w+'.png'});
  await P.page.evaluate(()=>window.scrollTo(0,700));await sleep(500);await P.page.screenshot({path:out+'/enddraft-'+w+'-scrolled.png'});
  console.log(w,JSON.stringify(P.errs));await P.close()}
 }catch(e){console.log(e.stack)}finally{await L.close()}})();
