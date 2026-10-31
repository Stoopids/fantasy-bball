/* s26mo: mock setup options (seat, order, clock, bot style). needs mock_textdb; APP/API env */
const L=require('./lib.js');const F=require('../js/core.js');const {sleep,APP}=L;const API=process.env.API;const AORIG=API.replace(/\/api\/data\/$/,'');
const SHOT=process.env.SHOTDIR;const raw=async k=>await (await fetch(AORIG+'/__dump/'+encodeURIComponent(k))).text();
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+'  -> '+JSON.stringify(x))}};
async function run(w,q,set,o){const P=await L.phone('p'+Math.random(),w===1280?{desktop:true,w,h:900}:{w,h:844});await P.page.setBypassServiceWorker(true).catch(()=>{});
  await P.go('index.html');await P.page.evaluate(()=>localStorage.setItem('fbn.leagues',JSON.stringify([{id:'ABCDEFGHJKMNPQRS',name:'Some real league',role:'manager',ts:1}])));await P.go('mock.html'+q);await P.page.waitForSelector('#m_seat');
  for(const [id,v] of Object.entries(set||{}))await P.page.select('#'+id,String(v));
  const taps=await P.page.evaluate(()=>[...document.querySelectorAll('.msel')].map(e=>Math.round(e.getBoundingClientRect().height)));
  if(o.shot)await P.page.screenshot({path:SHOT+'/s26mo_390_mock_setup.png',fullPage:true});
  await P.page.click('#startmock');await P.page.waitForFunction(()=>/room\.html\?l=/.test(location.href),{timeout:20000});
  const id=await P.page.evaluate(()=>new URLSearchParams(location.search).get('l'));const me=await P.page.evaluate(id=>JSON.parse(localStorage.getItem('fbn.me.'+id)).mid,id);
  await P.page.waitForSelector('#autotog',{timeout:30000}).catch(()=>{});
  if(o.shot){await P.page.waitForSelector('#oncard.me',{timeout:60000}).catch(()=>{});await sleep(800);await P.page.screenshot({path:SHOT+'/s26mo2_390_mock_seat5_your_turn.png'})}
  const meta0=JSON.parse(await raw(F.Keys(id).meta));
  if(o.full){await P.page.evaluate(()=>{const t=document.getElementById('autotog');if(t&&!t.checked)t.click()});
    await P.page.waitForSelector('#finalbanner',{timeout:400000}).catch(()=>{})}
  let back='',rback='',resume=null;if(o.full){await sleep(1500);back=await P.page.evaluate(()=>{const a=document.getElementById('mockback');return a?a.innerText.trim():''});
    if(o.resume){const ev=()=>P.page.evaluate(()=>{const pool=[];for(let i=1;i<=60;i++)pool.push('t'+i);return [1,2,3].map(n=>FBN.autoChoice({picks:[]},'botX',pool,FBN.mulberry(n*7919),t=>+t.slice(1)).tid)});
      const a1=await ev();await P.page.reload({waitUntil:'domcontentloaded'});await sleep(2500);resume={a1,a2:await ev()}}
    await P.go('recap.html?l='+id);await P.page.waitForSelector('#mockback',{timeout:20000}).catch(()=>{});rback=await P.page.evaluate(()=>{const a=document.getElementById('mockback');return a?a.innerText.trim():''})}
  const meta=JSON.parse(await raw(F.Keys(id).meta));const picks=[];const tot=meta.order.length*meta.settings.rounds;
  for(let i=1;i<=tot;i++){const e=F.parseJ(await raw(F.Keys(id).pick(meta.epoch,i)));if(e)picks.push(e)}
  await P.ctx.close().catch(()=>{});return{meta0,meta,me,picks,taps,tot,seat:meta.order.indexOf(me)+1,back,rback,resume,botTids:picks.filter(e=>e.owner!==me).map(e=>e.tid).join()}}
