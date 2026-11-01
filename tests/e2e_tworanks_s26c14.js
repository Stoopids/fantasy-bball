/* s26c14 two ranks (display only), mock store only (fbn.store=/api/data/), textdb.dev blocked by the runner.
   Teams tab at 390 and 1280: every row shows S (STOOPID rank, meta.p) and P (Power rank, meta.o); both sort pills; Power rank sorts both ways (tap again = reverse, unranked last);
   STOOPID rank sorts both ways too; legend + labels; Draft Rules section 10 'Rankings'. SHOTDIR saves Teams + Rules shots.
   APP=http://localhost:<app> API=http://localhost:<api>/api/data/ SHOTDIR=... node tests/e2e_tworanks_s26c14.js */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
const fs=require('fs'),path=require('path');global.window={};eval(fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8').replace('window.TEAMS_DATA','global.window.TEAMS_DATA'));const TD=global.window.TEAMS_DATA;
const SD=process.env.SHOTDIR||path.join(__dirname,'..','shots');const PFX=process.env.SHOTPFX||'';fs.mkdirSync(SD,{recursive:true});
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const click=(P,sel)=>P.page.evaluate(s=>{const b=document.querySelector(s);if(b){b.click();return true}return false},sel);
const rows=P=>P.page.evaluate(()=>[...document.querySelectorAll('#tlist .trow')].map(r=>({k:r.dataset.k,s:(r.querySelector('.rks')||{}).innerText,o:(r.querySelector('.rko')||{}).innerText})));
const num=s=>{const m=/#(\d+)/.exec(s||'');return m?+m[1]:null};
(async()=>{try{
 const id=await seed(API,{managers:8,rounds:8,live:true,clockSecs:null,picksMade:0,mock:true});const I=seed.info;const A0=I.managers[0];
 for(const [w,h,desk] of [[390,844,false],[1280,900,true],[320,700,false]]){
  const P=await L.phone('v'+w,{w,h,desktop:desk});await P.go('room.html?l='+id+'#as='+A0.id+'&k='+A0.k);await sleep(3500);
  await click(P,'#tab_teams');await sleep(1200);
  await click(P,'[data-a="tsort"][data-m="power"]');await sleep(500);if(/↓/.test(await P.page.evaluate(()=>(document.querySelector('#tsort [data-m="power"]')||{}).innerText))){await click(P,'[data-a="tsort"][data-m="power"]');await sleep(500)}
  let R=await rows(P);ok(w+': Teams lists every pool team ('+R.length+')',R.length===TD.teams.length,R.length);
  ok(w+': every row shows both ranks (S and P labels)',R.every(r=>/^S/.test(r.s||'')&&/^P/.test(r.o||'')),R.find(r=>!/^S/.test(r.s||'')||!/^P/.test(r.o||'')));
  ok(w+': P value equals meta.o on every row; none missing',R.every(r=>num(r.o)===TD.meta[r.k].o));
  ok(w+': missing STOOPID rank shows –',R.filter(r=>!TD.meta[r.k].p).every(r=>/–/.test(r.s))&&R.some(r=>!TD.meta[r.k].p));
  const sp=R.map(r=>num(r.s));const fu=sp.indexOf(null);ok(w+': STOOPID rank ascending, unranked last',sp.slice(0,fu).every((v,i,a)=>!i||a[i-1]<=v)&&sp.slice(fu).every(v=>v===null),sp.slice(0,10));
  const t=await P.page.evaluate(()=>({pills:[...document.querySelectorAll('#tsort [data-a="tsort"]')].map(b=>b.innerText),leg:(document.getElementById('tlegend')||{}).innerText,body:document.body.innerText,sx:document.documentElement.scrollWidth}));
  ok(w+': sort pills show STOOPID rank and Power rank',t.pills.some(x=>/^STOOPID rank/.test(x))&&t.pills.some(x=>/^Power rank/.test(x)),t.pills);
  ok(w+': legend names both ranks',/STOOPID rank/.test(t.leg)&&/Power rank/.test(t.leg)&&/KenPom 2026-27 preseason ratings/.test(t.leg),t.leg);
  ok(w+': no sideways scroll',t.sx<=w+1,t.sx);
  ok(w+': no odds/futures/betting words on the page',!/\b(odds|futures?|bet|betting|wager|sportsbook)\b/i.test(t.body));
  await click(P,'[data-a="tsort"][data-m="kenpom"]');await sleep(600);R=await rows(P);let o=R.map(r=>num(r.o));
  ok(w+': Power rank sort ascending 1..365',o.length===TD.teams.length&&o.every((v,i)=>v===i+1),o.slice(0,5));
  if(w!==320){await P.page.evaluate(()=>{const e=document.getElementById('tlegend');if(e)scrollTo(0,e.getBoundingClientRect().top+scrollY-(innerWidth<700?8:200))});await sleep(400);await P.page.screenshot({path:path.join(SD,PFX+'teams-'+w+'.png')});}
  await click(P,'[data-a="tsort"][data-m="kenpom"]');await sleep(600);R=await rows(P);o=R.map(r=>num(r.o));
  ok(w+': tap again: Power rank descending 365..1',o.every((v,i)=>v===TD.teams.length-i),o.slice(0,5));
  const pl=await P.page.evaluate(()=>(document.querySelector('#tsort [data-m="kenpom"]')||{}).innerText);ok(w+': reversed pill shows ↓',/↓/.test(pl),pl);
  await click(P,'[data-a="tsort"][data-m="power"]');await sleep(400);await click(P,'[data-a="tsort"][data-m="power"]');await sleep(600);R=await rows(P);const sd=R.map(r=>num(r.s));const fu2=sd.indexOf(null);
  ok(w+': STOOPID rank descending, unranked still last',fu2>0&&sd.slice(0,fu2).every((v,i,a)=>!i||a[i-1]>=v)&&sd.slice(fu2).every(v=>v===null),sd.slice(0,5));
  await click(P,'[data-a="tsort"][data-m="power"]');await sleep(300);
  if(w===390||w===1280){/* confirm sheet shows both */const k=R[0].k;
   await click(P,'#tab_rules');await sleep(800);const ru=await P.page.evaluate(()=>{const s=document.getElementById('r2_10');return s?s.innerText:''});
   ok(w+': Rules section 10 Rankings with the 3 points',/10\.\s*Rankings/.test(ru)&&/expected STOOPIDS points \(data from October 29, 2026\)/.test(ru)&&/the overall rank from KenPom 2026-27 preseason ratings, covering all 365 teams/.test(ru)&&/Auto-pick: queue first, then KenPom rank/.test(ru),ru);
   await P.page.evaluate(()=>{const s=document.getElementById('r2_10');if(s)s.scrollIntoView({block:'center'})});await sleep(400);await P.page.screenshot({path:path.join(SD,PFX+'rules-rankings-'+w+'.png')});
   await click(P,'[data-dr2="close"]');await sleep(400)}
  ok(w+': 0 JS errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
