/* s28 item 2: seat sound pattern. AudioContext stubbed; every oscillator start is logged with the clock text shown at that moment.
   3 at turn start, 2 at 30 s, 1 per second 10..3, rapid (4/s) in the last 2 s; mute; own seat only; none when paused, after picking, with no clock;
   each second at most once, no burst after a reload, a fresh page or a blocked (background-like) tab. Mock store only. APP/API env. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const STUB=()=>{window.__osc=0;window.__ev=[];class A{constructor(){this.state='running';this.currentTime=0;this.destination={}}resume(){return Promise.resolve()}createGain(){return{gain:{value:0},connect(){}}}createOscillator(){return{type:'',frequency:{value:0},connect(){},start(t){window.__osc++;const e=document.getElementById('cdv');window.__ev.push({w:Date.now(),t:t||0,c:e&&e.firstChild?e.firstChild.nodeValue:''})},stop(){}}}}window.AudioContext=A;window.webkitAudioContext=A};
async function open(id,m,opt){opt=opt||{};const P=await L.phone(opt.name||'p',opt.desk?{desktop:true,w:1280,h:900}:{});await P.page.setBypassServiceWorker(true);await P.page.evaluateOnNewDocument(STUB);
  await P.page.evaluateOnNewDocument((id,m,mute)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:m.id,k:m.k}));if(mute)localStorage.setItem('fbn.beepMute','1')},id,m,!!opt.mute);
  await P.go('room.html?l='+id+'&stay=1'+(opt.hash||''));return P}
const cnt=P=>P.page.evaluate(()=>window.__osc).catch(()=>-1);const evs=P=>P.page.evaluate(()=>window.__ev).catch(()=>[]);
const rem=P=>P.page.evaluate(()=>{const e=document.getElementById('cdv');if(!e)return null;const [m,s]=e.firstChild.nodeValue.split(':');return +m*60+ +s}).catch(()=>null);
const until=async(P,f,ms)=>{for(let t=0;t<ms;t+=200){const r=await rem(P);if(r!=null&&f(r))return r;await sleep(200)}return null};
const bySec=ev=>{const g={};ev.forEach(e=>{const k=e.c.replace(/^0:/,'');g[k]=(g[k]||0)+1});return g};
async function scenarioMain(){const id=await seed(API,{rounds:8,live:true,picksMade:0,clockSecs:50});const ms=seed.info.managers;
  const A=await open(id,ms[0],{name:'onclock'});const B=await open(id,ms[1],{name:'other'});const C=await open(id,ms[0],{name:'muted',mute:true});
  await sleep(5000);ok('main: 3 beeps when the seat goes on the clock',await cnt(A)===3,await cnt(A));ok('main: other seat silent',await cnt(B)===0);ok('main: muted silent',await cnt(C)===0);
  await until(A,r=>r<=28,40000);await sleep(700);ok('main: 30 s left: 2 more (5)',await cnt(A)===5,await cnt(A));
  ok('main: other seat silent through the countdown',await cnt(B)===0,await cnt(B));await until(A,r=>r<=12,30000);const base=(await evs(A)).length;await until(A,r=>r<=1,16000);ok('main: other seat silent at 1 s',await cnt(B)===0,await cnt(B));await until(A,r=>r<=0,3000);await sleep(1500);
  const ev=(await evs(A)).slice(base);const g=bySec(ev);
  const singles=[10,9,8,7,6,5,4,3].map(k=>g[String(k).padStart(2,'0')]||0);
  ok('main: 1 beep each second from 10 s to 3 s',singles.every(x=>x===1),g);
  ok('main: rapid beeps in the last 2 s (3-4 per second, scheduled ~0.25 s apart)',(g['02']||0)>=3&&(g['02']||0)<=4&&(g['01']||0)>=3&&(g['01']||0)<=4,g);
  const fastT=ev.filter(e=>e.c==='0:02').map(e=>e.t);ok('main: rapid beeps spaced 0.25 s',fastT.length>1&&Math.abs((fastT[1]-fastT[0])-.25)<.01,fastT);
  ok('main: nothing above 10 s in the countdown window',Object.keys(g).every(k=>+k<=10),g);
  ok('main: muted still silent',await cnt(C)===0,await cnt(C));
  for(const P of [A,B,C]){ok('main '+P.name+': no page errors',!P.errs.length,P.errs);await P.close()}}
async function scenarioReload(){const id=await seed(API,{rounds:8,live:true,picksMade:0,clockSecs:30});const ms=seed.info.managers;const A=await open(id,ms[0],{name:'reload'});
  await until(A,r=>r<=7,40000);await A.page.reload({waitUntil:'domcontentloaded'});const t0=Date.now();await sleep(1100);const e1=await evs(A);
  ok('reload at 7 s: no burst in the first second (<=1, current second skipped)',e1.length<=1,e1);
  const D=await open(id,ms[0],{name:'fresh'});await sleep(800);const d1=await evs(D);ok('fresh device at ~5 s: only the turn-start triple, no 30 s / past-second burst',d1.filter(e=>e.w===d1[0].w).length<=3&&Object.values(bySec(d1.filter(e=>e.w!==d1[0].w))).every(x=>x<=1),d1);
  /* block the page (like a throttled background tab) for 2.5 s, then check no second is caught up */
  await until(A,r=>r<=5,8000);await A.page.evaluate(()=>{const t=Date.now();while(Date.now()-t<2500){}});await sleep(1200);
  const g=bySec(await evs(A));ok('after a blocked tab: each second at most once (singles), no catch-up burst',Object.keys(g).filter(k=>+k>=3).every(k=>g[k]<=1),g);
  const skipped=[4,3].filter(k=>!g['0'+k]);ok('after a blocked tab: the seconds it missed were skipped',skipped.length>=1,g);
  for(const P of [A,D]){ok(P.name+': no page errors',!P.errs.length,P.errs);await P.close()}}
