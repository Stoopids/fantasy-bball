/* s25-full no-ESPN rows: screenshots of the Teams tab, the Pick a team pop-up and a search, at 390 and 1280. OUT=<dir> TAG=before|after node tests/noespn_shots_s25g.js */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const OUT=process.env.OUT,TAG=process.env.TAG||'shot';
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
(async()=>{require('fs').mkdirSync(OUT,{recursive:true});
for(const [w,h] of [[390,844],[1280,800]]){const opt=w>700?{desktop:true,w,h}:{w,h};
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:3});const I=seed.info;const meta=F.parseJ(await raw(F.Keys(id).meta));
 const slot=F.slotAt(meta.order,4,meta.settings.type,meta.settings.rounds);const owner=I.managers.find(m=>m.id===slot.owner);
 const P=await L.phone('ne'+w,opt);await P.go('room.html?l='+id+'#as='+owner.id+'&k='+owner.k);await waitFor(()=>P.page.$('#pickbtn'),25000);await sleep(1200);
 await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await sleep(1200);
 await P.page.screenshot({path:`${OUT}/${TAG}_teams_${w}.png`});
 await P.page.focus('#tq');await P.page.keyboard.type('state');await sleep(900);await P.page.screenshot({path:`${OUT}/${TAG}_teams_search_${w}.png`});
 await P.page.evaluate(()=>{const i=document.querySelector('#tq');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(500);
 await P.page.$eval('#pickbtn',e=>e.click());await waitFor(()=>P.page.$('#pickov .trow'),10000);await sleep(800);await P.page.screenshot({path:`${OUT}/${TAG}_popup_${w}.png`});
 const q=await P.page.$('#pickov input');if(q){await q.type('state');await sleep(900)}await P.page.screenshot({path:`${OUT}/${TAG}_popup_search_${w}.png`});await P.close()}
console.log('shots done');process.exit(0)})().catch(e=>{console.log(e.stack);process.exit(1)});
