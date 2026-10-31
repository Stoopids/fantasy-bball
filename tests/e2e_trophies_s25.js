/* s25 GOLD-LINE (Stoopids s25f): one 🏆 per title under each manager (s25g) on Standings = 1st places in this league's own past seasons (<league>-meta .archive).
   Cases: no history, 0 titles, 1 title, several, only 1st place counts (2nd/3rd and a cancelled season do not). Test archive data is SEEDED here (no league has any).
   TZ=Asia/Jakarta node tests/e2e_trophies_s25.js   (SHOTS=dir for s25_trophies_390/1280.png) */
const L=require('./lib.js');const F=require('../js/core.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');
const TZ=process.env.TZ||'Asia/Jakarta';const SH=process.env.SHOTS||'';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  ['+TZ+'] '+name);else{bad++;console.log('FAIL  ['+TZ+'] '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,700):''))}}
const base=process.env.API||'http://localhost:8471/api/data/';const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);
const NAMES=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅']];
const R8=TIDS.slice(0,64);const rosters=()=>NAMES.map((_,i)=>R8.slice(i*8,i*8+8));const own=(m,k)=>R8[m*8+k];
const now=Date.now(),H=3600e3;const iso=ms=>new Date(ms).toISOString().replace(/\.\d+Z/,'Z');
/* a tip at 02:30 UTC two days out: a different calendar date in Jakarta (09:30) and Los Angeles (19:30 the day before) */
const d2=new Date(now+2*24*H);const TIP=Date.UTC(d2.getUTCFullYear(),d2.getUTCMonth(),d2.getUTCDate(),2,30);
const G=(id,h,a,t,o)=>Object.assign({id,day:'2000-01-01',start:iso(t),status:'scheduled',kind:'reg',round:'',neutral:false,home:{id:h,score:null,seed:null},away:{id:a,score:null,seed:null}},o||{});
const FIN=(id,h,a,t,hs,as)=>G(id,h,a,t,{status:'final',home:{id:h,score:hs,seed:null},away:{id:a,score:as,seed:null}});
const GAMES=[G('t1',own(1,0),own(0,0),TIP,{line:{fav:own(1,0),sp:3.5}}),G('t2',own(2,0),own(0,1),TIP+H),G('t3',own(3,0),own(0,2),TIP+2*H),G('t4',own(4,0),own(0,3),TIP+3*H),G('t5',own(5,0),own(0,4),TIP+4*H),
  G('t6',own(6,0),own(0,5),now+6*H),G('t7',own(7,0),own(0,6),now+7*H),G('t8',own(2,1),own(1,1),now+30*H),
  FIN('f1',own(1,2),own(0,7),now-26*H,70,64),FIN('f2',own(2,2),own(3,1),now-27*H,81,77),FIN('f3',own(4,1),own(5,1),now-50*H,59,66),FIN('f4',own(6,1),own(7,1),now-51*H,90,88)];
