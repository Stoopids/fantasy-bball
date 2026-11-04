/* s28c Games tab (STOOPIDS design, Paul via NCAA): one full-width row of 4 equal controls = Upcoming | Past games (.rkseg/.rkseg-b toggle, .on = active)
   + owners <select> + months <select> (no month buttons, no day select); no counts, no emoji on the toggles; no 'Times in your time zone' / favorite-underdog
   note and no 'Betting lines posted so far' note; 'Owner vs owner' compact under the row. Month filter works. 320/390/1280: no overflow, taps >= 36px tall.
   TZ=Asia/Jakarta APP=... API=... node tests/e2e_games_s28c.js   (SHOTS=dir, SHOTTAG=before|after for screenshots only) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');
const TZ=process.env.TZ||'Asia/Jakarta';const SH=process.env.SHOTS||'',TAG=process.env.SHOTTAG||'after';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}}
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);
const NAMES=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅']];const R=TIDS.slice(0,64);const rosters=()=>NAMES.map((_,i)=>R.slice(i*8,i*8+8));const own=(m,k)=>R[m*8+k];
const now=Date.now(),D=864e5;const iso=ms=>new Date(ms).toISOString().replace(/\.\d+Z/,'Z');
const G=(id,h,a,t,o)=>Object.assign({id,day:'2000-01-01',start:iso(t),status:'scheduled',kind:'reg',round:'',neutral:false,home:{id:h,score:null,seed:null},away:{id:a,score:null,seed:null}},o||{});
const FIN=(id,h,a,t)=>G(id,h,a,t,{status:'final',home:{id:h,score:70,seed:null},away:{id:a,score:64,seed:null}});
const GAMES=[FIN('f1',own(1,1),own(0,1),now-D),FIN('f2',own(2,1),own(3,1),now-2*D),G('u1',own(1,0),own(0,0),now+D,{line:{fav:own(1,0),sp:3.5}}),G('u2',own(2,0),own(3,0),now+2*D),G('u3',own(2,2),own(0,2),now+40*D),G('u4',own(3,3),own(1,3),now+70*D)];
const mk=t=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit'}).format(new Date(t));
async function open(id,info,w){const P=await L.phone('g8'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:900,tz:TZ});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:'2026-11-01',source:'test',games:GAMES})});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+'#games');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(900);return P}
const row=P=>P.page.evaluate(()=>{const r=document.querySelector('#lbody .mkrow');if(!r)return null;const kids=[...r.querySelector('.gctl').children,r.querySelector('.mkref')];   /* sync-step1: row = Upcoming | Past games toggle + Refresh Live Games at the far right (= STOOPIDS) */const rr=r.getBoundingClientRect(),pc=r.parentElement,ps=getComputedStyle(pc),pr=pc.getBoundingClientRect(),body={width:pr.width-parseFloat(ps.paddingLeft)-parseFloat(ps.paddingRight)-parseFloat(ps.borderLeftWidth)-parseFloat(ps.borderRightWidth)};
  return{kids:kids.map(e=>{const b=e.getBoundingClientRect(),cs=getComputedStyle(e);return{tag:e.tagName,cls:e.className,id:e.id,txt:(e.tagName==='SELECT'?e.options[e.selectedIndex].text:e.innerText).trim(),w:Math.round(b.width),h:Math.round(b.height),top:Math.round(b.top),on:e.classList.contains('on'),ap:e.getAttribute('aria-pressed'),rad:cs.borderRadius,fs:cs.fontSize,fw:cs.fontWeight}}),
   rw:Math.round(rr.width),bw:Math.round(body.width),sw:document.documentElement.scrollWidth,iw:innerWidth,text:document.querySelector('#lbody').innerText,
   h2h:(()=>{const b=document.querySelector('#lbody [data-a=gh2h]'),f=document.querySelector('#lbody .gf2');if(!b||!f)return null;const q=f.getBoundingClientRect();return{h:Math.round(b.getBoundingClientRect().height),txt:b.innerText.trim(),inF:f.contains(b),team:!!f.querySelector('#gTeamSel'),below:q.top>=rr.bottom-1,gap:Math.round(q.top-rr.bottom)}})(),rr:[Math.round(rr.right)],
   monthBtns:document.querySelectorAll('#lbody [data-a=gmonth],#lbody .gmon button').length,day:!!document.getElementById('gDaySel'),
   small:[...document.querySelectorAll('#lbody button,#lbody select,#lbody input,#lbody label')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&!e.closest('.gm')&&b.height<43.5}).map(e=>e.className||e.id||e.tagName)}});
