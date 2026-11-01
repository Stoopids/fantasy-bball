/* s28 My settings (MOCK store only): save, duplicate team name, latest-wins vs a commissioner rename, join.html?edit=1 redirect,
   and both switches (TEAM_NAME_ON_TOP, ALLOW_PHOTO; overridden per phone through localStorage 'fbn.flags', localhost only), at 390 and 1280.
   needs: node tools/mock_textdb.js <app> . <api>   APP=http://localhost:<app> API=http://localhost:<api>/api/data/ */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const get=async k=>(await fetch(API+encodeURIComponent(k))).text();const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
/* unit: core helpers */
ok('teamTaken: trimmed + case-insensitive',F.teamTaken('  aces ',['Blazers','ACES'])&&!F.teamTaken('Aces 2',['Aces']));
ok('teamPick: old rename without teamTs beats a profile with no tt (s27 behaviour)',F.teamPick({team:'CM'},{team:'P'},{})==='CM');
ok('teamPick: later My settings save beats an older rename',F.teamPick({team:'CM',teamTs:100},{team:'P',tt:200},{})==='P');
ok('teamPick: later rename beats an older My settings save',F.teamPick({team:'CM',teamTs:300},{team:'P',tt:200},{})==='CM');
ok('mRename stamps teamTs',F.mRename(F.normalizeMeta(F.defaultMeta('ABCDEFGHJKMNPQRS',{name:'x',managers:8,rounds:6,type:'snake'},null)),'aaaaaaaaaaaa',{team:'Z',ts:123},[]).state.over.aaaaaaaaaaaa.teamTs===123);
async function phone(w,flags){const P=await L.phone('s'+w+JSON.stringify(flags||{}),w>700?{desktop:true,w,h:900}:{w,h:844});if(flags)await P.page.evaluateOnNewDocument(f=>localStorage.setItem('fbn.flags',f),JSON.stringify(flags));return P}
async function openRoom(P,id,me){await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.$('#tab_more'),25000);await sleep(800)}
async function openSheet(P){await P.page.evaluate(()=>document.querySelector('#tab_more').click());await waitFor(()=>P.page.$('#mysettings'),8000);await P.page.click('#mysettings');return waitFor(()=>P.page.$('#mysheet'),5000)}
const setTeam=(P,v)=>P.page.$eval('#ms_team',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},v);
const boardHead=async P=>{await P.page.evaluate(()=>{const b=document.querySelector('#tab_board');if(b)b.click()});await sleep(600);return P.page.evaluate(()=>{const th=document.querySelectorAll('.board thead th')[2];return th?{all:th.textContent,tn:(th.querySelector('.tn')||{}).textContent}:null})};
(async()=>{try{for(const w of [390,1280]){console.log('--- '+w+'px');
  const id=await seed(API,{live:true,mock:true,picksMade:3,name:'Settings Test '+w});const I=seed.info;const me=I.managers[1];const K=F.Keys(id);
  ok(w+': mock league with exactly 8 managers',I.managers.length===8);
  /* default switches (shipped): team on top, photo allowed */
  let P=await phone(w);await openRoom(P,id,me);
  let bh=await boardHead(P);ok(w+': default TEAM_NAME_ON_TOP=true: board header shows team on top, real name under',bh&&bh.tn==='Ben'&&bh.all.indexOf('Blazers')>=0,bh);
  ok(w+': default: top bar shows team',/Blazers/.test(await P.page.$eval('#who',e=>e.textContent)));
  await openSheet(P);ok(w+': ALLOW_PHOTO=true: photo picker shown',!!(await P.page.$('#ms_photo')));
  ok(w+': real name read-only with commissioner note',await P.page.evaluate(()=>document.getElementById('ms_name').readOnly&&/Only the commissioner/.test(document.getElementById('msnamenote').textContent)));
  /* duplicate */
  const pv0=F.parseProfile(await get(K.mgr(me.id))).pv;await setTeam(P,'  cOMETS ');await P.page.click('#mssave');await sleep(800);
  const de=await P.page.$eval('#msteamerr',e=>e.textContent);ok(w+': duplicate team name (case/space) shows inline error',/already uses/.test(de),de);
  ok(w+': duplicate: nothing written',F.parseProfile(await get(K.mgr(me.id))).pv===pv0);ok(w+': duplicate: sheet stays open',!!(await P.page.$('#mysheet')));
  /* save */
  await setTeam(P,'Ben’s Buckets');await P.page.click('[data-a="msemoji"][data-e="🐺"]');await sleep(200);await setTeam(P,'Ben’s Buckets');await P.page.click('#mssave');
  await waitFor(async()=>!(await P.page.$('#mysheet')),8000);let pr=F.parseProfile(await get(K.mgr(me.id)));
  ok(w+': save writes own profile key: team, emoji, tt, real name unchanged',pr.team==='Ben’s Buckets'&&pr.emoji==='🐺'&&pr.tt>0&&pr.name==='Ben',pr);
  bh=await boardHead(P);ok(w+': saved team shows on the board',bh&&/Ben’s Buckets/.test(bh.all),bh);
  /* latest wins: commissioner rename (newer) then manager save (newer) */
  const meta=F.parseJ(await get(K.meta));const r=F.mRename(F.normalizeMeta(meta),me.id,{team:'Commish Pick',ts:Date.now()+1000},[]);await post(K.meta,r.state);
  await P.close();P=await phone(w);await openRoom(P,id,me);await sleep(1500);bh=await boardHead(P);
  ok(w+': newer commissioner rename shows',bh&&/Commish Pick/.test(bh.all),bh);
  await sleep(1200);await openSheet(P);ok(w+': sheet starts from the shown (commissioner) team',await P.page.$eval('#ms_team',e=>e.value)==='Commish Pick');
  await setTeam(P,'Back To Buckets');await P.page.click('#mssave');await waitFor(async()=>!(await P.page.$('#mysheet')),8000);bh=await boardHead(P);
  ok(w+': later manager save beats the commissioner rename',bh&&/Back To Buckets/.test(bh.all),bh);
  const other=I.managers[2];let Q=await phone(w);await openRoom(Q,id,other);await sleep(2500);const qb=await Q.page.evaluate(()=>[...document.querySelectorAll('.board thead th')].map(t=>t.textContent).join('|'));
  ok(w+': another phone sees the manager save (latest wins everywhere)',/Back To Buckets/.test(qb)&&!/Commish Pick/.test(qb),qb);await Q.close();
  /* edit redirect */
  await P.go('join.html?l='+id+'&edit=1');await waitFor(()=>P.page.$('#mysheet'),15000);
  ok(w+': join.html?edit=1 routes to the room and opens My settings',/room\.html/.test(P.page.url())&&!!(await P.page.$('#mysheet'))&&!(await P.page.$('#f_name')),P.page.url());
  ok(w+': settings=1 is removed from the address bar',!/settings=1/.test(P.page.url()));
  ok(w+': no page errors (default flags)',P.errs.length===0,P.errs);await P.close();
  /* switches flipped */
  P=await phone(w,{TEAM_NAME_ON_TOP:false,ALLOW_PHOTO:false});await openRoom(P,id,me);bh=await boardHead(P);
  ok(w+': TEAM_NAME_ON_TOP=false: real name on top, team under (s27)',bh&&bh.tn==='Back To Buckets'&&/^.?.?Ben/.test(bh.all.replace(/\s/g,'')),bh);
  ok(w+': TEAM_NAME_ON_TOP=false: top bar shows real name',/Ben/.test(await P.page.$eval('#who .whonm',e=>e.textContent))&&!/Buckets/.test(await P.page.$eval('#who',e=>e.textContent)));
  await openSheet(P);ok(w+': ALLOW_PHOTO=false: emoji only, no photo picker',!(await P.page.$('#ms_photo'))&&!!(await P.page.$('#msemojionly'))&&!!(await P.page.$('#mysheet .emojis')));
  ok(w+': no page errors (flipped flags)',P.errs.length===0,P.errs);await P.close();
  P=await phone(w,{TEAM_NAME_ON_TOP:true,ALLOW_PHOTO:true});await openRoom(P,id,me);bh=await boardHead(P);ok(w+': explicit TEAM_NAME_ON_TOP=true: team on top',bh&&bh.tn==='Ben',bh);
  await openSheet(P);ok(w+': explicit ALLOW_PHOTO=true: photo picker',!!(await P.page.$('#ms_photo')));await P.close()}
 }catch(e){bad++;console.log('FAIL exception',e)}finally{await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)}})();
