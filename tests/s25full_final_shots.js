/* s25-full final shots: Teams, Board (live draft), lobby, recap at 390 and 1280. OUT=<dir> node tests/s25full_final_shots.js */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const OUT=process.env.OUT;
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
(async()=>{require('fs').mkdirSync(OUT,{recursive:true});const out=[];let errs=0;
for(const [w,h] of [[390,844],[1280,800]]){const opt=w>700?{desktop:true,w,h}:{w,h};
 const id=await seed(API,{managers:8,rounds:8,live:true,clockSecs:null,picksMade:10});const I=seed.info;const me=I.managers[0];
 const P=await L.phone('fs'+w,opt);await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.$('#tabs'),25000);await sleep(2000);
 for(const t of ['teams','board']){await P.page.evaluate(t=>{const b=document.querySelector('#tab_'+t);if(b)b.click()},t);await sleep(1500);const f=`${OUT}/${t}_${w}.png`;await P.page.screenshot({path:f,fullPage:w>700});out.push(f)}
 errs+=P.errs.length;await P.close();
 const lid=await seed(API,{managers:8,rounds:8,live:true,clockSecs:null,picksMade:0});const LI=seed.info;const K=F.Keys(lid);const m=F.parseJ(await raw(K.meta));m.status='lobby';delete m.startedAt;await post(K.meta,m);
 const Q=await L.phone('fl'+w,opt);await Q.go('room.html?l='+lid+'#as='+LI.managers[0].id+'&k='+LI.managers[0].k);await sleep(4000);let f=`${OUT}/lobby_${w}.png`;await Q.page.screenshot({path:f,fullPage:w>700});out.push(f);errs+=Q.errs.length;await Q.close();
 const rid=await seed(API,{managers:8,rounds:6});const R=await L.phone('fr'+w,opt);await R.go('recap.html?l='+rid);await sleep(4000);f=`${OUT}/recap_${w}.png`;await R.page.screenshot({path:f,fullPage:w>700});out.push(f);errs+=R.errs.length;await R.close()}
console.log(JSON.stringify({out,errs}));await L.close();process.exit(0)})().catch(e=>{console.log('exception '+e.stack);process.exit(1)});
