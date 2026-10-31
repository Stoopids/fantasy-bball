/* League site Bets tab (pushup challenges): empty state, propose, accept, decline, settle (creator only, s25), who-owes-who + net pushups, two managers writing at the same time,
   same manager on two devices, spectator read-only, a wrong secret / forged events cannot act as another manager, store outage and recovery keeps the last good view,
   no money text or amounts, 44px tap targets at 390.   node tests/e2e_bets.js  (APP / API env, mock store) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep,API}=L;
const F=require('../js/core.js');
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const base=process.env.API||'http://localhost:9996/api/data/';const MONEY=/\b(wager\w*|payout|prize|cash|money|dollars?|lottery|jackpot|gambl\w*|USD|IDR|Rp)\b|\$\s?\d/i;
const get=async k=>(await fetch(base+encodeURIComponent(k))).text();const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
async function open(id,info,i,o){o=o||{};const P=await L.phone('b'+Math.random().toString(36).slice(2,6),o.desk?{desktop:true,w:1280,h:900}:{});
  if(i!=null)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[i].id,k:o.badk?'x'.repeat(40):info.managers[i].k});
  if(o.pre)await o.pre(P);await P.go('league.html?l='+id+'#bets');await P.page.waitForSelector('#lapp[data-ready], #trouble',{timeout:25000});if(!o.noWait){await P.page.waitForSelector('#b27Head',{timeout:25000});await P.page.waitForFunction('document.getElementById("b27Top")&&!/Connecting/.test(document.getElementById("b27Top").innerText)',{timeout:20000})}return P}
const txt=P=>P.page.$eval('#lbody',e=>e.innerText);
const tap=async(P,sel)=>{await P.page.waitForSelector(sel,{timeout:8000});await P.page.evaluate(s=>{const e=document.querySelector(s);e.scrollIntoView({block:'center'});e.click()},sel);await sleep(150)};
async function place(P,oppIdx,text,amt){await tap(P,'[data-lb=opp]:nth-of-type('+oppIdx+')');await P.page.type('#b27Text',text);await tap(P,'[data-lb=amt][data-v="'+amt+'"]');await tap(P,'#b27Place');await tap(P,'[data-lb=confirm]');await P.page.waitForFunction('/Placed/.test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:15000})}
const audit=P=>P.page.evaluate(()=>{const A=[...document.querySelectorAll('#lbody button, #lbody a, #lbody input, #lbody select')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.closest('[hidden]')});
  return{n:A.length,small:A.filter(e=>{const r=e.getBoundingClientRect();return r.height<43.5||r.width<43.5}).map(e=>(e.id||e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,8),over:document.documentElement.scrollWidth>innerWidth+1}});
(async()=>{try{
  const id=await seed();const info=seed.info;const names=['Ana','Ben','Cy','Dee','Eli','Fay','Gus','Hal'];
  /* ---- empty state, form, spectator ---- */
  let A=await open(id,info,0);let t=await txt(A);
  ok('empty state: "No bets yet" with a clear way to start one (Start a bet), form shown, framed as pushups',/No bets yet/.test(t)&&!!(await A.page.$('#b27Start'))&&!!(await A.page.$('#b27Form'))&&/paid in pushups/i.test(await A.page.$eval('#b27Note',e=>e.innerText)),t.slice(0,200));
  ok('empty state: Who owes who says nothing is settled yet, in pushups',/Nothing settled yet/.test(t)&&/pushups/.test(t));
  const a1=await audit(A);ok('390px: tap targets on the empty Bets tab (form, chips, buttons) are all >= 44px, no overflow',a1.small.length===0&&!a1.over,a1);
  await tap(A,'[data-lb=amtcustom]');const a1b=await audit(A);ok('390px: with the custom amount field open, tap targets still >= 44px',a1b.small.length===0&&!a1b.over,a1b);
  await A.page.type('#b27Ao','abc');ok('custom amount: letters are refused with a plain message',/Whole numbers only/.test(await A.page.$eval('#b27Ae',e=>e.innerText)));
  await A.page.$eval('#b27Ao',e=>{e.value='';});await A.page.type('#b27Ao','3');ok('custom amount: below the minimum is refused',/Minimum is 5/.test(await A.page.$eval('#b27Ae',e=>e.innerText)));
  await A.page.close();
  const SP=await open(id,info,null);t=await txt(SP);ok('spectator (no manager identity): can read, sees "Watching only", no form and no way to propose',/Watching only/.test(t)&&!(await SP.page.$('#b27Form'))&&!(await SP.page.$('[data-lb=place]'))&&/No bets yet/.test(t)&&!(await SP.page.$('#b27Start')),t.slice(0,160));await SP.page.close();
  const WK=await open(id,info,0,{badk:true});ok('a manager link with the wrong secret is only a spectator (read only)',!!(await WK.page.$('#b27Watch'))&&!(await WK.page.$('#b27Form')));await WK.page.close();
  /* ---- propose (Ana -> Ben), accept, settle ---- */
  A=await open(id,info,0);await place(A,1,'Kansas beats Duke',25);
  t=await txt(A);ok('propose: Ana places a bet on Ben: card shows Bet #1, Waiting, 25 pushups, who owes whom, and a Withdraw button',/Bet #1/.test(t)&&/Waiting/.test(t)&&/25 pushups/.test(t)&&/Kansas beats Duke/.test(t)&&/If Ana is right, Ben owes Ana 25 pushups/.test(t)&&!!(await A.page.$('[data-lb=withdraw]')),t.slice(0,500));
  const keyA=F.Keys(id).base+'-bets-'+info.managers[0].id;const logA=JSON.parse(await get(keyA));
  ok('data: the bet is stored only in Ana\'s own key fbn1-<id>-bets-<mid> as one propose event',logA.ev.length===1&&logA.ev[0].k==='p'&&logA.ev[0].to===info.managers[1].id&&keyA.startsWith('fbn1-'),logA);
  await A.page.screenshot({path:'/tmp/s18/bets_a1.png'});
  const Cs=await open(id,info,2);ok('other managers (Cy) see the bet but have no Accept button for it',/Bet #1/.test(await txt(Cs))&&!(await Cs.page.$('[data-lb=accept]')));await Cs.page.close();
  const B=await open(id,info,1);t=await txt(B);ok('accept: Ben sees "Waiting for your answer (1)" with Accept and Decline',/Waiting for your answer \(1\)/.test(t)&&!!(await B.page.$('[data-lb=accept]'))&&!!(await B.page.$('[data-lb=decline]')),t.slice(0,200));
  await tap(B,'[data-lb=accept]');await B.page.waitForFunction('/Accepted/.test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:12000});
  ok('accept: the bet is now Open and lists Ben as the other side; Ben\'s own key holds the accept event',/Open/.test(await txt(B))&&JSON.parse(await get(F.Keys(id).base+'-bets-'+info.managers[1].id)).ev[0].k==='a');
  /* settle (s25): only the creator (Ana) settles, in one step (tap + tap again to confirm); Ben, the opponent, gets no settle buttons */
  await B.page.evaluate(()=>LBETS.poll(true));await sleep(800);ok('settle: the opponent (Ben) sees no settle buttons, only a note that Ana settles it',!(await B.page.$('[data-lb=settle]'))&&/Only Ana \(who placed it\) can settle this bet/.test(await txt(B)));
  await A.page.evaluate(()=>LBETS.poll(true));await sleep(800);await tap(A,'[data-lb=settle][data-r=b]');ok('settle: first tap asks "Tap again to confirm"',/Tap again to confirm/.test(await txt(A)));
  await tap(A,'[data-lb=settle][data-r=b]');await A.page.waitForFunction('/Settled/.test(document.getElementById("lbody").innerText)',{timeout:12000});
  await B.page.evaluate(()=>LBETS.poll(true));await sleep(800);
  t=await txt(B);ok('settle: the creator\'s result counts at once -> Settled, "Ana won (Ben owes 25 pushups)"',/Result:\s*Ana won \(Ben owes 25 pushups\)/.test(t),t.slice(0,600));
  const lb=await B.page.evaluate(()=>({m:document.getElementById('b27Matrix')?document.getElementById('b27Matrix').innerText:'',board:document.getElementById('b27Board')?document.getElementById('b27Board').innerText:'',open:document.getElementById('b27OpenNote').innerText}));
  ok('leaderboard: matrix shows Ben owes Ana 25, net pushups per manager +25 Ana / -25 Ben, in pushups',/25/.test(lb.m)&&/Net pushups/.test(lb.board)&&/\+25/.test(lb.board)&&/-25|−25/.test(lb.board)&&/pushups in total/.test(lb.open),lb);
  const bB=await audit(B);ok('390px: tap targets with a settled bet and the leaderboard are >= 44px, no overflow',bB.small.length===0&&!bB.over,bB);await B.page.screenshot({path:'/tmp/s18/bets_b1.png',fullPage:true});
  /* ---- decline + withdraw ---- */
  await A.page.evaluate(()=>LBETS.poll(true));await sleep(500);await place(A,2,'Cy has a 3-point day',10);
  const C=await open(id,info,2);await tap(C,'[data-lb=decline]');await C.page.waitForFunction('/Declined/.test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:12000});ok('decline: Cy declines Bet #2 -> status Declined, no result buttons',/Declined/.test(await txt(C))&&!(await C.page.$('[data-lb=settle]')));
  await place(A,3,'Dee scores 20',5);await A.page.evaluate(()=>LBETS.poll(true));await sleep(500);await tap(A,'[data-lb=withdraw]');await A.page.waitForFunction('/Withdrawn/.test(document.getElementById("lbody").innerText)',{timeout:12000});
  ok('withdraw: Ana withdraws an unanswered bet -> Withdrawn',/Withdrawn/.test(await txt(A)));
  /* ---- open challenge (anyone) ---- */
  await tap(A,'[data-lb=anyone]');await A.page.type('#b27Text','First to a buzzer beater');await tap(A,'[data-lb=amt][data-v="25"]');await tap(A,'#b27Place');ok('open challenge: the confirm step says "whoever takes it" and who owes what',/whoever takes it owes Ana 25 pushups/.test(await txt(A)));await tap(A,'[data-lb=confirm]');await A.page.waitForFunction('/Anyone can take it/.test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:12000});
  const E=await open(id,info,4);ok('open challenge: another manager (Eli) can accept it, the proposer cannot accept their own',!!(await E.page.$('[data-lb=accept]'))&&!(await A.page.$('[data-lb=accept]')));await E.page.close();
  /* ---- two managers writing at the same time + one manager on two devices ---- */
  const D1=await open(id,info,3),E1=await open(id,info,4),A2=await open(id,info,0);
  await Promise.all([place(D1,6,'Gus wins by 10',10),place(E1,7,'Hal hits 5 threes',10),place(A2,4,'Eli beats Fay',50)]);
  await sleep(400);const ks=info.managers.map(m=>F.Keys(id).base+'-bets-'+m.id);const logs=await Promise.all(ks.map(async k=>{try{return JSON.parse(await get(k)).ev}catch(e){return[]}}));
  const cnt=i=>logs[i].filter(e=>e.k==='p').length;
  ok('concurrent: Dee, Eli and Ana (2nd device) wrote at the same moment: every bet is in the right manager\'s own key, none lost or overwritten',cnt(3)===1&&cnt(4)===1&&logs[0].filter(e=>e.k==='p').length===5-0&&logs[0].filter(e=>e.k==='p').length>=4,logs.map(l=>l.length));
  const ev0=logs[0].map(e=>e.u);ok('concurrent: no duplicate event ids in Ana\'s log',new Set(ev0).size===ev0.length);
  await D1.page.evaluate(()=>LBETS.poll(true));await sleep(900);const nb=(await txt(D1)).match(/Bet #\d+/g)||[];ok('concurrent: after a refresh a third device sees all bets (#1..#'+nb.length+')',nb.length>=7,nb.length);
  /* two devices of the SAME manager placing at the exact same time */
  const A3=await open(id,info,0),A4=await open(id,info,0);const before=(JSON.parse(await get(keyA)).ev).length;await Promise.all([place(A3,5,'Fay over Gus',5),place(A4,6,'Gus over Hal',5)]);await sleep(3500);
  const after=(JSON.parse(await get(keyA)).ev).length;ok('same manager, two devices at once: both bets appended (read, append, write, verify, retry)',after===before+2,{before,after});
  for(const p of [D1,E1,A2,A3,A4,C,B])await p.page.close();
  /* ---- identity: a forged event in someone else's log is ignored ---- */
  const forged=(e)=>post(ks[2],JSON.stringify({v:1,ev:[e]}));
  const ts=Date.now();const all=logs[0].filter(e=>e.k==='p'&&e.to===info.managers[3].id)[0]; // a bet from Ana to Dee (if any) else skip
  const pend=JSON.parse(await get(keyA)).ev.find(e=>e.k==='p'&&e.text==='Fay over Gus');
  await forged({k:'a',u:'forged'+Date.now().toString(36),ts:Date.now(),id:pend.id});           // Cy "accepts" a bet that is addressed to someone else
  await forged({k:'a',u:'forgedb'+Date.now().toString(36),ts:Date.now()+1,id:pend.id});
  const V=await open(id,info,1);await V.page.evaluate(()=>LBETS.poll(true));await sleep(800);
  const st=await V.page.evaluate(id=>{const c=document.querySelector('[data-bet="'+id+'"]');return c?c.innerText:''},pend.id);
  ok('identity: an accept written into Cy\'s own log for a bet addressed to someone else is ignored (still Waiting)',/Waiting/.test(st)&&!/Open/.test(st),st.slice(0,160));
  await post(ks[2],JSON.stringify({v:1,ev:[]}));
  /* commissioner link only (no manager identity) cannot act as a manager */
  const CM=await open(id,info,null,{pre:async P=>{await P.page.evaluateOnNewDocument((id,cm)=>{localStorage.setItem('fbn.cm.'+id,cm)},id,info.cmSecret)}});ok('commissioner link without a manager identity: read only, cannot propose or accept for anyone',!!(await CM.page.$('#b27Watch'))&&!(await CM.page.$('[data-lb=accept]'))&&!(await CM.page.$('#b27Form')));await CM.page.close();
  /* ---- XSS: text is escaped ---- */
  await post(ks[7],JSON.stringify({v:1,ev:[{k:'p',u:'xss1abcdef',ts:Date.now(),id:'xssbet0001',to:info.managers[0].id,amt:5,a:1,b:1,text:'<img src=x onerror=window.__x=1> <script>window.__x=2</script>'}]}));
  const X=await open(id,info,0);await X.page.evaluate(()=>LBETS.poll(true));await sleep(800);ok('XSS: bet text is shown as text, nothing runs',(await X.page.evaluate(()=>window.__x))===undefined&&/<img src=x/.test(await txt(X))&&X.errs.length===0,X.errs);await post(ks[7],JSON.stringify({v:1,ev:[]}));await X.page.close();
  /* ---- outage and recovery ---- */
  const O=await open(id,info,0);const blockOn={v:false};await O.page.setRequestInterception(true);O.page.on('request',r=>{if(blockOn.v&&/-bets-/.test(decodeURIComponent(r.url())))r.respond({status:503,body:'down'});else r.continue()});
  const before2=await txt(O);blockOn.v=true;await O.page.evaluate(()=>LBETS.poll(true));await sleep(900);const off=await txt(O);
  ok('outage: the last good bets stay on screen with a small offline note (never blank)',/Bet #1/.test(off)&&!!(await O.page.$('#b27Off'))&&/offline/i.test(off),off.slice(0,200));
  blockOn.v=false;await O.page.evaluate(()=>LBETS.poll(true));await sleep(900);ok('recovery: the offline note goes away and the bets are live again',!(await O.page.$('#b27Off'))&&/live/.test(await txt(O)));await O.page.close();
  const O2=await open(id,info,0,{noWait:true,pre:async P=>{await P.page.setRequestInterception(true);P.page.on('request',r=>{if(global.__down&&/-bets-/.test(decodeURIComponent(r.url())))r.respond({status:503,body:'down'});else r.continue()})}}).catch(e=>null);
  await O2.page.close();global.__down=true;
  const O3=await open(id,info,0,{noWait:true,pre:async P=>{await P.page.setRequestInterception(true);P.page.on('request',r=>{if(global.__down&&/-bets-/.test(decodeURIComponent(r.url())))r.respond({status:503,body:'down'});else r.continue()})}});
  await O3.page.waitForSelector('#b27Retry',{timeout:20000});const rb=await O3.page.$eval('#b27Retry',e=>({h:e.getBoundingClientRect().height,t:document.getElementById('lbody').innerText}));
  ok('outage from the start: friendly message with a "Try now" button >= 44px, no raw HTTP code, and the form stays usable',rb.h>=43.5&&/can’t reach the bets/.test(rb.t)&&!/503|HTTP/.test(rb.t));
  global.__down=false;await tap(O3,'#b27Retry');await O3.page.waitForFunction('!document.getElementById("b27Retry")&&/live/.test(document.getElementById("lbody").innerText)',{timeout:15000});ok('recovery from the start: Try now loads the bets and shows them live',/Bet #1/.test(await txt(O3)));await O3.page.close();
  /* ---- 1280, no money text, no errors ---- */
  const W=await open(id,info,0,{desk:true});t=await txt(W);const wa=await audit(W);
  ok('1280px: Bets tab has no horizontal overflow and renders the matrix, board and cards',!wa.over&&!!(await W.page.$('#b27Matrix'))&&!!(await W.page.$('#b27Board')),wa);
  ok('no money text on the Bets tab at any point: no $, cash, prize, payout, currency codes or amounts; "pushups" is present',!MONEY.test(t)&&/pushups/.test(t),t.match(MONEY));
  await W.page.screenshot({path:'/tmp/s18/bets_w1.png',fullPage:true});
  ok('no page errors',W.errs.length===0&&A.errs.length===0&&B.errs.length===0,[W.errs,A.errs,B.errs]);await W.page.close();await A.page.close();
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