async function scenarioPauseNoClockPick(){
  /* paused */
  {const id=await seed(API,{rounds:8,live:true,picksMade:0,clockSecs:30});const ms=seed.info.managers;const K=F.Keys(id);const m=await gj(K.meta);m.paused=true;m.pausedLeft=9000;await post(K.meta,m);
   const A=await open(id,ms[0],{name:'paused'});await sleep(6000);ok('paused at 9 s left: no beeps',await cnt(A)===0,await evs(A));ok('paused: no page errors',!A.errs.length,A.errs);await A.close()}
  /* no clock */
  {const id=await seed(API,{rounds:8,live:true,picksMade:0,clockSecs:null});const ms=seed.info.managers;const A=await open(id,ms[0],{name:'noclock'});await sleep(12000);
   ok('no clock: only the 3 turn-start beeps, no countdown beeps',await cnt(A)===3,await evs(A));ok('noclock: no page errors',!A.errs.length,A.errs);await A.close()}
  /* after picking with 13 s left */
  {const id=await seed(API,{rounds:8,live:true,picksMade:0,clockSecs:30});const ms=seed.info.managers;const A=await open(id,ms[0],{name:'picked'});await until(A,r=>r<=14,30000);
   await A.page.evaluate(()=>{location.hash='#tab=teams'});await sleep(800);await A.page.$eval('.trow.go .dbtn[data-a=draftrow]',e=>e.click());await A.page.waitForSelector('[data-a=confirm]',{visible:true,timeout:8000});await A.page.$eval('[data-a=confirm]',e=>e.click());
   const c0=await cnt(A);await sleep(15000);ok('after picking: no countdown beeps for the pick just made',(await cnt(A))===c0,{c0,c:await cnt(A),ev:(await evs(A)).slice(-4)});ok('picked: no page errors',!A.errs.length,A.errs);await A.close()}}
async function scenarioHelp(){for(const [w,desk] of [[390,false],[1280,true]]){const id=await seed(API,{rounds:8,live:true,picksMade:0,clockSecs:60});const ms=seed.info.managers;const S=await open(id,ms[2],{name:'help'+w,desk,hash:'#tab=more'});await sleep(3500);
  const t=await S.page.evaluate(()=>{const c=document.getElementById('soundcard');if(!c)return'';c.scrollIntoView({block:'center'});return c.innerText});ok(w+': helper text describes the new pattern',/1 beep a second from 10 s/.test(t)&&/fast beeps in the last 2 s/.test(t),t);
  await S.page.screenshot({path:(process.env.SHOTDIR||'/tmp')+'/s28_beep_help_'+w+'.png'});ok(w+': no page errors',!S.errs.length,S.errs);await S.close()}}
(async()=>{try{await Promise.all([scenarioMain(),scenarioReload(),scenarioPauseNoClockPick(),scenarioHelp()])}catch(e){bad++;console.log('FAIL exception',e&&e.stack)}finally{await L.close();console.log(bad?`${bad} of ${n} FAILED`:`ALL ${n} PASSED`);process.exit(bad?1:0)}})();
