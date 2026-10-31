/* s25-full (Paul via NCAA): soft self-made crowd cheer once when a draft completes (real + mock), volume 0.35, not replayed on reload,
   device mute toggle (44px) on the Draft complete card, blocked autoplay fails silently, file < 50 KB. OUT env = screenshot folder. Mock store only. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API,APP=process.env.APP;const fs=require('fs'),path=require('path');
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const stub=(mode)=>`(()=>{window.__plays=[];const P=HTMLMediaElement.prototype;P.play=function(){window.__plays.push({src:this.src,vol:this.volume});try{localStorage.setItem('__pc',String(+(localStorage.getItem('__pc')||0)+1))}catch(e){}return ${mode==='block'?"Promise.reject(new DOMException('blocked','NotAllowedError'))":'Promise.resolve()'}}})()`;
async function full(mock){const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:48});const I=seed.info;if(mock){const K=F.Keys(id);const m=await gj(K.meta);m.mock=true;m.solo=true;m.over={};I.managers.forEach((x,i)=>{if(i)m.over[x.id]={bot:true}});await post(K.meta,m)}return{id,I}}
async function open(id,me,mode,o){const P=await L.phone('ch'+Math.random().toString(36).slice(2,6),o||{w:390,h:844});await P.page.evaluateOnNewDocument(stub(mode||'ok'));if(o&&o.mute)await P.page.evaluateOnNewDocument(()=>localStorage.setItem('fbn.cheer.mute','1'));
 await P.page.evaluateOnNewDocument((id,me)=>localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k})),id,me);/* a finished draft sends the room to the recap; the cheer plays on whichever page this device shows first */
 await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.$('#cheermute'),30000);await sleep(1500);return P}
(async()=>{try{
 const sz=fs.statSync(path.join(__dirname,'../assets/cheer.mp3')).size;ok('assets/cheer.mp3 is under 50 KB ('+sz+' bytes)',sz>1000&&sz<50*1024,sz);
 {const r=await fetch(APP+'/assets/cheer.mp3');ok('cheer.mp3 is served',r.ok,r.status)}
 ok('generator script is shipped (tools/make_cheer.js, no downloaded audio)',fs.existsSync(path.join(__dirname,'../tools/make_cheer.js')));
 for(const kind of ['real','mock']){const {id,I}=await full(kind==='mock');const me=I.managers[0];
  let P=await open(id,me);let p=await P.page.evaluate(()=>window.__plays);
  ok(kind+': the cheer plays once when the draft is complete, at volume 0.35',p.length===1&&/assets\/cheer\.mp3$/.test(p[0].src)&&Math.abs(p[0].vol-0.35)<0.01,p);
  await P.page.evaluate(()=>document.querySelectorAll('[data-a=grrow]').forEach(b=>b.click()));await sleep(3000);
  p=await P.page.evaluate(()=>+(localStorage.getItem('__pc')||0));ok(kind+': re-renders, the room-to-recap hop and waiting do not replay it (1 play on this device)',p===1,p);
  await P.page.reload({waitUntil:'domcontentloaded'});await waitFor(()=>P.page.$('#cheermute'),25000);await sleep(1500);p=await P.page.evaluate(()=>window.__plays);ok(kind+': a reload does not replay it',p.length===0,p);
  const b=await P.page.evaluate(()=>{const e=document.getElementById('cheermute');if(!e)return null;const r=e.getBoundingClientRect();return{h:r.height,w:r.width,t:e.textContent,p:e.getAttribute('aria-pressed'),inCard:!!e.closest('#donecard,#recaphead')}});
  ok(kind+': mute toggle on the draft-complete banner (recap hero / Draft complete card), 44px tap target',b&&b.inCard&&b.h>=44&&b.w>=44&&b.p==='false',b);
  await P.page.click('#cheermute');await sleep(300);const b2=await P.page.evaluate(()=>({p:document.getElementById('cheermute').getAttribute('aria-pressed'),ls:localStorage.getItem('fbn.cheer.mute')}));ok(kind+': tapping it mutes and remembers it on the device',b2.p==='true'&&b2.ls==='1',b2);
  await P.page.click('#cheermute');await sleep(300);ok(kind+': no page errors',P.errs.length===0,P.errs);await P.close();
  /* muted device: never plays */
  {const x=await full(kind==='mock');const Q=await open(x.id,x.I.managers[0],'ok',{w:390,h:844,mute:true});const q=await Q.page.evaluate(()=>window.__plays);ok(kind+': with mute on, the cheer does not play',q.length===0,q);await Q.close()}
  /* blocked autoplay: silent */
  {const x=await full(kind==='mock');const Q=await open(x.id,x.I.managers[0],'block');const q=await Q.page.evaluate(()=>window.__plays);ok(kind+': blocked autoplay: play() tried once, no error on the page',q.length===1&&Q.errs.length===0,{q,e:Q.errs});await Q.close()}}
 /* screenshots of the toggle */
 if(process.env.OUT){fs.mkdirSync(process.env.OUT,{recursive:true});for(const [w,h,d] of [[390,844,false],[1280,800,true]]){const x=await full(false);const Q=await open(x.id,x.I.managers[0],'ok',{w,h,desktop:d});await sleep(300);await Q.page.screenshot({path:process.env.OUT+'/cheer_toggle_'+w+'.png'});await Q.close()}}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
