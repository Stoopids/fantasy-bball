/* s26c16: start with 6 of 8 joined. Lobby order (orderSet) has empty rows at rows 3 and 7 (row 3 named 'Paul' by the commissioner, row 7 unnamed).
   Commissioner Start -> confirm says '2 empty seats will be auto-picked' -> placeholders take rows 3 and 7 exactly (Paul, Seat 7), board order matches;
   placeholders are auto-picked when the clock runs out (30 s, queue then KenPom); commissioner Re-issue on a placeholder -> the new link claims the seat, keeps its picks, the seat is a normal manager; draft completes.
   Mock store only (fbn.store=/api/data/), textdb.dev aborted. APP/API env, SHOTS=<dir>. */
const L=require('./lib.js');const F=require('../js/core.js');const {sleep}=L;const API=L.API;const SH=process.env.SHOTS||'/tmp';
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
let Q;(async()=>{try{
 const NM=['Skyler','B','Lucas','JT','Jim','Paul E','Chris Maclean','Murphy'];
 /* ABSENT=3,7 (rows, 1-based); NAMED=rows whose empty seat keeps the person's name (others 'Seat N'); LOCK=1 locks the order; REISSUE=1 runs the re-issue claim; SHOTS_ON=1 takes shots */
 const TYPED=(process.env.TYPED||'').split(',').filter(Boolean).map(Number);const ABS=(process.env.ABSENT||'3,7').split(',').map(Number),NAMED=(process.env.NAMED||'3').split(',').filter(Boolean).map(Number),LOCK=process.env.LOCK==='1',RE=process.env.REISSUE!=='0',SON=process.env.SHOTS_ON!=='0';
 const id=F.makeLeagueId();const K=F.Keys(id);const R=2;
 const s0={name:'Absent Test (mock clone)',mgrName:'A',teamName:'A',managers:8,rounds:R,type:'snake',startAt:null,startMode:'manual',orderMode:'manual',clockSecs:30,autoPick:true};
 const meta=F.defaultMeta(id,s0,null);meta.mock=true;const cm=F.newSecret();meta.pass=await F.makePass(cm);const mids=[],rowsOf=[];const order=[];meta.seatNames={};let slot=0,e=0;
 for(let r=1;r<=8;r++){if(ABS.includes(r)){e++;order.push('e'+e);if(NAMED.includes(r))meta.seatNames['e'+e]=NM[r-1];continue}
   slot++;const mid=F.hexId(12),k=F.newSecret();mids.push(mid);rowsOf.push(r-1);order.push(mid);await post(K.slot(slot,0),F.makeClaim({mid,i:slot,name:NM[r-1],team:NM[r-1]+' team',sh:await F.mgrHash(mid,k)}));await post(K.mgr(mid),F.makeProfile({mid,name:NM[r-1],team:NM[r-1]+' team'}))}
 meta.cm=mids[0];meta.order=order;meta.orderSet=true;meta.orderLock=LOCK;
 mids.forEach(m=>{meta.over[m]={away:true}});await post(K.meta,meta);
 const shot=async(P,f)=>P.page.screenshot({path:SH+'/'+f+'.png'});
 const Ps={};for(const w of [390,1280]){const P=await L.phone('cm'+w,w>700?{desktop:true,w,h:900}:{w,h:844});await P.page.setRequestInterception(true);P.page.on('request',r=>{if(/textdb\.dev/.test(r.url()))r.abort();else r.continue()});await P.go('room.html?l='+id+'#cm='+cm);Ps[w]=P}
 const C=Ps[390];await sleep(4000);
 const rows=await C.page.$$eval('#orderlist .mrow',a=>a.map(x=>x.dataset.mid));ok('lobby order list shows 8 rows, empty rows at '+ABS,rows.length===8&&JSON.stringify(rows)===JSON.stringify(order),rows);if(LOCK)ok('Lock order is on, no move buttons',await C.page.$eval('#orderlock',x=>x.checked)&&!(await C.page.$('#orderlist [data-a="om"]')));
 
 for(const r of TYPED){const eid=order[r-1];await C.page.type('#sn_'+eid,NM[r-1]);await C.page.evaluate(eid=>document.querySelector('[data-a="seatname"][data-m="'+eid+'"]').click(),eid);let ok1=false;for(let t=0;t<20&&!ok1;t++){await sleep(500);const mm=await gj(K.meta);ok1=!!(mm.seatNames&&mm.seatNames[eid]===NM[r-1])}ok('commissioner typed a name on empty row '+r,ok1)}
 const sn=await C.page.$eval('#startnote',e=>e.innerText);ok('start note: N empty seats will be auto-picked',new RegExp(ABS.length+' empty seats? will be auto-picked').test(sn),sn);
 for(const w of [390,1280]){const P=Ps[w];await P.page.evaluate(()=>document.querySelector('#startbtn').click());await sleep(700);const t=await P.page.evaluate(()=>(document.getElementById('phconfirm')||{}).innerText||'');ok(w+': confirm says '+ABS.length+' empty seat(s) will be auto-picked',new RegExp(ABS.length+' empty seats? will be auto-picked').test(t),t);if(SON)await shot(P,'lobby-confirm-'+w)}
 const txt=await C.page.evaluate(()=>document.body.innerText);ok('no betting/money wording on the lobby confirm',!/\b(bet|bets|betting|wager|money|\$)/i.test(txt));
 await Ps[1280].page.evaluate(()=>document.querySelector('[data-a="sheetbg"]').click());
 await C.page.evaluate(()=>document.querySelector('#cfyes').click());
 let m2;for(let t=0;t<30;t++){await sleep(1000);m2=await gj(K.meta);if(m2&&m2.status==='live')break}
 ok('draft is live',m2&&m2.status==='live');const ord=m2.order;const ph=ord.filter(x=>mids.indexOf(x)<0);
 ok('board order matches the lobby exactly (joined managers in their rows)',ord.length===8&&rowsOf.every((p,i)=>ord[p]===mids[i]),ord);
 ok(ABS.length+' placeholders in rows '+ABS+', marked ph, not bots',ph.length===ABS.length&&ABS.every((r,i)=>ord[r-1]===ph[i])&&ph.every(x=>m2.over[x]&&m2.over[x].ph&&!m2.over[x].bot));
 const cl={};for(let i=1;i<=8;i++){const c=F.parseClaim(JSON.stringify(await gj(K.slot(i,0))));if(c)cl[c.mid]=c}
 const wantN=ABS.map(r=>NAMED.includes(r)||TYPED.includes(r)?NM[r-1]:'Seat '+r);const gotN=ph.map(x=>cl[x]&&cl[x].name);ok('placeholder names '+JSON.stringify(wantN),JSON.stringify(gotN)===JSON.stringify(wantN),gotN);
 /* the commissioner queues a team for the first placeholder (its own pref key K.pref(mid)); auto-pick at clock-out must take it (not the KenPom best) */
 await C.page.evaluate(mid=>{const b=document.createElement('button');b.dataset.a='mgr';b.dataset.m=mid;b.id='tmpq';document.body.appendChild(b);b.click();b.remove()},ph[0]);
 await sleep(1500);let qt='';for(let t=0;t<20&&!qt;t++){await sleep(300);qt=await C.page.evaluate(()=>{const s=document.getElementById('phq_sel');if(!s||s.options.length<6)return '';s.value=s.options[5].value;return s.value})}
 await C.page.evaluate(()=>document.getElementById('phqadd').click());let pq0=null;for(let t=0;t<20;t++){await sleep(400);pq0=await gj(K.pref(ph[0]));if(pq0&&Array.isArray(pq0.queue)&&pq0.queue.includes(qt))break}
 await sleep(1200);let qt2='';for(let t=0;t<20&&!qt2;t++){await sleep(300);qt2=await C.page.evaluate(q=>{const s=document.getElementById('phq_sel');if(!s||s.options.length<6)return '';const o=[...s.options].find(x=>x.value!==q&&x.index>=5);s.value=o.value;return s.value},qt)}
 const kb=await C.page.evaluate(()=>{const s=document.getElementById('phq_sel');return s?s.options[0].value:''});
 await C.page.evaluate(()=>document.getElementById('phqadd').click());
 let pq=null;for(let t=0;t<20;t++){await sleep(500);pq=await gj(K.pref(ph[0]));if(pq&&Array.isArray(pq.queue)&&pq.queue.includes(qt2))break}
 ok('commissioner queued 2 teams for the placeholder in order (K.pref(placeholder); first is not the KenPom best)',!!qt&&!!qt2&&qt!==kb&&pq&&pq.queue[0]===qt&&pq.queue[1]===qt2,{qt,qt2,kb,pq});
 await C.page.evaluate(()=>{const b=document.querySelector('[data-a="sheetbg"]');if(b)b.click()});
 /* wait for pick 3 (placeholder Paul) = clock expiry */
 const picks=async()=>{const a=[];for(let k=1;k<=8*R;k++){const e=await gj(K.pick(m2.epoch,k));if(!(e&&e.tid))break;a.push(e)}return a};
 let pk=[];const r0=ABS[0];const t3=Date.now();for(let t=0;t<120;t++){await sleep(1500);pk=await picks();if(pk.length>=r0)break}
 ok('placeholder auto-pick took its queued team first',pk.length>=r0&&String(pk[r0-1].tid)===String(qt),{got:pk[r0-1]&&pk[r0-1].tid,qt});
 ok('placeholder row '+r0+' auto-picked after its clock ran out ('+Math.round((Date.now()-t3)/1000)+'s)',pk.length>=r0&&pk[r0-1].owner===ph[0]&&(Date.now()-t3)>20000,pk.map(p=>p.owner));
 if(SON)for(const w of [390,1280]){await Ps[w].go('room.html?l='+id);await sleep(3500);await Ps[w].page.evaluate(()=>{const c=[...document.querySelectorAll('#overlay a,#overlay button')].find(x=>/^Close$/.test(x.innerText.trim()));if(c)c.click()});await sleep(1200);await shot(Ps[w],'board-placeholders-'+w)}
 if(RE){
 /* re-issue the Paul seat */
 await C.page.evaluate(mid=>{const b=document.createElement('button');b.dataset.a='mgr';b.dataset.m=mid;b.id='tmpmgr';document.body.appendChild(b);b.click()},ph[0]);await sleep(800);
 await C.page.evaluate(()=>document.querySelector('#reissuebtn').click());await sleep(500);await C.page.evaluate(()=>document.querySelector('#cfyes').click());
 let url='';for(let t=0;t<20&&!url;t++){await sleep(500);url=await C.page.evaluate(()=>(document.getElementById('reissueurl')||{}).value||'')}
 ok('re-issue made a new link for the placeholder seat',/#as=/.test(url));
 let m3;for(let t=0;t<20;t++){await sleep(700);m3=await gj(K.meta);if(!(m3.over[ph[0]]||{}).ph)break}
 {const pq2=await gj(K.pref(ph[0]));ok('after the Re-issue claim the seat keeps its queue',pq2&&Array.isArray(pq2.queue)&&pq2.queue.includes(qt),pq2)}
 ok('claimed seat is no longer a placeholder',!(m3.over[ph[0]]||{}).ph&&ph.slice(1).every(x=>!!(m3.over[x]||{}).ph));
 for(const w of [390,1280]){const P=Ps[w];await P.go('room.html?l='+id);await sleep(3500);await P.page.evaluate(()=>{const c=[...document.querySelectorAll('#overlay a,#overlay button')].find(x=>/^Close$/.test(x.innerText.trim()));if(c)c.click()});await sleep(500);
   await P.page.evaluate(()=>document.querySelector('[data-a="tab"][data-t="my"]').click());await sleep(800);await P.page.evaluate(m=>{const b=document.querySelector('[data-a="vo"][data-m="'+m+'"]');if(b)b.click()},ph[0]);
   const tkn=(await picks()).map(p=>String(p.tid));const want=[qt2].filter(t=>!tkn.includes(String(t)));let cq=[];for(let t=0;t<16;t++){await sleep(500);cq=await P.page.$$eval('#cmqueue .cmqrow',a=>a.map(x=>x.dataset.t));if(JSON.stringify(cq)===JSON.stringify(want))break}
   ok(w+': commissioner My Team shows the placeholder queue (taken first team hidden, second left)',JSON.stringify(cq)===JSON.stringify(want),{cq,want});
   await P.page.evaluate(()=>{const e=document.getElementById('cmqueue');if(e)e.scrollIntoView({block:'center'})});await sleep(400);if(SON)await shot(P,'commish-queue-'+w)}
 Q=await L.phone('paul',{w:390,h:844});await Q.page.setRequestInterception(true);Q.page.on('request',r=>{if(/textdb\.dev/.test(r.url()))r.abort();else r.continue()});
 await Q.page.goto(url.replace(/^https?:\/\/[^/]+/,L.APP),{waitUntil:'domcontentloaded'});await sleep(4000);
 const meOk=await Q.page.evaluate(()=>document.body.innerText.length>0&&!/Commissioner tools are locked|not found/i.test(document.body.innerText));ok('the real manager opened the seat with the new link',meOk);}
 for(let t=0;t<200;t++){await sleep(2000);pk=await picks();if(pk.length>=8*R)break}
 ok('draft completed: '+pk.length+'/'+(8*R)+' picks',pk.length===8*R);
 ok('first absent seat kept its earlier pick',pk[r0-1].owner===ph[0]);
 ok('every placeholder has '+R+' picks',ph.every(x=>pk.filter(p=>p.owner===x).length===R));
 ok('picks follow the board order (snake)',pk.every((p,i)=>{const rd=Math.floor(i/8),k=i%8;return p.owner===ord[rd%2?7-k:k]}));
 ok('one pick per slot, no team twice',new Set(pk.map(p=>p.tid)).size===pk.length);
 for(const P of [Ps[390],Ps[1280]].concat(RE?[Q]:[]))ok(P.name+': 0 JS errors',!P.errs.length,P.errs);
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
