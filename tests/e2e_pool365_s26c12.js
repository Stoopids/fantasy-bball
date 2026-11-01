/* s26c12: 365-team pool. Run against a mock assets/teams.js with 365 schools (run dir), incl. new 6-digit ids, missing/invalid colours, no logo or a broken logo,
   very long names. League of 8 x 16 = 128 schools drawn across the pool. All teams / Breakdown / Games / Standings: every chip has a logo or initials (never blank),
   a valid background, conf codes (ESPN + unknown) labelled, sort + owner filter, render time, no overflow + taps >= 44px at 320/390/1280. SHOTS=dir */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');const SH=process.env.SHOTS||'';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,700):''))}}
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);
const NAMES=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅']];
const PICK=[];for(let i=0;i<128;i++)PICK.push(TIDS[Math.floor(i*TIDS.length/128)]);   /* spread over the whole pool (first, real, last) */
const rosters=NAMES.map((_,m)=>PICK.filter((_,i)=>i%8===m));
const CODES=['acc','big12','aeast','atl10','ASUN','American','Metro','UAC','bige','bsky','bsou','big10','bigw','col','usa','hor','ivy','midam','meac','mvc','mwest','neast','ovc','pat','sec','south','land','swac','summ','belt','wcc','newconf'];
const conf={};PICK.forEach((t,i)=>{conf[t]={conf:CODES[i%CODES.length],confRegChamp:false,confTournChamp:false}});
const now=Date.now(),H=3600e3;const iso=ms=>new Date(ms).toISOString().replace(/\.\d+Z/,'Z');
const games=[];for(let i=0;i<60;i++){const h=PICK[(i*7)%128],a=TIDS[(i*13+5)%TIDS.length];if(h===a)continue;const fin=i%2===0;
  games.push({id:'p'+i,day:'2000-01-01',start:iso(fin?now-(i+2)*H:now+(i+2)*H),status:fin?'final':'scheduled',kind:i%3?'reg':'conf',round:'',neutral:false,home:{id:h,score:fin?70+i%9:null,seed:null},away:{id:a,score:fin?66:null,seed:null}})}
const SC={format:1,sample:false,label:'',season:'2026-27',as_of:'2026-11-01',source:'pool365',games,conf};
async function open(id,info,w,hash){const P=await L.phone('pl'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:900});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(SC)});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});
    else if(u.hostname==='a.espncdn.com'&&/\/9\d{5}\.png$/.test(u.pathname))r.respond({status:404,body:''});   /* broken logos of the mock schools */
    else r.continue()});
  const t0=Date.now();await P.go('league.html?l='+id+hash);await P.page.waitForSelector('#lapp[data-ready]',{timeout:30000});P.ms=Date.now()-t0;await sleep(1200);return P}
const chipsOk=()=>{const bad=[];document.querySelectorAll('#lbody .chip.school-chip').forEach(c=>{const img=c.querySelector('img'),nl=c.querySelector('.nologo');const bg=getComputedStyle(c).backgroundColor;
  if(!(img&&!(img.complete&&img.naturalWidth===0))&&!(nl&&nl.textContent.trim()))   /* a lazy logo still loading counts; a broken one must have become initials */bad.push('blank:'+c.textContent.trim().slice(0,20));if(!bg||bg==='rgba(0, 0, 0, 0)')bad.push('nobg:'+c.textContent.trim().slice(0,20))});return bad.slice(0,6)};