const shot=async(P,w)=>{if(!SH)return;const c=await P.page.evaluate(()=>{const e=document.querySelector('#lbody');const r=e.getBoundingClientRect();return{x:0,y:Math.max(0,r.top+scrollY-8),width:innerWidth,height:Math.min(700,r.height+16)}});
  const f=path.join(SH,TAG+'_games_'+w+'.png');await P.page.screenshot({path:f,clip:c});console.log('  shot '+f)};
(async()=>{try{const id=await seed(null,{names:NAMES,rosters:rosters(),rounds:8});const info=seed.info;
  if(SH&&TAG==='before'){for(const w of [390,1280]){const P=await open(id,info,w);await shot(P,w);await P.close()}await L.close();process.exit(0)}
  for(const w of [320,390,1280]){const P=await open(id,info,w);let r=await row(P);
    ok(w+'px: one row: Upcoming, Past games, round ↻ Refresh (sync-step3; under 361px Refresh wraps to the right)',r&&r.kids.length===3&&r.kids[0].txt==='Upcoming'&&/^Past( games)?$/.test(r.kids[1].txt)&&/Refresh|↻/.test(r.kids[2].txt)&&(w<361||r.kids.every(k=>Math.abs((k.top+k.h/2)-(r.kids[0].top+r.kids[0].h/2))<=8)),r&&r.kids);
    ok(w+'px: row is full width (of its card), Refresh at the far right',r&&Math.abs(r.rw-r.bw)<=1,r&&{rw:r.rw,bw:r.bw,w:r.kids.map(k=>k.w)});
    ok(w+'px: toggles + Refresh use .rkseg-b, .on + aria-pressed on the active one',r&&r.kids.every(k=>/\brkseg-b\b/.test(k.cls))&&r.kids[0].on&&r.kids[0].ap==='true'&&!r.kids[1].on&&r.kids[1].ap==='false',r&&r.kids);
    ok(w+'px: same look on both toggles (radius, font size, weight)',r&&r.kids.slice(0,2).every(k=>k.rad===r.kids[0].rad&&k.fs===r.kids[0].fs&&k.fw===r.kids[0].fw),r&&r.kids);
    ok(w+'px: no counts, no emoji on the toggles',r&&!/[()\d]|\p{Extended_Pictographic}/u.test(r.kids[0].txt+r.kids[1].txt),r&&[r.kids[0].txt,r.kids[1].txt]);
    ok(w+'px: no month buttons (months are a dropdown); All-days select in row 2',r&&r.monthBtns===0&&r.day,r);
    ok(w+'px: no time-zone/favorite note and no Betting lines note',r&&!/Times in your time zone|betting favorite|underdog|Betting lines posted/i.test(r.text));
    ok(w+'px: filters (owner, Pool vs Pool, More; no Team dropdown) sit compact under the row',r&&r.h2h&&r.h2h.inF&&!r.h2h.team&&r.h2h.txt==='Pool vs Pool'&&r.h2h.below&&r.h2h.gap<=12,r&&r.h2h);
    ok(w+'px: no horizontal overflow; toggles >= 36px tall (filters/Refresh use the smaller STOOPIDS size)',r&&r.sw<=r.iw&&r.kids.slice(0,2).every(k=>k.h>=36),r&&{sw:r.sw,iw:r.iw,h:r.kids.map(k=>k.h),small:r.small});
    if(w===390){const mo=await P.page.$$eval('#gMonthSel option',o=>o.map(x=>[x.value,x.text,x.disabled]));const want=new Set(GAMES.filter(g=>g.status!=='final').map(g=>mk(Date.parse(g.start)).slice(5)));
      ok('months select (s29b): Month + Nov..Apr, months without games disabled',mo[0][0]===''&&mo[0][1]==='Month'&&mo.slice(1).map(x=>x[1]).join()==='Nov,Dec,Jan,Feb,Mar,Apr'&&mo.slice(1).filter(x=>!x[2]).length===want.size,mo);
      const last=mo.filter(x=>x[0]).pop();await P.page.select('#gMonthSel',last[0]);await sleep(400);const ids=await P.page.$$eval('#lbody .gm',e=>e.map(x=>x.dataset.gid));
      ok('month jumps to the first game day of that month, select turns .on',ids.length>=1&&ids.every(i=>{const g=GAMES.find(g=>g.id===i);return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(g.start))===last[0]})&&await P.page.$eval('#gMonthSel',e=>e.classList.contains('on')),{ids,last});
      await P.page.click('[data-a=gmode][data-v=scores]');await sleep(400);r=await row(P);ok('Past games: .on moves, finished games listed',r.kids[1].on&&!r.kids[0].on&&await P.page.$$eval('#lbody .gm.gfin',e=>e.length)===2,r.kids);
      await P.page.click('[data-a=gmode][data-v=upcoming]');await sleep(400)}
    if(w!==320)await shot(P,w);await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
