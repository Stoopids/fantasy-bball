/* s26mo4: headless simulation of 100 solo mocks (you on old auto-pick + 7 personality bots), 8 rounds snake. node tests/sim_mock_bots_s26mo4.js */
const F=require('../js/core.js');const B=require('../js/mock-bots.js');const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(src.slice(src.indexOf('{'),src.lastIndexOf('}')+1));
B.setNet(JSON.parse(fs.readFileSync(path.join(__dirname,'../data/net.json'),'utf8')));
const META=TD.meta,POOL=TD.teams.map(r=>r[0]),prank=t=>(META[t]||{}).p||0,R=8,N=8,TOT=R*N;
const cons=B.consensus(POOL,META);const crank={};cons.forEach((t,i)=>crank[t]=i+1);
const owner=(n,ord)=>{const rd=Math.floor((n-1)/N),k=(n-1)%N;return rd%2?ord[N-1-k]:ord[k]};
let errors=0;
function mock(style,id){const picks=[];const mids=Array.from({length:8},(_,i)=>'m'+i);const me='m0';const seat=F.hash32('seat:'+id)%8;const ord=mids.slice(1);ord.splice(seat,0,me);
  const dealt=B.deal(id,ord.filter(m=>m!==me));const log=[];
  for(let n=1;n<=TOT;n++){const o=owner(n,ord);const st={picks:picks.slice(),queues:{}};let tid,pos=null,key=null;
    try{if(style==='best'||o===me){tid=F.autoChoice(st,o,POOL,F.mulberry(n*7919),prank).tid}
      else{key=B.forBot(id,o,dealt);const taken=F.takenMap(st);const avail=POOL.filter(t=>!taken[t]);const r0=Math.floor(F.mulberry(n*7919)()*4294967296);
        const c=B.choose({key,avail,meta:META,round:Math.floor(picks.length/N)+1,mine:picks.filter(p=>p.owner===o).map(p=>p.tid),rng:F.mulberry((F.hash32('mockbot4:'+id+':'+o)^r0)>>>0),mockId:id,mid:o});tid=c.tid;pos=c.pos}
      if(!tid||picks.some(p=>p.tid===tid))throw new Error('bad pick '+n)}catch(e){errors++;console.log('ERR',id,e.message);break}
    const availRank=B.consensus(POOL.filter(t=>!picks.some(p=>p.tid===t)),META).indexOf(tid)+1;
    picks.push({n,owner:o,tid});log.push({n,tid,key,pos,availRank,reach:crank[tid]-n,o})}
  return{log,dealt}}
function spread(runs){const out=[];for(let n=1;n<=TOT;n++){const c={};runs.forEach(r=>{const t=r.log[n-1].tid;c[t]=(c[t]||0)+1});const v=Object.values(c);out.push({n,distinct:v.length,top:Math.max(...v)/runs.length})}return out}
const ids=Array.from({length:100},(_,i)=>F.makeMockId?F.makeMockId():'MOCK'+i);
const newR=ids.map(id=>mock('pers',id)),oldR=ids.map(id=>mock('best',id));
const sN=spread(newR),sO=spread(oldR);const avg=(a,f)=>a.reduce((x,y)=>x+f(y),0)/a.length;
console.log('mocks:',newR.length,' errors:',errors);
console.log('pick | distinct teams (new / old Best) | top-team share (new / old)');
sN.forEach((x,i)=>{if(x.n<=16||x.n%8===0)console.log(String(x.n).padStart(4),'|',String(x.distinct).padStart(3),'/',sO[i].distinct,'|',(x.top*100).toFixed(0)+'% / '+(sO[i].top*100).toFixed(0)+'%')});
console.log('avg distinct per pick: new',avg(sN,x=>x.distinct).toFixed(1),' old',avg(sO,x=>x.distinct).toFixed(1),' | avg top share: new',(avg(sN,x=>x.top)*100).toFixed(0)+'%  old',(avg(sO,x=>x.top)*100).toFixed(0)+'%');
const bot=newR.flatMap(r=>r.log.filter(l=>l.key));const P5=['SEC','Big Ten','Big 12','ACC','Big East'],POW=P5.slice(0,4);
console.log('\npersonality | picks | avg reach vs pick# | max window pos | %power4 | %mid-major | %NET-better-than-power | distinct confs/roster');
for(const p of B.PERSONALITIES){const L=bot.filter(l=>l.key===p.key);const c=t=>(META[t]||{}).c;const net=B._net();
  const ros=newR.flatMap(r=>Object.keys(r.dealt).filter(m=>r.dealt[m]===p.key).map(m=>new Set(r.log.filter(l=>l.key&&l.o===m).map(l=>c(l.tid))).size));
  console.log(p.label.padEnd(15),'|',L.length,'|',avg(L,l=>l.reach).toFixed(1),'|',Math.max(...L.map(l=>l.availRank)),'|',(avg(L,l=>POW.includes(c(l.tid))?1:0)*100).toFixed(0)+'%','|',(avg(L,l=>P5.includes(c(l.tid))?0:1)*100).toFixed(0)+'%','|',(avg(L,l=>prank(l.tid)>(net[l.tid]||999)?1:0)*100).toFixed(0)+'%','|',ros.length?avg(ros,x=>x).toFixed(1):'-')}
function ownerOf(r,l){return r.owners?r.owners[l.n]:null}
console.log('\nabsurd-pick guard: max position among available (consensus) =',Math.max(...bot.map(l=>l.availRank)),' (window cap 14); max reach (consensus rank - overall pick) =',Math.max(...bot.map(l=>l.reach)),'; any unranked team taken by a bot:',bot.some(l=>!prank(l.tid)));
const rep=mock('pers',ids[0]).log.map(l=>l.tid).join()===newR[0].log.map(l=>l.tid).join();console.log('reproducible (same mock id -> same draft):',rep);
process.exit(errors||!rep?1:0)
