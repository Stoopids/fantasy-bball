/* s25-full recap shots (hero, buttons, rosters side by side), real + mock, 320/390/1280. OUT_HERO, OUT_ROS, TAG env. Prints measurements JSON. */
const L=require('./lib.js');const F=require('../js/core.js');const {seedRecap}=require('./recap_seed.js');const {sleep,API}=L;
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{const fs=require('fs');const OH=process.env.OUT_HERO,OR=process.env.OUT_ROS,TAG=process.env.TAG||'shot';[OH,OR].forEach(d=>d&&fs.mkdirSync(d,{recursive:true}));const res={};
 const real=await seedRecap(null,{power:true});const rinfo=seedRecap.info;
 const mock=await seedRecap(null,{});const minfo=seedRecap.info;{const K=F.Keys(mock);const m=await gj(K.meta);m.mock=true;m.solo=true;m.over={};minfo.managers.forEach((x,i)=>{if(i!==5)m.over[x.id]={bot:true}});await post(K.meta,m)}
 for(const [kind,id,info] of [['real',real,rinfo],['mock',mock,minfo]])for(const [w,h,d] of [[320,700,false],[390,844,false],[1280,800,true]]){
  const me=info.managers[5];const P=await L.phone(kind+w,{w,h,desktop:d});await P.page.setBypassServiceWorker(true);
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,me);
  await P.go('recap.html?l='+id);await P.page.waitForSelector('#rcgrade',{timeout:20000}).catch(()=>{});await sleep(2500);
  if(OH&&w!==320){await P.page.screenshot({path:`${OH}/${TAG}_${kind}_${w}.png`});await P.page.screenshot({path:`${OH}/${TAG}_${kind}_${w}_full.png`,fullPage:true})}
  const m=await P.page.evaluate(()=>{const hero=document.getElementById('recaphead');const g=document.getElementById('rcgrade');
   const btns=[...document.querySelectorAll('#app a,#app button')].map(b=>b.innerText.trim()).filter(t=>/See (all league grades|full draft recap|how you scored)/.test(t));
   const ros=document.querySelector('section#rc_rosters');return{heroH:hero?Math.round(hero.getBoundingClientRect().height):null,gradeTop:g?Math.round(g.getBoundingClientRect().top):null,vh:innerHeight,btns,rosId:ros?ros.id:null,sw:document.documentElement.scrollWidth,iw:innerWidth}});
  res[kind+'_'+w]=m;
  if(OR){const sec=await P.page.$('section#rc_rosters');if(sec){await sec.evaluate(e=>{const d=e.closest('details');if(d)d.open=true;e.scrollIntoView()});await sleep(500);await sec.screenshot({path:`${OR}/${TAG}_${kind}_${w}.png`}).catch(async()=>P.page.screenshot({path:`${OR}/${TAG}_${kind}_${w}.png`}))}else await P.page.screenshot({path:`${OR}/${TAG}_${kind}_${w}_nosection.png`,fullPage:true})}
  await P.close()}
 console.log(JSON.stringify(res));process.exit(0)})().catch(e=>{console.log(e.stack);process.exit(1)});
