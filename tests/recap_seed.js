/* Seed a finished 8 x 8 league (seed_league.js) and give every pick a realistic, spaced time stamp (and a few auto-picks), so the recap's pick-time stats have data.
   o.power = true: names and rosters taken from data/power-rankings.json, so the analysis file matches this league (grades shown). node tests/recap_seed.js [apiBase] */
const fs=require('fs'),path=require('path');const F=require('../js/core.js');const {seed}=require('./seed_league.js');
const root=path.join(__dirname,'..');
async function seedRecap(base,o){o=o||{};base=base||process.env.API||'http://localhost:9996/api/data/';let args={rounds:8};if(o.managers)args.managers=o.managers;
  if(o.power){const PR=JSON.parse(fs.readFileSync(path.join(root,'data/power-rankings.json'),'utf8'));const t=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));
    const sk=v=>String(v).toLowerCase().replace(/&/g,'and').replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]+/g,'');const tidOf={};TD.teams.forEach(t=>{[t[1],t[2]].forEach(x=>{if(x)tidOf[sk(x)]=t[0]})});
    args={rounds:8,managers:undefined,names:PR.map(r=>[r.manager,r.team,'🏀']),rosters:PR.map(r=>r.schools.map(x=>tidOf[sk(x)]))}}
  const id=await seed(base,args);const info=seed.info;const K=F.Keys(id);
  if(o.times!==false){let ts=Date.now()-3600e3,k=0;const gaps=[9,14,22,31,18,12,45,27];
    for(let n=1;n<=info.picks.length;n++){const key=base+encodeURIComponent(K.pick(1,n));const e=JSON.parse(await (await fetch(key)).text());
      const owner=info.picks[n-1].managerId;const oi=info.managers.findIndex(m=>m.id===owner);ts+=(gaps[(oi+n)%8]+oi*4+(n%3)*3)*1000+(n===37?240000:0);e.ts=ts;if(oi===5&&n%4===0){e.by='auto'}
      await fetch(key,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(e)})}
    const mk=base+encodeURIComponent(K.meta);const meta=JSON.parse(await (await fetch(mk)).text());meta.startedAt=Date.now()-3600e3-30000;meta.endedAt=ts+1000;
    meta.spinDone=true;meta.respins=[{gen:1,ts:meta.startedAt-600e3,kind:'spin'}];
    await fetch(mk,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(meta)})}
  seedRecap.info=info;return id}
module.exports={seedRecap};
if(require.main===module)seedRecap(process.argv[2]).then(id=>console.log(id));
