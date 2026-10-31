/* s25b: every time uses the viewer's device zone with an Intl short label. Same stored UTC, three emulated zones. Setup stores UTC from the commissioner's local input (DST: Nov 1 2026 US change). */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,API}=L;
const OUT=process.env.SHOTS||'/workspace/draftroom-notes/s25-setup';
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const ZONES=['America/Los_Angeles','Asia/Jakarta','Europe/London'];
const want=(ms,tz)=>{const f=o=>new Intl.DateTimeFormat('en-US',Object.assign({timeZone:tz},o)).format(new Date(ms));return{day:f({weekday:'long',month:'long',day:'numeric',year:'numeric'}),time:f({hour:'numeric',minute:'2-digit'}),abbr:new Intl.DateTimeFormat('en-US',{timeZone:tz,timeZoneName:'short'}).formatToParts(new Date(ms)).find(x=>x.type==='timeZoneName').value}};
(async()=>{try{
 const START=Date.UTC(2026,10,2,4,0);/* Nov 2 2026 04:00 UTC = Nov 1 8:00 PM PST (after the US change), Nov 2 11:00 AM in Jakarta, 4:00 AM in London */
 const id=await seed(API,{});const K=F.Keys(id);{const m=await gj(K.meta);m.status='lobby';delete m.endedAt;m.settings.startAt=START;m.settings.tz='America/New_York';await post(K.meta,m)}
 for(const tz of ZONES){const w=want(START,tz);
  const P=await L.phone('tz'+tz,{tz});await P.go('room.html?l='+id+'&watch=1');await P.page.waitForSelector('#startsline',{timeout:20000}).catch(()=>{});await sleep(800);
  const t=await P.page.$eval('#startsline',e=>e.innerText).catch(()=>'');
  ok(tz+': room start line = '+w.day+', '+w.time+' '+w.abbr,t.includes(w.day)&&t.includes(w.time)&&t.includes(w.abbr),t);
  ok(tz+': no hard-coded ET in the room text',!/\bET\b|Eastern/.test(await P.page.evaluate(()=>document.body.innerText)));
  await P.page.screenshot({path:OUT+'/s25b_tz_room_'+tz.replace('/','_')+'.png'});
  await P.go('time.html?t='+START+'&n=TZ');await sleep(600);const tt=await P.page.$eval('#when',e=>e.innerText).catch(()=>'');
  ok(tz+': time.html shows local time + label',tt.includes(w.time)&&tt.includes(w.abbr),tt);await P.close()}
 /* setup: Los Angeles commissioner picks Nov 1 2026 8:00 PM (PST, after the change) and Oct 31 8:00 PM (PDT) */
 for(const [inp,utc,ab] of [['2026-11-01T20:00',Date.UTC(2026,10,2,4,0),'PST'],['2026-10-31T20:00',Date.UTC(2026,10,1,3,0),'PDT']]){
  const P=await L.phone('su'+inp,{tz:'America/Los_Angeles'});await P.go('setup.html');await P.page.waitForSelector('#next');await P.page.type('#f_name','TZ League');await P.page.type('#f_mgr','Ann');await P.page.type('#f_team','Hoop');
  await P.page.click('#next');await sleep(250);await P.page.click('#next');await sleep(300);await P.page.click('[data-g="whenMode"][data-v="pick"]');await sleep(300);
  await P.page.$eval('#f_when',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},inp);await sleep(300);
  const line=await P.page.$eval('#tzline',e=>e.innerText).catch(()=>'');const lab=await P.page.$eval('label[for=f_when]',e=>e.innerText);
  ok('setup LA '+inp+': shows 8:00 PM your time with '+ab+' and the UTC it stores',line.includes('8:00 PM')&&line.includes(ab)&&lab.includes(ab),{line,lab});
  if(inp.startsWith('2026-11-01'))await P.page.screenshot({path:OUT+'/s25b_tz_setup_LA_nov1.png'});
  for(let i=0;i<10&&await P.page.$('#next');i++){await P.page.click('#next');await sleep(250)}await P.page.click('#create');await P.page.waitForSelector('#toRoom',{timeout:20000});
  const nid=await P.page.evaluate(()=>new URL(document.getElementById('toRoom').href).searchParams.get('l'));const mt=await gj(F.Keys(nid).meta);
  ok('setup LA '+inp+': stored startAt is UTC epoch '+new Date(utc).toISOString(),mt.settings.startAt===utc,{got:mt.settings.startAt&&new Date(mt.settings.startAt).toISOString()});
  const lc=await P.page.$eval('#lc_email',a=>decodeURIComponent(a.href));ok('setup LA '+inp+': links card text has the local start time + label',lc.includes('8:00 PM '+ab),lc.slice(0,200));
  ok('no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;console.log('CRASH',e)}await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)})();
