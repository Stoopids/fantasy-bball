/* s27: finished-draft recap grades use the 50/50 KenPom/power blend F.blendRank(meta,0.5) when Draft Room's core has it (s26c14 build), else meta.p.
   Loads js/power-gen.js in a vm with window.FBN = (a) the blend core, copied into a temp overlay (BLEND_CORE env, default fantasy-bball-releases/s26c14/js/core.js), (b) this copy's core.js (no blendRank -> fallback).
   Checks: blend used for strength/grades, fallback when blendRank absent, o missing -> no NaN, grades exactly A+..D, avgPowerRank still p.  node tests/e2e_blend_grades_s27.js */
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm');
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const ROOT=path.join(__dirname,'..');const SRC=process.env.BLEND_CORE||'/workspace/fantasy-bball-releases/s26c14/js/core.js';
const OV=fs.mkdtempSync(path.join(os.tmpdir(),'s27blend-'));fs.copyFileSync(SRC,path.join(OV,'core.js'));
const Fb=require(path.join(OV,'core.js'));const Fs=require(path.join(ROOT,'js/core.js'));
const PG=fs.readFileSync(path.join(ROOT,'js/power-gen.js'),'utf8');
const load=FBN=>{const w={FBN};const ctx={window:w,console};vm.createContext(ctx);vm.runInContext(PG,ctx);return w.FBNPowerGen};
const GR=['A+','A','A-','B+','B','B-','C','D'];
/* 8 managers x 4 schools; 32 schools with p 1..32; o reversed for half so the blend reorders */
const MG=[...Array(8)].map((_,i)=>({mid:'m'+i,name:'M'+i,team:'T'+i}));const ids=[...Array(40)].map((_,i)=>'t'+i);
const mk=withO=>{const m={};ids.forEach((t,i)=>{m[t]={c:'X',p:i<36?i+1:undefined};if(withO)m[t].o=i<20?40-i:i-15});return m};
const teams={};ids.forEach(t=>teams[t]={name:'School '+t,short:'S'+t});
const picks=[];for(let r=0;r<4;r++)for(let k=0;k<8;k++){const i=r*8+(r%2?7-k:k);picks.push({n:picks.length+1,tid:'t'+((i*7)%32),owner:'m'+k})}
const strOf=(F,meta,PGm)=>{/* expected strength with rank source */const R=F?F.blendRank(meta,0.5):null;return MG.map(m=>PGm.strengthOf(picks.filter(p=>p.owner===m.mid).map(p=>R?Object.assign({},meta[p.tid],{p:R[p.tid]}):meta[p.tid])))};
const chk=(lab,rows)=>{ok(lab+': 8 rows, grades exactly A+..D in rank order',rows&&rows.length===8&&JSON.stringify(rows.map(r=>r.grade))===JSON.stringify(GR),rows&&rows.map(r=>r.grade));
  ok(lab+': no NaN anywhere (strength, avgPowerRank, text)',rows&&rows.every(r=>isFinite(r.strength)&&(r.avgPowerRank===null||isFinite(r.avgPowerRank))&&!/NaN|undefined/.test(JSON.stringify(r))),rows&&rows.map(r=>[r.strength,r.avgPowerRank]))};
ok('blend core has F.blendRank(META,wo); s27 copy core.js does not (guarded fallback)',typeof Fb.blendRank==='function'&&typeof Fs.blendRank!=='function');
{const meta=mk(true);const G=load(Fb);const rows=G.generate({managers:MG,picks,teams,meta});chk('blend',rows);
  const exp=strOf(Fb,meta,G),pex=strOf(null,meta,G);const got=MG.map(m=>rows.find(r=>r._mid===m.mid).strength);
  ok('blend: strength = blended ranks (F.blendRank(meta,0.5)), not meta.p',JSON.stringify(got)===JSON.stringify(exp)&&JSON.stringify(exp)!==JSON.stringify(pex),{got,exp,pex});
  const avg=MG.map(m=>{const ps=picks.filter(p=>p.owner===m.mid).map(p=>meta[p.tid].p).filter(x=>x!=null);return Math.round(ps.reduce((a,b)=>a+b,0)/ps.length*10)/10});
  ok('blend: avgPowerRank still the plain p average (label "Avg STOOPID rank" stays true)',JSON.stringify(MG.map(m=>rows.find(r=>r._mid===m.mid).avgPowerRank))===JSON.stringify(avg),avg)}
{const meta=mk(true);const G=load(Fs);const rows=G.generate({managers:MG,picks,teams,meta});chk('fallback (no blendRank)',rows);
  ok('fallback: strength = meta.p',JSON.stringify(MG.map(m=>rows.find(r=>r._mid===m.mid).strength))===JSON.stringify(strOf(null,meta,G)))}
{const meta=mk(false);const G=load(Fb);const rows=G.generate({managers:MG,picks,teams,meta});chk('blend, o missing',rows);
  const R=Fb.blendRank(meta,0.5);ok('o missing: blend order = p order',ids.filter(t=>meta[t].p).every(t=>R[t]===meta[t].p),null)}
{const meta=mk(true);delete meta.t3.p;delete meta.t5.o;meta.t9={c:'X'};const G=load(Fb);const rows=G.generate({managers:MG,picks,teams,meta});chk('blend, mixed missing o/p',rows)}
{/* real teams.js meta */const s=fs.readFileSync(path.join(ROOT,'assets/teams.js'),'utf8');const TD=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));const meta=TD.meta;
  const ranked=Object.keys(meta).filter(t=>meta[t].p).sort((a,b)=>meta[a].p-meta[b].p).slice(0,48);const pk=ranked.map((t,i)=>({n:i+1,tid:t,owner:'m'+(Math.floor(i/8)%2?7-i%8:i%8)}));
  const T={};Object.keys(meta).forEach(t=>T[t]={name:t});for(const [lab,F] of [['real meta, blend',Fb],['real meta, fallback',Fs]])chk(lab,load(F).generate({managers:MG,picks:pk,teams:T,meta}))}
fs.rmSync(OV,{recursive:true,force:true});
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));process.exit(bad?1:0);
