/* Power rankings on the DRAFT RECAP page (s20): the shared module js/power-render.js is hooked into a patched, in-memory copy of recap.html / js/recap.js
   (served by request interception; nothing in the dev tree is written), exactly with the hook lines from /workspace/league-site-work/POWER-RECAP-HOOK.md.
   Checks, at 390 and 1280: matching league -> 8 cards (grades A+..D, 4-sentence recap, one-tap 10-sentence deep dive + school list, aria-expanded, keyboard, 44px),
   the strict match rule (same names but other rosters / one school off / real-league names -> the plain empty state), an unfinished draft shows nothing,
   "Test " names shown without the prefix, no page errors, no horizontal overflow, the module fills its container (same edges as the recap cards).
   node tests/e2e_power_recap.js  (APP / API env, mock store) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep,APP}=L;
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}}
const root=path.join(__dirname,'..');const PR=JSON.parse(fs.readFileSync(path.join(root,'data/power-rankings.json'),'utf8'));
/* ---- the hook, exactly as documented ---- */
const HOOK_CSS='<link rel="stylesheet" href="css/power.css">',HOOK_JS='<script src="js/power-render.js"></script>',HOOK_CALL="if(window.FBNPower)FBNPower.mount(app,{done,managers:d.managers,state:st,teams:T.TEAMS});";
const {html,rjs,mode,ok:hookable}=require('./power_hook.js')(root);
async function patch(P){await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);P.page.on('request',r=>{const u=new URL(r.url());
  if(u.pathname==='/recap.html')r.respond({status:200,contentType:'text/html; charset=utf-8',body:html});else if(u.pathname==='/js/recap.js')r.respond({status:200,contentType:'application/javascript; charset=utf-8',body:rjs});else r.continue()})}
