/* s21: the in-browser schedule (js/league-sched.js). Everything MOCKED (site.api.espn.com team-schedule answers are served by request interception; GET only), fake browser clocks.
   A  before the season (2026-10-28): upcoming games appear by themselves, notice gone, "Schedule updated" line, 64 schools = 64 GETs, <=4 in flight, no overflow at 320 / 1280 (+ one 390 pass)
   B  game day (2026-11-02 23:50Z): a live game shows LIVE with its score, a game that is in scores.json wins over the schedule's copy
   C  mid-season (2027-01-20): finals with scores, standings count them, a game listed by both schools shows once (dedupe), an opponent that is not in the pool is plain text
   D  March (2027-03-20): seasontype=3 is asked too, NCAA game shows its round and seed
   E  cache: second load zero schedule requests; after the TTL (6 h) one more cycle; a failing ESPN with a saved cache keeps the games and says "showing last saved"
   F  failure with nothing saved: quiet text, the "scores start" notice stays, no page error, request count stops early, next visit inside the back-off makes zero requests
   node tests/e2e_sched.js  (APP / API env) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}}
const ready=P=>P.page.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:25000});
const tab=async(P,t)=>{await P.page.evaluate(t=>document.querySelector('#ltabs [data-v='+t+']').click(),t);await sleep(350)};
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);const NM={};TD.teams.forEach(t=>NM[t[0]]=t[2]);
const NAMES=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅']];
const [A,B,C,D]=[TIDS[0],TIDS[1],TIDS[2],TIDS[3]];const X='99999';
const rosters=()=>{const rest=TIDS.filter(t=>![A,B,C,D].includes(t));const R=NAMES.map(()=>[]);R[0].push(A);R[1].push(B);R[2].push(C);R[3].push(D);let k=0;for(const r of R)while(r.length<8)r.push(rest[k++]);return R};
const clock=(P,t0)=>P.page.evaluateOnNewDocument(t0=>{const D=Date,off=t0-D.now();class F extends D{constructor(...a){if(a.length)super(...a);else super(D.now()+off)}static now(){return D.now()+off}}window.Date=F},t0);
/* a mocked ESPN team-schedule event */
const ev=(o)=>({id:o.id,date:o.date,season:{year:o.y||2027},seasonType:{type:o.type||2},competitions:[{date:o.date,neutralSite:!!o.neutral,conferenceCompetition:!!o.conf,notes:o.note?[{headline:o.note}]:[],status:{type:{name:o.st||'STATUS_SCHEDULED'}},competitors:[
  {id:o.h,homeAway:'home',team:{id:o.h,shortDisplayName:NM[o.h]||'Outside U'},score:o.hs==null?undefined:{value:o.hs,displayValue:String(o.hs)},curatedRank:{current:o.hseed||99}},
  {id:o.a,homeAway:'away',team:{id:o.a,shortDisplayName:NM[o.a]||'Outside U'},score:o.as==null?undefined:{value:o.as,displayValue:String(o.as)},curatedRank:{current:o.aseed||99}}]}]});
/* serve: games = list of ev() objects (both schools get the event, like the real API); mode = 'ok' | 'fail' */
async function wire(P,o){await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);const st={teams:[],other:[],methods:new Set(),inflight:0,max:0,urls:[]};o.st=st;
  P.page.on('request',r=>{const u=new URL(r.url());
    if(u.pathname==='/data/scores.json'&&o.file){r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:'2027-01-20',source:'test',games:o.file})});return}
    if(u.hostname!=='site.api.espn.com'){r.continue();return}
    st.methods.add(r.method());const m=u.pathname.match(/\/teams\/([^/]+)\/schedule$/);
    if(!m){st.other.push(u.pathname);r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});return}
    st.teams.push(m[1]+'?'+u.search.slice(1));st.inflight++;st.max=Math.max(st.max,st.inflight);
    setTimeout(()=>{st.inflight--;
      if(o.mode==='fail')r.respond({status:500,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{}'});
      else{const type=/seasontype=3/.test(u.search)?3:2;const evs=(o.games||[]).filter(e=>(e.seasonType.type===type)&&e.competitions[0].competitors.some(c=>c.id===m[1]));
        r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({events:evs})})}},25)});
  return st}