const met=()=>{const R=e=>e.getBoundingClientRect();return{sw:document.documentElement.scrollWidth,iw:innerWidth,small:[...document.querySelectorAll('#ltabs a,#lbody button,#lbody [role=button]')].filter(e=>{const b=R(e);if(!b.width)return false;const h=getComputedStyle(e,'::before');const ex=h&&h.content!=='none'&&h.position==='absolute'?-parseFloat(h.top||0)-parseFloat(h.bottom||0):0;return b.height+ex<44}).map(e=>e.className+':'+Math.round(R(e).height)).slice(0,5)}};
(async()=>{try{const id=await seed(null,{name:'Test Pool 365',names:NAMES.map(x=>['Test '+x[0],x[1],x[2]]),rosters,rounds:16});const info=seed.info;
  ok('mock pool has 365 schools',TIDS.length===365,TIDS.length);
  for(const w of [320,390,1280]){
    let P=await open(id,info,w,'#teams');await P.page.waitForSelector('#allteams',{timeout:10000});await sleep(1500);
    let r=await P.page.evaluate(new Function('return ('+(()=>{const rows=[...document.querySelectorAll('#allteams .obr')];const t0=performance.now();
      return{n:rows.length,conf:rows.map(x=>x.querySelector('.atc').textContent),recs:rows.map(x=>[+x.dataset.w,+x.dataset.l]),chips:CH(),m:MET()}}).toString().replace('CH()','('+chipsOk.toString()+')()').replace('MET()','('+met.toString()+')()')+')()'));
    const tag=w+'px pool365';const pct=x=>x[0]+x[1]?x[0]/(x[0]+x[1]):0;
    ok(tag+' All teams: 128 schools, best record first',r.n===128&&r.recs.every((x,i)=>!i||pct(r.recs[i-1])>=pct(x)),r.n);
    ok(tag+' All teams: every conf code labelled (ESPN codes mapped, unknown -> NEWCONF), none raw lowercase',r.conf.every(c=>c!=='–'&&c!==c.toLowerCase())&&r.conf.includes('NEWCONF')&&r.conf.includes('B12')&&r.conf.includes('SoCon'),[...new Set(r.conf)]);
    ok(tag+' All teams: chips never blank, always a background (missing colours / broken logos)',!r.chips.length,r.chips);
    ok(tag+' All teams: no overflow, taps >= 44px',r.m.sw<=r.m.iw&&!r.m.small.length,r.m);
    const t1=Date.now();await P.page.click('#atfilter button[data-mid]:not([data-mid=""])');await P.page.waitForFunction(()=>document.querySelectorAll('#allteams .obr').length===16,{timeout:5000}).catch(()=>{});const fms=Date.now()-t1;
    const f=await P.page.evaluate(()=>document.querySelectorAll('#allteams .obr').length);ok(tag+' owner filter: 16 schools, < 1.5 s',f===16&&fms<1500,{f,fms});
    if(SH&&w!==320){await P.page.click('#atfilter button[data-mid=""]');await sleep(300);const b=await P.page.evaluate(()=>{const r=document.getElementById('lbody').getBoundingClientRect();return{y:r.top+scrollY,h:r.height}});await P.page.screenshot({path:SH+'/all-teams-'+w+'.png',clip:{x:0,y:Math.max(0,b.y-60),width:w,height:Math.min(1600,b.h+60)},captureBeyondViewport:true})}
    ok(tag+' page ready < 10 s',P.ms<10000,P.ms);await P.close();
    for(const [hash,lab] of [['#standings/breakdown','Breakdown'],['#standings','Standings'],['#games','Games']]){P=await open(id,info,w,hash);
      if(hash==='#games')await P.page.evaluate(()=>{const b=document.querySelector('[data-a=gmode][data-v=upcoming]');if(b)b.click()});await sleep(500);
      r=await P.page.evaluate(new Function('return ('+(()=>({chips:CH(),m:MET(),rows:document.querySelectorAll('#ptsv .obr').length,cards:document.querySelectorAll('#lbody .gm').length,err:document.body.innerText.includes('NaN')||document.body.innerText.includes('undefined')})).toString().replace('CH()','('+chipsOk.toString()+')()').replace('MET()','('+met.toString()+')()')+')()'));
      ok(tag+' '+lab+': renders ('+(hash==='#games'?r.cards+' cards':r.rows+' rows')+'), no NaN/undefined, chips never blank, no overflow, taps >= 44px',!r.err&&!r.chips.length&&r.m.sw<=r.m.iw&&!r.m.small.length&&(hash!=='#standings/breakdown'||r.rows===128)&&(hash!=='#games'||r.cards>0),r);
      ok(tag+' '+lab+': no page errors',!P.errs.length,P.errs.slice(0,3));
      if(SH&&hash==='#games'&&w!==320){const b=await P.page.evaluate(()=>{const r=document.getElementById('lbody').getBoundingClientRect();return{y:r.top+scrollY,h:r.height}});await P.page.screenshot({path:SH+'/games-upcoming-'+w+'.png',clip:{x:0,y:Math.max(0,b.y-60),width:w,height:Math.min(1600,b.h+60)},captureBeyondViewport:true})}
      await P.close()}}
}catch(e){bad++;console.log('FAIL  crashed',e)}await L.close();console.log('\n'+(n-bad)+'/'+n+' passed');process.exit(bad?1:0)})();
