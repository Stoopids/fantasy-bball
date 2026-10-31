/* screenshots for the s20 landing/help fix and the re-issue sheet. SHOTDIR=/path node tests/shots_landing.js  (mock on APP/API)  */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const D=process.env.SHOTDIR||'/tmp';
(async()=>{try{
for(const [w,h,d] of [[390,844,0],[1280,900,1]]){for(const pg of ['index.html','help.html']){const P=await L.phone('s',d?{desktop:true,w,h}:{});await P.page.setBypassServiceWorker(true);await P.go(pg);await P.page.waitForSelector('.landing');await sleep(500);
  await P.page.screenshot({path:`${D}/${pg.replace('.html','')}_${w}_top.png`});await P.page.screenshot({path:`${D}/${pg.replace('.html','')}_${w}_full.png`,fullPage:true});await P.close()}}
const id=await seed(process.env.API,{managers:8,rounds:4,live:true,picksMade:0});const I=seed.info;
for(const [w,h,d] of [[390,844,0],[1280,900,1]]){const C=await L.phone('c',d?{desktop:true,w,h}:{});await C.page.setBypassServiceWorker(true);await C.page.goto(`${APP}/room.html?l=${id}#cm=${I.cmSecret}`,{waitUntil:'domcontentloaded'});await C.page.waitForSelector('#tabs');await sleep(1000);
  await C.page.evaluate(()=>{const b=document.querySelector('[data-a=idclose]');if(b)b.click();const t=document.querySelector('[data-t=more]');if(t)t.click()});await sleep(600);
  await C.page.evaluate(m=>{const b=document.querySelector('#mgrcard [data-a=mgr]');b.scrollIntoView({block:'center'});b.click()});await sleep(500);await C.page.screenshot({path:`${D}/reissue_manage_${w}.png`});
  await C.page.$eval('#reissuebtn',e=>e.click());await sleep(400);await C.page.screenshot({path:`${D}/reissue_confirm_${w}.png`});await C.page.$eval('#cfyes',e=>e.click());await sleep(1500);await C.page.screenshot({path:`${D}/reissue_link_${w}.png`});await C.close()}
console.log('done')}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
