/* s25 bet time stamps: 'Placed … · Settled …' muted line at the top of the pinned-bottom block (Stoopids spec), viewer's zone, equal card heights, no layout jump.
   TZ=Asia/Jakarta node tests/e2e_stamps_s25.js ; TZ=America/Los_Angeles node tests/e2e_stamps_s25.js   (SHOTS=dir for s25_stamps_390/1280/1600.png) */
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
    (rows[Math.round(r.top)]=rows[Math.round(r.top)]||[]).push({h:Math.round(r.height),bot:Math.round(r.bottom),qb:q?{w:Math.round(qr.width),h:Math.round(qr.height),bot:Math.round(qr.bottom),inner:Math.round(r.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-parseFloat(cs.borderLeftWidth)-parseFloat(cs.borderRightWidth)),pb:Math.round(r.bottom-qr.bottom),bg:getComputedStyle(q).backgroundColor,fg:getComputedStyle(q).color,txt:q.innerText.trim()}:null})});
  return{cols,rows:Object.values(rows)}});
const md=t=>{const y=n=>new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric'}).format(new Date(n));const o={timeZone:TZ,month:'short',day:'numeric'};if(y(t)!==y(now))o.year='numeric';return new Intl.DateTimeFormat('en-US',o).format(new Date(t))};
let ZL=null;const xt=t=>ZL?expTime(t).replace(/ \S+$/,' '+ZL(t)):expTime(t);   /* the browser's own short zone name (WIB) can differ from Node's ICU (GMT+7) */
const exp=(p,s)=>'Placed '+md(p)+', '+xt(p)+(s?' · Settled '+md(s)+', '+xt(s):'');
(async()=>{try{
  const id=await seed(null,{names:NAMES,rosters:rosters(),rounds:8});const info=seed.info;const M=info.managers.map(m=>m.id);
  /* field names in the log: place {k:'p',ts} -> b.ts ; accept {k:'a',ts} ; settle {k:'s',r,ts,v:25} by the creator -> b.settledTs */
  const P1=now-50*H,P2=now-30*H,A2=P2+H,S2=now-5*H,P3=Date.UTC(2025,11,30,15,0);
  await post(F.Keys(id).base+'-bets-'+M[0],{v:1,ev:[{k:'p',u:'st000001',ts:P1,v:25,id:'sbet000001',to:'*',amt:10,a:1,b:1,text:'Duke beats UNC'},
    {k:'p',u:'st000002',ts:P2,v:25,id:'sbet000002',to:M[1],amt:10,a:1,b:1,text:'Kansas beats Kentucky by more than 5 points in a long text line that wraps'},
    {k:'s',u:'st000004',ts:S2,v:25,id:'sbet000002',r:'b'}]});
  await post(F.Keys(id).base+'-bets-'+M[1],{v:1,ev:[{k:'a',u:'st000003',ts:A2,v:25,id:'sbet000002'}]});
  for(const w of [390,1280,1600]){const P=await open(id,info,w,{hash:'bets',h:1400});await P.page.waitForSelector('[data-bet=sbet000002]',{timeout:20000});await sleep(600);
    {const zs=await P.page.evaluate(ts=>ts.map(t=>S25.zoneLabel(new Date(t))),[P1,P2,S2,P3]);const m=new Map([[P1,zs[0]],[P2,zs[1]],[S2,zs[2]],[P3,zs[3]]]);ZL=t=>m.get(t)}
    const r=await P.page.evaluate(()=>{const one=id=>{const c=document.querySelector('[data-bet='+id+']'),s=c&&c.querySelector('.b27-stamp');if(!s)return{c:!!c};const cs=getComputedStyle(s),sp=c.querySelector('.b27-sp'),act=c.querySelector('.b27-act,.b27-rx');
      const kids=[...c.children];return{t:s.innerText.trim(),n:c.querySelectorAll('.b27-stamp').length,fs:cs.fontSize,pfs:getComputedStyle(c).fontSize,fw:cs.fontWeight,col:cs.color,lh:cs.lineHeight,mt:cs.marginTop,mb:cs.marginBottom,
        afterSp:sp&&kids.indexOf(s)===kids.indexOf(sp)+1,beforeAct:!act||(s.compareDocumentPosition(act)&Node.DOCUMENT_POSITION_FOLLOWING)>0,top:Math.round(c.getBoundingClientRect().top),h:Math.round(c.getBoundingClientRect().height),
        sb:Math.round(s.getBoundingClientRect().bottom),cb:Math.round(c.getBoundingClientRect().bottom)}};return{o:one('sbet000001'),s:one('sbet000002'),sw:document.documentElement.scrollWidth,iw:innerWidth}});
    ok(w+'px open card: one line "'+exp(P1)+'"',r.o.t===exp(P1)&&r.o.n===1,r.o);
    ok(w+'px settled card: "'+exp(P2,S2)+'" on one line block',r.s.t===exp(P2,S2)&&r.s.n===1,r.s);
    ok(w+'px spec: .75em, weight 400, #9a9a9a, line-height 1.3, margin 6px 0 4px',[r.o,r.s].every(x=>Math.abs(parseFloat(x.fs)-0.75*parseFloat(x.pfs))<0.2&&x.fw==='400'&&x.col==='rgb(154, 154, 154)'&&Math.abs(parseFloat(x.lh)-1.3*parseFloat(x.fs))<0.3&&x.mt==='6px'&&x.mb==='4px'),[r.o,r.s]);
    ok(w+'px line sits right after the spacer, above the card actions (pinned-bottom block)',[r.o,r.s].every(x=>x.afterSp&&x.beforeAct),[r.o,r.s]);
    if(w>=760)ok(w+'px cards in a row stay equal height',r.o.top!==r.s.top||Math.abs(r.o.h-r.s.h)<=1,[r.o,r.s]);
    ok(w+'px no horizontal overflow',r.sw<=r.iw,r);
    /* no layout jump: the line is in the first render, so the card height does not change after reactions mount and a poll */
    const h0=r.s.h;await sleep(1500);const h1=await P.page.$eval('[data-bet=sbet000002]',c=>Math.round(c.getBoundingClientRect().height));ok(w+'px no layout jump after mount',Math.abs(h1-h0)<=1,[h0,h1]);
    if(SH){await P.page.evaluate(()=>{const c=document.getElementById('chatbar')||document.querySelector('.chatbar');if(c)c.style.display='none';document.querySelector('[data-bet=sbet000001]').scrollIntoView({block:'start'});window.scrollBy(0,-60)});await sleep(300);
      await P.page.screenshot({path:path.join(SH,'s25_stamps_'+w+'.png')});console.log('  shot '+path.join(SH,'s25_stamps_'+w+'.png'))}
    await P.close()}
  /* unit: missing parts are left out, the year only when not the current year */
  const P=await open(id,info,390,{hash:'bets'});const u=await P.page.evaluate((P3)=>{const T=LBETS._t.stampText;return{none:T({}),noS:T({ts:Date.now(),status:'settled'}),old:T({ts:P3}),sOnly:T({status:'settled',settledTs:Date.now()})}},P3);
  ok('both timestamps missing: no line',u.none==='',u);ok('settled without a settle time: placed part only',/^Placed [^·]+$/.test(u.noS),u);
  ok('a past-year date carries the year ("'+md(P3)+'")',u.old==='Placed '+md(P3)+', '+xt(P3)&&/2025/.test(u.old),u);ok('placed time missing: settled part only',/^Settled /.test(u.sOnly),u);await P.close();
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
