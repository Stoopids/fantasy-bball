/* s25-full (Paul via NCAA): no tab jumps while scrolling. At 390 and 1280px, in a real draft (every manager on Auto-pick, so picks land about once a second)
   and in a solo mock (bots pick every 1-2 s), for every tab and inside the Pick a team pop-up: scroll halfway, let 3+ picks re-render, and
   scrollY moves at most 2 px when nothing was added above (100 px otherwise); mock.html and recap.html too.  node tests/e2e_scroll_all_tabs.js (APP/API env, mock store only) */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const pickNo=P=>P.page.evaluate(()=>{const m=(document.getElementById('banner')||{innerText:''}).innerText.match(/Pick #(\d+)/);return m?+m[1]:0});
async function soak(P,tag,tabs){for(const t of tabs){
  await P.page.evaluate(t=>{const b=document.querySelector('#tab_'+t);if(b)b.click()},t);await sleep(900);
  await P.page.evaluate(()=>window.scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)/2)));await sleep(300);
  const short=await P.page.evaluate(()=>document.documentElement.scrollHeight-innerHeight<100);/* a page that barely scrolls: the browser clamps scrollY when its height changes, which is not a jump */
  const p0=await pickNo(P),y0=await P.page.evaluate(()=>{/* what the user sees: the element in the middle of the screen; its on-screen top must stay put (a removed row above is compensated by moving scrollY, which is fine) */let el=null;for(const fx of [.5,.3,.7,.2,.8,.4,.6])for(const fy of [.5,.45,.55,.4,.6]){const e=document.elementFromPoint(innerWidth*fx,innerHeight*fy);if(e&&e.closest('[data-k]')&&!el)el=e}if(!el)el=document.elementFromPoint(innerWidth/2,innerHeight/2);const r=el&&((el.closest('[data-k]')||el.closest('.card,tr,.msg'))||el);window.__anc=r;window.__ancK=r&&r.dataset?r.dataset.k||null:null;window.__ancTag=r?(r.tagName+'.'+r.className+'#'+(r.dataset.k||'')).slice(0,60):'';window.__ancTop=r?r.getBoundingClientRect().top:0;window.__ancDoc=r?r.getBoundingClientRect().top+scrollY:0;window.__y0=scrollY;window.__above=false;return scrollY});let maxd=0,maxy=0,sync=0;const t0=Date.now();
  while(Date.now()-t0<20000){await sleep(150);if(++sync%6===0)await P.page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('online'));document.dispatchEvent(new Event('visibilitychange'))})/* force a sync re-render */;
   const y=await P.page.evaluate(()=>{/* find the anchor by its team key: rows are morphed in place, so the old node may now show another team */const a=window.__ancK?(document.querySelector('[data-k="'+CSS.escape(window.__ancK)+'"]')||window.__anc):window.__anc;if(!a||!a.isConnected||Math.abs(a.getBoundingClientRect().top+scrollY-window.__ancDoc)>1)window.__above=true;return{d:a&&a.isConnected?Math.abs(a.getBoundingClientRect().top-window.__ancTop):Math.abs(scrollY-window.__y0),sy:Math.abs(scrollY-window.__y0)}});maxd=Math.max(maxd,y.d);maxy=Math.max(maxy,y.sy);if((await pickNo(P))-p0>=3&&Date.now()-t0>3000)break}
  const p1=await pickNo(P);const above=await P.page.evaluate(()=>window.__above);const tol=above?100:2;const follow=t==='chat'&&await P.page.evaluate(y0=>document.documentElement.scrollHeight-y0-innerHeight<160,y0);
  ok(tag+' '+t+' tab: scrolled to '+y0+', '+(p1-p0)+' picks + sync re-renders, scrollY moved at most '+tol+' px ('+(short?'short page, at most 100 px of scroll; clamped by the browser':follow?'chat follows new messages at the bottom (by design)':above?'rows removed above, scrollY compensates; what is on screen':'nothing added above')+'; max '+Math.round(maxy)+', on-screen '+Math.round(maxd)+')',(follow||(short?maxy<=100:above?maxd<=100:maxy<=2))&&(p1-p0>=2||p0===0),{y0,maxd,maxy,above,p0,p1,anc:await P.page.evaluate(()=>window.__ancTag)})}}
async function staticSoak(P,tag){await P.page.evaluate(()=>window.scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)/2)));await sleep(400);const y0=await P.page.evaluate(()=>scrollY);let m=0;for(let i=0;i<30;i++){await sleep(200);if(i%5===0)await P.page.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))});m=Math.max(m,Math.abs(await P.page.evaluate(()=>scrollY)-y0))}
  ok(tag+': scrolled to '+y0+', scrollY unchanged within 2 px for 6 s (max '+m+')',m<=2,{y0,m})}
