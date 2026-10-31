/* s21 smoke against the REAL ESPN API (GET only, from this box): browser clock = 2026-03-25 (2026 regular season + NCAA tournament are over), the league holds Duke, UConn, St John's and 61 other schools.
   Expects the page to build its Games / Scores from ESPN alone (scores.json is empty): finals with scores, NCAA rounds with seeds, no errors. Skipped when ESPN is unreachable. node tests/e2e_sched_real.js */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,700):''))}}
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);
const NAMES=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅']];
(async()=>{try{
  let reach=false;try{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/150/schedule?season=2026&seasontype=3',{headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0.0.0 Safari/537.36'},signal:AbortSignal.timeout(15000)});reach=r.ok}catch(e){}
  if(!reach){console.log('  --  REAL ESPN skipped: not reachable from this box');return}
  const pin=['150','41','2599'];const rest=TIDS.filter(t=>!pin.includes(t));const R=NAMES.map(()=>[]);pin.forEach(t=>R[0].push(t));let k=0;for(const r of R)while(r.length<8)r.push(rest[k++]);
  const id=await seed(null,{names:NAMES,rosters:R,rounds:8});
  const P=await L.phone('sreal',{desktop:true,w:1280,h:900});await P.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  const t0=Date.parse('2026-03-25T12:00:00Z');await P.page.evaluateOnNewDocument(t0=>{const D=Date,off=t0-D.now();class F extends D{constructor(...a){if(a.length)super(...a);else super(D.now()+off)}static now(){return D.now()+off}}window.Date=F},t0);
  await P.page.setBypassServiceWorker(true);const rs=[];P.page.on('response',r=>{if(/site\.api\.espn\.com.*\/schedule/.test(r.url()))rs.push(r.status())});
  await P.go('league.html?l='+id);await P.page.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:25000});await P.page.waitForFunction('window.LSCHED&&LSCHED.state.done&&!LSCHED.state.busy',{timeout:120000});await sleep(800);
  const st=await P.page.evaluate(()=>({n:LSCHED.games().length,fin:LSCHED.games().filter(g=>g.status==='final').length,ncaa:LSCHED.games().filter(g=>g.kind==='ncaa').length,seeds:LSCHED.games().filter(g=>g.kind==='ncaa'&&g.home.seed&&g.away.seed).length,err:LSCHED.state.err,req:LSCHED.state.requests,fetched:LSCHED.state.fetched,line:LSCHED.line(),ex:LSCHED.games().filter(g=>g.kind==='ncaa')[0]}));
  console.log('  REAL ESPN: '+st.req+' GETs ('+[...new Set(rs)].join(',')+'), '+st.n+' games for the 64 schools: '+st.fin+' final, '+st.ncaa+' NCAA tournament games ('+st.seeds+' with both seeds); line "'+st.line+'"; example '+JSON.stringify(st.ex));
  ok('every request answered 200, no error flagged, 128 GETs (regular season + postseason x 64)',rs.every(s=>s===200)&&st.req===128&&!st.err,{rs:[...new Set(rs)],st});
  ok('the 64 schools\' real 2025-26 schedules gave many finals and NCAA games with both seeds (Duke / UConn / St John\'s games included)',st.fin>300&&st.ncaa>=3&&st.seeds===st.ncaa,st);
  await P.page.evaluate(t=>document.querySelector('#ltabs [data-v=games]').click());await sleep(500);await P.page.evaluate(()=>{const b=document.querySelector('[data-a=gmode][data-v=scores]');if(b)b.click()});await sleep(500);
  const g=await P.page.evaluate(()=>({n:document.querySelectorAll('#lbody .gm').length,txt:document.getElementById('lbody').innerText.slice(0,300).replace(/\s+/g,' '),notice:!!document.getElementById('noscores'),over:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}));
  ok('Games / Scores tab shows real final cards, no "scores start" notice, no overflow, no page errors',g.n>0&&!g.notice&&!g.over&&P.errs.filter(e=>/pageerror/.test(e)).length===0,{g,e:P.errs});
  console.log('  Scores tab starts: '+g.txt);
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
