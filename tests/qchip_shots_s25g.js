/* s25-full Teams controls shots (Queued chip, no Hide drafted), real + mock-style live league at 390/1280. OUT, TAG env. */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
(async()=>{const OUT=process.env.OUT,TAG=process.env.TAG||'shot';require('fs').mkdirSync(OUT,{recursive:true});
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:3600,picksMade:3});const me=seed.info.managers[2];
 for(const [w,h,d] of [[390,844,false],[1280,800,true]]){const P=await L.phone('qc'+w,{w,h,desktop:d});await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await sleep(3000);
  await P.page.evaluate(()=>{const t=document.querySelector('#tab_teams');if(t)t.click()});await sleep(1500);await P.page.screenshot({path:`${OUT}/${TAG}_teams_controls_${w}.png`});await P.close()}
 process.exit(0)})();