const tsrc=require('fs').readFileSync(require('path').join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));
async function landPick(id){/* another device makes the next pick (written straight to the mock store) */const K=F.Keys(id);const g=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());const m=await g(K.meta);const ep=m.epoch||1;let prev='',n=1,taken={};for(;;n++){const e=await g(K.pick(ep,n));if(!e||!e.tid)break;taken[String(e.tid)]=1;prev=e.id}
  const sl=F.slotAt(m.order,n,m.settings.type,m.settings.rounds);const tid=Object.keys(TD.meta).filter(t=>+TD.meta[t].p>0&&!taken[t]).sort((a,b)=>TD.meta[b].p-TD.meta[a].p)[0];await post(K.pick(ep,n),F.makeEntry(n,sl.owner,tid,{now:Date.now(),epoch:ep,writer:'test',by:'owner',prev}))}
async function popSoak(P,tag,id){
  const sc=()=>P.page.evaluate(()=>{const o=document.getElementById('pickov');if(!o)return null;const b=o.querySelector('.pbox');const e=b&&b.scrollHeight>b.clientHeight+10?b:o;return{which:e===o?'ov':'pbox',top:e.scrollTop,max:e.scrollHeight-e.clientHeight}});
  const openPop=async()=>{for(let tr=0;tr<5;tr++){try{const has=await P.page.$('#pickbtn');if(!has){await sleep(400);continue}await P.page.$eval('#pickbtn',e=>e.click());if(await P.page.waitForSelector('#pickov .trow',{timeout:2000}).catch(()=>null))break}catch(e){}await sleep(400)}
    await P.page.evaluate(()=>{const o=document.getElementById('pickov');if(!o)return;const b=o.querySelector('.pbox');const e=b&&b.scrollHeight>b.clientHeight+10?b:o;e.scrollTop=Math.round((e.scrollHeight-e.clientHeight)/2)});await sleep(300)};
  await openPop();
  const nStore=async()=>{if(!id)return pickNo(P);const K=F.Keys(id);let n=0;for(let i=1;i<=64;i++){const t=await (await fetch(API+encodeURIComponent(K.pick(1,i)))).text();const e=F.parseEntry(t);if(!e)break;n=i}return n};/* count picks in the store: the page under the pop-up may not repaint its banner */
  let reopen=0;let a=await sc();const p0=await nStore();let maxd=0;const t0=Date.now();let landed=0;while(Date.now()-t0<40000){await sleep(150);if(id&&landed<3&&Date.now()-t0>landed*2500+1500){landed++;await landPick(id)}let b=await sc();if(!b){/* the pop-up closes itself when the turn it was opened for is made (by design); reopen it, re-centre, and measure the next stretch */reopen++;await openPop();a=await sc();continue}if(!a){a=await sc();continue}maxd=Math.max(maxd,Math.abs(b.top-a.top));if((await nStore())-p0>=3&&Date.now()-t0>3000)break}
  const p1=await nStore();ok(tag+' Pick a team pop-up list: '+(p1-p0)+' picks landed, list moved at most 100 px (max '+maxd+', reopened '+reopen+')',!!a&&a.max>200&&maxd<=100&&p1-p0>=2,{a,maxd,p0,p1,reopen});
  await P.page.evaluate(()=>{const b=document.querySelector('[data-a=pclose]');if(b)b.click()});await sleep(300)}
async function focusSoak(P,tag){/* s25-full: opening a dialog (Pick a team, Who are you?) or the reaction picker must not move the page: every focus() uses preventScroll */
  const Y=()=>P.page.evaluate(()=>Math.round(scrollY));const mid=()=>P.page.evaluate(()=>{scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)/2))});
  const tab=t=>P.page.evaluate(t=>{const b=document.getElementById('tab_'+t);if(b)b.click()},t);
  await tab('teams');await sleep(600);await mid();await sleep(300);let y0=await Y();
  if(await P.page.$('#pickbtn')){await P.page.$eval('#pickbtn',e=>e.click());await P.page.waitForSelector('#pickov',{timeout:3000}).catch(()=>{});await sleep(300);const y1=await Y();
    await P.page.evaluate(()=>{const b=document.querySelector('[data-a=pclose]');if(b)b.click()});await sleep(300);const y2=await Y();
    ok(tag+' Pick a team dialog open/close keeps scrollY ('+y0+' -> '+y1+' -> '+y2+')',y0>0&&Math.abs(y1-y0)<=2&&Math.abs(y2-y0)<=2,{y0,y1,y2})}
  await tab('more');await sleep(600);await mid();await sleep(300);y0=await Y();
  if(await P.page.$('[data-a=switch]')){await P.page.$eval('[data-a=switch]',e=>e.click());await P.page.waitForSelector('#overlay .ov',{timeout:3000}).catch(()=>{});await sleep(300);const y1=await Y();
    await P.page.evaluate(()=>{const b=document.querySelector('[data-a=idclose]');if(b)b.click()});await sleep(300);const y2=await Y();
    ok(tag+' "Who are you?" dialog open/close keeps scrollY ('+y0+' -> '+y1+' -> '+y2+')',y0>0&&Math.abs(y1-y0)<=2&&Math.abs(y2-y0)<=2,{y0,y1,y2})}
  /* reaction picker (js/shared-s25.js, League chat rows): mounted on this page so it is measured the same way */
  await P.page.addScriptTag({url:'js/shared-s25.js'}).catch(()=>{});
  const y=await P.page.evaluate(async()=>{if(!window.S25||!S25.renderReactions)return null;const pad=document.createElement('div');pad.style.height='1500px';document.body.appendChild(pad);const host=document.createElement('div');host.id='rxhost';document.body.appendChild(host);const pad2=document.createElement('div');pad2.style.height='1500px';document.body.appendChild(pad2);
    S25.renderReactions(host,{'🔥':['A']},[],()=>{});const r=host.getBoundingClientRect();scrollBy(0,r.top-innerHeight/2);await new Promise(r=>setTimeout(r,200));const y0=Math.round(scrollY);const a=host.querySelector('.s25add');if(!a)return{y0,none:1};a.click();await new Promise(r=>setTimeout(r,300));
    const open=!!host.querySelector('[data-s25-pk]');const y1=Math.round(scrollY);document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await new Promise(r=>setTimeout(r,200));return{y0,y1,y2:Math.round(scrollY),open,foc:document.activeElement&&document.activeElement.className}});
  ok(tag+' reaction picker open/Escape keeps scrollY',!!y&&!y.none&&y.open&&Math.abs(y.y1-y.y0)<=2&&Math.abs(y.y2-y.y0)<=2,y)}
