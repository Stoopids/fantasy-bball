/* s27: League site tabs after the draft, 390/1280 (Recap first view + Standings). APP/API env, SHOTDIR. */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;
(async()=>{let bad=0;try{const id=await seed();const info=seed.info;
 for(const [w,opt] of [[390,{w:390,h:844}],[1280,{desktop:true,w:1280,h:900}]]){const P=await L.phone('lt'+w,opt);
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  for(const tab of ['recap','standings']){await P.go('league.html?l='+id+'#'+tab);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000}).catch(()=>{});await sleep(2000);
   const tabs=await P.page.evaluate(()=>[...document.querySelectorAll('#ltabs [data-v]')].map(b=>b.dataset.v));console.log(w,tab,JSON.stringify(tabs),'hash',await P.page.evaluate(()=>location.hash));
   if(tabs.includes('draft')){bad++;console.log('FAIL draft tab present')}
   await P.page.screenshot({path:process.env.SHOTDIR+'/league-'+tab+'-'+w+'.png'})}
  await P.go('league.html?l='+id+'#draft');await sleep(2500);const h=await P.page.evaluate(()=>{const a=document.querySelector('#ltabs [data-v][aria-selected=true],#ltabs [data-v].on,#ltabs [data-v].active');return a?a.dataset.v:location.hash});console.log(w,'#draft -> tab',h);if(h!=='recap'&&h!=='#recap'){bad++;console.log('FAIL #draft not -> #recap')}
  if(P.errs.length){bad++;console.log('FAIL errors',P.errs)}await P.close()}}catch(e){bad++;console.log('exception '+e.stack)}console.log(bad?'FAILED':'ALL OK');process.exit(bad?1:0)})();
