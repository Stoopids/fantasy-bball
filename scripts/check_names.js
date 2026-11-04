#!/usr/bin/env node
/* Read-only check: list team names longer than the shared limit (shared/ui.js LIMITS.team, default 15) in one live league.
   Usage: node scripts/check_names.js <LEAGUE_ID> [storeBase]. Only GET requests; exits 1 if any name is too long. */
const fs=require('fs'),path=require('path');
const id=(process.argv[2]||'').toLowerCase(),base=process.argv[3]||'https://textdb.dev/api/data/';
if(!id){console.error('usage: node scripts/check_names.js <LEAGUE_ID>');process.exit(2)}
let lim=15;try{const m=fs.readFileSync(path.join(__dirname,'..','shared','ui.js'),'utf8').match(/team:(\d+)/);if(m)lim=+m[1]}catch(e){}
const get=async k=>{const r=await fetch(base+k);if(!r.ok)return null;try{return JSON.parse(await r.text())}catch(e){return null}};
(async()=>{const K='fbn1-'+id,meta=await get(K+'-meta');if(!meta){console.log('check_names: league not found');process.exit(2)}
  const bad=[];for(const mid of meta.order||[]){const p=await get(K+'-m-'+mid);const t=(p&&p.team)||'';if(t.length>lim)bad.push([p.name,t])}
  bad.forEach(([n,t])=>console.log(`check_names: ${n}: "${t}" is ${t.length} chars (max ${lim})`));
  console.log('check_names:',bad.length?'FAIL':'OK',`(${meta.name})`);process.exit(bad.length?1:0)})();
