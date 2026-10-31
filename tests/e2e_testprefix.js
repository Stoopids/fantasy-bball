/* s20: the strip applies ONLY to the test league (signal: the LEAGUE NAME starts with the word "Test", see A.isTestLeague in js/league-d.js). A real league shows every name exactly as written,
   e.g. a manager called "Test Kitchen". Section 2 of this file checks that.
   "Test " prefix in manager / team names: stripped in DISPLAY only (Standings, Rosters, Games, Power rankings), the stored data is untouched,
   and a name that is only "Test" or "Test Test" is never turned into an empty name (it shows as written).
   node tests/e2e_testprefix.js  (APP / API env, mock store) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const API=process.env.API||'http://localhost:9996/api/data/';const get=async k=>{const r=await fetch(API+encodeURIComponent(k));return r.ok?await r.text():''};
const ready=P=>P.page.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:25000});
const tab=async(P,t)=>{await P.page.evaluate(t=>document.querySelector('#ltabs [data-v='+t+']').click(),t);await sleep(350)};
(async()=>{try{
  const names=[['Test Ana','Test Aces','🏀'],['Test Ben','Test Blazers','🔥'],['Test Cy','Comets','⭐'],['Dee','Test Dunkers','🦅'],['Test','Test','🐻'],['Test Test','Test Test','🚀'],['Test  ','Test  ','🐊'],['Test Hal','Hawks','🦅']];
  const shown=['Ana','Ben','Cy','Dee','Test','Test Test','Test','Hal'],team=['Aces','Blazers','Comets','Dunkers','Test','Test Test','Test','Hawks'];
  const id=await seed(null,{names,name:'Test'});const I=seed.info;const K=F.Keys(id);
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
    const P=await L.phone('tp'+w,desk?{desktop:true,w,h}:{});await P.go('league.html?l='+id+'&demo=1');await ready(P);await sleep(500);
    const st=await P.page.$$eval('#main .ocl .strow',c=>c.map(x=>({n:x.querySelector('.nm').innerText.replace(/^[^A-Za-z0-9\s]+\s*/,'').trim(),t:x.querySelector('small').innerText.trim()})));
    const exp=names.map((_,i)=>i);const have=st.map(x=>x.n);
    ok(w+'px Standings: "Test " prefix gone from owner and team names; every other name shown as written; none empty',shown.every(x=>have.includes(x))&&st.every(x=>x.n.length>0&&x.t.length>0)&&!st.some(x=>/^Test (Ana|Ben|Cy|Hal)/.test(x.n)||/^Test (Aces|Blazers|Dunkers)/.test(x.t)),st);
    ok(w+'px Standings: "Test", "Test Test" and "Test  " fall back to the original',have.filter(x=>x==='Test').length===2&&have.includes('Test Test')&&st.some(x=>x.t==='Test Test'),st);
    await tab(P,'rosters');const rs=await P.page.$$eval('#main .tabs[aria-label=Owner] button',b=>b.map(x=>x.innerText.replace(/^[^A-Za-z0-9\s]+\s*/,'').trim()));
    ok(w+'px Rosters: owner buttons use the stripped names',rs.length===8&&rs.includes('Ana')&&rs.includes('Hal')&&!rs.some(x=>/^Test (Ana|Ben|Cy|Hal)/.test(x)),rs);
    await P.page.evaluate(()=>{const b=[...document.querySelectorAll('#main .tabs[aria-label=Owner] button')].find(x=>/Ana/.test(x.innerText));b.click()});await sleep(300);const oh=await P.page.$eval('#ownercard',e=>e.innerText);ok(w+'px Rosters: owner card heading uses the stripped name',/Ana\b/.test(oh)&&!/Test Ana/.test(oh),oh.slice(0,60));
    await tab(P,'games');const gs=await P.page.evaluate(()=>({opts:[...document.querySelectorAll('#gOwnerSel option')].map(o=>o.textContent.trim().replace(/^[^A-Za-z0-9\s]+\s*/,'')),txt:document.getElementById('main').innerText}));
    ok(w+'px Games: owner filter and game cards use stripped names',gs.opts.includes('Ana')&&gs.opts.includes('Hal')&&!gs.opts.some(x=>/^Test (Ana|Ben|Cy|Hal)/.test(x))&&!/Test (Ana|Ben|Cy|Hal)\b/.test(gs.txt),gs.opts);
    await tab(P,'teams');ok(w+'px All teams: owner column uses stripped names',!/Test (Ana|Ben|Cy|Hal)\b/.test(await P.page.$eval('#main',e=>e.innerText)));
    if(require('./tabs_exp.js').has('postseason')){await tab(P,'postseason');ok(w+'px Postseason: stripped names',!/Test (Ana|Ben|Cy|Hal)\b/.test(await P.page.$eval('#main',e=>e.innerText)));}
    ok(w+'px no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close();
  }
  // data untouched: the store still holds the original names
  const claims=[];for(let i=1;i<=8;i++)claims.push(await get(K.slot(i,0)));const prof=[];for(const m of I.managers)prof.push(await get(K.mgr(m.id)));
  ok('stored claims and profiles still hold the original "Test ..." names (display-only stripping)',claims.join('|').includes('Test Ana')&&claims.join('|').includes('Test Test')&&prof.join('|').includes('Test Aces')&&prof.join('|').includes('Test Dunkers'),claims.map(c=>c.slice(0,80)));
  // (the Power rankings now live on the recap page: their Test-prefix display is checked in e2e_power_recap.js)
  /* ---- a REAL league keeps "Test ..." names exactly as written ---- */
  {const rn=[['Test Kitchen','Test Kitchen Crew','🏀'],['Test Ben','Blazers','🔥'],['Cy','Test Comets','⭐'],['Dee','Dunkers','🦅'],['Test','Test','🐻'],['Test Test','Test Test','🚀'],['Eli','Eagles','🐊'],['Hal','Hawks','🦅']];
   const rid=await seed(null,{names:rn,name:'Friday Hoops'});const RK=seed.info;const FD=require('../js/league-d.js');
   ok('A.isTestLeague: "Test", "Test league", "test-run" are test leagues; "Friday Hoops", "Testing Hoops", "Contest" and an empty name are real',['Test','Test league','test-run','TEST'].every(FD.isTestLeague)&&['Friday Hoops','Testing Hoops','Contest','',null].every(x=>!FD.isTestLeague(x)));
   ok('A.disp(name) without the test flag returns the name exactly as written; with the flag it strips',FD.disp('Test Kitchen')==='Test Kitchen'&&FD.disp('Test Kitchen',true)==='Kitchen'&&FD.disp('Test',true)==='Test');
   for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
    const P=await L.phone('tr'+w,desk?{desktop:true,w,h}:{});await P.go('league.html?l='+rid+'&demo=1');await ready(P);await sleep(500);
    const st=await P.page.$$eval('#main .ocl .strow',c=>c.map(x=>({n:x.querySelector('.nm').innerText.replace(/^[^A-Za-z0-9\s]+\s*/,'').trim(),t:x.querySelector('small').innerText.trim()})));
    ok(w+'px real league Standings: "Test Kitchen", "Test Ben", "Test Kitchen Crew" and "Test Comets" are shown exactly as written; "Test" and "Test Test" too',['Test Kitchen','Test Ben','Test','Test Test'].every(x=>st.some(r=>r.n===x))&&['Test Kitchen Crew','Test Comets','Test Test'].every(x=>st.some(r=>r.t===x)),st);
    await tab(P,'rosters');const rs=await P.page.$$eval('#main .tabs[aria-label=Owner] button',b=>b.map(x=>x.innerText.replace(/^[^A-Za-z0-9\s]+\s*/,'').trim()));ok(w+'px real league Rosters: owner buttons keep "Test Kitchen" and "Test Ben"',rs.includes('Test Kitchen')&&rs.includes('Test Ben'),rs);
    await tab(P,'games');const gs=await P.page.evaluate(()=>[...document.querySelectorAll('#gOwnerSel option')].map(o=>o.textContent.trim().replace(/^[^A-Za-z0-9\s]+\s*/,'')));ok(w+'px real league Games: owner filter keeps "Test Kitchen"',gs.includes('Test Kitchen')&&gs.includes('Test Ben'),gs);
    ok(w+'px real league: no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close()}}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
