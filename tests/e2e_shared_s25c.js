/* s25c shared file (js/shared-s25.js = partner's shared-s25-league.js, unchanged): md5 + word scan; renderReactions on bet cards (used emojis only, counts, 😀+ picker,
   read-only for watchers, same {k:'rx'} log); pickPlaced after the CONFIRMED save only (swish follows mute, confetti skipped under reduced motion, "Bet's in! 🏀");
   upset tagline on local 2-day slots. node tests/e2e_shared_s25c.js (APP / API env; SHOTS=dir) */
const L=require('./lib.js');const F=require('../js/core.js');const fs=require('fs'),path=require('path'),crypto=require('crypto');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');
const SH=process.env.SHOTS||'';let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}}
const src=fs.readFileSync(path.join(root,'js/shared-s25.js'));
ok('js/shared-s25.js is the s25d partner file b8c38b44 + QA focus({preventScroll:true}) at line 247 (md5 8bdd1fd8d7928c3c7e085de801925234)',crypto.createHash('md5').update(src).digest('hex')==='8bdd1fd8d7928c3c7e085de801925234');
{const hits=[];String(src).split('\n').forEach((l,i)=>{const m=l.match(/\b(wager|money|cash|prize|payout|jackpot|lottery|gamble|IDR|STOOPIDS|bets?|odds)\b|\$\s?\d/gi);if(m)hits.push((i+1)+': '+m.join(','))});
  console.log('  word scan of js/shared-s25.js: '+(hits.length?hits.join(' | '):'clean'));ok('word scan of the s25d file: 0 hits',hits.length===0,hits)}
/* ---- upset tagline (local 2-day slots), Node: the page's own tagline code + the shared file ---- */
{require('../js/league-d.js');globalThis.window=globalThis;globalThis.S25=require('../js/shared-s25.js');const hs=fs.readFileSync(path.join(root,'js/leaguehome.js'),'utf8');
  const code=hs.slice(hs.indexOf('const TAGLINES='),hs.indexOf('/* ---------- freshness line'));const T=new Function('DEMO',code+';return{tagFor,setU:u=>{UPSET=u}}')(false);
  const PH="Eight managers. One season. Let's play.";const ms=[];for(let d=0;d<16;d++)ms.push(new Date(2026,10,1+d,12).getTime());
  const base=ms.map(m=>T.tagFor(m));T.setU({winner:'Akron',loser:'Duke',ws:70,ls:66});const up=ms.map(m=>T.tagFor(m));
  ok('no upset: always the placeholder line',base.every(x=>x===PH),base);
  ok('with an upset: Nov 7-8 (local slot 3) show an upset line naming Akron / Duke, other days the placeholder',up.filter((x,i)=>i===6||i===7).every(x=>/Akron|Duke/.test(x))&&up.filter((x,i)=>i!==6&&i!==7&&i<14).every(x=>x===PH),up);
  const e1=T.tagFor(new Date(2026,10,8,23,59).getTime()),e2=T.tagFor(new Date(2026,10,9,0,1).getTime());ok('the upset slot ends at LOCAL midnight (Nov 8 23:59 upset, Nov 9 00:01 placeholder)',/Akron|Duke/.test(e1)&&e2===PH,[e1,e2]);
  console.log('  upset line sample: '+up[6]);delete globalThis.window}
const base=process.env.API||'http://localhost:8471/api/data/';const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const get=async k=>{const t=await (await fetch(base+encodeURIComponent(k))).text();try{return JSON.parse(t)}catch(e){return null}};
async function open(id,info,i,o){o=o||{};const P=await L.phone('s'+Math.random().toString(36).slice(2,6),{desktop:(o.w||390)>=760,w:o.w||390,h:o.h||900});
  if(o.rm)await P.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  if(i!=null)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[i].id,k:info.managers[i].k});
  if(o.mute)await P.page.evaluateOnNewDocument(()=>localStorage.setItem('fbn.x.sndmute','1'));
  await P.page.evaluateOnNewDocument(()=>{window.__fx=[];window.__msgs=[];document.addEventListener('DOMContentLoaded',()=>{const w=()=>{if(window.S25&&S25.pickPlaced&&!S25.__w){const f=S25.pickPlaced;S25.__w=1;S25.pickPlaced=function(c,o){const m=(document.getElementById('b27Msg')||{}).innerText||'';const r=f.call(this,c,o);window.__fx.push({at:Date.now(),msg:m,r,card:c&&c.getAttribute('data-bet')});return r}}};w();setTimeout(w,50);
    new MutationObserver(()=>{const m=document.getElementById('b27Msg');const t=m?m.innerText.split('\n')[0]:'';if(t&&window.__msgs[window.__msgs.length-1]!==t)window.__msgs.push(t);const b=document.querySelector('.s25-badge');if(b&&!window.__badge)window.__badge=b.textContent}).observe(document.body,{childList:true,subtree:true,characterData:true})})});
  await P.page.setRequestInterception(true);P.hook=null;P.page.on('request',r=>{const u=r.url();if(/espn/.test(u))return r.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"events":[]}'});if(P.hook&&P.hook(r))return;r.continue().catch(()=>{})});
  await P.go('league.html?l='+id+(o.q||'')+'#bets');await P.page.waitForSelector('#b27Head',{timeout:25000});await P.page.waitForFunction('!/Connecting/.test(document.getElementById("b27Top").innerText)',{timeout:20000});await sleep(500);return P}
