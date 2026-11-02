/* s26c14: live ESPN overlay on the League Games tab (mock ESPN scoreboard, no live calls).
   A drafted game is live in the scoreboard, then final: without reload it moves from Upcoming to Past with its score;
   poll gaps: 45-60 s while a game is hot, ~5 min when none, immediate on tab focus (after the 20 s debounce); and whether Standings
   points follow the overlay or only data/scores.json. Labels: Upcoming / Past. 390px (+320/1280 layout). APP / API env (mock store). */
const L=require('./lib.js'),path=require('path');const {seed}=require('./seed_league.js');const root=path.join(__dirname,'..');const fx=require('./fixture_s26c3.js')(root);
let n=0,bad=0;const notes=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
(async()=>{try{const id=await seed(null,{name:"BALL DON'T LIE",names:fx.NAMES.map(x=>[x[0].replace(/^Test /,''),x[1],x[2]]),rosters:fx.rosters,rounds:8});const info=seed.info;
  const H=String(fx.own(0,0)),A=String(fx.own(1,0));const st=new Date(Date.now()-10*60000);const day=st.toISOString().slice(0,10);
  const scores={format:1,sample:false,label:'',season:'2026-27',as_of:day,source:'live test',conf:{},games:[{id:'401999001',day,start:st.toISOString(),status:'scheduled',kind:'reg',round:'',neutral:false,home:{id:H,score:null,seed:null},away:{id:A,score:null,seed:null}},
    {id:'401999000',day:'2026-11-03',start:'2026-11-03T23:00:00Z',status:'final',kind:'reg',round:'',neutral:false,home:{id:H,score:70,seed:null},away:{id:String(fx.own(2,0)),score:60,seed:null}}]};
  let phase='live';const polls=[];
  const ev=()=>({events:[{id:'401999001',date:st.toISOString(),season:{type:2},status:{type:{name:phase==='live'?'STATUS_IN_PROGRESS':'STATUS_FINAL',shortDetail:phase==='live'?'2nd 10:00':'Final'}},
    competitions:[{notes:[],competitors:[{homeAway:'home',team:{id:H},score:phase==='live'?'30':'71',winner:phase==='final'},{homeAway:'away',team:{id:A},score:phase==='live'?'28':'64',winner:false}]}]}]});
  for(const w of [390,320,1280]){const P=await L.phone('lv'+w,{desktop:w>=760,w,h:w>=760?900:800});const T0=Date.now();polls.length=0;phase='live';
    await P.page.evaluateOnNewDocument(()=>{window.__to=[];const s0=window.setTimeout;window.setTimeout=function(f,d){if(d>=20000)window.__to.push({d,t:Date.now()});return s0.apply(this,arguments)};let hid=false;Object.defineProperty(document,'hidden',{get:()=>hid});Object.defineProperty(document,'visibilityState',{get:()=>hid?'hidden':'visible'});window.__vis=h=>{hid=h;document.dispatchEvent(new Event('visibilitychange'))}});
    await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
    P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')return r.respond({status:200,contentType:'application/json',body:JSON.stringify(scores)});
      if(u.hostname==='site.api.espn.com'&&/scoreboard/.test(u.pathname)){if(/limit=500/.test(u.search))polls.push(Date.now()-T0);else (P.urls=P.urls||[]).push(u.search.slice(0,40));return r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(ev())})}
      if(u.hostname==='site.api.espn.com')return r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"rankings":[]}'});
      if(/textdb\.dev/.test(u.hostname))return r.abort();r.continue()});
    await P.go('league.html?l='+id+'#games');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(2500);
    const mode=async m=>{await P.page.evaluate(m=>{const b=document.querySelector('[data-a=gmode][data-v='+m+']');if(b)b.click()},m);await L.sleep(400)};
    const card=()=>P.page.evaluate(()=>{const c=document.querySelector('#lbody [data-gid="401999001"]');return{has:!!c,txt:c?c.innerText.replace(/\n/g,' '):'',labels:[...document.querySelectorAll('[data-a=gmode]')].map(b=>b.innerText.trim()),sw:document.documentElement.scrollWidth,iw:innerWidth}});
    const stand=async()=>{await P.page.evaluate(()=>{location.hash='#standings'});await L.sleep(600);const v=await P.page.evaluate(()=>[...document.querySelectorAll('#lbody .ocl .oc')].map(o=>o.querySelector('.pv')&&o.querySelector('.pv').innerText).join(','));await P.page.evaluate(()=>{location.hash='#games'});await L.sleep(600);return v};
    await mode('upcoming');const c1=await card();const s1=await stand();
    ok(w+'px: Games toggle labels exactly Upcoming | Past games (s28c)',c1.labels.join('|')===(w<360?'Upcoming|Past':'Upcoming|Past games'),c1.labels);
    ok(w+'px: no overflow on Games',c1.sw<=c1.iw,c1);
    if(w!==390){await P.close();continue}
    ok('live: the live game is under Upcoming with the live score 30-28',c1.has&&/30/.test(c1.txt)&&/28/.test(c1.txt),c1.txt);
    phase='final';const tF=Date.now()-T0;
    let moved=null;for(let i=0;i<150;i++){await L.sleep(500);await mode('upcoming');const u=await card();if(!u.has){moved=Date.now()-T0;break}}
    await mode('scores');const c2=await card();
    ok('final: without reload the game leaves Upcoming and is under Past with 71-64',moved!=null&&c2.has&&/71/.test(c2.txt)&&/64/.test(c2.txt),{moved,c2:c2.txt});
    const gaps=polls.slice(1).map((t,i)=>t-polls[i]);notes.push("other scoreboard readers (bets auto-settle / upset line, not the live overlay): "+(P.urls||[]).length+" requests");notes.push('scoreboard polls at (ms from load): '+polls.join(', ')+' ; gaps '+gaps.join(', ')+' ; final set at '+tF+', moved at '+moved);
    ok('timing: hot-game poll gap 40.5-66 s (45/60 s +-10%)',gaps.length>=1&&gaps[0]>=40500&&gaps[0]<=66000,gaps);
    const s2=await stand();notes.push('standings before/after overlay final: '+s1+' -> '+s2);
    ok('standings points are NOT changed by the live overlay (scores.json only)',s1===s2,{s1,s2});
    await L.sleep(21000);const nb=polls.length;await P.page.evaluate(()=>{window.__vis(true)});await L.sleep(1500);await P.page.evaluate(()=>{window.__vis(false)});await L.sleep(2500);
    ok('focus: returning to the tab polls ESPN at once',polls.length===nb+1,{before:nb,after:polls.length});
    const to=await P.page.evaluate(()=>window.__to.slice(-6));const slow=to.filter(x=>x.d>=270000&&x.d<=330000);notes.push('last long timers (ms): '+to.map(x=>x.d).join(', '));
    ok('timing: no hot game left -> next poll scheduled ~5 min (270-330 s)',slow.length>=1,to);
    ok('no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.close()}
 }catch(e){bad++;console.log('FAIL exception',e&&e.stack)}finally{await L.close();console.log('\nNOTES\n'+notes.join('\n'));console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)}})();
