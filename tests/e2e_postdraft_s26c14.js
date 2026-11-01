/* s26c14 post-draft end-to-end check of the League site on a COMPLETED mock draft of "BALL DON'T LIE" (8 managers x 8 rounds = 64 picks,
   meta.status complete + endedAt set, real assets/teams.js, Torvik o injected from /workspace/dr2-s26c14/torvik_o.json when present).
   Every visible tab at 320/390/1280: no page errors, no undefined/NaN/null text, no horizontal overflow, taps >= 44px, no 'Test ' prefix,
   no money words (💵/💰 icons allowed), right counts (8 rosters x 8, 64 All teams rows, 64-pick board, 8 grade cards), room links keep ?l=<code>.
   Part 2 (timing): live draft with 63 picks, League page open, pick 64 written to the store -> time until the page shows 8 full rosters,
   with and without reload, plus whether Draft tab board / Recap grades flip.  APP / API env (mock store). SHOTS=dir. SKIP_TIMING=1 to skip part 2. */
const L=require('./lib.js'),path=require('path'),fs=require('fs');const {seed}=require('./seed_league.js');const F=require('../js/core.js');const root=path.join(__dirname,'..');
let n=0,bad=0;const notes=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
let RAW=null;try{RAW=JSON.parse(fs.readFileSync('/workspace/dr2-s26c14/torvik_o.json','utf8'))}catch(e){}
const teamsJs=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8')+(RAW?'\n;(function(M,R){for(const k in R){M[k]=Object.assign({},M[k]||{},{o:R[k]})}})(window.TEAMS_DATA.meta=window.TEAMS_DATA.meta||{},'+JSON.stringify(RAW)+');':'');
const NAMES=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦉']];
const API=L.API;
async function open(w,id,me,hash,o){o=o||{};const P=await L.phone('pd'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:w>=760?900:800});
  if(me)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,me);
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);P.remote=[];
  P.page.on('request',r=>{const u=new URL(r.url());if(/textdb\.dev/.test(u.hostname)){P.remote.push(r.method()+' '+u.href);return r.abort()}
    if(u.pathname==='/assets/teams.js')return r.respond({status:200,contentType:'text/javascript',body:teamsJs});
    if(u.hostname==='site.api.espn.com')return r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:/rankings/.test(u.pathname)?'{"rankings":[]}':'{"events":[]}'});r.continue()});
  await P.go('league.html?l='+id+(hash||''));if(!o.noWait){await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(1200)}return P}
