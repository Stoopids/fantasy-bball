/* s28 R1 + R2 (reliability plan 2b): a slow textdb never auto-picks for anyone.
   R1: with every request taking 9 s, no page auto-picks at clock-out; after the store is healthy again (20 s) the clock-out auto-pick goes ahead.
   R2: a stuck on-clock slot (reads 500) is never auto-picked for clock-out (s27c went ahead after 15 s); an away seat keeps the 15 s hold, then the backup spot.
   Pages at 390 and 1280. Uses /__cfg on its own mock server (APP/API env; CFG = api origin). */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const CFG=process.env.CFG||API.replace(/\/api\/data\/$/,'');
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}};
const cfg=q=>fetch(CFG+'/__cfg?'+q).then(r=>r.text());
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const ONLY=process.env.ONLY||'r1,r2';
async function pages(id,I,m,opt){const out=[];for(const w of [390,1280]){const who=w===390?I.managers.find(x=>x.id===m.order[0]):I.managers.find(x=>x.id===m.order[1]);
  const P=await L.phone('p'+w,w>700?{desktop:true,w,h:900}:{});await P.page.setBypassServiceWorker(true);await P.page.evaluateOnNewDocument((id,mm,off)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:mm.id,k:mm.k}));if(off)localStorage.setItem('fbn.healthOff','1')},id,who,!!opt.healthOff);
  await P.go('room.html?l='+id+'&stay=1');out.push(P)}return out}
const rem=P=>P.page.evaluate(()=>{const e=document.getElementById('cdv');if(!e)return null;const [m,s]=e.firstChild.nodeValue.split(':');return +m*60+ +s}).catch(()=>null);
const pick1=async(K,ep)=>{const e=await gj(K.pick(ep,1)).catch(()=>null);if(e&&e.tid)return e;for(const a of [1,2,3]){const x=await gj(K.pick(ep,1)+'-a'+a).catch(()=>null);if(x&&x.tid)return x}return null};
(async()=>{try{await cfg('clear=1');
 if(ONLY.includes('r1')){const id=await seed(API,{managers:8,rounds:4,live:true,clockSecs:30,picksMade:0});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);m.resumeAt=Date.now();await post(K.meta,m);
  const Ps=await pages(id,I,m,{});await sleep(4000);for(let t=0;t<60;t++){const r=await rem(Ps[0]);if(r!=null&&r<=10)break;await sleep(500)}
  await cfg('lat=9000');const tS=Date.now();await sleep(16000);
  const h=await Ps.map(P=>P.page.evaluate(()=>window.FBN_health&&window.FBN_health().stalled));const hs=await Promise.all(h);ok('R1: both pages (390, 1280) report a stall while every request takes 9 s',hs.every(Boolean),hs);
  await sleep(10000);await cfg('lat=0');const e0=await pick1(K,m.epoch);ok('R1: clock ran out ~16 s ago under the slow store: nobody auto-picked',!e0,e0);
  const tC=Date.now();let e=null;for(let t=0;t<90&&!e;t++){await sleep(1000);e=await pick1(K,m.epoch)}const dt=(Date.now()-tC)/1000;
  ok('R1: after the store is healthy again the clock-out auto-pick goes ahead (20-45 s)',!!e&&dt>=15&&dt<=50,{dt,by:e&&e.by});
  for(const P of Ps){ok('R1 '+P.name+': no page errors',!P.errs.length,P.errs);await P.close()}}
 if(ONLY.includes('r2')){await cfg('clear=1');const id=await seed(API,{managers:8,rounds:4,live:true,clockSecs:30,picksMade:0});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);m.resumeAt=Date.now()-25000;await post(K.meta,m);
  const key=K.pick(m.epoch,1);await cfg('fail='+encodeURIComponent(key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')+'&failm=GET&code=500');
  const Ps=await pages(id,I,m,{healthOff:true});await sleep(5000);
  const sb=await Ps[0].page.evaluate(()=>/stuck/i.test(document.body.innerText));ok('R2: Pick stuck bar shown',sb);
  await sleep(40000);let e=await pick1(K,m.epoch);ok('R2: stuck slot, clock out for ~40 s (past the old 15 s go-ahead): never auto-picked',!e,e);
  await Ps[1].page.screenshot({path:(process.env.SHOTDIR||'/tmp')+'/s28_stuck_noauto_1280.png'});await Ps[0].page.screenshot({path:(process.env.SHOTDIR||'/tmp')+'/s28_stuck_noauto_390.png'});
  const mm=await gj(K.meta);mm.over[m.order[0]]={away:true};await post(K.meta,mm);const tA=Date.now();
  for(let t=0;t<60&&!e;t++){await sleep(1000);e=await pick1(K,m.epoch)}ok('R2: an away seat on the same stuck slot is still picked for (15 s hold, backup spot)',!!e,{dt:(Date.now()-tA)/1000});
  await cfg('clear=1');for(const P of Ps){ok('R2 '+P.name+': no page errors',!P.errs.filter(x=>!/500/.test(x)).length,P.errs);await P.close()}}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await cfg('clear=1').catch(()=>{});await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
