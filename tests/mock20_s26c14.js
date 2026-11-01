/* s26c14: NMOCK (default 20) solo mocks, mock store only (fbn.store=/api/data/), textdb.dev aborted. Every odd mock turns 'Auto-pick for me' ON (the human manager is an auto manager besides the bots);
   every mock opens Teams and taps Power rank + STOOPID rank sorts mid-draft and checks both ranks render. 0 JS errors required. APP/API env, SHOTDIR. */
const L=require('./lib.js');const {sleep}=L;const SHOT=process.env.SHOTDIR;
let bad=0;const ok=(n,c,x)=>{if(c)console.log('  ok  '+n);else{bad++;console.log('FAIL  '+n+(x!==undefined?' -> '+JSON.stringify(x).slice(0,500):''))}};
const block=async P=>{await P.page.setBypassServiceWorker(true).catch(()=>{});await P.page.setRequestInterception(true);P.page.on('request',r=>{if(/textdb\.dev/.test(r.url()))r.abort();else r.continue()})};
(async()=>{let last=null;
const N=+(process.env.NMOCK||20),I0=+(process.env.MOCK0||1);for(let i=I0;i<I0+N;i++){const P=await L.phone('m'+i);await block(P);
  await P.go('mock.html');await P.page.waitForSelector('#startmock',{timeout:15000});
  await P.page.evaluate(()=>{const n=document.getElementById('m_name');if(n&&!n.value)n.value='Tester'});
  await P.page.click('#startmock');await P.page.waitForFunction(()=>/room\.html\?l=/.test(location.href),{timeout:20000}).catch(()=>{});
  const mid=new URL(P.page.url()).searchParams.get('l');
  await sleep(2500);const auto=i%2===1;let autoOn=false,autoPicks=0;
  let ranksSeen=false;
  const t0=Date.now();while(Date.now()-t0<600000){if(await P.page.evaluate(()=>!!document.querySelector('#finalbanner')).catch(()=>false))break;
    if(!ranksSeen&&Date.now()-t0>3000){ranksSeen=await P.page.evaluate(async()=>{const tb=document.getElementById('tab_teams');if(!tb)return false;tb.click();await new Promise(r=>setTimeout(r,500));
      const b=document.querySelector('#tsort [data-m="kenpom"]');if(b)b.click();await new Promise(r=>setTimeout(r,300));const r=document.querySelector('#tlist .trow');const ok=!!(r&&r.querySelector('.rks')&&r.querySelector('.rko'));
      const s=document.querySelector('#tsort [data-m="power"]');if(s)s.click();const bd=document.getElementById('tab_board');if(bd)bd.click();return ok}).catch(()=>false)}
    if(auto&&!autoOn){await P.page.evaluate(()=>{const c=document.getElementById('autotog');if(c&&!c.checked)c.click()}).catch(()=>{});await sleep(1500);await P.page.evaluate(()=>{const c=document.querySelector('[data-a=confirm],[data-a=autoyes]');if(c&&/auto/i.test(c.closest('#sheetwrap')?c.closest('#sheetwrap').innerText:''))c.click()}).catch(()=>{});
      autoOn=await P.page.evaluate(()=>{const c=document.getElementById('autotog');return !!(c&&c.checked)}).catch(()=>false);if(autoOn)continue}
    if(auto&&autoOn){await sleep(600);continue}
    if(await P.page.evaluate(()=>!!document.getElementById('pickbtn')).catch(()=>false)){await P.page.click('#pickbtn').catch(()=>{});await sleep(500);await P.page.evaluate(()=>{const r=document.querySelector('#pickov .trow.go .dbtn');if(r)r.click()}).catch(()=>{});await sleep(400);await P.page.evaluate(()=>{const c=document.querySelector('[data-a=confirm]');if(c)c.click()}).catch(()=>{})}
    await sleep(600)}
  const done=await P.page.evaluate(()=>!!document.querySelector('#finalbanner')).catch(()=>false);
  ok('mock '+i+(auto?' [auto manager '+(autoOn?'ON':'NOT SET')+']':'')+' ranks='+ranksSeen+' ('+mid+') completes in '+Math.round((Date.now()-t0)/1000)+'s, errors='+P.errs.length,done&&P.errs.length===0&&ranksSeen&&(!auto||autoOn),P.errs);
  if(!done){await P.page.screenshot({path:SHOT+'/s26c14_mock'+i+'_stuck.png'}).catch(()=>{});console.log('   stuck state:',(await P.page.evaluate(()=>document.body.innerText.slice(0,400)).catch(e=>String(e))).replace(/\n/g,' | '))}
  if(done)last={mid};await P.close().catch(()=>{});await L.close().catch(()=>{})}
console.log(bad?'FAILED '+bad:'ALL OK');process.exit(bad?1:0)})();
