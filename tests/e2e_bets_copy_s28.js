/* s28: League Bets page = copy of the live STOOPIDS Bets page (layout, wording, bet types incl. Pool / buy-in), on the League bet store.
   Write it Up order + partner wording, Pool / buy-in next to One side vs another, pool build (confirm dialog) -> card -> settle by place -> Tally (partner tallyJS pool split),
   pool rules in reduce (builder only, sums), guest / ?view=1 read-only, no k= in any link, 320/390/1280 no horizontal overflow and 36px tap targets.
   node tests/e2e_bets_copy_s28.js  (APP / API env, mock store only) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const F=require('../js/core.js');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const base=process.env.API||'http://localhost:9996/api/data/';const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
async function open(id,info,i,o){o=o||{};const P=await L.phone('c'+Math.random().toString(36).slice(2,6),o.w?{desktop:o.w>=1000,w:o.w,h:900}:{});
  if(i!=null)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[i].id,k:info.managers[i].k});
  await P.go('league.html?l='+id+(o.q||'')+'#bets');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await P.page.waitForSelector('#b27FCount',{timeout:20000});await sleep(400);return P}
const tap=async(P,sel)=>{await P.page.click(sel);await sleep(250)};
(async()=>{try{
  const id=await seed();const info=seed.info;const M=info.managers.map(m=>m.id);
  /* ---- reduce: pool rules ---- */
  {const R=require('fs').readFileSync(__dirname+'/../js/league-bets.js','utf8');const T0=Date.now()-3600e3;let u=0;const ev=(k,o)=>Object.assign({k,u:'ru'+(++u).toString().padStart(6,'0'),ts:T0+u*1000,v:25},o);
    const P=await L.phone('unit');await P.go('league.html?l='+id+'#bets');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});
    const r=await P.page.evaluate((M,evs)=>{const B=window.LBETS;const logs={};M.forEach(m=>logs[m]=[]);evs.forEach(([m,e])=>logs[M[m]].push(e));const bets=B.reduce(Object.fromEntries(Object.entries(logs).map(([k,v])=>[k,B.parseLog(JSON.stringify({v:1,ev:v}))])),M,Date.now());const T=B.tally(bets);return{bets:bets.map(b=>({id:b.id,n:b.n,kind:b.kind,status:b.status,back:b.back})),T}},M,[
      [0,ev('pl',{id:'upool00001',parts:[M[0],M[1],M[2]],amt:10,text:'P1',places:[20,10]})],
      [1,ev('pb',{id:'upool00001',back:{[M[1]]:30}})],                         // not the builder: ignored
      [0,ev('pb',{id:'upool00001',back:{[M[0]]:25,[M[1]]:5}})],               // sum 30 = 3 x 10: counts
      [3,ev('pl',{id:'upool00002',parts:[M[0],M[1]],amt:10,text:'P2'})],       // builder not in it: ignored
      [2,ev('pl',{id:'upool00003',parts:[M[2],M[3]],amt:10,text:'P3'})],
      [2,ev('pb',{id:'upool00003',back:{[M[2]]:5}})],                          // sum 5 != 20: ignored
      [3,ev('w',{id:'upool00003'})],                                           // not the builder: ignored
      [2,ev('w',{id:'upool00003'})]]);                                         // builder cancels
    const b1=r.bets.find(b=>b.id==='upool00001'),b3=r.bets.find(b=>b.id==='upool00003');
    ok('reduce: pool by its builder counts; payouts only from the builder and only when they add up to the pot',!!b1&&b1.kind==='pool'&&b1.back&&b1.back[M[0]]===25&&b1.back[M[1]]===5&&b1.back[M[2]]===0,r.bets);
    ok('reduce: a pool the writer is not in is ignored; wrong sums and other people\'s cancels are ignored; the builder can cancel',!r.bets.find(b=>b.id==='upool00002')&&b3&&b3.status==='void'&&!b3.back,r.bets);
    ok('Tally (partner tallyJS pool split): Ana got 25 of 10 (+15), Ben 5 (-5), Cy 0 (-10): each loser pays each winner in proportion',r.T.M[M[1]][M[0]]===5&&r.T.M[M[2]][M[0]]===10&&r.T.per[M[0]].net===15&&r.T.lost[M[2]]===10&&r.T.won[M[0]]===15,r.T);
    await P.close()}
  /* s28b: chip markup, real name hidden when it equals the team name (RNm rule) */
  {const R=require('fs').readFileSync(__dirname+'/../js/league-bets.js','utf8');ok('chip source: .tl (team) comes before .tnr (real name), guarded by bRNm',/<span class="tl">.*<\/span>\$\{bRNm\(o\)\?`<small class="tnr">/.test(R)&&/bRNm=\(o,st\)=>\{[^}]*t!==r\?r:''\}/.test(R))}
  /* ---- Write it Up: order + partner wording ---- */
  const A=await open(id,info,0);
  const w=await A.page.evaluate(()=>{const y=id=>{const e=document.getElementById(id);return e?e.getBoundingClientRect().top+scrollY:null};return{seg:y('b27SegRow'),form:y('b27Form'),lh:y('b27ListH'),intro:y('b27Intro'),txt:document.getElementById('lbody').innerText,kinds:[...document.querySelectorAll('#b27Form .b27-kind button')].map(b=>b.textContent),copy:(document.getElementById('b27CopyLink')||{}).textContent,owes:!!document.getElementById('b27Owes'),amts:[...document.querySelectorAll('[data-lb=amt]')].map(b=>b.textContent).join()}});
  ok('Write it Up order: Write it Up / Tally (no Copy link, s28c: Share tab only), New bet, Bets (n), intro card last',w.seg<w.form&&w.form<w.lh&&w.lh<w.intro&&!w.copy&&!w.owes,w);
  ok('bet types: "One side vs another" then "Pool / buy-in" in the New bet card',w.kinds.join('|')==='One side vs another|Pool / buy-in',w.kinds);
  ok('partner wording: steps 1-4, amounts 5 10 20 50 100, no hint line (sync-step1 = STOOPIDS), disclaimer',/1\. Who are you betting against\?/.test(w.txt)&&/2\. What’s the bet\? I say…/.test(w.txt)&&/3\. Amount \(minimum 5\)/.test(w.txt)&&/4\. Odds \(if you’re right, they owe amount × first ÷ second\)/.test(w.txt)&&w.amts==='5,10,20,50,100'&&!/Pick one or more opponents, an amount and the odds to see who owes what\./.test(w.txt)&&/Bets here are just for fun and are settled in pushups, not money\. Betting is Stoopid, and we don't endorse or facilitate gambling for money\./.test(w.txt)&&/This page just records who bet what and who owes whom\./.test(w.txt),w.txt.slice(0,900));
  /* ---- pool form ---- */
  await tap(A,'#b27KindPool');
  const pf=await A.page.evaluate(()=>({t:document.getElementById('b27Form').innerText,on:document.getElementById('b27KindPool').getAttribute('aria-pressed'),pot:document.getElementById('s26Pot').innerText}));
  ok('Pool / buy-in form: partner steps (What’s the pool? / Who’s in? / Buy-in per person / Payouts by place), Winner + 2nd rows, + Add place, Build',pf.on==='true'&&/What’s the pool\?/.test(pf.t)&&/Who’s in\?\s+\(you are in automatically\)/.test(pf.t)&&/Buy-in per person/.test(pf.t)&&/Payouts by place/.test(pf.t)&&/Winner/.test(pf.t)&&/2nd/.test(pf.t)&&/\+ Add place/.test(pf.t)&&/Build/.test(pf.t)&&/Pot: pick who’s in and a buy-in/.test(pf.pot),pf);
  await tap(A,'#b27Place');
  const er=await A.page.evaluate(()=>['s26eTerms','s26ePeople','s26eBuy'].map(i=>document.getElementById(i).innerText));
  ok('Build with nothing filled in: the partner errors under each step',er[0]==='Write the terms of the pool first.'&&er[1]==='a pool needs 2+ participants'&&er[2]==='pool needs a buy-in like 50',er);
  await A.page.type('#b27Text','Season tournament pool');await A.page.click('[data-lb=pp][data-mid="'+M[1]+'"]');await A.page.click('[data-lb=pp][data-mid="'+M[2]+'"]');await A.page.type('#b27En','10');await sleep(200);
  ok('live pot line: "Pot: 3 × 10 = 30"',(await A.page.$eval('#s26Pot',e=>e.innerText))==='Pot: 3 × 10 = 30');
  await A.page.type('#s26p0','20');await sleep(150);
  ok('payouts short of the pot: partner error with the gap',/Payouts add up to 20 but the pot is 30 \(10 short\)\./.test(await A.page.$eval('#s26ePay',e=>e.innerText)));
  await A.page.type('#s26p1','10');await sleep(150);
  ok('payouts add up: "Adds up to 30 of 30 ✓"',/Adds up to 30 of 30 ✓/.test(await A.page.$eval('#s26Sum',e=>e.innerText)));
  await tap(A,'#b27Place');
  const cf=await A.page.evaluate(()=>{const m=document.querySelector('.s26k-m');return m?m.innerText:''});
  ok('confirm dialog (partner modal): terms, "Pool of Ana, Ben, Cy · buy-in 10 each · total 30", payouts line, ✅ Yes, build it',/Season tournament pool/.test(cf)&&/Pool of Ana, Ben, Cy · buy-in 10 each · total 30/.test(cf)&&/Payouts: Winner 20 · 2nd 10/.test(cf)&&/✅ Yes, build it/.test(cf),cf);
  await A.page.click('[data-lb=poolconfirm]');await A.page.waitForFunction(()=>/Built! Pool #1/.test((document.getElementById('b27Msg')||{}).innerText||''),{timeout:20000});
  const card=await A.page.evaluate(()=>{const c=document.querySelector('[data-kind=pool][data-bet]');return c?c.innerText:''});
  ok('pool card: Pool #1 Open · 3 managers, Buy-in each 10 · total 30, With: Ana, Ben, Cy, Payouts not entered yet',/Pool #1/.test(card)&&/Open/.test(card)&&/3 managers/.test(card)&&/Buy-in each 10 · total 30/.test(card)&&/With: Ana, Ben, Cy/.test(card)&&/Payouts not entered yet\./.test(card),card);
  /* settle by place */
  const pid=await A.page.$eval('[data-kind=pool][data-bet]',e=>e.dataset.bet);
  await A.page.select('#s26w_'+pid+'_0',M[1]);await A.page.select('#s26w_'+pid+'_1',M[0]);await tap(A,'[data-lb=placego]');
  ok('settle asks to tap again',/Tap again to confirm/.test(await A.page.$eval('[data-lb=placego]',e=>e.innerText)));
  await tap(A,'[data-lb=placego]');await A.page.waitForFunction(()=>{const c=document.querySelector('[data-kind=pool][data-bet]');return c&&/Settled/.test(c.innerText)},{timeout:20000});
  const c2=await A.page.$eval('[data-kind=pool][data-bet]',e=>e.innerText);
  ok('settled pool card: Result rows + settle-up line (partner b27Greedy)',/Ben: gets 20, net \+10/.test(c2)&&/Ana: gets 10, net 0/.test(c2)&&/Cy: gets 0, net -10/.test(c2)&&/Cy owes Ben 10/.test(c2),c2);
  await tap(A,'#b27Ob_tally');
  const t=await A.page.evaluate(()=>({h:document.getElementById('b27Tally').innerText,p:[...document.querySelectorAll('#b27People tr')].map(r=>r.innerText.replace(/\s+/g,' ').trim()),s:(document.getElementById('b27Settle')||{}).innerText||''}));
  ok('Tally: partner heading, Person / Lost / Won / Net +/- / Bets / Fines, pool counted, settle line',/Tally · 2026-27/.test(t.h)&&/From the 2026-27 shared ledger only\. Rows owe columns\./.test(t.h)&&/PERSON LOST WON NET \+\/- BETS FINES/i.test(t.p[0])&&t.p.some(r=>/BLAZERS\s+Ben\s+0 10 \+10 1 0/.test(r))&&t.p.some(r=>/COMETS\s+Cy\s+10 0 -10 1 0/.test(r))&&/COMETS owes BLAZERS 10/.test(t.s),t);
  /* ---- links: no k= ---- */
  const links=await A.page.evaluate(()=>[...document.querySelectorAll('#lbody a[href]')].map(a=>a.getAttribute('href')));
  ok('no k= in any link on the Bets page',links.every(h=>!/[?&#]k=/.test(h)),links);
  await A.close();
  /* ---- guest / view=1 ---- */
  for(const q of ['','&view=1']){const G=await open(id,info,null,{q});const g=await G.page.evaluate(()=>({form:!!document.getElementById('b27Form'),watch:!!document.getElementById('b27Watch'),btn:[...document.querySelectorAll('[data-lb=placego],[data-lb=poolvoid],[data-lb=poolplace]')].length,cards:document.querySelectorAll('[data-bet]').length}));
    ok('guest'+(q?' ?view=1':'')+': read only (no form, no settle / cancel buttons), cards visible',!g.form&&g.btn===0&&g.cards===1,g);await G.close()}
  /* ---- widths ---- */
  for(const W of [320,390,1280])for(const mode of ['bet','pool','tally']){const P=await open(id,info,0,{w:W});if(mode==='pool')await tap(P,'#b27KindPool');if(mode==='tally')await tap(P,'#b27Ob_tally');
    const r=await P.page.evaluate(()=>{const small=[...document.querySelectorAll('#lbody button,#lbody select,#lbody input,#lbody textarea')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.height&&!e.closest('.b27-rx')&&!e.closest('[hidden]')&&(b.height<36||b.width<36)}).map(e=>(e.id||e.dataset.lb||e.className)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height));return{ov:document.documentElement.scrollWidth-innerWidth,small}});
    ok(W+'px '+mode+': no horizontal overflow, every tap target at least 36px',r.ov<=0&&!r.small.length,r);
    /* s28b regression: every opponent / person chip and Tally row shows the TEAM name on top, the real name under it (hidden when equal) */
    const co=await P.page.evaluate(()=>{const vis=e=>{const b=e&&e.getBoundingClientRect();return b&&b.width>0&&b.height>0?b:null};const out=[];
      document.querySelectorAll('#lbody .b27-opps .b27-chip.op').forEach(c=>{const t=[...c.querySelectorAll('.nm .tl > *')].map(vis).find(Boolean),r=vis(c.querySelector('.nm .tnr'));out.push({k:'chip',mid:c.dataset.mid,t:!!t,r:!!r,ok:!!t&&(!r||t.top<r.top),cb:c.getBoundingClientRect().bottom,rb:r?r.bottom:0})});
      document.querySelectorAll('#b27People tr[data-mid] td:first-child').forEach(c=>{const t=vis(c.querySelector('.tnt')),r=vis(c.querySelector('.tnr'));out.push({k:'tally',t:!!t,r:!!r,ok:!!t&&(!r||t.top<r.top)})});
      document.querySelectorAll('#lbody .b27-c .tn2').forEach(c=>{const t=vis(c.querySelector('.tnt')),r=vis(c.querySelector('.tnr'));out.push({k:'card',t:!!t,r:!!r,ok:!!t&&(!r||t.top<r.top)})});return out});
    const exp=mode==='tally'?'tally':'chip';
    ok(W+'px '+mode+': chip order = team name on top, real name under it (s28b)',co.filter(x=>x.k===exp).length>=(exp==='chip'?7:3)&&co.every(x=>x.ok)&&co.filter(x=>x.k===exp).every(x=>x.r)&&co.filter(x=>x.k==='chip').every(x=>x.rb<=x.cb+1),co);await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed');await L.close();process.exit(bad?1:0)})();
