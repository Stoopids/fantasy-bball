/* s25-full (Paul via NCAA, "Yahoo way"): Auto-pick for me ON (or away) picks at once when the turn starts (queue: first untaken team, in order;
   empty queue: lowest power rank left); a run-out clock always auto-picks but only that ONE pick (the next turn waits for the clock again, and the
   manager's Auto-pick switch is not turned on); bots keep a 1-2 s delay; right after an Undo the slot is not re-picked at once. Mock store only. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const fs=require('fs'),path=require('path');
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(200)}return false};
const tsrc=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));
const ranked=Object.keys(TD.meta).filter(t=>+TD.meta[t].p>0).sort((a,b)=>TD.meta[a].p-TD.meta[b].p);
const pickNo=P=>P.page.evaluate(()=>{const m=(document.getElementById('banner')||{innerText:''}).innerText.match(/Pick #(\d+)/);return m?+m[1]:0});
(async()=>{try{
 /* A: picks 4, 5, 6 then 7 */
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:30,picksMade:3});const I=seed.info;const K=F.Keys(id);const meta=await gj(K.meta);
 const ow=k=>I.managers.find(m=>m.id===F.slotAt(meta.order,k,meta.settings.type,meta.settings.rounds).owner);
 const taken=[];for(let i=1;i<=3;i++)taken.push(String((await gj(K.pick(1,i))).tid));
 const free=ranked.filter(t=>!taken.includes(t));const qA=[taken[0],free[12],free[11]];const qC=[free[20]];
 await post(K.pref(ow(4).id),{queue:qA,auto:true,v:1});await post(K.pref(ow(5).id),{queue:[],auto:true,v:1});await post(K.pref(ow(6).id),{queue:qC,auto:false,v:1});await post(K.pref(ow(7).id),{queue:[],auto:false,v:1});
 const viewer=I.managers.find(m=>![4,5,6,7].some(k=>ow(k).id===m.id));
 const P=await L.phone('api',{w:390,h:844});await P.go('room.html?l='+id+'#as='+viewer.id+'&k='+viewer.k);
 const e4=await waitFor(()=>gj(K.pick(1,4)).then(e=>e&&e.tid?e:null),20000);const e5=await waitFor(()=>gj(K.pick(1,5)).then(e=>e&&e.tid?e:null),8000);
 ok('auto-pick ON: the queue\'s first UNTAKEN team is picked, in queue order (skips '+taken[0]+')',!!e4&&e4.tid===qA[1]&&e4.by==='auto',e4);
 ok('auto-pick ON, empty queue: the lowest power rank left is picked',!!e5&&e5.tid===ranked.filter(t=>!taken.includes(t)&&t!==(e4&&e4.tid))[0],{e5,want:ranked.filter(t=>!taken.includes(t)&&t!==(e4&&e4.tid))[0]});
 ok('auto-pick ON picks at once when the turn starts (pick 5 within 2.5 s of pick 4: delay 0 plus the 0.6 s write check and network)',!!e4&&!!e5&&e5.ts-e4.ts<=2500,{d:e5&&e4?e5.ts-e4.ts:null});
 const e6=await waitFor(()=>gj(K.pick(1,6)).then(e=>e&&e.tid?e:null),45000);
 ok('Auto-pick OFF, the clock runs out: the league still auto-picks (top of the queue), about 30 s after the turn started',!!e6&&e6.tid===qC[0]&&e6.by==='auto'&&e5&&e6.ts-e5.ts>=25000,{e6,d:e6&&e5?e6.ts-e5.ts:null});
 const p6=await gj(K.pref(ow(6).id));ok('a missed pick does NOT turn on that manager\'s Auto-pick switch',p6&&p6.auto===false,p6);
 await sleep(8000);const e7=await gj(K.pick(1,7));ok('the next turn after a missed pick waits for the clock again (pick 7 not made 8 s in)',!(e7&&e7.tid),e7);
 ok('no page errors',P.errs.length===0,P.errs);await P.close();
 /* B: post-Undo exception */
 const id2=await seed(API,{managers:8,rounds:6,live:true,clockSecs:30,picksMade:3});const I2=seed.info;const K2=F.Keys(id2);const m2=await gj(K2.meta);const ow2=I2.managers.find(m=>m.id===F.slotAt(m2.order,4,m2.settings.type,m2.settings.rounds).owner);
 await post(K2.pref(ow2.id),{queue:[],auto:true,v:1});const C=await L.phone('apu',{w:390,h:844});await C.go('room.html?l='+id2+'#cm='+I2.cmSecret);await waitFor(async()=>(await pickNo(C))===5,20000);
 await C.page.evaluate(()=>document.querySelector('#tab_more').click());await sleep(800);await C.page.evaluate(()=>{const b=document.querySelector('#undobtn');if(b)b.click()});await waitFor(()=>C.page.$('#cfyes'),6000);await C.page.$eval('#cfyes',e=>e.click()).catch(()=>{});
 const back=await waitFor(async()=>(await pickNo(C))===4,10000);await sleep(6000);const still=await pickNo(C);
 ok('after an Undo, the auto-pick-on manager is NOT re-picked at once (still Pick #4 six seconds later)',!!back&&still===4,{back,still});ok('undo page: no page errors',C.errs.length===0,C.errs);await C.close();
 /* C: bots keep 1-2 s */
 const M=await L.phone('apb',{w:390,h:844});await M.go('mock.html');await M.page.waitForSelector('#startmock',{timeout:15000});await M.page.click('#startmock');
 await waitFor(()=>/room\.html/.test(M.page.url()),20000);const mid=new URL(M.page.url()).searchParams.get('l');const MK=F.Keys(mid);await sleep(30000);
 const mm=await gj(MK.meta);const ents=[];for(let i=1;i<=24;i++){const e=await gj(MK.pick(mm.epoch||1,i));if(e&&e.tid)ents.push(e)}console.log('     mock: '+ents.length+' picks, by '+ents.map(e=>e.by).join(','));const bot=e=>(mm.over&&mm.over[e.owner]&&mm.over[e.owner].bot)||e.by==='bot';
 const gaps=[];for(let i=1;i<ents.length;i++)if(bot(ents[i])&&ents[i-1].n===ents[i].n-1)gaps.push(ents[i].ts-ents[i-1].ts);
 ok('bots still wait 1-2 s before picking (gaps between bot picks '+gaps.join(', ')+' ms)',gaps.length>=2&&gaps.every(g=>g>=1600&&g<=4500),gaps);await M.close();
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
