/* s28 item 5 shot: No clock, away seat's auto-pick undone by the commissioner -> 'Auto-pick frozen' note. Mock store only. APP/API/OUT env. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const OUT=process.env.OUT||'/tmp';
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{for(const w of [390,1280]){const id=await seed(API,{managers:8,rounds:4,live:true,clockSecs:null,picksMade:0});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);
 const tgt=I.managers.find(x=>x.id===m.order[0]);const cm=I.managers.find(x=>x.id!==tgt.id);m.over[tgt.id]={away:true};m.resumeAt=Date.now();await post(K.meta,m);
 const P=await L.phone('f'+w,w>700?{desktop:true,w,h:900}:{w,h:844});await P.page.setBypassServiceWorker(true);await P.go('room.html?l='+id+'&stay=1#cm='+I.cmSecret+'&as='+cm.id+'&k='+cm.k);
 let e=null;for(let t=0;t<40&&!e;t++){await sleep(500);e=await gj(K.pick(m.epoch,1))}
 await P.page.evaluate(()=>{location.hash='#tab=more'});await sleep(1200);await P.page.evaluate(()=>document.getElementById('undobtn').click());await sleep(500);await P.page.evaluate(()=>document.getElementById('cfyes').click());
 await sleep(4000);await P.page.evaluate(()=>{location.hash='#tab=board'});await sleep(2000);
 const t=await P.page.evaluate(()=>{const b=document.getElementById('autofrz');if(b)b.scrollIntoView({block:'center'});return b?b.innerText:''});console.log(w,t);
 await P.page.screenshot({path:OUT+'/s28_noclock_undo_frozen_'+w+'.png'});await P.close()}await L.close();process.exit(0)})();
