/* s16 screenshots: lobby waiting, chat tab pinned input, my team, live board (time's up), end screen 1280, spin overlay. node tests/draft16_shots.js (mock store 9995/9996) */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API='http://localhost:9996/api/data/';
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{try{
 const open=async(id,I,who,opt,wait)=>{const P=await L.phone('s',opt||{});await P.page.setBypassServiceWorker(true);await P.page.goto(`http://localhost:9995/room.html?l=${id}#`+(who==='cm'?'cm='+I.cmSecret:'as='+I.managers[who].id+'&k='+I.managers[who].k),{waitUntil:'domcontentloaded'});await P.page.waitForSelector(wait||'#tabs',{timeout:20000});await sleep(2200);return P};
 /* lobby, 7 of 8 */
 {const id=await seed(API,{live:true,picksMade:0});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);m.status='lobby';delete m.startedAt;m.orderSet=false;m.order=[];await post(K.meta,m);await post(K.slot(8,0),'');
  const P=await open(id,I,'cm',{},'#lobbycard');await P.page.evaluate(()=>window.scrollTo(0,520));await sleep(300);await P.shot('d16_lobby7_390');await P.close()}
 /* live board + chat + my team (clock expired, auto-pick off) */
 {const id=await seed(API,{live:true,picksMade:0,clockSecs:60});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);m.settings.autoPick=false;m.startedAt=Date.now()-3600e3;m.resumeAt=m.startedAt;await post(K.meta,m);
  const P=await open(id,I,1,{});await sleep(1500);await P.shot('d16_board_390');
  await P.page.evaluate(()=>document.querySelector('[data-t=my]').click());await sleep(600);await P.shot('d16_myteam_390');
  await P.page.evaluate(()=>document.querySelector('[data-t=chat]').click());await sleep(700);await P.shot('d16_chat_empty_390');
  await P.page.click('#cin');await P.page.keyboard.type('Good luck everyone');await P.page.click('[data-a=send]');await sleep(1500);await P.shot('d16_chat_one_390');
  await P.page.evaluate(()=>document.querySelector('[data-t=teams]').click());await sleep(600);await P.shot('d16_teams_390');await P.close();
  const D=await open(id,I,1,{desktop:true,w:1280,h:900});await D.shot('d16_board_1280');await D.page.evaluate(()=>document.querySelector('[data-t=chat]').click());await sleep(700);await D.shot('d16_chat_1280');await D.close()}
 /* end screen 1280 + 390 with toast */
 {const id=await seed(API);const I=seed.info;const D=await open(id,I,0,{desktop:true,w:1280,h:900});await D.shot('d16_end_1280');await D.close();
  const P=await open(id,I,0,{});await P.page.evaluate(()=>window.scrollTo(0,300));await sleep(300);await P.shot('d16_end_390');await P.close()}
}catch(e){console.log(e.stack)}finally{await L.close()}})();
