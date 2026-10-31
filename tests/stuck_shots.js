/* screenshots of the "Pick stuck" banner (manager and commissioner view) at 390 and 1280. node tests/stuck_shots.js  (APP / API env, SHOTDIR) */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;const SD=process.env.SHOTDIR||'/tmp';
const base=API.replace('/api/data/','');const cfg=q=>fetch(base+'/__cfg?'+q);
(async()=>{try{await cfg('clear=1');const id=await seed(API,{managers:8,rounds:8,live:true,picksMade:35});const I=seed.info;const K=F.Keys(id);const meta=JSON.parse(await (await fetch(base+'/__dump/'+encodeURIComponent(K.meta))).text());
  const s=F.slotAt(meta.order,36,meta.settings.type,meta.settings.rounds);const mg=I.managers.find(m=>m.id===s.owner);await cfg('fail='+encodeURIComponent('-e1-p36$')+'&code=500');
  for(const [w,h,d] of [[390,844,0],[1280,900,1]])for(const who of ['mgr','host']){const P=await L.phone(who+w,d?{desktop:true,w,h}:{w,h});await P.page.setBypassServiceWorker(true);
    await P.page.goto(`${APP}/room.html?l=${id}${who==='mgr'?'#as='+mg.id+'&k='+mg.k:'#cm='+I.cmSecret}`,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#stuckbar',{timeout:30000});await sleep(800);
    await P.page.screenshot({path:`${SD}/stuck-${w}-${who}.png`});await P.close()}
  await cfg('clear=1')}catch(e){console.log(e.stack)}finally{await L.close()}})();
