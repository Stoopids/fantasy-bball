/* Seed a finished 8-manager, 6-round league (o.rosters = per-manager list of team ids, one per round, to choose exact rosters; o.managers / o.rounds override, e.g. for legacy-count tests) into the mock store (no browser). Used for quick league-site checks and screenshots.
   node tests/seed_league.js [apiBase]   -> prints the league id */
const F=require('../js/core.js');const fs=require('fs'),path=require('path');
const s=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));
async function seed(base,o){o=o||{};base=base||process.env.API||'http://localhost:9996/api/data/';const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
  const id=o.id||F.makeLeagueId();const K=F.Keys(id);const names=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅'],['Ivy','Ironmen','⭐'],['Jo','Jets','🔥'],['Kai','Knights','🏀'],['Lee','Lions','🦁']].slice(0,o.managers||8);if(o.names)o.names.forEach((x,i)=>{if(x)names[i]=x});
  const rounds=o.rounds||6;const s0={name:o.name||'Friday Hoops',mgrName:'Ana',teamName:'Aces',managers:names.length,rounds,type:'snake',startAt:null,startMode:'manual',orderMode:'random',clockSecs:60,autoPick:true};
  const meta=F.defaultMeta(id,s0,null);const mids=names.map((n,i)=>F.hexId(12));const ks=names.map(()=>F.newSecret());const cmSecret=F.newSecret();meta.pass=await F.makePass(cmSecret);
  for(let i=0;i<names.length;i++){await post(K.slot(i+1,0),F.makeClaim({mid:mids[i],i:i+1,name:names[i][0],team:names[i][1],sh:await F.mgrHash(mids[i],ks[i])}));await post(K.mgr(mids[i]),F.makeProfile({mid:mids[i],name:names[i][0],team:names[i][1],emoji:names[i][2]}))}
  meta.order=mids.slice();meta.orderSet=true;let M0=meta;
  if(o.live){meta.settings.orderMode='manual';meta.settings.clockSecs=o.clockSecs===undefined?null:o.clockSecs;M0=require('./start_any.js').startAny(meta,mids,Date.now(),'seed',162).state}else{meta.status='complete';meta.startedAt=Date.now()-36e5;meta.endedAt=Date.now()}
  if(o.mock)M0.mock=true;await post(K.meta,M0);
  const ranked=Object.entries(TD.meta).filter(([k,m])=>m.p).sort((a,b)=>a[1].p-b[1].p).map(x=>x[0]);const rest=TD.teams.map(t=>t[0]).filter(t=>!ranked.includes(t));
  /* each manager takes the best available school most rounds, then a long shot in the last two rounds (so every score mode has variety) */
  const picks=[];let prev='';const avail=ranked.slice();const longshots=rest.slice();const n=names.length;let pick=0;
  const limit=o.picksMade==null?1e9:o.picksMade;for(let r=0;r<rounds&&pick<limit;r++){const row=r%2===0?mids:mids.slice().reverse();for(const mid of row){if(pick>=limit)break;pick++;const tid=o.rosters?o.rosters[mids.indexOf(mid)][r]:(r>=rounds-2)?longshots.shift():avail.shift();picks.push({n:pick,managerId:mid,teamId:tid});await post(K.pick(1,pick),(()=>{const e=F.makeEntry(pick,mid,tid,{now:Date.now(),epoch:1,writer:'seed',by:'owner',prev});prev=e.id;return e})())}}
  const info={cmSecret,managers:mids.map((m,i)=>({id:m,name:names[i][0],team:names[i][1],k:ks[i]})),picks};
  seed.info=info;return id}
module.exports={seed};
if(require.main===module)seed(process.argv[2]).then(id=>console.log(id));
