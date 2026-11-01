/* s26c16c BUG 2: (A) a draft finished naturally whose meta is still status 'live', endedAt null: room.html?l=CODE#tab=board must stay on the board (no bounce to recap.html).
   (B) the final pick (#rounds*8) marks the meta complete: status 'complete', endedAt set, endedEarly false. Mock store only. APP/API env. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP,API}=L;
let n=0,bad=0;const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const get=async k=>{const r=await fetch(API+encodeURIComponent(k));return r.ok?r.text():''};
(async()=>{try{
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
    // A: natural finish left as live / endedAt null (store state from the field)
    const id=await seed(null,{rounds:8,live:true,picksMade:64});const me=seed.info.managers[2];
    const m0=F.normalizeMeta(F.parseJ(await get(F.Keys(id).meta)));ok(w+': seeded meta is live with endedAt null',m0.status==='live'&&m0.endedAt==null,{s:m0.status,e:m0.endedAt});
    const P=await L.phone('a'+w,desk?{desktop:true,w,h}:{});await P.page.setBypassServiceWorker(true);
    await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,me);
    await P.go('room.html?l='+id+'#tab=board');await sleep(9000);
    const u=P.page.url();ok(w+': Back to Draft (room.html#tab=board) stays in the draft room after 9 s',/\/room\.html/.test(u),u.replace(/[?#].*/,''));
    const fb=await P.page.evaluate(()=>!!document.getElementById('finalbanner')&&!!document.getElementById('board')).catch(()=>false);
    ok(w+': finished board (final banner) is shown',fb||await P.page.evaluate(()=>!!document.getElementById('finalbanner')).catch(()=>false));
    ok(w+': no page errors',!P.errs.length,P.errs);await P.close();
    // B: the final pick marks the draft complete
    const id2=await seed(null,{rounds:8,live:true,picksMade:63});const inf=seed.info;const last=inf.managers[0];// snake: pick 64 = round 8 reversed row ends with manager 1
    const Q=await L.phone('b'+w,desk?{desktop:true,w,h}:{});await Q.page.setBypassServiceWorker(true);
    await Q.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id2,last);
    await Q.go('room.html?l='+id2+'&stay=1#tab=board');await sleep(6000);
    const W=async(f,ms)=>{for(let t=0;t<ms;t+=250){if(await Q.page.evaluate(f).catch(()=>false))return true;await sleep(250)}return false};
    await W(()=>!!document.getElementById('pickbtn'),20000);await Q.page.evaluate(()=>document.getElementById('pickbtn').click());
    await W(()=>!!document.querySelector('#pickov .trow.go .dbtn'),8000);await Q.page.evaluate(()=>document.querySelector('#pickov .trow.go .dbtn').click());
    const okp=await W(()=>!!document.getElementById('confirmpick'),5000);if(okp)await Q.page.evaluate(()=>document.getElementById('confirmpick').click());
    ok(w+': final pick #64 made in the UI (Pick a team, confirm)',okp);
    let m1;for(let i=0;i<40;i++){await sleep(500);m1=F.normalizeMeta(F.parseJ(await get(F.Keys(id2).meta)));if(m1.status==='complete')break}
    ok(w+': after pick #64 meta.status is complete',m1.status==='complete',m1.status);ok(w+': endedAt set',+m1.endedAt>0,m1.endedAt);ok(w+': endedEarly false',m1.endedEarly===false);
    ok(w+': no page errors (B)',!Q.errs.length,Q.errs);if(process.env.DBG)console.log(JSON.stringify(await Q.page.evaluate(()=>window.__toasts)));await Q.close();
  }
}catch(e){bad++;console.log('FAIL exception',e&&e.stack)}finally{await L.close();console.log(bad?`${bad} of ${n} FAILED`:`ALL ${n} PASSED`);process.exit(bad?1:0)}})();
