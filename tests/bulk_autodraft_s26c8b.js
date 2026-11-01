/* s26c8b: N full 64-pick mock drafts through the real room code (headless Chrome, mock store). 1-3 human seats on Auto-draft (pref auto:true), the rest bots.
   Phones: commissioner (spectator, #cm) + one auto manager whose device is closed after a random number of picks (or kept). Checks: 64 picks, distinct teams, no rejected / garbage entries, no stall (> STALL ms between picks), no page errors.
   node tests/bulk_autodraft_s26c8b.js N PAR   (APP / API env) */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
const N=+process.argv[2]||10,PAR=+process.argv[3]||4,STALL=+process.env.STALL||9000;
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const tsrc=require('fs').readFileSync(require('path').join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const POOLSET=new Set(TD.teams.map(t=>String(t[0])));
const res=[];
async function one(i){const r={i,ok:false,errs:[]};const t0=Date.now();let C,A;
  try{const id=await seed(API,{managers:8,rounds:8,live:true,clockSecs:30,picksMade:0});const I=seed.info;const K=F.Keys(id);const M=await gj(K.meta);
    const nAuto=1+(i%3);const autos=I.managers.slice().sort(()=>Math.random()-.5).slice(0,nAuto);M.mock=true;
    I.managers.forEach(m=>{if(!autos.includes(m))M.over[m.id]=Object.assign({},M.over[m.id],{away:true,bot:true})});
    M.startedAt=M.resumeAt=Date.now()+4000;await post(K.meta,M);
    for(const a of autos)await post(K.pref(a.id),{queue:Math.random()<.5?TD.teams.slice(0,6).map(t=>String(t[0])).sort(()=>Math.random()-.5):[],auto:true,v:1});
    r.id=id;r.nAuto=nAuto;
    C=await L.phone('c'+i,{w:390,h:844});await C.go('room.html?l='+id+'#cm='+I.cmSecret);
    A=await L.phone('a'+i,{w:390,h:844});await A.go('room.html?l='+id+'#as='+autos[0].id+'&k='+autos[0].k);const closeAt=Math.random()<.7?Math.floor(Math.random()*40):999;
    let last=0,lastT=Date.now(),stall=0;
    while(Date.now()-t0<12*60000){await sleep(1000);const st=await fetch(API.replace('/api/data/','/__dump/')+encodeURIComponent(K.pick(M.epoch,1))).then(()=>null);
      let k=last;while(k<64){const e=await gj(K.pick(M.epoch,k+1));if(!(e&&e.tid))break;k++}
      if(k>last){const g=Date.now()-lastT;if(last>0&&g>stall)stall=g;last=k;lastT=Date.now()}else if(Date.now()-lastT>60000)break;
      if(A&&last>=closeAt){r.errs.push(...A.errs);await A.close();A=null}
      if(last>=64)break}
    const ents={};for(let k=1;k<=64;k++)ents[k]=await gj(K.pick(M.epoch,k));const m2=await gj(K.meta);const prefs={};
    const s=F.deriveState(m2,ents,prefs,POOLSET);r.picks=s.picks.length;r.distinct=new Set(s.picks.map(p=>p.tid)).size;r.rejected=s.rejected.length;r.stallObsMs=stall;
    const aids=autos.map(a=>a.id);const ps=s.picks;r.autoGaps=[];r.botGaps=[];for(let k=1;k<ps.length;k++){const g=ps[k].ts-ps[k-1].ts;(aids.includes(ps[k].owner)?r.autoGaps:r.botGaps).push(g)}
    {const g0=ps[0]?ps[0].ts-M.startedAt:null;(aids.includes(ps[0]&&ps[0].owner)?r.autoGaps:r.botGaps).push(g0)}
    r.maxGap=Math.max(...r.autoGaps,...r.botGaps);r.autoBy=ps.filter(p=>aids.includes(p.owner)).every(p=>p.by==='auto');
    r.errs.push(...C.errs,...(A?A.errs:[]));r.ok=r.picks===64&&r.distinct===64&&!r.rejected&&r.maxGap<STALL&&!r.errs.length&&r.autoBy}
  catch(e){r.errs.push(String(e.stack||e))}finally{try{if(C)await C.close();if(A)await A.close()}catch(e){}}
  r.secs=Math.round((Date.now()-t0)/1000);res.push(r);console.log(JSON.stringify({i,ok:r.ok,nAuto:r.nAuto,picks:r.picks,distinct:r.distinct,rej:r.rejected,maxGap:r.maxGap,secs:r.secs,errs:r.errs.slice(0,2)}))}
(async()=>{let next=0;await Promise.all(Array.from({length:PAR},async()=>{while(next<N){const i=next++;await one(i)}}));
  const ag=res.flatMap(r=>r.autoGaps||[]).sort((a,b)=>a-b);const q=p=>ag[Math.floor(p*(ag.length-1))];
  const sum={drafts:res.length,ok:res.filter(r=>r.ok).length,errors:res.reduce((t,r)=>t+r.errs.length,0),notFull:res.filter(r=>r.picks!==64).length,doubles:res.filter(r=>r.distinct!==r.picks||r.rejected).length,stalls:res.filter(r=>!(r.maxGap<STALL)).length,
    autoPicks:ag.length,autoGapMs:{min:ag[0],p50:q(.5),p90:q(.9),p99:q(.99),max:ag[ag.length-1]},avgDraftSecs:Math.round(res.reduce((t,r)=>t+r.secs,0)/res.length)};
  console.log('SUMMARY '+JSON.stringify(sum));require('fs').writeFileSync(process.env.OUT||'/tmp/s26c8b_logs/bulk.json',JSON.stringify({sum,res},null,1));await L.close();process.exit(sum.ok===sum.drafts?0:1)})();
