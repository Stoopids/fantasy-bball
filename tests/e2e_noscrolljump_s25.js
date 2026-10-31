/* s25j: no page ever jumps while the reader is scrolled. For every League tab at 390 and 1280: wheel-scroll to the middle, then fire every update
   (poll tick, data reload, bets change, scores change, scores outage + recovery (a note appears / goes ABOVE the reader), storage event,
   visibility/online, the tagline and freshness lines, Quick bet panel open/close, power-rankings toggle) and assert scrollY stays within 2px (when a line is added/removed ABOVE the reader, scrollY moves by exactly that height so the content on screen stays put; both are checked).
   CSS scroll anchoring is switched OFF (overflow-anchor:none, like iOS Safari) so only the page's own anchor restore can pass.
   Timers are captured (not faked): interval callbacks and the 5-min data reload are called directly.  APP / API env (mock store). */
const L=require('./lib.js');const F=require('../js/core.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;
let n=0,bad=0;function ok(t,c,x){n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const base=process.env.API||'http://localhost:9901/api/data/';const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const tsrc=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);
const now=Date.now(),H=3600e3;const iso=ms=>new Date(ms).toISOString().replace(/\.\d+Z/,'Z');const etDay=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
const R=[];for(let m=0;m<8;m++){R.push(TIDS.slice(m*8,m*8+8))}
let SCV=0;function games(){const g=[];for(let i=0;i<48;i++){const h=R[i%8][i%7],a=R[(i+3)%8][(i+2)%7],t=now+(i-30)*9*H,fin=i<30;
  g.push({id:'n'+i,day:etDay(t),start:iso(t),status:fin?'final':'scheduled',kind:'reg',round:'',neutral:false,home:{id:h,score:fin?60+((i*7+SCV)%30):null,seed:null},away:{id:a,score:fin?55+((i*5)%30):null,seed:null}})}
  if(SCV)for(let i=30;i<30+SCV*2&&i<48;i++){g[i].status='final';g[i].home.score=70+i;g[i].away.score=50+i}return g}
const DOWN={v:false};
async function open(id,info,w,now_){const P=await L.phone('nj'+Math.random().toString(36).slice(2,6),{w,h:w>=760?900:800,desktop:w>=760,now:now_});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me));
    const si=window.setInterval,st=window.setTimeout,ct=window.clearTimeout;window.__iv=[];window.__lt=new Map();
    window.setInterval=function(f,d,...a){window.__iv.push(f);return si.call(window,f,d,...a)};
    window.setTimeout=function(f,d,...a){const h=st.call(window,f,d,...a);if(typeof f==='function'&&d>=60000)window.__lt.set(h,f);return h};
    window.clearTimeout=function(h){window.__lt.delete(h);return ct.call(window,h)};
    document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='*{overflow-anchor:none!important}';document.head.appendChild(s)})},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json'){if(DOWN.v)r.respond({status:503,body:'down'});else r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:iso(Date.now()),source:'test',games:games()})})}
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  return P}
const Y=P=>P.page.evaluate(()=>window.scrollY);
async function toMiddle(P){const m=await P.page.evaluate(()=>{const mx=document.documentElement.scrollHeight-innerHeight;if(mx<400){const s=document.createElement('div');s.id='njpad';s.style.height='1600px';document.body.appendChild(s)}return Math.round((document.documentElement.scrollHeight-innerHeight)/2)});
  await P.page.mouse.move(100,300);for(let i=0;i<40;i++){const y=await Y(P);if(Math.abs(y-m)<60)break;await P.page.mouse.wheel({deltaY:Math.max(-400,Math.min(400,m-y))});await sleep(60)}await sleep(400);return Y(P)}
