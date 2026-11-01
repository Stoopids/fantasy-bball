/* s26c8b shots: My Team Auto-draft toggle (390/1280), Rules 'Can't make the draft?' (390/1280). Mock store only. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{const id=await seed(API,{managers:8,rounds:8,live:true,clockSecs:60,picksMade:0});const I=seed.info;const K=F.Keys(id);const M0=await gj(K.meta);
 const lob=Object.assign({},M0,{status:'lobby',startedAt:null,resumeAt:null});lob.settings=Object.assign({},M0.settings,{startMode:'auto',startAt:Date.now()+3600e3});await post(K.meta,lob);
 await post(K.pref(I.managers[0].id),{queue:[],auto:true,v:1});await post(K.pref(I.managers[3].id),{queue:[],auto:true,v:1});
 for(const [w,h,d] of [[390,844,false],[1280,900,true]]){const P=await L.phone('s'+w,{w,h,desktop:d});await P.go('room.html?l='+id+'#as='+I.managers[0].id+'&k='+I.managers[0].k);await sleep(5000);
  await P.page.evaluate(()=>document.querySelector('#tab_my').click());await sleep(1200);await P.page.evaluate(()=>{const e=document.getElementById('autodcard');if(e)e.scrollIntoView({block:'center'})});await sleep(400);await P.shot('s26c8b_myteam_toggle_'+w);
  await P.page.evaluate(()=>document.querySelector('#tab_board').click());await sleep(1200);await P.shot('s26c8b_lobby_auto_'+w+'b');
  await P.page.evaluate(()=>{const b=document.querySelector('#rulesbtn_lobby');b&&b.click()});await sleep(1200);await P.page.evaluate(()=>{const e=document.getElementById('r2_8');if(e)e.scrollIntoView({block:'center'})});await sleep(400);await P.shot('s26c8b_rules_cantmake_'+w);
  const txt=await P.page.evaluate(()=>(document.getElementById('r2_8')||{innerText:''}).innerText);console.log(w,JSON.stringify(txt));console.log('errs',P.errs);await P.close()}
 await L.close();process.exit(0)})();
