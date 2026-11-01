/* DR2: time from the final pick to the rendered recap, for the drafter and a second device, against the mock store with latency.
   APP=<build on mock_textdb> API=<its /api/data/> LAT=600 RUNS=3 [MAXMS=] node tests/e2e_recapfast_dr2.js   (prints JSON timings; asserts only when MAXMS is set) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;
const API=process.env.API,AORIG=API.replace(/\/api\/data\/$/,''),APP=process.env.APP,LAT=+process.env.LAT||600,RUNS=+process.env.RUNS||3,MAX=+process.env.MAXMS||0;
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
async function one(){await fetch(AORIG+'/__cfg?lat=0');const id=await seed(API,{live:true,rounds:8,picksMade:63});const I=seed.info;const ana=I.managers[0],ben=I.managers[1];
  const open=async(tag,mgr,w)=>{const P=await L.phone(tag,w>=900?{desktop:true,w,h:900}:{w,h:844});await P.page.setBypassServiceWorker(true);
    await P.page.evaluateOnNewDocument((id,m)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:m.id,k:m.k}))},id,mgr);await P.page.goto(APP+'/room.html?l='+id+'#tab=teams');return P};
  const A=await open('ana',ana,390),B=await open('ben',ben,1280);await fetch(AORIG+'/__cfg?lat='+LAT);
  await A.page.waitForSelector('#tlist [data-a=draftrow]',{timeout:60000});await sleep(1500);
  const t0=Date.now();await A.page.evaluate(()=>document.querySelector('#tlist [data-a=draftrow]').click());await sleep(300);
  await A.page.evaluate(()=>{const b=document.querySelector('#confirmpick,[data-a=confirm]');if(b)b.click()});
  const wait=async P=>{const s=Date.now();while(Date.now()-s<120000){const r=await P.page.evaluate(()=>/recap\.html/.test(location.pathname)&&!!document.getElementById('rc_foot')&&!document.getElementById('loading')?{seed:!!window.__dr2seed,why:window.__dr2why||'',ss:Object.keys(sessionStorage).join(',')}:null).catch(()=>null);if(r)return Object.assign(r,{ms:Date.now()-t0});await sleep(100)}return{ms:null}};
  const [a,b]=await Promise.all([wait(A),wait(B)]);await sleep(LAT*20);
  const conf=await Promise.all([A,B].map(P=>P.page.evaluate(()=>window.__dr2confirm||null).catch(()=>null)));
  const errs=A.errs.concat(B.errs);await A.close();await B.close();await fetch(AORIG+'/__cfg?lat=0');return{drafter:a,second:b,confirm:conf,errs}}
(async()=>{const R=[];try{for(let i=0;i<RUNS;i++){const r=await one();R.push(r);console.log(JSON.stringify(r))}}catch(e){bad++;console.log('EXCEPTION',e.stack)}finally{await L.close()}
  const d=R.map(r=>r.drafter.ms),s=R.map(r=>r.second.ms);console.log('MEDIAN drafter '+med(d)+' ms, second device '+med(s)+' ms (lat '+LAT+' ms per request)');
  ok('every run reached the recap on both devices',R.length===RUNS&&d.concat(s).every(x=>x!=null),{d,s});ok('no page errors',R.every(r=>!r.errs.length),R.map(r=>r.errs));
  if(MAX){ok('median drafter <= '+MAX+' ms',med(d)<=MAX,med(d));ok('median second device <= '+MAX+' ms',med(s)<=MAX,med(s));
    ok('fast path used on both devices and server never disagreed (same, or still confirming)',R.every(r=>r.drafter.seed&&r.second.seed&&r.confirm.every(c=>c!=='diff')),R.map(r=>[r.drafter.seed,r.second.seed,r.confirm]))}
  console.log(`\n${n-bad} / ${n} checks passed`);process.exit(bad?1:0)})();
