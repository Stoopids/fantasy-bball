global.window=global;const R=__dirname+'/../';require(R+'assets/teams.js');require(R+'js/power-gen.js');
const TD=window.TEAMS_DATA;const T={};TD.teams.forEach(t=>T[t[0]]={name:t[1],short:t[2]});
const d=require('/workspace/ss-s26c/picks-2026-27-final.json');
const NM={mark:'Mark',jake:'Jake',kurt:'Kurt',ken:'Ken',Murf:'Murf',paul:'Paul',jim:'Jim',scott:'Scotty'};
const TEAMNAME={mark:'Dirty Draymond',jake:'Stock Rising',kurt:'Kurmoji',ken:'Kentut',Murf:'Murfcockchalkrock',paul:'Party Paul',jim:'Nasty Peacock',scott:'En Fuego'};/* s26c2: league-approved team names override the input file */
d.managers.forEach(m=>{m.team_name=TEAMNAME[m.id]});
const order=d.managers.sort((a,b)=>a.draft_slot-b.draft_slot).map(m=>({manager:NM[m.id],mid:m.id,slot:m.draft_slot,owner_name:m.owner_name,team_name:m.team_name}));
const taken=new Set(d.picks.filter(p=>p.overall).map(p=>p.overall));
const picks=d.picks.map(p=>{let o=p.overall,r=p.round,k=p.pick;if(o==null){if(p.espnId!=='275'||taken.has(63))throw 'slot';o=63;r=8;k=7}
 return{overall:o,round:r,pick:k,manager:NM[p.manager_id],mid:p.manager_id,teamId:p.espnId,team:p.teamName}}).sort((a,b)=>a.overall-b.overall);
// snake check
picks.forEach(p=>{const i=(p.overall-1)%8,rd=Math.ceil(p.overall/8),s=rd%2?i+1:8-i;if(order[s-1].mid!==p.mid||p.round!==rd||p.pick!==i+1)throw 'snake '+p.overall});
const MG=order.map(o=>({mid:o.mid,name:o.manager,team:o.team_name}));
const rows=FBNPowerGen.generate({managers:MG,picks:picks.map(p=>({owner:p.mid,tid:p.teamId,n:p.overall})),teams:T,meta:TD.meta});
/* s26c wording pass: hand-written text (facts checked against teams.js meta and the picks); grade, rank and strength still come from FBNPowerGen */
const TXT=require('./stoopids-2026-27-text.js');
const grades={};rows.forEach(r=>grades[MG.find(m=>m.mid===r._mid).name]={grade:r.grade,rank:r.rank,strength:r.strength,avgPowerRank:r.avgPowerRank,summary4:TXT[MG.find(m=>m.mid===r._mid).name][0],deep:TXT[MG.find(m=>m.mid===r._mid).name][1]});
const out={contract:'v1',season:'2026-27',league:'STOOPIDS',build:'2026-10-31s26c2',draft:{type:'snake',rounds:8,managers:8},
 source:{file:'picks-2026-27-final.json',md5:'6ca1fda6de3b1a917e173b91f683dbe1',teams_built:TD.built,
  notes:'Wisconsin (275) on Jake confirmed by Stoopids Site on October 31, 2026; the input had no slot for it, so it sits at overall 63 (round 8, pick 7), the only open slot. Graded like any other pick.'},
 order:order,picks:picks.map(({mid,...p})=>p),grades};
require('fs').mkdirSync(R+'import',{recursive:true});
require('fs').writeFileSync(R+'import/stoopids-draft-results.json',JSON.stringify(out,null,1)+'\n');
rows.forEach(r=>console.log(r.rank,r.grade,MG.find(m=>m.mid===r._mid).name,r.strength,'|',r.short,'\n   DEEP:',r.recap.split(/(?<=[.!?])\s+/).length));
