/* Before the season: a clear notice on the League site, and the live ESPN overlay.
   1. empty data/scores.json (no game at all): "Scores update once games start (first games November 2, 2026)" on Standings, Games, Rosters, All teams, Postseason; not on Bets / Redraft / Archive / Rules; not in the DEMO.
   2. the notice is gone as soon as ONE game exists in the data (any status): scores.json answered with one game (test copy, in memory); standings then show the points.
   3. live overlay, MOCKED ESPN response (GET only, site.api.espn.com): a scheduled game that started 30 min ago turns LIVE with the mocked score and the "live ESPN feed" note; the request is a GET.
   4. live overlay against the REAL ESPN API from this box (only if the box can reach it): the browser clock is moved to 1 h after a real, finished 2026-03-20 tournament game, the data holds that game as
      "scheduled", the page does a real GET to site.api.espn.com and the card must show the real final score. Reports what came back. Skipped (not failed) when ESPN is unreachable.
   node tests/e2e_notice.js  (APP / API env, mock store) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const NOTE='Scores update once games start (first games November 2, 2026)';
const ready=P=>P.page.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:25000});
const tab=async(P,t)=>{await P.page.evaluate(t=>document.querySelector('#ltabs [data-v='+t+']').click(),t);await sleep(350)};
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);
const NAMES=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅']];
const rostersWith=(a,b)=>{const rest=TIDS.filter(t=>t!==a&&t!==b);const R=NAMES.map(()=>[]);R[0].push(a);R[1].push(b);let k=0;for(const r of R)while(r.length<8)r.push(rest[k++]);return R};
async function withData(P,games,espn){await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);const seen=[];
  P.page.on('request',r=>{const u=new URL(r.url());
    if(u.pathname==='/data/scores.json'&&games)r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:'2026-11-03',source:'test',games})});
    else if(u.hostname==='site.api.espn.com'&&/\/teams\/[^/]+\/schedule$/.test(u.pathname)&&!process.env.REAL_SCHED){r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'})}  /* s21: the in-browser schedule (js/league-sched.js) is tested in e2e_sched.js; here its answers are empty so these tests stay about scores.json + the live overlay */
    else if(u.hostname==='site.api.espn.com'){seen.push(r.method()+' '+u.pathname+u.search);if(espn)r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(espn)});else r.continue()}
    else r.continue()});return seen}
