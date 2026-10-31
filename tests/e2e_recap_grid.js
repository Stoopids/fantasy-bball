/* SS s25: recap roster chips form an equal 2-column grid (Rosters side by side + grade picks), real and mock recaps, 320 / 390 / 1280. Mock store only.
   needs: node tools/mock_textdb.js <port> "$PWD" <port+1>   APP=http://localhost:<port> API=http://localhost:<port+1>/api/data/ node tests/e2e_recap_grid.js   (SHOTS=dir/prefix for screenshots, NOASSERT=1 for before shots) */
const L=require('./lib.js');const {seedRecap}=require('./recap_seed.js');const F=require('../js/core.js');const {sleep}=L;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const API=L.API;
async function mkMock(id){const k=API+encodeURIComponent(F.Keys(id).meta);const m=JSON.parse(await (await fetch(k)).text());m.mock=true;await fetch(k,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(m)})}
(async()=>{try{
  const idP=await seedRecap(null,{power:true});const me=seedRecap.info.managers[5];
  const idM=await seedRecap(null,{});const meM=seedRecap.info.managers[0];await mkMock(idM);
  for(const [kind,id,who] of [['real',idP,me],['mock',idM,meM]])for(const [w,h] of [[320,800],[390,844],[1280,900]]){
    const Q=await L.phone('g'+kind+w,w>=900?{desktop:true,w,h}:{w,h});await Q.page.setBypassServiceWorker(true);
    await Q.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,who);
    await Q.go('recap.html?l='+id);await Q.page.waitForSelector('#rc_foot',{timeout:25000});await sleep(1200);
    await Q.page.evaluate(()=>document.querySelectorAll('#rc_grades details').forEach(d=>d.open=true));await sleep(200);
    if(process.env.SHOTS&&kind==='real'){const r=await Q.page.$('#rc_rosters');await r.scrollIntoView();await sleep(300);await r.screenshot({path:process.env.SHOTS+'-'+w+'.png'})}
    if(process.env.NOASSERT){await Q.page.close();continue}
    const o=await Q.page.evaluate(()=>{const C=[...document.querySelectorAll('#rc_rosters .rost, #rc_grades .grpicks')].filter(c=>c.children.length);
      return{n:C.length,mock:/Practice|mock/i.test(document.body.innerText),cards:C.map(c=>{const K=[...c.children].map(x=>x.getBoundingClientRect());const cs=getComputedStyle(c);const ch=[...c.querySelectorAll('.chip')];const im=[...c.querySelectorAll('.chip img,.chip .nologo')].map(i=>i.getBoundingClientRect());
        return{id:c.closest('[data-mid],details,section').getAttribute('data-mid')||c.className,k:K.length,cols:cs.gridTemplateColumns.split(' ').length,ws:K.map(r=>r.width),hs:K.map(r=>r.height),lefts:[...new Set(K.map(r=>Math.round(r.left)))].length,
          chipH:ch.map(x=>x.getBoundingClientRect().height),imW:im.map(r=>r.width),imH:im.map(r=>r.height),nowrap:ch.every(x=>getComputedStyle(x).whiteSpace==='nowrap'&&getComputedStyle(x).textOverflow==='ellipsis'),
          links:[...c.children].every(a=>a.matches('a.tlink')&&/^https:\/\/www\.espn\.com\/mens-college-basketball\/team\/_\/id\/\d+$/.test(a.href)),over:c.scrollWidth>c.clientWidth||c.closest('.card').scrollWidth>c.closest('.card').clientWidth}}),
        doc:document.documentElement.scrollWidth>document.documentElement.clientWidth}});
    const sp=a=>a.length?Math.max(...a)-Math.min(...a):0;const T=kind+' '+w+'px: ';
    ok(T+'roster chip cards found (8 rosters + grade picks)',o.n>=8,o.n);if(kind==='mock')ok(T+'is a mock recap',o.mock);
    ok(T+'every card: exactly 2 columns, 2 distinct column lefts',o.cards.every(c=>c.cols===2&&c.lefts===2),o.cards.map(c=>[c.cols,c.lefts]));
    ok(T+'every chip in a card: same width and height within 1px',o.cards.every(c=>sp(c.ws)<=1&&sp(c.hs)<=1&&sp(c.chipH)<=1),o.cards.map(c=>[sp(c.ws),sp(c.hs)]));
    ok(T+'8 teams per roster -> 4 rows',o.cards.filter(c=>c.k===8).every(c=>Math.round(c.hs[0])===44));
    ok(T+'logos all the same size',o.cards.every(c=>sp(c.imW)<=0.5&&sp(c.imH)<=0.5));
    ok(T+'names one line with ellipsis',o.cards.every(c=>c.nowrap));
    ok(T+'chips still ESPN links',o.cards.every(c=>c.links));
    ok(T+'no overflow (card + document)',o.cards.every(c=>!c.over)&&!o.doc,{doc:o.doc,c:o.cards.filter(c=>c.over).map(c=>c.id)});
    ok(T+'no page errors',Q.errs.length===0,Q.errs);await Q.page.close()}
  console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
