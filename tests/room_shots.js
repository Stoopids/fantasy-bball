/* Draft-room screenshots with the TOP tab row: lobby, live, complete at 390 / 1280 (+320 overflow check). node tests/room_shots.js (mock store 9995/9996) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const F=require('../js/core.js');const {sleep}=L;
const API='http://localhost:9996/api/data/';
(async()=>{const out={};try{
 const lob=await seed(API,{live:true,picksMade:0});const K=F.Keys(lob);const m=JSON.parse(await (await fetch(API+encodeURIComponent(K.meta))).text());m.status='lobby';await fetch(API+encodeURIComponent(K.meta),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(m)});const lobInfo=seed.info;
 const live=await seed(API,{live:true,picksMade:11});const liveInfo=seed.info;
 const done=await seed(API);const doneInfo=seed.info;
 const sets=[['lobby',lob,lobInfo],['live',live,liveInfo],['done',done,doneInfo]];
 for(const [tag,opt] of [['390',{}],['1280',{desktop:true,w:1280,h:900}],['320',{w:320,h:640}]]){
  for(const [nm,id,info] of sets){const P=await L.phone('r',opt);await P.page.setBypassServiceWorker(true);
   await P.page.evaluateOnNewDocument((id,cm,me)=>{localStorage.setItem('fbn.cm.'+id,cm)},id,info.cmSecret);
   await P.go('room.html?l='+id+'#as='+info.managers[0].id+'&k='+info.managers[0].k);await sleep(2200);
   const o=await P.page.evaluate(()=>{const t=document.getElementById('tabs');const r=t.getBoundingClientRect();const b=[...t.querySelectorAll('button')].map(x=>x.getBoundingClientRect());return{top:r.top,h:r.height,w:r.width,sw:t.scrollWidth,cw:t.clientWidth,btn:b.map(x=>Math.round(x.width)),doc:document.documentElement.scrollWidth,vw:innerWidth,bottomNav:!!document.querySelector('nav.tabs')}});
   out[nm+tag]=o;await P.shot('room_top_'+nm+'_'+tag);
   if(nm==='done'||nm==='live'){await P.page.evaluate(()=>window.scrollTo(0,400));await sleep(300);const o2=await P.page.evaluate(()=>({top:document.getElementById('tabs').getBoundingClientRect().top,stick:(()=>{const s=document.getElementById('stickysite');if(!s||s.hidden)return null;const r=s.getBoundingClientRect();return{disp:getComputedStyle(s).display,bottom:innerHeight-r.bottom}})()}));out[nm+tag+'_scrolled']=o2;await P.shot('room_top_'+nm+'_'+tag+'_scrolled')}
   await P.close()}}
 console.log(JSON.stringify(out,null,1))}catch(e){console.log(e.stack)}finally{await L.close()}})();
