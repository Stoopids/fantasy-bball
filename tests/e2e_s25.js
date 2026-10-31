/* s25 Bets: creator-only settle, save race (re-read + re-merge, "Placed!" only after confirmation, lost write), bet text reading, proposed result from a
   mocked scores feed (creator-only Confirm / Fix, nothing settles on its own, stale feed = manual), settle sound hooks + mute, settle pop-up, widths.
   node tests/e2e_s25.js  (APP / API env, mock store). Screenshots to SHOTS (default /workspace/league-site-work/compare-s25). */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const F=require('../js/core.js');
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s25';require('fs').mkdirSync(SH,{recursive:true});
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const base=process.env.API||'http://localhost:9996/api/data/';const MONEY=/\b(wager\w*|payout|prize|cash|money|dollars?|lottery|jackpot|gambl\w*|USD|IDR|Rp)\b|\$\s?\d/i;
const get=async k=>(await fetch(base+encodeURIComponent(k))).text();const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const FEED={mode:'final',ev:[]};   // the mocked ESPN scoreboard
async function open(id,info,i,o){o=o||{};const P=await L.phone('t'+Math.random().toString(36).slice(2,6),o.w?{desktop:o.w>=1000,w:o.w,h:900}:{});
  if(o.rm)await P.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  if(i!=null)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[i].id,k:info.managers[i].k});
  await P.page.evaluateOnNewDocument(()=>{window.__msgs=[];document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{const m=document.getElementById('b27Msg');const t=m?m.innerText.split('\n')[0]:'';if(t&&window.__msgs[window.__msgs.length-1]!==t)window.__msgs.push(t)}).observe(document.body,{childList:true,subtree:true,characterData:true})})});
  await P.page.setRequestInterception(true);P.hook=null;
  P.page.on('request',r=>{const u=r.url();if(/site\.api\.espn\.com\/.*scoreboard/.test(u)){FEED.hits=(FEED.hits||0)+1;if(FEED.mode==='down')return r.respond({status:503,body:'x'});return r.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({events:FEED.ev})})}
    if(/espn/.test(u))return r.respond({status:404,body:''});if(P.hook&&P.hook(r))return;r.continue().catch(()=>{})});
  await P.go('league.html?l='+id+'#bets');await P.page.waitForSelector('#b27Head',{timeout:25000});await P.page.waitForFunction('!/Connecting/.test(document.getElementById("b27Top").innerText)',{timeout:20000});return P}
