/* s25-full FINAL SPEC (Paul via NCAA): ONE compact pre-draft card. Row 1: "Invite managers" + Copy invite link (yellow, flips to Copied!) + Share side by side;
   Row 2: small "Mock Draft" (new tab); "More" (commissioner only) opens Copy reminder message + Links & QR. Shots: OUT=<dir> TAG=before|after; SHOTS_ONLY=1 skips checks. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const OUT=process.env.OUT,TAG=process.env.TAG||'shot',CHECK=!process.env.SHOTS_ONLY;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
(async()=>{try{if(OUT)require('fs').mkdirSync(OUT,{recursive:true});
 const id=await seed(API,{managers:8});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);m.status='lobby';delete m.endedAt;delete m.startedAt;m.orderSet=false;m.order=[];m.spin=null;m.spinGen=0;m.spinDone=false;m.respins=[];await post(K.meta,m);
 for(const [w,h] of [[390,844],[1280,800]])for(const who of ['commish','manager']){const opt=w>700?{desktop:true,w,h}:{w,h};const me=I.managers[who==='commish'?0:3];
  const P=await L.phone('iv'+w+who,opt);await P.page.setBypassServiceWorker(true);if(who==='commish')await P.page.evaluateOnNewDocument((id,cm)=>localStorage.setItem('fbn.cm.'+id,cm),id,I.cmSecret);
  await P.page.evaluateOnNewDocument(()=>{window.__copied=[];try{Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window.__copied.push(t);return Promise.resolve()}},configurable:true})}catch(e){}});
  await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.$('#invitecard,#tabs'),25000);await sleep(2000);
  await P.page.evaluate(()=>{const c=document.getElementById('invitecard');if(c)c.scrollIntoView({block:'center'})});await sleep(300);if(OUT)await P.page.screenshot({path:`${OUT}/${TAG}_${who}_${w}.png`});
  const hClosed=await P.page.evaluate(()=>{const c=document.getElementById('invitecard');return c?Math.round(c.getBoundingClientRect().height):0});const more=await P.page.$('#invmore');if(more){await more.click();await sleep(400);if(OUT)await P.page.screenshot({path:`${OUT}/${TAG}_${who}_${w}_more.png`})}
  if(CHECK){const r=await P.page.evaluate(()=>{const c=document.getElementById('invitecard');const cards=document.querySelectorAll('#invitecard').length;const b=document.body.innerText;
    const cp=document.getElementById('invcopy'),sh=document.getElementById('invshare'),mk=document.getElementById('invmock');const R=e=>e?e.getBoundingClientRect():null;const a=R(cp),s=R(sh);
    return{cards,h:c?Math.round(c.getBoundingClientRect().height):0,cw:c?Math.round(c.getBoundingClientRect().width):0,sameRow:!!(a&&s&&Math.abs(a.top-s.top)<2),aw:a?Math.round(a.width):0,cpBg:cp?getComputedStyle(cp).backgroundColor:'',
     mk:mk?{t:mk.target,rel:mk.rel,txt:mk.textContent.trim(),h:Math.round(mk.getBoundingClientRect().height)}:null,more:!!document.getElementById('invmore'),practice:/Practice while you wait/i.test(b),
     moreItems:[...document.querySelectorAll('#invmorebox button,#invmorebox a')].map(x=>x.textContent.trim())}});
   const tag=w+'px '+who;ok(tag+': one invite card, '+hClosed+' px tall with More closed (<= '+(w>700?130:160)+')'+(more?', '+r.h+' px with More open':''),r.cards===1&&hClosed>0&&hClosed<=(w>700?130:160),{hClosed,r});
   ok(tag+': Copy invite link and Share side by side, not full width',r.sameRow&&r.aw<r.cw*0.75,r);
   ok(tag+': Mock Draft is a small link that opens a new tab (target=_blank, rel noopener), no description',!!r.mk&&r.mk.t==='_blank'&&/noopener/.test(r.mk.rel)&&r.mk.txt==='Mock Draft'&&r.mk.h<=48,r.mk);
   ok(tag+': no "Practice while you wait" text',!r.practice);
   ok(tag+': More is '+(who==='commish'?'shown and opens Copy reminder message + Links & QR':'not shown'),who==='commish'?r.more&&r.moreItems.some(t=>/Copy reminder message/.test(t))&&r.moreItems.some(t=>/Links & QR/.test(t)):!r.more,r);
   await P.page.$eval('#invcopy',e=>e.click()).catch(()=>{});await sleep(400);const cl=await P.page.evaluate(()=>({t:(document.getElementById('invcopy')||{}).textContent,c:window.__copied}));
   ok(tag+': Copy invite link copies a join link with no secret and flips to "Copied!"',/Copied!/.test(cl.t||'')&&cl.c.length&&/join\.html/.test(cl.c[0])&&!/[#&?](k|cm|as)=/.test(cl.c[0]),cl);
   ok(tag+': no page errors',P.errs.length===0,P.errs)}
  await P.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
