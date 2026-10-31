/* s24 mock drafts (practice leagues): entry points, solo mock vs 7 bots end to end, mock with others (link + Fill empty seats with bots), recap vs bots,
   Run another / Back to my league, no League site, last 5 mocks on the device, and the SAFETY test: a mock never writes a key of the real league and never
   changes the device's "my league" (fbn.leagues, fbn.me.<real id>, fbn.cm.<real id>).
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_mock.js   (APP / API env; SHOTDIR = where the 390 px screenshots go) */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API||'http://localhost:9996/api/data/';
const fs=require('fs'),path=require('path');const SHOTDIR=process.env.SHOTDIR||path.join(__dirname,'..','shots');fs.mkdirSync(SHOTDIR,{recursive:true});
const AORIG=API.replace(/\/api\/data\/$/,'');
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}};
const raw=async k=>await (await fetch(AORIG+'/__dump/'+encodeURIComponent(k))).text();
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const stats=async()=>JSON.parse(await (await fetch(AORIG+'/__stats')).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(300)}return false};
const shot=async(P,f)=>{await P.page.screenshot({path:path.join(SHOTDIR,f+'.png')})};
const open=async(name,o)=>{const P=await L.phone(name,o||{});await P.page.setBypassServiceWorker(true).catch(()=>{});return P};
const lsAll=P=>P.page.evaluate(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k)}return o});
const has=(P,sel)=>P.page.evaluate(s=>!!document.querySelector(s),sel);
const txt=(P,sel)=>P.page.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText:''},sel);
const noOverflow=P=>P.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
(async()=>{try{
/* ---------- a real league in its countdown lobby (2 rounds, so the mocks are short), this device is manager Ana ---------- */
const pid=await seed(API,{rounds:2,name:'Friday Hoops'});const info=seed.info;const PK=F.Keys(pid);
{const m=F.parseJ(await raw(PK.meta));m.status='lobby';m.startedAt=null;m.endedAt=null;m.settings.startAt=Date.now()+2*864e5;m.settings.startMode='manual';m.settings.clockSecs=30;m.settings.rounds=2;m.settings.type='snake';await post(PK.meta,m)}
const ana=info.managers[0];
const parentKeys=[PK.meta,PK.chat,PK.hero].concat([1,2,3,4,5,6,7,8].map(i=>PK.slot(i,0))).concat(info.managers.map(x=>PK.mgr(x.id))).concat(info.managers.map(x=>PK.pref(x.id))).concat(Array.from({length:16},(_,k)=>PK.pick(1,k+1)));
const before={};for(const k of parentKeys)before[k]=await raw(k);
const st0=await stats();
for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){const pre=w+'px: ';
  const P=await open('a'+w,desk?{desktop:true,w,h}:{w,h});
  await P.go('index.html');await P.page.evaluate((pid,ana)=>{localStorage.setItem('fbn.me.'+pid,JSON.stringify({mid:ana.id,k:ana.k}));localStorage.setItem('fbn.leagues',JSON.stringify([{id:pid,name:'Friday Hoops',role:'manager',ts:1}]))},pid,ana);
  const ls0=await lsAll(P);
  /* entry 1: home page */
  await P.go('index.html');await P.page.waitForSelector('#trymock',{timeout:10000}).catch(()=>{});
  ok(pre+'home: "Try a mock draft" button links to mock.html',await P.page.evaluate(()=>{const a=document.getElementById('trymock');return!!a&&a.innerText.trim()==='Try a mock draft'&&/mock\.html$/.test(a.href)}));
  ok(pre+'home: the League site button is still the real league',/League site · Friday Hoops/.test(await txt(P,'#sitebtn')));
  ok(pre+'home: no sideways scroll',await noOverflow(P));if(w===390)await shot(P,'s24_390_entry_home');
  /* entry 2: after joining (join page done view) */
  await P.go('join.html?l='+pid);await P.page.waitForSelector('#practicethis',{timeout:15000}).catch(()=>{});
  ok(pre+'joined page: "Practice this draft" links to mock.html?from=<league>',await P.page.evaluate(pid=>{const a=document.getElementById('practicethis');return!!a&&a.innerText.trim()==='Practice this draft'&&a.href.indexOf('mock.html?from='+pid)>=0},pid));
  ok(pre+'joined page: no sideways scroll',await noOverflow(P));if(w===390){await P.page.evaluate(()=>{const e=document.getElementById('invitecard')||document.getElementById('youcard');if(e)e.scrollIntoView({block:'center'})});await shot(P,'s24_390_entry_joined')}
  /* entry 3: countdown lobby */
  await P.go('room.html?l='+pid);await P.page.waitForSelector('#invmock',{timeout:20000}).catch(()=>{});
  ok(pre+'countdown room: "Practice while you wait" opens mock.html?from=<league> in a new tab',await P.page.evaluate(pid=>{const a=document.getElementById('invmock');return!!a&&a.target==='_blank'&&a.href.indexOf('mock.html?from='+pid)>=0},pid));
  ok(pre+'countdown room: no PRACTICE banner in the real league',!(await has(P,'#practicebn')));
  if(w===390){await P.page.evaluate(()=>{const e=document.getElementById('invitecard')||document.getElementById('youcard');if(e)e.scrollIntoView({block:'center'})});await shot(P,'s24_390_entry_countdown')}
  /* the mock page copies the real league's settings */
  await P.go('mock.html?from='+pid);await P.page.waitForSelector('#startmock',{timeout:15000}).catch(()=>{});
  const src=await txt(P,'#mocksrc');ok(pre+'mock page: same settings as the league (name, snake, 8 teams, 2 rounds, 30 sec)',/Friday Hoops/.test(src)&&/Snake/.test(src)&&/8 teams/.test(src)&&/2 rounds/.test(src)&&/30 sec/.test(src),src);
  ok(pre+'mock page: PRACTICE banner, your name filled in from the league',(await has(P,'#practicebn'))&&await P.page.evaluate(()=>document.getElementById('m_name').value==='Ana'));
  ok(pre+'mock page: solo is the default',await P.page.evaluate(()=>document.getElementById('mode_solo').classList.contains('on')));
  if(w===390)await shot(P,'s24_390_mock_setup');
  /* solo mock end to end */
  const lsM=await lsAll(P);/* right before the mock starts: the real league's saved place (written by the real room visits above) */
  await P.page.click('#startmock');await P.page.waitForFunction(()=>/room\.html\?l=/.test(location.href),{timeout:20000}).catch(()=>{});
  const mid=new URL(P.page.url()).searchParams.get('l');ok(pre+'solo: lands in the room of a NEW league id',!!mid&&mid!==pid,mid);
  const MK=F.Keys(mid);const mm=F.parseJ(await raw(MK.meta))||{};
  ok(pre+'solo: meta.mock=true, solo, parent=<league>, 8 seats, settings copied',mm.mock===true&&mm.solo===true&&mm.parent===pid&&mm.settings.managers===8&&mm.settings.rounds===2&&mm.settings.type==='snake'&&mm.settings.clockSecs===30,{mock:mm.mock,parent:mm.parent,s:mm.settings});
  const bots=Object.keys(mm.over||{}).filter(k=>mm.over[k].bot&&mm.over[k].away);ok(pre+'solo: 7 bots, each a seat marked away',bots.length===7,bots.length);
  const names=[];for(let i=1;i<=8;i++){const c=F.parseClaim(await raw(MK.slot(i,0)));names.push(c&&c.name)}ok(pre+'solo: you + Bot 1..7 (CPU); no real-league names copied',names[0]==='Ana'&&names.slice(1).every((x,i)=>x==='Bot '+(i+1)+' (CPU)')&&!names.slice(1).some(x=>info.managers.some(m=>m.name===x)),names);
  await P.go('room.html?l='+mid+'&stay=1');
  ok(pre+'solo: starts at once (live within 15 s)',!!await waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#oncard')||!!document.querySelector('#finalbanner')),15000));
  ok(pre+'solo room: PRACTICE banner and Practice pill, no League site',(await has(P,'#practicebn'))&&(await has(P,'#pracpill'))&&!(await has(P,'#sitelink')));
  await waitFor(()=>P.page.evaluate(()=>document.querySelectorAll('.board td .chip').length>=2),12000);
  ok(pre+'solo room: bots pick by themselves (or it is my turn first)',await P.page.evaluate(()=>document.querySelectorAll('.board td .chip').length>=1||!!document.getElementById('pickbtn')));
  ok(pre+'solo room: no sideways scroll',await noOverflow(P));
  if(w===390)await shot(P,'s24_390_mock_in_progress');
  /* make my own picks fast (the clock would auto-pick after 30 s): Pick a team -> first team -> Draft */
  const t0=Date.now();while(Date.now()-t0<150000){if(await has(P,'#finalbanner'))break;
    if(await has(P,'#pickbtn')){await P.page.click('#pickbtn').catch(()=>{});await sleep(600);await P.page.evaluate(()=>{const r=document.querySelector('#pickov .trow.go');if(r)r.click()}).catch(()=>{});await sleep(500);
      await P.page.evaluate(()=>{const c=document.querySelector('[data-a=confirm]');if(c)c.click()}).catch(()=>{})}
    await sleep(700)}
  ok(pre+'solo: the mock finishes (16 picks)',await has(P,'#finalbanner'),Math.round((Date.now()-t0)/1000)+' s');
  const endT=await txt(P,'#finalbanner');
  ok(pre+'end card: Draft recap, Run another, Back to my league; no League site',/Draft recap/.test(endT)&&/Run another/.test(endT)&&/Back to my league/.test(endT)&&!/League site/.test(endT)&&!(await has(P,'#bigsite')),endT);
  ok(pre+'end card: Back to my league opens the real league; Run another opens mock.html?from=<league>',await P.page.evaluate(pid=>document.getElementById('mockback').href.indexOf('room.html?l='+pid)>=0&&document.getElementById('mockagain').href.indexOf('mock.html?from='+pid)>=0,pid));
  ok(pre+'end: no League site anywhere in the room, no Redraft link',!/League site/.test(await P.page.evaluate(()=>document.body.innerText))&&!(await has(P,'#redraftroomlink')));
  if(w===390){await P.page.evaluate(()=>window.scrollTo(0,0));await shot(P,'s24_390_mock_end')}
  /* recap: grades vs bots */
  await P.go('recap.html?l='+mid);await waitFor(()=>has(P,'#vsbots'),25000);
  ok(pre+'recap: PRACTICE banner says graded against 7 bots',/PRACTICE DRAFT/.test(await txt(P,'#practicebn'))&&/against 7 bots/.test(await txt(P,'#practicebn')));
  ok(pre+'recap: my grade card says practice grade vs 7 bots',/Practice grade: graded against 7 bots/.test(await txt(P,'#vsbots')),await txt(P,'#vsbots'));
  ok(pre+'recap (s25b): lighter mock page has no league grades list and no awards',await P.page.evaluate(()=>!document.getElementById('rc_grades')&&!document.getElementById('rc_awards')));
  ok(pre+'recap: Run another + Back to my league, NO League site button',(await has(P,'#mockagain'))&&(await has(P,'#mockback'))&&!(await has(P,'#rcsite'))&&!/League site/.test(await P.page.evaluate(()=>document.body.innerText)));
  ok(pre+'recap: no Redraft countdown in a mock',!(await has(P,'#rccount')));
  ok(pre+'recap: no sideways scroll',await noOverflow(P));
  if(w===390){await P.page.evaluate(()=>window.scrollTo(0,0));await shot(P,'s24_390_recap_top');await P.page.evaluate(()=>document.getElementById('rcmine').scrollIntoView({block:'start'}));await shot(P,'s24_390_recap_grade');await P.page.evaluate(()=>document.getElementById('rc_site').scrollIntoView({block:'center'}));await shot(P,'s24_390_recap_buttons')}
  /* device storage: mock list yes, "my league" untouched */
  const ls1=await lsAll(P);const mocks=JSON.parse(ls1['fbn.mocks']||'[]');
  ok(pre+'device: the mock is in fbn.mocks with my grade',mocks[0]&&mocks[0].id===mid&&!!mocks[0].grade,mocks);
  ok(pre+'device: fbn.leagues ("Your leagues" / my league) is unchanged',ls1['fbn.leagues']===ls0['fbn.leagues'],[ls0['fbn.leagues'],ls1['fbn.leagues']]);
  ok(pre+'device: fbn.me.<real id> unchanged, no fbn.cm.<real id> created',ls1['fbn.me.'+pid]===ls0['fbn.me.'+pid]&&!('fbn.cm.'+pid in ls1));
  const changed=Object.keys(ls1).filter(k=>ls0[k]!==ls1[k]);const okKey=k=>(k==="fbn.mockids"&&String(ls1[k]).indexOf(pid)>=0)?false:(k==='fbn.lastnav'||k==='fbn.last.'+pid)?ls1[k]===lsM[k]:k.indexOf(pid)<0&&(k.indexOf(mid)>=0||/^fbn\.(mocks|mockids|mockname|mockteam|writer|tmode|thide|store)$/.test(k));
  ok(pre+'device: the mock did not move the real league\'s saved place or tab (fbn.lastnav, fbn.last.<real id>), and no saved place names the mock',ls1['fbn.lastnav']===lsM['fbn.lastnav']&&ls1['fbn.last.'+pid]===lsM['fbn.last.'+pid]&&String(ls1['fbn.lastnav']||'').indexOf(mid)<0&&!('fbn.last.'+mid in ls1),[lsM['fbn.lastnav'],ls1['fbn.lastnav']]);
  /* fbn.lastnav / fbn.last.<real id> change only through the real room visits before the mock (checked just above) */
  ok(pre+'device: every localStorage key the mock wrote is a mock key or a device setting; none holds the real league id',changed.every(okKey),changed.filter(k=>!okKey(k)));
  /* home after a mock: League site still the real league, mock not in Your leagues */
  await P.go('index.html');await P.page.waitForSelector('#trymock');
  ok(pre+'home after the mock: League site still opens the real league; the mock is not in Your leagues',await P.page.evaluate((pid,mid)=>{const a=document.getElementById('sitebtn');return!!a&&a.href.indexOf('l='+pid)>=0&&!document.querySelector('#mine [data-id="'+mid+'"]')},pid,mid));
  await P.close()}
/* ---------- textdb: the mock never wrote a key of the real league ---------- */
{const st1=await stats();const wrote=Object.keys(st1.byKey).filter(k=>(st1.byKey[k]||0)>(st0.byKey[k]||0));const pfx=PK.base;
  ok('textdb: the mocks wrote '+wrote.length+' keys, none of them under the real league ('+pfx+')',wrote.length>20&&!wrote.some(k=>k.indexOf(pfx)===0),wrote.filter(k=>k.indexOf(pfx)===0));
  const after={};for(const k of parentKeys)after[k]=await raw(k);const diff=parentKeys.filter(k=>before[k]!==after[k]);
  ok('textdb: every real-league key reads exactly as before ('+parentKeys.length+' keys: meta, chat, hero, 8 seats, profiles, prefs, 16 pick slots)',diff.length===0,diff);
  ok('textdb: every key written belongs to a league with meta.mock=true',await (async()=>{const ids=new Set(wrote.map(k=>(/^fbn1-([0-9a-z]{16})-/.exec(k)||[])[1]).filter(Boolean));for(const i of ids){const m=F.parseJ(await raw('fbn1-'+i+'-meta'));if(!m||m.mock!==true)return false}return ids.size>=2})())}
/* ---------- with others: link + fill empty seats with bots ---------- */
{const A=await open('ga');await A.go('mock.html');await A.page.waitForSelector('#mode_group');
  ok('home path: no league needed, standard settings (8 teams)',/Standard settings/.test(await txt(A,'#mocksrc'))&&/8 teams/.test(await txt(A,'#mocksrc')));
  await A.page.click('#mode_group');await A.page.type('#m_name','Zed');await A.page.click('#startmock');await A.page.waitForFunction(()=>/room\.html\?l=/.test(location.href),{timeout:20000});
  const gid=new URL(A.page.url()).searchParams.get('l');const gm=F.parseJ(await raw(F.Keys(gid).meta));ok('with others: mock flag, not solo, no parent, lobby',gm.mock===true&&gm.solo===false&&gm.parent===null&&gm.status==='lobby');
  await A.page.waitForSelector('#fillbots',{timeout:15000}).catch(()=>{});ok('with others: lobby has Fill empty seats with bots + invite',(await has(A,'#fillbots'))&&(await has(A,'#invcopy')));
  ok('with others: no "Practice while you wait" inside a mock',!(await has(A,'#invmock')));
  const B=await open('gb');await B.go('join.html?l='+gid);await B.page.waitForSelector('#f_name',{timeout:15000});await B.page.type('#f_name','Yan');await B.page.type('#f_team','Yaks');await B.page.click('#joinbtn');
  await B.page.waitForSelector('#joined',{timeout:20000}).catch(()=>{});ok('with others: a friend joins by link; the joined page shows the PRACTICE banner and no "Practice this draft"',(await has(B,'#practicebn'))&&!(await has(B,'#practicethis')));
  const lsB=await lsAll(B);ok('with others: the friend\'s device keeps it in fbn.mocks, not in fbn.leagues',!lsB['fbn.leagues']&&JSON.parse(lsB['fbn.mocks']||'[]').some(x=>x.id===gid));
  await waitFor(()=>A.page.evaluate(()=>/2 of 8/.test((document.getElementById('joinedct')||{}).innerText||'')),15000);
  await A.page.click('#fillbots');await waitFor(()=>A.page.evaluate(()=>!document.getElementById('fillbots')&&/8 of 8/.test((document.getElementById('joinedct')||{}).innerText||'')),30000);
  const gm2=F.parseJ(await raw(F.Keys(gid).meta));ok('with others: bots took exactly the 6 empty seats (8 seats total), marked away + bot',Object.keys(gm2.over).filter(k=>gm2.over[k].bot&&gm2.over[k].away).length===6&&/8 of 8/.test(await txt(A,'#joinedct')));
  await A.page.click('#startbtn').catch(()=>{});await A.page.waitForSelector('#cfyes',{timeout:8000}).catch(()=>{});await A.page.click('#cfyes').catch(()=>{});
  ok('with others: the commissioner starts it (Start draft, confirm)',!!await waitFor(async()=>(F.parseJ(await raw(F.Keys(gid).meta))||{}).status==='live',20000));
  await B.go('room.html?l='+gid);ok('with others: live in the friend\'s room with PRACTICE banner',!!await waitFor(()=>B.page.evaluate(()=>!!document.querySelector('#oncard')&&!!document.querySelector('#practicebn')),20000));
  await A.close();await B.close()}
/* ---------- the countdown entry is hidden once the real draft is live ---------- */
{const lid=await seed(API,{rounds:2,live:true,clockSecs:0});const li=seed.info;const P=await open('live');await P.go('index.html');await P.page.evaluate((lid,m)=>localStorage.setItem('fbn.me.'+lid,JSON.stringify({mid:m.id,k:m.k})),lid,li.managers[0]);
  await P.go('room.html?l='+lid);await P.page.waitForSelector('#oncard',{timeout:20000}).catch(()=>{});
  ok('live real draft: no "Practice while you wait"',!(await has(P,'#invmock'))&&true);
  await P.go('join.html?l='+lid);await P.page.waitForSelector('#joined',{timeout:15000}).catch(()=>{});ok('live real draft: no "Practice this draft" on the joined page',!(await has(P,'#practicethis')));await P.close()}
/* ---------- last 5 mocks ---------- */
{const P=await open('five');await P.go('index.html');await P.page.evaluate(()=>{for(let i=0;i<7;i++)UI.rememberMock({id:FBN.makeLeagueId(),name:'Mock '+i,parent:'',solo:true})});const a=await P.page.evaluate(()=>UI.myMocks());
  ok('device keeps only the last 5 mocks, newest first',a.length===5&&a[0].name==='Mock 6'&&a[4].name==='Mock 2',a.map(x=>x.name));
  await P.go('mock.html');await P.page.waitForSelector('#recentmocks');ok('mock page lists My recent mocks (5)',await P.page.evaluate(()=>document.querySelectorAll('#recentmocks .mrow').length===5));await P.close()}
}catch(e){ok('no exception',false,String(e&&e.stack||e))}
await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join(' | '):''));process.exit(bad?1:0)})();
