/* s26c8b: 365-team pool. Fake unranked teams (no meta at all: no power rank, net, seed, conf, record) appended to the real 162: they sort LAST and deterministically, never NaN/undefined, and auto-pick never stalls. TEAMS_FILE=path overrides assets/teams.js. */
const F=require('../js/core.js');const fs=require('fs'),path=require('path');let n=0,bad=0;const t=(m,c,x)=>{n++;if(c)console.log('ok   '+m);else{bad++;console.log('FAIL '+m+(x!==undefined?' -> '+JSON.stringify(x).slice(0,200):''))}};
const src=fs.readFileSync(process.env.TEAMS_FILE||path.join(__dirname,'../assets/teams.js'),'utf8');const D=JSON.parse(src.slice(src.indexOf('{'),src.lastIndexOf('}')+1));
const rows=D.teams.slice();const extra=Math.max(0,365-rows.length);for(let i=0;i<extra;i++)rows.push(['9'+String(i).padStart(4,'0'),'Zed State '+i,i%3?'Zed St '+i:undefined,i%5?'Z'+i:undefined]);
const TEAMS={},POOL=[];rows.forEach(r=>{TEAMS[r[0]]={espn_id:r[0],name:r[1],short:r[2],abbr:r[3]};POOL.push(String(r[0]))});const META=D.meta||{};
t('pool is 365',POOL.length===365);
const P=x=>(META[x]&&META[x].p)||0;const ranked=POOL.filter(x=>P(x)>0);
for(const mode of F.TMODES.map(m=>m[0])){const g=F.teamView({teams:TEAMS,meta:META,pool:POOL,mode});const all=g.flatMap(x=>x.tids);
  t(mode+': every team once, no undefined label',all.length===365&&new Set(all).size===365&&g.every(x=>x.label!==undefined&&!/undefined|NaN/.test(String(x.label)+(x.note||''))));
  const g2=F.teamView({teams:TEAMS,meta:META,pool:POOL.slice().reverse(),mode});t(mode+': deterministic (input order does not matter)',JSON.stringify(g2.map(x=>x.tids))===JSON.stringify(g.map(x=>x.tids)));
  if(mode==='power'){const ix=all.map(P);const firstUn=ix.indexOf(0);t('power: all ranked first, unranked last',firstUn===ranked.length&&ix.slice(firstUn).every(v=>v===0))}}
{const last=POOL[POOL.length-1];t('search finds the last appended team',F.teamView({teams:TEAMS,meta:META,pool:POOL,q:TEAMS[last].name}).flatMap(x=>x.tids).includes(last))}
const UQ=POOL.filter(x=>!P(x)).slice(-2);
t('tierOf(unranked) = Unranked',F.tierOf(P(UQ[0])).label==='Unranked');
/* auto-pick through a 365 pool: 8 x 24 rounds = 192 picks exhausts the ranked teams; no null, no NaN, every pick valid, same result on every phone */
const {startAny}=require('./start_any.js');const mids=['m1','m2','m3','m4','m5','m6','m7','m8'];
let meta=F.defaultMeta('U1',{name:'X',mgrName:'A',teamName:'A',managers:8,rounds:24,type:'snake',startAt:null,startMode:'manual',orderMode:'manual',clockSecs:60,autoPick:true},null);meta.order=mids;meta.orderSet=true;meta=startAny(meta,mids,1000,'s',365).state;
const SET=new Set(POOL);const prank=x=>P(x);const run=()=>{const ents={};let prev='';for(let k=1;k<=192;k++){const st=F.deriveState(meta,ents,{m2:{auto:true,queue:UQ}},SET);const so=F.onClock(st);const ch=F.autoChoice(st,so.owner,POOL,F.mulberry(k*7919),prank);if(!ch||!ch.tid||ch.tid==='undefined')return{fail:k};const e=F.makeEntry(k,so.owner,ch.tid,{by:'auto',now:k,epoch:meta.epoch,prev,voided:[]});prev=e.id;ents[k]=e}return{ents}};
const r1=run(),r2=run();t('192 auto-picks, never null',!!r1.ents,r1.fail);const st=F.deriveState(meta,r1.ents,{},SET);
t('replay accepts all 192 (no stall), distinct',st.picks.length===192&&new Set(st.picks.map(p=>p.tid)).size===192);
t('ranked teams all go before the first unranked best-available pick',(()=>{const ps=st.picks.filter(p=>p.owner!=='m2'||!UQ.includes(p.tid));const fu=ps.findIndex(p=>!P(p.tid));return ps.slice(fu).every(p=>!P(p.tid))&&ps.slice(0,fu).length===ranked.length})());
t('queued unranked team is honoured first',st.picks.find(p=>p.owner==='m2').tid===UQ[0]);
t('deterministic on every phone',JSON.stringify(r1.ents)===JSON.stringify(r2.ents));
console.log(`${n-bad} passed, ${bad} failed`);process.exit(bad?1:0);
