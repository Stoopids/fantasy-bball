'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
function load(file){
  const ui=fs.readFileSync(file,'utf8');
  const ctx={console,setTimeout,clearTimeout,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},navigator:{},document:{readyState:'loading',head:{appendChild(){}},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{},setAttribute(){},select(){},remove(){},appendChild(){}}),body:{appendChild(){}}}};
  ctx.window=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);vm.runInContext(ui,ctx);
  return ctx.SHARED_UI.Requests({
    me:()=>'Paul E',nick:id=>id,real:id=>id,others:()=>[],games:()=>[],
    get:async()=>'{"v":1,"reqs":[]}',set:async()=>{},render(){},canWrite:()=>true,placeBet:async()=>{},change:'',e:s=>String(s==null?'':s)
  });
}
const ball=load(path.join(__dirname,'..','shared/ui.js'));
const stoop=load(path.join(__dirname,'..','..','stoopids','shared/ui.js'));
const now=Date.now();
const rd={k:'spread',t:'Siena',o:"St John's",l:28.5,sp:'mcbb',d:'2026-11-18'};
const siena={id:'r1',status:'open',by:'Paul E',to:['Jim'],amt:5,odds:[1,1],slots:1,txt:"Siena +28.5 v St John's",lab:"Siena +28.5 v St John's",exp:Date.parse('2026-11-19T00:00:00Z'),at:now,wk:'game',gid:'401920682',start:'2026-11-19T00:00Z',rd,took:[],dec:[]};
const plain={id:'r2',status:'open',by:'Paul E',to:['Jim'],amt:5,odds:[1,1],slots:1,txt:'Duke +5.5 vs UConn -5.5',lab:'Duke +5.5',exp:now+3*3600000,took:[],dec:[],gid:'g',start:new Date(now+86400000).toISOString()};
const acc='💥 $5 Paul E v Jim — Accepted 💥\nSiena +28.5 v St John\'s\nNov 18';
assert.strictEqual(ball.waText(siena,'acc','Jim'),acc);
assert.ok(!ball.waText(siena,'acc','Jim').includes('💣'));
assert.ok(!/Exp:/.test(ball.waText(siena,'acc','Jim')));
assert.strictEqual(ball.waText(plain,'acc','Jim'),stoop.waText(plain,'acc','Jim'));
assert.strictEqual(ball.waText(plain,'acc','Jim'),'💥 $5 Paul E v Jim — Accepted 💥\nDuke +5.5 vs UConn -5.5');
for(const kind of ['new','del','close','bet','settle']){
  assert.strictEqual(ball.waText(siena,kind,'Jim'),stoop.waText(siena,kind,'Jim'),kind);
  assert.strictEqual(ball.waText(plain,kind,'Jim'),stoop.waText(plain,kind,'Jim'),kind+' plain');
}
const open=ball.waText(siena,'new');
assert.ok(open.startsWith('💣 $5 Paul E v Jim 💣\nSiena +28.5 v St John\'s\nNov 18 · Exp: Tip'),open);
console.log('ok accepted copy uses the exploding bomb');
