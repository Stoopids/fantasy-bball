/* TEST-ONLY helper (never shipped, not in the bundle): starts a lobby meta with fewer (or more) than 8 managers, for unit tests and for
   seeding legacy-count leagues. The shipped F.mStart refuses anything but exactly F.MANAGERS (8) managers; this copies its tail without that rule. */
const F=require('../js/core.js');
const clone=o=>JSON.parse(JSON.stringify(o));
function startAny(m,joined,now,seedStr,poolSize){
  if(m.status!=='lobby')return{error:'The draft already started.'};
  const s=m.settings;if(joined.length*s.rounds>(poolSize||1e9))return{error:'Not enough teams for that many managers and rounds.'};
  const n=clone(m);let order=F.effectiveOrder(m,joined);
  if(!m.orderSet&&s.orderMode==='random')order=F.shuffled(order,F.mulberry(F.hash32(seedStr||m.id)));
  n.order=order;n.orderSet=true;n.status='live';n.paused=false;n.pausedLeft=null;n.startedAt=now;n.resumeAt=now;return{state:n}}
module.exports={startAny};
