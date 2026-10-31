/* s22 screenshots: Bets tab and a Games card with the Quick bet pill; ours before (s21 bundle) / after (dev tree) and the live STOOPIDS reference, at 390 and 1280.
   node tests/shots_s22.js  (needs mock servers: AFTER_APP/AFTER_API for the dev tree, BEFORE_APP/BEFORE_API for the s21 bundle) */
const puppeteer=require('puppeteer-core');const fs=require('fs'),path=require('path');const F=require('../js/core.js');const {seed}=require('./seed_league.js');
const OUT='/workspace/league-site-work/compare-s23/';fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const AFTER=process.env.AFTER_APP||'http://localhost:9770',AAPI=process.env.AFTER_API||'http://localhost:9771/api/data/',BEFORE=process.env.BEFORE_APP||'http://localhost:9750',BAPI=process.env.BEFORE_API||'http://localhost:9751/api/data/';
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const tsrc=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);
const NAMES=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅']];
const [A1,B1,C1,D1]=[TIDS[0],TIDS[1],TIDS[2],TIDS[3]];
const rosters=()=>{const rest=TIDS.filter(t=>![A1,B1,C1,D1].includes(t));const R=NAMES.map(()=>[]);R[0].push(A1);R[1].push(B1);R[2].push(C1);R[3].push(D1);let k=0;for(const r of R)while(r.length<8)r.push(rest[k++]);return R};
const now=Date.now(),H=3600e3,iso=ms=>new Date(ms).toISOString().replace(/\.\d+Z/,'Z'),etDay=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
const G=(id,h,a,o)=>Object.assign({id,day:etDay(now+3*24*H),start:iso(now+3*24*H),status:'scheduled',kind:'reg',round:'',neutral:false,home:{id:h,score:null,seed:null},away:{id:a,score:null,seed:null}},o||{});
const GAMES=[G('g1',B1,A1),G('g2',D1,C1)];
async function seedBets(base,id,info){const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
  const t=Date.now()-40*60000,u=()=>Math.random().toString(36).slice(2,10),ev=(k,o,d)=>Object.assign({k,u:u(),ts:t+d*1000},o);
  const mid=i=>info.managers[i].id,K=i=>F.Keys(id).base+'-bets-'+mid(i);const logs=[[],[],[],[]];
  logs[0].push(ev('p',{id:'ba1aaa',to:mid(1),amt:10,a:1,b:1,text:'Duke beats Kansas, Nov 17'},0),ev('s',{id:'ba1aaa',r:'b'},900));logs[1].push(ev('a',{id:'ba1aaa'},60),ev('s',{id:'ba1aaa',r:'b'},1000));
  logs[2].push(ev('p',{id:'bc2ccc',to:mid(0),amt:25,a:2,b:1,text:'Arizona wins the Pac title',},300),ev('s',{id:'bc2ccc',r:'o'},1500));logs[0].push(ev('a',{id:'bc2ccc'},400),ev('s',{id:'bc2ccc',r:'o'},1600));
  logs[3].push(ev('p',{id:'bd3ddd',to:mid(0),amt:5,a:1,b:1,text:'Houston goes undefeated at home'},500));
  logs[1].push(ev('p',{id:'bb4bbb',to:mid(2),amt:10,a:1,b:1,text:'UConn beats Purdue, Dec 2',g:'grp1aa'},700),ev('p',{id:'bb5bbb',to:mid(3),amt:10,a:1,b:1,text:'UConn beats Purdue, Dec 2',g:'grp1aa'},701));
  for(let i=0;i<4;i++)await post(K(i),{v:1,ev:logs[i]});}
