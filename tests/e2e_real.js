/* Real-textdb smoke test (one league, throwaway: random 80-bit id, name "e2e smoke throwaway").
   Flow: create league via the wizard, one second phone joins, commissioner starts, 2 picks, 1 chat message.
   Afterwards EVERY key the league can have is blanked (POST "") and verified empty, and the list is printed.
   node tests/e2e_real.js     (needs the static server: node tools/mock_textdb.js 9995 . 9996 ; only the static side is used)  */
const L=require('./lib.js');const F=require('../js/core.js');const {sleep,APP}=L;
const MOCK=!!process.env.MOCK,DESK=!!process.env.DESK,SH=process.env.SHOTS||'';   /* MOCK=1 runs the same flow against the local mock; DESK=1 uses a 1280 viewport; SHOTS=prefix saves screenshots */
const REAL=MOCK?L.API:'https://textdb.dev/api/data/';const VP=DESK?{desktop:true,w:1280,h:860}:{};
let n=0,bad=0;const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?' -> '+JSON.stringify(x).slice(0,200):''))}};
async function waitFor(fn,ms,label){const t=Date.now();while(Date.now()-t<(ms||20000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(400)}throw new Error('timeout '+(label||''))}
const txt=(P,s)=>P.page.$eval(s,e=>e.innerText).catch(()=>null);const ex=(P,s)=>P.page.$(s).then(x=>!!x);
const click=async(P,s)=>{await P.page.waitForSelector(s,{visible:true,timeout:20000});await P.page.$eval(s,e=>e.scrollIntoView({block:'center'}));try{await P.page.click(s)}catch(e){await P.page.$eval(s,e=>e.click())}};
const typeIn=async(P,s,v)=>{await P.page.waitForSelector(s,{visible:true});await P.page.$eval(s,e=>{e.value=''});await P.page.type(s,v)};
const retry=async f=>{let e;for(let i=0;i<4;i++){try{return await f()}catch(x){e=x;await sleep(1500*(i+1))}}throw e};   /* the test machine's own network can drop a request: retry before failing */
const get=async k=>retry(async()=>(await fetch(REAL+encodeURIComponent(k))).text());
const post=async(k,v)=>retry(()=>fetch(REAL+encodeURIComponent(k),{method:'POST',headers:{'content-type':'text/plain'},body:v}));
(async()=>{let id=null,mids=[],C,J;const t0=Date.now();
try{
  C=await L.phone('real-commish',Object.assign({real:!MOCK},VP));J=await L.phone('real-joiner',Object.assign({real:!MOCK},VP));
  await C.go('setup.html');
  const nx=()=>click(C,'#next');
  await typeIn(C,'#f_name','e2e smoke throwaway');await typeIn(C,'#f_mgr','Smoke One');await typeIn(C,'#f_team','Smoke Team 1');await nx();
  /* no managers question: every league has exactly 8 */
  await waitFor(async()=>/Draft style/.test(await txt(C,'h1')));await nx();
  await waitFor(async()=>/Draft day/.test(await txt(C,'h1')));await C.page.click('[data-v=now]');await nx();
  await waitFor(async()=>/Who picks first/.test(await txt(C,'h1')));await C.page.click('[data-v=manual]');await nx();   /* join order: the two real phones hold seats 1 and 2, so picks 1 and 2 are theirs */
  await waitFor(async()=>/Time to pick/.test(await txt(C,'h1')));await C.page.click('[data-v="180"]');await nx();
  await waitFor(async()=>/Teams per manager/.test(await txt(C,'h1')));await nx();
  await waitFor(async()=>/runs out of time/.test(await txt(C,'h1')));await nx();
  await waitFor(async()=>/Check it over/.test(await txt(C,'h1')));if(SH)await C.shot(SH+'wizard_confirm');await click(C,'#create');await waitFor(()=>ex(C,'#made'),60000,'create');
  id=F.parseCode((await txt(C,'#code')).replace(/[^0-9A-Z]/g,''));ok('league created on real textdb (id '+id.slice(0,4)+'…)',!!id);
  const K=F.Keys(id);const invite=await C.page.$eval('#lnk_invite a.url',e=>e.href);
  const meta=F.parseJ(await get(K.meta));ok('meta readable from textdb.dev',meta&&meta.id===id&&meta.settings.managers===8,meta&&meta.settings);
  await J.page.goto(invite,{waitUntil:'domcontentloaded'});await waitFor(()=>ex(J,'#jform'),30000);await typeIn(J,'#f_name','Smoke Two');await typeIn(J,'#f_team','Smoke Team 2');await click(J,'#joinbtn');await waitFor(()=>ex(J,'#joined'),60000,'join');ok('second phone joined',true);
  const c2=await Promise.all([1,2,3,4,5,6,7,8].map(async i=>F.parseClaim(await get(K.slot(i,0)))));mids=c2.filter(Boolean).map(c=>c.mid);ok('two slots claimed in the real store',mids.length===2,mids);
  /* the draft needs exactly 8 managers: seats 3 to 8 are filled with plain claims written straight to the store (blanked again at the end) */
  for(let i=3;i<=8;i++)await post(K.slot(i,0),JSON.stringify(F.makeClaim({mid:F.hexId(12),i,name:'Smoke Seat '+i,team:'Smoke Team '+i})));
  {const cm=await C.page.$eval('#lnk_commish a.url',e=>e.href).catch(()=>'');const sec=(/#cm=([0-9a-f]{32})/.exec(cm)||[])[1];const mj=await get(K.meta);const blob=mj+(await Promise.all([1,2,3,4,5,6,7,8].map(i=>get(K.slot(i,0))))).join('');const k0=await C.page.evaluate(i=>JSON.parse(localStorage.getItem('fbn.me.'+i)||'{}').k,id),k1=await J.page.evaluate(i=>JSON.parse(localStorage.getItem('fbn.me.'+i)||'{}').k,id);
   ok('real store holds only salted hashes: no commissioner or manager secret appears in meta or claims',!!sec&&!!k0&&!!k1&&!blob.includes(sec)&&!blob.includes(k0)&&!blob.includes(k1)&&c2.filter(Boolean).every(c=>/^[0-9a-f]{64}$/.test(c.sh)));
   ok('commissioner token on the phone is the secret, not the stored hash',await C.page.evaluate((i,sec)=>localStorage.getItem('fbn.cm.'+i)===sec,id,sec))}
  await C.page.goto(await C.page.$eval('#toRoom',e=>e.href).catch(()=>APP+'/room.html?l='+id),{waitUntil:'domcontentloaded'}).catch(()=>{});
  await C.page.goto(APP+'/room.html?l='+id,{waitUntil:'domcontentloaded'});await waitFor(()=>ex(C,'#startbtn'),40000,'lobby');
  await J.page.goto(APP+'/room.html?l='+id,{waitUntil:'domcontentloaded'});await waitFor(()=>ex(J,'#lobbycard'),40000,'joiner lobby');
  await waitFor(async()=>/8 of 8 joined/.test(await txt(C,'#joinedct')||''),40000,'8 of 8');if(SH){await sleep(500);await C.shot(SH+'lobby')}
  await click(C,'#startbtn');await click(C,'#cfyes');const live=await waitFor(async()=>{const m=F.parseJ(await get(K.meta));return m&&m.status==='live'&&m},40000,'live');ok('draft started',!!live);
  const picker=async(P,k)=>{await waitFor(async()=>new RegExp('Pick #'+k+' ').test((await txt(P,'#banner'))||''),90000,'banner #'+k);await waitFor(()=>ex(P,'#pickbtn'),60000,'pickbtn');if(SH&&k===1){await sleep(400);await P.shot(SH+'on_the_clock')}await P.page.evaluate(()=>{const s=document.querySelector('#sheetwrap [data-a=sheetbg]');if(s)s.click()});await click(P,'#pickbtn');await waitFor(()=>ex(P,'#pickov .trow.go'),20000);
    for(let a=0;a<5;a++){await P.page.evaluate(()=>{const r=document.querySelector('#pickov .trow.go');if(r)r.click()});if(await waitFor(()=>ex(P,'#confirmpick'),2000).catch(()=>false))break}await click(P,'#confirmpick')};
  const byMid={};const me0=await C.page.evaluate(i=>JSON.parse(localStorage.getItem('fbn.me.'+i)),id),me1=await J.page.evaluate(i=>JSON.parse(localStorage.getItem('fbn.me.'+i)),id);byMid[me0.mid]=C;byMid[me1.mid]=J;
  for(let k=1;k<=2;k++){const s=F.slotAt(live.order,k,live.settings.type,live.settings.rounds);await picker(byMid[s.owner],k);const e=await waitFor(async()=>F.parseEntry(await get(K.pick(1,k))),60000,'pick '+k);ok('pick '+k+' stored in its own key',e&&e.owner===s.owner,e)}
  if(SH){await sleep(1500);await C.page.evaluate(()=>{const b=document.querySelector('[data-t=board]');if(b)b.click()});await sleep(500);await C.shot(SH+'board_mid');await C.page.goto(APP+'/recap.html?l='+id,{waitUntil:'domcontentloaded'});await waitFor(()=>ex(C,'#recaphead'),30000);await sleep(500);await C.shot(SH+'recap_partial')}
  await J.page.evaluate(()=>document.querySelector('[data-t=chat]').click());await typeIn(J,'#cin','smoke test hello');await click(J,'[data-a=send]');
  const chat=await waitFor(async()=>{const c=F.parseJ(await get(K.chat));return c&&c.msgs&&c.msgs.length&&c},60000,'chat');ok('chat message stored in the chat key',/smoke test hello/.test(JSON.stringify(chat)));
  for(const P of [C,J])if(P.errs.length)console.log('page errors',P.name,P.errs.slice(0,3));
}catch(e){bad++;console.log('EXCEPTION',e.stack||e)}
finally{for(const P of [C,J]){try{const me=id&&await P.page.evaluate(i=>JSON.parse(localStorage.getItem('fbn.me.'+i)||'null'),id);if(me&&me.mid&&!mids.includes(me.mid))mids.push(me.mid)}catch(e){}}await L.close();
  const keys=[];
  if(id){const K=F.Keys(id);keys.push(K.meta,K.chat);for(let i=1;i<=8;i++)keys.push(K.slot(i,0));for(let k=1;k<=6;k++)keys.push(K.pick(1,k));
    mids.forEach(m=>keys.push(K.mgr(m),K.pref(m),K.pres(m)));}
  // only blank keys we know could be ours; first record which ones held data
  const written=[];for(const k of keys){const v=await get(k).catch(()=>'');if(v&&v.length)written.push(k)}
  for(const k of written)await post(k,'');
  const left=[];for(const k of written){const v=await get(k).catch(()=>'x');if(v&&v.length)left.push(k)}
  console.log('\nKEYS WRITTEN ('+written.length+'):\n  '+written.join('\n  '));console.log('BLANKED and verified empty: '+(written.length-left.length)+' / '+written.length+(left.length?(' STILL FULL: '+left.join(',')):''));
  console.log('\n'+(n-bad)+' / '+n+' real-textdb checks passed — '+((Date.now()-t0)/1000).toFixed(0)+'s');process.exit(bad||left.length?1:0)}
})();
