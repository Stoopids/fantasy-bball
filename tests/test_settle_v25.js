/* s25 regression (QA /workspace/qa-s25/REPORT.md #1): new bets are stamped v:25 at placement, so a non-creator legacy (unmarked) settle never counts on them,
   not even by the 48 h auto rule; old unmarked bets keep the s24 rule exactly. node tests/test_settle_v25.js */
const fs=require('fs'),path=require('path'),vm=require('vm');const src=fs.readFileSync(path.join(__dirname,'../js/league-bets.js'),'utf8');
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x):''))}};
const noop=()=>{};const doc={addEventListener:noop,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],documentElement:{},hidden:false};
const ctx={window:{},document:doc,console,localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},setTimeout,clearTimeout,Intl,Date,Math,JSON,navigator:{},location:{hash:'',search:''},matchMedia:()=>({matches:false})};
ctx.window=ctx;ctx.addEventListener=noop;ctx.removeEventListener=noop;vm.createContext(ctx);vm.runInContext(src,ctx);const B=ctx.LBETS;
const M=['aaaaaaaaaaaa','bbbbbbbbbbbb','cccccccccccc','dddddddddddd'];const H=3600e3,T0=Date.UTC(2026,10,10,12);let u=0;const U=()=>'qa'+String(++u).padStart(6,'0');
const ev=(k,o,ts)=>Object.assign({k,u:U(),ts},o);
function run(marked,settler){const L={};M.forEach(m=>L[m]=[]);
  L[M[0]].push(ev('p',Object.assign({id:'bet0000001',to:M[3],amt:10,a:1,b:1,text:'Kansas beats Kentucky'},marked?{v:25}:{}),T0));
  L[M[3]].push(ev('a',marked?{id:'bet0000001',v:25}:{id:'bet0000001'},T0+H));
  L[settler].push(ev('s',{id:'bet0000001',r:'o'},T0+2*H));   /* unmarked (legacy s24-style) settle */
  return B.reduce(L,M,T0+2*H+49*H)[0]}
let b=run(true,M[3]);ok('QA case: new (v:25) bet + non-creator legacy answer at +49 h is NOT settled',b.status==='open'&&b.res==null&&!b.auto&&!Object.keys(b.reps).length,b);
b=run(true,M[0]);ok('new (v:25) bet: a legacy (unmarked) settle from the creator is ignored too',b.status==='open',b.status);
{const L={};M.forEach(m=>L[m]=[]);L[M[0]].push(ev('p',{id:'bet0000002',to:M[3],amt:10,a:1,b:1,text:'x',v:25},T0));L[M[3]].push(ev('a',{id:'bet0000002',v:25},T0+H));
  L[M[3]].push(ev('s',{id:'bet0000002',r:'o',v:25},T0+2*H));let r=B.reduce(L,M,T0+60*H)[0];ok('new bet: marked settle from the non-creator is ignored',r.status==='open',r.status);
  L[M[0]].push(ev('s',{id:'bet0000002',r:'b',v:25},T0+3*H));r=B.reduce(L,M,T0+4*H)[0];ok('new bet: marked settle from the creator settles at once',r.status==='settled'&&r.res==='b'&&!r.auto,r)}
b=run(false,M[3]);ok('old (unmarked) bet: lone legacy answer from the other side still auto-settles after 48 h (s24 rule unchanged)',b.status==='settled'&&b.res==='o'&&b.auto,b);
{const L={};M.forEach(m=>L[m]=[]);L[M[0]].push(ev('p',{id:'bet0000003',to:M[3],amt:10,a:1,b:1,text:'x'},T0));L[M[3]].push(ev('a',{id:'bet0000003'},T0+H));
  L[M[3]].push(ev('s',{id:'bet0000003',r:'o'},T0+2*H));let r=B.reduce(L,M,T0+3*H)[0];ok('old bet: lone legacy answer before 48 h stays reported',r.status==='reported',r.status);
  L[M[0]].push(ev('s',{id:'bet0000003',r:'o'},T0+4*H));r=B.reduce(L,M,T0+5*H)[0];ok('old bet: both sides agree -> settled (not auto)',r.status==='settled'&&r.res==='o'&&!r.auto,r);
  const L2=JSON.parse(JSON.stringify(L));L2[M[0]][1].r='b';r=B.reduce(L2,M,T0+90*H)[0];ok('old bet: different answers -> disputed, never auto-settled',r.status==='disputed',r.status)}
const cp=src.slice(src.indexOf('async function confirmPlace'));const pl=cp.slice(0,cp.indexOf('\n',cp.indexOf("k:'p'")));
ok('placement (confirmPlace) stamps v:SV (25) on every place event',/\{k:'p',[^}]*v:SV/.test(pl));
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));process.exit(bad?1:0)