(async()=>{try{
 const mine=(m,me)=>{const r=[];const O=m.order,N=O.length;for(let i=0;i<N*m.settings.rounds;i++){const rd=Math.floor(i/N),k=i%N;const o=m.settings.type==='snake'&&rd%2?O[N-1-k]:O[k];if(o===me)r.push(i+1)}return r};
 const randTids=[];
 for(const w of [390,1280]){const p=w+'px: ';
  let r=await run(w,'',{m_seat:5,m_order:'snake',m_clock:90,m_bots:'best'},{full:true,shot:w===390});
  ok(p+'selects >=44px',r.taps.every(h=>h>=44),r.taps);
  ok(p+'seat 5 honoured',r.seat===5,r.seat);ok(p+'solo fixed seat: no wheel spin record (order fixed at create, never re-spun)',!r.meta.spin&&!(r.meta.spinGen>0),[r.meta.spin,r.meta.spinGen]);ok(p+'clock 90 applied',r.meta.settings.clockSecs===90);ok(p+'snake',r.meta.settings.type==='snake');
  const got=r.picks.filter(e=>e.owner===r.me).map(e=>e.n).sort((a,b)=>a-b);
  ok(p+'snake seat 5 picks 5,12,21,28,...',got.slice(0,4).join()==='5,12,21,28'&&got.join()===mine(r.meta,r.me).join(),got);
  ok(p+'no parent league: end screen says Back to home, not Back to my league (room + recap)',r.back==='Back to home'&&r.rback==='Back to home',[r.back,r.rback]);
  ok(p+'best-style bots ran to end',r.meta.status==='complete'||r.picks.length===r.tot,[r.meta.status,r.picks.length,r.tot]);
  r=await run(w,'?seat=5&order=straight&clock=30&bots=random',{},{full:true,resume:true});randTids.push(r.botTids);
  ok(p+'random style: same mock gives the same choice after a reload (resume)',r.resume&&r.resume.a1.join()===r.resume.a2.join(),r.resume);
  const g2=r.picks.filter(e=>e.owner===r.me).map(e=>e.n).sort((a,b)=>a-b);
  ok(p+'query preset: seat 5, straight, clock 30',r.seat===5&&r.meta.settings.type==='linear'&&r.meta.settings.clockSecs===30,[r.seat,r.meta.settings]);
  ok(p+'straight picks 5,13,21,29,...',g2.slice(0,4).join()==='5,13,21,29',g2);
  ok(p+'random-style bots ran to end',r.meta.status==='complete'||r.picks.length===r.tot,[r.meta.status,r.picks.length]);
  if(w===1280){ok('random style: two different mocks make different bot picks',randTids[0]!==randTids[1],randTids.map(x=>x.slice(0,60)))}
  if(w===390){const seats=[];for(let i=0;i<5;i++){const a=await run(w,'',{},{});seats.push(a.seat);ok('Any: default is Any and seat in 1-8',a.meta0.mockOpts.seat===0&&a.seat>=1&&a.seat<=8,a.seat)}
   ok('Any gives varying seats '+seats,new Set(seats).size>1,seats)}
 }
 /* With others: the wheel still spins exactly once */
 {const P=await L.phone('grp',{w:390,h:844});await P.page.setBypassServiceWorker(true).catch(()=>{});await P.go('mock.html');await P.page.waitForSelector('#mode_group');await P.page.click('#mode_group');
  ok('with others: seat select is disabled (seats come from the spin)',await P.page.evaluate(()=>document.getElementById('m_seat').disabled));
  await P.page.click('#startmock');await P.page.waitForFunction(()=>/room\.html\?l=/.test(location.href),{timeout:20000});const id=await P.page.evaluate(()=>new URLSearchParams(location.search).get('l'));const K=F.Keys(id);
  await P.page.waitForSelector('#fillbots',{timeout:20000});await P.page.click('#fillbots');await P.page.waitForFunction(()=>!document.getElementById('fillbots'),{timeout:30000});
  let m0=JSON.parse(await raw(K.meta));ok('with others: before the spin, no spin and order not set',!m0.spin&&!m0.spinDone&&!m0.orderSet);
  await P.page.waitForSelector('#spinopen',{timeout:15000});await P.page.click('#spinopen');await P.page.waitForSelector('#spinall',{visible:true,timeout:15000});await P.page.click('#spinall');
  const t=Date.now();let m;while(Date.now()-t<120000){m=JSON.parse(await raw(K.meta));if(m.spin&&m.spin.done)break;await sleep(1000)}
  ok('with others: the spin finished once (spinGen 1, spinDone, order of 8 set)',m.spinGen===1&&m.spinDone===true&&m.orderSet&&m.order.length===8,{g:m.spinGen,d:m.spinDone});
  await P.page.keyboard.press('Escape').catch(()=>{});await P.page.reload({waitUntil:'domcontentloaded'});await sleep(3000);
  ok('with others: no second Spin button after the spin',!(await P.page.evaluate(()=>!!document.getElementById('spinopen'))));
  const ord=m.order.join();await P.page.click('#startbtn').catch(()=>{});await P.page.waitForSelector('#cfyes',{timeout:8000}).catch(()=>{});await P.page.click('#cfyes').catch(()=>{});
  const t2=Date.now();while(Date.now()-t2<20000){m=JSON.parse(await raw(K.meta));if(m.status==='live')break;await sleep(800)}
  ok('with others: started live with the wheel order, still spinGen 1',m.status==='live'&&m.order.join()===ord&&m.spinGen===1,{s:m.status,g:m.spinGen});
  await P.ctx.close().catch(()=>{})}
 /* solo fixed seat: no spin record at all */
}catch(e){console.log('ERR',e);bad++}console.log(`\n${n-bad} / ${n} checks passed`);await L.close();process.exit(bad?1:0)})();
