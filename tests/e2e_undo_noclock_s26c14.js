/* s26c14 (QA interim mo4 BUG-2): NO pick clock + an AWAY manager's auto-pick is undone by the commissioner -> the slot waits the fixed 10 s (F.AUTO.undoHoldMs) and is re-picked; never frozen.
   Twice (double undo) at 390 and 1280. Mock store only. APP/API env. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{try{for(const w of [390,1280]){
 const id=await seed(API,{managers:8,rounds:4,live:true,clockSecs:null,picksMade:0});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);
 const away=I.managers.find(x=>x.id===m.order[0]),cm=I.managers.find(x=>x.id===m.order[1]);m.over=m.over||{};m.over[away.id]={away:true};await post(K.meta,m);
 const P=await L.phone('cm'+w,w>700?{desktop:true,w,h:900}:{w,h:844});await P.go('room.html?l='+id+'#cm='+I.cmSecret+'&as='+cm.id+'&k='+cm.k);
 const live1=async()=>{const mm=await gj(K.meta);const vo=new Set(mm.voided||[]);const e=await gj(K.pick(mm.epoch,1));return e&&e.tid&&!vo.has(e.id)?e:null};
 const waitP=async ms=>{const t=Date.now();while(Date.now()-t<ms){const e=await live1();if(e)return e;await sleep(500)}return null};
 let e=await waitP(20000);ok(w+': away manager auto-pick #1 lands (no clock)',!!e);
 /* s28 item 5: with No clock, after Undo the slot is frozen (no auto re-pick) until someone picks by hand */
 {await P.page.evaluate(()=>{location.hash='#tab=more'});await sleep(800);await P.page.evaluate(()=>document.getElementById('undobtn').click());await sleep(500);await P.page.evaluate(()=>document.getElementById('cfyes').click());
  await sleep(2500);ok(w+': undo removed pick #1',!(await live1()));
  e=await waitP(25000);ok(w+': after undo pick #1 stays frozen (no auto re-pick for 25 s, s28 item 5)',!e,e&&e.id)}
 ok(w+': 0 JS errors',!P.errs.length,P.errs);await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