const P0lab=async(w,desk,h,id)=>{const T=await L.phone('pt'+w,desk?{desktop:true,w,h}:{});await patch(T);await T.go('recap.html?l='+id);await ready(T);await sleep(500);const l=await T.page.$$eval('#powerrank .plb',b=>b.map(x=>x.getAttribute('aria-label')));await T.page.close();return l};
const sents=t=>t.split(/(?<=[.!?])\s+/).length;
const sc=t=>(String(t).match(/[.!?](?=\s|$)/g)||[]).length;
const ready=async P=>{try{await P.page.waitForFunction('!!document.querySelector("#powerrank #prempty, #powerrank .card.pr")',{timeout:25000})}catch(e){throw e}};
(async()=>{try{
  ok('the recap page loads css/power.css + js/power-render.js and has a single mount point for the module (test copy: '+mode+')',hookable);
  ok('shipped power-rankings.json: 8 rows, grade + short + recap; short = 4 sentences, deep dive = 10',PR.length===8&&PR.every(r=>/^[A-D][+-]?$/.test(r.grade)&&sc(r.short)===4&&sc(r.recap)===10));
  ok('power-rankings.json: no money wording or amounts',!/\b(lotter\w*|jackpot|wager\w*|gambl\w*|payout|prize|cash|money|USD|IDR|Rp)\b|\$\s?\d/i.test(JSON.stringify(PR)));
  const TD=(()=>{const t=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');return JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1))})();
  const sk=v=>String(v).toLowerCase().replace(/&/g,'and').replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]+/g,'');const tidOf={};TD.teams.forEach(t=>{[t[1],t[2]].forEach(x=>{if(x)tidOf[sk(x)]=t[0]})});
  const rosters=PR.map(r=>r.schools.map(x=>tidOf[sk(x)]));ok('every school in the file is a known team',rosters.every(r=>r.length===8&&r.every(Boolean)));
  const names=PR.map(r=>[r.manager,r.team,'🏀']);
  const idM=await seed(null,{names,rosters,rounds:8});                       // names AND rosters match the file
  const idS=await seed(null,{names});                                         // same names, other rosters
  const r2=rosters.map(r=>r.slice());const spare=TD.teams.map(t=>t[0]).find(t=>!rosters.some(r=>r.includes(t)));r2[3][7]=spare;
  const idP=await seed(null,{names,rosters:r2,rounds:8});                    // one manager has one different school
  const idN=await seed();                                                      // real-league style names
  const id6=await seed(null,{managers:6,rounds:6});
  const idLive=await seed(null,{names,rosters,rounds:8,picksMade:20,live:true});   // draft not finished
  const open=async(P,id)=>{await P.go('recap.html?l='+id);await ready(P);await sleep(500)};
  const empty=async(P,id,label)=>{await open(P,id);const t=await P.page.$eval('#powerrank',e=>e.innerText);ok(label+': "Power rankings appear after the draft is analysed", no cards',/Power rankings appear after the draft is analysed/.test(t)&&!(await P.page.$('#powerrank .card.pr')),t.slice(0,120))};
  const generated=async(P,id,label)=>{await open(P,id);const o=await P.page.evaluate(()=>({n:document.querySelectorAll('#powerrank .card.pr').length,note:(document.getElementById('prnote')||{}).innerText||'',txt:document.getElementById('powerrank').innerText}));
    ok(label+': NEVER the example text: 8 cards generated from this league\'s own rosters (note says so), none of the hand-written example sentences shown',o.n===8&&/built from this league/.test(o.note)&&!PR.some(r=>o.txt.includes(r.short.slice(0,60))),o.note)};
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
    const P=await L.phone('pr'+w,desk?{desktop:true,w,h}:{});await patch(P);await open(P,idM);
    const o=await P.page.evaluate(()=>{const q=document.querySelector('#powerrank');const cards=[...q.querySelectorAll('.card.pr')];const small=[...q.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&(r.width<44||r.height<44)}).length;
      const ref=document.getElementById('hlcard')||document.getElementById('recaphead'),rr=ref.getBoundingClientRect(),c0=cards[0].getBoundingClientRect();
      return{n:cards.length,g:[...q.querySelectorAll('.pgr')].map(x=>x.innerText),exp:[...q.querySelectorAll('.plb')].map(b=>b.getAttribute('aria-expanded')),small,over:document.documentElement.scrollWidth>innerWidth+1,note:!!document.getElementById('prnote'),
        edges:[Math.round(c0.left-rr.left),Math.round(c0.right-rr.right)],txt:q.innerText}});
    ok(w+'px: matching league: 8 ranked cards, grades A+..D in file order, all collapsed, names without "Test ", test-league note shown (the shipped file is the test league), no overflow',o.n===8&&o.g.every((g,i)=>g===PR[i].grade)&&o.exp.every(x=>x==='false')&&o.note&&!/Test /.test(o.txt.replace(/Test league · example analysis/,''))&&!o.over,o);
    ok(w+'px: tap targets in the module are >= 44px',o.small===0,o);
    ok(w+'px: the module fills its container: cards have the same left and right edges as the recap cards',o.edges[0]===0&&o.edges[1]===0,o.edges);
    await P.page.focus('#prb0');await P.page.keyboard.press('Enter');await sleep(250);
    const s=await P.page.evaluate(()=>({e:document.getElementById('prb0').getAttribute('aria-expanded'),vis:!document.getElementById('prp0').hidden,txt:document.querySelector('#prp0 .plead').innerText,deepHidden:document.getElementById('prdp0').hidden}));
    ok(w+'px: Enter on the card opens the 4-sentence recap (aria-expanded=true), deep dive still closed',s.e==='true'&&s.vis&&sents(s.txt)===4&&s.deepHidden,s);
    await P.page.focus('#prd0');await P.page.keyboard.press('Space');await sleep(250);
    const d=await P.page.evaluate(()=>({e:document.getElementById('prd0').getAttribute('aria-expanded'),vis:!document.getElementById('prdp0').hidden,txt:[...document.querySelectorAll('#prdp0 p')].map(p=>p.innerText).join(' '),li:document.querySelectorAll('#prdp0 .sch li').length,small:[...document.querySelectorAll('#powerrank button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height<44}).length}));
    ok(w+'px: Space on Deep dive opens the 10-sentence recap and the school list; targets still >= 44px',d.e==='true'&&d.vis&&sents(d.txt)>=9&&sents(d.txt)<=11&&d.li===8&&d.small===0,{e:d.e,n:sents(d.txt),li:d.li,small:d.small,t:d.txt.slice(0,700)});
    await P.page.focus('#prb0');await P.page.keyboard.press('Enter');await sleep(200);ok(w+'px: Enter on the open card collapses it',(await P.page.$eval('#prb0',e=>e.getAttribute('aria-expanded')))==='false');
    await P.page.$eval('#powerrank',e=>e.scrollIntoView());await P.shot('s20-recap-power-'+w);
    ok(w+'px: no page errors',P.errs.length===0,P.errs);await P.page.close();
    const lab=await P0lab(w,desk,h,idM);ok(w+'px: accessible labels have no "Test " prefix',lab.length===8&&lab.every(x=>!/Test /.test(x)),lab);
    const Q=await L.phone('pn'+w,desk?{desktop:true,w,h}:{});await patch(Q);
    await generated(Q,idS,w+'px same names, different rosters');await generated(Q,idP,w+'px all names match but ONE manager has one different school');await generated(Q,idN,w+'px real-league names');await empty(Q,id6,w+'px a league without 8 managers');
    ok(w+'px: no horizontal overflow',!(await Q.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));
    await Q.page.close();
    const R=await L.phone('pl'+w,desk?{desktop:true,w,h}:{});await patch(R);await R.go('recap.html?l='+idLive);await R.page.waitForSelector('#recaphead');await sleep(700);
    ok(w+'px: draft not finished: no power rankings block at all',!(await R.page.$('#powerrank')));await R.page.close();
  }
  /* un-hooked recap page (what Draft Room ships today) is untouched */
  {const U0=await L.phone('pu',{});await U0.go('recap.html?l='+idM);await U0.page.waitForSelector('#recaphead');await sleep(1800);
   const o=await U0.page.evaluate(()=>({host:!!document.getElementById('powerrecap'),cards:document.querySelectorAll('#powerrecap #powerrank .card.pr').length,any:!!document.getElementById('powerrank')}));
   ok('the UNPATCHED real recap page (Draft Room wiring) uses the module for a spectator of a matching league: 8 cards inside #powerrecap, no page errors',o.host?(o.cards===8&&U0.errs.length===0):(!o.any&&U0.errs.length===0),{o,errs:U0.errs});await U0.page.close()}
  /* League site: no Power tab, #power falls back to Standings */
  const Lp=await L.phone('pl2',{desktop:true,w:1280,h:900});await Lp.go('league.html?l='+idM+'#power');await Lp.page.waitForSelector('#lapp[data-ready]');await sleep(500);
  const lt=await Lp.page.evaluate(()=>({tabs:[...document.querySelectorAll('#ltabs [data-a=tab]')].map(b=>b.dataset.v),on:(document.querySelector('#ltabs .on')||{}).dataset&&document.querySelector('#ltabs .on').dataset.v,pr:!!document.querySelector('.card.pr')}));
  ok('League site: no Power rankings tab; #power falls back to Standings',!lt.tabs.includes('power')&&lt.on==='standings'&&!lt.pr,lt);await Lp.page.close();
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