const tap=async(P,sel)=>{await P.page.waitForSelector(sel,{timeout:8000});await P.page.evaluate(s=>{const e=document.querySelector(s);e.scrollIntoView({block:'center'});e.click()},sel);await sleep(200)};
const msg=(P,re,t)=>P.page.waitForFunction('new RegExp('+JSON.stringify(re)+').test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:t||15000});
const fill=async(P,mid,text)=>{await P.page.evaluate(()=>scrollTo(0,0));await tap(P,'[data-lb=oppclear]');await tap(P,'[data-lb=opp][data-mid="'+mid+'"]');await P.page.$eval('#b27Text',e=>{e.value=''});await P.page.type('#b27Text',text);await tap(P,'[data-lb=amt][data-v="10"]');await tap(P,'#b27Place')};
const row=(P,bid)=>P.page.evaluate(b=>{const el=document.querySelector('[data-bet="'+b+'"] [data-rxm]');return{chips:[...el.querySelectorAll('.s25rx')].map(x=>({e:x.dataset.s25Rx,n:x.querySelector('.n').textContent,p:x.getAttribute('aria-pressed'),dis:x.disabled})),add:!!el.querySelector('.s25add'),pk:[...el.querySelectorAll('.s25pk button')].map(x=>x.dataset.s25Pick)}},bid);
(async()=>{try{
  const id=await seed();const info=seed.info;const M=info.managers.map(m=>m.id);const K=i=>F.Keys(id).base+'-bets-'+M[i];const T0=Date.now()-3600e3;
  await post(K(0),{v:1,ev:[{k:'p',u:'sx000001',ts:T0,v:25,id:'sxbet00001',to:M[1],amt:10,a:1,b:1,text:'Duke beats UNC'},{k:'rx',u:'sx000002',ts:T0+1000,v:25,id:'sxbet00001',e:'👍',on:true}]});
  await post(K(1),{v:1,ev:[{k:'rx',u:'sx000003',ts:T0+2000,v:25,id:'sxbet00001',e:'🔥',on:true},{k:'rx',u:'sx000004',ts:T0+3000,v:25,id:'sxbet00001',e:'👍',on:true}]});
  /* ---- reactions ---- */
  let A=await open(id,info,0);let r=await row(A,'sxbet00001');
  ok('only used emojis shown, with counts; mine pressed; 😀+ shown',JSON.stringify(r.chips.map(c=>c.e+c.n+c.p))===JSON.stringify(['👍2true','🔥1false'])&&r.add,r);
  await tap(A,'[data-bet=sxbet00001] .s25add');r=await row(A,'sxbet00001');ok('😀+ opens the picker with 👍 👎 🤪 🔥 😂 🍆',r.pk.join('')==='👍👎🤪🔥😂🍆',r.pk);
  if(SH){await A.page.evaluate(()=>document.querySelector('[data-bet=sxbet00001]').scrollIntoView({block:'center'}));await A.page.screenshot({path:path.join(SH,'s25_reactions_390.png')})}
  await tap(A,'[data-bet=sxbet00001] [data-s25-pick="😂"]');await sleep(1600);r=await row(A,'sxbet00001');let lg=await get(K(0));
  ok('pick 😂: chip appears (1, mine) and the log gets {k:"rx",e:"😂",on:true,v:25}',r.chips.some(c=>c.e==='😂'&&c.n==='1'&&c.p==='true')&&lg.ev.some(e=>e.k==='rx'&&e.e==='😂'&&e.on===true&&e.v===25),r);
  await tap(A,'[data-bet=sxbet00001] [data-s25-rx="😂"]');await sleep(1600);r=await row(A,'sxbet00001');lg=await get(K(0));
  ok('tap my 😂 chip again: removed (on:false logged), chip gone',!r.chips.some(c=>c.e==='😂')&&lg.ev.filter(e=>e.e==='😂').pop().on===false,r);await A.close();
  const Wt=await open(id,info,null,{q:'&watch=1'});r=await row(Wt,'sxbet00001');ok('watcher: chips read-only (disabled), no 😀+',r.chips.length===2&&r.chips.every(c=>c.dis)&&!r.add,r);await Wt.close();
  if(SH){const D=await open(id,info,0,{w:1280});await tap(D,'[data-bet=sxbet00001] .s25add');await D.page.evaluate(()=>document.querySelector('[data-bet=sxbet00001]').scrollIntoView({block:'center'}));await D.page.screenshot({path:path.join(SH,'s25_reactions_1280.png')});await D.close()}
  {const P=await open(id,info,0,{w:320});await tap(P,'[data-bet=sxbet00001] .s25add');const o=await P.page.evaluate(()=>{const p=document.querySelector('.s25pk').getBoundingClientRect();return{l:p.left,r:p.right,sw:document.documentElement.scrollWidth}});const tt=await P.page.evaluate(()=>[...document.querySelectorAll('[data-bet=sxbet00001] .s25rx,[data-bet=sxbet00001] .s25add,.s25pk button')].map(b=>Math.round(Math.min(b.getBoundingClientRect().width,b.getBoundingClientRect().height))));ok('320px: reaction chips, 😀+ and picker buttons >= 44px',tt.length>=8&&tt.every(x=>x>=44),tt);ok('320px: picker stays on screen, no overflow',o.l>=0&&o.r<=320&&o.sw<=320,o);await P.close()}
  /* ---- placed effect ---- */
  A=await open(id,info,0);await fill(A,M[2],'Kentucky beats Louisville');await A.page.evaluate(()=>{window.__fx=[];window.__badge=null});await A.page.click('[data-lb=confirm]');await msg(A,'Placed');await sleep(150);
  let fx=await A.page.evaluate(()=>({fx:window.__fx,badge:window.__badge,msgs:window.__msgs}));
  ok('pickPlaced fires once, after the confirmed save ("Placed!" already shown), with confetti and the flash "Bet\'s in! 🏀"',fx.fx.length===1&&/Placed!/.test(fx.fx[0].msg)&&fx.fx[0].r.confetti&&fx.fx[0].r.badge&&fx.badge==="Bet's in! 🏀",fx);
  console.log('  swish (not muted, after a real click): '+JSON.stringify(fx.fx[0]&&fx.fx[0].r));
  if(SH){await A.page.evaluate(()=>{window.__fx=[]});await fill(A,M[3],'Duke beats Kansas');await A.page.click('[data-lb=confirm]');await msg(A,'Placed');await A.page.evaluate(()=>{const l=document.querySelector('.s25-fxlayer');if(l)window.scrollTo(0,l.getBoundingClientRect().top+scrollY-200)});await sleep(300);await A.page.screenshot({path:path.join(SH,'s25_placed_390.png')})}
  /* error: every write lost -> no effect */
  const kA=encodeURIComponent(K(0));A.hook=q=>{if(q.method()==='POST'&&q.url().includes(kA)){q.respond({status:200,contentType:'text/plain',body:'ok'});return true}return false};
  await sleep(1700);await A.page.evaluate(()=>{window.__fx=[]});await fill(A,M[2],'Never lands here');await A.page.click('[data-lb=confirm]');await msg(A,'Couldn’t save',30000);await sleep(300);
  ok('save error: no effect at all',(await A.page.evaluate(()=>window.__fx.length))===0);A.hook=null;await A.close();
  {const P=await open(id,info,0,{rm:true,mute:true});await fill(P,M[4],'Texas beats Baylor');await P.page.click('[data-lb=confirm]');await msg(P,'Placed');await sleep(150);const f=await P.page.evaluate(()=>window.__fx);
    ok('reduced motion + muted: no confetti, no sound, the flash still shows',f.length===1&&!f[0].r.confetti&&!f[0].r.sound&&f[0].r.badge,f);await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
