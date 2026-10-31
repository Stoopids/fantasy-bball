/* s25 regression (QA s25d item 11 / F1): bet game matching and the ESPN ?dates= query use the US Eastern game day, not the viewer's day.
   TZ=Asia/Jakarta node tests/test_etday_s25.js ; TZ=America/Los_Angeles node tests/test_etday_s25.js */
/* s25-full: the test sets TZ itself. With no TZ in the environment it re-runs itself once per zone (Asia/Jakarta, America/Los_Angeles) and fails if either fails. */
if(!process.env.TZ){const {spawnSync}=require('child_process');let tot=0,good=0,fail=0;
  for(const z of ['Asia/Jakarta','America/Los_Angeles']){const r=spawnSync(process.execPath,[__filename],{env:Object.assign({},process.env,{TZ:z}),encoding:'utf8'});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
    const m=/(\d+) \/ (\d+) checks passed/.exec(r.stdout||'');if(m){good+=+m[1];tot+=+m[2]}if(r.status!==0||!m)fail++}
  console.log('\nALL ZONES: '+good+' / '+tot+' checks passed'+(fail?' — FAILED':''));process.exit(fail?1:0)}
else{
const fs=require('fs'),path=require('path'),vm=require('vm');const rd=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  ['+process.env.TZ+'] '+t);else{bad++;console.log('FAIL  ['+process.env.TZ+'] '+t+(x!==undefined?'  -> '+JSON.stringify(x):''))}};
const noop=()=>{};const doc={addEventListener:noop,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],documentElement:{},hidden:false};
const asked=[];const DUKE='150',UNC='153';
/* game: Fri Nov 6, 2026, 8:00 PM ET (EST) = 2026-11-07T01:00Z; ESPN lists it under dates=20261106 */
const GAME=Date.UTC(2026,10,7,1,0);const feed={'20261106':{events:[{id:'401',date:new Date(GAME).toISOString(),competitions:[{status:{type:{name:'STATUS_FINAL',completed:true}},competitors:[{team:{id:DUKE},score:'80'},{team:{id:UNC},score:'70'}]}]}]}};
const fetch=async u=>{const d=/dates=(\d{8})/.exec(u)[1];asked.push(d);return{ok:true,json:async()=>feed[d]||{events:[]}}};
const ctx={window:{},document:doc,console,localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},setTimeout,clearTimeout,Intl,Date,Math,JSON,navigator:{languages:['en-US']},location:{hash:'',search:''},matchMedia:()=>({matches:false}),fetch,AbortController};
ctx.window=ctx;ctx.globalThis=ctx;ctx.addEventListener=noop;ctx.removeEventListener=noop;vm.createContext(ctx);vm.runInContext(rd('js/league-d.js'),ctx);vm.runInContext(rd('js/shared-s25.js'),ctx);vm.runInContext(rd('js/league-bets.js'),ctx);
const B=ctx.LBETS._t;
(async()=>{
  /* bet placed Sat Nov 7, 09:00 WIB = 02:00Z (Fri 9:00 PM ET), after the US-evening game */
  const RealNow=Date.now;Date.now=()=>Date.UTC(2026,10,7,6,0);
  const b={id:'etbet00001',ts:Date.UTC(2026,10,7,2,0),c:{t:'win',a:DUKE,b:UNC},by:'x'};
  await B.propose(b);const P=B.S.prop[b.id];
  ok('the bet finds the game on ET day 20261106 and proposes a settle (Duke 80-70)',P&&P.st==='final'&&P.sa===80&&P.sb===70&&P.g==='401',P);
  ok('first ?dates= asked is the ET day of (placed - 3 h), not the viewer\'s day',asked[0]==='20261106',asked);
  ok('S25.etDay: 09:00 WIB Sat Nov 7 is ET day 2026-11-06 in every viewer zone',ctx.S25.etDay(b.ts)==='2026-11-06');
  ok('partner check: 2026-10-31T03:30Z etDay 2026-10-30; localDay = the device day',ctx.S25.etDay(new Date('2026-10-31T03:30Z'))==='2026-10-30'&&ctx.S25.localDay(new Date('2026-10-31T03:30Z'))===(process.env.TZ==='Asia/Jakarta'?'2026-10-31':'2026-10-30'));
  ok('League has no game-day helper of its own (uses S25.etDay)',!/LGDAY|America\/New_York/.test(['js/league-d.js','js/league-bets.js','js/league-sched.js','js/leaguehome.js'].map(rd).join('')));
  /* 7-day window in ET days */
  asked.length=0;const b2={id:'etbet00002',ts:Date.UTC(2026,10,1,15,0),c:{t:'win',a:'1',b:'2'},by:'x'};Date.now=()=>Date.UTC(2026,10,30);await B.propose(b2);
  ok('search window = 7 consecutive ET days from the ET day of (placed - 3 h)',JSON.stringify(asked)===JSON.stringify(['20261101','20261102','20261103','20261104','20261105','20261106','20261107']),asked);
  ok('no game: stays manual (st none)',B.S.prop[b2.id].st==='none');
  /* display stays local: LTIME stamp has a zone label */
  ok('display still local with a label (LTIME.stamp)',/\b(WIB|GMT\+7|PST|PDT|GMT-[78])\b/.test(ctx.LTIME.stamp(b.ts)),ctx.LTIME.stamp(b.ts));
  Date.now=RealNow;console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));process.exit(bad?1:0)})();

}
