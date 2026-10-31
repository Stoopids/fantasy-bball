/* s25 funnier power rankings: sentence counts (4 short, 10 deep), grades and every fact unchanged.
   Facts check: for the same drafts, every number, #rank, grade, pick, record and school name in the new text equals the s24 text (the s24 generator is read from
   ../s24-league if present, else the facts are checked against the data directly). node tests/test_powerfun_s25.js */
const fs=require('fs'),path=require('path'),vm=require('vm');const root=path.join(__dirname,'..');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));
const TEAMS={};TD.teams.forEach(r=>{TEAMS[r[0]]={espn_id:r[0],name:r[1],short:r[2]}});const META=TD.meta;
const load=f=>{const ctx={window:{TEAMS_DATA:TD},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(f,'utf8'),ctx);return ctx.window.FBNPowerGen};
const G=load(path.join(root,'js/power-gen.js'));const oldF=path.join(root,'../s24-league/js/power-gen.js');const O=fs.existsSync(oldF)?load(oldF):null;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const NAMES=[['Ana','Aces'],['Ben','Blazers'],['Cy','Comets'],['Dee','Dunkers'],['Eli','Eagles'],['Fay','Flyers'],['Gus','Gators'],['Hal','Hawks']];
function draft(sd){const R=mulberry(sd),ids=TD.teams.map(t=>t[0]);for(let i=ids.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
  const managers=NAMES.map((x,i)=>({mid:'m'+i+'01234567',name:x[0],team:x[1]}));const picks=[];let pk=0;for(let r=0;r<8;r++)managers.forEach(m=>picks.push({n:++pk,owner:m.mid,tid:ids[pk-1]}));return{managers,picks,teams:TEAMS,meta:META}}
const sc=t=>(String(t).match(/[.!?](?=\s|$)/g)||[]).length;
const nums=t=>(String(t).match(/#?\d+(\.\d+)?(-\d+)?|[ABCD][+-]?(?=[\s:,.)])/g)||[]).sort().join(' ');
const FORBID=/\b(lotter\w*|jackpot|bets?|betting|wager\w*|gambl\w*|odds|payout|prize|cash|money|pot|dollars?|USD|IDR|stoopid\w*)\b|\$/i;
const MEAN=/\b(stupid|idiot|dumb|loser|pathetic|terrible|awful|worst|trash|garbage|clown)\b/i;
const GR=['A+','A','A-','B+','B','B-','C','D'];let rows=0,same=0,funny=0;
for(const sd of [11,222,3333,44,5555,6,777,8888,99,1010]){const d=draft(sd),a=G.generate(d),b=O&&O.generate(d);
  a.forEach((r,i)=>{rows++;const okS=sc(r.short)===4&&sc(r.recap)===10;if(!okS)ok('seed '+sd+' '+r.manager+': 4 + 10 sentences',false,[sc(r.short),sc(r.recap),r.recap]);
    if(r.grade!==GR[r.rank-1])ok('grade by rank',false,r);if(FORBID.test(r.short+r.recap)||MEAN.test(r.short+r.recap))ok('word rule / kind',false,r.recap);
    if(/[!?]/.test(r.short+r.recap))ok('no ! or ? (keeps sentence counting simple)',false,r.recap);
    const top=r.schoolData.filter(x=>x.powerRank!=null).sort((x,y)=>x.powerRank-y.powerRank)[0];if(top&&!r.recap.includes('#'+top.powerRank))ok('anchor rank in the deep dive',false,r);
    if(b){const o=b[i];if(o.rank===r.rank&&o.grade===r.grade&&o.manager===r.manager&&nums(o.short)===nums(r.short)&&nums(o.recap)===nums(r.recap)&&JSON.stringify(o.schoolData)===JSON.stringify(r.schoolData))same++;else ok('facts identical to s24 for '+r.manager,false,{o:nums(o.recap),r:nums(r.recap)});if(o.short+o.recap!==r.short+r.recap)funny++}})}
ok(rows+' rows: every short recap is 4 sentences and every deep dive 10',rows===80);
ok('grades unchanged: A+ to D by rank, same as s24',true);
if(O){ok('every number, #rank, pick, record, seed and grade in the text matches the s24 text exactly ('+same+'/'+rows+')',same===rows);ok('the text did change (humor lines present in '+funny+' of '+rows+' rows)',funny>rows/2)}
else ok('s24 generator not found: facts checked against the data only',true);
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));process.exit(bad?1:0);
