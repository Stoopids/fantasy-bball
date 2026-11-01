/* 10 solo mocks + league.html checks for the last completed mock. APP/API env, SHOTDIR. textdb.dev blocked. */
const L=require('./lib.js');const {sleep}=L;const SHOT=process.env.SHOTDIR;
let bad=0;const ok=(n,c,x)=>{if(c)console.log('  ok  '+n);else{bad++;console.log('FAIL  '+n+(x!==undefined?' -> '+JSON.stringify(x).slice(0,500):''))}};
const block=async P=>{await P.page.setBypassServiceWorker(true).catch(()=>{});await P.page.setRequestInterception(true);P.page.on('request',r=>{if(/textdb\.dev/.test(r.url()))r.abort();else r.continue()})};
(async()=>{let last=null;
const N=+(process.env.NMOCK||10);for(let i=1;i<=N;i++){const P=await L.phone('m'+i);await block(P);
  await P.go('mock.html');await P.page.waitForSelector('#startmock',{timeout:15000});
  await P.page.evaluate(()=>{const n=document.getElementById('m_name');if(n&&!n.value)n.value='Tester'});
  await P.page.click('#startmock');await P.page.waitForFunction(()=>/room\.html\?l=/.test(location.href),{timeout:20000}).catch(()=>{});
  const mid=new URL(P.page.url()).searchParams.get('l');
  const t0=Date.now();while(Date.now()-t0<600000){if(await P.page.evaluate(()=>!!document.querySelector('#finalbanner')).catch(()=>false))break;
    if(await P.page.evaluate(()=>!!document.getElementById('pickbtn')).catch(()=>false)){await P.page.click('#pickbtn').catch(()=>{});await sleep(500);await P.page.evaluate(()=>{const r=document.querySelector('#pickov .trow.go .dbtn');if(r)r.click()}).catch(()=>{});await sleep(400);await P.page.evaluate(()=>{const c=document.querySelector('[data-a=confirm]');if(c)c.click()}).catch(()=>{})}
    await sleep(600)}
  const done=await P.page.evaluate(()=>!!document.querySelector('#finalbanner')).catch(()=>false);
  ok('mock '+i+' ('+mid+') completes in '+Math.round((Date.now()-t0)/1000)+'s, errors='+P.errs.length,done&&P.errs.length===0,P.errs);
  if(!done){await P.page.screenshot({path:SHOT+'/s26c11_mock'+i+'_stuck.png'}).catch(()=>{});console.log('   stuck state:',(await P.page.evaluate(()=>document.body.innerText.slice(0,400)).catch(e=>String(e))).replace(/\n/g,' | '))}
  if(done)last={mid};await P.close().catch(()=>{});await L.close().catch(()=>{})}
if(last){const mid=last.mid;
 for(const [w,h,d] of [[390,844,false],[1280,900,true]]){const P=await L.phone('lg'+w,d?{desktop:true,w,h}:{w,h});await block(P);
  for(const [tab,sel,nm] of [['#games','#tab_games, .gcard, .game, main','games'],['#standings/breakdown','#ptsv','breakdown'],['#teams','#allteams','allteams']]){
   await P.go('league.html?l='+mid+tab);await sleep(2500);
   const r=await P.page.evaluate(nm=>{const m=document.querySelector('main')||document.body;const out={hash:location.hash,len:m.innerText.length,txt:m.innerText.slice(0,200)};
     if(nm==='breakdown')out.el=!!document.querySelector('#ptsv');
     if(nm==='allteams'){const t=document.getElementById('allteams');out.el=!!t;if(t){const hs=[...t.querySelectorAll('.obh>span')].map(x=>x.textContent.trim());out.hdr=hs;const rows=[...t.querySelectorAll('.obr')];out.rows=rows.length;
        const ci=hs.indexOf('Conf');out.conf=rows.slice(0,64).map(r=>{const c=r.children;return ci>=0&&c[ci]?c[ci].textContent.trim():null});}}
     return out},nm);
   await P.page.evaluate(nm=>{const e=document.querySelector(nm==='allteams'?'#allteams':nm==='breakdown'?'#ptsv':'#lapp .gcard, #lapp .card:last-of-type');if(e)e.scrollIntoView({block:'start'})},nm).catch(()=>{});await sleep(400);await P.page.screenshot({path:SHOT+'/s26c11_'+w+'_'+nm+'.png',fullPage:false});
   if(nm==='games')ok(w+' games tab renders',r.len>20,r);
   else if(nm==='breakdown')ok(w+' breakdown renders (#ptsv)',r.el,r);
   else{ok(w+' all teams renders ('+r.rows+' rows; header '+JSON.stringify(r.hdr)+')',r.el&&r.rows>0,r);
     const vals=(r.conf||[]).filter(x=>x!==null);const filled=vals.filter(x=>x&&x!=='–'&&x!=='-').length;
     ok(w+' Conf column: '+filled+'/'+vals.length+' with values, rest "–"; sample '+JSON.stringify([...new Set(vals)].slice(0,8)),vals.length>0&&vals.every(x=>x.length>0&&!/undefined|null|NaN/.test(x)),r.conf)}}
  ok(w+' league.html: no JS errors',P.errs.length===0,P.errs);await P.close()}}
console.log(bad?'FAILURES '+bad:'ALL OK');await L.close();process.exit(bad?1:0)})().catch(async e=>{console.log('CRASH',e);await L.close();process.exit(2)});
