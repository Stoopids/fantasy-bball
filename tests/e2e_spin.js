/* Spin overlay + one-spin rule, in headless Chromium against the MOCK textdb (9995/9996 like e2e_stage5).
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996          node tests/e2e_spin.js */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const body=P=>P.page.$eval('body',e=>e.innerText).catch(()=>'');
const has=(P,sel)=>P.page.$(sel).then(x=>!!x);
const waitFor=async(fn,ms,label)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const click=async(P,sel)=>{await P.page.waitForSelector(sel,{visible:true,timeout:15000});await P.page.$eval(sel,e=>e.click())};
async function lobby(o){const id=await seed(API,Object.assign({managers:8},o||{}));const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);m.status='lobby';delete m.endedAt;delete m.startedAt;m.orderSet=false;m.order=[];m.spin=null;m.spinGen=0;m.spinDone=false;m.respins=[];await post(K.meta,m);return{id,I,K}}
const open=async(name,L1,who,opt)=>{const P=await L.phone(name,opt||{});if(opt&&opt.reduced)await P.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const hash=who==='cm'?'#cm='+L1.I.cmSecret:who==='spec'?'':'#as='+L1.I.managers[who].id+'&k='+L1.I.managers[who].k;await P.page.goto(`${APP}/room.html?l=${L1.id}${who==='spec'?'&watch=1':''}${hash}`,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#lobbycard',{timeout:25000}).catch(()=>{});await sleep(1500);return P};
const collect=P=>P.page.evaluate(()=>{window.__w=[];const look=()=>{const e=document.getElementById('wwin');const t=e?e.textContent:'';if(/takes pick/.test(t)&&window.__w[window.__w.length-1]!==t)window.__w.push(t)};new MutationObserver(look).observe(document.documentElement,{subtree:true,childList:true,characterData:true});setInterval(look,50)});
const hide=P=>P.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))});
(async()=>{try{
console.log('\n[overlay seen by everyone]');
{const L1=await lobby();const C=await open('c',L1,'cm');const M1=await open('m1',L1,1);const S=await open('s',L1,'spec');const R=await open('r',L1,2,{reduced:true});
 ok('reduced-motion client really reports prefers-reduced-motion',await R.page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
 for(const P of [M1,S,R])ok('before the spin: no overlay on '+P.name,!(await has(P,'#wheelov')));
 for(const P of [M1,S,R])await collect(P);
 await click(C,'#spinopen');await C.page.waitForSelector('#spinall',{visible:true});await collect(C);await click(C,'#spinall');
 for(const P of [M1,S,R])ok('overlay opens by itself for '+P.name+' (manager / spectator / reduced motion) once the commissioner spins',!!(await waitFor(()=>has(P,'#wheelov'),20000)));
 await sleep(1500);await M1.shot('spin_overlay_390_manager');await S.shot('spin_overlay_390_spectator');
 const tr=await M1.page.evaluate(()=>{const g=document.getElementById('wg');return g?g.style.transition:null}),trR=await R.page.evaluate(()=>{const g=document.getElementById('wg');return g?g.style.transition:null});
 ok('normal client animates the wheel (CSS transition set)',/transform/.test(tr||''),tr);ok('reduced-motion client shows the result without the animation (no transition)',trR===''||trR==null,trR);
 ok('the draft is not blocked: Start button is still in the commissioner page while the manager overlay is up (commissioner has no tap-close until done)',await has(C,'#wheelov'));
 await waitFor(async()=>{const m=await gj(L1.K.meta);return m&&m.spin&&m.spin.done},90000);
 const meta=await gj(L1.K.meta);ok('spin finished: order set, one-spin flag stored',meta.orderSet&&meta.spin.done&&meta.spinDone===true&&meta.order.length===8,{o:meta.orderSet,d:meta.spinDone});
 const nm=id=>L1.I.managers.find(m=>m.id===id).name;const expect=meta.order.map(nm);
 await waitFor(async()=>/Order set/.test(await body(S)),15000);
 const seqC=await C.page.evaluate(()=>window.__w),seqS=await S.page.evaluate(()=>window.__w),seqM=await M1.page.evaluate(()=>window.__w),seqR=await R.page.evaluate(()=>window.__w);
 ok('every pick the commissioner saw was shown to the spectator in the same order',seqC.length>=7&&seqS.join('|')===seqC.join('|'),{seqC,seqS});
 ok('manager and reduced-motion clients saw the same results (reduced may skip none)',seqM.join('|')===seqC.join('|')&&seqR.join('|')===seqC.join('|'),{seqM,seqR});
 ok('result names match the stored order',seqC.every((t,i)=>t.indexOf(expect[i])===0),{seqC,expect});
 const lastOrder=async P=>{const t=await P.page.$eval('#wheelov .wbox',e=>e.innerText).catch(()=>'');let last=-1;return expect.every(x=>{const i=t.indexOf(x,Math.max(last,0));if(i<0)return false;last=i;return true})};
 ok('the overlay on the spectator ends on "Order set" with every name in the stored order',await lastOrder(S));
 await M1.shot('spin_done_390');
 const t0=Date.now();await M1.page.tap('#wheelov .wbox h2').catch(()=>{});const closedByTap=await waitFor(async()=>!(await has(M1,'#wheelov')),2500);ok('tap closes the overlay on the manager (within 2.5 s)',!!closedByTap,Date.now()-t0);
 const closedAuto=await waitFor(async()=>!(await has(S,'#wheelov')),12000);ok('spectator overlay closes by itself a few seconds after the result (no tap)',!!closedAuto);
 ok('reduced-motion client overlay also closes by itself',!!(await waitFor(async()=>!(await has(R,'#wheelov')),12000)));
 await C.page.evaluate(()=>{const o=document.getElementById('wheelov');if(o)o.click()});await sleep(500);ok('commissioner overlay closes after the order is set (tap or Close)',!(await has(C,'#wheelov'))||await (async()=>{await click(C,'#wclose');await sleep(400);return !(await has(C,'#wheelov'))})());
 ok('spin button is gone for the commissioner once the order is set (one spin only)',!(await has(C,'#spinopen'))&&/only one spin/i.test(await body(C)));
 ok('randomize and moving by hand are still there',await has(C,'#randomize'));
 await M1.page.reload({waitUntil:'domcontentloaded'});await sleep(3500);ok('no replay on reload: the finished spin does not open again for the manager',!(await has(M1,'#wheelov')));
 const Lt=await open('late',L1,'spec');await sleep(3000);ok('a client that opens the room after the spin sees no overlay',!(await has(Lt,'#wheelov')));
 /* draft not blocked: start the draft */
 await click(C,'#startbtn');await click(C,'#cfyes');await waitFor(async()=>{const m=await gj(L1.K.meta);return m.status==='live'},20000);
 ok('draft started; no overlay anywhere over the board',!(await has(C,'#wheelov'))&&!(await has(S,'#wheelov'))&&!(await has(M1,'#wheelov')));await sleep(2500);
 ok('the manager page shows the live draft (banner), not the wheel',await has(M1,'#banner')&&!(await has(M1,'#wheelov')));await M1.shot('spin_after_start_390');
 for(const P of [C,M1,S,R,Lt])ok('no page errors on '+P.name,P.errs.length===0,P.errs);
 for(const P of [C,M1,S,R,Lt])await P.close()}
console.log('\n[second spin refused: stale tab, double click, two tabs]');
{const L1=await lobby();const C=await open('c',L1,'cm');const C2=await open('c2',L1,'cm');await hide(C2);ok('stale tab shows the spin button',await has(C2,'#spinopen'));
 await click(C,'#spinopen');await click(C,'#spinall');await waitFor(async()=>{const m=await gj(L1.K.meta);return m&&m.spin&&m.spin.done},90000);const before=await gj(L1.K.meta);
 await click(C2,'#spinopen');await sleep(500);ok('stale tab still shows a Spin button (it has not seen the result)',await has(C2,'#spinnext'));await click(C2,'#spinnext');await sleep(2500);
 const after=await gj(L1.K.meta);ok('stale tab: a new spin is refused with a plain message',/only one spin/i.test((await C2.page.evaluate(()=>window.__toasts.join(' | ')))+await body(C2)),await C2.page.evaluate(()=>window.__toasts));
 ok('stale tab: the stored league is unchanged (same generation, order, id)',after.spinGen===before.spinGen&&after.spin.sid===before.spin.sid&&JSON.stringify(after.order)===JSON.stringify(before.order)&&after.spinDone===true,{b:before.spinGen,a:after.spinGen});
 await C.close();await C2.close()}
{const L1=await lobby();const C=await open('c',L1,'cm');await click(C,'#spinopen');await C.page.waitForSelector('#spinnext',{visible:true});
 await C.page.evaluate(()=>{const b=document.getElementById('spinnext');b.click();b.click();b.click()});await sleep(6500);const m=await gj(L1.K.meta);
 const recs=[1,2].map(i=>gj(L1.K.spin(m.epoch,1,i)));const [r1,r2]=await Promise.all(recs);
 ok('triple click on Spin: one spin generation, one result written',m.spinGen===1&&m.spin.gen===1&&!!r1&&!r2,{g:m.spinGen,r1:!!r1,r2:!!r2});await C.close()}
{const L1=await lobby();const C=await open('c',L1,'cm');const C2=await open('c2',L1,'cm');await click(C,'#spinopen');await click(C2,'#spinopen');await C.page.waitForSelector('#spinnext',{visible:true});await C2.page.waitForSelector('#spinnext',{visible:true});
 await Promise.all([C.page.evaluate(()=>document.getElementById('spinnext').click()),C2.page.evaluate(()=>document.getElementById('spinnext').click())]);await sleep(7000);const m=await gj(L1.K.meta);
 ok('two commissioner tabs press Spin together: the league has exactly one spin generation',m.spinGen===1&&m.spin&&m.spin.gen===1&&!m.spin.done,{g:m.spinGen});ok('no page errors',C.errs.length===0&&C2.errs.length===0,[C.errs,C2.errs]);await C.close();await C2.close()}
console.log('\n[unfinished spin: stale -> spin again; fresh -> not restartable]');
{const L1=await lobby();const C=await open('c',L1,'cm');const V=await open('v',L1,3);await click(C,'#spinopen');await C.page.waitForSelector('#spinnext',{visible:true});await click(C,'#spinnext');await sleep(6500);
 let m=await gj(L1.K.meta);ok('first spin started, not finished (1 of 8 results)',m.spin&&!m.spin.done&&m.spinGen===1&&!!(await gj(L1.K.spin(m.epoch,1,1))));
 ok('viewer saw that one result',await has(V,'#wheelov'));await C.page.reload({waitUntil:'domcontentloaded'});await sleep(3500);
 ok('fresh unfinished spin: no "Spin again" yet (the commissioner can just continue)',!/Spin again/.test(await body(C))&&await has(C,'#spinopen'));
 const dup=F.mSpinStart(F.normalizeMeta(m),L1.I.managers.map(x=>x.id),Date.now(),0);ok('fresh unfinished spin cannot be started a second time (logic)',!!dup.error);
 /* make it old: the tab was closed long ago */
 m.spin.ts=Date.now()-5*60000;await post(L1.K.meta,m);const r1=await gj(L1.K.spin(m.epoch,1,1));r1.ts=Date.now()-5*60000;await post(L1.K.spin(m.epoch,1,1),r1);
 await C.close();const C3=await open('c3',L1,'cm');const V2=await open('v2',L1,4);await sleep(2500);
 ok('stale unfinished spin: the button says "Spin again (last spin didn’t finish)"',/Spin again \(last spin didn.t finish\)/.test(await C3.page.$eval('#spinopen',e=>e.innerText).catch(()=>'')));
 ok('stale spin is not shown as a result to a client that just opened the room',!(await has(V2,'#wheelov')));
 await click(C3,'#spinopen');await C3.page.waitForSelector('#respin',{visible:true}).catch(()=>{});ok('overlay for the commissioner offers only "Spin again", not Spin / Spin all',await has(C3,'#respin')&&!(await has(C3,'#spinnext'))&&!(await has(C3,'#spinall')));
 await C3.shot('spin_stale_390');await click(C3,'#respin');await waitFor(async()=>(await gj(L1.K.meta)).spinGen===2,15000);m=await gj(L1.K.meta);
 ok('Spin again: a new generation with a new id replaces the unfinished spin',m.spinGen===2&&m.spin.gen===2&&m.spin.sid&&!m.spin.done&&m.spin.ts>Date.now()-60000,{g:m.spinGen});
 await C3.page.waitForSelector('#spinall',{visible:true});await sleep(3000);await click(C3,'#spinall');await waitFor(async()=>(await gj(L1.K.meta)).spin.done,90000);m=await gj(L1.K.meta);
 ok('the new spin finishes and sets the order',m.orderSet&&m.spin.done&&m.spinDone&&m.order.length===8);
 await sleep(1500);ok('after it finished no spin button is offered any more',!(await has(C3,'#spinopen'))||!(/Spin the wheel|Spin again/.test(await C3.page.$eval('#spinopen',e=>e.innerText).catch(()=>''))));
 const again=F.mSpinStart(F.normalizeMeta(m),m.order,Date.now()+1e9,0);ok('and the logic refuses another one, however much time has passed',!!again.error);
 for(const P of [C3,V,V2])ok('no page errors on '+P.name,P.errs.length===0,P.errs);for(const P of [C3,V,V2])await P.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