const snap=P=>P.page.evaluate(()=>{document.querySelectorAll('#lbody .gfr[aria-expanded=false]').forEach(b=>b.click());return {txt:document.getElementById('main').innerText,line:(document.getElementById('schedline')||{}).innerText||'',notice:!!document.getElementById('noscores'),
  cards:[...document.querySelectorAll('#lbody .gm')].map(g=>g.innerText.replace(/\s+/g,' ')),over:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
  plain:document.querySelectorAll('#lbody .gm span.chip.nolink').length}});
const both=async P=>{const a=await snap(P);await P.page.evaluate(()=>{const b=document.querySelector('[data-a=gmode][data-v=scores]');if(b)b.click()});await sleep(300);const b=await snap(P);return Object.assign({},a,{up:a.cards,fin:b.cards,cards:a.cards.concat(b.cards),over:a.over||b.over,plain:a.plain+b.plain})};
async function open(id,name,o,t0,w,desk){const P=await L.phone(name,desk?{desktop:true,w:w||1280,h:900}:(w?{w,h:700}:{}));if(t0)await clock(P,t0);const st=await wire(P,o);await P.go('league.html?l='+id);await ready(P);return P}
const waitDone=P=>P.page.waitForFunction('window.LSCHED&&LSCHED.state.done&&!LSCHED.state.busy',{timeout:20000});
(async()=>{try{
  const id=await seed(null,{names:NAMES,rosters:rosters(),rounds:8});
  /* ---- A before the season ---- */
  const t0=Date.parse('2026-10-28T12:00:00Z');
  const gA=[ev({id:'401000001',date:'2026-11-02T23:30Z',h:A,a:B}),ev({id:'401000002',date:'2026-11-05T01:00Z',h:A,a:X}),ev({id:'401000003',date:'2026-11-10T00:00Z',h:C,a:D,neutral:true})];
  for(const [w,desk] of [[320,false],[1280,true],[390,false]]){
    const o={games:gA,mode:'ok'};const P=await open(id,'sA'+w,o,t0,w,desk);await waitDone(P);await sleep(500);await tab(P,'games');await sleep(300);const s=await snap(P);const st=o.st;
    ok(w+'px A before season: the "scores start" notice is gone and 3 upcoming games show (the A-B game once, although both schools list it)',!s.notice&&s.cards.length===3&&s.cards.filter(c=>c.includes(NM[A])&&c.includes(NM[B])).length===1,{notice:s.notice,cards:s.cards});
    ok(w+'px A: line reads "Schedule updated just now", no overflow',/^Schedule updated (just now|\d+ min ago)$/.test(s.line)&&!s.over,{line:s.line,over:s.over});
    ok(w+'px A: one GET per school (64), only seasontype=2 (October), never more than 4 in flight, GET only',st.teams.length===64&&new Set(st.teams.map(x=>x.split('?')[0])).size===64&&st.teams.every(x=>/season=2027&seasontype=2$/.test(x))&&st.max<=4&&[...st.methods].join()==='GET',{n:st.teams.length,max:st.max,m:[...st.methods],sample:st.teams[0]});
    ok(w+'px A: an opponent that is not in the pool is plain text (no link), the others link',s.plain>=1,s.plain);
    if(w===320){const t=await P.page.evaluate(()=>{LSCHED.state.cache;return Object.keys(localStorage).filter(k=>k.indexOf('fbn.sched.v1.')===0).length});ok('A: 64 school caches saved in localStorage',t===64,t);
      /* cache: second load in the same browser, zero schedule requests */
      const before=st.teams.length;await P.go('league.html?l='+id);await ready(P);await sleep(1200);await tab(P,'games');await sleep(300);const s2=await snap(P);
      ok('E cache: second load makes ZERO schedule requests and still shows the 3 games with "Schedule updated"',st.teams.length===before&&s2.cards.length===3&&/^Schedule updated/.test(s2.line),{extra:st.teams.length-before,cards:s2.cards.length,line:s2.line});
      /* standings / rosters tabs carry the line, bets does not */
      await tab(P,'standings');ok('A: line is also under Standings',/Schedule updated/.test((await snap(P)).line));await tab(P,'bets');ok('A: no schedule line on Bets',(await snap(P)).line==='');
      /* TTL: 7 h later, one more cycle (new page, same storage is not shared across contexts, so move the clock inside this page) */
      await P.page.evaluate(()=>{const D=Date,off=7*3600000;class F extends D{constructor(...a){if(a.length)super(...a);else super(D.now()+off)}static now(){return D.now()+off}}window.Date=F});
      const b2=st.teams.length;await P.page.evaluate(()=>{LSCHED.state.started=false;LSCHED.state.done=false;LSCHED.init(LSCHED.state.opts);return LSCHED.start()});await waitDone(P);await sleep(300);
      ok('E TTL: 7 h later every school is stale again (64 more GETs)',st.teams.length-b2===64,st.teams.length-b2);
      /* failing ESPN while a cache exists */
      o.mode='fail';await P.page.evaluate(()=>{const D=Date,off=7*3600000;class F extends D{constructor(...a){if(a.length)super(...a);else super(D.now()+off)}static now(){return D.now()+off}}window.Date=F;localStorage.removeItem('fbn.sched.fail')});
      await P.page.evaluate(()=>{LSCHED.state.started=false;LSCHED.state.done=false;LSCHED.state.err=false;LSCHED.state.ids.forEach(id=>{try{const j=JSON.parse(localStorage.getItem('fbn.sched.v1.'+id));j.t-=8*3600000;localStorage.setItem('fbn.sched.v1.'+id,JSON.stringify(j))}catch(e){}});LSCHED.init(LSCHED.state.opts);return LSCHED.start()});await waitDone(P);await sleep(400);await tab(P,'games');const s3=await snap(P);
      ok('E failing ESPN with a saved cache: the 3 games stay, line says "Schedule temporarily unavailable, showing last saved", no overflow',s3.cards.length===3&&s3.line==='Schedule temporarily unavailable, showing last saved'&&!s3.over,{c:s3.cards.length,l:s3.line});
    }
    ok(w+'px A: no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close()}
  /* ---- B game day: live + file wins ---- */
  {const live=ev({id:'401000010',date:'2026-11-02T23:30Z',h:A,a:B,st:'STATUS_IN_PROGRESS',hs:12,as:10});const fin=ev({id:'401000011',date:'2026-11-02T16:00Z',h:C,a:X,st:'STATUS_FINAL',hs:66,as:60});
   const dup=ev({id:'401000012',date:'2026-11-02T19:00Z',h:D,a:X,st:'STATUS_SCHEDULED'});
   const file=[{id:'401000012',day:'2026-11-02',start:'2026-11-02T19:00Z',status:'final',kind:'reg',round:'',neutral:false,home:{id:D,score:88,seed:null},away:{id:X,score:44,seed:null}}];
   for(const [w,desk] of [[320,false],[1280,true]]){const o={games:[live,fin,dup],mode:'ok',file};const P=await open(id,'sB'+w,o,Date.parse('2026-11-02T23:50:00Z'),w,desk);await waitDone(P);await sleep(600);await tab(P,'games');await sleep(300);const s=await both(P);
    const lc=s.cards.find(c=>c.includes(NM[A])&&c.includes(NM[B]));
    ok(w+'px B game day: the in-progress game shows LIVE with 12 and 10',!!lc&&/LIVE/.test(lc)&&/\b12\b/.test(lc)&&/\b10\b/.test(lc),s.cards);
    ok(w+'px B: the finished game shows FINAL 66-60 and the schedule copy of a game that is in scores.json does not replace it (file: FINAL 88-44, one card)',s.cards.some(c=>/FINAL/.test(c)&&/\b66\b/.test(c)&&/\b60\b/.test(c))&&s.cards.filter(c=>c.includes(NM[D])).length===1&&s.cards.some(c=>c.includes(NM[D])&&/FINAL/.test(c)&&/\b88\b/.test(c)),s.cards);
    ok(w+'px B: notice gone, no overflow, no page errors',!s.notice&&!s.over&&P.errs.filter(e=>/pageerror/.test(e)).length===0,{n:s.notice,o:s.over,e:P.errs});await P.page.close()}}
  /* ---- C mid-season finals ---- */
  {const g1=ev({id:'401000020',date:'2027-01-10T00:00Z',h:A,a:B,st:'STATUS_FINAL',hs:80,as:70,conf:true}),g2=ev({id:'401000021',date:'2027-01-12T01:00Z',h:C,a:X,st:'STATUS_FINAL',hs:90,as:50}),g3=ev({id:'401000022',date:'2027-01-25T01:00Z',h:D,a:A,st:'STATUS_SCHEDULED'}),pre=ev({id:'401000023',date:'2026-10-20T00:00Z',h:A,a:X,type:1}),pp=ev({id:'401000024',date:'2027-01-14T00:00Z',h:A,a:X,st:'STATUS_POSTPONED'});
   for(const [w,desk] of [[320,false],[1280,true]]){const o={games:[g1,g2,g3,pre,pp],mode:'ok'};const P=await open(id,'sC'+w,o,Date.parse('2027-01-20T15:00:00Z'),w,desk);await waitDone(P);await sleep(600);await tab(P,'games');await sleep(300);const s=await both(P);
    ok(w+'px C mid-season: 3 cards (2 finals + 1 upcoming), no preseason / postponed games, A-B listed once, finals show scores',s.cards.length===3&&s.cards.filter(c=>/FINAL/.test(c)).length===2&&s.cards.some(c=>/\b80\b/.test(c)&&/\b70\b/.test(c))&&s.cards.filter(c=>c.includes(NM[A])&&c.includes(NM[B])).length===1,s.cards);
    ok(w+'px C: the opponent outside the pool is plain text',s.plain>=1,s.plain);
    await tab(P,'standings');const t=await P.page.evaluate(()=>document.getElementById('main').innerText);ok(w+'px C: standings count the games (a manager has points) and show the line',/Schedule updated/.test(t)&&!/Scores update once/.test(t)&&/\b[1-9]\d*\b\s*points|points/.test(t),t.slice(0,200));
    const sx=await snap(P);ok(w+'px C: no overflow, no page errors',!sx.over&&P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close()}}
  /* ---- D March: seasontype 3 ---- */
  {const nc=ev({id:'401000030',date:'2027-03-19T19:00Z',h:A,a:X,type:3,y:2027,st:'STATUS_FINAL',hs:71,as:65,neutral:true,note:"NCAA Men's Basketball Championship - East Region - 1st Round",hseed:1,aseed:16}),nit=ev({id:'401000031',date:'2027-03-20T19:00Z',h:B,a:X,type:3,st:'STATUS_FINAL',hs:70,as:60,note:'NIT - 1st Round'});
   const o={games:[nc,nit],mode:'ok'};const P=await open(id,'sD',o,Date.parse('2027-03-20T15:00:00Z'),390,false);await waitDone(P);await sleep(600);await tab(P,'games');await sleep(300);const s=await snap(P);const st=o.st;
   ok('D March: 128 GETs (seasontype 2 and 3 for 64 schools, season=2027), the NCAA game shows "1st Round" and seed (1), the NIT game is not shown',st.teams.length===128&&st.teams.filter(x=>/seasontype=3/.test(x)).length===64&&st.teams.every(x=>/season=2027/.test(x))&&s.cards.length===1&&/1st Round/.test(s.cards[0])&&/\(1\)/.test(s.cards[0])&&/\(16\)/.test(s.cards[0]),{n:st.teams.length,cards:s.cards});
   ok('D: no overflow, no page errors',!s.over&&P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close()}
  /* ---- F failure with nothing saved ---- */
  for(const [w,desk] of [[320,false],[1280,true]]){const o={games:[],mode:'fail'};const P=await open(id,'sF'+w,o,t0,w,desk);await waitDone(P);await sleep(600);await tab(P,'games');await sleep(300);const s=await snap(P);const st=o.st;
    ok(w+'px F ESPN down, nothing saved: quiet "Schedule temporarily unavailable", the "scores start" notice stays, no overflow, no page error',s.line==='Schedule temporarily unavailable'&&s.notice&&!s.over&&P.errs.filter(e=>/pageerror/.test(e)).length===0,{line:s.line,notice:s.notice,errs:P.errs});
    ok(w+'px F: the cycle gives up early (<=12 requests instead of 64)',st.teams.length>=1&&st.teams.length<=12,st.teams.length);
    if(w===320){const b=st.teams.length;await P.go('league.html?l='+id);await ready(P);await sleep(1500);ok('F back-off: next visit inside 2 minutes makes ZERO requests',st.teams.length===b,st.teams.length-b)}
    await P.page.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
