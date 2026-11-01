/* s28 item 1: 'Pick a team' sheet header has a live pick countdown next to Close; the header stays pinned while searching / scrolling at 390; 'Paused' when paused; hidden with no clock. Shots to SHOTDIR. APP/API env. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const SD=process.env.SHOTDIR||'/tmp';
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
async function open(id,m,w){const P=await L.phone('p'+w,w>700?{desktop:true,w,h:900}:{});await P.page.setBypassServiceWorker(true);await P.page.evaluateOnNewDocument((id,m)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:m.id,k:m.k}))},id,m);await P.go('room.html?l='+id+'&stay=1');await sleep(3500);return P}
const sheet=P=>P.page.evaluate(()=>{const ov=document.getElementById('pickov');if(!ov)return null;const h=ov.querySelector('.phead'),c=document.getElementById('pcd');const r=h.getBoundingClientRect();return{top:r.top,h:r.height,txt:h.innerText,pcd:c?c.textContent:null,hidden:c?c.hidden||getComputedStyle(c).display==='none':true,scroll:ov.scrollTop,cdv:(document.getElementById('cdv')||{}).firstChild?document.getElementById('cdv').firstChild.nodeValue:null}});
const openSheet=async P=>{await P.page.evaluate(()=>{const b=document.querySelector('[data-a=popen]');if(b)b.click()});await sleep(900)};
(async()=>{try{for(const w of [390,1280]){
 const id=await seed(API,{managers:8,rounds:8,live:true,clockSecs:90,picksMade:0});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);const me=I.managers.find(x=>x.id===m.order[0]);
 const P=await open(id,me,w);await openSheet(P);let s=await sheet(P);ok(w+': sheet open, header says Pick #1 · Round 1',!!s&&/Pick #1 · Round 1/.test(s.txt),s);
 ok(w+': clock in the header matches the board clock (±1 s)',s&&/^\d:\d\d$/.test(s.pcd)&&Math.abs(((a)=>{const[x,y]=a.split(':');return +x*60+ +y})(s.pcd)-((a)=>{const[x,y]=a.split(':');return +x*60+ +y})(s.cdv||s.pcd))<=1,s);
 const a1=s.pcd;await sleep(2100);s=await sheet(P);ok(w+': header clock ticks',s.pcd!==a1,{a1,b:s.pcd});
 await P.page.screenshot({path:SD+'/s28_picksheet_'+w+'.png'});
 if(w===390){await P.page.type('#tqP','state');await sleep(700);await P.page.evaluate(()=>{document.getElementById('pickov').scrollTop=400});await sleep(500);s=await sheet(P);ok('390 searching: header pinned at the top with the clock',s.top>=-1&&s.top<=2&&!s.hidden,s);await P.page.screenshot({path:SD+'/s28_picksheet_390_search.png'});
  await P.page.evaluate(()=>{const i=document.getElementById('tqP');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(600);
  await P.page.evaluate(()=>{document.getElementById('pickov').scrollTop=1800});await sleep(1300);s=await sheet(P);ok('390 scrolled: header pinned at the top with the live clock',s.scroll>500&&s.top>=-1&&s.top<=2&&/^\d:\d\d$/.test(s.pcd),s);
  const c0=s.pcd;await sleep(1500);s=await sheet(P);ok('390 scrolled: clock still ticking',s.pcd!==c0,{c0,c:s.pcd});await P.page.screenshot({path:SD+'/s28_picksheet_390_scrolled.png'})}
 /* paused */
 {const mm=await gj(K.meta);mm.paused=true;mm.pausedLeft=40000;await post(K.meta,mm);await sleep(4500);s=await sheet(P);
  ok(w+': paused: header shows Paused (or the sheet closes because picks are off)',!s||s.pcd==='Paused',s);if(s)await P.page.screenshot({path:SD+'/s28_picksheet_paused_'+w+'.png'})}
 ok(w+': no JS errors',!P.errs.length,P.errs);await P.close();
 /* no clock: hidden */
 {const id2=await seed(API,{managers:8,rounds:8,live:true,clockSecs:null,picksMade:0});const m2=await gj(F.Keys(id2).meta);const me2=seed.info.managers.find(x=>x.id===m2.order[0]);const Q=await open(id2,me2,w);await openSheet(Q);s=await sheet(Q);
  ok(w+': no clock: header clock hidden',!!s&&s.hidden,s);await Q.page.screenshot({path:SD+'/s28_picksheet_noclock_'+w+'.png'});ok(w+': no clock: no JS errors',!Q.errs.length,Q.errs);await Q.close()}}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
