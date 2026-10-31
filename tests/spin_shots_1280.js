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

(async()=>{try{
const L1=await lobby();const C=await open('c',L1,'cm',{desktop:true,w:1280,h:800});const S=await open('s',L1,'spec',{desktop:true,w:1280,h:800});const M1=await open('m',L1,1,{desktop:true,w:1280,h:800});
await click(C,'#spinopen');await C.page.waitForSelector('#spinall',{visible:true});await click(C,'#spinall');
await waitFor(()=>has(S,'#wheelov'),20000);await sleep(5500);
await S.shot('spin_overlay_1280_spectator');await M1.shot('spin_overlay_1280_manager');await C.shot('spin_overlay_1280_commissioner');
await waitFor(async()=>{const m=await gj(L1.K.meta);return m&&m.spin&&m.spin.done},90000);await sleep(1200);await S.shot('spin_done_1280');
console.log('shots done',[C,S,M1].map(P=>P.errs.length));for(const P of [C,S,M1])await P.close();
}catch(e){console.log(e.stack)}process.exit(0)})();