const clock=(P,t0)=>P.page.evaluateOnNewDocument(t0=>{const D=Date,off=t0-D.now();class F extends D{constructor(...a){if(a.length)super(...a);else super(D.now()+off)}static now(){return D.now()+off}}window.Date=F},t0);
(async()=>{try{
  const id=await seed();const I=seed.info;
  for(const [w,h,desk] of [[320,640,false],[390,844,false],[1280,900,true]]){
    const P=await L.phone('no'+w,desk?{desktop:true,w,h}:{});await P.go('league.html?l='+id);await ready(P);await sleep(500);
    for(const t of ['standings','games','rosters','teams','postseason'].filter(t=>require('./tabs_exp.js').has(t))){await tab(P,t);const o=await P.page.evaluate(()=>({t:(document.getElementById('noscores')||{}).innerText||'',over:document.documentElement.scrollWidth>innerWidth+1,h:(document.getElementById('noscores')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height}));
      ok(w+'px empty data / '+t+': the notice reads exactly "'+NOTE+'" (no overflow)',o.t.replace(/^\S+\s+/,'').trim()===NOTE&&!o.over,o)}
    for(const t of ['bets','redraft','archive','rules'].filter(t=>require('./tabs_exp.js').has(t))){await tab(P,t);ok(w+'px empty data / '+t+': no notice on this tab',!(await P.page.$('#noscores')))}
    ok(w+'px no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close()}
  {const P=await L.phone('nod',{});await P.go('league.html?l='+id+'&demo=1');await ready(P);await sleep(500);ok('DEMO: no "scores start" notice (the demo has games)',!(await P.page.$('#noscores')));await P.page.close()}
  /* one game in the data -> the notice is gone and the standings count it */
  const a=I.picks.find(p=>p.managerId===I.managers[0].id).teamId,b=I.picks.find(p=>p.managerId===I.managers[1].id).teamId;
  const game={id:'g1',day:'2026-11-03',start:'2026-11-03T00:00Z',status:'final',kind:'reg',round:'',neutral:false,home:{id:String(a),score:80,seed:null},away:{id:String(b),score:70,seed:null}};
  {const P=await L.phone('no1',{});await withData(P,[game],null);await P.go('league.html?l='+id);await ready(P);await sleep(600);
   const o=await P.page.evaluate(()=>({n:!!document.getElementById('noscores'),txt:document.getElementById('main').innerText}));ok('with one game in the data the notice is gone and the standings show the result (Ana ahead)',!o.n&&/Ana/.test(o.txt),o);
   await tab(P,'games');ok('games tab: no notice once a game exists',!(await P.page.$('#noscores')));ok('no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.page.close()}
  /* a scheduled game with a start time in the past is "hot": the overlay polls ESPN (MOCKED answer here) */
  const now=Date.now();const hot=Object.assign({},game,{id:'401000001',day:new Date(now).toISOString().slice(0,10),start:new Date(now-30*60000).toISOString().replace(/\.\d+Z/,'Z'),status:'scheduled',home:{id:String(a),score:null,seed:null},away:{id:String(b),score:null,seed:null}});
  const ev={events:[{id:'401000001',date:hot.start,season:{type:2},status:{type:{name:'STATUS_IN_PROGRESS',shortDetail:'12:34 - 2nd Half'}},competitions:[{competitors:[{homeAway:'home',score:'41',team:{id:String(a)}},{homeAway:'away',score:'38',team:{id:String(b)}}]}]}]};
  {const P=await L.phone('nom',{});const seen=await withData(P,[hot],ev);await P.go('league.html?l='+id);await ready(P);await sleep(2500);await tab(P,'games');await sleep(600);
   const o=await P.page.evaluate(()=>({txt:document.getElementById('main').innerText,live:document.querySelectorAll('#main .gm .good').length,note:document.getElementById('noscores')?1:0}));
   ok('MOCKED ESPN: the overlay made one GET to site.api.espn.com (no POST) and the game shows LIVE with 41-38 and the "live ESPN feed" note, no "scores start" notice',seen.length>=1&&seen.every(x=>/^GET /.test(x))&&/LIVE/.test(o.txt)&&/41/.test(o.txt)&&/38/.test(o.txt)&&/live ESPN feed/.test(o.txt)&&!o.note,{seen,o:o.txt.slice(0,300)});await P.page.close()}
  /* REAL ESPN from this box */
  let real=null;try{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=20260320&groups=50&limit=500',{signal:AbortSignal.timeout(15000)});if(r.ok)real=await r.json()}catch(e){}
  const ok2=real&&Array.isArray(real.events)?real.events.filter(e=>(e.status||{}).type&&e.status.type.name==='STATUS_FINAL'&&(e.competitions||[])[0]&&e.competitions[0].competitors.length===2&&e.competitions[0].competitors.every(c=>TIDS.includes(String((c.team||{}).id))&&/^\d+$/.test(String(c.score)))):[];
  if(!ok2.length){console.log('  --  REAL ESPN skipped: the box could not reach site.api.espn.com or no usable finished game ('+(real&&real.events?real.events.length:'no answer')+' events)')}
  else{const e0=ok2[0],cs=e0.competitions[0].competitors;const home=cs.find(c=>c.homeAway==='home')||cs[0],away=cs.find(c=>c.homeAway==='away')||cs[1];const ta=String(home.team.id),tb=String(away.team.id);
    const R=rostersWith(ta,tb);const rid=await seed(null,{names:NAMES,rosters:R,rounds:8});const t0=Date.parse(e0.date)+60*60000;
    const g={id:String(e0.id),day:e0.date.slice(0,10),start:e0.date,status:'scheduled',kind:'reg',round:'',neutral:true,home:{id:ta,score:null,seed:null},away:{id:tb,score:null,seed:null}};
    const P=await L.phone('nor',{});await P.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');  /* ESPN refuses the default HeadlessChrome user agent (net::ERR_FAILED); a normal Chrome UA is what real visitors send */
    await clock(P,t0);const seen=await withData(P,[g],null);const resp=[];P.page.on('response',r=>{if(/site\.api\.espn\.com/.test(r.url()))resp.push(r.status()+' '+r.url().replace(/^https:\/\/site\.api\.espn\.com/,'').slice(0,90))});
    await P.go('league.html?l='+rid);await ready(P);await sleep(5000);await tab(P,'games');await sleep(800);
    const o=await P.page.evaluate(()=>(document.querySelectorAll('#main .gfr[aria-expanded=false]').forEach(b=>b.click()),{txt:document.getElementById('main').innerText,lv:!!document.querySelector('#live:not([hidden])'),err:(document.getElementById('lvT')||{}).textContent||''}));
    const sh=String(home.score),sa=String(away.score);
    console.log('  REAL ESPN: '+real.events.length+' events for 2026-03-20; tested game '+e0.id+' ('+(home.team.displayName||ta)+' '+sh+' - '+sa+' '+(away.team.displayName||tb)+'); requests/responses seen by the page: '+JSON.stringify(resp));
    ok('REAL ESPN (GET only): the page requested the scoreboard for that day, got HTTP 200, and the card shows the real final score '+sh+'-'+sa+' (FINAL / live ESPN feed note)',seen.length>=1&&seen.every(x=>/^GET /.test(x))&&resp.some(x=>/^200 /.test(x))&&o.txt.includes(sh)&&o.txt.includes(sa)&&/live ESPN feed|FINAL/.test(o.txt)&&!o.err,{seen,resp,err:o.err,txt:o.txt.slice(0,300)});await P.page.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