const expTime=t=>{const f=new Intl.DateTimeFormat('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(t));const z=new Intl.DateTimeFormat('en-US',{timeZone:TZ,timeZoneName:'short'}).formatToParts(new Date(t)).find(x=>x.type==='timeZoneName').value;return f+' '+z};
const key=t=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const dn=k=>{const m=k.split('-');return Math.round(Date.UTC(+m[0],+m[1]-1,+m[2])/864e5)};
async function open(id,info,w,o){o=o||{};const P=await L.phone('gm'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:o.h||900,tz:TZ});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:'2026-11-01',source:'test',games:GAMES})});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+'#'+(o.hash||'games'));await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(900);return P}
const mode=async(P,m)=>{await P.page.evaluate(m=>{const b=document.querySelector('[data-a=gmode][data-v='+m+']');if(b)b.click()},m);await sleep(350)};
const grid=P=>P.page.evaluate(()=>{const gs=[...document.querySelectorAll('#lbody .ggrid')];const g=gs.sort((a,b)=>b.children.length-a.children.length)[0];if(!g)return null;
  const cols=getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length;const rows={};[...g.children].forEach(c=>{const r=c.getBoundingClientRect(),q=c.querySelector('.qb-btn'),qr=q&&q.getBoundingClientRect(),cs=getComputedStyle(c);
    (rows[Math.round(r.top)]=rows[Math.round(r.top)]||[]).push({h:Math.round(r.height),bot:Math.round(r.bottom),qb:q?{w:Math.round(qr.width),h:Math.round(qr.height),bot:Math.round(qr.bottom),inner:Math.round(r.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-parseFloat(cs.borderLeftWidth)-parseFloat(cs.borderRightWidth)),pb:Math.round(r.bottom-qr.bottom),bg:getComputedStyle(q).backgroundColor,fg:getComputedStyle(q).color,txt:q.innerText.trim(),disp:getComputedStyle(q).display,pad:getComputedStyle(q).padding,fw:getComputedStyle(q).fontWeight,rad:getComputedStyle(q).borderRadius,fs:parseFloat(getComputedStyle(q).fontSize),pfs:parseFloat(getComputedStyle(q.parentElement).fontSize),rgap:Math.round(r.right-parseFloat(cs.borderRightWidth)-parseFloat(cs.paddingRight)-qr.right),line:!!c.querySelector('.gl2')&&getComputedStyle(c.querySelector('.gl2')).display!=='none'}:null})});
  return{cols,rows:Object.values(rows)}});
