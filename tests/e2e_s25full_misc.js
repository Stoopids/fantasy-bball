/* s25-full (Paul via NCAA) small items: confirm box is a centred modal (backdrop, buttons >= 48px); autoNote only in the commissioner tools;
   Teams legend exact text; no star feature anywhere; clock-out wording: setup has no "Wait for them", new leagues show the read-only line,
   legacy autoPick:false leagues show a one-way switch with the note. 390 + 1280. Mock store only. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const LEG='# = power rank · record = last season';const CLK='When the clock runs out, we pick for you: top of your queue, otherwise the best team left. It only covers that one pick.';
(async()=>{try{
 for(const [w,h,d] of [[390,844,false],[1280,800,true]]){const pre=w+'px: ';
  const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:120,picksMade:3});const I=seed.info;const K=F.Keys(id);const meta=await gj(K.meta);
  const ow=I.managers.find(m=>m.id===F.slotAt(meta.order,4,meta.settings.type,meta.settings.rounds).owner);
  const P=await L.phone('mi'+w,{w,h,desktop:d});await P.go('room.html?l='+id+'#as='+ow.id+'&k='+ow.k);await waitFor(()=>P.page.$('#pickbtn'),25000);await sleep(1000);
  ok(pre+'non-commissioner never sees #autonote',!(await P.page.$('#autonote')));
  await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await waitFor(()=>P.page.$('#tlist .trow.go'),10000);
  const lg=await P.page.evaluate(()=>{const e=document.getElementById('tlegend');return e?e.textContent.trim():null});ok(pre+'Teams legend is exactly "'+LEG+'"',lg===LEG||(lg&&lg.indexOf(LEG)===0),lg);
  const st=await P.page.evaluate(()=>({els:document.querySelectorAll('.wstar,[data-a=twatch],[data-a=star],.star').length,txt:/\bStarred?\b|\bstars?\b/.test(document.body.innerText)}));ok(pre+'Teams tab: no star buttons and no "Starred" text',st.els===0&&!st.txt,st);
  await P.page.$eval('#tlist .trow.go .tm',e=>e.click());await waitFor(()=>P.page.$('#confirmpick'),6000);await sleep(400);
  const cm=await P.page.evaluate(()=>{const bg=document.querySelector('#sheetwrap .sheetbg');const sh=document.querySelector('#sheetwrap .sheet')||document.getElementById('confirmpick').closest('div[class*=sheet],div[role=dialog]');const r=sh.getBoundingClientRect();const bs=[...sh.querySelectorAll('button')].map(b=>Math.round(b.getBoundingClientRect().height));const c=bg?getComputedStyle(bg).backgroundColor:'';return{bg:!!bg&&bg.classList.contains('cmodal'),c,cx:Math.round(r.left+r.width/2-innerWidth/2),cy:Math.round(r.top+r.height/2-innerHeight/2),bs}});
  ok(pre+'confirm box: dimmed backdrop present',cm.bg&&/rgba\(.*,\s*0?\.\d+\)|rgba\(0, 0, 0/.test(cm.c),cm);ok(pre+'confirm box centred (within 4px horizontally, 40px vertically)',Math.abs(cm.cx)<=4&&Math.abs(cm.cy)<=40,cm);ok(pre+'confirm buttons at least 48px tall',cm.bs.length>=2&&cm.bs.every(x=>x>=48),cm.bs);
  await P.page.evaluate(()=>{const b=document.querySelector('[data-a=sheetbg]');if(b)b.click()});await sleep(300);
  for(const t of ['my','more']){await P.page.evaluate(t=>document.querySelector('#tab_'+t).click(),t);await sleep(800);const s2=await P.page.evaluate(()=>({els:document.querySelectorAll('.wstar,[data-a=twatch],.star').length,txt:/\bStarred?\b/.test(document.body.innerText)}));ok(pre+t+' tab: no star feature',s2.els===0&&!s2.txt,s2)}
  ok(pre+'manager page: no page errors',P.errs.length===0,P.errs);await P.close();
  /* commissioner: autonote in the tools; new league shows read-only clock line */
  const C=await L.phone('mic'+w,{w,h,desktop:d});await C.go('room.html?l='+id+'#cm='+I.cmSecret);await waitFor(()=>C.page.$('#tabs'),25000);await sleep(1500);await C.page.evaluate(()=>document.querySelector('#tab_more').click());await sleep(1200);
  const an=await C.page.evaluate(()=>{const a=document.getElementById('autonote');return{has:!!a,inTools:!!(a&&a.closest('#unlockedcard')),inBanner:!!(a&&a.closest('#banner'))}});ok(pre+'commissioner sees #autonote inside the commissioner tools, not in the banner',an.has&&an.inTools&&!an.inBanner,an);
  await C.page.evaluate(()=>{const b=document.querySelector('[data-a=settings]');if(b)b.click()});await waitFor(()=>C.page.$('#w15'),6000);
  const ro=await C.page.evaluate(()=>({ro:(document.getElementById('atimero')||{}).textContent||'',sw:!!document.getElementById('atime'),wait:/Wait for them/i.test(document.body.innerText)}));ok(pre+'settings (new league): read-only clock-out line, no switch, no "Wait for them"',ro.ro.trim()===CLK&&!ro.sw&&!ro.wait,ro);
  ok(pre+'commissioner page: no page errors',C.errs.length===0,C.errs);await C.close()}
 /* legacy league with autoPick:false */
 {const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:120,picksMade:3});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);m.settings.autoPick=false;await post(K.meta,m);
  const C=await L.phone('mil',{w:390,h:844});await C.go('room.html?l='+id+'#cm='+I.cmSecret);await waitFor(()=>C.page.$('#tabs'),25000);await sleep(1500);await C.page.evaluate(()=>document.querySelector('#tab_more').click());await sleep(1000);
  await C.page.evaluate(()=>{const b=document.querySelector('[data-a=settings]');if(b)b.click()});await waitFor(()=>C.page.$('#w15'),6000);
  const lg=await C.page.evaluate(()=>({ro:((document.getElementById('atimero')||{}).textContent||'').trim(),sw:!!document.getElementById('atime'),note:(document.getElementById('atimenote')||{}).textContent||'',wait:/Wait for them/i.test(document.body.innerText)}));
  ok('legacy autoPick:false league (k): the same read-only always-pick line, no switch, no legacy note, no "Wait for them"',!lg.sw&&!lg.note&&!lg.wait&&lg.ro===CLK,lg);ok('legacy page: no page errors',C.errs.length===0,C.errs);await C.close()}
 /* setup wizard */
 {const S=await L.phone('mis',{w:390,h:844});await S.go('setup.html');await sleep(2000);const html=await S.page.content();ok('setup.html: no "Wait for them" anywhere',!/Wait for them/i.test(html));ok('setup: the clock-out text is shipped',require('fs').readFileSync(require('path').join(__dirname,'../js/setup.js'),'utf8').indexOf(CLK)>=0);await S.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
