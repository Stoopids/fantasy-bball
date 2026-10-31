/* s25-full recap (Paul via NCAA): compact hero, grade card above the fold, What's next as ONE row at the top, no See ... buttons, no Draft room
   button, no "Practice only", full recap inline below the grades, How grades work at the bottom with the exact text, build + Reload as the last
   small print, no overflow at 320 (the roster grid is Stoopids Site's). Mock store only. */
const L=require('./lib.js');const F=require('../js/core.js');const {seedRecap}=require('./recap_seed.js');const {sleep,API}=L;
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const HOW="Each team gets a grade from A+ to D based on how its 8 schools rank against the other rosters. A school's score comes from its preseason power rank and projected tournament seed. It's a rough preseason guide, not a prediction.";
(async()=>{try{
 const real=await seedRecap(null,{power:true});const rinfo=seedRecap.info;
 const mock=await seedRecap(null,{});const minfo=seedRecap.info;{const K=F.Keys(mock);const m=await gj(K.meta);m.mock=true;m.solo=true;m.over={};minfo.managers.forEach((x,i)=>{if(i!==5)m.over[x.id]={bot:true}});await post(K.meta,m)}
 for(const [kind,id,info] of [['real',real,rinfo],['mock',mock,minfo]])for(const [w,h,d] of [[320,700,false],[390,844,false],[1280,800,true]]){
  const pre=kind+' '+w+'px: ';const me=info.managers[5];const P=await L.phone('rc'+kind+w,{w,h,desktop:d});await P.page.setBypassServiceWorker(true);
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,me);
  await P.go('recap.html?l='+id);await P.page.waitForSelector('#rcgrade',{timeout:20000}).catch(()=>{});await sleep(2500);
  const r=await P.page.evaluate(()=>{const $=s=>document.querySelector(s);const T=document.getElementById('app').innerText;const pos=e=>e?Math.round(e.getBoundingClientRect().top+scrollY):null;
   const site=$('#rc_site');const sb=site?[...site.querySelectorAll('a,button')].filter(b=>b.offsetParent).map(b=>({t:b.innerText.trim(),top:Math.round(b.getBoundingClientRect().top)})):[];
   const foot=$('#rc_foot');const ex=$('#rcextra');const gr=$('#rc_grades');const hero=$('#recaphead');const h1=hero&&hero.querySelector('h1,h2,.rctitle');
   const all=[...document.querySelectorAll('#app *')].filter(e=>e.offsetParent&&e.children.length===0&&e.innerText&&e.innerText.trim());const last=all.slice(-3).map(e=>e.innerText.trim()).join(' | ');
   const ros=$('section#rc_rosters');let rg=null;if(ros){const r0=ros.querySelector('.rost');const bs=r0?[...r0.children].filter(e=>e.offsetParent):[];const ws=bs.map(e=>Math.round(e.getBoundingClientRect().width));const hs=bs.map(e=>Math.round(e.getBoundingClientRect().height));const ls=new Set(bs.map(e=>Math.round(e.getBoundingClientRect().left)));rg={n:bs.length,ws:[Math.min(...ws),Math.max(...ws)],hs:[Math.min(...hs),Math.max(...hs)],cols:ls.size}}
   return{T,sb,siteTop:pos(site),gradesTop:pos(gr),exTop:pos(ex),footTop:pos(foot),footTxt:foot?foot.textContent:'',footTag:foot?foot.tagName:'',gradeTop:Math.round(($('#rcgrade')||{getBoundingClientRect:()=>({top:9e9})}).getBoundingClientRect().top),vh:innerHeight,
    heroH:hero?Math.round(hero.getBoundingClientRect().height):0,tfs:h1?parseFloat(getComputedStyle(h1).fontSize):0,last,sw:document.documentElement.scrollWidth,iw:innerWidth,rg,exBtn:ex?[...ex.querySelectorAll('summary:not(.rdh),button.rcjump,[data-a=rcmore]')].length:0/* round headers (collapsible rounds) are allowed */}});
  ok(pre+'no "See how you scored", "See my grade", "See all league grades" or "See full draft recap"',!/See (how you scored|my grade|all league grades|full draft recap)/.test(r.T));
  ok(pre+'no Draft room button and no "Practice only" line',!r.sb.some(b=>/^Draft room/.test(b.t))&&!/Practice only/.test(r.T),r.sb);
  const want=kind==='mock'?['Run another','Back to my league','Share my grade']:['Back to my league','Share my grade'];
  ok(pre+"What's next is ONE row: "+want.join(' / '),r.sb.length===want.length&&want.every((t,i)=>r.sb[i].t.indexOf(t)===0)&&new Set(r.sb.map(b=>b.top)).size===1,r.sb);
  ok(pre+'grade card above the fold',r.gradeTop<r.vh,{g:r.gradeTop,vh:r.vh});
  ok(pre+'hero title 20-22px',r.tfs>=20&&r.tfs<=22,r.tfs);
  ok(pre+"How grades work is a details at the bottom with the exact text",r.footTag==='DETAILS'&&r.footTxt.replace(/\s+/g,' ').indexOf(HOW)>=0,r.footTxt.slice(0,300));
  ok(pre+'build number and Reload latest are the last small print',/Reload/.test(r.last)&&r.T.slice(-400).includes(require('fs').readFileSync(require('path').join(__dirname,'../js/version.js'),'utf8').match(/FBN_BUILD='([^']+)'/)[1]),r.last);
  if(kind==='real'){ok(pre+"order: What's next, then grades, then the full recap inline (no buttons), then How grades work",r.siteTop<r.gradesTop&&r.gradesTop<r.exTop&&r.exTop<r.footTop&&r.exBtn===0,[r.siteTop,r.gradesTop,r.exTop,r.footTop,r.exBtn]);}/* roster grid: owned by Stoopids Site (css/recap-rosters.css), tested there */
  else ok(pre+"order: What's next above How grades work",r.siteTop<r.footTop,[r.siteTop,r.footTop]);
  ok(pre+'no sideways overflow',r.sw<=r.iw,[r.sw,r.iw]);ok(pre+'no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
