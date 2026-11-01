/* s28 item 4: commissioner Start -> 60 s 'Draft starts in' countdown on every page (meta startedAt = resumeAt = now+60 s, startCd), no picks before it, reload-safe, Start now skips;
   pick #1's clock starts from the start instant; an away seat is auto-picked only after it. Optional OLD=<base url of s27c> opens an s27c client on the same league and records what it does.
   Real (non-mock) league in the mock store. APP/API env, SHOTDIR. */
const L=require('./lib.js');const F=require('../js/core.js');const {sleep}=L;const API=L.API;const SD=process.env.SHOTDIR||'/tmp';const OLD=process.env.OLD||'';
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
async function lobby(o){o=o||{};const id=F.makeLeagueId();const K=F.Keys(id);const s0={name:'Start CD test',mgrName:'A',teamName:'A',managers:8,rounds:2,type:'snake',startAt:null,startMode:'manual',orderMode:'manual',clockSecs:o.clock===undefined?30:o.clock,autoPick:true};
  const meta=F.defaultMeta(id,s0,null);const cm=F.newSecret();meta.pass=await F.makePass(cm);const ms=[];
  for(let i=1;i<=8;i++){const mid=F.hexId(12),k=F.newSecret();ms.push({id:mid,k});await post(K.slot(i,0),F.makeClaim({mid,i,name:'M'+i,team:'T'+i,sh:await F.mgrHash(mid,k)}));await post(K.mgr(mid),F.makeProfile({mid,name:'M'+i,team:'T'+i}))}
  meta.cm=ms[0].id;meta.order=ms.map(x=>x.id);meta.orderSet=true;if(o.away1)meta.over[ms[0].id]={away:true};await post(K.meta,meta);return{id,K,cm,ms}}
