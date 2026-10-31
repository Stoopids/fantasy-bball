/* s26c3 demo league with real non-zero points for the owner breakdown: 8 managers ("Test " prefixed names, stripped in display), 8 schools each,
   regular-season results + a full NCAA path (entry, play-in win, NCAA wins, an upset, Final Four, national champ) and a locked 64+ field (missed dance). */
const fs=require('fs'),path=require('path');
module.exports=function(root){const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);
  const NAMES=[['Test Sasha','Blue Bloods','🏀'],['Test Ben','Blazers','🔥'],['Test Cy','Comets','⭐'],['Test Dee','Dunkers','🦅'],['Test Eli','Eagles','🐻'],['Test Fay','Flyers','🚀'],['Test Gus','Gators','🐊'],['Test Hal','Hawks','🦅']];
  const R8=TIDS.slice(0,64);const rosters=NAMES.map((_,i)=>R8.slice(i*8,i*8+8));const own=(m,k)=>R8[m*8+k];
  let n=0;const g=(kind,round,day,h,hs,hseed,a,as,aseed)=>({id:'x'+(++n),day,start:day+'T23:00:00Z',status:'final',kind,round,neutral:kind==='ncaa',home:{id:h,score:hs,seed:hseed},away:{id:a,score:as,seed:aseed}});
  const G=[];
  /* regular season: manager 0 schools win 6, lose 2 */
  for(let i=0;i<4;i++)G.push(g('reg','','2026-11-1'+i,own(0,0),80+i,null,own(1,i),70,null));
  G.push(g('reg','','2026-11-20',own(0,1),77,null,own(2,0),66,null),g('conf','','2026-12-02',own(0,2),71,null,own(3,0),69,null),g('conf','Final','2027-03-14',own(0,2),75,null,own(3,0),70,null));   /* conference tournament final (round set) */
  G.push(g('reg','','2026-11-21',own(0,3),60,null,own(4,0),75,null),g('reg','','2026-11-22',own(0,4),58,null,own(5,0),61,null));
  for(let m=1;m<8;m++)G.push(g('reg','','2026-11-25',own(m,1),70+m,null,own(m,2),60,null));
  /* NCAA: own(0,0) seed 2 runs the table; own(0,2) seed 12 upsets a 5; own(0,3) wins the play-in then loses */
  G.push(g('ncaa','First Four','2027-03-17',own(0,3),70,11,own(6,5),65,11));
  G.push(g('ncaa','1st Round','2027-03-19',own(0,0),85,2,own(7,3),60,15),g('ncaa','1st Round','2027-03-19',own(0,2),72,12,own(2,3),68,5),g('ncaa','1st Round','2027-03-20',own(5,2),74,6,own(0,3),70,11));
  G.push(g('ncaa','2nd Round','2027-03-21',own(0,0),77,2,own(3,3),70,7),g('ncaa','2nd Round','2027-03-21',own(4,3),80,4,own(0,2),62,12));
  G.push(g('ncaa','Sweet 16','2027-03-26',own(0,0),70,2,own(1,5),66,3),g('ncaa','Elite 8','2027-03-28',own(0,0),68,2,own(2,5),64,1));
  G.push(g('ncaa','Final Four','2027-04-03',own(0,0),75,2,own(3,5),71,1),g('ncaa','National Championship','2027-04-05',own(0,0),69,2,own(4,5),65,1));
  const field={};TIDS.slice(0,90).forEach((t,i)=>{if(t!==own(0,7)&&t!==own(1,7))field[t]={seed:(i%16)+1,region:['East','West','South','Midwest'][i%4]}});
  return{NAMES,rosters,own,scores:{format:1,sample:false,label:'',season:'2026-27',as_of:'2027-04-06',source:'s26c3 test',games:G,conf:{[own(0,2)]:{conf:'TST',confRegChamp:true,confTournChamp:true},[own(3,0)]:{conf:'TST'},[own(1,1)]:{conf:'XYZ',confRegChamp:true}}}   /* s26c8: scores.json "conf" map (own(1,1): its conference tournament has not started -> no conf_reg yet) */,tournament:{format:1,year:2027,as_of:'2027-03-15',field}}};
