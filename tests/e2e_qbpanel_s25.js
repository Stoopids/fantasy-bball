/* s25 Quick bet panel: every chip / pick button >= 44x44, nothing overflows at 320/360/390/1280. SHOTS=dir for s25_qbpanel_320/390/1280.png */
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
  const id=await seed(null,{names:NAMES,rosters:rosters(),rounds:8});const info=seed.info;
  for(const w of [320,360,390,1280]){const P=await open(id,info,w);
    for(const gid of ['t1','t8']){/* t1: Ana's own game; t8: a game Ana is not in (adds the "betting against" chips) */
      await P.page.evaluate(g=>{const b=document.querySelector('[data-gid='+g+'] .qb-btn');if(b)b.click()},gid);await sleep(400);
      if(gid==='t8'){await P.page.evaluate(()=>{const b=document.querySelector('.qb-pick [data-lb=qbvs]');if(b)b.click()});await sleep(300)}
      const r=await P.page.evaluate(()=>{const p=document.querySelector('.qb-pick');if(!p)return null;const bs=[...p.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0);
        const small=bs.filter(b=>{const q=b.getBoundingClientRect();return q.height<43.5||q.width<43.5}).map(b=>({t:b.innerText.trim(),w:Math.round(b.getBoundingClientRect().width),h:Math.round(b.getBoundingClientRect().height)}));
        const pr=p.getBoundingClientRect(),out=[...p.querySelectorAll('*')].filter(e=>{const q=e.getBoundingClientRect();return q.width>0&&(q.right>pr.right+0.5||q.left<pr.left-0.5)}).map(e=>e.className||e.tagName);
        return{n:bs.length,small,out,pr:Math.round(pr.right),iw:innerWidth,sw:document.documentElement.scrollWidth,vs:p.querySelectorAll('[data-lb=qbvs]').length,pk:p.querySelectorAll('[data-lb=qbpick]').length,amt:p.querySelectorAll('[data-lb=qbamt]').length}});
      ok(w+'px '+gid+': panel open with chips and pick buttons',r&&r.n>=5&&r.pk>=2&&r.amt===2&&(gid!=='t8'||r.vs===2),r);
      ok(w+'px '+gid+': every chip / pick button >= 44 x 44',r&&r.small.length===0,r&&r.small);
      ok(w+'px '+gid+': nothing overflows the panel or the page',r&&r.out.length===0&&r.pr<=r.iw&&r.sw<=r.iw,r);
      if(SH&&gid==='t8'&&[320,390,1280].includes(w)){await P.page.evaluate(()=>{const c=document.getElementById('chatbar')||document.querySelector('.chatbar');if(c)c.style.display='none';document.querySelector('.qb-pick').closest('.gm').scrollIntoView({block:'start'})});await sleep(250);
        const cl=await P.page.evaluate(()=>{const r=document.querySelector('.qb-pick').closest('.gm').getBoundingClientRect();return{x:Math.max(0,r.left-8),y:Math.max(0,r.top-8+scrollY),width:Math.min(innerWidth,r.width+16),height:r.height+16}});
        await P.page.screenshot({path:path.join(SH,'s25_qbpanel_'+w+'.png'),clip:cl});console.log('  shot '+path.join(SH,'s25_qbpanel_'+w+'.png'))}
      await P.page.evaluate(()=>{const b=document.querySelector('.qb-pick .qb-x');if(b)b.click()});await sleep(250)}
    await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
