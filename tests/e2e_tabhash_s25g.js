/* s25-full: room.js reads the hash (tab=) AFTER F.consumeUrlSecret strips the secrets. Regression for "FR is not defined" (seen on a January 10 clock run).
   node tests/e2e_tabhash_s25g.js  (APP/API env, mock store) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API||'http://localhost:9986/api/data/';const APP=process.env.APP||'http://localhost:9985';
let n=0,bad=0;function ok(m,c,x){n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}}
(async()=>{try{const fs=require('fs'),path=require('path');const src=fs.readFileSync(path.join(__dirname,'../js/room.js'),'utf8');
 ok('static: every FR. use in room.js has a const FR declaration',!/\bFR\./.test(src)||/const FR=/.test(src));
 const id=await seed(API,{live:true,picksMade:11});const cm=seed.info.cmSecret;
 for(const [now,lbl] of [[null,'today'],['2027-01-10T12:00:00Z','January 10 clock']]){for(const [w,desk] of [[390,false],[1280,true]]){
  const P=await L.phone('h',desk?{desktop:true,w,h:900}:{w,h:844});await P.page.setBypassServiceWorker(true);
  if(now)await P.page.evaluateOnNewDocument(t=>localStorage.setItem('fbn.now',t),now);
  await P.page.goto(APP+'/room.html?l='+id+'#tab=chat&cm='+encodeURIComponent(cm));await sleep(3500);
  const r=await P.page.evaluate(()=>({sel:(document.querySelector('#tabs [aria-selected=true]')||{}).id,href:location.href}));
  ok(lbl+' '+w+'px: no page errors (no "FR is not defined")',P.errs.length===0,P.errs);
  ok(lbl+' '+w+'px: #tab=chat honoured after the secret is stripped',r.sel==='tab_chat',r);
  ok(lbl+' '+w+'px: the secret left the address bar, tab= kept',!/cm=/.test(r.href)&&/#tab=chat/.test(r.href),r.href);await P.close()}}
}catch(e){bad++;console.log('exception: '+e.message)}console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED':''));process.exit(bad?1:0)})();
