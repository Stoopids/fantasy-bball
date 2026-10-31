/* League page store-error recovery (s18). The page must never stay on an error: it says "Having trouble reaching the league. Retrying…", retries with
   growing waits (about 2 s, 4 s, 8 s ... capped at 30 s, with jitter), keeps polling, shows the pre-draft view again when the store is healthy, fills in
   by itself when the draft completes, and after the draft keeps the last good view with a small "offline" note.
   Store outage = the mock's /__cfg?fail=<league id>&code=503 (only this league's keys).
   node tests/e2e_recover.js   (APP / API env, mock store running; API's host serves /__cfg) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const API=process.env.API||'http://localhost:9996/api/data/';const CFG=API.replace(/api\/data\/$/,'__cfg');
const fail=(id,code)=>fetch(CFG+'?fail='+encodeURIComponent(String(id).toLowerCase())+'&code='+(code||503));const heal=()=>fetch(CFG+'?clear=1');
const get=async k=>{const r=await fetch(API+encodeURIComponent(k));return r.ok?await r.text():null};const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const body=P=>P.page.$eval('body',e=>e.innerText);
const until=async(f,ms,step)=>{const t=Date.now();while(Date.now()-t<ms){try{const v=await f();if(v)return v}catch(e){}await sleep(step||300)}return false};
const TD=(()=>{const t=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');return JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1))})();
async function lastPick(id,info){const K=F.Keys(id);const meta=JSON.parse(await get(K.meta));let prev=null,used={};for(let i=1;i<=47;i++){const e=JSON.parse(await get(K.pick(1,i)));used[String(e.tid)]=1;prev=e.id}
  const tid=TD.teams.map(t=>t[0]).find(t=>!used[String(t)]);return async()=>{await post(K.pick(1,48),F.makeEntry(48,info.managers[0].id,tid,{now:Date.now(),epoch:1,writer:'seed',by:'owner',prev}));meta.endedAt=Date.now();await post(K.meta,meta)}}
const filled=P=>P.page.evaluate(()=>{const c=[...document.querySelectorAll('#main .ocl .strow')];return{n:c.length,chips:c.every(x=>x.querySelectorAll('.chip').length===6),ready:!!document.querySelector('#lapp[data-ready]'),txt:document.body.innerText.slice(0,60)}});
(async()=>{try{
  // ---------- (a) outage BEFORE the draft ----------
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){const tag=w+'px';
    // (a1) the page is opened while the store is down
    let id=await seed(null,{live:true,picksMade:20,name:'Outage One'});await fail(id,503);
    let P=await L.phone('rc1'+w,desk?{desktop:true,w,h}:{});const times=[];P.page.on('request',r=>{if(r.url().includes('/api/data/')&&r.url().includes(encodeURIComponent(F.Keys(id).meta)))times.push(Date.now())});
    await P.go('league.html?l='+id);await P.page.waitForSelector('#trouble',{timeout:15000});
    const t1=await P.page.evaluate(()=>{const t=document.getElementById('trouble'),b=document.getElementById('tryNow'),r=b.getBoundingClientRect();return{txt:t.innerText,bh:r.height,bw:r.width,ov:document.documentElement.scrollWidth>innerWidth}});
    ok(tag+' (a1) opened during a 503 outage: friendly message "Having trouble reaching the league. Retrying…", no raw HTTP code, "Try now" button >= 44px, no overflow',/Having trouble reaching the league/.test(t1.txt)&&/Retrying/.test(t1.txt)&&!/503|HTTP|Could not load/.test(await body(P))&&t1.bh>=43.99&&t1.bw>=43.99&&!t1.ov,t1);
    await P.shot('recover_a1_outage_'+w);
    await sleep(w===390?26000:20000);
    const gaps=times.slice(1).map((t,i)=>t-times[i]);
    ok(tag+' (a1) retries automatically with growing waits (about 2 s, 4 s, 8 s ... jittered)',times.length>=4&&gaps[0]>=1300&&gaps[0]<=3200&&gaps[1]>gaps[0]&&gaps[1]>=2700&&gaps[1]<=6000&&gaps[2]>gaps[1]&&gaps[2]>=5500,{gaps});
    ok(tag+' (a1) still on the friendly message after 20+ s of outage (never a dead end)',await P.page.$('#trouble')!==null&&await P.page.$('#tryNow')!==null);
    await heal();const tr0=Date.now();await P.page.evaluate(()=>document.getElementById('tryNow').click());
    const rec=await until(async()=>await P.page.$('#avail'),12000);
    const t2=await P.page.evaluate(()=>{const h=document.getElementById('lhome');return h?h.innerText:''});
    ok(tag+' (a1) "Try now" after recovery restores the pre-draft view ("Available after the draft", 20 of 48 picks, links back to the room), message gone',!!rec&&/Available after the draft/.test(t2)&&/20 of 48/.test(t2)&&!(await P.page.$('#trouble'))&&(await P.page.$('#back_room'))!==null,t2.slice(0,120));
    await P.shot('recover_a1_restored_'+w);await P.page.close();
    // (a2) the pre-draft view is open, the store goes down for a while, then comes back: no reload by hand
    id=await seed(null,{live:true,picksMade:20,name:'Outage Two'});
    P=await L.phone('rc2'+w,desk?{desktop:true,w,h}:{});await P.go('league.html?l='+id);await P.page.waitForSelector('#avail',{timeout:15000});
    await fail(id,503);
    const note=await until(async()=>await P.page.$('#trouble'),25000,500);
    const t3=await P.page.evaluate(()=>({home:!!document.getElementById('lhome'),avail:/Available after the draft/.test(document.body.innerText),txt:(document.getElementById('trouble')||{innerText:''}).innerText,btn:(document.getElementById('tryNow')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height}));
    ok(tag+' (a2) pre-draft page open, outage starts: friendly note appears, the pre-draft view stays, Try now >= 44px',!!note&&t3.home&&t3.avail&&/Having trouble reaching the league/.test(t3.txt)&&t3.btn>=43.99&&!/503|HTTP/.test(t3.txt),t3);
    await P.shot('recover_a2_outage_'+w);
    await sleep(8000);await heal();
    const back=await until(async()=>!(await P.page.$('#trouble'))&&(await P.page.$('#avail')),45000,500);
    ok(tag+' (a2) after the store is healthy again the note disappears by itself (no manual reload) and the pre-draft view is intact',!!back&&/20 of 48/.test(await P.page.$eval('#lhome',e=>e.innerText)));
    ok(tag+' (a2) no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close();
  }
  // ---------- (b) outage while the draft finishes ----------
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){const tag=w+'px';
    const id=await seed(null,{live:true,picksMade:47,name:'Finish Outage'});const info=seed.info;const finish=await lastPick(id,info);
    const P=await L.phone('rc3'+w,desk?{desktop:true,w,h}:{});await P.go('league.html?l='+id);await P.page.waitForSelector('#avail',{timeout:15000});
    ok(tag+' (b) 47 of 48 picks: pre-draft view',/47 of 48/.test(await P.page.$eval('#lhome',e=>e.innerText)));
    await fail(id,503);await until(async()=>await P.page.$('#trouble'),25000,500);
    ok(tag+' (b) store down: friendly note, pre-draft view kept',!!(await P.page.$('#trouble'))&&!!(await P.page.$('#avail')));
    await heal();await finish();                   // the store is back and the last pick lands right after the outage
    const t0=Date.now();const fin=await until(async()=>(await filled(P)).n===8,70000,500);const o=await filled(P);
    ok(tag+' (b) draft completed around the outage: the open page fills in by itself within one retry cycle (8 cards, 6 chips each, ready), no manual reload ('+Math.round((Date.now()-t0)/1000)+' s)',!!fin&&o.chips&&o.ready&&!(await P.page.$('#trouble')),o);
    await P.shot('recover_b_filled_'+w);
    ok(tag+' (b) no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close();
  }
  // ---------- (c) refresh failure AFTER the draft keeps the last good view ----------
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){const tag=w+'px';
    const id=await seed();const info=seed.info;
    const P=await L.phone('rc4'+w,desk?{desktop:true,w,h}:{});
    /* test-only: the 30 s chat poll and the 5 min scores refresh run 20x / 100x faster so the check does not take minutes */
    await P.page.evaluateOnNewDocument(()=>{const st=window.setTimeout.bind(window),si=window.setInterval.bind(window);window.setTimeout=(f,ms,...a)=>st(f,ms===300000?3000:ms,...a);window.setInterval=(f,ms,...a)=>si(f,ms===30000?1500:ms,...a)});
    let down=false;await P.page.setRequestInterception(true);P.page.on('request',r=>{if(down&&/\/data\/(scores|tournament)\.json/.test(r.url()))r.respond({status:503,contentType:'text/plain',body:'down'});else r.continue()});
    await P.go('league.html?l='+id);await P.page.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:25000});await sleep(500);
    const before=await P.page.evaluate(()=>({n:document.querySelectorAll('#main .ocl .strow').length,names:[...document.querySelectorAll('#main .ocl .strow .nm')].map(x=>x.innerText),nodata:!!document.getElementById('nodata')}));
    ok(tag+' (c) finished league loaded, no offline note yet',before.n===8&&!(await P.page.$('#offnote')),before);
    down=true;await fail(id,503);
    const off=await until(async()=>await P.page.$('#offnote'),30000,300);
    const mid=await P.page.evaluate(()=>({n:document.querySelectorAll('#main .ocl .strow').length,names:[...document.querySelectorAll('#main .ocl .strow .nm')].map(x=>x.innerText),nodata:!!document.getElementById('nodata'),trouble:!!document.getElementById('trouble'),off:(document.getElementById('offnote')||{innerText:''}).innerText,tabs:document.querySelectorAll('#ltabs > *').length,ov:document.documentElement.scrollWidth>innerWidth}));
    ok(tag+' (c) store and scores refresh fail: small "offline" note appears, the last good view stays (same 8 cards and names, no error page, no "No scores" card, tabs intact)',!!off&&/Offline/.test(mid.off)&&mid.n===8&&JSON.stringify(mid.names)===JSON.stringify(before.names)&&mid.nodata===before.nodata&&!mid.trouble&&mid.tabs>=8&&!mid.ov,mid);
    await P.shot('recover_c_offline_'+w);
    await sleep(4000);
    ok(tag+' (c) the last good view is still there after more failed refreshes (never blanked)',(await P.page.$$('#main .ocl .strow')).length===8&&!!(await P.page.$('#offnote')));
    down=false;await heal();
    const gone=await until(async()=>!(await P.page.$('#offnote')),40000,400);
    ok(tag+' (c) after the store is healthy again the offline note goes away by itself and the view is unchanged',!!gone&&(await P.page.$$('#main .ocl .strow')).length===8);
    ok(tag+' (c) no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close();
  }
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{try{await heal()}catch(e){}await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