async function ph(name,w){const P=await L.phone(name,w>700?{desktop:true,w,h:900}:{w,h:844});await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);P.page.on('request',r=>{if(/textdb\.dev/.test(r.url()))r.abort();else r.continue()});return P}
const pre=P=>P.page.evaluate(()=>{const c=document.getElementById('precard'),x=document.getElementById('precd');const [m,s]=(x?x.textContent:'9:99').split(':');return{on:!!c,secs:x?+m*60+ +s:null,txt:c?c.innerText:'',oncard:!!document.getElementById('oncard'),popen:!!document.querySelector('[data-a=popen]'),drow:!!document.querySelector('.trow.go .dbtn[data-a=draftrow]'),startnow:!!document.getElementById('startnow'),cdv:(document.getElementById('cdv')||{}).textContent||''}}).catch(e=>({err:String(e)}));
async function startIt(C){await C.page.evaluate(()=>document.querySelector('#startbtn').click());await sleep(700);await C.page.evaluate(()=>document.querySelector('#cfyes').click())}
(async()=>{try{
 /* 1: countdown on all pages, no picks, reload, pause blocked, Start now */
 {const {id,K,cm,ms}=await lobby();const C=await ph('cm390',390);await C.go('room.html?l='+id+'&stay=1#cm='+cm);const S1=await ph('seat1280',1280);await S1.go('room.html?l='+id+'&stay=1#as='+ms[0].id+'&k='+ms[0].k);const W=await ph('spec390',390);await W.go('room.html?l='+id+'&stay=1&watch=1');
  let O=null;if(OLD){O=await ph('old-s27c',390);await O.page.goto(OLD+'/room.html?l='+id+'&stay=1#as='+ms[1].id+'&k='+ms[1].k,{waitUntil:'domcontentloaded'})}
  await sleep(4500);const t0=Date.now();await startIt(C);let m;for(let t=0;t<20;t++){await sleep(500);m=await gj(K.meta);if(m.status==='live')break}
  ok('meta: live with startCd 60000 and startedAt = resumeAt ~ now+60 s',m.status==='live'&&m.startCd===60000&&m.startedAt===m.resumeAt&&Math.abs(m.startedAt-(t0+60000))<6000,{s:m.status,cd:m.startCd,d:m.startedAt-t0});
  await sleep(3500);const a=await pre(C),b=await pre(S1),c=await pre(W);
  ok('commish 390: "Draft starts in" card with Start now',a.on&&/Draft starts in/.test(a.txt)&&a.startnow&&!a.oncard,a);ok('seat 1280: countdown, no Start now, no pick button',b.on&&!b.startnow&&!b.popen,b);ok('spectator: countdown',c.on,c);
  ok('all devices agree (±1 s) and under 1:00',a.secs<=60&&Math.abs(a.secs-b.secs)<=1&&Math.abs(a.secs-c.secs)<=1,[a.secs,b.secs,c.secs]);
  await S1.page.evaluate(()=>{location.hash='#tab=teams'});await sleep(1200);const b2=await pre(S1);ok('seat: no Draft buttons on Teams during the countdown',!b2.drow,b2);
  await C.page.screenshot({path:SD+'/s28_startcd_390.png'});await S1.page.evaluate(()=>{location.hash='#tab=board'});await sleep(800);await S1.page.screenshot({path:SD+'/s28_startcd_1280.png'});
  await S1.page.reload({waitUntil:'domcontentloaded'});await sleep(3500);const b3=await pre(S1),a3=await pre(C);ok('reload: countdown continues from the same instant',b3.on&&Math.abs(b3.secs-a3.secs)<=1,{b3,a:a3.secs});
  ok('no pick #1 written during the countdown',!(await gj(K.pick(m.epoch,1))));
  if(O){const o1=await O.page.evaluate(()=>{const b=document.getElementById('oncard');return{banner:b?b.innerText:'',cdv:(document.getElementById('cdv')||{}).textContent||''}});console.log('  info old s27c client during the countdown:',JSON.stringify(o1));ok('old s27c client: no page errors during the countdown',!O.errs.length,O.errs)}
  await C.page.evaluate(()=>{location.hash='#tab=more'});await sleep(800);await C.page.evaluate(()=>{const b=document.querySelector('[data-a=pause]');if(b)b.click()});await sleep(1500);ok('pause during the countdown is refused (meta not paused)',!(await gj(K.meta)).paused);
  await C.page.evaluate(()=>{location.hash='#tab=board'});await sleep(500);await C.page.evaluate(()=>document.getElementById('startnow').click());const t1=Date.now();let mm;for(let t=0;t<20;t++){await sleep(400);mm=await gj(K.meta);if(mm.startedAt<=Date.now())break}
  ok('Start now: startedAt moved to now',mm.startedAt<=Date.now()&&mm.startedAt>=t1-3000,{d:mm.startedAt-t1});await sleep(4500);
  const a4=await pre(C),b4=await pre(S1),c4=await pre(W);ok('Start now: every page on the clock (no countdown card)',!a4.on&&!b4.on&&!c4.on&&a4.oncard&&b4.oncard&&c4.oncard,[a4,b4,c4]);
  ok('pick #1 clock starts at the start instant (~0:2x of 0:30)',/0:2\d/.test(b4.cdv),b4.cdv);
  await S1.page.evaluate(()=>{location.hash='#tab=teams'});await sleep(1200);await S1.page.$eval('.trow.go .dbtn[data-a=draftrow]',e=>e.click());await S1.page.waitForSelector('[data-a=confirm]',{visible:true,timeout:8000});await S1.page.$eval('[data-a=confirm]',e=>e.click());
  let e1=null;for(let t=0;t<20&&!e1;t++){await sleep(500);e1=await gj(K.pick(mm.epoch,1))}ok('seat makes pick #1 after Start now',!!(e1&&e1.tid));
  if(O){ok('old s27c client: no page errors after the start',!O.errs.length,O.errs);await O.close()}
  for(const P of [C,S1,W]){ok(P.name+': no page errors',!P.errs.length,P.errs);await P.close()}}
 /* 2: no Start now: wait the full 60 s; away seat 1 is auto-picked only after the start instant */
 {const {id,K,cm,ms}=await lobby({away1:true,clock:0});const C=await ph('cm1280',1280);await C.go('room.html?l='+id+'&stay=1#cm='+cm);await sleep(4500);await startIt(C);let m;for(let t=0;t<20;t++){await sleep(500);m=await gj(K.meta);if(m.status==='live')break}
  await sleep(20000);ok('no clock + away seat: nothing picked at 20 s into the countdown',!(await gj(K.pick(m.epoch,1))));
  let e=null;for(let t=0;t<120&&!e;t++){await sleep(500);const x=await gj(K.pick(m.epoch,1));if(x&&x.tid)e=x}ok('away seat auto-picked after the countdown, not before (ts >= startedAt)',!!e&&e.ts>=m.startedAt,{ts:e&&e.ts,st:m.startedAt});
  const a=await pre(C);ok('after 0:00 the countdown card is gone',!a.on,a);ok(C.name+': no page errors',!C.errs.length,C.errs);await C.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
