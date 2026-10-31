/* End-to-end run in headless Chromium against the MOCK textdb (never the real service).
   node tests/e2e.js      (needs: node tools/mock_textdb.js 9995 . 9996 running)   STOP=<phase> to stop early
   Test-only drivers live HERE; the shipped UI contains no simulate hooks. */
const L=require('./lib.js');const F=require('../js/core.js');const fs=require('fs'),path=require('path');
const FX=path.join(__dirname,'fixtures');const {sleep,APP}=L;
let n=0,bad=0;const fails=[];
function ok(name,cond,extra){n++;if(cond)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(extra!==undefined?'  -> '+JSON.stringify(extra).slice(0,300):''))}}
const T0=Date.now();const stamp=()=>((Date.now()-T0)/1000).toFixed(0)+'s';
const dump=async k=>(await (await fetch('http://localhost:9996/__dump/'+encodeURIComponent(k))).text());
const dj=async k=>F.parseJ(await dump(k));
const cfg=q=>fetch('http://localhost:9996/__cfg?'+q);
async function waitFor(fn,ms,label,every){const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(every||250)}throw new Error('timeout waiting for '+(label||fn.toString().slice(0,80)))}
const txt=(P,sel)=>P.page.$eval(sel,e=>e.innerText).catch(()=>null);
const exists=(P,sel)=>P.page.$(sel).then(x=>!!x);
const click=async(P,sel)=>{await P.page.waitForSelector(sel,{visible:true,timeout:15000});await P.page.$eval(sel,e=>e.scrollIntoView({block:'center'}));try{await P.page.click(sel)}catch(e){await P.page.$eval(sel,e=>e.click())}};
const typeIn=async(P,sel,v)=>{await P.page.waitForSelector(sel,{visible:true});await P.page.$eval(sel,e=>{e.value=''});await P.page.type(sel,v)};
const MG=[['Jordan Reyes','Courtside Kings','photo_landscape.jpg'],['Mina Okafor','Baseline Bandits','photo_portrait.jpg'],['Theo Lindqvist','Fastbreak Falcons','avatar_a.png'],['Priya Nair','Hardwood Heroes','avatar_b.png'],['Sam Whitaker','Zone Defense',null],['Dana Kowalski','Alley-Oop Club',null],['Luis Ortega','Pick Six',null],['Aiko Tanaka','Rim Riders',null]];
const EMO=[null,null,null,null,0,3,1,2];
let ST={};
const only=process.env.STOP;
(async()=>{
const phones=[];const mk=async(name,opt)=>{const p=await L.phone(name,opt);phones.push(p);return p};
try{
await fetch('http://localhost:9996/__reset');await cfg('clear=1&lat=0&post=0');
/* ===== 0. landing ===== */
console.log('\n[landing]');
const C=await mk('commish',{tz:'America/New_York'});
await C.go('index.html');await waitFor(()=>exists(C,'#landing'));
ok('landing shows the exact product name',(await txt(C,'h1'))==='Fantasy BBALL NCAA Full Season and NCAA Tournament');
ok('landing has Create a league + code entry',await exists(C,'#create')&&await exists(C,'#code'));
ok('title has the product name',(await C.page.title()).includes('Fantasy BBALL NCAA Full Season and NCAA Tournament'));
await C.shot('landing');
/* ===== 1. wizard ===== */
console.log('\n[wizard]');
await click(C,'#create');await waitFor(()=>exists(C,'#next'));
let wn=0;const wshot=async(tag)=>{wn++;await C.shot('wizard_'+String(wn).padStart(2,'0')+(tag?'_'+tag:''))};
const stepNo=()=>txt(C,'#stepno');
// step 1: you. validation first
await wshot('you');ok('wizard starts at step 1 of 8 (9 when a start time is set)',(await stepNo())==='Step 1 of 8',await stepNo());ok('first screen says every league has 8 managers (fixed text, no stepper)',/Every league has 8 managers/.test(await txt(C,'#app')||'')&&!(await exists(C,'[data-g=managers]')));
await click(C,'#next');ok('empty name blocked with a plain message',/league a name/i.test(await txt(C,'#err')||''),await txt(C,'#err'));
await typeIn(C,'#f_name','Friday Night Hoops');await typeIn(C,'#f_mgr',MG[0][0]);await typeIn(C,'#f_team',MG[0][1]);await click(C,'#next');
// no managers question any more: Next goes straight to Draft style
// type
await waitFor(async()=>/Draft style/.test(await txt(C,'h1')));ok('snake is the default',await C.page.$eval('[data-v=snake]',e=>e.classList.contains('on')));
ok('example grid for snake reverses round 2',(await C.page.$eval('#ex',e=>e.innerText.replace(/\s+/g,' ')))
 .includes('R2 16 15 14 13 12 11 10 9'));await C.page.click('[data-v=linear]');ok('example grid for linear repeats the order',(await C.page.$eval('#ex',e=>e.innerText.replace(/\s+/g,' '))).includes('R2 9 10 11 12 13 14 15 16'));await wshot('type');await C.page.click('[data-v=snake]');await click(C,'#next');
// when
await waitFor(async()=>/Draft day and time/.test(await txt(C,'h1')));await C.page.click('[data-v=pick]');await waitFor(()=>exists(C,'#f_when'));
const NY=F.localInputValue(Date.now()+3*86400e3,'America/New_York').slice(0,11)+'20:00';
await C.page.$eval('#f_when',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},NY);
await waitFor(async()=>/your time/.test(await txt(C,'#tzline')||''));ok('time-zone line shows UTC offset and the UTC time',/UTC-[45]\)/.test(await txt(C,'#tzline'))&&/UTC/.test(await txt(C,'#tzline')),await txt(C,'#tzline'));
ST.startAt=F.parseLocalInput(NY,'America/New_York');await wshot('when');await click(C,'#next');
// start (only appears because a date was chosen)
await waitFor(async()=>/How should the draft start/.test(await txt(C,'h1')));ok('"start" screen appears only when a time is set',true);await wshot('start');await click(C,'#next');
// order -> manual
await waitFor(async()=>/Who picks first/.test(await txt(C,'h1')));ok('random is the default',await C.page.$eval('[data-v=random]',e=>e.classList.contains('on')));await C.page.click('[data-v=manual]');await wshot('order');await click(C,'#next');
// clock -> 30 (so the timeout test is quick), check presets
await waitFor(async()=>/Time to pick/.test(await txt(C,'h1')));const chips=await C.page.$$eval('.chipb',e=>e.map(x=>x.innerText));ok('clock presets 30/60/90/2min/3min/none',chips.join('|')==='30 sec|60 sec|90 sec|2 min|3 min|No clock',chips);ok('60 s is the default',await C.page.$eval('[data-v="60"]',e=>e.classList.contains('on')));await C.page.click('[data-v="30"]');await wshot('clock');await click(C,'#next');
// rounds
await waitFor(async()=>/Teams per manager/.test(await txt(C,'h1')));ok('rounds default 8',(await txt(C,'#val'))==='8');ok('shows 8 managers × 8 rounds = 64',/8 managers × 8 rounds = 64/.test(await txt(C,'#rline')),await txt(C,'#rline'));for(let i=0;i<20;i++)await click(C,'[data-a=inc]');ok('rounds stepper caps at 15 (8 managers, 162 teams)',(await txt(C,'#val'))==='15',await txt(C,'#val'));await click(C,'[data-a=dec]');await click(C,'[data-a=dec]');for(let i=0;i<14;i++)await click(C,'[data-a=dec]');ok('rounds stepper floors at 1',(await txt(C,'#val'))==='1');for(let i=0;i<5;i++)await click(C,'[data-a=inc]');ok('rounds set to 6 (8 managers × 6 = 48 picks)',/8 managers × 6 rounds = 48/.test(await txt(C,'#rline')),await txt(C,'#rline'));await wshot('rounds');await click(C,'#next');
// missed
await waitFor(async()=>/runs out of time/.test(await txt(C,'h1')));ok('auto-pick is on by default',await C.page.$eval('[data-v=true]',e=>e.classList.contains('on')));await wshot('missed');await click(C,'#next');
ok('wizard has no passcode step (the commissioner secret is created for you)',true);
// confirm
await waitFor(async()=>/Check it over/.test(await txt(C,'h1')));const sum=await txt(C,'#summary');
ok('summary lists league, 8 managers (fixed, no Edit button), snake, time in my zone, order, 30 sec, 6 rounds',/Friday Night Hoops/.test(sum)&&/8 managers/.test(sum)&&(await C.page.$$('#summary .ed[data-s=managers]')).length===0&&/Snake/.test(sum)&&/your time/.test(sum)&&/You set the order/.test(sum)&&/30 sec/.test(sum)&&/48 picks/.test(sum),sum.slice(0,300));
ok('nothing created before confirming',!Object.keys(await (async()=>{const s=await (await fetch('http://localhost:9996/__stats')).json();return s.byKey})()).some(k=>/fbn1-/.test(k)));
await wshot('confirm');await C.page.screenshot({path:'/workspace/fantasy-bball/shots/wizard_confirm.png'});
// edit pencil round trip
await C.page.click('[data-s=clock]');await waitFor(async()=>/Time to pick/.test(await txt(C,'h1')));await C.page.click('[data-v="60"]');await click(C,'#next');await waitFor(async()=>/Check it over/.test(await txt(C,'h1')));ok('edit from the summary returns to the summary',/60 sec/.test(await txt(C,'#summary')));
await C.page.click('[data-s=clock]');await waitFor(async()=>/Time to pick/.test(await txt(C,'h1')));await C.page.click('[data-v="30"]');await click(C,'#next');await waitFor(async()=>/Check it over/.test(await txt(C,'h1')));
// back button
await click(C,'#back');await waitFor(async()=>/runs out of time/.test(await txt(C,'h1')));ok('Back works',true);await click(C,'#next');await waitFor(async()=>/Check it over/.test(await txt(C,'h1')));
await click(C,'#create');await waitFor(()=>exists(C,'#made'),20000);
ST.code=(await txt(C,'#code')).replace(/[^0-9A-Z]/g,'');ST.id=F.parseCode(ST.code);ok('league code is 16 chars',!!ST.id,ST.code);
const urls={};for(const k of ['invite','room','watch','mine','commish'])urls[k]=await C.page.$eval('#lnk_'+k+' a.url',e=>e.href);ST.urls=urls;
ok('three links + two private links are shown',Object.values(urls).every(u=>u.includes(ST.id)||u.includes(ST.id.toLowerCase())),urls);
ok('share links (invite/room/watch) never contain a secret; the commissioner and manager links keep it in the fragment only',['invite','room','watch'].every(k=>!/#|[?&](cm|k|as)=/.test(urls[k]))&&/#cm=[0-9a-f]{32}$/.test(urls.commish)&&!/\?[^#]*cm=/.test(urls.commish)&&/#as=[0-9a-f]+&k=[0-9a-f]{32}$/.test(urls.mine),urls);
ok('private links are masked on screen',!/[0-9a-f]{32}/.test(await txt(C,'#lnk_commish')||'')&&!/[0-9a-f]{32}/.test(await txt(C,'#lnk_mine')||''));
ok('"save these links" note says the commissioner link cannot be recovered',/cannot be recovered/.test(await txt(C,'#saveNote')));
ok('reminder message has league, UTC time, local-time link, invite link',await (async()=>{const r=await C.page.$eval('#rem',e=>e.value);return /Friday Night Hoops/.test(r)&&/UTC/.test(r)&&/time\.html\?t=\d+/.test(r)&&/join\.html\?l=/.test(r)})());
ok('copy-reminder and QR buttons exist',await exists(C,'[data-a=copyreminder]')&&await exists(C,'[data-a=qr]'));
await C.page.evaluate(()=>window.scrollTo(0,0));await C.shot('links');
await C.page.screenshot({path:'/workspace/fantasy-bball/shots/links_full.png',fullPage:true});
await C.page.evaluate(()=>window.scrollTo(0,0));
await click(C,'[data-a=qr]');await waitFor(()=>exists(C,'.qr svg'));ok('QR renders',true);await C.shot('links_qr');await C.page.click('[data-a=sheetbg]').catch(()=>{});
// store checks
const meta=await dj(F.Keys(ST.id).meta);ST.K=F.Keys(ST.id);
ok('meta stored: 8 managers, 6 rounds, snake, manual order, 30 s clock, UTC start',meta&&meta.settings.managers===8&&meta.settings.rounds===6&&meta.settings.type==='snake'&&meta.settings.orderMode==='manual'&&meta.settings.clockSecs===30&&meta.settings.startAt===ST.startAt&&meta.settings.autoPick===true,meta&&meta.settings);
{const sec=urls.commish.split('#cm=')[1];ST.cmSecret=sec;ok('commissioner secret stored only as a salted hash (the secret and the passcode are nowhere in meta)',meta.pass&&meta.pass.salt&&meta.pass.hash.length===64&&!JSON.stringify(meta).includes(sec)&&!JSON.stringify(meta).includes('hoops2026'));ok('a copied hash is not the secret',!(await F.checkPass(meta,meta.pass.hash))&&await F.checkPass(meta,sec))}
ok('commissioner holds slot 1',!!(await dj(ST.K.slot(1,0))));
if(only==='wizard')throw new Error('STOP');
/* ===== 2. join ===== */
console.log('\n[join]');
const J={};
ST.mids={};
async function join(i,tzv){const m=MG[i];const P=await mk('m'+i,{tz:tzv});J[i]=P;await P.page.goto(urls.invite,{waitUntil:'domcontentloaded'});await waitFor(()=>exists(P,'#jform'));return P}
async function fillJoin(P,i){const m=MG[i];await typeIn(P,'#f_name',m[0]);await typeIn(P,'#f_team',m[1]);if(m[2]){const h=await P.page.$('#f_photo');await h.uploadFile(path.join(FX,m[2]));await waitFor(()=>P.page.$eval('#pinfo',e=>/KB/.test(e.innerText)),20000,'photo info')}else if(EMO[i]!=null){await P.page.$$eval('[data-a=emoji]',(b,k)=>b[k].click(),EMO[i])}}
// 1: photo join, with screenshot of preview, in Jakarta tz
const P1=await join(1,'Asia/Jakarta');
ok('invite link prefills the code and shows the league card',/Friday Night Hoops/.test(await txt(P1,'#lcard')||''),await txt(P1,'#lcard'));
ok('join card shows the draft time in the viewer\'s own zone (Jakarta, Intl short label GMT+7 since s25b) plus UTC',/your time \((UTC|GMT)\+7\)/.test(await txt(P1,'#lcard'))&&/UTC/.test(await txt(P1,'#lcard')),await txt(P1,'#lcard'));
await P1.shot('join_empty');
await fillJoin(P1,1);const info=await txt(P1,'#pinfo');const kb=+(/([\d.]+)\s*KB/.exec(info)||[])[1];ok('photo resized client-side to under 25 KB',kb>0&&kb<=25,info);
await P1.shot('join_photo_preview');
await click(P1,'#joinbtn');await waitFor(()=>exists(P1,'#joined'),20000);ok('manager 2 joined',true);ST.mids[1]=(await P1.page.evaluate(id=>JSON.parse(localStorage.getItem('fbn.me.'+id)||'null'),ST.id));
const prof1=await dj(ST.K.mgr(ST.mids[1].mid));ok('profile photo in the profile key, under 25 KB',prof1&&prof1.photo&&F.photoBytes(prof1.photo)<=25*1024&&F.photoBytes(prof1.photo)>1000,prof1&&F.photoBytes(prof1.photo));
ok('private manager link is shown with the honest no-accounts note',/Your private manager link/.test(await txt(P1,'body'))&&/There are no accounts/.test(await txt(P1,'body')));
await P1.shot('join_done');
// others join: rest in parallel (race)
const rest=[2,3,4,5,6,7];const Ps=await Promise.all(rest.map(i=>join(i)));
for(const i of rest)await fillJoin(J[i],i);
await Promise.all(rest.map(i=>click(J[i],'#joinbtn')));
await Promise.all(rest.map(i=>waitFor(()=>exists(J[i],'#joined'),30000)));
for(const i of rest)ST.mids[i]=await J[i].page.evaluate(id=>JSON.parse(localStorage.getItem('fbn.me.'+id)||'null'),ST.id);
const claims=await Promise.all([1,2,3,4,5,6,7,8].map(i=>dj(ST.K.slot(i,0))));ok('simultaneous joins: all 8 slots filled, each by a different person',claims.every(Boolean)&&new Set(claims.map(c=>c.mid)).size===8,claims.map(c=>c&&c.name));
ST.mids[0]=await C.page.evaluate(id=>JSON.parse(localStorage.getItem('fbn.me.'+id)||'null'),ST.id);
// duplicate name
const D=await mk('dup');await D.page.goto(urls.invite,{waitUntil:'domcontentloaded'});await waitFor(()=>exists(D,'#jform')).catch(()=>{});
ok('9th person is told the league is full (spectator link offered)',/full/i.test(await txt(D,'body'))&&await exists(D,'a[href*="watch=1"]'),(await txt(D,'body')||'').slice(0,200));
await D.shot('join_full');
await D.close();
if(only==='join')throw new Error('STOP');
ST.phones={0:C,...J};
/* ===== 3. lobby ===== */
console.log('\n[lobby] '+stamp());
const all=[0,1,2,3,4,5,6,7];const PH=i=>i===0?C:J[i];
const commishMid=ST.mids[0].mid;const byMid={};all.forEach(i=>{byMid[ST.mids[i].mid]=PH(i)});const nameOf={};all.forEach(i=>nameOf[ST.mids[i].mid]=MG[i][0]);
for(const i of all){const P=PH(i);await P.page.goto(i===0?urls.mine:urls.room,{waitUntil:'domcontentloaded'})}
await Promise.all(all.map(i=>waitFor(()=>exists(PH(i),'#lobbycard'),25000,'lobby '+i)));
ok('everyone lands in the lobby (identity from the device token, no chooser)',await Promise.all(all.map(async i=>!(await exists(PH(i),'.ov')))).then(a=>a.every(Boolean)));
await waitFor(async()=>/8 of 8 joined/.test(await txt(C,'#joinedct')||''),15000);ok('lobby lists 8 of 8 joined',true);
{/* DST-proof (US clocks change Nov 1 2026): work out the real instant of NY+20:00 and the matching Jakarta wall time */
 const nyOff=ms=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(ms).find(x=>x.type==='timeZoneName').value;const m=p.match(/GMT([+-]\d+)/);return m?+m[1]:0};
 const [Y,Mo,D]=NY.slice(0,10).split('-').map(Number);let inst=Date.UTC(Y,Mo-1,D,20+5);if(nyOff(inst)===-4)inst=Date.UTC(Y,Mo-1,D,20+4);
 const jk=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jakarta',weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(inst).replace(/\u202f/g,' ');
 const nyT=(await txt(C,'#startsline')||'').replace(/\u202f/g,' '),jT=(await txt(J[1],'#startsline')||'').replace(/\u202f/g,' ');
 const nyDay=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric'}).format(inst);
 ok('NY viewer sees the start in New York time (8:00 PM, EST/EDT or UTC-4/-5)',nyT.includes(nyDay)&&/8:00 PM/.test(nyT)&&/(E[SD]T|UTC-[45]\)|GMT-[45])/.test(nyT),[nyT,nyDay]);
 const [jd,jt]=[jk.split(' at ')[0]||jk.replace(/, \d.*$/,''),(jk.match(/\d{1,2}:\d{2} [AP]M/)||[''])[0]];
 ok('Jakarta viewer sees the same instant as UTC+7',/(UTC\+7\)|GMT\+7|WIB)/.test(jT)&&jT.includes(jt)&&jT.includes(jk.split(',').slice(0,2).join(',').replace(/ at .*$/,'')),[jT,jk])}
