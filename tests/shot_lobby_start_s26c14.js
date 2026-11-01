/* s26c14: lobby start time shot at 390 (no grey UTC/commissioner-zone line). APP/API env, mock store. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,API}=L;
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{let bad=0;try{const id=await seed(API,{});const K=F.Keys(id);const m=await gj(K.meta);m.status='lobby';delete m.endedAt;m.settings.startAt=Date.now()+3*3600e3;m.settings.tz='Asia/Jakarta';await post(K.meta,m);
 const P=await L.phone('lob',{w:390,h:844,tz:'Asia/Jakarta'});await P.go('room.html?l='+id+'&watch=1');await P.page.waitForSelector('#startsline',{timeout:20000});await sleep(1200);
 const r=await P.page.evaluate(()=>{const b=document.getElementById('startsline');b.scrollIntoView({block:'center'});const box=b.parentElement;return{txt:box.innerText,grey:/UTC|Commissioner/.test(box.innerText),body:/Commissioner.s zone/.test(document.body.innerText)}});
 console.log(JSON.stringify(r));if(r.grey||r.body){bad++;console.log('FAIL grey line still shown')}else console.log('  ok  no grey UTC/zone line under the start time');
 if(P.errs.length){bad++;console.log('FAIL errors',P.errs)}await P.page.screenshot({path:process.env.SHOTDIR+'/lobby-start-390.png'});await P.close()}catch(e){bad++;console.log('exception '+e.stack)}process.exit(bad?1:0)})();
