/* s25-full (Paul via NCAA, final): no ESPN links on the Teams tab you draft from (rows, search results) or in the Pick a team pop-up, real and
   mock, 390 + 1280. ESPN links stay everywhere else; one check that the Board grid still has them. Mock store only. */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const espnIn=(P,sel)=>P.page.evaluate(sel=>{const r=document.querySelector(sel);if(!r)return{missing:true};return{a:r.querySelectorAll('a[href*="espn.com"]').length,t:[...r.querySelectorAll('[title]')].filter(e=>/on ESPN/i.test(e.title)).length,rows:r.querySelectorAll('[data-k]').length}},sel);
async function check(P,tag){
 await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await waitFor(()=>P.page.$('#tlist [data-k]'),10000);
 let r=await espnIn(P,'#tlist');ok(tag+' Teams tab rows: no ESPN links, no "on ESPN" titles',!r.missing&&r.rows>0&&r.a===0&&r.t===0,r);
 await P.page.type('#tq','state');await sleep(900);r=await espnIn(P,'#tlist');ok(tag+' Teams search results: no ESPN links',!r.missing&&r.rows>0&&r.a===0&&r.t===0,r);
 await P.page.evaluate(()=>{const q=document.getElementById('tq');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(500);
 r=await espnIn(P,'#qpanel');ok(tag+' queue panel: no ESPN links',r.missing||(r.a===0&&r.t===0),r);
 const hasPick=await P.page.$('#pickbtn');if(hasPick){await P.page.$eval('#pickbtn',e=>e.click());await waitFor(()=>P.page.$('#pickov [data-k]'),6000);r=await espnIn(P,'#pickov');ok(tag+' Pick a team pop-up: no ESPN links',!r.missing&&r.a===0&&r.t===0,r);
  await P.page.type('#pickov input','state').catch(()=>{});await sleep(800);r=await espnIn(P,'#pickov');ok(tag+' pop-up search results: no ESPN links',!r.missing&&r.a===0&&r.t===0,r);await P.page.evaluate(()=>{const b=document.querySelector('[data-a=pclose]');if(b)b.click()});await sleep(300)}
 await P.page.evaluate(()=>document.querySelector('#tab_board').click());const nb=await waitFor(()=>P.page.evaluate(()=>document.querySelectorAll('.board a[href*="espn.com"]').length),20000)||0;ok(tag+' Board grid still has ESPN links',nb>0,nb)}
(async()=>{try{
 for(const [w,h,d] of [[390,844,false],[1280,800,true]]){
  const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:3});const I=seed.info;const F=require('../js/core.js');const K=F.Keys(id);const meta=F.parseJ(await (await fetch(API+encodeURIComponent(K.meta))).text());
  const sl=F.slotAt(meta.order,4,meta.settings.type,meta.settings.rounds);const ow=I.managers.find(m=>m.id===sl.owner);
  const P=await L.phone('ne'+w,{w,h,desktop:d});await P.go('room.html?l='+id+'#as='+ow.id+'&k='+ow.k);await waitFor(()=>P.page.$('#pickbtn'),25000);await sleep(1000);await check(P,'real '+w+'px:');ok('real '+w+'px: no page errors',P.errs.length===0,P.errs);await P.close();
  const M=await L.phone('nem'+w,{w,h,desktop:d});await M.go('mock.html');await M.page.waitForSelector('#startmock',{timeout:15000});await M.page.click('#startmock');await waitFor(()=>/room\.html/.test(M.page.url()),20000);await waitFor(()=>M.page.$('#tab_teams'),25000);await sleep(1500);
  await check(M,'mock '+w+'px:');ok('mock '+w+'px: no page errors',M.errs.length===0,M.errs);await M.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
