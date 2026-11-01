/* s26c16 unit: 8-joined start is unchanged vs the s26c14 core; placeholders take their rows; Lock order rules. */
const assert=require('assert');const F=require('../js/core.js');const path=require('path');
const F0=(()=>{const p=process.env.BASE_CORE||'/workspace/fantasy-bball-releases/s26c14/js/core.js';delete require.cache[require.resolve('../js/core.js')];const x=require(p);delete require.cache[p];return x})();
let n=0,bad=0;const t=(m,f)=>{n++;try{f();console.log('  ok  '+m)}catch(e){bad++;console.log('FAIL  '+m+'  -> '+e.message)}};
const J8='abcdefgh'.split('').map(c=>c.repeat(12));
const mk=(o)=>{const m=F.defaultMeta('ID'+o.seed,Object.assign({},F.DEFAULTS,{orderMode:o.mode}),null);if(o.set){m.order=J8.slice().reverse();m.orderSet=true}return m};
t('8 joined: mStart order identical to s26c14 (random/manual, orderSet or not, autoSpin or not, 40 seeds)',()=>{for(let s=0;s<40;s++)for(const mode of ['random','manual'])for(const set of [false,true])for(const as of [false,true]){
  const m=mk({seed:s,mode,set});const a=F.mStart(m,J8,1000,'seed'+s,999,{autoSpin:as}).state,b=F0.mStart(JSON.parse(JSON.stringify(m)),J8,1000,'seed'+s,999,{autoSpin:as}).state;assert.deepStrictEqual(a.order,b.order);assert.deepStrictEqual(a.over,b.over)}});
t('fewer than 8 without placeholders is still refused',()=>{assert.ok(F.mStart(mk({seed:1,mode:'manual'}),J8.slice(0,6),1,'x',999,{}).error)});
const S6=['Skyler','B','Lucas','JT','Jim','Paul E','Chris Maclean','Murphy'].map((x,i)=>'m'+i+'aaaaaaaaaa');
t('placeholders take their rows exactly (orderSet, fixed)',()=>{const m=mk({seed:2,mode:'random'});const j=S6.filter((_,i)=>i!==4&&i!==7);m.order=[S6[0],S6[1],S6[2],S6[3],'e1',S6[5],S6[6],'e2'];m.orderSet=true;
  const r=F.mStart(m,j.concat(['p1aaaaaaaaaa','p2aaaaaaaaaa']),1,'x',999,{phMap:{e1:'p1aaaaaaaaaa',e2:'p2aaaaaaaaaa'},fixed:true});assert.deepStrictEqual(r.state.order,[S6[0],S6[1],S6[2],S6[3],'p1aaaaaaaaaa',S6[5],S6[6],'p2aaaaaaaaaa']);assert.ok(r.state.over.p1aaaaaaaaaa.ph)});
t('random mode, no orderSet: placeholders join the shuffle',()=>{const m=mk({seed:3,mode:'random'});const r=F.mStart(m,J8.slice(0,6).concat(['p1aaaaaaaaaa','p2aaaaaaaaaa']),1,'x',999,{phMap:{e1:'p1aaaaaaaaaa',e2:'p2aaaaaaaaaa'}}).state.order;assert.strictEqual(r.length,8);assert.notDeepStrictEqual(r.slice(6),['p1aaaaaaaaaa','p2aaaaaaaaaa'])});
t('manual mode, no orderSet: placeholders appended at the end',()=>{const m=mk({seed:3,mode:'manual'});const r=F.mStart(m,J8.slice(0,6).concat(['p1aaaaaaaaaa','p2aaaaaaaaaa']),1,'x',999,{phMap:{e1:'p1aaaaaaaaaa',e2:'p2aaaaaaaaaa'}}).state.order;assert.deepStrictEqual(r,J8.slice(0,6).concat(['p1aaaaaaaaaa','p2aaaaaaaaaa']))});
t('Lock order: moves refused; a joiner skips the NAMED empty row; join refused when only named rows are left; Start uses the order (no shuffle)',()=>{const m=mk({seed:4,mode:'random'});m.order=[S6[0],'e1','e2'];m.orderSet=true;m.seatNames={e1:'B'};
  let r=F.mOrderLock(m,[S6[0]],true).state;assert.ok(r.orderLock);assert.ok(F.mMove(r,[S6[0]],S6[0],1).error);assert.ok(F.mSetOrder(r,[S6[0]],[S6[0]]).error);
  const lo=F.lobbyOrder(r,[S6[0],S6[2]]);assert.strictEqual(lo[1],'e1');assert.strictEqual(lo[2],S6[2]);
  const full=Object.assign({},r,{order:[S6[0],'e1'].concat(S6.slice(2))});assert.ok(!F.canJoinLocked(full,[S6[0]].concat(S6.slice(2))));assert.ok(F.canJoinLocked(r,[S6[0]]))});
t('placeholder seat: picked at once only when there is no clock; clock-out otherwise',()=>{const st={paused:false,away:{},auto:{},ph:{x:true},autoPick:true,clockSecs:30,deadline:100};const oc=F.onClock;F.onClock=()=>({owner:'x'});try{assert.strictEqual(F.autoReason(st,50,0),null);assert.strictEqual(F.autoReason(st,200,0),'expired');st.clockSecs=0;assert.strictEqual(F.autoReason(st,50,0),'away')}finally{F.onClock=oc}});
t('placeholder name: typed name, else Seat N',()=>{assert.strictEqual(F.placeholderName({seatNames:{e1:'Jim'}},'e1',5),'Jim');assert.strictEqual(F.placeholderName({},'e2',8),'Seat 8')});
console.log('\n'+(n-bad)+' passed, '+bad+' failed');process.exit(bad?1:0);
