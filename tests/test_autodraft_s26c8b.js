/* s26c8b Auto-draft me: permission rule, toggle state (pref doc -> st.auto), delays, undo hold, pick-selection equivalence with the timeout auto-pick. */
const F=require('../js/core.js');let n=0,bad=0;const t=(m,c)=>{n++;if(c)console.log('ok   '+m);else{bad++;console.log('FAIL '+m)}};
const {startAny}=require('./start_any.js');
const mids=['m1','m2','m3','m4','m5','m6','m7','m8'];
const s0={name:'X',mgrName:'A',teamName:'A',managers:8,rounds:8,type:'snake',startAt:null,startMode:'manual',orderMode:'manual',clockSecs:60,autoPick:true};
let meta=F.defaultMeta('T1',s0,null);meta.order=mids.slice();meta.orderSet=true;meta=startAny(meta,mids,1000,'seed',162).state;
const pool=[];for(let i=1;i<=80;i++)pool.push('t'+i);const POOLSET=new Set(pool);const prank=x=>+x.slice(1)%7===0?0:+x.slice(1);
// permissions
t('manager may set own',F.canSetAuto('m1',false,'m1'));t('manager may NOT set another',!F.canSetAuto('m1',false,'m2'));
t('spectator (no mid) may not',!F.canSetAuto(null,false,'m2'));t('commissioner may set anyone',F.canSetAuto(null,true,'m2')&&F.canSetAuto('m3',true,'m2'));
t('truthy non-true cmOk does not count',!F.canSetAuto('m1','yes','m2'));t('no target -> no',!F.canSetAuto('m1',true,''));
// toggle state
let st=F.deriveState(meta,{},{m1:{auto:true,queue:['t5']},m2:{auto:false,queue:[]}},POOLSET);
t('pref auto:true -> st.auto',st.auto.m1===true&&st.auto.m2===false);
const ow=F.onClock(st).owner;t('first pick owner m1 -> reason auto',ow==='m1'&&F.autoReason(st,1001,1800)==='auto');
const lob=F.defaultMeta('T2',s0,null);const sl=F.deriveState(lob,{},{m1:{auto:true,queue:[]}},POOLSET);t('set in lobby: st.auto reads it before start',sl.auto.m1===true&&sl.status==='lobby');
st.paused=true;t('paused -> no auto reason',F.autoReason(st,1001,0)===null);st.paused=false;
let st2=F.deriveState(meta,{},{m1:{auto:false,queue:[]}},POOLSET);t('OFF -> no reason before clock',F.autoReason(st2,1001,1800)===null);t('OFF -> expired after clock',F.autoReason(st2,1000+61000+1801,1800)==='expired');
// delays
t('auto delay 2 s',F.autoDelayMs('auto',false)===2000&&F.autoDelayMs('away',false)===2000);t('expired 0',F.autoDelayMs('expired',false)===0);t('bot 1-2 s',F.autoDelayMs('auto',true,0.5)===1500);
// selection equivalence: same function, same seeded args, whatever the reason
const ents={};let prev='';
for(let k=1;k<=64;k++){const s=F.deriveState(meta,ents,{m1:{auto:true,queue:['t3','t9']},m3:{auto:true,queue:[]}},POOLSET);const so=F.onClock(s);
  const a=F.autoChoice(s,so.owner,pool,F.mulberry(k*7919),prank);const b=F.autoChoice(Object.assign({},s,{auto:{}}),so.owner,pool,F.mulberry(k*7919),prank);
  if(JSON.stringify(a)!==JSON.stringify(b)){t('equivalence at '+k,false);break}
  const e=F.makeEntry(k,so.owner,a.tid,{by:'auto',now:2000+k,epoch:meta.epoch,prev,voided:meta.voided});prev=e.id;ents[k]=e}
const fin=F.deriveState(meta,ents,{},POOLSET);t('64 picks replay, all distinct, complete',fin.picks.length===64&&new Set(fin.picks.map(p=>p.tid)).size===64&&fin.status==='complete');
t('m1 queue honoured first',fin.picks[0].tid==='t3');
// undo hold
const e1=ents[1];const mu=F.mUndo(meta,F.deriveState(meta,{1:e1},{},POOLSET),{n:1,id:e1.id},50000).state;
t('undo hold = undo time + 10 s',F.undoHoldUntil(mu,e1,false)===60000);t('no hold for bots',F.undoHoldUntil(mu,e1,true)===0);t('no hold when slot entry not voided',F.undoHoldUntil(meta,e1,false)===0);
const re=F.makeEntry(1,'m1',e1.tid,{by:'auto',now:61000,epoch:mu.epoch,prev:'',voided:mu.voided});t('re-pick after undo gets u1 id and replays',re.id===e1.id+'u1'&&F.replay(mu,{1:re},POOLSET).picks.length===1);
t('autoBase = latest of last pick ts / start / resume',F.autoBase({startedAt:5,resumeAt:9},[{ts:7},{ts:0,skip:true}])===9&&F.autoBase({startedAt:5,resumeAt:0},[{ts:70}])===70);
console.log(`${n-bad} passed, ${bad} failed`);process.exit(bad?1:0);