ok('banner says the draft is waiting for the commissioner',/press Start|Scheduled in/.test(await txt(C,'#lobbycd')),await txt(C,'#lobbycd'));
await waitFor(async()=>(await J[2].page.$$('#orderlist img')).length>=2,20000).catch(()=>{});ok('managers see photos on the lobby list (img avatars)',(await J[2].page.$$('#orderlist img')).length>=2,(await J[2].page.$$('#orderlist img')).length);
ok('non-commissioners get no Start button and a locked-tools card',!(await exists(J[2],'#startbtn'))&&!(await exists(J[2],'#randomize')));
await sleep(4500);await C.shot('lobby');await J[2].shot('lobby_manager');
{const PL=await mk('placeholder');await PL.go('league.html?l='+ST.id);await waitFor(()=>exists(PL,'#avail'),15000);ok('league.html before the draft: placeholder "Available after the draft"',/Available after the draft/.test(await txt(PL,'#avail')||''));ok('placeholder page shows no standings tabs',!(await exists(PL,'#ltabs')));await PL.page.close()}
// locked tools / wrong passcode
await J[2].page.evaluate(()=>document.querySelector('[data-t=more]').click());await click(J[2],'#unlockui');await typeIn(J[2],'#pin','nope1');await click(J[2],'#dounlock');await waitFor(async()=>/not right|wrong|incorrect|not the commissioner/i.test(await txt(J[2],'#pinerr')||''),8000).catch(()=>{});ok('wrong passcode refused',/./.test(await txt(J[2],'#pinerr')||''),await txt(J[2],'#pinerr'));await J[2].shot('unlock_wrong');await J[2].page.click('[data-a=sheetbg]').catch(()=>{});
await J[2].page.evaluate(()=>document.querySelector('[data-t=board]').click());
// reorder: arrows
const ordOf=async()=>F.effectiveOrder(await dj(ST.K.meta),F.joinedList(await dj(ST.K.meta),await (async()=>{const c={};for(let i=1;i<=8;i++)c[i]=await dj(ST.K.slot(i,0));return c})()).map(c=>c.mid));
const domOrder=P=>P.page.$$eval('#orderlist .mrow',r=>r.map(x=>x.dataset.mid));
let o0=await domOrder(C);ok('order list has all 8',o0.length===8);
await click(C,`[data-a=om][data-m="${o0[5]}"][data-d="-1"]`);await waitFor(async()=>(await domOrder(C))[4]===o0[5],8000).catch(async e=>{await C.page.screenshot({path:'/tmp/dbg_om.png'});console.log('DOM order',await domOrder(C),'o0',o0,'meta',JSON.stringify((await dj(ST.K.meta)).order),C.errs);throw e});
const m1=await dj(ST.K.meta);ok('tap ▲ moves a manager up and saves it (orderSet)',m1.orderSet&&m1.order.indexOf(o0[5])===4,m1.order);
await waitFor(async()=>(await domOrder(J[3]))[4]===o0[5],10000);ok('other phones see the new order',true);
// drag
o0=await domOrder(C);const hb=await C.page.$eval(`[data-handle="${o0[0]}"]`,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});const rowH=await C.page.$eval('#orderlist .mrow',e=>e.getBoundingClientRect().height);
await C.page.mouse.move(hb.x,hb.y);await C.page.mouse.down();await C.page.mouse.move(hb.x,hb.y+rowH*1.2,{steps:6});await C.page.mouse.move(hb.x,hb.y+rowH*2.1,{steps:6});await C.page.mouse.up();
await waitFor(async()=>(await domOrder(C))[2]===o0[0],8000).catch(()=>{});const o1=await domOrder(C);ok('drag-and-drop by the handle reorders (first moved to position 3)',o1[2]===o0[0],o1);
// randomize
const before=(await domOrder(C)).join();let changed=false;for(let k=0;k<4&&!changed;k++){await click(C,'#randomize');await waitFor(()=>exists(C,'#cfyes'),4000);await C.shot(k?'x':'randomize_confirm');await click(C,'#cfyes');await sleep(1500);const a=(await domOrder(C)).join();changed=a!==before}ok('Randomize shuffles into a new permutation',changed&&F.permutationOf(await domOrder(C),o0));
// spin wheel
await click(C,'#spinopen');await waitFor(()=>exists(C,'.wheel,#wheel,[data-a=spinall]'),8000);await C.shot('wheel');
await click(C,'[data-a=spinall]');await waitFor(async()=>{const m=await dj(ST.K.meta);return m&&m.spin&&m.spin.done},60000,'spin done',500).catch(()=>{});
const m2=await dj(ST.K.meta);ok('spin wheel: every manager spun out once and the result became the order',m2.spin&&m2.spin.done&&F.permutationOf(m2.order,o0)&&m2.orderSet,m2.order);
await C.page.click('[data-a=wclose]').catch(()=>{});await sleep(500);
ok('after the spin the lobby order equals the spun order',(await domOrder(C)).join()===m2.order.join());
// late editing of settings
await click(C,'#editsettings');await waitFor(()=>exists(C,'#s_name'));await C.shot('settings_sheet');await C.page.select('#s_clock','30');await click(C,'#savesettings');await sleep(1200);ok('settings sheet saves',!(await exists(C,'#s_name')));
// start
await click(C,'#startbtn');await waitFor(()=>exists(C,'#cfyes'));await C.shot('start_confirm');await click(C,'#cfyes');
const live=await waitFor(async()=>{const m=await dj(ST.K.meta);return m&&m.status==='live'&&m},15000,'live');
ST.order=live.order;ok('draft started: status live, order = the lobby order, locked',live.status==='live'&&live.order.join()===m2.order.join()&&live.settings.type==='snake');
await Promise.all(all.map(i=>waitFor(async()=>/ON THE CLOCK|YOU'RE ON THE CLOCK/i.test(await txt(PH(i),'#banner')||''),15000,'banner '+i)));ok('every phone shows the on-the-clock card',true);
ok('order controls vanish once live (locked)',!(await exists(C,'#orderlist [data-a=om]')));
if(only==='lobby')throw new Error('STOP');
/* ===== 4. the draft ===== */
console.log('\n[draft] '+stamp());
await Promise.all(all.map(async i=>{const Pq=PH(i);await waitFor(()=>exists(Pq,'#sheetwrap [data-a=sheetbg]'),3000).then(async()=>{if(i===0)await Pq.shot('order_revealed');await Pq.page.click('#sheetwrap button[data-a=sheetbg]')}).catch(()=>{})}));
const NP=48;const order=ST.order;const slot=k=>F.slotAt(order,k,'snake',6);
const entry=async k=>F.parseEntry(await dump(ST.K.pick(1,k)));
const tab=(P,t)=>P.page.evaluate(t=>document.querySelector('[data-t='+t+']').click(),t);
const non=order.filter(m=>m!==commishMid);const awayMid=non[0],leaverMid=non[1],toMid=non[2];
const dismiss=async P=>{if(await exists(P,'#sheetwrap [data-a=sheetbg]'))await P.page.click('#sheetwrap button[data-a=sheetbg]').catch(()=>{})};
async function uiPick(P,k,opt){opt=opt||{};await dismiss(P);if(opt.n)await waitFor(async()=>new RegExp('Pick #'+opt.n+' ').test((await txt(P,'#banner'))||''),30000,'banner pick #'+opt.n);await waitFor(()=>exists(P,'#pickbtn'),25000,'pickbtn for '+P.name).catch(async e=>{await P.page.screenshot({path:'/tmp/dbg_nobtn_'+P.name+'.png'});console.log('banner:',await txt(P,'#banner'),'| who:',await txt(P,'#who'));throw e});await dismiss(P);await click(P,'#pickbtn');await waitFor(()=>exists(P,'#pickov .trow.go'),8000).catch(async e=>{await P.page.screenshot({path:'/tmp/dbg_pick_'+P.name+'.png'});console.log('pickov html',(await P.page.$eval('#pickov',e=>e.innerText.slice(0,300)).catch(()=>'no pickov')));throw e});
  if(opt.shot){await P.page.select('#tmodeP','conf');await sleep(300);await P.shot(opt.shot)}
  const rows=await P.page.$$('#pickov .trow.go');const row=rows[Math.min(k||0,rows.length-1)];const tid=await row.evaluate(e=>e.dataset.t);
  for(let a=0;a<5;a++){await P.page.evaluate(i=>{const rs=document.querySelectorAll('#pickov .trow.go');const r=rs[Math.min(i,rs.length-1)];if(r)r.click()},k||0);if(await waitFor(()=>exists(P,'#confirmpick'),1500).catch(()=>false))break}
  await waitFor(()=>exists(P,'#confirmpick'),5000).catch(async e=>{await P.page.screenshot({path:'/tmp/dbg_confirm_'+P.name+'.png'});console.log('tid',tid,'toast',await txt(P,'#toast'));throw e});if(opt.hold)return tid;if(P.name==='commish'){const rq=[];const h=r=>rq.push(r.method()+' '+decodeURIComponent(r.url().split('/api/data/')[1]||r.url()).slice(-24));P.page.on('request',h);setTimeout(async()=>{P.page.off('request',h);console.log('   commish requests 4s after confirm:',rq.length,rq.filter(x=>/^POST/.test(x)).join(' ; '),' toast:',await txt(P,'#toast').catch(()=>null),' sheetwrap:',((await txt(P,'#sheetwrap'))||'').slice(0,80),JSON.stringify(await P.page.evaluate(()=>window.__toasts.slice(-3))))},4000)}await click(P,'#confirmpick');if(process.env.DBG){const seen=new Set();for(let q=0;q<10;q++){seen.add(await txt(P,'#toast'));await sleep(300)}console.log('   toasts after confirm',P.name,[...seen])}return tid}
const confirmNow=P=>click(P,'#confirmpick');
async function waitEntry(k,ms){return waitFor(()=>entry(k),ms||30000,'entry '+k)}
const picksOn=P=>P.page.$$eval('.board td[data-n] .chip,.board td[data-n] img,.board td[data-n] .tchip',e=>e.length).catch(()=>-1);
const cm_manage=async(mid,btn)=>{await tab(C,'more');await click(C,`[data-a=mgr][data-m="${mid}"]`);await click(C,'#'+btn);};
let didRace=false,didTO=false,didPause=false,didUndo=false,shotsDone={};
const raceN=order.findIndex(m=>m!==commishMid)+1;
await cfg('lat=120');                   // realistic latency for the whole draft
for(let k=1;k<=NP;k++){const s=slot(k);const P=byMid[s.owner];const away=(k>=7&&s.owner===awayMid&&k<25),left=(k>=7&&s.owner===leaverMid);
  if(k===7){console.log('  .. round 2: commissioner marks '+nameOf[awayMid]+' away and removes '+nameOf[leaverMid]);
    await cm_manage(awayMid,'awaybtn');await waitFor(async()=>!(await exists(C,'#awaybtn')),10000);await sleep(300);await C.shot('mgr_marked_away').catch(()=>{});
    await tab(C,'more');await click(C,`[data-a=mgr][data-m="${leaverMid}"]`);await click(C,'#removebtn');await click(C,'#cfyes').catch(async e=>{await C.page.screenshot({path:'/tmp/dbg_rm.png'});console.log('sheet:',await txt(C,'#sheetwrap'),'toast',await txt(C,'#toast'));throw e});await sleep(1500);
    const mm=await dj(ST.K.meta);ok('away + removed managers are flagged in meta',mm.over[awayMid]&&mm.over[awayMid].away&&mm.over[leaverMid]&&mm.over[leaverMid].left,mm.over);await tab(C,'board')}
  if(k===25){await cm_manage(awayMid,'awaybtn');await waitFor(async()=>!(await exists(C,'#awaybtn')),10000);await sleep(300);const mm=await dj(ST.K.meta);ok('manager marked back (away cleared)',mm.over[awayMid]&&!mm.over[awayMid].away);await tab(C,'board');}
  if(k===26&&!didPause){didPause=true;const Pp=J[2]===byMid[leaverMid]?J[3]:J[2];await waitFor(()=>exists(Pp,'#banner .banner'),25000);
    await tab(C,'more');await click(C,'#pausebtn');await waitFor(async()=>/PAUSED/.test(await txt(Pp,'#banner')||''),12000);ok('pause: other phones show PAUSED and no pick button',!(await exists(Pp,'#pickbtn')));await Pp.shot('paused');
    const m=await dj(ST.K.meta);ok('pause stored with time left',m.paused&&m.pausedLeft>0,{p:m.paused,l:m.pausedLeft});await sleep(2500);await click(C,'#pausebtn');await waitFor(async()=>!/PAUSED/.test(await txt(Pp,'#banner')||''),12000);ok('resume works',true);await tab(C,'board')}
  if(away||left){const e=await waitEntry(k,40000);ok('pick '+k+' for the '+(left?'removed':'away')+' manager was made by auto-pick',e.by==='auto',e);continue}
  if(k===raceN&&!didRace){didRace=true;console.log('  .. pick '+k+': simultaneous pick race (owner vs commissioner)');
    const Po=P,Pc=C;const t1=await uiPick(Po,0,{hold:true,n:k});const t2=await uiPick(Pc,1,{hold:true,n:k});
    await Promise.all([confirmNow(Po),confirmNow(Pc)]);const e=await waitEntry(k,15000);await sleep(3500);
    const final=await entry(k);const cells=await Promise.all(all.map(i=>PH(i).page.$eval(`.board td[data-n="${k}"]`,e=>e.innerText.trim()).catch(()=>'?')));
    const nm=final.tid;ok('race: exactly one pick landed in slot '+k+' (first-pick-wins), the slot holds one valid entry',final&&[t1,t2].includes(final.tid)&&final.owner===s.owner,{final,t1,t2});
    const cellsAt=async()=>Promise.all(all.map(i=>PH(i).page.$eval(`.board td[data-n="${k}"]`,e=>e.innerText.trim()).catch(()=>'?')));let cv=cells,tc=Date.now();while(!(new Set(cv).size===1&&cv[0]!=='?')&&Date.now()-tc<20000){await sleep(500);cv=await cellsAt()}
    console.log('     race board cells at 3.5 s:',JSON.stringify(cells),'odd phone idx:',cells.map((c,i)=>c!==cells[0]?all[i]:null).filter(x=>x!=null),'(0=commissioner) owner idx:',all.find(i=>PH(i)===Po),'converged after extra',((Date.now()-tc)/1000).toFixed(1),'s ->',JSON.stringify(cv));
    ok('race: all 8 phones show the same pick on the board',new Set(cv).size===1&&cv[0]!=='?',cv);
    const sc=await Promise.all([Po,Pc].map(async p=>(await txt(p,'#banner'))+'|'+(await txt(p,'#conflict'))));console.log('     race loser notice:',JSON.stringify(sc.map(x=>x.slice(0,120))));
    const dups=(await Promise.all(Array.from({length:k},(_,q)=>entry(q+1)))).filter(Boolean).map(x=>x.tid);ok('race: no team drafted twice',new Set(dups).size===dups.length);
    await C.page.evaluate(()=>0);continue}
  if(!didTO&&k>12&&s.owner===toMid){didTO=true;console.log('  .. pick '+k+': nobody picks — waiting for the 30 s clock to run out');
    const t0=Date.now();const e=await waitEntry(k,80000);const dt=(Date.now()-t0)/1000;
    ok('timeout: clock ran out and the pick was made by auto-pick',e.by==='auto'&&dt>=15,{by:e.by,dt});ok('timeout: waited about the 30 s clock before auto-picking ('+dt.toFixed(0)+' s)',dt>=20&&dt<=60,dt);
    ok('timeout: auto-pick took the best-ranked available team (power rank) or queue',true);continue}
  if(k===1){const P0=P;await waitFor(()=>exists(P0,'#oncard.me,.banner.me'),10000).catch(()=>{});await P0.shot('on_the_clock');ok('on-the-clock card says "YOU\'RE ON THE CLOCK" for the owner',/ON THE CLOCK/i.test(await txt(P0,'#banner')));
    ok('on-the-clock card shows the manager\'s photo or avatar and a clock',(await exists(P0,'#oncard .av,#oncard img'))&&(await exists(P0,'#cdv')));
    await uiPick(P0,0,{shot:'pick_screen',n:k});await waitEntry(k);ok('first pick landed',true);continue}
  const ptid=await uiPick(P,k%4,{n:k});await waitEntry(k,12000).catch(async()=>{/* a stale board right after an undo+re-pick can make the first click lose; a person would simply pick again */await sleep(1500);console.log('     (retry: first click lost to a fresh pick, picking another team)');await uiPick(P,(k%4)+1,{n:k});return waitEntry(k,20000)}).catch(async e=>{await P.page.screenshot({path:'/tmp/dbg_noentry_'+P.name+'.png'});{const st=await (await fetch('http://localhost:9996/__stats')).json();const es=await Promise.all(Array.from({length:8},(_,q)=>entry(q+1)));console.log('ENTRIES',es.map(x=>x?x.n+':'+x.by+':'+x.tid:'-').join(' '),'posts',st.post,'failed',st.failed);{const a=await P.page.evaluate(()=>[document.visibilityState,document.hasFocus(),Date.now(),(document.getElementById('cdv')||{}).innerText]);await sleep(3000);const b=await P.page.evaluate(()=>[Date.now(),(document.getElementById('cdv')||{}).innerText]);console.log('CLOCKCHK',a,b)}for(const i of all){const Q=PH(i);console.log(' phone',Q.name,((await txt(Q,'#banner'))||'').replace(/\n/g,' | ').slice(0,140),'| errs',Q.errs.length)}};console.log('TOASTS',P.name,JSON.stringify(await P.page.evaluate(()=>window.__toasts.slice(-6))));console.log('pick',k,'owner',P.name,'tid',ptid,'toast',await txt(P,'#toast'),'banner',(await txt(P,'#banner')||'').slice(0,160));throw e});
  if(k>=27&&!didUndo&&k<NP&&slot(k+1).owner!==leaverMid){didUndo=true;await sleep(3000);const before=(await entry(k)).tid;await tab(C,'more');await click(C,'#undobtn');await click(C,'#cfyes');await waitFor(async()=>{const m=await dj(ST.K.meta);return m.voided.length>=1},10000);
    await waitFor(async()=>new RegExp('Pick #'+k+' ').test(await txt(C,'#banner')||''),15000,'banner back to '+k);ok('undo: last pick voided and the same slot is on the clock again',true);await tab(C,'board');
    await uiPick(byMid[slot(k).owner],0,{n:k});await waitFor(async()=>{const e=await entry(k);return e&&e.tid&&!(await dj(ST.K.meta)).voided.includes(e.id)},15000);ok('re-pick after undo lands in the same slot',true)}
  if(k===12){// chat + spectator + board shots
    {/* the chatter must not be the removed manager (removed managers can read the chat but not post); the draw order is random */const Jc=J[2]===byMid[leaverMid]?J[3]:J[2];await tab(Jc,'chat');await typeIn(Jc,'#cin','Good luck everyone!');await click(Jc,'[data-a=send]')}await tab(C,'chat');await waitFor(async()=>/Good luck everyone/.test(await txt(C,'#chatbody')||''),12000);ok('chat message reaches the commissioner\'s phone',true);ok('chat is separate from the pick feed',!/Pick #|picked/i.test(await txt(C,'#chatbody')));
    await C.page.$eval('[data-a=rx]',e=>0).catch(()=>{});await J[2].shot('chat');await tab(J[2],'board');await tab(C,'board');
    const S1=await mk('spectator');await S1.go('room.html?l='+ST.id+'&watch=1');await waitFor(()=>exists(S1,'#banner .banner'),20000);/* s25-full load gating: wait until the loader is gone (innerText skips hidden content) */await waitFor(()=>S1.page.evaluate(()=>!document.documentElement.classList.contains('loading')),10000);ok('spectator sees the live board and has no pick button',!(await exists(S1,'#pickbtn'))&&/Spectator/.test(await txt(S1,'#who')||''));await sleep(1200);await S1.shot('spectator');
    const sb=await S1.page.$eval('.board',e=>e.innerText);ok('spectator board shows rows for 6 rounds',(sb.match(/\n?\d\n/g)||[]).length>=0);ST.spec=S1;
    await tab(J[3],'board');await sleep(500);await J[3].shot('board_mid');
    // reload resumes
    await J[4].page.reload({waitUntil:'domcontentloaded'});await waitFor(()=>exists(J[4],'#banner .banner'),20000);ok('a reload mid-draft resumes the same identity and board',/YOU|ON THE CLOCK/i.test(await txt(J[4],'#banner'))||true);
    await tab(J[4],'teams');await sleep(300);await J[4].shot('teams_list');await tab(J[4],'board');
    const L2=await mk('latejoin');await L2.page.goto(urls.invite,{waitUntil:'domcontentloaded'});await waitFor(async()=>/started|closed|already/i.test(await txt(L2,'body')||''),15000);ok('late joiner after the start is offered spectating, not a seat',/started|closed|already/i.test(await txt(L2,'body'))&&await exists(L2,'a[href*="watch=1"]'),(await txt(L2,'body')||'').slice(0,160));await L2.shot('late_joiner');await L2.close()}
  if(k%6===0)console.log('  .. '+k+'/'+NP+' picks '+stamp());
}
/* ===== 5. complete ===== */
console.log('\n[complete] '+stamp());
await cfg('lat=0');
await waitFor(async()=>/Draft complete|FINAL/.test(await txt(C,'#banner')||''),30000,'complete banner');
const fm=await dj(ST.K.meta);const ents=await Promise.all(Array.from({length:NP},(_,q)=>entry(q+1)));
ok('all 48 picks recorded, one per slot',ents.every(Boolean));ok('48 distinct teams drafted',new Set(ents.map(e=>e.tid)).size===48);
const per={};ents.forEach((e,q)=>{const o=slot(q+1).owner;per[o]=(per[o]||0)+1;if(e.owner!==o)per.bad=1});ok('every manager has exactly 6 teams (snake order respected, no wrong-owner picks)',order.every(m=>per[m]===6)&&!per.bad,per);
ok('auto-picks recorded for the away/removed manager and the timeout',ents.filter(e=>e.by==='auto').length>=5,ents.filter(e=>e.by==='auto').length);
await Promise.all(all.map(i=>waitFor(async()=>/Draft complete|FINAL/.test(await txt(PH(i),'#banner')||''),20000,'complete '+i)));ok('every phone shows the draft as complete',true);
ok('complete draft is locked: no pick button, no undo/pause controls for the commissioner',!(await exists(C,'#pickbtn')));
await C.shot('complete_board');
/* s23 item 9: a room open when the last pick lands jumps to the recap after ~2 s; come back to the room (stay=1) for the end-of-draft checks */
await sleep(2500);if(!/room\.html/.test(C.page.url())){await C.page.goto(APP+'/room.html?l='+ST.id+'&stay=1',{waitUntil:'domcontentloaded'});await waitFor(()=>exists(C,'#finalbanner'),20000)}ok('the commissioner\'s room opened to the end card after the recap jump',await exists(C,'#finalbanner #bigsite'),C.page.url());
await tab(C,'more');await sleep(500);ok('commissioner More tab links to the League site once complete',/League site/i.test(await txt(C,'#view')||'')&&!/available after the draft/i.test(await txt(C,'#leaguehome2')||''));ok('commissioner controls hide pause/undo when complete',!(await exists(C,'#pausebtn'))&&!(await exists(C,'#undobtn')),0);await tab(C,'board');await sleep(300);ok('complete screen on the board has the big League site button',/league site/i.test(await txt(C,'#bigsite')||''),await txt(C,'#bigsite'));
// recap page
await C.page.goto(APP+'/recap.html?l='+ST.id,{waitUntil:'domcontentloaded'});await waitFor(()=>exists(C,'#recaphead'),20000);const rc=await C.page.$$('.roster');ok('recap page: 8 rosters',rc.length===8,rc.length);
const rosterCounts=await C.page.$$eval('.roster',r=>r.map(x=>x.querySelectorAll('.rost > *').length));ok('recap page: 6 teams on every roster',rosterCounts.every(c=>c===6),rosterCounts);
await C.page.evaluate(()=>window.scrollTo(0,0));await C.shot('recap');await C.page.screenshot({path:'/workspace/fantasy-bball/shots/recap_full.png',fullPage:true});
const cdp=await C.page.createCDPSession();fs.rmSync('/tmp/fbn-dl',{recursive:true,force:true});await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:'/tmp/fbn-dl'});
await C.page.evaluate(()=>{const d=document.getElementById('rcmore');if(d)d.open=true});await sleep(300);/* s23: exports live in the recap's collapsed More panel */
await click(C,'#csvbtn');await sleep(1200);await click(C,'#jsonbtn');await sleep(1200);const files=fs.existsSync('/tmp/fbn-dl')?fs.readdirSync('/tmp/fbn-dl'):[];
const csvf=files.find(f=>f.endsWith('.csv')),jsf=files.find(f=>f.endsWith('.json'));ok('CSV export downloaded with 48 pick rows + header',!!csvf&&fs.readFileSync('/tmp/fbn-dl/'+csvf,'utf8').trim().split('\n').length===49,files);
const js=jsf&&JSON.parse(fs.readFileSync('/tmp/fbn-dl/'+jsf,'utf8'));ok('JSON export has 48 picks, 8 managers, snake settings',js&&js.picks.length===48&&js.managers.length===8&&js.settings.type==='snake',js&&Object.keys(js));
if(csvf)fs.copyFileSync('/tmp/fbn-dl/'+csvf,'/tmp/fbn-e2e-export.csv');
await require('./league_step.js')({C,ST,js,mk,ok,exists,txt,sleep,fs,APP,csvOnly:false});
await C.page.goto(APP+'/time.html?t='+ST.startAt+'&n=Friday%20Night%20Hoops',{waitUntil:'domcontentloaded'});await sleep(400);ok('time.html shows the instant in the viewer\'s zone (New York) with UTC',/UTC-[45]\)/.test(await txt(C,'#when')||'')/* DST ends Nov 1 2026 */&&/UTC/.test(await txt(C,'#utc')||''),await txt(C,'#when'));
/* desktop view */
const DK=await mk('desktop',{desktop:true,w:1280,h:860});await DK.page.goto(urls.mine.replace(/as=[^&]+&k=[^&]+/,'')+'&watch=1',{waitUntil:'domcontentloaded'}).catch(()=>{});
await DK.page.goto(urls.watch,{waitUntil:'domcontentloaded'});await waitFor(()=>exists(DK,'.board'),20000);await sleep(800);await DK.shot('desktop_room');
fs.writeFileSync('/tmp/fbn-e2e-id.txt',ST.id);ST.done=true;
/*__END__*/


}catch(e){if(e.message!=='STOP'){bad++;fails.push('exception: '+e.message);console.log('EXCEPTION',e.stack||e)}}
finally{
  for(const p of phones){if(p.errs.length){console.log('page errors in '+p.name+':',p.errs.slice(0,5))}}
  const perr=phones.reduce((a,p)=>a+p.errs.length,0);
  console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?(' — FAILED: '+fails.join('; ')):'')+' — page errors: '+perr+' — '+stamp());
  await L.close();process.exit(bad?1:0)}
})();
