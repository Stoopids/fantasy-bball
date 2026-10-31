/* DR2 QA for s26-mock-options: mock leagues only, against the local mock textdb (fbn.store hook, localhost only). */
const puppeteer=require('puppeteer-core');const APP='http://localhost:18731';const SH='/tmp/s26c8-run/shots/opts/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const dump=async k=>{const r=await fetch(APP+'/__dump/'+k);return r.text()};
const J=s=>{try{return JSON.parse(s)}catch(e){return null}};
let B;async function page(w){const ctx=await B.createBrowserContext();const p=await ctx.newPage();
  await p.setViewport({width:w,height:w<500?844:900,isMobile:w<500,hasTouch:w<500});
  await p.evaluateOnNewDocument(()=>{localStorage.setItem('fbn.store','/api/data/')});p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));return p}
async function create(p,{seat,order,clock,bots}){await p.goto(APP+'/mock.html',{waitUntil:'networkidle2'});await p.waitForSelector('#m_seat');
  await p.select('#m_seat',String(seat));await p.select('#m_order',order);await p.select('#m_clock',String(clock));await p.select('#m_bots',bots);
  return async(shot)=>{if(shot)await p.screenshot({path:SH+shot,fullPage:true});await p.click('#startmock');await p.waitForFunction(()=>/room\.html\?l=/.test(location.href),{timeout:30000});
    return new URL(p.url()).searchParams.get('l')}}
async function meta(id){return J(await dump('fbn1-'+id.toLowerCase()+'-meta'))}
async function picks(id,ep,n){const out=[];for(let i=1;i<=n;i++)out.push(J(await dump('fbn1-'+id.toLowerCase()+'-e'+ep+'-p'+i)));return out}
async function fullRun(tag,w,o,expect){const p=await page(w);const go=await create(p,o);const id=await go(`${tag}_${w}_setup.png`);const t0=Date.now();
  const res={tag,w,id};await sleep(4000);let m=await meta(id);res.managers=(m.order||[]).length;res.seatUsed=m.mockOpts&&m.mockOpts.seatUsed;res.type=m.settings.type;res.clock=m.settings.clockSecs;res.spin=m.spin||null;
  res.myIdx=m.order.indexOf(m.cm||Object.keys(m.over).length&&m.order.find(x=>!(m.over[x]&&m.over[x].bot)))+1;
  /* clock text while it is my turn (first pick is mine at overall 5) */
  res.clockSeen=[];let shotLive=false;const N=8*m.settings.rounds;
  for(let k=0;k<200;k++){const t=await p.evaluate(()=>{const c=document.getElementById('cdv');return c?c.innerText.replace(/\s+/g,' '):''}).catch(()=>'');if(t)res.clockSeen.push(t);
    if(!shotLive&&Date.now()-t0>12000){await p.screenshot({path:SH+`${tag}_${w}_live.png`});shotLive=true}
    m=await meta(id);const last=J(await dump('fbn1-'+id.toLowerCase()+'-e'+(m.epoch||0)+'-p'+N));if(last)break;await sleep(3000)}
  await sleep(4000);await p.screenshot({path:SH+`${tag}_${w}_final.png`,fullPage:false});
  m=await meta(id);const ps=await picks(id,m.epoch||0,N);res.complete=ps.every(Boolean);res.raw1=ps[4];
  const me=m.order.find(x=>!(m.over[x]&&m.over[x].bot));res.myPicks=ps.map((x,i)=>x&&JSON.stringify(x).includes(me)?i+1:0).filter(Boolean);
  res.expect=expect;res.picksOK=JSON.stringify(res.myPicks)===JSON.stringify(expect);res.mySample=ps.filter(x=>x&&JSON.stringify(x).includes(me)).slice(0,2);
  res.distinctOwners=new Set(ps.map(x=>x&&(x.o||x.owner||x.mid))).size;res.errs=p.errs;res.minutes=((Date.now()-t0)/60000).toFixed(1);
  res.wheelEver=await p.evaluate(()=>!!document.querySelector('#wheel,.wheel,.spinwrap')).catch(()=>null);
  const st=J(await (await fetch(APP+'/__stats')).text());res.spinKeysWritten=Object.keys(st.byKey).filter(k=>k.startsWith('fbn1-'+id.toLowerCase())&&/-g\d+-s\d+$/.test(k)).length;
  res.tids=ps.map(x=>x&&(x.tid||x.t));await p.close();return res}
async function anyRuns(n){const seats=[];for(let i=0;i<n;i++){const p=await page(390);const go=await create(p,{seat:0,order:'snake',clock:60,bots:'best'});const id=await go(i===0?'any_390_setup.png':null);await sleep(1500);
  const m=await meta(id);const me=m.order.find(x=>!(m.over[x]&&m.over[x].bot));seats.push({id,seatUsed:m.mockOpts.seatUsed,orderIndex:m.order.indexOf(me)+1,managers:m.order.length,spin:!!m.spin});await p.close()}return seats}
(async()=>{B=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const snake=[5,12,21,28,37,44,53,60],straight=[5,13,21,29,37,45,53,61];
  const [a,b,c,d]=await Promise.all([fullRun('snake_best',390,{seat:5,order:'snake',clock:30,bots:'best'},snake),fullRun('straight_random',1280,{seat:5,order:'linear',clock:30,bots:'random'},straight),
    fullRun('snake_random',1280,{seat:5,order:'snake',clock:30,bots:'random'},snake),fullRun('straight_best',390,{seat:5,order:'linear',clock:30,bots:'best'},straight)]);
  const any=await anyRuns(6);console.log(JSON.stringify({runs:[a,b,c,d].map(r=>Object.assign({},r,{clockSeen:[...new Set(r.clockSeen)].slice(0,12)})),any},null,1));await B.close()})().catch(e=>{console.error(e);process.exit(1)});