const txt=P=>P.page.$eval('#lbody',e=>e.innerText);
const tap=async(P,sel)=>{await P.page.waitForSelector(sel,{timeout:8000});await P.page.evaluate(s=>{const e=document.querySelector(s);e.scrollIntoView({block:'center'});e.click()},sel);await sleep(200)};
const msg=(P,re,t)=>P.page.waitForFunction('new RegExp('+JSON.stringify(re)+').test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:t||15000});
const refresh=async P=>{await P.page.evaluate(()=>LBETS.poll(true));await sleep(700)};
const fill=async(P,mid,text)=>{await P.page.evaluate(()=>scrollTo(0,0));await tap(P,'[data-lb=oppclear]');await tap(P,'[data-lb=opp][data-mid="'+mid+'"]');await P.page.$eval('#b27Text',e=>{e.value=''});await P.page.type('#b27Text',text);await tap(P,'[data-lb=amt][data-v="10"]');await tap(P,'#b27Place')};
const place=async(P,mid,text)=>{await fill(P,mid,text);await tap(P,'[data-lb=confirm]');await msg(P,'Placed')};
const betId=(P,re)=>P.page.$$eval('[data-bet]',(cs,re)=>{const c=cs.find(c=>new RegExp(re).test(c.innerText));return c&&c.dataset.bet},re);
const over=(P,w)=>P.page.evaluate(w=>({sw:document.documentElement.scrollWidth,iw:innerWidth,ok:document.documentElement.scrollWidth<=w&&innerWidth<=w}),w);
(async()=>{try{
  const id=await seed();const info=seed.info;const M=info.managers.map(m=>m.id);const key=i=>F.Keys(id).base+'-bets-'+M[i];const evs=async i=>{const t=await get(key(i));return t?JSON.parse(t).ev:[]};
  /* ---- 1. reading the bet text ---- */
  const A=await open(id,info,0);
  const R=await A.page.evaluate(()=>{const r=LBETS._t.readBet,c=LBETS._t.claimText;const T=['Kansas beats Duke','KU over DUKE','Duke loses to Kansas','Florida -6.5 vs Miami +6.5','Over 159.5, Kentucky v UNC','Kentucky vs North Carolina under 140','Kansas beats Duke by more than 5','Kansas beats Duke by 5 or more points',
    'Kansas beats Duke by 5','Duke wins the title','Kansas beats Duke in the first half','Kansas beats Kansas','Cooper Flagg scores 20','Somebody beats Duke'];return T.map(t=>[t,r(t)?c(r(t)):null])});
  const clear=R.slice(0,8),unclear=R.slice(8);
  ok('clear texts are read (win, loses to, margin -6.5, over/under, by more than, by N or more)',clear.every(x=>x[1])&&clear[0][1]==='Kansas beats Duke'&&clear[2][1]==='Kansas beats Duke'&&/Florida beats Miami by more than 6\.5/.test(clear[3][1])&&/^Over 159\.5 total points in Kentucky vs North Carolina$/.test(clear[4][1])&&/Under 140 .*exactly 140 = wash/.test(clear[5][1]),clear);
  ok('unclear texts stay manual (plain "by 5", a title, first half, same team twice, a player, one team)',unclear.every(x=>x[1]===null),unclear);
  const J=await A.page.evaluate(()=>{const j=LBETS._t.judge;return[j({t:'win',a:'1',b:'2'},78,71),j({t:'win',a:'1',b:'2'},70,71),j({t:'margin',a:'1',b:'2',l:6.5,op:'line'},78,71),j({t:'margin',a:'1',b:'2',l:7,op:'line'},78,71),j({t:'margin',a:'1',b:'2',l:7,op:'gt'},78,71),j({t:'margin',a:'1',b:'2',l:7,op:'ge'},78,71),j({t:'total',a:'1',b:'2',l:149,s:'o'},78,71),j({t:'total',a:'1',b:'2',l:140.5,s:'u'},78,71)]});
  ok('judging a final: win/loss, half line, whole line = wash, more than / or more, over-under wash',J.join()==='b,o,b,p,o,b,p,o',J);
  await fill(A,M[1],'Kansas beats Duke');const rc=await A.page.$eval('#b27ReadAs',e=>e.innerText);ok('confirm step shows "We read this as: Kansas beats Duke" with Confirm and Change',/^We read this as: Kansas beats Duke\./.test(rc)&&!!(await A.page.$('[data-lb=confirm]'))&&!!(await A.page.$('[data-lb=edit]')),rc);
  await A.page.evaluate(()=>document.getElementById('b27Confirm').scrollIntoView({block:'center'}));await sleep(200);await A.page.screenshot({path:SH+'/s25_readas_390.png'});
  await tap(A,'[data-lb=edit]');await A.page.$eval('#b27Text',e=>{e.value=''});await A.page.type('#b27Text','Duke wins the title');await tap(A,'#b27Place');
  ok('unclear text: "We can’t read this one automatically, so you’ll settle it by hand."',/can’t read this one automatically/.test(await A.page.$eval('#b27ReadAs',e=>e.innerText)));
  await A.page.screenshot({path:SH+'/s25_readas_unclear_390.png'});
  await tap(A,'[data-lb=edit]');await A.page.$eval('#b27Text',e=>{e.value=''});await A.page.type('#b27Text','Kansas beats Duke');await tap(A,'#b27Place');await tap(A,'[data-lb=confirm]');await msg(A,'Placed');
  const p1=(await evs(0)).find(e=>e.k==='p'&&e.text==='Kansas beats Duke');ok('the place event carries the claim c {t:win, a:2305 (Kansas), b:150 (Duke)}',p1&&p1.c&&p1.c.t==='win'&&p1.c.a==='2305'&&p1.c.b==='150',p1);
  /* ---- 2. save race ---- */
  ok('"Placed!" only after "Saving…" (message order)',(await A.page.evaluate(()=>{const m=window.__msgs;const s=m.findIndex(x=>/^Saving/.test(x)),p=m.findIndex(x=>/^Placed!/.test(x));return s>=0&&p>s})));
  {const kA=encodeURIComponent(key(0));let drop=1;A.hook=r=>{if(drop>0&&r.method()==='POST'&&r.url().includes(kA)){drop--;r.respond({status:200,contentType:'text/plain',body:'ok'});return true}return false};
    await A.page.evaluate(()=>{window.__msgs=[]});await place(A,M[2],'Lost write test one');
    ok('lost write (first save answered OK but never stored): re-read finds it missing, saves again, then "Placed!"; the bet is in the store',(await evs(0)).some(e=>e.text==='Lost write test one')&&drop===0);
    /* clobbered after the read-back (another phone of mine writes an old copy over it): the confirm re-read puts it back before "Placed!" */
    let clob=1;const snap=await get(key(0));A.hook=r=>{if(clob>0&&r.method()==='POST'&&r.url().includes(kA)){clob--;r.continue().then(()=>setTimeout(()=>post(key(0),snap),250)).catch(()=>{});return true}return false};
    await A.page.evaluate(()=>{window.__msgs=[];window.__placedAt=null;new MutationObserver(()=>{const m=document.getElementById('b27Msg');if(m&&/^Placed!/.test(m.innerText)&&!window.__placedAt)window.__placedAt=Date.now()}).observe(document.body,{childList:true,subtree:true})});
    await place(A,M[2],'Clobbered write test');const inStore=(await evs(0)).some(e=>e.text==='Clobbered write test');
    ok('write clobbered after its read-back: "Placed!" only after the re-read confirms it, the bet is in the store',inStore&&clob===0,inStore);
    let fail=999;A.hook=r=>{if(fail>0&&r.method()==='POST'&&r.url().includes(kA)){fail--;r.respond({status:200,contentType:'text/plain',body:'ok'});return true}return false};
    await A.page.evaluate(()=>{window.__msgs=[]});await fill(A,M[2],'Never lands');await tap(A,'[data-lb=confirm]');await msg(A,'Couldn’t save',30000);
    const ms=await A.page.evaluate(()=>{const m=window.__msgs;return m.slice(m.findIndex(x=>/^Saving/.test(x)))});ok('every write lost: an error, never "Placed!"',ms.length>1&&!ms.some(x=>/Placed!/.test(x))&&!(await evs(0)).some(e=>e.text==='Never lands'),ms);
    await A.page.evaluate(()=>document.getElementById('b27Msg').scrollIntoView({block:'center'}));await A.page.screenshot({path:SH+'/s25_save_error_390.png'});
    A.hook=null;await tap(A,'[data-lb=edit]').catch(()=>{});await A.page.$eval('#b27Text',e=>{e.value=''}).catch(()=>{})}
  {const A2=await open(id,info,0);const n0=(await evs(0)).filter(e=>e.k==='p').length;
    await fill(A,M[3],'Race phone one');await fill(A2,M[4],'Race phone two');
    await Promise.all([A.page.evaluate(()=>document.querySelector('[data-lb=confirm]').click()),A2.page.evaluate(()=>document.querySelector('[data-lb=confirm]').click())]);
    await Promise.all([msg(A,'Placed',30000),msg(A2,'Placed',30000)]);await sleep(2500);const ev=await evs(0);
    ok('two phones of the same manager save at the same moment: both bets are in the store',ev.some(e=>e.text==='Race phone one')&&ev.some(e=>e.text==='Race phone two')&&ev.filter(e=>e.k==='p').length===n0+2,ev.filter(e=>e.k==='p').map(e=>e.text));await A2.page.close()}
  /* ---- 3. creator-only settle ---- */
  const kb=await betId(A,'Kansas beats Duke');const B=await open(id,info,1);await tap(B,'[data-lb=accept][data-id="'+kb+'"]');await msg(B,'Accepted');
  await refresh(B);ok('opponent (Ben): no settle or Confirm buttons, a note says only Ana settles',!(await B.page.$('[data-lb=settle]'))&&!(await B.page.$('[data-lb=autook]'))&&/Only Ana \(who placed it\)/.test(await txt(B)));
  const W=await open(id,info,null);const C=await open(id,info,2);ok('watcher and another manager (Cy): no settle buttons',!(await W.page.$('[data-lb=settle]'))&&!(await C.page.$('[data-lb=settle]')));await W.page.close();await C.page.close();
  await B.page.evaluate(kb=>{const b=document.createElement('button');b.dataset.lb='settle';b.dataset.id=kb;b.dataset.r='o';b.id='forge';document.getElementById('lbody').appendChild(b);b.click();b.click()},kb);await sleep(600);
  ok('forced settle from the opponent\'s page is refused with a message, nothing written',/Only the manager who placed this bet can settle it/.test(await B.page.$eval('#b27Msg',e=>e.innerText))&&!(await evs(1)).some(e=>e.k==='s'));
  await post(key(1),{v:1,ev:(await evs(1)).concat([{k:'s',u:'forgeds01',ts:Date.now(),id:kb,r:'o'}])});await refresh(A);await refresh(B);
  ok('a settle event written straight into the opponent\'s log is ignored (bet still open)',!/Result:/.test(await A.page.$eval('[data-bet="'+kb+'"]',e=>e.innerText)));
  /* ---- 4. proposal from the mocked feed ---- */
  FEED.mode='down';await A.page.reload();await A.page.waitForSelector('[data-bet="'+kb+'"]',{timeout:20000});await sleep(2000);
  let ct=await A.page.$eval('[data-bet="'+kb+'"]',e=>e.innerText);ok('feed down: "Scores can’t be read right now: settle it by hand." and the manual Who won? buttons',/Scores can’t be read right now/.test(ct)&&!!(await A.page.$('[data-bet="'+kb+'"] [data-lb=settle]')),ct);
  FEED.mode='final';FEED.ev=[{id:'401700001',date:new Date().toISOString(),competitions:[{status:{type:{name:'STATUS_IN_PROGRESS',completed:false}},competitors:[{team:{id:'2305'},score:'40'},{team:{id:'150'},score:'38'}]}]}];
  await A.page.reload();await A.page.waitForSelector('[data-bet="'+kb+'"]',{timeout:20000});await sleep(2000);
  ok('game not final yet: "No final score yet", no proposal',/No final score yet/.test(await A.page.$eval('[data-bet="'+kb+'"]',e=>e.innerText))&&!(await A.page.$('[data-lb=autook]')));
  FEED.ev[0].competitions[0].status.type={name:'STATUS_FINAL',completed:true};FEED.ev[0].competitions[0].competitors[0].score='78';FEED.ev[0].competitions[0].competitors[1].score='71';
  await A.page.reload();await A.page.waitForSelector('[data-bet="'+kb+'"] [data-lb=autook]',{timeout:15000});
  ct=await A.page.$eval('[data-bet="'+kb+'"]',e=>e.innerText);
  ok('creator sees "Final: Kansas 78, Duke 71", "Proposed result: Ana won", Confirm + Fix, "Nothing is settled until you confirm."',/Final: Kansas 78, Duke 71/.test(ct)&&/Proposed result: Ana won/.test(ct)&&!!(await A.page.$('[data-bet="'+kb+'"] [data-lb=autofix]'))&&/Nothing is settled until you confirm/.test(ct),ct);
  await A.page.evaluate(kb=>{document.querySelector('[data-bet="'+kb+'"]').scrollIntoView({block:'center'})},kb);await sleep(200);await A.page.screenshot({path:SH+'/s25_proposal_creator_390.png'});
  const Bp=await open(id,info,1);await Bp.page.waitForFunction(kb=>/Final: Kansas 78/.test((document.querySelector('[data-bet="'+kb+'"]')||{}).innerText||'')||true,{timeout:3000},kb).catch(()=>{});await sleep(800);
  ct=await Bp.page.$eval('[data-bet="'+kb+'"]',e=>e.innerText);ok('opponent: no Confirm / Fix (proposal is only checked on the creator\'s page)',!(await Bp.page.$('[data-lb=autook]'))&&!(await Bp.page.$('[data-lb=autofix]')),ct);
  await Bp.page.evaluate(kb=>{const b=document.createElement('button');b.dataset.lb='autook';b.dataset.id=kb;b.dataset.r='o';document.getElementById('lbody').appendChild(b);b.click();b.click()},kb);await sleep(500);
  ok('forced Confirm from the opponent\'s page is refused',/Only the manager who placed this bet can confirm/.test(await Bp.page.$eval('#b27Msg',e=>e.innerText))&&!(await evs(1)).some(e=>e.k==='s'&&e.u!=='forgeds01'));await Bp.page.close();
  await sleep(3000);await refresh(A);ok('nothing settles on its own: after the final + waiting, no settle event from Ana, bet still open',!(await evs(0)).some(e=>e.k==='s')&&!/Result:/.test(await A.page.$eval('[data-bet="'+kb+'"]',e=>e.innerText)));
  for(const w of [320,360,390,1280]){const P=await open(id,info,0,{w});await P.page.waitForSelector('[data-lb=autook]',{timeout:15000});const o=await over(P,w);ok(w+'px: creator with a proposal: no overflow',o.ok,o);await P.page.close()}
  /* Fix -> manual buttons */
  await tap(A,'[data-bet="'+kb+'"] [data-lb=autofix]');ok('Fix: the manual Who won? buttons appear instead of Confirm',!!(await A.page.$('[data-bet="'+kb+'"] [data-lb=settle]'))&&!(await A.page.$('[data-bet="'+kb+'"] [data-lb=autook]')));
  await A.page.reload();await A.page.waitForSelector('[data-bet="'+kb+'"] [data-lb=autook]',{timeout:15000});
  /* ---- 5. sound (shared synth), mute, pop-up (shared memes) ---- */
  ok('shared meme captions: Called it. / Oof. / Nobody wins. Nobody learns.',JSON.stringify(await A.page.evaluate(()=>['win','loss','wash'].map(k=>S25.MEMES[k].cap)))===JSON.stringify(['Called it.','Oof.','Nobody wins. Nobody learns.']));
  const s0=await A.page.evaluate(()=>LBETS._t.settleSound('win'));{const Pf=await open(id,info,0);const sf=await Pf.page.evaluate(()=>{Object.defineProperty(navigator,'userActivation',{configurable:true,get:()=>({hasBeenActive:false,isActive:false})});return LBETS._t.settleSound('win')});ok('no sound before any user gesture ("nogesture"; puppeteer evaluate counts as a gesture, so the activation is stubbed)',sf==='nogesture',sf);await Pf.page.close()}
  ok('shared file loaded (S25 synth + memes); after the earlier taps on this page the synth plays',s0==='played'&&(await A.page.evaluate(()=>!!(window.S25&&S25.synth&&S25.MEMES&&S25.MEMES.win))),s0);
  await A.page.evaluate(()=>{window.__played=[];const o=S25.synth;S25.synth=function(ctx,k){__played.push(k+(ctx&&typeof ctx.createOscillator==='function'?'':'?'));return o.apply(this,arguments)}});
  await tap(A,'[data-bet="'+kb+'"] [data-lb=autook]');ok('first Confirm tap asks "Tap again to confirm" (nothing written yet)',/Tap again to confirm/.test(await A.page.$eval('[data-bet="'+kb+'"]',e=>e.innerText))&&!(await evs(0)).some(e=>e.k==='s'));
  await tap(A,'[data-bet="'+kb+'"] [data-lb=autook]');await msg(A,'Settled from the final score');await sleep(2500);
  {const pp=await A.page.evaluate(()=>({pop:!!document.getElementById('b27Pop'),dlg:document.querySelectorAll('[role=dialog]').length,img:document.querySelectorAll('img[src^="data:image/svg"]').length,played:window.__played.slice()}));
   ok('Confirm settles: NO pop-up or meme (POPUPS=false, shelved), and the shared win synth still played after the tap',!pp.pop&&pp.dlg===0&&pp.img===0&&pp.played.join()==='win',pp)}
  ok('settlePop is switched off: calling it directly shows nothing',await A.page.evaluate(()=>{LBETS._t.settlePop('win');LBETS._t.settlePop('loss');LBETS._t.settlePop('wash');return !document.getElementById('b27Pop')}));
  const se=(await evs(0)).find(e=>e.k==='s'&&e.id===kb);ok('settle event from the creator with src {g, sc}',se&&se.r==='b'&&se.src&&se.src.g==='401700001'&&/Kansas 78, Duke 71/.test(se.src.sc),se);
  ct=await A.page.$eval('[data-bet="'+kb+'"]',e=>e.innerText);ok('card: Result: Ana won ... · from the final score: Kansas 78, Duke 71',/Result: Ana won .*from the final score: Kansas 78, Duke 71/.test(ct),ct);
  await A.page.evaluate(kb=>{document.querySelector('[data-bet="'+kb+'"]').scrollIntoView({block:'center'})},kb);await sleep(200);await A.page.screenshot({path:SH+'/s25_settled_from_score_390.png'});
  {const P=await open(id,info,0,{w:320,rm:true});const r=await P.page.evaluate(()=>{LBETS._t.settlePop('loss');return{pop:!!document.getElementById('b27Pop'),snd:LBETS._t.settleSound('loss'),sw:document.documentElement.scrollWidth}});
    ok('320px + reduced motion: no pop-up, no sound under reduced motion, no overflow',!r.pop&&r.snd==='reduced'&&r.sw<=320,r);await P.page.close()}
  await tap(A,'#b27Snd');ok('mute toggle: off, saved in localStorage, hook returns "muted"',(await A.page.evaluate(()=>localStorage.getItem('fbn.x.sndmute')))==='1'&&/Settle sounds: off/.test(await A.page.$eval('#b27Snd',e=>e.innerText))&&(await A.page.evaluate(()=>LBETS._t.settleSound('win')))==='muted');
  await A.page.reload();await A.page.waitForSelector('#b27Snd',{timeout:20000});ok('mute persists after reload',/Settle sounds: off/.test(await A.page.$eval('#b27Snd',e=>e.innerText)));
  await A.page.evaluate(()=>document.getElementById('b27Snd').scrollIntoView({block:'center'}));await sleep(200);await A.page.screenshot({path:SH+'/s25_sound_toggle_390.png'});await tap(A,'#b27Snd');
  ok('unmute: toggle back on, the synth plays again',(await A.page.evaluate(()=>localStorage.getItem('fbn.x.sndmute')))!=='1'&&/Settle sounds: on/.test(await A.page.$eval('#b27Snd',e=>e.innerText))&&(await A.page.evaluate(()=>LBETS._t.settleSound('win')))==='played');
  /* ---- 7. reactions: replaced in s25c by the shared S25.renderReactions row; covered by tests/e2e_shared_s25c.js ---- */
  /* ---- 8. card grid ---- */
  for(const [w,cols] of [[320,1],[390,1],[699,1],[700,2],[1280,2],[1600,3]]){const P=await open(id,info,0,{w});const g=await P.page.evaluate(()=>{const c=[...document.querySelectorAll('#b27Grid > [data-bet]')];return{n:c.length,lefts:[...new Set(c.map(x=>Math.round(x.getBoundingClientRect().left)))].length,sw:document.documentElement.scrollWidth}});
    ok(w+'px: bet cards in '+cols+' column(s), no overflow',g.lefts===Math.min(cols,g.n)&&g.sw<=w,g);if(w===1600)await P.page.screenshot({path:SH+'/s25_grid_1600.png'});if(w===1280)await P.page.screenshot({path:SH+'/s25_grid_1280.png'});await P.page.close()}
  /* ---- 6. tagline + widths + wording ---- */
  const tg=await A.page.$eval('#tag',e=>e.innerText);ok('header tagline is the single placeholder line',tg==="Eight managers. One season. Let's play.",tg);
  for(const w of [320,360,390,1280]){const P=await open(id,info,1,{w});const o=await over(P,w);const t=await txt(P);ok(w+'px: Bets (opponent view) no overflow, no money words',o.ok&&!MONEY.test(t),o);await P.page.close()}
  await B.page.evaluate(kb=>{document.querySelector('[data-bet="'+kb+'"]')&&document.querySelector('[data-bet="'+kb+'"]').scrollIntoView({block:'center'})},kb);await refresh(B);await B.page.screenshot({path:SH+'/s25_opponent_no_settle_390.png'});
  ok('no page errors',A.errs.length===0&&B.errs.length===0,[A.errs,B.errs]);
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