async function ours(app,api,tag,w,desk,quick){const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const base=api;const id=await seed(base,{names:NAMES,rosters:rosters(),rounds:8});const info=seed.info;await seedBets(base,id,info);
  const ctx=await b.createBrowserContext();const pg=await ctx.newPage();await pg.setViewport({width:w,height:desk?900:844,deviceScaleFactor:desk?1:2,isMobile:!desk,hasTouch:!desk});
  await pg.evaluateOnNewDocument((id,me,api)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me));localStorage.setItem('fbn.store','/api/data/')},id,{mid:info.managers[0].id,k:info.managers[0].k},base);
  await pg.setBypassServiceWorker(true);await pg.setRequestInterception(true);pg.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:'2026-11-01',source:'test',games:GAMES})});else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  const fbn=require('./lib.js');
  await pg.goto(app+'/league.html?l='+id+'#bets',{waitUntil:'domcontentloaded'});await pg.waitForSelector('#b27Head',{timeout:25000});await pg.waitForFunction('!/Connecting/.test(document.getElementById("b27Top").innerText)',{timeout:15000});await sleep(1500);
  await pg.screenshot({path:OUT+tag+'-'+w+'-bets-full.png',fullPage:true});
  if(quick){await pg.evaluate(()=>{location.hash='#games'});await pg.reload({waitUntil:'domcontentloaded'});await pg.waitForSelector('.gm',{timeout:25000});await sleep(1200);
    const el=await pg.$('.qb-btn');if(el){await el.evaluate(e=>e.click());await sleep(500);const card=await pg.evaluateHandle(()=>document.querySelector('.qb-btn').closest('.gm'));await card.asElement().screenshot({path:OUT+tag+'-'+w+'-games-quickbet-open.png'});await pg.evaluate(()=>document.querySelector('.qb-btn[aria-expanded=true]').click());await sleep(300);const c2=await pg.evaluateHandle(()=>document.querySelector('.qb-btn').closest('.gm'));await c2.asElement().screenshot({path:OUT+tag+'-'+w+'-games-card-pill.png'})}
    else{const c=await pg.$('.gm');if(c)await c.screenshot({path:OUT+tag+'-'+w+'-games-card-nopill.png'})}}
  await b.close()}
async function live(w,desk){const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});const ctx=await b.createBrowserContext();const pg=await ctx.newPage();await pg.setUserAgent(UA);
  await pg.setViewport({width:w,height:desk?900:844,deviceScaleFactor:desk?1:2,isMobile:!desk,hasTouch:!desk});
  await pg.goto('https://stoopids.github.io/stoopids/',{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});await sleep(2000);
  /* live: GET only; the Who-are-you overlay is hidden with injected CSS, nothing on it is clicked, no identity is set */
  await pg.goto('https://stoopids.github.io/stoopids/?tab=bets27',{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});await pg.addStyleTag({content:'#pwho{display:none!important}'}).catch(()=>{});await sleep(3500);
  await pg.screenshot({path:OUT+'live-stoopids-'+w+'-bets-full.png',fullPage:true});
  await pg.goto('https://stoopids.github.io/stoopids/?tab=games',{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});await pg.addStyleTag({content:'#pwho{display:none!important}'}).catch(()=>{});await sleep(3000);
  const has=await pg.$('.qb-btn');if(has){await pg.evaluate(()=>{const b=document.querySelector('.qb-btn');b.scrollIntoView({block:'center'});b.click()});await sleep(500);const card=await pg.evaluateHandle(()=>document.querySelector('.qb-btn').closest('.gm'));await card.asElement().screenshot({path:OUT+'live-stoopids-'+w+'-games-quickbet-open.png'});await pg.evaluate(()=>document.querySelector('.qb-btn[aria-expanded=true]').click());await sleep(300);const c2=await pg.evaluateHandle(()=>document.querySelector('.qb-btn').closest('.gm'));await c2.asElement().screenshot({path:OUT+'live-stoopids-'+w+'-games-card-pill.png'})}
  else{await pg.screenshot({path:OUT+'live-stoopids-'+w+'-games-tab.png'});console.log('live: no quick bet pill found at',w,'(no upcoming different-owner game in the live data right now)')}
  await b.close()}
(async()=>{for(const [w,desk] of [[390,false],[1280,true]]){
  await ours(AFTER,AAPI,'ours-s23full',w,desk,true);console.log('ours-s23full',w);
  
  try{await live(w,desk);console.log('live',w)}catch(e){console.log('live failed',w,e.message)}}
  process.exit(0)})();
