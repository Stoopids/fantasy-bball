/* s26c11: Games > Upcoming cards. Both sides: pill row + one fixed-height, one-line owner row (muted – when nobody owns the school) so the sides line up;
   owner and team names on one line (ellipsis), both team pills the same width and wider than before (>= 110px at 320), cards in one grid row the same height,
   no 'Test ' names, no overflow, taps >= 44px at 320/390/1280. APP / API env (mock store). SHOTS=dir -> games-upcoming-<w>.png */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');const SH=process.env.SHOTS||'';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,700):''))}}
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));
const LONG=TD.teams.slice().sort((a,b)=>b[2].length-a[2].length).slice(0,10).map(t=>t[0]);const REST=TD.teams.map(t=>t[0]).filter(t=>!LONG.includes(t));
const R8=LONG.slice(0,6).concat(REST.slice(0,58));const own=(m,k)=>R8[m*8+k];const FREE=LONG.slice(6);   /* long-name schools nobody drafted */
const NAMES=[['Bartholomew Montgomery-Smythe','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅']];
const now=Date.now(),H=3600e3;const iso=ms=>new Date(ms).toISOString().replace(/\.\d+Z/,'Z');
const G=(id,h,a,t)=>({id,day:'2000-01-01',start:iso(t),status:'scheduled',kind:'reg',round:'',neutral:false,home:{id:h,score:null,seed:null},away:{id:a,score:null,seed:null}});
const GAMES=[G('u1',own(0,0),FREE[0],now+5*H),G('u2',FREE[1],own(0,1),now+6*H),G('u3',own(1,0),own(0,2),now+7*H),G('u4',own(2,0),FREE[2],now+8*H),G('u5',own(3,0),own(0,3),now+9*H),G('u6',FREE[3],own(4,0),now+10*H)];
async function open(id,info,w){const P=await L.phone('gc'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:900});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:'2026-11-01',source:'test',games:GAMES})});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+'#games');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(900);
  await P.page.evaluate(()=>{const b=document.querySelector('[data-a=gmode][data-v=upcoming]');if(b)b.click()});await sleep(400);return P}
(async()=>{try{const id=await seed(null,{name:'Test Games s26c11',names:NAMES.map(x=>['Test '+x[0],x[1],x[2]]),rosters:NAMES.map((_,i)=>R8.slice(i*8,i*8+8)),rounds:8});const info=seed.info;
  for(const w of [320,390,1280]){const P=await open(id,info,w);
    const r=await P.page.evaluate(()=>{const R=e=>e.getBoundingClientRect();const cards=[...document.querySelectorAll('#lbody .ggrid>.gm')].filter(c=>c.querySelector('.gl1'));
      const one=e=>e.scrollWidth<=e.clientWidth+1||getComputedStyle(e).textOverflow==='ellipsis';
      const cs=cards.map(c=>{const sd=[...c.querySelectorAll('.gl1 .gside')];return{top:Math.round(R(c).top),h:Math.round(R(c).height),
        sides:sd.map(s=>{const ch=s.querySelector('.chip.school-chip'),ow=s.querySelector('.gow'),cn=ch&&ch.querySelector('.cn');const op=[...ow.querySelectorAll('.opill')];
          return{cw:Math.round(R(ch).width),ctop:Math.round(R(ch).top),otop:Math.round(R(ow).top),oh:Math.round(R(ow).height),none:!!ow.querySelector('.gno'),noneTxt:(ow.querySelector('.gno')||{}).textContent,noneCol:ow.querySelector('.gno')?getComputedStyle(ow.querySelector('.gno')).color:'',
            ows:getComputedStyle(ow).whiteSpace,opOne:op.every(p=>R(p).height<=24&&getComputedStyle(p).textOverflow==='ellipsis'&&getComputedStyle(p).whiteSpace==='nowrap'),cnOne:cn?getComputedStyle(cn).whiteSpace==='nowrap'&&getComputedStyle(cn).textOverflow==='ellipsis'&&R(cn).height<=22:true,cnW:cn?Math.round(R(cn).width):0,txt:ow.innerText}})}});
      const small=[...document.querySelectorAll('#ltabs a,#lbody a,#lbody button')].filter(e=>{const b=R(e);if(!b.width)return false;const h=getComputedStyle(e,'::before');const ex=h&&h.content!=='none'&&h.position==='absolute'?-parseFloat(h.top||0)-parseFloat(h.bottom||0):0;return b.height+ex<44}).map(e=>e.className+':'+Math.round(R(e).height));
      return{cs,small,sw:document.documentElement.scrollWidth,iw:innerWidth,txt:document.getElementById('lapp').innerText}});
    const tag=w+'px Games upcoming';const S=r.cs.flatMap(c=>c.sides);
    ok(tag+': 6 cards, 2 sides each',r.cs.length===6&&r.cs.every(c=>c.sides.length===2),r.cs.length);
    ok(tag+': every side has a one-line owner row of the same fixed height (22px)',S.every(s=>s.oh===22&&s.ows==='nowrap'),S.map(s=>s.oh));
    ok(tag+': unowned side shows a muted –',S.filter(s=>s.none).length===4&&S.filter(s=>s.none).every(s=>s.noneTxt==='–'&&s.noneCol!=='rgb(238, 241, 247)'),S.filter(s=>s.none).map(s=>[s.noneTxt,s.noneCol]));
    ok(tag+': sides line up (pills and owner rows at the same y)',r.cs.every(c=>c.sides[0].ctop===c.sides[1].ctop&&c.sides[0].otop===c.sides[1].otop),r.cs.map(c=>c.sides.map(s=>[s.ctop,s.otop])));
    ok(tag+': owner pills and team names on one line with ellipsis',S.every(s=>s.opOne&&s.cnOne),S.filter(s=>!s.opOne||!s.cnOne));
    ok(tag+': both team pills the same width, >= 110px (more room for names)',r.cs.every(c=>Math.abs(c.sides[0].cw-c.sides[1].cw)<=1)&&S.every(s=>s.cw>=110),r.cs.map(c=>c.sides.map(s=>s.cw)));
    {const rows={};r.cs.forEach(c=>{(rows[c.top]=rows[c.top]||[]).push(c.h)});ok(tag+': cards in one row the same height',Object.values(rows).every(h=>Math.max(...h)-Math.min(...h)<=1),rows)}
    ok(tag+': no "Test " names, no money words',!/\bTest (Bartholomew|Ben|Cy|Dee|Eli|Fay|Gus|Hal)\b/.test(r.txt)&&!/\b(cash|money|dollars?|prize|payout|wager)\b|\$\d/i.test(r.txt));
    ok(tag+': no overflow',r.sw<=r.iw,{sw:r.sw,iw:r.iw});
    ok(tag+': taps >= 44px',!r.small.length,r.small);
    if(SH){const b=await P.page.evaluate(()=>{const r=document.getElementById('lbody').getBoundingClientRect();return{y:r.top+scrollY,h:r.height}});await P.page.screenshot({path:SH+'/games-upcoming-'+w+'.png',clip:{x:0,y:Math.max(0,b.y-60),width:w,height:Math.min(1500,b.h+60)},captureBeyondViewport:true})}
    await P.close()}
}catch(e){bad++;console.log('FAIL  crashed',e)}await L.close();console.log('\n'+(n-bad)+'/'+n+' passed');process.exit(bad?1:0)})();
