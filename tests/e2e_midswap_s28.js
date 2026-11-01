/* SWAP_CMD (required env): a shell command the test runs mid-draft (after pick 30) that replaces the files the mock app server is serving
   with the NEW build. Base build it needs: the mock server must start serving a scratch copy of s27c (FBN_BUILD 2026-11-01s27c); SWAP_CMD must
   overwrite that copy with s28 (FBN_BUILD 2026-11-02s28). Example:
     cp -a ../s27 /tmp/swapsite && node tools/mock_textdb.js 23195 /tmp/swapsite 23196 &
     APP=http://localhost:23195 API=http://localhost:23196/api/data/ SWAP_CMD='cp -a /workspace/fantasy-bball-releases/s28/. /tmp/swapsite/' node tests/e2e_midswap_s28.js
   Never point SWAP_CMD at a release folder being served for real. See tests/README.md. */
/* Mid-draft swap: pages open at 390 (manager) and 1280 (manager + spectator) on s26c16d; picks 1-30 land; the served files are swapped to s27c (SWAP_CMD);
   the 1280 manager reloads (new build), the 390 manager and the spectator keep the old page; picks 31-63 land; pick 64 made in the UI on the NEW page.
   Checks: 64 entries, no duplicate teams, meta complete + endedAt, every page shows FINAL 64 of 64, builds as expected, no page errors. Service worker NOT bypassed. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,API}=L;const {execSync}=require('child_process');
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const get=async k=>{const r=await fetch(API+encodeURIComponent(k));return r.ok?r.text():''};const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
(async()=>{try{
  const id=await seed(null,{rounds:8,live:true,picksMade:0});const I=seed.info;const K=F.Keys(id);const meta=F.normalizeMeta(F.parseJ(await get(K.meta)));
  const ord=meta.order;const owner=k=>{const r=Math.floor((k-1)/8),i=(k-1)%8;return r%2===0?ord[i]:ord[7-i]};
  const fs=require('fs');const s=fs.readFileSync(__dirname+'/../assets/teams.js','utf8');const TD=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));const teams=TD.teams.map(t=>String(t[0]));
  let prev='';const put=async k=>{const e=F.makeEntry(k,owner(k),teams[k+10],{now:Date.now(),epoch:meta.epoch||1,writer:'swaptest',by:'owner',prev});prev=e.id;await post(K.pick(meta.epoch||1,k),e)};
  const mgr=mid=>I.managers.find(m=>m.id===mid);const last=mgr(owner(64)),m390=I.managers.find(m=>m.id!==last.id);
  const open=async(nm,opt,me,q)=>{const P=await L.phone(nm,opt);if(me)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,me);await P.go('room.html?l='+id+(q||'')+'#tab=board');return P};
  const A=await open('old390',{},m390,'&stay=1');const B=await open('new1280',{desktop:true,w:1280,h:900},last,'&stay=1');const C=await open('spec1280',{desktop:true,w:1280,h:900},null,'&watch=1&stay=1');
  await sleep(6000);const bld=P=>P.page.evaluate(()=>window.FBN_BUILD);ok('all start on s26c16d',(await bld(A))==='2026-11-01s27c'&&(await bld(B))==='2026-11-01s27c'&&(await bld(C))==='2026-11-01s27c',[await bld(A),await bld(B),await bld(C)]);
  for(let k=1;k<=30;k++){await put(k);await sleep(120)}await sleep(8000);
  const cnt=P=>P.page.evaluate(()=>document.querySelectorAll('#board td .tn, #board .pk .tn').length||((document.getElementById('banner')||{}).innerText||'').match(/Pick #(\d+)/)?.[1]);
  ok('before swap: banner at pick #31 on all pages',(await Promise.all([A,B,C].map(P=>P.page.evaluate(()=>/#31\b/.test(document.getElementById('banner').innerText))))).every(Boolean));
  execSync(process.env.SWAP_CMD);console.log('   swapped files');
  await B.page.reload({waitUntil:'domcontentloaded'});await sleep(3000);await B.page.reload({waitUntil:'domcontentloaded'});await sleep(6000);
  ok('reloaded 1280 page runs s28',(await bld(B))==='2026-11-02s28',await bld(B));ok('unreloaded 390 + spectator still run s26c16d in memory',(await bld(A))==='2026-11-01s27c'&&(await bld(C))==='2026-11-01s27c');
  ok('reloaded page shows the same board (pick #31 next)',await B.page.evaluate(()=>/#31\b/.test(document.getElementById('banner').innerText)));
  for(let k=31;k<=63;k++){await put(k);await sleep(120)}await sleep(9000);
  if(process.env.DBG){const ks=[];for(let k=28;k<=64;k++)ks.push(k+':'+((await get(K.pick(meta.epoch||1,k)))?1:0));console.log(ks.join(' '));for(const P of [A,B,C])console.log(P.name,(await P.page.evaluate(()=>document.getElementById('banner').innerText)).replace(/\n/g,' | ').slice(0,160),JSON.stringify(await P.page.evaluate(()=>window.__toasts.slice(-4))))}
  ok('all pages at pick #64 (old + new)',(await Promise.all([A,B,C].map(P=>P.page.evaluate(()=>/#64\b/.test(document.getElementById('banner').innerText))))).every(Boolean));
  const W=async(P,f,ms)=>{for(let t=0;t<ms;t+=250){if(await P.page.evaluate(f).catch(()=>false))return true;await sleep(250)}return false};
  await W(B,()=>!!document.getElementById('pickbtn'),15000);await B.page.evaluate(()=>document.getElementById('pickbtn').click());
  await W(B,()=>!!document.querySelector('#pickov .trow.go .dbtn'),8000);await B.page.evaluate(()=>document.querySelector('#pickov .trow.go .dbtn').click());
  const cp=await W(B,()=>!!document.getElementById('confirmpick'),5000);if(cp)await B.page.evaluate(()=>document.getElementById('confirmpick').click());ok('pick #64 made in the UI on the s27c page',cp);
  let m;for(let i=0;i<50;i++){await sleep(500);m=F.normalizeMeta(F.parseJ(await get(K.meta)));if(m.status==='complete')break}
  ok('meta complete, endedAt set, not ended early',m.status==='complete'&&+m.endedAt>0&&!m.endedEarly,{s:m.status,e:m.endedAt});
  const es=[];for(let k=1;k<=65;k++){const t=await get(K.pick(meta.epoch||1,k));es.push(t?F.parseEntry(t):null)}
  ok('exactly 64 entries, no #65',es.slice(0,64).every(Boolean)&&!es[64]);ok('no duplicate teams',new Set(es.slice(0,64).map(e=>e&&e.tid)).size===64);
  await sleep(6000);
  for(const P of [A,B,C]){const f=await P.page.evaluate(()=>{const e=document.getElementById('finallbl');return e?e.innerText:''}).catch(()=>'');ok(P.name+': FINAL 64 of 64 shown, still on room.html',/64 of 64/.test(f)&&/room\.html/.test(P.page.url()),{f,u:P.page.url().replace(/[?#].*/,'')});ok(P.name+': no page errors',!P.errs.length,P.errs)}
  if(process.env.SHOTS){await A.page.screenshot({path:process.env.SHOTS+'/midswap-old-390.png'});await B.page.screenshot({path:process.env.SHOTS+'/midswap-new-1280.png'});await C.page.screenshot({path:process.env.SHOTS+'/midswap-spec-old-1280.png'})}
}catch(e){bad++;console.log('FAIL exception',e&&e.stack)}finally{await L.close();console.log(bad?`${bad} of ${n} FAILED`:`ALL ${n} PASSED`);process.exit(bad?1:0)}})();
