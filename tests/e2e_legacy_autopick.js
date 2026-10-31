/* s25-full (k, Paul: 'Switch older leagues to auto-pick'): a legacy league with settings.autoPick:false auto-picks at clock-out like every league:
   queue first, then the best power rank; it covers only that one pick (the next turn waits for its clock); the stored setting is never rewritten. Mock store only. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const fs=require('fs'),path=require('path');
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const tsrc=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const ranked=Object.keys(TD.meta).filter(t=>+TD.meta[t].p>0).sort((a,b)=>TD.meta[a].p-TD.meta[b].p);
(async()=>{try{
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:30,picksMade:3});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);m.settings.autoPick=false;await post(K.meta,m);const raw0=JSON.stringify(m.settings);
 const ow=k=>I.managers.find(x=>x.id===F.slotAt(m.order,k,m.settings.type,m.settings.rounds).owner);const taken=[];for(let i=1;i<=3;i++)taken.push(String((await gj(K.pick(1,i))).tid));
 const qx=ranked.filter(t=>!taken.includes(t))[15];await post(K.pref(ow(4).id),{queue:[qx],auto:false,v:1});await post(K.pref(ow(5).id),{queue:[],auto:false,v:1});await post(K.pref(ow(6).id),{queue:[],auto:false,v:1});
 const viewer=I.managers.find(x=>![4,5,6].some(k=>ow(k).id===x.id));const P=await L.phone('lg',{w:390,h:844});await P.go('room.html?l='+id+'#as='+viewer.id+'&k='+viewer.k);await sleep(2000);
 const txt=await P.page.evaluate(()=>document.body.innerText);ok('no "waiting" clock state is shown for the legacy league',!/TIME'S UP · waiting|waits when the clock/i.test(txt));
 const e4=await waitFor(()=>gj(K.pick(1,4)).then(e=>e&&e.tid?e:null),50000);ok('legacy autoPick:false: at clock-out the pick is made right away, top of the queue',!!e4&&e4.tid===qx&&e4.by==='auto',e4);
 const e5a=await gj(K.pick(1,5));await sleep(8000);const e5b=await gj(K.pick(1,5));ok('it covers only that one pick: the next turn waits for its own clock (no pick 8 s in)',!(e5a&&e5a.tid)&&!(e5b&&e5b.tid),{e5a,e5b});
 const e5=await waitFor(()=>gj(K.pick(1,5)).then(e=>e&&e.tid?e:null),45000);const want=ranked.filter(t=>!taken.includes(t)&&t!==qx)[0];
 ok('the next clock-out (empty queue) picks the best power rank left, as normal',!!e5&&e5.tid===want&&e5.by==='auto'&&e5.ts-e4.ts>=25000,{e5,want});
 const m2=await gj(K.meta);ok('stored settings are unchanged (autoPick:false is never written back)',JSON.stringify(m2.settings)===raw0&&m2.settings.autoPick===false,m2.settings);
 const p4=await gj(K.pref(ow(4).id));ok("the manager's own Auto-pick switch is not turned on",p4&&p4.auto===false,p4);
 await P.page.evaluate(()=>{const b=document.querySelector('#tab_my');if(b)b.click()});await sleep(500);ok('no page errors',P.errs.length===0,P.errs);await P.close();
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
