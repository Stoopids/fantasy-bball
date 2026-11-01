/* s26c16c shots: board after the final pick (made in the UI) marked the draft complete, reopened via room.html#tab=board. SHOTS=<dir> */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,API}=L;const SH=process.env.SHOTS;
const get=async k=>{const r=await fetch(API+encodeURIComponent(k));return r.ok?r.text():''};
(async()=>{let bad=0;try{for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
  const id=await seed(null,{rounds:8,live:true,picksMade:63});const last=seed.info.managers[0];
  const Q=await L.phone('s'+w,desk?{desktop:true,w,h}:{});await Q.page.setBypassServiceWorker(true);
  await Q.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,last);
  await Q.go('room.html?l='+id+'&stay=1#tab=board');const W=async(f,ms)=>{for(let t=0;t<ms;t+=250){if(await Q.page.evaluate(f).catch(()=>false))return true;await sleep(250)}return false};
  await W(()=>!!document.getElementById('pickbtn'),20000);await Q.page.evaluate(()=>document.getElementById('pickbtn').click());
  await W(()=>!!document.querySelector('#pickov .trow.go .dbtn'),8000);await Q.page.evaluate(()=>document.querySelector('#pickov .trow.go .dbtn').click());
  await W(()=>!!document.getElementById('confirmpick'),5000);await Q.page.evaluate(()=>document.getElementById('confirmpick').click());
  let m;for(let i=0;i<60;i++){await sleep(500);m=F.normalizeMeta(F.parseJ(await get(F.Keys(id).meta)));if(m.status==='complete')break}
  console.log(w,'meta',m.status,'endedAt set',+m.endedAt>0,'endedEarly',m.endedEarly);if(m.status!=='complete')bad++;await Q.close();
  const P=await L.phone('v'+w,desk?{desktop:true,w,h}:{});await P.page.setBypassServiceWorker(true);
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,seed.info.managers[3]);
  await P.go('room.html?l='+id+'#tab=board');await sleep(8000);const u=P.page.url();console.log(w,'url',u.replace(/[?#].*/,''),'final',await P.page.evaluate(()=>!!document.getElementById('finalbanner')));if(!/room\.html/.test(u))bad++;
  await P.page.screenshot({path:SH+'/board-done-'+w+'.png'});await P.page.screenshot({path:SH+'/board-done-'+w+'-full.png',fullPage:true});console.log('errs',P.errs.length);await P.close()}
}catch(e){bad++;console.log(e)}finally{await L.close();console.log(bad?'FAILED':'OK');process.exit(bad?1:0)}})();
