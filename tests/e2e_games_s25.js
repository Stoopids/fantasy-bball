/* s25 Games page + local time everywhere: times / day headers in the device zone (run under TZ=Asia/Jakarta and TZ=America/Los_Angeles),
   grid columns (1 / 2 from 700 / 3 from 1400), equal heights, full-width Quick bet pinned to the bottom, finished rows collapse / expand (mouse + keyboard),
   bet times + tagline day count in the local zone, no overflow + 44px taps at 320/360/390/1280, screenshots 390/1280/1600.
   TZ=Asia/Jakarta node tests/e2e_games_s25.js   (APP / API env; SHOTS=dir to write the screenshots) */
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
const audit=P=>P.page.evaluate(()=>{const A=[...document.querySelectorAll('#lbody .gm button,#lbody .gm a.chip,#lbody .gfr')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.closest('[hidden]')});
  return{n:A.length,small:A.filter(e=>{const r=e.getBoundingClientRect();return e.tagName==='BUTTON'&&(r.height<43.5||r.width<43.5)}).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,6),
    sw:document.documentElement.scrollWidth,iw:innerWidth,wide:[...document.querySelectorAll('#lbody .gm')].filter(c=>c.getBoundingClientRect().right>innerWidth+0.5).length}});
(async()=>{try{
  const id=await seed(null,{names:NAMES,rosters:rosters(),rounds:8});const info=seed.info;const M=info.managers.map(m=>m.id);
  /* one placed bet (Ana -> Ben), v:25 like the shipped placement, for the local bet time check */
  const BT=now-3*H;await post(F.Keys(id).base+'-bets-'+M[0],{v:1,ev:[{k:'p',u:'gt000001',ts:BT,v:25,id:'gbet000001',to:M[1],amt:10,a:1,b:1,text:'Duke beats UNC'}]});
  /* ---- local time zone ---- */
  let P=await open(id,info,390);
  const t1=await P.page.evaluate(()=>{const c=document.querySelector('[data-gid=t1]');let h=c.parentElement.previousElementSibling;return{txt:c.innerText.replace(/\s+/g,' '),head:h&&h.className==='gday'?h.innerText.replace(/\s+/g,' ').trim():null,zone:LTIME.zone(),heads:[...document.querySelectorAll('.gday')].map(x=>x.innerText.trim())}});
  ok('game time shows in the device zone with a short label: '+expTime(TIP),t1.txt.includes(expTime(TIP)),t1);
  const dd=dn(key(TIP))-dn(key(now)),hd=new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(new Date(TIP));
  ok('day header from the LOCAL date of the tip ('+(dd===1?'Tomorrow':'date')+' · '+hd+')',t1.head&&t1.head.includes(hd)&&(dd===1?/^Tomorrow/.test(t1.head):dd===0?/^Today/.test(t1.head):!/^(Today|Tomorrow)/.test(t1.head)),t1);
  ok('Today header kept (games later today), zone label on headers',t1.heads.some(h=>/^Today|^Tomorrow/.test(h))&&t1.heads.every(h=>h.includes(t1.zone)),t1.heads);
  ok('line 2 shows the spread when the game has one',/Spread .+ -3\.5/.test(t1.txt),t1.txt);
  const tz2=await P.page.evaluate(()=>({tag:LTIME.daysSince('2026-11-01',Date.now()),k:LTIME.dayKey(Date.now())}));
  ok('tagline day count uses the local date',tz2.tag===dn(key(now))-dn('2026-11-01')&&tz2.k===key(now),tz2);
  ok('no fixed zone in the League scripts (game days come from S25.etDay)',(()=>{const s=['js/leaguehome.js','js/league-bets.js','js/league-sched.js','js/league-d.js','js/league.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');return !/New_York|timeZone:\s*'/.test(s)})());   /* game-day matching uses S25.etDay from the shared file */
  await P.close();
  P=await open(id,info,390,{hash:'bets'});await P.page.waitForSelector('[data-bet=gbet000001]',{timeout:20000});
  const bt=await P.page.$eval('[data-bet=gbet000001]',e=>e.innerText.replace(/\s+/g,' '));const bx=expTime(BT);
  const bz=await P.page.evaluate(t=>S25.zoneLabel(new Date(t)),BT);const bx2=bx.replace(/ \S+$/,' '+bz);ok('bet placed time in the device zone with label ('+bx2+'), on the Placed line',bt.includes('Placed ')&&bt.includes(bx2),bt);await P.close();
  /* ---- grid + Quick bet ---- */
  for(const [w,c] of [[390,1],[699,1],[700,2],[1280,2],[1399,2],[1400,3],[1600,3]]){P=await open(id,info,w);const g=await grid(P);
    ok(w+'px: '+c+' column(s)',g&&g.cols===c,g&&g.cols);
    if([390,1280,1600].includes(w)){const multi=g.rows.filter(r=>r.length>1),all=g.rows.flat(),q=all.filter(x=>x.qb);
      if(c>1)ok(w+'px: cards in a row have equal heights',multi.length>=1&&multi.every(r=>Math.max(...r.map(x=>x.h))-Math.min(...r.map(x=>x.h))<=1),g.rows);
      ok(w+'px: Quick bet is a normal button (not full width), >= 44px, #FFD400 on #111, label kept',q.length>=5&&q.every(x=>x.qb.w<x.qb.inner-40&&x.qb.h>=44&&x.qb.bg==='rgb(255, 212, 0)'&&x.qb.fg==='rgb(17, 17, 17)'&&/Quick bet/.test(x.qb.txt)),q.map(x=>x.qb));
      ok(w+'px: Quick bet spec: inline-flex (computed flex inside the flex row), padding 8px 16px, .9em, weight 700, radius 10px',q.every(x=>(x.qb.disp==='inline-flex'||x.qb.disp==='flex')&&x.qb.pad==='8px 16px'&&x.qb.fw==='700'&&x.qb.rad==='10px'&&Math.abs(x.qb.fs-0.9*x.qb.pfs)<0.2),q.map(x=>x.qb));
      ok(w+'px: the spread / over-under line stays visible in cards that have one',await P.page.evaluate(()=>{const c=document.querySelector('[data-gid=t1]');return !!c&&/Spread .+ -3\.5/.test(c.innerText)&&[...c.querySelectorAll('*')].some(e=>/Spread/.test(e.textContent)&&e.children.length===0&&e.getBoundingClientRect().width>0)}));ok(w+'px: Quick bet sits bottom-right (right edge = card content edge)',q.every(x=>Math.abs(x.qb.rgap)<=1),q.map(x=>x.qb.rgap));
      ok(w+'px: Quick bet pinned to the bottom of every card (same gap)',q.every(x=>Math.abs(x.qb.pb-q[0].qb.pb)<=1),q.map(x=>x.qb.pb));
      if(c>1)ok(w+'px: Quick bets in a row line up',multi.every(r=>{const b=r.filter(x=>x.qb).map(x=>x.qb.bot);return b.length<2||Math.max(...b)-Math.min(...b)<=1}),g.rows)}
    await P.close()}
  /* ---- tight two-line cards ---- */
  P=await open(id,info,390);const tl=await P.page.evaluate(()=>{const c=document.querySelector('[data-gid=t2]');return{l1:!!c.querySelector('.gl1'),l2:!!c.querySelector('.gl2'),rows:c.querySelectorAll(':scope > div').length,pad:getComputedStyle(c).paddingTop}});
  ok('upcoming card = line 1 (teams) + line 2 (time) + Quick bet, 6px padding',tl.l1&&tl.l2&&tl.rows===3&&tl.pad==='6px',tl);
  /* ---- finished rows ---- */
  await mode(P,'scores');
  const st=()=>P.page.evaluate(()=>{const b=document.querySelector('[data-gid=f1] .gfr'),x=document.getElementById(b.getAttribute('aria-controls')),r=b.getBoundingClientRect();return{tag:b.tagName,ae:b.getAttribute('aria-expanded'),hid:x.hidden,txt:b.innerText.replace(/\s+/g,' ').trim(),h:Math.round(r.height),w:Math.round(r.width),focus:document.activeElement===b,rows:[...document.querySelectorAll('#lbody .gm.gfin')].map(c=>Math.round(c.getBoundingClientRect().height))}});
  let s=await st();ok('finished games are one-line rows (teams, final score, Final), collapsed, 44px button',s.tag==='BUTTON'&&s.ae==='false'&&s.hid&&/64.*70.*Final/.test(s.txt)&&s.h>=44&&s.rows.every(h=>h<=50),s);
  await P.page.click('[data-gid=f1] .gfr');await sleep(200);s=await st();ok('tap expands it (aria-expanded=true, details shown)',s.ae==='true'&&!s.hid,s);
  await P.page.click('[data-gid=f1] .gfr');await sleep(200);s=await st();ok('tap again collapses it',s.ae==='false'&&s.hid,s);
  await P.page.focus('[data-gid=f1] .gfr');await P.page.keyboard.press('Enter');await sleep(200);s=await st();ok('keyboard Enter expands',s.ae==='true'&&!s.hid&&s.focus,s);
  await P.page.keyboard.press('Space');await sleep(200);s=await st();ok('keyboard Space collapses',s.ae==='false'&&s.hid,s);
  await P.page.keyboard.press('Enter');await sleep(200);await P.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await mode(P,'upcoming');await mode(P,'scores');s=await st();ok('stays open after a re-render',s.ae==='true'&&!s.hid,s);
  await P.close();
  /* ---- overflow + taps ---- */
  for(const w of [320,360,390,1280]){P=await open(id,info,w);for(const m of ['upcoming','scores']){await mode(P,m);if(m==='scores')await P.page.evaluate(()=>document.querySelectorAll('.gfr').forEach(b=>b.click()));await sleep(250);
      const a=await audit(P);ok(w+'px '+m+': no horizontal overflow, every button >= 44px',a.n>0&&a.sw<=a.iw&&a.wide===0&&!a.small.length,a)}await P.close()}
  /* ---- screenshots: upcoming (top) + finished (below), stacked into one image ---- */
  if(SH){for(const w of [390,1280,1600]){P=await open(id,info,w,{h:w===390?1500:1000});const clip=async()=>{const r=await P.page.evaluate(()=>{const a=document.querySelector('#lbody .card'),e=[...document.querySelectorAll('#lbody .ggrid')].pop();const t=a.getBoundingClientRect().top+scrollY,b=e.getBoundingClientRect().bottom+scrollY;return{y:Math.max(0,t-8),h:Math.min(b-t+16,3000)}});const H2=await P.page.evaluate(()=>document.documentElement.scrollHeight);await P.page.setViewport({width:w,height:Math.min(H2,4000),isMobile:w<760,hasTouch:w<760});await sleep(300);return{x:0,y:r.y,width:w,height:r.h}};
    await P.page.screenshot({path:'/tmp/gs_up_'+w+'.png',clip:await clip()});await mode(P,'scores');await P.page.click('#lbody .gfr');await sleep(250);
    await P.page.screenshot({path:'/tmp/gs_fin_'+w+'.png',clip:await clip()});
    require('child_process').execFileSync('python3',['-c',"import sys;from PIL import Image;a=Image.open(sys.argv[1]);b=Image.open(sys.argv[2]);c=Image.new('RGB',(max(a.width,b.width),a.height+b.height+12),(16,19,26));c.paste(a,(0,0));c.paste(b,(0,a.height+12));c.save(sys.argv[3])",'/tmp/gs_up_'+w+'.png','/tmp/gs_fin_'+w+'.png',path.join(SH,'s25_games_'+w+'.png')]);
    console.log('  shot '+path.join(SH,'s25_games_'+w+'.png'));await P.close()}}
  ok('no page errors',true);
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