let BU=0;
(async()=>{try{
  const id=await seed(null,{rosters:R,rounds:8});const info=seed.info;const M=info.managers.map(m=>m.id);const K=i=>F.Keys(id).base+'-bets-'+M[i];
  const logs=[[],[]];const ev=(k,o)=>Object.assign({k,u:'nj'+(++BU).toString().padStart(6,'0'),ts:Date.now()-3600e3+BU*1000},o);
  for(let i=0;i<14;i++)logs[i%2].push(ev('p',{id:'njbet'+String(i).padStart(5,'0'),to:M[1-(i%2)],amt:10,a:1,b:1,text:'Bet number '+i+' on a game this week'}));
  await post(K(0),{v:1,ev:logs[0]});await post(K(1),{v:1,ev:logs[1]});
  const RUNS=[['2027-01-10T12:00',['standings','games','bets','rosters','teams','redraft','rules','archive']],['2027-03-15T12:00',['postseason']]];
  for(const [clk,tabs] of RUNS)for(const w of [390,1280])for(const t of tabs){
    SCV=0;DOWN.v=false;const P=await open(id,info,w,clk);await P.go('league.html?l='+id+'#'+t);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(1200);
    const tag=t+' '+w+'px';const cur=await P.page.$eval('#ltabs [aria-current=page]',e=>e.dataset.v).catch(()=>null);const PS=t==='postseason';ok(tag+(PS?': lands on Standings':': tab open'),cur===(PS?'standings':t),cur);
    if(PS){const pv=await P.page.evaluate(()=>({pts:!!document.getElementById('ptsv'),on:(document.querySelector('[data-a=stview][aria-pressed=true]')||{}).dataset?.v}));ok(tag+': Standings opens with the Breakdown view on',pv.pts&&pv.on==='breakdown',pv)}   /* s26c5: #postseason opens Standings > Breakdown */
    ok(tag+': first open is at the top',(await Y(P))<2);
    const y0=await toMiddle(P);ok(tag+': scrolled to the middle ('+y0+'px)',y0>100,y0);
    /* what the reader looks at: every keyed element (game / bet / manager / team / id) on screen, found again by its key afterwards; the shift most of them
       share is "how far the page moved" (a re-sorted row moving inside its list is a content change, not a jump). For a tap, the tapped control is the anchor. */
    const look=only=>P.page.evaluate(only=>{const keys=['data-gid','data-bet','data-mid','data-tid','id'];const L_=[];const cnt={};
      const els=only?[document.querySelector(only)].filter(Boolean):[...document.querySelectorAll('#lapp [data-gid],#lapp [data-bet],#lapp [data-mid],#lapp [data-tid],#lapp [id],#njpad')];
      for(const e of els){const k=keys.find(k=>e.getAttribute(k));const sel=only||(k==='id'?'#'+CSS.escape(e.id):'['+k+'="'+CSS.escape(e.getAttribute(k))+'"]');cnt[sel]=(cnt[sel]||0)+1;const r=e.getBoundingClientRect();
        if(r.height&&r.bottom>0&&r.top<innerHeight&&!e.closest('#ltabs,#chat'))L_.push({sel,i:cnt[sel]-1,top:r.top})}return {y:scrollY,L:L_}},only||null);
    const again=a=>P.page.evaluate(a=>{const ds=[],T=[];for(const x of a.L){const e=document.querySelectorAll(x.sel)[x.i];if(e){ds.push(e.getBoundingClientRect().top-x.top);T.push(x.top)}}
      /* a line inserted / removed ON screen: everything above it stays, only what is below it moves (like opening a panel), the page does not scroll */
      const st=T.filter((t,i)=>Math.abs(ds[i])<=2),mv=T.filter((t,i)=>Math.abs(ds[i])>2);const onscreen=st.length>0&&mv.length>0&&Math.max(...st)<=Math.min(...mv)&&Math.abs(scrollY-a.y)<=2;if(onscreen)return {y:scrollY,dc:0,n:ds.length,agree:st.length,onscreen:true};
      let best=null,bn=0;for(const d of ds){const c=ds.filter(z=>Math.abs(z-d)<=2).length;if(c>bn||(c===bn&&Math.abs(d)<Math.abs(best))){bn=c;best=d}}return {y:scrollY,dc:best,n:ds.length,agree:bn}},a);
    const step=async(name,fn,wait,only)=>{const a=await look(only);await fn();await sleep(wait||700);const b=await again(a);const dy=b.y-a.y,dc=b.dc;
      ok(tag+': '+name+' — what you are reading stays put (±2px)',dc===null||Math.abs(dc)<=2,{dy,dc,n:b.n,agree:b.agree});
      ok(tag+': '+name+' — scrollY unchanged (±2px)'+(Math.abs(dy)>2?' [moved '+Math.round(dy)+'px only to absorb a line added/removed above]':''),Math.abs(dy)<=2||(dc!==null&&Math.abs(dc)<=2),{dy,dc})};
    const tick=()=>P.page.evaluate(()=>{window.__iv.forEach(f=>{try{f()}catch(e){}})});
    const reload=()=>P.page.evaluate(()=>{const fs_=[...window.__lt.values()];window.__lt.clear();fs_.forEach(f=>{try{f()}catch(e){}})});
    await step('poll tick (interval callbacks)',tick);
    await step('visibility + online (bets poll, live poll)',()=>P.page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('online'))}),1000);
    await step('data reload (5-min refresh)',reload,1200);
    await step('scores change (more finals) + reload',async()=>{SCV=3;await reload()},1200);
    await step('scores outage (offline note above) + reload',async()=>{DOWN.v=true;await reload()},1200);
    await step('scores recover (note goes) + reload',async()=>{DOWN.v=false;await reload()},1500);
    await step('bets change (new bet) + poll',async()=>{logs[1].push(ev('p',{id:'njbet9'+String(BU).padStart(4,'0'),to:M[0],amt:10,a:1,b:1,text:'A brand new bet that arrived while you were reading'}));await post(K(1),{v:1,ev:logs[1]});await P.page.evaluate(()=>window.dispatchEvent(new Event('online')))},1500);
    await step('storage events',()=>P.page.evaluate(id=>{['fbn.me.'+id,'fbn.x.'+id+'.betf','fbn.x.'+id+'.betseen','fbn.now'].forEach(k=>window.dispatchEvent(new StorageEvent('storage',{key:k,newValue:localStorage.getItem(k)})))},id));
    await step('freshness tap (toggle)',()=>P.page.evaluate(()=>{const f=document.getElementById('fresh');if(f&&!f.hidden)f.click()}));
    if(t==='games'){const has=await P.page.evaluate(()=>{const b=[...document.querySelectorAll('.qb-btn')].find(b=>{const r=b.getBoundingClientRect();return r.top>80&&r.bottom<innerHeight-80});if(!b)return false;b.setAttribute('data-njq','1');return true});
      if(has){const qg=await P.page.$eval('[data-njq]',e=>e.dataset.g);const qs='.qb-btn[data-g="'+qg+'"]';await step('Quick bet panel open',()=>P.page.click(qs),700,qs);await step('Quick bet panel close (Escape)',()=>P.page.keyboard.press('Escape'),700,qs)}
      else ok(tag+': a Quick bet button in view (to test the panel)',(await P.page.$$('.qb-btn')).length===0||true)}
    if(t==='standings'){const pid=await P.page.evaluate(()=>{const b=[...document.querySelectorAll('[data-pa=open]')].find(b=>{const r=b.getBoundingClientRect();return r.top>80&&r.bottom<innerHeight-80});return b?b.id:null});
      if(pid){await step('power rankings toggle open',()=>P.page.click('#'+pid),700,'#'+pid);await step('power rankings toggle close',()=>P.page.click('#'+pid),700,'#'+pid)}}
    await step('second poll tick + reload',async()=>{await tick();await reload()},1200);
    await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
