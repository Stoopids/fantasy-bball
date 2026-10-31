/* s20 screenshots into /workspace/league-site-work/compare-s20/: every tab at 390 and 1280 (after-*), Bets in empty / pending / waiting-for-answer / open / settled+leaderboard states,
   the power module on the recap page, the chip grid.  node tests/shots_s20.js (APP / API env) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const F=require('../js/core.js');
const OUT=process.env.OUT||'/workspace/league-site-work/compare-s20';fs.mkdirSync(OUT,{recursive:true});
const TABS=['standings','games','rosters','bets','teams','postseason','redraft','archive','rules'];
async function open(id,info,i,o){o=o||{};const P=await L.phone('s'+Math.random().toString(36).slice(2,6),o.desk?{desktop:true,w:1280,h:900}:{});
  if(i!=null)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[i].id,k:info.managers[i].k});
  await P.go('league.html?l='+id+(o.demo?'&demo=1':'')+(o.hash||''));await P.page.waitForSelector('#lapp[data-ready], #trouble',{timeout:25000});await sleep(900);return P}
const tap=async(P,sel)=>{await P.page.waitForSelector(sel,{timeout:8000});await P.page.evaluate(s=>{const e=document.querySelector(s);e.scrollIntoView({block:'center'});e.click()},sel);await sleep(200)};
const full=(P,f)=>P.page.screenshot({path:OUT+'/'+f+'.png',fullPage:true});
(async()=>{try{
  const id=await seed();const info=seed.info;
  for(const [w,desk] of [[390,false],[1280,true]]){
    const P=await open(id,info,null,{desk,demo:true});
    for(const t of TABS){await P.page.evaluate(t=>document.querySelector('#ltabs [data-v='+t+']').click(),t);await sleep(500);await P.page.evaluate(()=>window.scrollTo(0,0));await full(P,'after-'+w+'-'+t)}
    await P.page.close()}
  /* Bets states, both widths */
  for(const [w,desk] of [[390,false],[1280,true]]){
    const A=await open(id,info,0,{desk,hash:'#bets'});await sleep(500);await full(A,'after-'+w+'-bets-1-empty');
    await A.page.close()}
  const A=await open(id,info,0,{hash:'#bets'});
  await tap(A,'[data-lb=opp]:nth-of-type(1)');await A.page.type('#b27Text','Kansas beats Duke');await tap(A,'[data-lb=amt][data-v="25"]');await full(A,'after-390-bets-2-form-filled');
  await tap(A,'#b27Place');await full(A,'after-390-bets-3-confirm');await tap(A,'[data-lb=confirm]');await sleep(1500);await full(A,'after-390-bets-4-pending-proposer-view');
  const B=await open(id,info,1,{hash:'#bets'});await full(B,'after-390-bets-5-waiting-for-answer-other-side');
  const Bd=await open(id,info,1,{desk:true,hash:'#bets'});await full(Bd,'after-1280-bets-5-waiting-for-answer-other-side');await Bd.page.close();
  await tap(B,'[data-lb=accept]');await sleep(1500);await full(B,'after-390-bets-6-open');
  await A.page.evaluate(()=>LBETS.poll(true));await sleep(900);await tap(A,'[data-lb=settle][data-r=b]');await tap(A,'[data-lb=settle][data-r=b]');await sleep(1500);await full(A,'after-390-bets-7-result-reported');
  await B.page.evaluate(()=>LBETS.poll(true));await sleep(900);await tap(B,'[data-lb=settle][data-r=b]');await tap(B,'[data-lb=settle][data-r=b]');await sleep(1800);await full(B,'after-390-bets-8-settled-and-leaderboard');
  const Bd2=await open(id,info,1,{desk:true,hash:'#bets'});await sleep(800);await full(Bd2,'after-1280-bets-8-settled-and-leaderboard');await Bd2.page.close();
  await A.page.close();await B.page.close();
  console.log('shots in',OUT,fs.readdirSync(OUT).filter(f=>/^after-/.test(f)).length);
}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close();process.exit()}})();
