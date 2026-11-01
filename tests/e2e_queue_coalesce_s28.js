/* s28 item 6: fast queue saves. Two pages on the SAME seat (390 + 1280) tap Q+ rapidly (and remove a few) while the commissioner adds to a placeholder seat's queue at the same time;
   store latency LAT ms (default 400, via /__cfg on this test's server). Zero lost entries; taps coalesced (far fewer pref writes than taps); auto-pick then uses both queues. APP/API env. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const CFG=process.env.CFG||API.replace(/\/api\/data\/$/,'');const LAT=+(process.env.LAT||400);
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}};
const cfg=q=>fetch(CFG+'/__cfg?'+q).then(r=>r.text());
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
async function ph(name,w,id,who,frag){const P=await L.phone(name,w>700?{desktop:true,w,h:900}:{});await P.page.setBypassServiceWorker(true);if(who)await P.page.evaluateOnNewDocument((id,mm)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:mm.id,k:mm.k}))},id,who);await P.go('room.html?l='+id+'&stay=1'+(frag||''));return P}
const tapQ=(P,t)=>P.page.evaluate(t=>{const b=document.querySelector('[data-a=q][data-t="'+t+'"]');if(!b)return false;b.click();return true},t);
(async()=>{try{await cfg('clear=1');
 for(const round of (process.env.ROUNDS||'1,2').split(',').map(Number)){
 const id=await seed(API,{managers:8,rounds:4,live:true,clockSecs:null,picksMade:0});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);
 const Y=I.managers.find(x=>x.id===m.order[0]),Z=I.managers.find(x=>x.id===m.order[1]),CM=I.managers.find(x=>x.id===m.order[4]);m.over[Z.id]={ph:true};m.over[Y.id]={};await post(K.meta,m);
 const A=await ph('A390',390,id,Y,'#tab=teams'),B=await ph('B1280',1280,id,Y,'#tab=teams'),C=await ph('cm390',390,id,null,'#cm='+I.cmSecret+'&as='+CM.id+'&k='+CM.k);
 await sleep(5000);
 const ts=await A.page.$$eval('[data-a=q]',a=>[...new Set(a.map(x=>x.dataset.t))].slice(0,40));
 const ta=ts.slice(0,7),tb=ts.slice(7,14);let tz=[];
 let pw=0;const pk=encodeURIComponent(K.pref(Y.id));for(const P of [A,B])P.page.on('request',r=>{if(r.method()==='POST'&&r.url().indexOf(pk)>=0)pw++});
 await C.page.evaluate(()=>{location.hash='#tab=more'});let mb=false;for(let t=0;t<20&&!mb;t++){await sleep(500);mb=await C.page.evaluate(z=>{const b=document.querySelector('[data-a=mgr][data-m="'+z+'"]');if(b)b.click();return !!b},Z.id)}await C.page.waitForSelector('#phq_sel',{timeout:10000}).catch(()=>{});await sleep(500);
 tz=(await C.page.$$eval('#phq_sel option',a=>a.map(o=>o.value))).filter(t=>ta.indexOf(t)<0&&tb.indexOf(t)<0).slice(5,9);console.log('  info placeholder teams',tz.length,mb);
 await cfg('lat='+LAT);const t0=Date.now();
 const pa=(async()=>{for(const t of ta){await tapQ(A,t);await sleep(120)}})(),pb=(async()=>{for(const t of tb){await tapQ(B,t);await sleep(150)}})();
 const pc=(async()=>{for(const t of tz){await C.page.evaluate(t=>{const s=document.getElementById('phq_sel');if(!s)return;s.value=t;document.getElementById('phqadd').click()},t);await sleep(250)}})();
 await Promise.all([pa,pb,pc]);const tTap=Date.now()-t0;
 /* rapid removes on both pages */
 await Promise.all([(async()=>{for(const t of [ta[1],ta[3]]){await tapQ(A,t);await sleep(100)}})(),(async()=>{for(const t of [tb[2],tb[5]]){await tapQ(B,t);await sleep(100)}})()]);
 const want=ta.concat(tb).filter(t=>[ta[1],ta[3],tb[2],tb[5]].indexOf(t)<0);
 let q=[],qz=[],tDone=null;for(let t=0;t<40;t++){await sleep(500);q=((await gj(K.pref(Y.id)))||{}).queue||[];qz=((await gj(K.pref(Z.id)))||{}).queue||[];if(want.every(x=>q.includes(x))&&q.length===want.length&&tz.every(x=>qz.includes(x))){tDone=Date.now()-t0;break}}
 ok(`r${round}: same-seat queue on the server has all ${want.length} entries, none lost, removed ones gone`,want.every(x=>q.includes(x))&&q.length===want.length,{want,q});
 ok(`r${round}: placeholder queue edited by the commissioner at the same time: all ${tz.length} entries`,tz.every(x=>qz.includes(x)),{tz,qz});
 ok(`r${round}: everything saved soon after the last tap (lat ${LAT} ms; limit ${LAT*6+6000} ms incl. this test's own slow reads)`,tDone!=null&&tDone-tTap<LAT*6+6000,{tTap,tDone});
 console.log('  info Y pref POSTs for',ta.length+tb.length+4,'taps:',pw);ok(`r${round}: taps coalesced (pref writes < taps)`,pw<ta.length+tb.length+4,pw);
 await sleep(3000);const qa=await A.page.evaluate(()=>[...document.querySelectorAll('[data-a=q]')].filter(b=>/✓|Queued|In queue|Q✓|−|Q-/.test(b.textContent)||b.classList.contains('on')).length).catch(()=>-1);
 /* auto-pick uses the queues: Y away -> pick 1 = first of Y's server queue; Z placeholder (no clock) -> pick 2 = first of Z's queue */
 await cfg('lat=0');const mm=await gj(K.meta);mm.over[Y.id]={away:true};await post(K.meta,mm);
 let e1=null,e2=null;for(let t=0;t<40&&!(e1&&e2);t++){await sleep(500);e1=await gj(K.pick(m.epoch,1));e2=await gj(K.pick(m.epoch,2));if(!(e1&&e1.tid))e1=null;if(!(e2&&e2.tid))e2=null}
 ok(`r${round}: auto-pick #1 for the seat uses its queue (first entry)`,!!e1&&e1.tid===q[0],{e1:e1&&e1.tid,q0:q[0]});ok(`r${round}: placeholder auto-pick #2 uses its queue`,!!e2&&e2.tid===qz.filter(t=>t!==(e1&&e1.tid))[0],{e2:e2&&e2.tid,qz});
 for(const P of [A,B,C]){ok(`r${round} `+P.name+': no page errors',!P.errs.length,P.errs);await P.close()}}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await cfg('clear=1').catch(()=>{});await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