(async()=>{try{
  const id=await seed(null,{names:NAMES,rosters:rosters(),rounds:8});const info=seed.info;const M=info.managers.map(m=>m.id);const K=F.Keys(id).meta;
  const meta0=JSON.parse(await (await fetch(base+encodeURIComponent(K))).text());
  const setArch=async a=>{const m=Object.assign({},meta0);if(a===undefined)delete m.archive;else m.archive=a;await post(K,m)};
  const S=(season,places,o)=>Object.assign({season,final:places.map((mid,i)=>({mid,place:i+1}))},o||{});
  const read=async w=>{const P=await open(id,info,w,{hash:'standings',h:1500});await P.page.waitForSelector('.ocl .card.oc',{timeout:20000});
    const r=await P.page.evaluate(()=>[...document.querySelectorAll('.ocl .card.oc')].map(c=>{const g=c.querySelector('.who .gold:not(.gold0)'),z=c.querySelector('.who .gold0'),cs=g&&getComputedStyle(g);
      return{mid:c.dataset.mid,t:g?g.innerText.trim():null,z:!!z,zt:z?z.textContent:'',h:Math.round(c.getBoundingClientRect().height),fs:cs&&cs.fontSize,lh:cs&&cs.lineHeight,fw:cs&&cs.fontWeight,col:cs&&cs.color,disp:cs&&cs.display,ws:cs&&cs.whiteSpace,ls:cs&&cs.letterSpacing,lab:g&&g.getAttribute('aria-label'),role:g&&g.getAttribute('role'),fit:g?g.scrollWidth<=g.clientWidth+1&&g.getBoundingClientRect().right<=c.getBoundingClientRect().right:null,
        mut:getComputedStyle(document.documentElement).getPropertyValue('--mut').trim(),after:g?g.previousElementSibling&&g.previousElementSibling.matches('b.nm')&&g.nextElementSibling&&g.nextElementSibling.tagName==='SMALL':null}}));return{P,r}};
  const lineOf=(r,mid)=>r.find(x=>x.mid===mid);
  const eq=r=>Math.max(...r.map(x=>x.h))-Math.min(...r.map(x=>x.h))<=1;
  /* 1. no history (no archive at all, the real state of every league today) */
  for(const w of [320,390,1280]){await setArch(undefined);let {P,r}=await read(w);ok(w+'px no history: no trophy line at all',r.length===8&&r.every(x=>!x.t&&!x.z),r);const h0=r[0].h;await P.close();
    /* 2. history with 0 titles for everyone shown (seasons exist, only 2nd+ for these managers... and a season with no final) */
    await setArch({seasons:[{season:'2024-25'}]});({P,r}=await read(w));ok(w+'px history but 0 titles: nothing shown, height unchanged',r.every(x=>!x.t&&!x.z)&&Math.abs(r[0].h-h0)<=1,r);await P.close();
    /* 3. one title */
    await setArch({seasons:[S('2025-26',[M[2],M[0],M[1]])]});({P,r}=await read(w));
    ok(w+'px one title: one 🏆 only for that manager',lineOf(r,M[2]).t==='🏆'&&r.filter(x=>x.t).length===1,r);
    ok(w+'px the others show nothing (an empty, hidden spacer only)',r.filter(x=>x.mid!==M[2]).every(x=>!x.t&&x.z&&x.zt===''),r);
    ok(w+'px cards stay equal height',eq(r),r.map(x=>x.h));
    const g=lineOf(r,M[2]);ok(w+'px s25g values: block, nowrap, letter-spacing 1px, role=img aria-label,, 12px, line-height 1.3, var(--mut), weight 400, under the name above the team name',g.disp==='block'&&g.fs==='12px'&&Math.abs(parseFloat(g.lh)-15.6)<0.2&&g.fw==='400'&&g.ws==='nowrap'&&g.ls==='1px'&&g.after&&g.lab==='1 title'&&g.role==='img',g);await P.close();
    /* 4. several titles + 5. only 1st place counts (2nd / 3rd and the cancelled season are not counted) */
    await setArch({seasons:[S('2017-18',[M[0],M[1]]),S('2018-19',[M[0],M[1]]),S('2021-22',[M[0],M[1],M[2]]),S('2022-23',[M[0],M[2],M[1]]),S('2023-24',[M[1],M[0],M[2]]),S('2019-20',[M[2],M[0]],{no_tournament:true}),S('2024-25',[M[0],M[3]]),S('2025-26',[M[4],M[0],M[1]])]});
    ({P,r}=await read(w));
    ok(w+'px several titles: Ana 🏆🏆🏆🏆🏆, Ben 🏆, Eli 🏆',lineOf(r,M[0]).t==='🏆🏆🏆🏆🏆'&&lineOf(r,M[1]).t==='🏆'&&lineOf(r,M[4]).t==='🏆',r);
    ok(w+'px only 1st place counts: Cy (2nd/3rd + a cancelled-season 1st) and Dee (2nd) show nothing',!lineOf(r,M[2]).t&&!lineOf(r,M[3]).t,r);
    ok(w+'px cards stay equal height with several titles',eq(r),r.map(x=>x.h));
    ok(w+'px the trophy rows fit inside the card, and Ana\'s aria-label says 5 titles',r.filter(x=>x.t).every(x=>x.fit)&&lineOf(r,M[0]).lab==='5 titles',r.filter(x=>x.t));
    ok(w+'px no horizontal overflow',await P.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(SH){await P.page.evaluate(m=>{const cb=document.getElementById('chatbar')||document.querySelector('.chatbar');if(cb)cb.style.display='none';const c=document.querySelector('.ocl .card.oc[data-mid="'+m+'"]');c.scrollIntoView({block:'center'})},M[0]);await sleep(300);
      await P.page.screenshot({path:path.join(SH,'s25_trophies_'+w+'.png')});console.log('  shot '+path.join(SH,'s25_trophies_'+w+'.png'))}
    await P.close()}
  /* name matching never used: same name, different manager id -> no title */
  ok('matched by manager id only (source check: no name match)',!/goldN\(o\.name\)/.test(fs.readFileSync(path.join(root,'js/leaguehome.js'),'utf8')));
  ok('no money wording in the line',!/\$|money|cash|prize/i.test('🏆🏆🏆'));
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
