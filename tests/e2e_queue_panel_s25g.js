/* s25-full (Paul via NCAA): Auto-pick for me sits right under the On the clock card; the queue shows beside the Teams list (side panel at 1280,
   collapsible "My queue (N)" bar at 390, collapsed by default); Q+ updates it at once (two quick taps both land); up / down / remove work (44 px);
   help text exact. Real + mock. OUT/TAG for shots; SHOTS_ONLY=1 skips checks. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const OUT=process.env.OUT,TAG=process.env.TAG||'shot',CHECK=!process.env.SHOTS_ONLY;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const HELP="Time runs out? We pick for you: your queue first, then best available.";
async function run(P,tag,w){await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await waitFor(()=>P.page.$('#tlist [data-a=q]'),15000);await sleep(800);
 if(OUT)await P.page.screenshot({path:`${OUT}/${TAG}_${tag}_${w}${w<700?'_collapsed':''}.png`});
 if(CHECK){const tog=await P.page.evaluate(()=>{const c=document.getElementById('oncard')||document.querySelector('#banner .banner');const t=document.getElementById('autotogwrap');if(!c||!t)return{c:!!c,t:!!t};const a=c.getBoundingClientRect(),b=t.getBoundingClientRect();return{gap:Math.round(b.top-a.bottom),h:Math.round(b.height)}});
  ok(tag+' '+w+'px: Auto-pick for me is a compact switch right under the On the clock card',tog.gap!=null&&tog.gap>=0&&tog.gap<=24&&tog.h<=56,tog)}
 /* two quick Q+ taps */
 const ts=await P.page.evaluate(()=>[...document.querySelectorAll('#tlist [data-k] [data-a=q]')].slice(30,32).map(b=>b.dataset.t));
 await P.page.evaluate(ts=>ts.forEach(t=>document.querySelector('#tlist [data-a=q][data-t="'+t+'"]').click()),ts);
 if(w<700){await P.page.evaluate(()=>{const b=document.getElementById('qbar');if(b&&b.getAttribute('aria-expanded')!=='true')b.click()});await sleep(300)}
 const cnt=await waitFor(()=>P.page.evaluate(()=>{const r=document.querySelectorAll('#qpanel .qrow').length;return r>=2?r:0}),4000);
 if(OUT)await P.page.screenshot({path:`${OUT}/${TAG}_${tag}_${w}${w<700?'_expanded':''}.png`});
 if(!CHECK)return;
 const q=await P.page.evaluate(()=>({n:document.querySelectorAll('#qpanel .qrow').length,lbl:(document.getElementById('qbar')||document.querySelector('#qpanel h3')||{}).textContent||'',order:[...document.querySelectorAll('#qpanel .qrow')].map(r=>r.dataset.t),
   help:(document.getElementById('qhelp')||{}).textContent||'',old:/and the league auto-picks/.test(document.body.innerText),btn:[...document.querySelectorAll('#qpanel .qrow button')].map(b=>Math.round(Math.min(b.getBoundingClientRect().width,b.getBoundingClientRect().height))),
   side:(()=>{const p=document.getElementById('qpanel'),l=document.getElementById('tlist');if(!p||!l)return null;const a=p.getBoundingClientRect(),b=l.getBoundingClientRect();return{beside:a.left>=b.right-2||a.right<=b.left+2,above:a.bottom<=b.top+2}})()}));
 ok(tag+' '+w+'px: two quick Q+ taps both land in the queue panel at once ('+q.n+')',cnt>=2&&ts.every(t=>q.order.includes(t))&&/\(2\)|2/.test(q.lbl),q);
 ok(tag+' '+w+'px: '+(w>700?'side panel beside the Teams list':'"My queue (N)" bar above the list'),q.side&&(w>700?q.side.beside:q.side.above),q.side);
 ok(tag+' '+w+'px: help text exact, old "(and the league auto-picks)" line gone',q.help.trim()===HELP&&!q.old,q.help);
 ok(tag+' '+w+'px: reorder / remove buttons are >= 44 px',q.btn.length>=4&&q.btn.every(x=>x>=44),q.btn);
 await P.page.evaluate(t=>{const b=document.querySelector('#qpanel .qrow[data-t="'+t+'"] [data-a=qm][data-d="1"]');if(b)b.click()},q.order[0]);
 const o2=await waitFor(async()=>{const o=await P.page.evaluate(()=>[...document.querySelectorAll('#qpanel .qrow')].map(r=>r.dataset.t));return o[1]===q.order[0]?o:null},5000);ok(tag+' '+w+'px: down moves a team one place',!!o2,o2);
 await P.page.evaluate(t=>{const b=document.querySelector('#qpanel .qrow[data-t="'+t+'"] [data-a=qrm]');if(b)b.click()},q.order[0]);
 const o3=await waitFor(async()=>{const o=await P.page.evaluate(()=>[...document.querySelectorAll('#qpanel .qrow')].map(r=>r.dataset.t));return !o.includes(q.order[0])?o:null},5000);ok(tag+' '+w+'px: remove takes it out of the queue',!!o3,o3);
 const star=await P.page.evaluate(()=>!!document.querySelector('#qpanel .wstar'));ok(tag+' '+w+'px: the star stays separate (not in the queue panel)',!star)}
(async()=>{try{if(OUT)require('fs').mkdirSync(OUT,{recursive:true});
 for(const [w,h] of [[390,844],[1280,800]]){const opt=w>700?{desktop:true,w,h}:{w,h};
  const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:3});const I=seed.info;const meta=F.parseJ(await raw(F.Keys(id).meta));
  const sl=F.slotAt(meta.order,6,meta.settings.type,meta.settings.rounds);const me=I.managers.find(m=>m.id===sl.owner);
  const P=await L.phone('qp'+w,opt);await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.$('#oncard'),25000);await sleep(1200);await run(P,'real',w);if(CHECK)ok('real '+w+': no page errors',P.errs.length===0,P.errs);await P.close();
  const M=await L.phone('qpm'+w,opt);await M.go('mock.html');await sleep(2500);await M.page.evaluate(()=>{const b=document.querySelector('#solo,[data-a=solo],#startsolo,button.pri');if(b)b.click()});
  await waitFor(()=>/room\.html/.test(M.page.url()),20000);await waitFor(()=>M.page.$('#oncard'),40000);await sleep(1500);await run(M,'mock',w);await M.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
