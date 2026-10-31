/* index.html (home) and help.html must show ALL their content (QA finding H1: the banner class .hero with aspect-ratio + overflow:hidden clipped everything but the title).
   Checks at 390 and 1280: the wrapper is not clipped, "Create a league", the code form, the help link and the "How it works" card are fully visible and tappable (>= 44 px),
   every help section is inside the page and visible, no sideways scroll, no page errors. Mock store only (the pages need no league).
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_landing.js   (APP / API env) */
const L=require('./lib.js');const {sleep}=L;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const vis=sel=>`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return {missing:true};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();const w=document.querySelector('.landing');const wr=w.getBoundingClientRect();
  const top=document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,r.left+Math.min(r.width/2,40))),Math.min(innerHeight-1,Math.max(0,r.top+Math.min(r.height/2,10))));
  return {h:Math.round(r.height),w:Math.round(r.width),inside:r.top>=wr.top-1&&r.bottom<=wr.bottom+1&&r.left>=wr.left-1&&r.right<=wr.right+1,hit:!!top&&(e===top||e.contains(top)),disp:getComputedStyle(e).display}})()`;
(async()=>{try{
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
    for(const pg of ['index.html','help.html']){
      const P=await L.phone('ld'+w,desk?{desktop:true,w,h}:{});await P.page.setBypassServiceWorker(true);await P.go(pg);await P.page.waitForSelector('.landing',{timeout:15000});await sleep(500);
      const wrap=await P.page.evaluate(()=>{const e=document.querySelector('.landing');const cs=getComputedStyle(e);return{id:e.id,ar:cs.aspectRatio,ov:cs.overflow,h:Math.round(e.getBoundingClientRect().height),sh:e.scrollHeight,doc:document.documentElement.scrollHeight,over:document.documentElement.scrollWidth>innerWidth+1,hero:!!document.querySelector('.hero')}});
      ok(w+'px '+pg+': wrapper has its own class (.landing), no banner aspect-ratio, not clipped (height = content height)',wrap.ar==='auto'&&!wrap.hero&&wrap.h>=wrap.sh-1&&wrap.h>400,wrap);
      ok(w+'px '+pg+': the page scrolls to its full content (document height covers the wrapper) and has no sideways scroll',wrap.doc>=wrap.h&&!wrap.over,wrap);
      if(pg==='index.html'){
        for(const [sel,label,min] of [['#create','"Create a league" button',44],['#codeform button','Join button',44],['#helplink','help link',44]]){const v=await P.page.evaluate(vis(sel));ok(w+'px index: '+label+' is visible, inside the page, tappable (>= '+min+' px) and not covered',!v.missing&&v.inside&&v.hit&&v.h>=min&&v.disp!=='none',v)}
        const t=await P.page.evaluate(()=>({create:(document.getElementById('create')||{}).innerText,card:[...document.querySelectorAll('.landing .card')].map(c=>c.innerText.slice(0,40)),howIn:(()=>{const c=[...document.querySelectorAll('.landing .card')].find(x=>/How it works/.test(x.innerText));if(!c)return null;c.scrollIntoView({block:'center'});const r=c.getBoundingClientRect(),wr=document.querySelector('.landing').getBoundingClientRect();return r.height>30&&r.bottom<=wr.bottom+1&&r.right<=wr.right+1})()}));
        ok(w+'px index: the button reads "Create a league" and the "How it works" card is fully visible',t.create==='Create a league'&&t.howIn===true,t)}
      else{
        const secs=await P.page.evaluate(()=>['helpjump','commissioner','managers','after','limits'].map(id=>{const e=document.getElementById(id);if(!e)return{id,missing:true};e.scrollIntoView({block:'start'});const r=e.getBoundingClientRect(),wr=document.querySelector('.landing').getBoundingClientRect();return{id,h:Math.round(r.height),inside:r.bottom<=wr.bottom+1&&r.right<=wr.right+1,shown:getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'}}));
        ok(w+'px help: the jump chips and the Commissioner, Managers, After the draft and Known limits cards are all present, visible and inside the page',secs.every(s=>!s.missing&&s.h>20&&s.inside&&s.shown),secs);
        const hb=await P.page.evaluate(()=>{const a=document.getElementById('helphome');return a?a.getBoundingClientRect().height:0});ok(w+'px help: the link back home is >= 44 px',hb>=43.5,hb)}
      ok(w+'px '+pg+': no page errors',P.errs.length===0,P.errs);await P.page.close()}}
  console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
