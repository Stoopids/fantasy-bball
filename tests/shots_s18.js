/* all-tab screenshots of the finished League site (names + schools match data/power-rankings.json so the Power tab is populated) at 390 and 1280
   OUT=dir APP= API= node tests/shots_s18.js */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const OUT=process.env.OUT||'/tmp/shots';fs.mkdirSync(OUT,{recursive:true});
const PR=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/power-rankings.json'),'utf8'));
const t=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));
const sk=v=>String(v).toLowerCase().replace(/&/g,'and').replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]+/g,'');const tidOf={};TD.teams.forEach(x=>{[x[1],x[2]].forEach(y=>{if(y)tidOf[sk(y)]=x[0]})});
(async()=>{try{const id=await seed(null,{names:PR.map(r=>[r.manager,r.team,'🏀']),rosters:PR.map(r=>r.schools.map(x=>tidOf[sk(x)])),rounds:8});
 for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){const P=await L.phone('sh'+w,desk?{desktop:true,w,h}:{});await P.go('league.html?l='+id+'&demo=1');await P.page.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:25000});await sleep(600);
  for(const tab of ['standings','games','rosters','teams','postseason','redraft','archive','rules','power']){await P.page.evaluate(t=>document.querySelector('#ltabs [data-v='+t+']').click(),tab);await sleep(500);
   await P.page.screenshot({path:`${OUT}/s18-${w}-${tab==='power'?'power-collapsed':tab}.png`,fullPage:false});
   if(tab==='power'){await P.page.evaluate(()=>{const b=document.querySelector('.plb');if(b)b.click()});await sleep(300);await P.page.screenshot({path:`${OUT}/s18-${w}-power-expanded.png`});await P.page.evaluate(()=>{const b=document.querySelector('.deepbtn');if(b)b.click()});await sleep(300);await P.page.screenshot({path:`${OUT}/s18-${w}-power-deepdive.png`})}}
  console.log(w,'errs',P.errs.length);await P.page.close()}
}catch(e){console.log(e.stack)}finally{await L.close();process.exit()}})();
