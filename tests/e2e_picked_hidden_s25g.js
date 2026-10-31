/* s25-full: picked teams are fully removed from every available list (Teams list + its search, the Pick a team pop-up + its search, the queue view),
   in real and mock drafts; they still show on the board. A row removed above the viewport does not move what the user sees (390px).
   node tests/e2e_picked_hidden_s25g.js (APP/API env, mock store). Shots -> /workspace/draftroom-notes/s25-full/picked-hidden */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const APP=process.env.APP;const fs=require('fs'),path=require('path');
const OUT=process.env.PH_SHOTS||'/workspace/draftroom-notes/s25-full/picked-hidden';fs.mkdirSync(OUT,{recursive:true});
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const TS=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(TS.slice(TS.indexOf('{'),TS.lastIndexOf('}')+1));const NAME={};TD.teams.forEach(t=>NAME[t[0]]=t[1]);
const listed=(P,sel)=>P.page.evaluate(sel=>[...document.querySelectorAll(sel+' [data-k]')].map(r=>r.dataset.k),sel);
const typeQ=async(P,sel,v)=>{await P.page.$eval(sel,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},v);await sleep(500)};
(async()=>{try{
for(const mock of [false,true])for(const [w,h] of [[390,844],[1280,900]]){const tag=(mock?'mock':'real')+'_'+w;const opt=w>700?{desktop:true,w,h}:{w,h};
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:11,mock});const I=seed.info;const K=F.Keys(id);const meta=F.parseJ(await raw(K.meta));
 const taken=I.picks.map(p=>String(p.teamId));const slot=F.slotAt(meta.order,12,meta.settings.type,meta.settings.rounds);const owner=I.managers.find(m=>m.id===slot.owner);
 await post(K.pref(owner.id),{queue:[taken[0],taken[3]],auto:false,v:1});
 const P=await L.phone('ph'+tag,opt);await P.page.setBypassServiceWorker(true);await P.go('room.html?l='+id+'#as='+owner.id+'&k='+owner.k);await waitFor(()=>P.page.$('#tab_teams'),25000);await sleep(1500);
 await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await waitFor(()=>P.page.$('#tlist [data-k]'),10000);await sleep(500);
 let ls=await listed(P,'#tlist');ok(tag+' Teams list: none of the 11 picked teams is listed (no greyed or taken rows)',ls.length>0&&taken.every(t=>!ls.includes(t))&&!(await P.page.$('#tlist .trow.taken')),taken.filter(t=>ls.includes(t)));
 const qAdd=await P.page.evaluate(()=>[...document.querySelectorAll('#tlist [data-k] [data-a=q]')].slice(3,5).map(b=>b.dataset.t));/* back-to-back Q+ taps (regression: the second tap used to be lost) */await P.page.evaluate(ts=>ts.forEach(t=>document.querySelector('#tlist [data-k] [data-a=q][data-t="'+t+'"]').click()),qAdd);await sleep(3500);
 ok(tag+' Teams list: no "Hide drafted" toggle any more',!(await P.page.$('[data-a=thide]')));
 await P.page.screenshot({path:OUT+'/teams_'+tag+'.png'});
 const pn=NAME[taken[0]];await typeQ(P,'#tq',pn);ls=await listed(P,'#tlist');
 ok(tag+' Teams search: searching a picked team ("'+pn+'") finds nothing of it',!ls.includes(taken[0])&&!(await P.page.$('#tlist .trow.taken')),ls);await P.page.screenshot({path:OUT+'/teams_search_picked_'+tag+'.png'});await typeQ(P,'#tq','');
 /* Pick a team pop-up */
 await P.page.$eval('#pickbtn',e=>e.click());await waitFor(()=>P.page.$('#pickov [data-k],#pickov #tlistP [data-k]'),10000);await sleep(500);
 const psel=(await P.page.$('#pickov #plist'))?'#pickov #plist':'#pickov';ls=await listed(P,psel);
 ok(tag+' Pick a team pop-up: no picked team listed, queue section included',ls.length>0&&taken.every(t=>!ls.includes(t)),taken.filter(t=>ls.includes(t)));
 const pq=(await P.page.$('#pq'))?'#pq':'#tqP';await typeQ(P,pq,pn);ls=await listed(P,psel);ok(tag+' Pick a team search: the picked team is not found',!ls.includes(taken[0]),ls);
 await P.page.screenshot({path:OUT+'/pickpop_search_picked_'+tag+'.png'});await P.page.evaluate(()=>{const b=document.querySelector('[data-a=pclose]');if(b)b.click()});await sleep(300);await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await sleep(400);await typeQ(P,'#tq','');
 /* queue view */
 await P.page.evaluate(()=>document.querySelector('#tab_my').click());await sleep(800);const qv=await P.page.evaluate(()=>[...document.querySelectorAll('.qrow [data-a=q]')].map(b=>b.dataset.t));
 ok(tag+' queue view: the 2 queued teams that were picked are gone, the 2 still available stay',qv.length===2&&qAdd.every(t=>qv.includes(t))&&!qv.includes(taken[0])&&!qv.includes(taken[3]),{qv,qAdd});
 /* board still shows them */
 await P.page.evaluate(()=>document.querySelector('#tab_board').click());await sleep(800);const bt=await P.page.evaluate(()=>document.querySelector('.board')?document.querySelector('.board').innerText:'');
 ok(tag+' the board still shows picked teams',bt.length>0&&[0,5,10].some(i=>(t=>bt.includes(t[1])||bt.includes(t[2])||bt.includes(t[3]))(TD.teams.find(t=>t[0]===taken[i]))));
 /* scroll steadiness: a row above the viewport is removed by a pick on another device */
 if(w===390){await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await sleep(800);await sleep(800);await P.page.evaluate(()=>{document.scrollingElement.scrollTop=1500});await sleep(500);ok(tag+' scrolled partway down the Teams list',await P.page.evaluate(()=>document.scrollingElement.scrollTop>300));
  const before=await P.page.evaluate(()=>{const r=[...document.querySelectorAll('#tlist [data-k]')].find(r=>r.getBoundingClientRect().top>80);return{k:r.dataset.k,top:r.getBoundingClientRect().top,y:document.scrollingElement.scrollTop,first:document.querySelector('#tlist [data-k]').dataset.k}});
  const C=await L.phone('phc'+tag,opt);await C.page.evaluateOnNewDocument((id,cm)=>localStorage.setItem('fbn.cm.'+id,cm),id,I.cmSecret);await C.go('room.html?l='+id);await waitFor(()=>C.page.$('#tab_teams'),20000);await sleep(1200);
  await C.page.evaluate(()=>document.querySelector('#tab_teams').click());await sleep(800);await C.page.evaluate(k=>{const r=document.querySelector('#tlist [data-k="'+k+'"]');if(r)r.click()},before.first);await sleep(600);
  await C.page.evaluate(()=>{const b=document.querySelector('#confirmpick,[data-a=confirm]');if(b)b.click()});
  const gone=await waitFor(()=>P.page.evaluate(k=>!document.querySelector('#tlist [data-k="'+k+'"]'),before.first),20000);await sleep(400);
  const after=await P.page.evaluate(k=>{const r=document.querySelector('#tlist [data-k="'+k+'"]');return{top:r?r.getBoundingClientRect().top:null,y:document.scrollingElement.scrollTop}},before.k);
  ok(tag+' a pick removes the top row (above the viewport) live',!!gone);ok(tag+' what the user sees stays put (within 4 px) when that row disappears',after.top!=null&&Math.abs(after.top-before.top)<=4,{before,after});
  await P.page.screenshot({path:OUT+'/teams_after_remote_pick_'+tag+'.png'});await C.close()}
 ok(tag+' no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