(async()=>{try{
 for(const [w,h,d] of [[390,844,false],[1280,800,true]]){const sz=' '+w;
 const id=await seed(API,{managers:8,rounds:8,live:true,clockSecs:null,picksMade:2});const I=seed.info;const K=F.Keys(id);
 for(const m of I.managers)await post(K.pref(m.id),{queue:[],auto:true,v:1});
 const me=I.managers[0];const P=await L.phone('sat'+w,{w,h,desktop:d});await P.page.evaluateOnNewDocument((id,cm)=>localStorage.setItem('fbn.cm.'+id,cm),id,I.cmSecret);
 await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.$('#tabs'),25000);await sleep(1500);
 const D=await L.phone('satd'+w,{w:390,h:844});await D.go('room.html?l='+id+'#as='+I.managers[1].id+'&k='+I.managers[1].k);await sleep(1500);/* a second open room keeps auto-pick running while this page has the pop-up open */
 await focusSoak(P,'real'+sz);await popSoak(P,'real'+sz,id);ok('real'+sz+' (pop-up league): no page errors',P.errs.length===0,P.errs);await P.close();await D.close();
 /* s25-full fix: the tab soak gets its own fresh league; with every manager on Auto-pick the pop-up league can finish its 64 picks before the last tab (the room then leaves for the recap) */
 {const id2=await seed(API,{managers:8,rounds:8,live:true,clockSecs:null,picksMade:2});const I2=seed.info;const K2=F.Keys(id2);for(const m of I2.managers)await post(K2.pref(m.id),{queue:[],auto:true,v:1});
  const P2=await L.phone('sat2'+w,{w,h,desktop:d});await P2.page.evaluateOnNewDocument((id,cm)=>localStorage.setItem('fbn.cm.'+id,cm),id2,I2.cmSecret);await P2.go('room.html?l='+id2+'#as='+I2.managers[0].id+'&k='+I2.managers[0].k);await waitFor(()=>P2.page.$('#tabs'),25000);await sleep(1500);
  const D2=await L.phone('satd2'+w,{w:390,h:844});await D2.go('room.html?l='+id2+'#as='+I2.managers[1].id+'&k='+I2.managers[1].k);await sleep(1500);
  await soak(P2,'real'+sz,['teams','board','my','chat','more']);ok('real'+sz+': no page errors',P2.errs.length===0,P2.errs);await P2.close();await D2.close()}
 const M=await L.phone('satm'+w,{w,h,desktop:d});await M.go('mock.html');await M.page.waitForSelector('#startmock',{timeout:15000});await staticSoak(M,'mock.html setup'+sz);await M.page.evaluate(()=>window.scrollTo(0,0));await M.page.click('#startmock');
 await waitFor(()=>/room\.html/.test(M.page.url()),20000);await waitFor(()=>M.page.$('#tab_my'),25000);await sleep(1500);
 await waitFor(()=>M.page.$('#autotog'),30000);await M.page.evaluate(()=>{const c=document.getElementById('autotog');if(c&&!c.checked)c.click()});await sleep(1500);
 await soak(M,'mock'+sz,['teams','board','my','chat','more']);ok('mock'+sz+': no page errors',M.errs.length===0,M.errs);
 const ml=new URL(M.page.url()).searchParams.get('l');await M.go('recap.html?l='+ml);await sleep(3000);await staticSoak(M,'recap.html'+sz);await M.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
