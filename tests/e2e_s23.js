/* s23 batch: QA s20 B1 (ONE strength / rank on the recap: Power rankings = Rosters side by side = Chalk Boss, and the footer describes the real formula), B2 (dash, never a blank, for "Avg power rank" with no ranked school),
   B6 (Redraft drop-list team links >= 44 px), B7 (error-state links >= 44 px at 390 and 1280).
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_s23.js   (APP / API env) */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {seedRecap}=require('./recap_seed.js');const {sleep,APP}=L;const API=process.env.API||'http://localhost:9996/api/data/';
const fs=require('fs'),path=require('path');
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}};
const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const TD=JSON.parse((s=>s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))(fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8')));
const open=async(name,url,o,scores)=>{const P=await L.phone(name,o||{});await P.page.setBypassServiceWorker(true).catch(()=>{});if(scores){await P.page.setRequestInterception(true);P.page.on('request',r=>{if(/\/data\/scores\.json/.test(r.url()))r.respond({status:200,contentType:'application/json',body:JSON.stringify(scores)});else r.continue()})}await P.page.goto(APP+'/'+url,{waitUntil:'domcontentloaded'});return P};
/* what the three places show, in page order */
const readRecap=P=>P.page.evaluate(()=>{const nm=e=>e.textContent.trim();
  const pw=[...document.querySelectorAll('#powerrank ol.prl>li')].map(li=>{const h=li.querySelector('h3');return h?h.innerText.replace(/\s+/g,' ').trim():''});
  const ros=[...document.querySelectorAll('#rosgrid .roster')].map(c=>({name:c.querySelector('b').textContent.trim(),team:(c.querySelector('.grow .small')||{textContent:''}).textContent.trim(),s:(c.querySelector('.strength')||{textContent:''}).textContent.replace(/\s+/g,' ').trim()}));
  const chalk=[...document.querySelectorAll('#awgrid .aw')].filter(a=>/Chalk Boss/.test(a.innerText)).map(a=>a.querySelector('.awv').innerText.replace(/\s+/g,' ').trim());
  return{pw,ros,chalk,foot:(document.getElementById('rcgradehow')||{}).textContent||'',sw:document.documentElement.scrollWidth}});
(async()=>{try{
/* ---------- B1 / B2: recap ---------- */
for(const [label,power] of [['real-style league (generated)',false],['example league (file text)',true]]){
  const id=await seedRecap(API,{power});const info=seedRecap.info;
  for(const [w,h,d] of [[390,844,0],[1280,900,1]]){
    const P=await open('r'+w,`recap.html?l=${id}`,d?{desktop:true,w,h}:{w,h});await P.page.waitForSelector('#rc_awards',{timeout:25000}).catch(()=>{});await waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#powerrank ol.prl>li')),20000);await sleep(800);
    const r=await readRecap(P);const pre=label+' '+w+'px: ';
    ok(pre+'the Power rankings section lists 8 managers with rank 1..8',r.pw.length===8,r.pw);
    /* power order (first = rank 1) by manager name */
    const order=r.pw.map(t=>{const m=info.managers.find(m=>t.includes(m.team)||t.includes(m.name));return m?m.name:null});
    ok(pre+'every Power row maps to a manager',order.every(Boolean),order);
    const rosPlace=r.ros.map(c=>({name:c.name,place:+((/#(\d+) of 8/.exec(c.s)||[])[1]||0)}));
    const byPlace=rosPlace.slice().sort((a,b)=>a.place-b.place).map(x=>x.name);
    ok(pre+'Rosters side by side: the "#n of 8" order is exactly the Power rankings order',JSON.stringify(byPlace)===JSON.stringify(order),{byPlace,order});
    ok(pre+'Rosters side by side: 8 distinct places 1..8',new Set(rosPlace.map(x=>x.place)).size===8&&rosPlace.every(x=>x.place>=1&&x.place<=8),rosPlace);
    ok(pre+'Chalk Boss is the Power rankings #1 manager',r.chalk.length===1&&r.chalk[0].startsWith(order[0]),{chalk:r.chalk,first:order[0]});
    const s1=(/Strength ([\d.]+)/.exec((r.ros.find(c=>c.name===order[0])||{}).s)||[])[1];const sc=(/strength ([\d.]+)/.exec(r.chalk[0]||'')||[])[1];
    ok(pre+'Chalk Boss strength (if shown) equals the strength on that manager\'s roster card',s1===sc,{s1,sc});
    const sts=r.ros.map(c=>(/Strength ([\d.]+)/.exec(c.s)||[])[1]);const bp=rosPlace.map(x=>x.place);
    ok(pre+'strength numbers: either all shown and in rank order, or (hand-written example text) none shown, only the rank',sts.every(x=>x==null)||(sts.every(x=>x!=null)&&rosPlace.every((a,i)=>rosPlace.every((b,j)=>a.place>=b.place||+sts[i]>=+sts[j]))),{sts,bp});
    
    ok(pre+'"How grades work" names the real inputs (power rank and projected seed), the 0-100 strength and the rank-based grade, and does not claim conference is graded',/power rank/.test(r.foot)&&/projected (tournament )?seed/.test(r.foot)&&/out of 100/.test(r.foot)&&/ranks? among the 8/.test(r.foot)&&/not in the grade/.test(r.foot),r.foot);
    ok(pre+'no sideways scroll',r.sw<=w+1,r.sw);ok(pre+'no page errors',P.errs.length===0,P.errs);await P.close()}}
/* B2: a league where nobody has a ranked school: the generator row has no average rank -> a dash in the Power section, never a blank */
{const TDm=TD.meta;const unranked=TD.teams.map(t=>t[0]).filter(t=>!(TDm[t]&&TDm[t].p));
 const rosters=Array.from({length:8},(_,i)=>unranked.slice(i*4,i*4+4));
 if(unranked.length>=32){const id=await seed(API,{managers:8,rounds:4,rosters});
  const P=await open('b2',`recap.html?l=${id}`,{});await waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#powerrank ol.prl>li, #powerrank .pmeta')),20000);await sleep(1000);
  const t=await P.page.evaluate(()=>[...document.querySelectorAll('#powerrank .pmeta')].map(e=>e.innerText.replace(/\s+/g,' ').trim()));
  ok('B2: 8 rosters with no ranked school: every "Avg power rank" shows a dash, not a blank ("0 of 4 ranked" stays)',t.length===8&&t.every(x=>/Avg power rank –|Avg power rank -/.test(x)),t);await P.close()}
 else ok('B2: enough unranked schools to build the test league',false,unranked.length)}
/* ---------- B7: error states ---------- */
const NOPE='ZZZZZZZZZZZZZZZZ';
for(const [w,h,d] of [[390,844,0],[1280,900,1]]){
  for(const [nm,url] of [['room unknown league',`room.html?l=${NOPE}`],['recap unknown league',`recap.html?l=${NOPE}`],['redraft unknown league',`redraft.html?l=${NOPE}`],['join unknown league',`join.html?l=${NOPE}`],['time page, bad link','time.html?t=bad'],['404-style unknown path','nothing-here.html']]){
    const P=await open('e'+w,url,d?{desktop:true,w,h}:{w,h});await sleep(2500);
    const m=await P.page.evaluate(()=>[...document.querySelectorAll('#nf a,#app a,.card a,main a,body>a')].filter(a=>a.offsetParent!==null&&!a.closest('#buildtag')).map(a=>{const r=a.getBoundingClientRect();return{t:(a.textContent||'').trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height*10)/10}}));
    ok(w+'px '+nm+': every visible link is a >= 44 px tap target',m.every(x=>x.h>=43.9&&x.w>=43.9),m);await P.close()}}
/* ---------- B6: Redraft drop list ---------- */
{const id=await seed(API,{managers:8,rounds:6});const I=seed.info;const K=F.Keys(id);
 const RECORDS=[[8,2],[7,3],[5,5],[2,2],[6,4],[4,6],[3,7],[1,9]];const owned=new Set(I.picks.map(p=>String(p.teamId)));const free=TD.teams.map(t=>String(t[0])).filter(t=>!owned.has(t));let g=0;const games=[];
 RECORDS.forEach(([wn,ls],mi)=>{const mine=String(I.picks.find(p=>p.managerId===I.managers[mi].id).teamId);for(let i=0;i<wn;i++)games.push({id:'s'+(g++),day:'2027-01-1'+(i%9),start:'2027-01-1'+(i%9)+'T18:00Z',status:'final',kind:'reg',home:{id:mine,score:80},away:{id:free[g%free.length],score:70}});for(let i=0;i<ls;i++)games.push({id:'s'+(g++),day:'2027-01-0'+(1+i%9),start:'2027-01-0'+(1+i%9)+'T18:00Z',status:'final',kind:'reg',home:{id:mine,score:60},away:{id:free[g%free.length],score:70}})});
 const scores={format:1,sample:false,label:'',season:'2026-27',as_of:'2027-01-22',source:'test',games};
 const CM=await open('cm23',`redraft.html?l=${id}#cm=${I.cmSecret}`,{},scores);await CM.page.waitForSelector('#openbtn',{timeout:25000}).catch(()=>{});await CM.page.$eval('#openbtn',e=>e.click()).catch(()=>{});
 const opened=await waitFor(async()=>{const m=await gj(K.meta);return m&&m.redraft&&m.redraft.phase==='open'&&m},20000);ok('B6 setup: the commissioner opened the Redraft',!!opened);
 for(const [w,h,d] of [[390,844,0],[1280,900,1]]){
  const P=await open('o'+w,`redraft.html?l=${id}#as=${I.managers[0].id}&k=${I.managers[0].k}`,d?{desktop:true,w,h}:{w,h},scores);await P.page.waitForSelector('#rdowner .dropchk',{timeout:25000}).catch(()=>{});await sleep(800);
  const m=await P.page.evaluate(()=>[...document.querySelectorAll('#rdowner label a.tlink')].map(a=>{const r=a.getBoundingClientRect();return{w:Math.round(r.width),h:Math.round(r.height*10)/10}}));
  ok(w+'px Redraft drop list: '+m.length+' team links, each >= 44 px high',m.length>=4&&m.every(x=>x.h>=43.9),m);ok(w+'px Redraft drop list: no page errors',P.errs.length===0,P.errs);await P.close()}
 await CM.close()}
console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
