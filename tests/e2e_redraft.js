/* January 20, 2027 redraft: league page card, redraft page (spectator / manager / commissioner), the draft room with skipped slots, legacy leagues.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_redraft.js */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;const fs=require('fs'),path=require('path');
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const body=P=>P.page.$eval('body',e=>e.innerText).catch(()=>'');
const has=(P,sel)=>P.page.$(sel).then(x=>!!x);
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const click=async(P,sel)=>{await P.page.waitForSelector(sel,{visible:true,timeout:15000});await P.page.$eval(sel,e=>e.click())};
const TD=JSON.parse((s=>s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))(fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8')));
const RECORDS=[[8,2],[7,3],[5,5],[2,2],[6,4],[4,6],[3,7],[1,9]];   /* wins, losses before January 21, 2027 */
const EXPECT_STAND=[0,1,4,2,3,5,6,7];                                 /* by index: 80%, 70%, 60%, 50% (5-5), 50% (2-2: fewer wins ranks lower), 40%, 30%, 10% */
function fixtureScores(info){const owned=new Set(info.picks.map(p=>String(p.teamId)));const free=TD.teams.map(t=>String(t[0])).filter(t=>!owned.has(t));let g=0;const games=[];
  const add=(mi,win,day)=>{const mine=String(info.picks.find(p=>p.managerId===info.managers[mi].id).teamId);const opp=free[g%free.length];g++;
    games.push({id:'fx'+g,day,start:day+'T18:00Z',status:'final',kind:'reg',home:{id:mine,score:win?80:70},away:{id:opp,score:win?70:80}})};
  RECORDS.slice(0,info.managers.length).forEach(([w,l],mi)=>{for(let i=0;i<w;i++)add(mi,true,'2027-01-1'+(i%9));for(let i=0;i<l;i++)add(mi,false,'2027-01-0'+(1+i%9))});
  if(info.managers.length>7)for(let i=0;i<10;i++)add(7,true,'2027-01-21');  /* after the date: must not count */
  return{format:1,sample:false,label:'',season:'2026-27',as_of:'2027-01-22',source:'test',games}}
async function open(name,id,hash,opt,page){const P=await L.phone(name,opt||{});await P.page.setBypassServiceWorker(true).catch(()=>{});await P.page.setRequestInterception(true);P.page.on('request',r=>{if(/\/data\/scores\.json/.test(r.url())&&P.scores)r.respond({status:200,contentType:'application/json',body:JSON.stringify(P.scores)});else r.continue()});
  P.scores=open.scores;await P.page.goto(`${APP}/${page||'redraft.html'}?l=${id}${hash||''}`,{waitUntil:'domcontentloaded'});await P.page.waitForSelector(page==='room.html'?'#tabs':'#rapp[data-ready]',{timeout:25000}).catch(()=>{});return P}
const names=t=>t.split('\n').map(x=>x.trim());
(async()=>{try{
console.log('\n[league page and spectator view]');
const id=await seed(API,{managers:8,rounds:6});const I=seed.info;const K=F.Keys(id);open.scores=fixtureScores(I);const nm=i=>I.managers[i].name;
const asH=i=>'#as='+I.managers[i].id+'&k='+I.managers[i].k;const cmH='#cm='+I.cmSecret;
{const S=await L.phone('league',{});/* s25-full: League shows the Redraft tab only near January 20, 2027 */await S.page.evaluateOnNewDocument(()=>localStorage.setItem('fbn.now','2027-01-10T12:00:00Z'));await S.go('league.html?l='+id);await waitFor(()=>has(S,'#lhead'),20000);
 await S.page.evaluate(()=>document.querySelector('#ltabs [data-v=redraft]').click());await sleep(500);
 ok('League site Redraft tab has the card with the date written as "January 20, 2027"',await has(S,'#redraftcard')&&/January 20, 2027/.test(await body(S)));
 const href=await S.page.$eval('a#redraftlink,#redraftpreview',e=>e.getAttribute('href')).catch(()=>'');ok('the Redraft button opens redraft.html for this league',/redraft\.html\?l=/.test(href),href);await S.close()}
let SP=await open('spec',id);
ok('spectator sees the four rules in plain words',/January 20, 2027/.test(await body(SP))&&/last place/i.test(await body(SP))&&/fewer wins/.test(await body(SP))&&/drop up to 2 teams/i.test(await body(SP))&&/Dropping is optional/.test(await body(SP)));
const rowsOf=P=>P.page.$$eval('#rdstand .strow2',els=>els.map(e=>e.dataset.mid));
const mids=I.managers.map(m=>m.id);let order=await rowsOf(SP);
ok('standings preview is ranked by win percentage as of January 20, 2027 (games on January 21 ignored; same percentage: fewer wins ranks lower)',JSON.stringify(order)===JSON.stringify(EXPECT_STAND.map(i=>mids[i])),order.map(m=>mids.indexOf(m)));
ok('last place is marked as the one who chooses where to pick',/last place · chooses where to pick/.test(await SP.page.$eval('#rdstand .strow2:last-child',e=>e.innerText).catch(()=>'')));
ok('a spectator has no drops form, no commissioner buttons',!(await has(SP,'#savedrops'))&&!(await has(SP,'#openbtn'))&&!(await has(SP,'#startbtn'))&&/not opened the redraft yet/i.test(await body(SP)));
await SP.shot('redraft_390_spectator');

console.log('\n[open the redraft: commissioner only]');
let MG0=await open('m0',id,asH(0));
ok('a manager (not the commissioner) cannot open the redraft',!(await has(MG0,'#openbtn')));
const bad=await open('badk',id,'#as='+I.managers[0].id+'&k='+'0'.repeat(32));ok('a wrong manager secret gives no owner controls',!(await has(bad,'#savedrops')));await bad.close();
let CM=await open('cm',id,cmH);
ok('commissioner sees "Open the redraft"',await has(CM,'#openbtn'));
await click(CM,'#openbtn');const opened=await waitFor(async()=>{const m=await gj(K.meta);return m&&m.redraft&&m.redraft.phase==='open'&&m},20000);
ok('the redraft is open in the store: standings frozen as of January 20, 2027',!!opened&&opened.redraft.asOf==='2027-01-20'&&JSON.stringify(opened.redraft.stand)===JSON.stringify(EXPECT_STAND.map(i=>mids[i])),opened&&opened.redraft);
ok('the frozen record is the one before January 21 (last place is 1-9)',!!opened&&opened.redraft.rows.find(r=>r.mid===mids[7]).w===1&&opened.redraft.rows.find(r=>r.mid===mids[7]).l===9);
ok('the draft is still locked as complete until the redraft starts',opened&&opened.status==='complete'&&opened.epoch===1);
await waitFor(()=>has(CM,'#rdowner'),15000);ok('the commissioner (also a manager? no) sees the progress card and Start is disabled until someone drops',await has(CM,'#rdcomm')&&await CM.page.$eval('#startbtn',e=>e.disabled).catch(()=>false));

console.log('\n[owner drops: needs the owner’s own secret]');
await MG0.page.reload({waitUntil:'domcontentloaded'});await MG0.page.waitForSelector('#rdowner',{timeout:20000}).catch(()=>{});
ok('an owner sees their own roster with a tick box for each team',(await MG0.page.$$('#rdowner .dropchk')).length===6);
const boxes=await MG0.page.$$('#rdowner .dropchk');await boxes[0].evaluate(e=>e.click());await boxes[1].evaluate(e=>e.click());await boxes[2].evaluate(e=>e.click());
ok('a third team cannot be ticked (at most 2)',(await MG0.page.$$eval('#rdowner .dropchk:checked',e=>e.length))===2&&/at most 2/.test(await MG0.page.evaluate(()=>(document.getElementById('toast')||{}).innerText||'')));
await click(MG0,'#savedrops');const f0=await waitFor(async()=>{const f=F.parseRedraftForm(await (await fetch(API+encodeURIComponent(K.rd(mids[0])))).text());return f&&f.drops.length===2&&f},15000);
ok('owner 1 dropped 2 teams: saved under their own key, with the redraft id',!!f0&&f0.rid===opened.redraft.rid&&f0.mid===mids[0]);
const mine0=I.picks.filter(p=>p.managerId===mids[0]).map(p=>String(p.teamId));ok('only teams from their own roster can be dropped',!!f0&&f0.drops.every(t=>mine0.includes(t)));
let MG1=await open('m1',id,asH(1));await MG1.page.waitForSelector('#rdowner .dropchk',{timeout:20000});const b1=await MG1.page.$$('#rdowner .dropchk');await b1[2].evaluate(e=>e.click());await click(MG1,'#savedrops');
const f1=await waitFor(async()=>{const f=F.parseRedraftForm(await (await fetch(API+encodeURIComponent(K.rd(mids[1])))).text());return f&&f.drops.length===1&&f},15000);ok('owner 2 dropped 1 team',!!f1);
let MG3=await open('m3',id,asH(3));await MG3.page.waitForSelector('#rdowner .dropchk',{timeout:20000});const b3=await MG3.page.$$('#rdowner .dropchk');await b3[0].evaluate(e=>e.click());await b3[5].evaluate(e=>e.click());await click(MG3,'#savedrops');
const f3=await waitFor(async()=>{const f=F.parseRedraftForm(await (await fetch(API+encodeURIComponent(K.rd(mids[3])))).text());return f&&f.drops.length===2&&f},15000);ok('owner 4 dropped 2 teams',!!f3);
let MG7=await open('m7',id,asH(7));await MG7.page.waitForSelector('#rdpos',{timeout:20000});
ok('only the last-place owner is offered a pick-position choice',await has(MG7,'#rdpos')&&!(await has(MG0,'#rdpos'))&&!(await has(MG1,'#rdpos')));
await MG7.page.select('#rdpos','3');await click(MG7,'#keepall');
const f7=await waitFor(async()=>{const f=F.parseRedraftForm(await (await fetch(API+encodeURIComponent(K.rd(mids[7])))).text());return f&&f.pos===3&&f},15000);ok('last place chose to pick #3 and kept all their teams',!!f7&&f7.drops.length===0);
await SP.page.reload({waitUntil:'domcontentloaded'});await SP.page.waitForSelector('#rdorder',{timeout:20000}).catch(()=>{});
const ordIds=await SP.page.$$eval('#rdorder li',els=>els.map(e=>e.dataset.mid));
ok('the draft order card shows the last-place owner at #3 and the others in standings order',ordIds[2]===mids[7]&&JSON.stringify(ordIds.filter(x=>x!==mids[7]))===JSON.stringify(EXPECT_STAND.slice(0,7).map(i=>mids[i])),ordIds.map(m=>mids.indexOf(m)));
ok('everyone sees who answered; no answer means keeping every team',/dropping/.test(await body(SP))&&/no answer yet \(keeps every team\)/.test(await body(SP)));
await MG0.page.reload({waitUntil:'domcontentloaded'});await MG0.page.waitForSelector('#rdowner',{timeout:20000}).catch(()=>{});await sleep(600);await MG0.shot('redraft_390_owner');await MG7.shot('redraft_390_lastplace');for(const [P,f] of [[MG0,'redraft_390_owner_form'],[MG7,'redraft_390_lastplace_form']]){const h=await P.page.$('#rdowner');if(h)await h.screenshot({path:'/workspace/fantasy-bball/shots/'+f+'.png'})}await SP.page.screenshot({path:'/workspace/fantasy-bball/shots/redraft_390_full.png',fullPage:true});
await CM.page.reload({waitUntil:'domcontentloaded'});await CM.page.waitForSelector('#rdcomm',{timeout:20000}).catch(()=>{});await sleep(400);
ok('Start unlocks once someone has dropped a team',!(await CM.page.$eval('#startbtn',e=>e.disabled).catch(()=>true)));
{const D=await L.phone('cmdesk',{desktop:true,w:1280,h:900});await D.page.goto(`${APP}/redraft.html?l=${id}${cmH}`,{waitUntil:'domcontentloaded'});await D.page.waitForSelector('#rdcomm',{timeout:20000}).catch(()=>{});await sleep(500);await D.shot('redraft_1280_commissioner');await D.close()}

console.log('\n[start the redraft]');
await click(CM,'#startbtn');await CM.page.waitForSelector('#startyes',{visible:true,timeout:5000});await click(CM,'#startyes');
const live=await waitFor(async()=>{const m=await gj(K.meta);return m&&m.redraft&&m.redraft.phase==='live'&&m},20000);
ok('started: a new epoch, live, snake, 2 rounds (the most any owner dropped)',!!live&&live.epoch===2&&live.status==='live'&&live.settings.rounds===2&&live.settings.type==='snake');
const stand=EXPECT_STAND.map(i=>mids[i]);const wantOrder=F.redraftOrder(stand,3);
ok('draft order = standings order with last place at #3',!!live&&JSON.stringify(live.order)===JSON.stringify(wantOrder));
ok('need per owner: 2, 1, 0, 2, ..., last place 0',!!live&&live.redraft.need[mids[0]]===2&&live.redraft.need[mids[1]]===1&&live.redraft.need[mids[2]]===0&&live.redraft.need[mids[3]]===2&&live.redraft.need[mids[7]]===0);
const dropped=[].concat(f0.drops,f1.drops,f3.drops);ok('dropped teams are back in the pool; every other team stays with its owner',!!live&&dropped.every(t=>!(t in live.redraft.keep))&&Object.keys(live.redraft.keep).length===48-5);
await CM.page.reload({waitUntil:'domcontentloaded'});await waitFor(()=>has(CM,'#rdlive'),15000);ok('the redraft page now points to the draft room',await has(CM,'#rdlive')&&!(await has(CM,'#startbtn')));
const st2=await (async()=>{const l=await gj(K.meta);return l})();ok('Start cannot be repeated (no second epoch)',(await gj(K.meta)).epoch===2);

console.log('\n[the draft room: skipped slots, kept teams, clocks]');
const R0=await open('room-m0',id,asH(0),{},'room.html');await waitFor(()=>has(R0,'.board'),20000);
ok('board shows only the owners who dropped a team as picking; the others are skipped',(await R0.page.$$('.board td.skip')).length===11);
ok('the board says it is a redraft',/Redraft · 5 picks/.test(await body(R0)));
ok('owner 1 is on the clock for pick #1 (best record)',await waitFor(async()=>/on the clock|your pick/i.test(await body(R0)),10000));
await R0.shot('room_redraft_390');
const pickUI=async(P,tid)=>{await P.page.evaluate(()=>{const b=document.querySelector('[data-a="tab"][data-t="teams"]');if(b)b.click()});await sleep(300);
  await waitFor(()=>P.page.evaluate(t=>!!document.querySelector('#tlist .trow.go [data-a="draftrow"][data-t="'+t+'"], #tlist [data-a="draftrow"][data-t="'+t+'"]'),tid),8000);
  await P.page.evaluate(t=>{const e=document.querySelector('#tlist [data-a="draftrow"][data-t="'+t+'"]');if(e)e.click()},tid);await P.page.waitForSelector('#confirmpick',{visible:true,timeout:8000});await P.page.$eval('#confirmpick',e=>e.click())};
const avail=Object.keys(TD.meta).filter(t=>TD.meta[t].p).sort((a,b)=>TD.meta[a].p-TD.meta[b].p).map(String).filter(t=>!I.picks.some(p=>String(p.teamId)===t));
await pickUI(R0,f0.drops[0]);const e1=await waitFor(async()=>F.parseEntry(await (await fetch(API+encodeURIComponent(K.pick(2,1)))).text()),15000);
ok('owner 1 redrafted one of their own dropped teams as pick #1 (epoch 2)',!!e1&&e1.owner===mids[0]&&e1.tid===f0.drops[0]&&e1.e===2,e1);
const R1=await open('room-m1',id,asH(1),{},'room.html');await sleep(2500);
ok('after pick #1 the slots of owners without a drop are skipped; owner 2 is on the clock for pick #2',await waitFor(async()=>/on the clock|your pick/i.test(await body(R1)),10000));
await pickUI(R1,avail[0]);const e2=await waitFor(async()=>F.parseEntry(await (await fetch(API+encodeURIComponent(K.pick(2,2)))).text()),15000);ok('owner 2 picked the best team left as pick #2',!!e2&&e2.owner===mids[1]&&e2.tid===avail[0],e2);
let kept=live.redraft.keep;const keptTid=Object.keys(kept)[0];
await R1.page.evaluate(()=>{const b=document.querySelector('[data-a="tab"][data-t="teams"]');if(b)b.click()});await sleep(500);
ok('a kept team shows as taken by its owner, so it cannot be drafted',await R1.page.evaluate(t=>{const r=document.querySelector('#tlist [data-t="'+t+'"]');return !r||!r.closest('.trow')||r.closest('.trow').classList.contains('taken')},keptTid));
/* the remaining real picks: #6 owner 4, #11 owner 4, #16 owner 1 (written like the room does) */
const slots=F.pickSeq(live.order,2,'snake').filter(sl=>!F.redraftSkip(F.normalizeMeta(live),sl));const rest=slots.filter(sl=>sl.n>2);
ok('3 real picks remain: #6 owner 4, #11 owner 4, #16 owner 1',JSON.stringify(rest.map(s=>[s.n,mids.indexOf(s.owner)]))===JSON.stringify([[6,3],[11,3],[16,0]]),rest.map(s=>[s.n,mids.indexOf(s.owner)]));
let prev=e2.id;for(const sl of rest){const tid=avail[sl.n];const ent=F.makeEntry(sl.n,sl.owner,tid,{now:Date.now(),epoch:2,by:'owner',writer:'test',prev:'sk2-'+(sl.n-1)});
  /* the previous entry in the chain: a skip slot (id sk2-N) or the last real pick */
  const pid=(sl.n-1===2)?e2.id:(F.slotAt(live.order,sl.n-1,'snake',2)&&F.redraftSkip(F.normalizeMeta(live),F.slotAt(live.order,sl.n-1,'snake',2))?'sk2-'+(sl.n-1):prev);ent.prev=pid;await post(K.pick(2,sl.n),ent);prev=ent.id;await sleep(300)}
const done=await waitFor(async()=>/Redraft complete/.test(await body(R0)),30000);ok('the draft completes after the 5th real pick (trailing skipped slots do not hold it open)',!!done);
const m3=await gj(K.meta);ok('the league is complete again, still in epoch 2',m3.status==='live'||m3.status==='complete');
await R0.shot('room_redraft_done_390');
console.log('\n[league page after the redraft]');
{const S2=await L.phone('league2',{});S2.page.on('request',()=>{});await S2.go('league.html?l='+id);await waitFor(()=>has(S2,'#lhead'),20000);
 const t=await body(S2);ok('league page counts every roster: 48 schools on rosters',await S2.page.$$eval('#main .ocl .strow',c=>c.reduce((a,x)=>a+x.querySelectorAll('.chip').length,0))===48,t.slice(0,300));/* s25 League tab windows: the Redraft tab hides once the redraft is complete (LTABS) */ok('after the redraft is complete the League site hides its Redraft tab (s25 tab windows)',!(await S2.page.$('#ltabs [data-v=redraft]')));
 await S2.page.evaluate(()=>{const b=document.querySelector('#ltabs [data-v="standings"]');if(b)b.click()});await sleep(500);
 const cards=await S2.page.$$eval('#main .ocl .strow',els=>els.map(e=>e.querySelectorAll('.chip').length));ok('every manager still shows 6 schools (kept + redrafted)',cards.length===8&&cards.every(c=>c===6),cards);await S2.close()}
{const RC=await L.phone('recap',{});await RC.go('recap.html?l='+id);await waitFor(()=>has(RC,'#recaphead'),20000);const t=await body(RC);ok('recap shows rosters with kept teams and the 5 redraft picks',/5 of 5 picks/i.test(t)&&(await RC.page.$$('.roster')).length===8,t.slice(0,200));await RC.close()}

console.log('\n[legacy and odd data: nothing crashes]');
const idL=await seed(API,{managers:6,rounds:4});open.scores=fixtureScores(seed.info);
{const P=await open('legacy',idL,'#cm='+seed.info.cmSecret);ok('a 6-manager (older) league opens the redraft page and can run it',await has(P,'#rdrules')&&await has(P,'#openbtn')&&P.errs.length===0,P.errs);await P.close()}
{const idX=await seed(API,{managers:8,rounds:3,live:true,picksMade:5});const P=await open('notdone',idX,'');ok('before the first draft is complete: plain message, no crash',/opens after the first draft is complete/.test(await body(P))&&P.errs.length===0,P.errs);await P.close()}
{const idJ=await seed(API,{managers:8,rounds:3});const m=await gj(F.Keys(idJ).meta);m.redraft={rid:'zz',phase:'live',keep:5,need:'x'};await post(F.Keys(idJ).meta,m);const P=await open('junk',idJ,'');ok('a junk redraft field in the stored league is ignored',await has(P,'#rdrules')&&P.errs.length===0,P.errs);await P.close();
  const Q=await L.phone('junkroom',{});await Q.go('room.html?l='+idJ+'&watch=1');ok('the draft room still loads a league with a junk redraft field',await waitFor(()=>has(Q,'#tabs'),20000)&&Q.errs.length===0,Q.errs);await Q.close()}
{const P=await L.phone('nolg',{});await P.go('redraft.html?l=ZZZZ-ZZZZ-ZZZZ-ZZZZ');ok('unknown league: plain message',await waitFor(async()=>/League not found/.test(await body(P)),15000));await P.close();const Q=await L.phone('nol',{});await Q.go('redraft.html');ok('no league id: plain message',/No league/.test(await body(Q)));await Q.close()}
{const idE=await seed(API,{managers:8,rounds:3});const m=await gj(F.Keys(idE).meta);m.endedEarly=true;await post(F.Keys(idE).meta,m);const P=await open('early',idE,'');ok('a draft that ended early cannot be redrafted: plain message',/ended early/.test(await body(P)),(await body(P)).slice(0,200));await P.close()}
console.log('\n[normal path: the store keeps status "live" after the last pick; completion is derived]');
{const idN=await seed(API,{managers:8,rounds:6});const IN=seed.info;const KN=F.Keys(idN);open.scores=fixtureScores(IN);const midsN=IN.managers.map(x=>x.id);
 {const m=await gj(KN.meta);m.status='live';delete m.endedAt;await post(KN.meta,m)}
 ok('store status is "live" with every pick made (as after a normal draft)',(await gj(KN.meta)).status==='live');
 const CN=await open('cmN',idN,'#cm='+IN.cmSecret);
 ok('commissioner is NOT told the draft is incomplete, and Open the redraft is offered',!(await has(CN,'#rdnot'))&&await has(CN,'#openbtn'),(await body(CN)).slice(0,200));
 await click(CN,'#openbtn');const opN=await waitFor(async()=>{const m=await gj(KN.meta);return m&&m.redraft&&m.redraft.phase==='open'&&m},20000);
 ok('the redraft opened (store status stays "live", picks untouched)',!!opN&&opN.status==='live'&&opN.epoch===1,opN&&opN.status);
 const MN=await open('m0N',idN,'#as='+IN.managers[0].id+'&k='+IN.managers[0].k);await MN.page.waitForSelector('#rdowner .dropchk',{timeout:20000});
 const bx=await MN.page.$$('#rdowner .dropchk');await bx[0].evaluate(e=>e.click());await click(MN,'#savedrops');
 const fN=await waitFor(async()=>{const f=F.parseRedraftForm(await (await fetch(API+encodeURIComponent(KN.rd(midsN[0])))).text());return f&&f.drops.length===1&&f},15000);ok('an owner can drop a team',!!fN);
 await CN.page.reload({waitUntil:'domcontentloaded'});await CN.page.waitForSelector('#rdcomm',{timeout:20000}).catch(()=>{});await sleep(500);
 ok('Start is enabled once someone dropped a team',!(await CN.page.$eval('#startbtn',e=>e.disabled).catch(()=>true)));
 await click(CN,'#startbtn');await CN.page.waitForSelector('#startyes',{visible:true,timeout:5000});await click(CN,'#startyes');
 const lvN=await waitFor(async()=>{const m=await gj(KN.meta);return m&&m.redraft&&m.redraft.phase==='live'&&m},20000);
 ok('the redraft started: new epoch, live, 1 round',!!lvN&&lvN.epoch===2&&lvN.status==='live'&&lvN.settings.rounds===1,lvN&&lvN.settings);
 ok('no page errors',CN.errs.length===0&&MN.errs.length===0,[CN.errs,MN.errs]);await CN.close();await MN.close()}
for(const P of [SP,MG0,MG1,MG3,MG7,CM,R0,R1])ok('no page errors on '+P.name,P.errs.length===0,P.errs);
for(const P of [SP,MG0,MG1,MG3,MG7,CM,R0,R1])await P.close();
}catch(e){bad++;fails.push('exception '+(e&&e.stack||e));console.log('EXCEPTION',e&&e.stack||e)}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
