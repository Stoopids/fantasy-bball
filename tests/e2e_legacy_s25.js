/* s25 legacy settles: events without the v:25 marker keep the s24 rules (old bets are never reopened); new settles are creator-only. */
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
  const T0=Date.now()-4*864e5;let u=0;const ev=(k,o,dt)=>Object.assign({k,u:'lg'+(++u).toString().padStart(6,'0'),ts:T0+(dt||u*60e3)},o);
  const logs=[[],[],[],[],[],[],[],[]];const P_=(by,to,id_,text)=>{logs[by].push(ev('p',{id:id_,to:M[to],amt:10,a:1,b:1,text}));logs[to].push(ev('a',{id:id_}))};
  P_(0,1,'lbet000001','L1 lone report by Ben');logs[1].push(ev('s',{id:'lbet000001',r:'o'}));              // s24: Ben (not the creator) reported alone > 48 h ago -> settled by itself
  P_(0,1,'lbet000002','L2 both agreed, Ben first');logs[1].push(ev('s',{id:'lbet000002',r:'o'}));logs[0].push(ev('s',{id:'lbet000002',r:'o'}));  // s24: agreed -> settled
  P_(0,1,'lbet000003','L3 still open');                                                                     // open, no result yet
  P_(0,1,'lbet000004','L4 opened for a fresh creator settle');
  for(let i=0;i<8;i++)await post(key(i),{v:1,ev:logs[i]});
  const A=await open(id,info,0),B=await open(id,info,1);const card=(P,k)=>P.page.$eval('[data-bet="'+k+'"]',e=>e.innerText);
  const c1=await card(A,'lbet000001'),c2=await card(A,'lbet000002');
  ok('legacy lone report by the non-creator (Ben, no v marker) is still settled after the s25 load',/Settled/.test(c1)&&/Ben won/.test(c1),c1);
  ok('legacy agreed settle (non-creator first) is still settled',/Settled/.test(c2)&&/Ben won/.test(c2),c2);
  ok('no settle buttons on the legacy settled bets (not reopened)',!(await A.page.$('[data-lb=settle][data-id="lbet000001"]'))&&!(await A.page.$('[data-lb=settle][data-id="lbet000002"]')));
  /* new non-creator settle: refused in the UI ... */
  ok('opponent (Ben) sees no settle buttons on the open legacy bet',!(await B.page.$('[data-lb=settle][data-id="lbet000003"]')));
  await B.page.evaluate(()=>{const b=document.createElement('button');b.dataset.lb='settle';b.dataset.id='lbet000003';b.dataset.r='o';document.getElementById('lbody').appendChild(b);b.click();b.click()});await sleep(600);
  ok('new settle from the non-creator is refused, nothing written',/Only the manager who placed this bet can settle it/.test(await B.page.$eval('#b27Msg',e=>e.innerText))&&!(await evs(1)).some(e=>e.k==='s'&&e.id==='lbet000003'));
  /* ... and ignored by the list even if written straight into the log, with or without the marker */
  await post(key(1),{v:1,ev:(await evs(1)).concat([{k:'s',u:'nw000001',ts:Date.now(),id:'lbet000003',r:'o',v:25}])});await refresh(A);
  ok('a marked (v:25) settle in the non-creator\'s log is ignored: bet still open',!/Result:/.test(await card(A,'lbet000003')));
  await post(key(1),{v:1,ev:(await evs(1)).concat([{k:'s',u:'nw000002',ts:T0+3600e3,id:'lbet000003',r:'o'}])});await refresh(A);
  ok('an unmarked settle added after a marked event in that log (back-dated clock) is not treated as legacy: still open, not even "reported"',!/Result:|Earlier answer/.test(await card(A,'lbet000003'))&&!!(await A.page.$('[data-lb=settle][data-id="lbet000003"]')),await card(A,'lbet000003'));
  /* new creator settle works and carries the marker */
  await tap(A,'[data-lb=settle][data-id="lbet000004"][data-r="b"]');await tap(A,'[data-lb=settle][data-id="lbet000004"][data-r="b"]');await msg(A,'Settled');
  const s4=(await evs(0)).find(e=>e.k==='s'&&e.id==='lbet000004');
  ok('new creator settle works (Ana won) and is written with v:25',/Ana won/.test(await card(A,'lbet000004'))&&s4&&s4.v===25,s4);
  await refresh(B);ok('the opponent\'s page shows it settled too',/Ana won/.test(await card(B,'lbet000004')));
  ok('legacy settles unchanged after the new writes',/Ben won/.test(await card(B,'lbet000001'))&&/Ben won/.test(await card(B,'lbet000002')));
  await A.page.close();await B.page.close();
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
