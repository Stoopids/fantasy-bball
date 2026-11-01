/* s28 item 5: Undo of an auto-pick with No clock (and with a 60 s clock): away, placeholder, auto-draft-on, mock bot, and Force on a normal seat; pick #1 and mid-draft pick #5. The draft must continue. APP/API env, mock store only. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const KINDS=(process.env.KINDS||'away,ph,auto,bot,human').split(',');const CLOCKS=(process.env.CLOCKS||'0,60').split(',').map(Number);const AT=(process.env.AT||'1,5').split(',').map(Number);
(async()=>{try{for(const clk of CLOCKS)for(const kind of KINDS)for(const at of AT){const w=(n%2)?1280:390;const tag=`[${kind} clock=${clk||'none'} pick#${at} ${w}]`;
 const id=await seed(API,{managers:8,rounds:4,live:true,clockSecs:clk||null,picksMade:at-1});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);
 const slot=F.slotAt(m.order,at,m.settings.type,m.settings.rounds);const tgt=I.managers.find(x=>x.id===slot.owner);const cm=I.managers.find(x=>x.id!==slot.owner);
 m.over=m.over||{};if(kind==='away'||kind==='human')m.over[tgt.id]={away:true};if(kind==='ph')m.over[tgt.id]={ph:true};if(kind==='bot'){m.mock=true;m.over[tgt.id]={away:true,bot:true}}
 m.resumeAt=Date.now();await post(K.meta,m);if(kind==='auto')await post(K.pref(tgt.id),{queue:[],auto:true,v:1});
 const P=await L.phone('cm'+w,w>700?{desktop:true,w,h:900}:{w,h:844});await P.page.setBypassServiceWorker(true);await P.go('room.html?l='+id+'&stay=1#cm='+I.cmSecret+'&as='+cm.id+'&k='+cm.k);
 const Q=kind==='human'?await L.phone('seat'+w,{w:390,h:844}):null;if(Q){await Q.page.setBypassServiceWorker(true);await Q.go('room.html?l='+id+'&stay=1#as='+tgt.id+'&k='+tgt.k)}
 const liveAt=async()=>{const mm=await gj(K.meta);const vo=new Set(mm.voided||[]);const e=await gj(K.pick(mm.epoch,at));return e&&e.tid&&!vo.has(e.id)?e:null};
 const waitP=async ms=>{const t=Date.now();while(Date.now()-t<ms){const e=await liveAt();if(e)return e;await sleep(500)}return null};
 await sleep(4000);
 let e=await waitP(clk&&kind==='ph'?clk*1000+15000:25000);ok(tag+' auto/force pick lands',!!e);if(!e){await P.close();if(Q)await Q.close();continue}
 await P.page.evaluate(()=>{location.hash='#tab=more'});await sleep(1200);await P.page.evaluate(()=>document.getElementById('undobtn').click());await sleep(500);await P.page.evaluate(()=>document.getElementById('cfyes').click());
 const t0=Date.now();await sleep(kind==='bot'?300:2500);if(kind==='bot'){const mv=await gj(K.meta);ok(tag+' undo voided the pick',(mv.voided||[]).indexOf(e.id)>=0)}else ok(tag+' undo removed the pick',!(await liveAt()));
 if(kind==='human'){/* the commissioner clears Away right after the Undo: a normal seat, back on the clock, picks by hand */
   {const mm=await gj(K.meta);mm.over[tgt.id]={};await post(K.meta,mm)}await sleep(3000);
   const st=await Q.page.evaluate(()=>{const b=document.getElementById('oncard');return b?b.innerText:''});ok(tag+' seat page shows its turn again',/ON THE CLOCK/i.test(st),st);
   const auto=await waitP(clk?3000:14000);ok(tag+' normal seat is not auto re-picked inside 10 s (manual turn)',!auto);
   await Q.page.evaluate(()=>{location.hash='#tab=teams'});await sleep(1500);
   const did=await Q.page.evaluate(async()=>{const b=document.querySelector('.trow.go .dbtn[data-a=draftrow]');if(!b)return'norow';b.click();for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,250));const c=document.querySelector('[data-a=confirm]');if(c&&c.offsetParent){c.click();return'ok'}}return'noconfirm'});
   e=await waitP(15000);ok(tag+' seat makes its own pick after the undo ('+did+')',!!e)}
 else if(!clk&&kind!=='bot'){e=await waitP(20000);ok(tag+' No clock: Undo freezes auto-pick for the slot (no re-pick in 20 s)',!e);const fz=await P.page.evaluate(()=>{const b=document.getElementById('autofrz');return b?b.innerText:''});ok(tag+' frozen note shown',/frozen/i.test(fz),fz);ok(tag+' 0 JS errors',!P.errs.length,P.errs);await P.close();continue}
 else{e=await waitP(clk&&kind==='ph'?clk*1000+15000:30000);const dt=(Date.now()-t0)/1000;ok(tag+' re-picked after the hold ('+dt.toFixed(1)+'s), not frozen',!!e&&dt<=(clk&&kind==='ph'?clk+15:25)&&(kind==='bot'||dt>=7),{dt})}
 /* the draft keeps moving: next pick lands (seat after is a normal manager: mark it away so it goes by itself) */
 const mm=await gj(K.meta);const nx=F.slotAt(mm.order,at+1,mm.settings.type,mm.settings.rounds);mm.over[nx.owner]=Object.assign({},mm.over[nx.owner],{away:true});await post(K.meta,mm);
 let e2=null;for(let t=0;t<40&&!e2;t++){await sleep(500);const x=await gj(K.pick(mm.epoch,at+1));if(x&&x.tid)e2=x}ok(tag+' the next pick lands too',!!e2);
 ok(tag+' 0 JS errors',!P.errs.length&&!(Q&&Q.errs.length),P.errs.concat(Q?Q.errs:[]));await P.close();if(Q)await Q.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
