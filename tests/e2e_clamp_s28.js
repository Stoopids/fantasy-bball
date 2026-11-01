/* s28 item 3: after a reload during the 10 s re-pick hold (auto-pick undone), the hold countdown and the pick clock never show more than their length (was 11 for one tick).
   The device clock is skewed 1.6 s behind the server (Date.now patched before load) so the pre-offset first render is the worst case. Every text of #autohold / #cdv is recorded from the first paint. APP/API env. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const SKEW=+(process.env.SKEW||-1600);
const REC=(skew)=>{const dn=Date.now.bind(Date);Date.now=()=>dn()+skew;window.__txt=[];const rec=()=>{const a=document.getElementById('autohold'),c=document.getElementById('cdv');if(a)window.__txt.push('H:'+a.textContent);if(c&&c.firstChild)window.__txt.push('C:'+c.firstChild.nodeValue)};
  document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(rec).observe(document.body,{childList:true,characterData:true,subtree:true})})};
(async()=>{try{for(const w of [390,1280]){
 /* A: hold after Undo of an away seat's auto-pick, 120 s clock (with No clock the s28 item 5 freeze replaces the hold) */
 {const id=await seed(API,{managers:8,rounds:4,live:true,clockSecs:120,picksMade:0});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);const away=I.managers.find(x=>x.id===m.order[0]);m.over[away.id]={away:true};await post(K.meta,m);
  const P0=await L.phone('d'+w,{});await P0.page.setBypassServiceWorker(true);await P0.go('room.html?l='+id+'&stay=1');
  let e=null;for(let t=0;t<40&&!e;t++){await sleep(500);e=await gj(K.pick(m.epoch,1))}await P0.close();ok(w+' hold: auto-pick landed',!!(e&&e.tid));
  const mm=await gj(K.meta);mm.voided=(mm.voided||[]).concat([e.id]);mm.resumeAt=Date.now();await post(K.meta,mm);/* = Undo by the commissioner, right now */
  const P=await L.phone('h'+w,w>700?{desktop:true,w,h:900}:{});await P.page.setBypassServiceWorker(true);await P.page.evaluateOnNewDocument(REC,SKEW);await P.go('room.html?l='+id+'&stay=1');await sleep(4000);
  await P.page.reload({waitUntil:'domcontentloaded'});await sleep(3000);
  const tx=await P.page.evaluate(()=>window.__txt);const ns=tx.filter(x=>x[0]==='H').map(x=>+((x.match(/(\d+)s/)||[])[1]||0));
  ok(w+' hold: countdown seen after the reload',ns.length>0,tx.slice(0,8));ok(w+' hold: never above 10 s (first render included)',ns.every(x=>x<=10),tx.filter(x=>x[0]==='H').slice(0,6));
  ok(w+' hold: no JS errors',!P.errs.length,P.errs);await P.close()}
 /* B: pick clock 30 s, fresh turn, device behind the server */
 {const id=await seed(API,{managers:8,rounds:4,live:true,clockSecs:30,picksMade:0});const K=F.Keys(id);const m=await gj(K.meta);m.resumeAt=Date.now();await post(K.meta,m);
  const P=await L.phone('c'+w,w>700?{desktop:true,w,h:900}:{});await P.page.setBypassServiceWorker(true);await P.page.evaluateOnNewDocument(REC,SKEW);await P.go('room.html?l='+id+'&stay=1');await sleep(3000);
  const tx=await P.page.evaluate(()=>window.__txt);const cs=tx.filter(x=>x[0]==='C'&&/\d:\d\d/.test(x)).map(x=>{const [a,b]=x.slice(2).split(':');return +a*60+ +b});
  ok(w+' clock: shown',cs.length>0,tx.slice(0,6));ok(w+' clock: never above 0:30 on the first render',cs.every(x=>x<=30),tx.slice(0,6));ok(w+' clock: no JS errors',!P.errs.length,P.errs);await P.close()}}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
