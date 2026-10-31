/* s24 Bets: Edit on a pending bet (withdraw + prefilled form) and two-sided Fix result (one side alone never changes a result; totals follow the latest confirmed result).
   node tests/e2e_bets_s24.js  (APP / API env, mock store). Screenshots go to SHOTS (default /workspace/league-site-work/compare-s24). */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const F=require('../js/core.js');
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s24';
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const base=process.env.API||'http://localhost:9996/api/data/';const MONEY=/\b(wager\w*|payout|prize|cash|money|dollars?|lottery|jackpot|gambl\w*|USD|IDR|Rp)\b|\$\s?\d/i;
const get=async k=>(await fetch(base+encodeURIComponent(k))).text();const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
async function open(id,info,i,o){o=o||{};const P=await L.phone('s'+Math.random().toString(36).slice(2,6),o.w?{desktop:o.w>=1000,w:o.w,h:900}:{});
  if(i!=null)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[i].id,k:info.managers[i].k});
  await P.go('league.html?l='+id+'#bets');await P.page.waitForSelector('#b27Head',{timeout:25000});await P.page.waitForFunction('!/Connecting/.test(document.getElementById("b27Top").innerText)',{timeout:20000});return P}
const txt=P=>P.page.$eval('#lbody',e=>e.innerText);
const tap=async(P,sel)=>{await P.page.waitForSelector(sel,{timeout:8000});await P.page.evaluate(s=>{const e=document.querySelector(s);e.scrollIntoView({block:'center'});e.click()},sel);await sleep(200)};
const msg=(P,re)=>P.page.waitForFunction('new RegExp('+JSON.stringify(re)+').test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:15000});
const refresh=async P=>{await P.page.evaluate(()=>LBETS.poll(true));await sleep(700)};
const board=P=>P.page.evaluate(()=>((document.getElementById('b27Board')||{}).innerText||''));
const audit=P=>P.page.evaluate(()=>{const A=[...document.querySelectorAll('#lbody button, #lbody a, #lbody input')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.closest('[hidden]')&&!e.closest('.sc')});
  return{small:A.filter(e=>{const r=e.getBoundingClientRect();return r.height<43.5||r.width<43.5}).map(e=>(e.dataset.lb||e.id||e.tagName)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,8),over:document.documentElement.scrollWidth>innerWidth+1}});
