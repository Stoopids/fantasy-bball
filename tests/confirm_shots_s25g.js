/* s25-full confirm-pick box shots + measurements: real + mock, 390 + 1280. OUT=<dir> TAG=before|after node tests/confirm_shots_s25g.js ; prints JSON measurements */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const OUT=process.env.OUT,TAG=process.env.TAG||'shot';
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const measure=P=>P.page.evaluate(()=>{const s=document.querySelector('#sheetwrap .sheet'),bg=document.querySelector('#sheetwrap .sheetbg');if(!s)return null;const r=s.getBoundingClientRect();const b=[...s.querySelectorAll('button')].map(x=>Math.round(x.getBoundingClientRect().height));const lg=s.querySelector('img,.chip');
 return{vw:innerWidth,vh:innerHeight,cx:Math.round(r.left+r.width/2),cy:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height),btn:b,bgc:bg?getComputedStyle(bg).backgroundColor:null,bgFull:bg?(()=>{const q=bg.getBoundingClientRect();return q.width>=innerWidth-1&&q.height>=innerHeight-1})():false,logo:lg?Math.round(lg.getBoundingClientRect().height):0,h2:Math.round(parseFloat(getComputedStyle(s.querySelector('h2')).fontSize))}});
(async()=>{require('fs').mkdirSync(OUT,{recursive:true});const res={};
for(const [w,h] of [[390,844],[1280,800]]){const opt=w>700?{desktop:true,w,h}:{w,h};
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:3});const I=seed.info;const meta=F.parseJ(await raw(F.Keys(id).meta));
 const slot=F.slotAt(meta.order,4,meta.settings.type,meta.settings.rounds);const owner=I.managers.find(m=>m.id===slot.owner);
 const P=await L.phone('cf'+w,opt);await P.go('room.html?l='+id+'#as='+owner.id+'&k='+owner.k);await waitFor(()=>P.page.$('#pickbtn'),25000);await sleep(1200);
 await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await waitFor(()=>P.page.$('#tlist .trow.go'),10000);await P.page.$eval('#tlist .trow.go .tm',e=>e.click());await waitFor(()=>P.page.$('#confirmpick'),6000);await sleep(500);
 await P.page.screenshot({path:`${OUT}/${TAG}_real_${w}.png`});res['real_'+w]=await measure(P);await P.close();
 const M=await L.phone('cfm'+w,opt);await M.go('mock.html');await sleep(2500);await M.page.evaluate(()=>{const b=document.querySelector('#solo,[data-a=solo],#startsolo,button.pri');if(b)b.click()});
 await waitFor(()=>/room\.html/.test(M.page.url()),20000);await waitFor(()=>M.page.$('#tab_teams'),20000);await sleep(1000);await M.page.evaluate(()=>{const b=document.querySelector('#startmock,[data-a=startmock],[data-a=mockstart]');if(b)b.click()});
 const go=await waitFor(async()=>{await M.page.evaluate(()=>{const t=document.querySelector('#tab_teams');if(t&&!t.classList.contains('on'))t.click()});return M.page.$('#tlist .trow.go')},90000);
 if(go){await M.page.$eval('#tlist .trow.go .tm',e=>e.click());await waitFor(()=>M.page.$('#confirmpick'),6000);await sleep(500)}
 await M.page.screenshot({path:`${OUT}/${TAG}_mock_${w}.png`});res['mock_'+w]=go?await measure(M):{err:'never on the clock',url:M.page.url()};await M.close()}
console.log(JSON.stringify(res));process.exit(0)})().catch(e=>{console.log(e.stack);process.exit(1)});
