/* Read Ball's existing per-manager bet logs and present them in the shape the STOOPIDS bets page already draws.
   Logs stay in their stored form. This file never rewrites them. New bets from the STOOPIDS page go in a separate document. */
(function(root){
'use strict';
const C={min:5,max:1000,maxOdds:100,maxText:140,maxEv:400};
const idOk=v=>typeof v==='string'&&/^[a-z0-9]{6,24}$/.test(v);
const midOk=v=>typeof v==='string'&&/^[0-9a-f]{8,32}$/.test(v);
function clean(t){t=String(t==null?'':t).replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/\s+/g,' ').trim();return Array.from(t).slice(0,C.maxText).join('')}
function vEv(e){
  if(!e||typeof e!=='object')return null;
  const ts=Number(e.ts);if(!isFinite(ts)||ts<1e12||ts>4e12||!idOk(e.u)||!idOk(e.id))return null;
  if(e.k==='p'){const amt=Number(e.amt),a=Number(e.a),b=Number(e.b);
    if(!(e.to==='*'||midOk(e.to))||!Number.isInteger(amt)||amt<C.min||amt>C.max||!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a>C.maxOdds||b>C.maxOdds||typeof e.text!=='string')return null;
    const text=clean(e.text);if(!text)return null;
    const fr=midOk(e.for)&&e.for!==e.to?e.for:undefined;
    return{k:'p',u:e.u,ts,id:e.id,to:e.to,for:fr,amt,a,b,text,g:typeof e.g==='string'?e.g:undefined,v:e.v===25?25:undefined,postedBy:midOk(e.postedBy)?e.postedBy:undefined,postedAt:Number(e.postedAt)||undefined}}
  if(e.k==='a'||e.k==='d'||e.k==='w')return{k:e.k,u:e.u,ts,id:e.id,v:e.v===25?25:undefined};
  if(e.k==='s'&&(e.r==='b'||e.r==='o'||e.r==='p'))return{k:'s',u:e.u,ts,id:e.id,r:e.r,v:e.v===25?25:undefined};
  if(e.k==='pl'){const amt=Number(e.amt);
    if(!Array.isArray(e.parts)||e.parts.length<2||!e.parts.every(midOk)||!Number.isInteger(amt)||typeof e.text!=='string')return null;
    const text=clean(e.text);if(!text)return null;
    return{k:'pl',u:e.u,ts,id:e.id,parts:e.parts.slice(),amt,text,places:Array.isArray(e.places)?e.places.slice():undefined,postedBy:midOk(e.postedBy)?e.postedBy:undefined,postedAt:Number(e.postedAt)||undefined}}
  if(e.k==='pb'&&e.back&&typeof e.back==='object')return{k:'pb',u:e.u,ts,id:e.id,back:Object.assign({},e.back)};
  return null}
function parseLog(txt){try{if(!txt||!String(txt).trim())return[];let d=JSON.parse(txt);if(typeof d==='string')d=JSON.parse(d);const ev=d&&Array.isArray(d.ev)?d.ev:[];return ev.slice(0,C.maxEv).map(vEv).filter(Boolean)}catch(e){return[]}}
/* Same accept rule as js/league-bets.js when LACCEPT_FLOW is off (the shipped default): a named opponent is open at once. */
function reduce(logs,mids,now){
  const set=new Set(mids),all=[];
  mids.forEach(mid=>{(logs[mid]||[]).forEach((e,i)=>{all.push({e,mid,i})})});
  all.sort((x,y)=>x.e.ts-y.e.ts||(x.mid<y.mid?-1:1)||x.i-y.i);
  const bets=new Map(),seen=new Set();let n=0;
  for(const{e,mid}of all){if(seen.has(mid+'|'+e.u))continue;seen.add(mid+'|'+e.u);
    if(e.k==='p'){const fr=e.for&&e.for!==mid?e.for:null,by=fr||mid;
      if(bets.has(e.id)||(fr&&(!set.has(fr)||e.to==='*'))||(e.to!=='*'&&(!set.has(e.to)||e.to===by)))continue;
      const nb={id:e.id,n:++n,by,to:e.to,amt:e.amt,a:e.a,b:e.b,text:e.text,g:e.g,ts:e.ts,status:'pending',acc:null,reps:{},res:null,v25:e.v===25,postedBy:e.postedBy,postedAt:e.postedAt};
      if(e.to!=='*'){nb.status='open';nb.acc=e.to;nb.accTs=e.ts}
      bets.set(e.id,nb);continue}
    if(e.k==='pl'){if(bets.has(e.id)||!e.parts.includes(mid))continue;
      bets.set(e.id,{kind:'pool',id:e.id,n:++n,by:mid,parts:e.parts,amt:e.amt,places:e.places,text:e.text,ts:e.ts,status:'open',back:null,postedBy:e.postedBy,postedAt:e.postedAt});continue}
    const b=bets.get(e.id);if(!b)continue;
    if(b.kind==='pool'){
      if(e.k==='pb'&&mid===b.by&&b.status==='open'&&!b.back){const bk={};let ok=true;b.parts.forEach(p=>{const v=e.back[p];if(v!=null&&(!Number.isInteger(v)||v<0))ok=false;bk[p]=v||0});if(ok)b.back=bk}
      else if(e.k==='w'&&mid===b.by&&b.status==='open'&&!b.back)b.status='void';
      continue}
    if(e.k==='a'){if(b.status!=='pending'||mid===b.by||(b.to!=='*'&&b.to!==mid))continue;b.acc=mid;b.accTs=e.ts;b.status='open'}
    else if(e.k==='d'){if(b.status==='pending'&&(b.to===mid))b.status='declined'}
    else if(e.k==='w'){if(b.status==='pending'&&mid===b.by)b.status='withdrawn'}
    else if(e.k==='s'&&e.v===25){if((b.status==='open'||b.status==='reported')&&mid===b.by){b.status='settled';b.res=e.r;b.settledTs=e.ts}}
    else if(e.k==='s'){if(b.v25||(b.status!=='open'&&b.status!=='reported')||(mid!==b.by&&mid!==b.acc))continue;
      b.reps[mid]={r:e.r,ts:e.ts};const o=mid===b.by?b.acc:b.by,ro=b.reps[o];
      if(ro&&ro.r===e.r){b.status='settled';b.res=e.r;b.settledTs=e.ts}else if(ro)b.status='disputed';else b.status='reported'}}
  return [...bets.values()]}
const ST={b:'backer',o:'other',p:'push'};
function facts(b,nameOf){const nm=m=>nameOf[m]||m;
  if(b.kind==='pool')return{id:b.id,n:b.n,kind:'pool',text:b.text,amt:b.amt,by:nm(b.by),parts:(b.parts||[]).map(nm),status:b.status,settled:!!b.back};
  const st=b.status==='settled'?ST[b.res]||'open':(b.status==='void'?'void':(b.status==='declined'||b.status==='withdrawn'?b.status:'open'));
  return{id:b.id,n:b.n,text:b.text,amt:b.amt,a:b.a,b:b.b,by:nm(b.by),to:nm(b.acc||b.to),status:b.status==='pending'?'pending':st,raw:b.status}}
function toRecords(list,nameOf){
  const names=new Set(Object.values(nameOf)),bets=[],reqs=[];
  list.forEach(b=>{const f=facts(b,nameOf);
    if(b.kind==='pool'){if(b.status==='void'||b.status==='open')bets.push({id:b.id,n:b.n,kind:'pool',backer:f.by,parts:f.parts,amt:b.amt,text:b.text,status:b.status==='void'?'void':'open',created_at:new Date(b.ts).toISOString(),settled_at:null,places:b.places,back:b.back?Object.fromEntries(b.parts.map(p=>[nameOf[p]||p,b.back[p]||0])):null,postedBy:b.postedBy?nameOf[b.postedBy]:undefined,postedAt:b.postedAt?new Date(b.postedAt).toISOString():undefined});return}
    if(b.status==='pending'){reqs.push({id:b.id,status:'open',by:f.by,to:[f.to].filter(x=>x&&x!=='*'),txt:b.text,lab:b.text,amt:b.amt,odds:[b.a,b.b],at:b.ts,exp:b.ts+14*86400000,wk:'unknown'});return}
    if(b.status==='declined'||b.status==='withdrawn')return;
    const status=b.status==='settled'?(ST[b.res]||'open'):'open';
    if(!names.has(f.by)||!names.has(f.to))return;
    bets.push({id:b.id,n:b.n,backer:f.by,other:f.to,amt:b.amt,odds:{a:b.a,b:b.b},text:b.text,created_at:new Date(b.ts).toISOString(),status,settled_at:b.settledTs?new Date(b.settledTs).toISOString():null,postedBy:b.postedBy?nameOf[b.postedBy]:undefined,postedAt:b.postedAt?new Date(b.postedAt).toISOString():undefined})});
  bets.sort((a,b)=>a.n-b.n);return{bets,reqs}}
function view(logTexts,nameOf,sideText){
  const mids=Object.keys(logTexts||{});
  const logs={};mids.forEach(m=>{logs[m]=parseLog(logTexts[m])});
  const reduced=reduce(logs,mids,Date.now());
  const rec=toRecords(reduced,nameOf||{});
  let extra=[];try{let d=JSON.parse(sideText||'{}');if(typeof d==='string')d=JSON.parse(d);extra=d&&Array.isArray(d.bets)?d.bets:[]}catch(e){extra=[]}
  const have=new Set(rec.bets.map(b=>b.id));
  extra.forEach(b=>{if(b&&b.id&&!have.has(b.id))rec.bets.push(b)});
  return{v:1,bets:rec.bets,reqs:rec.reqs,facts:reduced.map(b=>facts(b,nameOf||{}))}}
const api={parseLog,reduce,facts,toRecords,view,clean};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BALLBets=api;
})(typeof window!=='undefined'?window:globalThis);