const shot=async(P,sel,f)=>{await P.page.evaluate(s=>{const e=document.querySelector(s);if(e)e.scrollIntoView({block:'start'})},sel);await sleep(200);await P.page.screenshot({path:SH+'/'+f})};
(async()=>{try{
  const id=await seed();const info=seed.info;const M=info.managers.map(m=>m.id);const key=i=>F.Keys(id).base+'-bets-'+M[i];
  ok('league has exactly 8 managers',M.length===8);
  /* ---- 1. Edit ---- */
  const A=await open(id,info,0);
  await tap(A,'[data-lb=opp][data-mid="'+M[1]+'"]');await A.page.type('#b27Text','Kansas beats Duke');await tap(A,'[data-lb=amtcustom]');await A.page.type('#b27Ao','30');
  await tap(A,'[data-lb=odds][data-v="3-1"]');await tap(A,'#b27Place');await tap(A,'[data-lb=confirm]');await msg(A,'Placed');
  const c1=await A.page.$eval('[data-bet]',e=>e.innerText);
  ok('pending bet I placed shows an Edit button (with Withdraw)',!!(await A.page.$('[data-lb=betedit]'))&&!!(await A.page.$('[data-lb=withdraw]')),c1);
  await shot(A,'[data-bet]','s24_1_pending_edit_390.png');
  const B0=await open(id,info,1);ok('the other side (Ben) gets no Edit button, only Accept / Decline',!(await B0.page.$('[data-lb=betedit]'))&&!!(await B0.page.$('[data-lb=accept]')));await B0.page.close();
  const SP=await open(id,info,null);ok('watcher: no Edit button',!(await SP.page.$('[data-lb=betedit]')));await SP.page.close();
  const old=JSON.parse(await get(key(0))).ev[0];
  await tap(A,'[data-lb=betedit]');await msg(A,'Withdrawn for editing');
  const lg=JSON.parse(await get(key(0))).ev;ok('Edit writes the normal withdraw event (w) for the old bet into Ana\'s own log only',lg.length===2&&lg[1].k==='w'&&lg[1].id===old.id&&(await get(key(1)))==='',lg);
  const f=await A.page.evaluate(()=>({t:document.getElementById('b27Text').value,ao:(document.getElementById('b27Ao')||{}).value,aw:!document.getElementById('b27Aw').hidden,opp:[...document.querySelectorAll('[data-lb=opp][aria-pressed=true]')].map(b=>b.dataset.mid),od:[...document.querySelectorAll('[data-lb=odds][aria-pressed=true]')].map(b=>b.dataset.v),hint:(document.getElementById('b27EdHint')||{}).innerText||'',live:document.getElementById('b27Live').innerText}));
  ok('after Edit the New bet form is prefilled: opponent Ben, text, custom 30 pushups, odds 3-1',f.t==='Kansas beats Duke'&&f.aw&&f.ao==='30'&&f.opp.length===1&&f.opp[0]===M[1]&&f.od[0]==='3-1'&&/Bet #1/.test(f.hint)&&/90 pushups/.test(f.live),f);
  ok('old bet now shows Withdrawn',/Withdrawn/.test(await A.page.$eval('[data-bet]',e=>e.innerText)));
  await shot(A,'#b27Form','s24_2_prefilled_after_edit_390.png');
  const ae=await audit(A);ok('390px: tap targets >= 44px and no overflow with the prefilled form',ae.small.length===0&&!ae.over,ae);
  await A.page.$eval('#b27Text',e=>{e.value=''});await A.page.type('#b27Text','Kansas beats Duke by 5');await tap(A,'#b27Place');await tap(A,'[data-lb=confirm]');await msg(A,'Placed');
  ok('placing the edited bet creates Bet #2 and clears the edit hint',/Bet #2/.test(await txt(A))&&!(await A.page.$('#b27EdHint')));
  /* ---- settle Bet #2: Ana won (Ben owes 90) ---- */
  const B=await open(id,info,1);await tap(B,'[data-lb=accept]');await msg(B,'Accepted');
  await refresh(A);await tap(A,'[data-lb=settle][data-r=b]');await tap(A,'[data-lb=settle][data-r=b]');await msg(A,'Settled');
  await refresh(B);await B.page.waitForFunction('/Settled/.test(document.getElementById("lbody").innerText)',{timeout:12000});
  ok('settled: Ana won (Ben owes 90 pushups), board +90 / -90',/Ana won \(Ben owes 90 pushups\)/.test(await txt(B))&&/\+90/.test(await board(B)),await board(B));
  /* ---- 2. Fix result: Ben asks, Ana confirms ---- */
  ok('settled bet shows a Fix result button for both sides',!!(await B.page.$('[data-lb=fixopen]')));
  await tap(B,'[data-lb=fixopen]');const opts=await B.page.$$eval('[data-lb=fixreq]',bs=>bs.map(b=>b.innerText));ok('Fix result offers the other two results only',opts.length===2&&opts.some(t=>/Ben won/.test(t))&&opts.some(t=>/Wash/.test(t)),opts);
  await tap(B,'[data-lb=fixreq][data-r=o]');ok('fix request asks Tap again to confirm',/Tap again to confirm/.test(await txt(B)));await tap(B,'[data-lb=fixreq][data-r=o]');await msg(B,'Asked');
  const lb=JSON.parse(await get(key(1))).ev.filter(e=>e.k==='fr');ok('fix request (fr) is written only into Ben\'s own log',lb.length===1&&lb[0].r==='o'&&!JSON.parse(await get(key(0))).ev.some(e=>e.k==='fr'));
  let t=await txt(B);ok('one side alone does not change the result: still "Ana won", board still +90, Ben sees "Waiting for Ana to confirm"',/Ana won \(Ben owes 90/.test(t)&&/\+90/.test(await board(B))&&/Waiting for Ana to confirm/.test(t)&&!!(await B.page.$('[data-lb=fixwd]')),t.slice(0,900));
  ok('the requester cannot confirm their own request (no Confirm button for Ben)',!(await B.page.$('[data-lb=fixok]')));
  /* forged confirms: Ben confirming his own request in his log, and Cy confirming in hers, are ignored */
  const fxid=lb[0].fx;const bl=JSON.parse(await get(key(1)));bl.ev.push({k:'fc',u:'forgefc01',ts:Date.now(),id:lb[0].id,fx:fxid});await post(key(1),bl);
  await post(key(2),{v:1,ev:[{k:'fc',u:'forgefc02',ts:Date.now(),id:lb[0].id,fx:fxid},{k:'fr',u:'forgefr03',ts:Date.now(),id:lb[0].id,fx:'forgefx03',r:'p'}]});
  await refresh(A);t=await txt(A);ok('forged: a confirm in the requester\'s own log or in a non-party\'s log (and a non-party request) changes nothing',/Ana won \(Ben owes 90/.test(t)&&/\+90/.test(await board(A))&&!!(await A.page.$('[data-lb=fixok]'))&&!/Cy asked/.test(t),t.slice(0,900));
  await post(key(2),{v:1,ev:[]});const bl2=JSON.parse(await get(key(1)));bl2.ev=bl2.ev.filter(e=>e.u!=='forgefc01');await post(key(1),bl2);await refresh(A);
  t=await txt(A);ok('Ana sees "Ben asks to change the result from Ana won to Ben won" with Confirm and Keep',/Ben asks to change the result from Ana won to Ben won/.test(t)&&!!(await A.page.$('[data-lb=fixno]')),t.slice(0,900));
  const W=await open(id,info,3);t=await txt(W);ok('other managers see the pending request read-only (no Confirm / Fix buttons)',/Ben asked to change the result to Ben won/.test(t)&&!(await W.page.$('[data-lb=fixok]'))&&!(await W.page.$('[data-lb=fixopen]')),t.slice(0,600));await W.page.close();
  await shot(A,'[data-fixhist]','s24_3_fix_request_pending_390.png');
  const af=await audit(A);ok('390px: tap targets >= 44px, no overflow with a pending fix request',af.small.length===0&&!af.over,af);
  await tap(A,'[data-lb=fixok]');await tap(A,'[data-lb=fixok]');await msg(A,'Confirmed');
  t=await txt(A);const bd=await board(A);
  ok('after Ana confirms: result is Ben won (Ana owes 30 pushups), marked Corrected',/Result:\s*Ben won \(Ana owes 30 pushups\)/.test(t)&&/Corrected/.test(t),t.slice(0,900));
  ok('totals use the latest confirmed result: Ben +30, Ana -30',/\+30/.test(bd)&&/[-−]30/.test(bd)&&!/90/.test(bd),bd);
  const h=await A.page.$eval('[data-fixhist]',e=>e.innerText);ok('history on the card: who asked, original vs corrected result, who confirmed, times',/Ben asked to change Ana won → Ben won/.test(h)&&/confirmed by Ana/.test(h)&&/\d{1,2}:\d{2}/.test(h),h);
  ok('#b27Board is closed: no bet card or open-bets note sits inside the totals box',await A.page.evaluate(()=>{const b=document.getElementById('b27Board');return !!b&&!b.querySelector('[data-bet], #b27OpenNote')&&document.querySelectorAll('[data-bet]').length>0&&[...document.querySelectorAll('[data-bet]')].every(c=>!b.contains(c))}));
  ok('confirm (fc) is in Ana\'s own log',JSON.parse(await get(key(0))).ev.some(e=>e.k==='fc'&&e.fx===fxid));
  await shot(A,'[data-fixhist]','s24_4a_fix_confirmed_history_390.png');await shot(A,'#b27Board','s24_4b_fix_confirmed_totals_390.png');
  await refresh(B);ok('Ben sees the same corrected result and totals',/Ben won \(Ana owes 30/.test(await txt(B))&&/\+30/.test(await board(B)));
  /* decline + withdraw through the UI */
  await tap(A,'[data-lb=fixopen]');await tap(A,'[data-lb=fixreq][data-r=p]');await tap(A,'[data-lb=fixreq][data-r=p]');await msg(A,'Asked');await tap(A,'[data-lb=fixwd]');await msg(A,'withdrawn');
  await tap(A,'[data-lb=fixopen]');await tap(A,'[data-lb=fixreq][data-r=p]');await tap(A,'[data-lb=fixreq][data-r=p]');await msg(A,'Asked');
  await refresh(B);await tap(B,'[data-lb=fixno]');await msg(B,'Declined');t=await txt(B);
  ok('withdraw and decline: result stays Ben won, history lists withdrawn + declined',/Ben won \(Ana owes 30/.test(t)&&/withdrawn/.test(t)&&/declined by Ben/.test(t)&&/\+30/.test(await board(B)),t.slice(0,1200));
  /* ---- pure reduce: conflicts and duplicates ---- */
  const R=await A.page.evaluate(()=>{const m=['aaaaaaaa','bbbbbbbb','cccccccc'],T=1.8e12;const base=()=>({aaaaaaaa:[{k:'p',u:'u00001',ts:T,id:'bet001',to:'bbbbbbbb',amt:10,a:1,b:1,text:'x'},{k:'s',u:'u00002',ts:T+2,id:'bet001',r:'b'}],bbbbbbbb:[{k:'a',u:'u00003',ts:T+1,id:'bet001'},{k:'s',u:'u00004',ts:T+3,id:'bet001',r:'b'}],cccccccc:[]});
    const run=f=>{const l=base();f(l);return LBETS.reduce(l,m,T+1e5)[0]};const o={};
    o.both=run(l=>{l.aaaaaaaa.push({k:'fr',u:'u1',ts:T+10,id:'bet001',fx:'fxaaaa1',r:'o'});l.bbbbbbbb.push({k:'fr',u:'u2',ts:T+11,id:'bet001',fx:'fxbbbb1',r:'o'})});
    o.conflict=run(l=>{l.aaaaaaaa.push({k:'fr',u:'u1',ts:T+10,id:'bet001',fx:'fxaaaa1',r:'o'});l.bbbbbbbb.push({k:'fr',u:'u2',ts:T+11,id:'bet001',fx:'fxbbbb1',r:'p'}),l.aaaaaaaa.push({k:'fc',u:'u3',ts:T+12,id:'bet001',fx:'fxaaaa1'})});
    o.replace=run(l=>{l.aaaaaaaa.push({k:'fr',u:'u1',ts:T+10,id:'bet001',fx:'fxaaaa1',r:'o'},{k:'fr',u:'u2',ts:T+11,id:'bet001',fx:'fxaaaa2',r:'p'});l.bbbbbbbb.push({k:'fc',u:'u3',ts:T+12,id:'bet001',fx:'fxaaaa1'})});
    o.dup=run(l=>{const e={k:'fr',u:'u1',ts:T+10,id:'bet001',fx:'fxaaaa1',r:'o'};l.aaaaaaaa.push(e,e);l.bbbbbbbb.push({k:'fc',u:'u3',ts:T+12,id:'bet001',fx:'fxaaaa1'},{k:'fc',u:'u3',ts:T+12,id:'bet001',fx:'fxaaaa1'})});
    o.same=run(l=>{l.aaaaaaaa.push({k:'fr',u:'u1',ts:T+10,id:'bet001',fx:'fxaaaa1',r:'b'})});
    o.early=run(l=>{l.bbbbbbbb=[{k:'a',u:'u00003',ts:T+1,id:'bet001'},{k:'fc',u:'u9',ts:T+1.5,id:'bet001',fx:'fxaaaa1'},{k:'s',u:'u00004',ts:T+3,id:'bet001',r:'b'}];l.aaaaaaaa.splice(1,0,{k:'fr',u:'u8',ts:T+1.2,id:'bet001',fx:'fxaaaa1',r:'o'})});
    return Object.fromEntries(Object.entries(o).map(([k,b])=>[k,{res:b.res,fix:b.fix&&b.fix.to,st:b.fixes.map(x=>x.st)}]))});
  ok('reduce: both sides asking for the same correction counts as agreement',R.both.res==='o'&&!R.both.fix,R.both);
  ok('reduce: conflicting requests: the later one replaces the earlier, a confirm of the stale one is ignored, result unchanged until the new one is confirmed',R.conflict.res==='b'&&R.conflict.fix==='p'&&R.conflict.st.join()==='countered,pending',R.conflict);
  ok('reduce: a newer request from the same side replaces the older; confirming the old one does nothing',R.replace.res==='b'&&R.replace.fix==='p'&&R.replace.st.join()==='replaced,pending',R.replace);
  ok('reduce: duplicate events (same id) count once',R.dup.res==='o'&&R.dup.st.join()==='confirmed',R.dup);
  ok('reduce: asking for the result that already stands is ignored',R.same.res==='b'&&R.same.st.length===0,R.same);
  ok('reduce: fix events before the bet is settled are ignored',R.early.res==='b'&&R.early.st.length===0,R.early);
  /* ---- widths + wording ---- */
  for(const w of [320,360,390,1280]){const P=await open(id,info,0,{w});const a=await audit(P);const tt=await txt(P);ok(w+'px: no overflow, tap targets >= 44px on Bets with history',!a.over&&a.small.length===0,a);
    if(w===1280)ok('no money words on the Bets tab, pushups present',!MONEY.test(tt)&&/pushups/.test(tt),tt.match(MONEY));ok(w+'px: no page errors',P.errs.length===0,P.errs);await P.page.close()}
  /* ---- s24b QA: Edit when the other side already answered (Ana's page has not polled yet) ---- */
  {const kd=encodeURIComponent(key(3));let stale=true;const snap=await get(key(3));await A.page.setRequestInterception(true);
    A.page.on('request',r=>{if(stale&&r.method()==='GET'&&r.url().includes(kd))r.respond({status:200,contentType:'text/plain',body:snap});else r.continue().catch(()=>{})});
    await A.page.evaluate(()=>scrollTo(0,0));await tap(A,'[data-lb=opp][data-mid="'+M[3]+'"]');await A.page.type('#b27Text','Duke wins it all');await tap(A,'[data-lb=amt][data-v="10"]');await tap(A,'#b27Place');await tap(A,'[data-lb=confirm]');await msg(A,'Placed');
    const bid=await A.page.$$eval('[data-bet]',cs=>{const c=cs.find(c=>/Duke wins it all/.test(c.innerText));return c&&c.querySelector('[data-lb=betedit]')&&c.querySelector('[data-lb=betedit]').dataset.id});
    const D=await open(id,info,3);await tap(D,'[data-lb=accept][data-id="'+bid+'"]');await msg(D,'Accepted');await D.page.close();
    await refresh(A);ok('setup: Dee accepted in the store, Ana\'s page is stale and still offers Edit',!!bid&&!!(await A.page.$('[data-lb=betedit][data-id="'+bid+'"]')));
    const n0=JSON.parse(await get(key(0))).ev.length;stale=false;
    await tap(A,'[data-lb=betedit][data-id="'+bid+'"]');await msg(A,'Too late to edit, this bet was already answered\\.');await sleep(300);
    const r=await A.page.evaluate(bid=>{const c=[...document.querySelectorAll('[data-bet]')].find(c=>c.querySelector('[data-id="'+bid+'"]')||/Duke wins it all/.test(c.innerText));return{m:document.getElementById('b27Msg').innerText,form:(document.getElementById('b27Text')||{}).value,hint:!!document.getElementById('b27EdHint'),card:c&&c.innerText,edit:!!document.querySelector('[data-lb=betedit][data-id="'+bid+'"]')}},bid);
    const lg=JSON.parse(await get(key(0))).ev;
    ok('too-late Edit: message shown, form not opened or prefilled, nothing written to Ana\'s log, bet shows as accepted (not Withdrawn), no Edit button left',/^Too late to edit, this bet was already answered\./.test(r.m)&&!r.form&&!r.hint&&lg.length===n0&&!/Withdrawn/.test(r.card)&&!r.edit,{r,n0,len:lg.length});
    ok('too-late Edit: no duplicate bet (only one "Duke wins it all")',(await txt(A)).split('Duke wins it all').length-1===1);
    await A.page.evaluate(()=>{const e=document.getElementById('b27Msg');e.scrollIntoView({block:'start'});scrollBy(0,-70)});await sleep(200);await A.page.screenshot({path:SH+'/s24b_edit_toolate_390.png'});
    await A.page.setRequestInterception(false)}
  /* ---- s24b QA: no sideways scroll for a signed-in manager with "None selected" (strict scrollWidth <= innerWidth) ---- */
  {const sw=P=>P.page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,cnt:(document.getElementById('b27SelCnt')||{}).innerText}));
    {const P=await open(id,info,7);await P.page.addStyleTag({content:'.b27-selbar .cnt{white-space:nowrap!important;min-width:auto!important}'});await sleep(200);const x=await sw(P);ok('control: the s24 nowrap counter rule alone does overflow at 390 (so the check below is meaningful)',x.sw>390,x);await P.page.close()}
    for(const w of [320,360,390,1280]){const P=await open(id,info,7,{w});const x=await sw(P);ok(w+'px signed-in manager (Hal, "None selected"): scrollWidth <= innerWidth and <= the '+w+'px screen (mobile innerWidth grows with overflow)',x.sw<=x.iw&&x.sw<=w&&x.iw<=w&&/None selected/.test(x.cnt||''),x);
      if(w===390){await P.page.evaluate(()=>{document.getElementById('b27SelCnt').scrollIntoView({block:'center'})});await sleep(200);await P.page.screenshot({path:SH+'/s24b_bets_nooverflow_390.png'})}await P.page.close()}
    const P=await L.phone('sa'+Math.random().toString(36).slice(2,5),{});await P.page.emulateMediaFeatures([{name:'display-mode',value:'standalone'}]).catch(()=>{});
    await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me));Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true})},id,{mid:info.managers[7].id,k:info.managers[7].k});
    await P.go('league.html?l='+id+'#bets');await P.page.waitForSelector('#b27SelCnt',{timeout:25000});await sleep(500);const x=await sw(P);
    ok('standalone 390 signed-in manager: scrollWidth <= innerWidth <= 390',x.sw<=x.iw&&x.sw<=390&&x.iw<=390&&(await P.page.evaluate(()=>navigator.standalone===true)),x);await P.page.close()}
  ok('no page errors (Ana, Ben)',A.errs.length===0&&B.errs.length===0,[A.errs,B.errs]);
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
