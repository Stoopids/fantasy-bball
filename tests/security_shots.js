/* Screenshots of the new Stage 4 screens (mock store, port 9995/9996): identity paste form, unlock sheet, commissioner auto-start note, removed manager, demo bar.  node tests/security_shots.js */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{try{
 for(const [tag,opt] of [['m',{}],['d',{desktop:true,w:1280,h:860}]]){
  const id=await seed(API,{live:true,picksMade:3,managers:8,clockSecs:60});const I=seed.info;const K=F.Keys(id);
  let P=await L.phone('s1'+tag,opt);await P.page.goto(`${APP}/room.html?l=${id}`,{waitUntil:'domcontentloaded'});await sleep(3500);await P.shot('final_'+tag+'_identity_paste');
  await P.page.evaluate(()=>{const b=document.querySelector('[data-a=idclose]');if(b)b.click()});await sleep(300);await P.page.evaluate(()=>document.querySelector('[data-t=more]').click());await sleep(400);
  await P.page.$eval('#unlockui',e=>{e.scrollIntoView({block:'center'});e.click()});await sleep(500);await P.shot('final_'+tag+'_unlock_sheet');await P.close();
  const mt=await gj(K.meta);mt.over=mt.over||{};const owner=F.slotAt(mt.order,4,mt.settings.type,mt.settings.rounds).owner;
  P=await L.phone('s2'+tag,opt);const V=I.managers.find(m=>m.id===owner);await P.page.goto(`${APP}/room.html?l=${id}#as=${V.id}&k=${V.k}`,{waitUntil:'domcontentloaded'});await sleep(3500);
  mt.over[V.id]={left:true,away:true};mt.version=(mt.version||0)+1;await post(K.meta,mt);await sleep(7000);await P.shot('final_'+tag+'_removed_manager');await P.close();
  const id2=await seed(API,{managers:8});const I2=seed.info;const K2=F.Keys(id2);const m2=await gj(K2.meta);m2.status='lobby';delete m2.endedAt;m2.settings.startMode='auto';m2.settings.startAt=Date.now()+3600e3;m2.settings.tz='Asia/Jakarta';await post(K2.meta,m2);
  P=await L.phone('s3'+tag,opt);await P.page.goto(`${APP}/room.html?l=${id2}#cm=${I2.cmSecret}`,{waitUntil:'domcontentloaded'});await sleep(3000);await P.page.evaluate(()=>{const b=document.querySelector('[data-a=idclose]');if(b)b.click()});await sleep(400);await P.shot('final_'+tag+'_autostart_note');await P.close();
 }
}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close();console.log('security shots done')}})();
