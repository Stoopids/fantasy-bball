/* Commissioner "Re-issue link" (QA M2): a manager who lost their private link / cleared browser data gets a NEW link for the same seat; the old link stops working.
   Friendly-lock model unchanged: only the commissioner (unlocked) sees the button; managers cannot re-issue; other seats are untouched; no fill-with-auto-pick.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_reissue.js   (APP / API env) */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const get=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const has=(P,sel)=>P.page.$(sel).then(x=>!!x);const body=P=>P.page.$eval('body',e=>e.innerText).catch(()=>'');
const open=async(name,url,opt)=>{const P=await L.phone(name,opt||{});await P.page.setBypassServiceWorker(true).catch(()=>{});await P.page.goto(APP+'/'+url,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#tabs',{timeout:25000}).catch(()=>{});await sleep(800);return P};
const tab=async(P,t)=>{await P.page.evaluate(t=>{const b=document.querySelector('[data-t='+t+']');if(b)b.click()},t);await sleep(500)};
const closeOv=async P=>{await P.page.evaluate(()=>{const b=document.querySelector('[data-a=idclose]');if(b)b.click()});await sleep(200)};
const canQueue=P=>P.page.evaluate(()=>{const b=document.querySelector('[data-t=teams]');if(b)b.click();return new Promise(r=>setTimeout(()=>r(!!document.querySelector('.qbtn')),700))});
(async()=>{try{
const id=await seed(API,{managers:8,rounds:4,live:true,picksMade:0});const I=seed.info;const K=F.Keys(id);const A=I.managers[1],B=I.managers[2];
const claim0=[];for(let i=1;i<=8;i++)claim0.push(await get(K.slot(i,0)));
/* the manager's own phone before: identified */
const M1=await open('mgr-old',`room.html?l=${id}#as=${A.id}&k=${A.k}`);await closeOv(M1);
ok('before: the manager link works (queue buttons are there)',await canQueue(M1));
/* a non-commissioner has no Re-issue control */
ok('a manager (not the commissioner) sees no Re-issue control',!(await has(M1,'[data-a=reissue]'))&&!(await has(M1,'#reissuebtn')));
/* commissioner re-issues */
const C=await open('cm',`room.html?l=${id}#cm=${I.cmSecret}`,{desktop:true,w:1280,h:900});await closeOv(C);await tab(C,'more');
await waitFor(()=>has(C,'#mgrcard'),15000);
await C.page.evaluate(m=>{const b=document.querySelector('#mgrcard [data-a=mgr][data-m="'+m+'"]');b.scrollIntoView({block:'center'});b.click()},A.id);
await waitFor(()=>has(C,'#reissuebtn'),8000);
const info=await C.page.evaluate(()=>{const b=document.getElementById('reissuebtn');const r=b.getBoundingClientRect();return{h:Math.round(r.height),txt:b.textContent,sheet:document.querySelector('.sheet').innerText}});
ok('Manage sheet has "Re-issue private link…" (>= 44 px) and explains that the old link stops working',/Re-issue/.test(info.txt)&&info.h>=44&&/old one stops working/.test(info.sheet),info);
await C.page.$eval('#reissuebtn',e=>e.click());await waitFor(()=>has(C,'#cfyes'),6000);
const cf=await C.page.evaluate(()=>document.querySelector('.sheet').innerText);
ok('asks to confirm first, naming the manager, and nothing is written before the tap',/Re-issue link for Ben\?/.test(cf)&&JSON.stringify(await get(K.slot(2,0)))===JSON.stringify(claim0[1]),cf);
await C.page.$eval('#cfyes',e=>e.click());await waitFor(()=>has(C,'#reissueurl'),10000);
const url=await C.page.$eval('#reissueurl',e=>e.value);const m=/room\.html\?l=([A-Z0-9-]+)#as=([0-9a-f]+)&k=([0-9a-f]{32})$/.exec(url)||[];
ok('shows a new private link for that seat (same league and manager id, a new 32-character secret)',m.length===4&&m[2]===A.id&&m[3]!==A.k,url.replace(/k=.*/,'k=…'));
const newK=m[3];
const sh=(await get(K.slot(2,0)));
ok('store: the seat keeps manager id, seat, generation, name and team; only the secret hash changed',sh.mid===claim0[1].mid&&sh.i===2&&sh.gen===claim0[1].gen&&sh.name===claim0[1].name&&sh.team===claim0[1].team&&sh.sh!==claim0[1].sh&&sh.sh===await F.mgrHash(A.id,newK),sh);
ok('store: the old secret no longer verifies, the new one does',!(await F.checkMgrSecret(sh,A.k))&&(await F.checkMgrSecret(sh,newK)));
let same=true;for(const i of [1,3,4,5,6,7,8]){if(JSON.stringify(await get(K.slot(i,0)))!==JSON.stringify(claim0[i-1]))same=false}ok('store: the other seven seats are untouched',same);
ok('the new link is shown only on the commissioner phone: it is not in the page address or the store',!/k=/.test(await C.page.evaluate(()=>location.href))&&!JSON.stringify(await get(K.meta)).includes(newK));
await C.page.$eval('#reissuecopy',e=>e.click());await sleep(500);
const toast=await C.page.evaluate(()=>window.__toasts.join('|'));ok('Copy link works ("Private link copied")',/Private link copied/.test(toast),toast);
ok('no page errors on the commissioner phone',C.errs.length===0,C.errs);
/* the OLD link is dead on a fresh phone; the NEW link works; other managers unaffected */
const O=await open('old-link',`room.html?l=${id}#as=${A.id}&k=${A.k}`);await sleep(1200);await closeOv(O);
const ot=await body(O);ok('old link on a fresh phone: rejected ("not valid"), no manager controls',/not valid for Ben|link is not valid/.test(ot)&&!(await canQueue(O)),ot.slice(0,200));
const N=await open('new-link',`room.html?l=${id}#as=${A.id}&k=${newK}`);await sleep(1000);await closeOv(N);
ok('new link on a fresh phone: welcomed back and identified as Ben (queue buttons present)',await canQueue(N)&&/Ben/.test(await body(N)));
const Bp=await open('other',`room.html?l=${id}#as=${B.id}&k=${B.k}`);await closeOv(Bp);ok('another manager\'s link still works',await canQueue(Bp));
/* the old phone that is already open loses access on its next reload (no hash needed: it re-checks the claim) */
await M1.page.goto(`${APP}/room.html?l=${id}`,{waitUntil:'domcontentloaded'});await M1.page.waitForSelector('#tabs',{timeout:25000}).catch(()=>{});await sleep(1500);await closeOv(M1);
ok('the old phone (secret saved there) is no longer identified after a reload',!(await canQueue(M1)));
/* re-issue twice: the first new link dies too */
await C.page.evaluate(()=>{const b=document.querySelector('[data-a=sheetbg]');if(b)b.click()});await sleep(300);
await C.page.evaluate(m=>{const b=document.querySelector('#mgrcard [data-a=mgr][data-m="'+m+'"]');b.scrollIntoView({block:'center'});b.click()},A.id);await waitFor(()=>has(C,'#reissuebtn'),8000);
await C.page.$eval('#reissuebtn',e=>e.click());await waitFor(()=>has(C,'#cfyes'),6000);await C.page.$eval('#cfyes',e=>e.click());await waitFor(()=>has(C,'#reissueurl'),8000);await sleep(500);
const sh2=await get(K.slot(2,0));ok('a second re-issue replaces the first: the first new secret stops working too',!(await F.checkMgrSecret(sh2,newK))&&sh2.sh!==sh.sh,sh2);
ok('still 8 managers, no fill-with-auto-pick control anywhere',(await body(C)).indexOf('Fill empty')<0&&!(await has(C,'[data-a=fill]')));
ok('no page errors (all phones)',[M1,O,N,Bp].every(p=>p.errs.length===0)&&C.errs.length===0,[M1,O,N,Bp,C].map(p=>p.errs));
console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
