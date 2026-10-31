/* s25b recap layout (real + mock), coaching tips checked against the pick log, tab bars, 44px targets, word rules. Shots (full page) -> SHOTS. APP / API env. */
const L=require('./lib.js');const F=require('../js/core.js');const {seedRecap}=require('./recap_seed.js');const {sleep,API}=L;const fs=require('fs'),path=require('path');
const OUT=process.env.SHOTS||'/workspace/draftroom-notes/s25-setup';
const TD=(()=>{const t=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');return JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1))})();
const RANK=tid=>+((TD.meta||{})[tid]||{}).p||0;
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{try{
 const real=await seedRecap(null,{power:true});const rinfo=seedRecap.info;
 const mock=await seedRecap(null,{});const minfo=seedRecap.info;{const K=F.Keys(mock);const m=await gj(K.meta);m.mock=true;m.solo=true;m.over={};minfo.managers.forEach((x,i)=>{if(i!==5)m.over[x.id]={bot:true}});await post(K.meta,m)}
 /* the pick log, read straight from the store, for the coaching check */
 const logOf=async id=>{const K=F.Keys(id);const out=[];for(let i=1;i<=64;i++){const e=F.parseJ(await (await fetch(API+encodeURIComponent(K.pick(1,i)))).text());if(e&&e.tid)out.push({n:i,tid:String(e.tid),owner:e.mid||e.owner})}return out};
 const mlog=await logOf(mock);
 for(const [kind,id,info] of [['real',real,rinfo],['mock',mock,minfo]])for(const [w,h,d] of [[390,844,false],[1280,900,true]]){
  const me=info.managers[5];const P=await L.phone(kind+w,{w,h,desktop:d});await P.page.setBypassServiceWorker(true);
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,me);
  await P.go('recap.html?l='+id);await P.page.waitForSelector('#rc_mypicks',{timeout:20000}).catch(()=>{});await P.page.waitForSelector('#rcgrade',{timeout:15000}).catch(()=>{});await sleep(1200);
  const o=await P.page.evaluate(()=>{const ids=[...document.querySelectorAll('#app > section, #app > details, #app > footer')].map(e=>e.id);const vis=s=>{const e=document.querySelector(s);return !!(e&&!e.hidden&&e.offsetParent!==null)};
   const small=[...document.querySelectorAll('#app a.btn, #app button.btn, #rcnav a, .rchow summary, .rcextra>summary')].filter(e=>e.offsetParent!==null).map(e=>({t:e.innerText.trim().slice(0,20),h:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.h<44);
   const nav=document.getElementById('rcnav');
   return{ids,down:(document.getElementById('rcdown')||{}).innerText,gline:(document.getElementById('rcgline')||{}).innerText,how:!!document.querySelector('#rchow summary'),grade:vis('#rcgrade'),grades:vis('#rc_grades'),awards:!!document.getElementById('rc_awards'),deep:!!document.getElementById('rcdeepbtn'),
    picks:document.querySelectorAll('#mplist .mprow').length,quips:document.querySelectorAll('#mplist [data-quip]').length,again:!!document.getElementById('mockagain'),back:!!document.getElementById('mockback'),practice:!!document.getElementById('rcpractice'),
    coach:[...document.querySelectorAll('#cblist .cbline')].map(e=>({n:+e.dataset.n,mine:e.dataset.mine,alt:e.dataset.alt,r:+e.dataset.altrank,t:e.innerText})),take:(document.getElementById('rctake')||{}).innerText,tip:(document.getElementById('rctip')||{}).innerText,
    over:nav?nav.scrollWidth>nav.clientWidth:null,docOver:document.documentElement.scrollWidth>innerWidth,small,txt:document.body.innerText}});
  const pre=kind+' '+w+': ';
  ok(pre+'no "See my grade" button (s25-full: removed)',!o.down,o.down);
  ok(pre+'grade + one-line explanation (How grades work is the details at the bottom since s25-full)',o.grade&&/Graded on preseason power rank and projected seed, compared with the other 7 rosters/.test(o.gline||'')&&o.ids.includes('rc_foot'),o);
  ok(pre+'no separate My picks list (s25-full: a repeat of Your grade + Rosters)',o.picks===0,{p:o.picks,q:o.quips});
  if(kind==='real'){const want=['recaphead','rc_site','powerrecap_s','rc_grades','rc_awards','rc_foot'];ok(pre+'order (s25-full): card, What\'s next, grade, league grades, awards, How grades work',JSON.stringify(o.ids.slice(0,6))===JSON.stringify(want),o.ids);ok(pre+'league grades shown',o.grades);ok(pre+'no coaching tips on the real recap',o.coach.length===0&&!o.take)}
  else{ok(pre+'order: card, grade, picks, buttons; no league grades / awards / full analysis',JSON.stringify(o.ids.filter(x=>x!=='practicebn'))===JSON.stringify(['recaphead','rc_site','powerrecap_s','rc_foot'])&&!o.grades&&!o.awards&&!o.deep,o);
   ok(pre+'PRACTICE tag, Run another, Back to my league',o.practice&&o.again&&o.back);ok(pre+'coaching takeaway at the top',/^Main takeaway:/.test(o.take||''),o.take);
   /* every "better pick" claim is true on the board: my pick at #n is the team named, the other team was not taken before #n, and its rank is as stated and better */
   const bad1=o.coach.filter(c=>{const mp=mlog.find(x=>x.n===c.n);const taken=mlog.find(x=>x.tid===c.alt);return !mp||mp.tid!==c.mine||mp.owner!==me.id||(taken&&taken.n<c.n)||RANK(c.alt)!==c.r||!(c.r<(RANK(c.mine)||999))});
   ok(pre+o.coach.length+' "better pick" lines (2-3 expected when any exist), each checked against the pick log',o.coach.length<=3&&bad1.length===0,{coach:o.coach,bad:bad1});
   console.log('   coach:',o.take,'|',o.coach.map(c=>c.t).join(' || '),'|',o.tip||'')}
  ok(pre+'tab bar never scrolls sideways, page fits',o.over===false&&!o.docOver,o);ok(pre+'tap targets >= 44px',o.small.length===0,o.small);
  ok(pre+'word rules (no money / prize / payout / STOOPIDS)',!/\b(money|prize|payout|cash|wager|jackpot)\b|stoopid/i.test(o.txt));
  ok(pre+'no page errors',P.errs.length===0,P.errs);
  await P.page.evaluate(()=>scrollTo(0,0));await P.page.screenshot({path:OUT+'/s25b_'+w+'_recap_'+kind+'_full.png',fullPage:true});
  if(kind==='real'&&w===390){/* s25-full: How grades work is the #rc_foot details at the bottom */await P.page.$eval('#rc_foot summary',e=>e.click());await sleep(200);ok('How grades work opens the full text',await P.page.$eval('#rc_foot',e=>e.open&&/strength score/.test(e.innerText)));
   await P.page.goto(P.page.url().split('#')[0]+'#tab=rosters',{waitUntil:'domcontentloaded'});await sleep(2500);ok('old #tab=rosters link opens Full draft details and lands on Rosters',await P.page.evaluate(()=>document.getElementById('rcextra').open&&Math.abs(document.getElementById('rc_rosters').getBoundingClientRect().top)<120))}
  await P.close()}
}catch(e){bad++;console.log('CRASH',e)}await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)})();