const SCAN=()=>{const b=document.getElementById('lbody')||document.body;const txt=b.innerText;
  const small=[...b.querySelectorAll('a,button,[role=button],select,input')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;if(e.closest('p,li,.note')&&e.tagName==='A'&&!e.classList.contains('btn'))return false;const h=getComputedStyle(e,'::before');const ex=h&&h.content!=='none'&&h.position==='absolute'?-parseFloat(h.top||0)-parseFloat(h.bottom||0):0;return r.height+ex<44}).map(e=>(e.id||e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().height)).slice(0,6);
  const iw=innerWidth;const wide=[...document.querySelectorAll('#lapp *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>iw+1&&!(()=>{for(let p=e.parentElement;p;p=p.parentElement){const o=getComputedStyle(p).overflowX;if(o==='auto'||o==='scroll'||o==='hidden')return true}return false})()}).map(e=>e.tagName+'.'+e.className).slice(0,4);
  return{txt,full:document.body.innerText,sw:document.documentElement.scrollWidth,iw,small,wide,tabs:[...document.querySelectorAll('#ltabs [data-v]')].map(a=>a.dataset.v),
    room:[...document.querySelectorAll('a[href*="room.html"]')].map(a=>a.getAttribute('href'))}};
(async()=>{try{const SH=process.env.SHOTS;
  const id=await seed(null,{name:"BALL DON'T LIE",names:NAMES,rounds:8});const info=seed.info;const me={mid:info.managers[1].id,k:info.managers[1].k};
  console.log('  league '+id+', o source: '+(RAW?'torvik_o.json':'none (teams.js only)'));
  for(const w of [320,390,1280]){const P0=await open(w,id,me,'#standings');const tabs=await P0.page.evaluate(()=>[...document.querySelectorAll('#ltabs [data-v]')].map(a=>a.dataset.v));await P0.close();
    ok(w+'px: tab list',tabs.length>=6,tabs);
    for(const t of tabs){const P=await open(w,id,me,'#'+t);
      if(t==='rosters'){await P.page.evaluate(()=>{const e=document.querySelector('[data-a=teamrow]');if(e)e.click()});await L.sleep(300)}
      if(t==='recap'){await P.page.waitForSelector('#powerrank .pr, #prempty',{timeout:20000}).catch(()=>{});await L.sleep(500)}
      const r=await P.page.evaluate(new Function('return ('+SCAN.toString()+')()'));const tag=w+'px #'+t;
      ok(tag+': no JS errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);
      ok(tag+': no undefined/NaN/null/[object] text',!/\bundefined\b|\bNaN\b|\bnull\b|\[object/.test(r.full),(r.full.match(/.{0,40}(undefined|NaN|null|\[object).{0,40}/)||[])[0]);
      ok(tag+': no horizontal overflow',r.sw<=r.iw&&!r.wide.length,{sw:r.sw,iw:r.iw,wide:r.wide});
      ok(tag+': taps >= 44px',r.small.length===0,r.small);
      ok(tag+': no "Test " prefix shown',!/\bTest [A-Z]/.test(r.full),(r.full.match(/.{0,30}Test [A-Z].{0,30}/)||[])[0]);
      ok(tag+': no money words'+(t==='bets'?' (s28: Bets copies the partner wording; skipped on #bets)':''),t==='bets'||!/\b(cash|money|dollars?|prize|payout|wager\w*|jackpot|lotter\w*|gambl\w*|pot)\b|\$\s?\d/i.test(r.full.replace(/[💵💰]/gu,'')),(r.full.match(/.{0,30}\b(cash|money|dollars?|prize|payout|wager\w*|jackpot|pot)\b.{0,30}/i)||[])[0]);
      ok(tag+': room links keep league code',r.room.every(h=>h.includes('l='+id)),r.room);
      ok(tag+': no remote store calls',P.remote.length===0,P.remote);
      const c=await P.page.evaluate(()=>({own:document.querySelectorAll('#lbody .ocl .oc').length,chips:[...document.querySelectorAll('#lbody .ocl .oc')].map(o=>o.querySelectorAll('.chips .chip, .chips a').length),
        rost:document.querySelectorAll('#lbody .obk .obr').length,rkp:(document.querySelector('.rkp')||{}).innerText||'',ownerTabs:document.querySelectorAll('[data-a=pickowner]').length,
        at:document.querySelectorAll('#allteams .obr').length,games:document.querySelectorAll('#lbody .gc, #lbody .game, #lbody [data-gid]').length,
        board:document.querySelectorAll('#dboard ~ .dround .dpick').length,godraft:!!document.getElementById('godraft'),grades:document.querySelectorAll('#powerrank article.pr').length,txt:document.getElementById('lbody').innerText.slice(0,160)}));
      if(t==='standings'){ok(tag+': 8 standings cards, 8 school chips each',c.own===8&&c.chips.every(x=>x===8),c.chips)}
      if(t==='rosters'){ok(tag+': 8 owner tabs, 8 schools in the roster',c.ownerTabs===8&&c.rost===8,{o:c.ownerTabs,r:c.rost});ok(tag+': detail shows STOOPID rank + Power rank',/STOOPID rank: (#\d+|–)/.test(c.rkp)&&/Power rank: (#\d+|–)/.test(c.rkp)&&/KenPom 2026-27 preseason ratings/.test(c.rkp),c.rkp);
        if(RAW)ok(tag+': Power rank has a real value for a drafted top school',/Power rank: #\d+/.test(c.rkp),c.rkp)}
      if(t==='teams')ok(tag+': All teams lists 64 schools',c.at===64,c.at);
      if(t==='draft')ok(tag+': post-draft Draft tab shows the 64-pick board (not the Go to draft room button)',c.board===64&&!c.godraft,{board:c.board,go:c.godraft,txt:c.txt});
      if(t==='recap')ok(tag+': Recap shows 8 grade cards',c.grades===8,{g:c.grades,txt:c.txt});
      if(t==='games')notes.push(tag+': game cards '+c.games+' (no scores.json games in a preseason mock is expected) · '+c.txt.replace(/\n/g,' ').slice(0,100));
      if(SH&&(w===390||t==='standings'||t==='rosters'||t==='teams')){await P.page.screenshot({path:SH+'/'+t+'-'+w+'.png',fullPage:w!==1280||t!=='rules'})}
      await P.close()}}
  if(!process.env.SKIP_TIMING){console.log('\n  -- timing: pick 64 written while the League page is open --');
    const lid=await seed(null,{name:"BALL DON'T LIE",names:NAMES,rounds:8,live:true,picksMade:63});const inf=seed.info;const me2={mid:inf.managers[0].id,k:inf.managers[0].k};
    const P=await open(390,lid,me2,'#rosters',{noWait:true});await L.sleep(4000);
    const pre=await P.page.evaluate(()=>({ready:!!document.querySelector('#lapp[data-ready]'),avail:(document.getElementById('avail')||{}).innerText||'',txt:(document.getElementById('lbody')||document.body).innerText.slice(0,200)}));
    ok('timing: with 63 of 64 picks the League page shows the pre-draft placeholder',!pre.ready&&/after the draft|63 of 64/i.test(pre.txt),pre);
    const K=F.Keys(lid);const last=inf.picks[62];const prevId=(await (await fetch(API+encodeURIComponent(K.pick(1,63)))).text());let prev='';try{prev=F.parseEntry(prevId).id}catch(e){}
    const S=require('fs').readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(S.slice(S.indexOf('{'),S.lastIndexOf('}')+1));const used=new Set(inf.picks.map(p=>String(p.teamId)));const tid=TD.teams.map(t=>t[0]).find(t=>!used.has(t));
    const mid=inf.managers.map(m=>m.id)[0];/* snake: pick 64 = round 8 (even, reversed) last slot = order[0] */
    const t0=Date.now();await fetch(API+encodeURIComponent(K.pick(1,64)),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(F.makeEntry(64,mid,tid,{now:t0,epoch:1,writer:'room',by:'owner',prev}))});
    let tFlip=null;for(let i=0;i<90;i++){await L.sleep(500);const z=await P.page.evaluate(()=>!!document.querySelector('#lapp[data-ready]'));if(z){tFlip=Date.now()-t0;break}}
    ok('timing: without reload the open page flips to the full League site (poll every 15 s) within 20 s',tFlip!=null&&tFlip<=20000,tFlip);notes.push('timing no-reload: '+(tFlip==null?'did not flip in 45 s':(tFlip/1000).toFixed(1)+' s after pick 64 was stored'));
    if(tFlip!=null){await P.page.evaluate(()=>{location.hash='#rosters'});await L.sleep(800);const c=await P.page.evaluate(()=>({tabs:document.querySelectorAll('[data-a=pickowner]').length,rost:document.querySelectorAll('#lbody .obk .obr').length}));ok('timing: no-reload page shows 8 owners x 8 schools',c.tabs===8&&c.rost===8,c)}
    const t1=Date.now();const R=await open(390,lid,me2,'#rosters');const tRel=Date.now()-t1;const rc=await R.page.evaluate(()=>({tabs:document.querySelectorAll('[data-a=pickowner]').length,rost:document.querySelectorAll('#lbody .obk .obr').length}));
    ok('timing: a fresh load / reload shows 8 full rosters at once',rc.tabs===8&&rc.rost===8,rc);notes.push('timing reload: full rosters on first render, '+(tRel/1000).toFixed(1)+' s incl. 1.2 s settle');
    await R.page.evaluate(()=>{location.hash='#draft'});await L.sleep(900);const d=await R.page.evaluate(()=>({board:document.querySelectorAll('.dpick').length,go:!!document.getElementById('godraft'),txt:document.getElementById('lbody').innerText.slice(0,120)}));
    ok('timing: natural finish (room leaves meta.status live, no endedAt) -> Draft tab shows the pick board',d.board===64,d);notes.push('Draft tab after natural finish: '+JSON.stringify(d));
    await R.page.evaluate(()=>{location.hash='#recap'});await R.page.waitForSelector('#powerrank article.pr',{timeout:15000}).catch(()=>{});const g=await R.page.evaluate(()=>document.querySelectorAll('#powerrank article.pr').length);
    ok('timing: natural finish -> Recap shows 8 grade cards',g===8,g);notes.push('Recap grades after natural finish: '+g);
    await R.close();await P.close()}
 }catch(e){bad++;console.log('FAIL exception',e&&e.stack)}finally{await L.close();console.log('\nNOTES\n'+notes.join('\n'));console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)}})();
