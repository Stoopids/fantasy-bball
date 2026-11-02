/* League site "Bets" tab: friendly bets between the league's 8 managers, paid in PUSHUPS (not a stake unit). Bets tab
   (pick opponents, say what the bet is, amount, odds, confirm, who owes who, net per manager, bet cards) with one deliberate difference: the other
   manager has to ACCEPT a bet (or decline it), and only the manager who placed a bet settles it (s25); a settled result can be corrected when both sides agree.
   DATA (all keys are this league's own, namespaced like every other key: fbn1-<league>-bets-<mid>):
     each manager owns ONE key, fbn1-<id>-bets-<mid>, holding an append-only log {v:1,ev:[...]} of that manager's own events. Nobody ever writes to
     another manager's key, so two managers writing at the same time cannot overwrite each other. A manager's own two devices are covered by
     read - append - write - read back (verify) - retry, and every event has a unique id (u) so a retry never double-posts.
     events:  p = propose {id,to:<mid>|'*'(anyone),amt,a,b,text,g}   a = accept {id}   d = decline {id}   w = withdraw {id}   s = report the result {id,r:b|o|p}
     b = the proposer was right, o = the other manager was right, p = wash (nobody owes anything)
   s24 Fix result (two-sided correction of a SETTLED bet):  fr = fix request {id,fx,r}  fc = fix confirm {id,fx}  fd = fix decline / withdraw {id,fx}
     only the two sides of the bet may write these, each in their OWN log; fc only counts from the side that did NOT ask; fd from the asker = withdraw, from the other side = decline.
     One request is active at a time: a new request from the same side replaces its old one; a request from the other side with the SAME result counts as agreement
     (applied), with a different result it replaces the old one (the first side then has to confirm). The result and pushup totals change only when a request is confirmed.
     Every request is kept in b.fixes (history shown on the card).
   Everyone reads all 8 logs and computes the same bets with reduce(): an event only counts if it sits in the log of the manager who is allowed to do it
   (only the proposer proposes / withdraws, only the target accepts / declines, only the two sides report), so a forged event in someone else's log is ignored.
   Result rule (s25): the manager who placed the bet settles it (settle events marked v:25). Settle events without the marker were written before s25 and keep the s24 rule: one side reports, the other agrees (settled) or answers differently (disputed); a lone report settles by itself after 48 h.
   Who am I: the manager link already on this device (UI.getMe + the salted hash in the manager's claim); no identity = read only (spectator).
   Text is cleaned (control chars, e-mails and phone numbers hidden), capped (140 chars, 400 events / 60 KB per manager), escaped on output.
   A failed read keeps the last good bets on screen with a small "offline" note; reads and writes retry with back-off. No server. */
(function(){
const C={amounts:[5,10,20,50,100],min:5,max:1000,odds:[[1,1],[2,1],[3,1],[4,1],[5,1]],maxOdds:100,maxText:140,maxEv:400,maxBytes:60000,pollMs:60000,pollOpenMs:15000,autoMs:48*3600e3,confirmMs:700,undo:true};
const pu=n=>n+' pushup'+(n===1?'':'s');
/* s28: the Bets page is a copy of the partner Bets page: plain whole numbers (no unit word) on the page; the unit is named once, in the disclaimer. */
const DISCLAIMER="Bets here are just for fun and are settled in pushups, not money. Betting is Stoopid, and we don't endorse or facilitate gambling for money.";
/* s28 POOL (partner <POOL> + <S26F-POOL>): one group entry; every participant puts in the same buy-in; payouts (by place, or name:amount) must add up to the pot; each person's net = got back - buy-in.
   All Pool wording lives here (the partner's POOL_TXT; only the examples are League numbers, since the League reads whole numbers only, no 250K / 1.2mil). {x} = filled in by PT(). */
const POOL_MAX=1e6;
const POOL_TXT={toggle:'Pool / buy-in',toggleBet:'One side vs another',youIn:'(you are in automatically)',
  fPay:'Payouts when done (total received), e.g. ana:80, ben:20',s1:'What’s the pool?',s2:'Who’s in?',s3:'Buy-in per person',s4:'Payouts by place',termsPh:'e.g. season-long tournament pool',buyPh:'e.g. 50',
  potLine:'Pot: {n} × {buy} = {pot}',potWait:'Pot: pick who’s in and a buy-in',addPlace:'+ Add place',payOpt:'Optional: leave blank to fill in when it’s over.',sumLine:'Adds up to {sum} of {pot}',
  ePlaceSum:'Payouts add up to {sum} but the pot is {pot} ({diff} {way}).',short:'short',over:'over',ePlaceNum:'Use whole numbers for the payouts (like 400).',pickWho:'Who finished where?',pickOne:'Pick…',ePickAll:'Pick someone for every place.',payLine:'Payouts: {x}',
  helpPl:'Amounts only; you pick who finished where when you settle it. They must add up to the pot.',build:'Build',
  eTerms:'Write the terms of the pool first.',ePeople:'a pool needs 2+ participants',eBuy:'pool needs a buy-in like 50',eBuyMin:'buy-in must be a whole number of at least {min} (like 50)',eBadPay:"can't read one of the payouts (try 80, 20)",eFmt:'Write each payout as name:amount, like ana:80.',
  eSum:'payouts add up to {sum} but the pot is {total}',eUnknown:'Unknown name "{x}". Use these short names for payouts: {keys}',eNotIn:'"{x}" is not in this pool.',eDup:'"{x}" is listed twice.',eEmptyPay:'Fill in the payouts first.',
  confirmTitle:'Check it, then confirm',sum:'Pool of {names} · buy-in {buy} each · total {tot}',open:'Payouts left open: it stays open until someone fills them in below.',
  row:'{name}: gets {got}, net {net}',settleUp:'{from} owes {to} {n}',go:'✅ Yes, build it',change:'← Change',
  placed:'Built! Pool #{n} is open until the payouts are entered. You can undo it for 30 seconds.',
  word:'Pool',stOpen:'Open',stDone:'Settled',stVoid:'Cancelled',who:'{n} managers',with:'With: {names}',line:'Buy-in each {buy} · total {tot}',noPay:'Payouts not entered yet.',
  save:'Save payouts',again:'Tap again to confirm',cancel:'Cancel this pool',undo:'↩ Undo this pool (30 s)',result:'Result',saved:'Saved.',
  only:'Only the person who placed this bet can settle it.',cantSave:'Couldn’t save. Check your connection and tap Build again (it won’t double-post).'};
const PT=(k,v)=>String(POOL_TXT[k]).replace(/\{(\w+)\}/g,(_,n)=>v&&n in v?v[n]:'');
const PLACES=['Winner','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];const placeName=i=>PLACES[i]||((i+1)+'th');
const poolNum=x=>{x=String(x==null?'':x).trim();if(!/^\d{1,7}$/.test(x))return null;const v=parseInt(x,10);return v<=POOL_MAX?v:null};
const num=n=>Math.round(n).toLocaleString('en-US');
const signed=n=>(n>0?'+':'')+num(n);
const idOk=v=>typeof v==='string'&&/^[a-z0-9]{6,24}$/.test(v);
const midOk=v=>typeof v==='string'&&/^[0-9a-f]{8,32}$/.test(v);
let H=null;const SENT=new Map();   /* events this device wrote, kept so a lost update (two devices of mine writing at the same instant) is healed on the next look */
const S={more:{},rxWho:null,prop:{},autoFix:{},logs:{},got:{},state:'init',fails:0,timer:null,busy:false,msg:'',bad:false,started:false,sig:'',ask:null,me:null,stale:0,
  f:{opps:[],open:false,text:'',amt:null,amtCustom:false,amtTxt:'',amtErr:'',odds:[1,1],custom:false,customTxt:'',oddsErr:'',confirm:false},fid:null,kind:'bet',p:{text:'',pp:[],entry:'',places:['',''],showErr:{},confirm:false},pid:null,poolTxt:{},poolErr:{},placeWho:{},qb:'',q:{g:null,amt:5,vs:null,msg:''},undoT:null};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY=mid=>FBN.Keys(H.id).base+'-bets-'+mid;
/* ---------- pure helpers ---------- */
function clean(t,max){t=String(t==null?'':t).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g,' ').replace(/\s+/g,' ').trim();
  t=t.replace(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi,'[hidden]');t=t.replace(/\+?\(?\d[\d\s().\-]{6,}\d/g,m=>m.replace(/\D/g,'').length>=8?'[hidden]':m);
  const a=Array.from(t);return(a.length>(max||C.maxText)?a.slice(0,max||C.maxText).join(''):t).trim()}
function parseAmt(t){const s=String(t==null?'':t).trim();if(!s)return{ok:false,err:'Type an amount (whole number, '+C.min+' to '+C.max+').'};if(/^-/.test(s))return{ok:false,err:'Minimum amount is '+C.min+'.'};
  if(!/^\d{1,6}$/.test(s))return{ok:false,err:'Whole numbers only, like 25.'};const n=parseInt(s,10);if(n<C.min)return{ok:false,err:'Minimum amount is '+C.min+'.'};if(n>C.max)return{ok:false,err:'Maximum amount is '+C.max+'.'};return{ok:true,n}}
function parseOdds(t){const s=String(t==null?'':t).trim().replace(/\s+/g,'');if(!s)return{ok:false,err:'Type odds like 7-2 or 10-1.'};const m=s.match(/^(\d{1,4})[-\/:](\d{1,4})$/);
  if(!m)return{ok:false,err:'Use two whole numbers like 7-2, 7/2 or 7:2.'};const a=parseInt(m[1],10),b=parseInt(m[2],10);if(a<1||b<1)return{ok:false,err:'Both numbers must be at least 1.'};
  if(a>C.maxOdds||b>C.maxOdds)return{ok:false,err:'Both numbers must be '+C.maxOdds+' or less.'};return{ok:true,a,b}}
const win=(amt,a,b)=>Math.max(1,Math.floor((amt*a*2+b)/(2*b)));      /* amt x a/b rounded half up, whole number, never below 1 */
const rounded=(amt,a,b)=>(amt*a)%b!==0;
const oddsLabel=(a,b)=>a===1&&b===1?'Even (1-1)':a+'-'+b;
const oddsShort=(a,b)=>a===1&&b===1?'at even odds':'at '+a+'-'+b;
function vEv(e){if(!e||typeof e!=='object')return null;const ts=Number(e.ts);if(!isFinite(ts)||ts<1e12||ts>4e12||!idOk(e.u)||!idOk(e.id))return null;
  if(e.k==='p'){const amt=Number(e.amt),a=Number(e.a),b=Number(e.b);if(!(e.to==='*'||midOk(e.to))||!Number.isInteger(amt)||amt<C.min||amt>C.max||!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a>C.maxOdds||b>C.maxOdds||typeof e.text!=='string')return null;
    const text=clean(e.text);if(!text)return null;return{k:'p',u:e.u,ts,id:e.id,to:e.to,amt,a,b,text,g:idOk(e.g)?e.g:undefined,c:vClaim(e.c),v:vV(e)}}
  if(e.k==='a'||e.k==='d'||e.k==='w')return{k:e.k,u:e.u,ts,id:e.id,v:vV(e)};
  if(e.k==='s'&&(e.r==='b'||e.r==='o'||e.r==='p'))return{k:'s',u:e.u,ts,id:e.id,r:e.r,src:vSrc(e.src),v:vV(e)};
  if(e.k==='fr'&&idOk(e.fx)&&(e.r==='b'||e.r==='o'||e.r==='p'))return{k:'fr',u:e.u,ts,id:e.id,fx:e.fx,r:e.r};
  if(e.k==='rx'&&RX.includes(e.e)&&typeof e.on==='boolean')return{k:'rx',u:e.u,ts,id:e.id,e:e.e,on:e.on};
  if((e.k==='fc'||e.k==='fd')&&idOk(e.fx))return{k:e.k,u:e.u,ts,id:e.id,fx:e.fx};
  /* s28 pool: pl = build a pool {id,parts:[mids, builder included],amt:buy-in each,text,places?:[amount by place]}  pb = payouts {id,back:{mid:amount}} (builder only, counted in reduce) */
  if(e.k==='pl'){const amt=Number(e.amt);if(!Array.isArray(e.parts)||e.parts.length<2||e.parts.length>8||!e.parts.every(midOk)||new Set(e.parts).size!==e.parts.length||!Number.isInteger(amt)||amt<C.min||amt>POOL_MAX||typeof e.text!=='string')return null;
    const text=clean(e.text);if(!text)return null;const pl=Array.isArray(e.places)&&e.places.length&&e.places.length<=10&&e.places.every(v=>Number.isInteger(v)&&v>=0&&v<=POOL_MAX)&&e.places.reduce((a,v)=>a+v,0)===amt*e.parts.length?e.places.slice():undefined;
    return{k:'pl',u:e.u,ts,id:e.id,parts:e.parts.slice(),amt,text,places:pl,v:vV(e)}}
  if(e.k==='pb'&&e.back&&typeof e.back==='object'&&!Array.isArray(e.back)){const bk={};for(const k of Object.keys(e.back)){const v=e.back[k];if(!midOk(k)||!Number.isInteger(v)||v<0||v>POOL_MAX)return null;bk[k]=v}return{k:'pb',u:e.u,ts,id:e.id,back:bk,v:vV(e)}}
  return null}
/* s25: a settle confirmed from the final score carries {g: ESPN event id, sc: 'Kansas 78, Duke 71'} */
const SV=25;   /* s25 version marker on new events */
const vV=e=>e.v===SV?SV:undefined;
function vSrc(x){return x&&typeof x==='object'&&typeof x.g==='string'&&/^\d{1,12}$/.test(x.g)&&typeof x.sc==='string'&&x.sc.length<=80?{g:x.g,sc:x.sc.replace(/[<>]/g,'')}:undefined}
function parseLog(txt){try{if(!txt||!String(txt).trim())return[];let d=JSON.parse(txt);if(typeof d==='string')d=JSON.parse(d);const ev=d&&Array.isArray(d.ev)?d.ev:[];return ev.slice(0,C.maxEv).map(vEv).filter(Boolean)}catch(e){return[]}}
/* logs: {mid:[events]}  mids: the league's managers. Every event is checked against WHO wrote it (= whose log it is in). */
function reduce(logs,mids,now){const set=new Set(mids),all=[];
  /* legacy = written before s25. Decided by the v:25 marker and by log order (never by the clock): once a manager's own log holds a marked event,
     any later unmarked settle in that log cannot be from before s25, so it is not legacy (it is ignored). */
  mids.forEach(mid=>{let m=false;(logs[mid]||[]).forEach((e,i)=>{if(e.v===SV)m=true;all.push({e,mid,i,late:m&&e.v!==SV})})});
  const pt={};all.forEach(x=>{if((x.e.k==='p'||x.e.k==='pl')&&!(x.e.id in pt))pt[x.e.id]=x.e.ts});
  all.forEach(x=>{x.t=(x.e.k==='p'||x.e.k==='pl')?x.e.ts:Math.max(x.e.ts,(pt[x.e.id]||0)+1)});   /* a slow clock on one phone must not put an answer before the question */
  all.sort((x,y)=>x.t-y.t||(x.mid<y.mid?-1:x.mid>y.mid?1:0)||x.i-y.i);
  const bets=new Map(),seen=new Set();let n=0;
  for(const{e,mid,late}of all){if(seen.has(mid+'|'+e.u))continue;seen.add(mid+'|'+e.u);
    if(e.k==='p'){if(bets.has(e.id)||(e.to!=='*'&&(!set.has(e.to)||e.to===mid)))continue;
      bets.set(e.id,{v25:e.v===SV,id:e.id,n:++n,by:mid,to:e.to,amt:e.amt,a:e.a,b:e.b,text:e.text,g:e.g,c:e.c,rx:{},ts:e.ts,status:'pending',acc:null,reps:{},res:null,auto:false,fixes:[],fix:null});continue}
    if(e.k==='pl'){if(bets.has(e.id)||!e.parts.includes(mid)||!e.parts.every(p=>set.has(p)))continue;   /* s28 pool: the builder is always in it; numbered with the bets */
      bets.set(e.id,{kind:'pool',v25:true,id:e.id,n:++n,by:mid,parts:e.parts,amt:e.amt,places:e.places,text:e.text,rx:{},ts:e.ts,status:'open',back:null,reps:{},fixes:[],fix:null});continue}
    const b=bets.get(e.id);if(!b)continue;
    if(e.k==='rx'){const m=b.rx[e.e]||(b.rx[e.e]={});m[mid]=e.on;continue}   /* s25 reactions: latest per manager + bet + emoji wins */
    if(b.kind==='pool'){   /* s28 pool: only the builder enters the payouts (once, they must add up to the pot) or cancels it (any time before the payouts; within 30 s = undo, also after) */
      if(e.k==='pb'){if(mid!==b.by||b.status!=='open'||b.back||!Object.keys(e.back).every(k=>b.parts.includes(k)))continue;const bk={};b.parts.forEach(p=>{bk[p]=e.back[p]||0});
        if(b.parts.reduce((a,p)=>a+bk[p],0)!==b.amt*b.parts.length)continue;b.back=bk;b.settledTs=e.ts}
      else if(e.k==='w'){if(mid!==b.by||b.status!=='open'||(b.back&&e.ts-b.ts>=UNDO_MS))continue;b.status='void'}
      continue}
    if(e.k==='fr'||e.k==='fc'||e.k==='fd'){autoS(b,e.ts);if(b.status!=='settled'||(mid!==b.by&&mid!==b.acc))continue;const F=b.fix;
      if(e.k==='fr'){if(F&&F.by===mid){F.st='replaced';F.endTs=e.ts;b.fix=null}
        else if(F){if(F.to===e.r){F.st='confirmed';F.cby=mid;F.endTs=e.ts;b.res=F.to;b.fix=null;b.auto=false;continue}F.st='countered';F.endTs=e.ts;F.cby=mid;b.fix=null}
        if(e.r===b.res)continue;const x={fx:e.fx,by:mid,from:b.res,to:e.r,ts:e.ts,st:'pending'};b.fixes.push(x);b.fix=x;continue}
      if(!F||F.fx!==e.fx)continue;
      if(e.k==='fc'){if(mid===F.by)continue;F.st='confirmed';F.cby=mid;F.endTs=e.ts;b.res=F.to;b.fix=null;b.auto=false}
      else{F.st=mid===F.by?'withdrawn':'declined';F.cby=mid;F.endTs=e.ts;b.fix=null}continue}
    if(e.k==='a'){if(b.status!=='pending'||mid===b.by||(b.to!=='*'&&b.to!==mid))continue;b.status='open';b.acc=mid;b.accTs=e.ts}
    else if(e.k==='d'){if(b.status!=='pending'||b.to!==mid)continue;b.status='declined'}
    else if(e.k==='w'){if(b.status!=='pending'||mid!==b.by)continue;b.status='withdrawn'}
    else if(e.k==='s'&&e.v===SV){/* s25 settle (marked v:25): only the bet's creator, in one step; from anyone else it is ignored */
      if(!LIVE(b)||mid!==b.by)continue;b.reps[mid]={r:e.r,ts:e.ts};b.status='settled';b.res=e.r;b.settledTs=e.ts;b.src=e.src;b.auto=false}
    else if(e.k==='s'){/* legacy settle (no v marker, written before s25, on a bet placed before s25): exactly the s24 rule, so old bets are never reopened */
      if(late||b.v25||!LIVE(b)||(mid!==b.by&&mid!==b.acc))continue;
      b.reps[mid]={r:e.r,ts:e.ts};const o=mid===b.by?b.acc:b.by,ro=b.reps[o];
      if(ro&&ro.r===e.r){b.status='settled';b.res=e.r;b.settledTs=e.ts}else if(ro)b.status='disputed';else b.status='reported'}}
  const out=[...bets.values()];
  out.forEach(b=>autoS(b,now));
  return out}
/* a lone report settles by itself 48 h later (also checked at the moment a fix event arrives, so an auto-settled bet can be fixed too) */
const LIVE=b=>b.status==='open'||b.status==='reported'||b.status==='disputed';
function autoS(b,t){if(b.status==='reported'){const x=Object.keys(b.reps)[0];if(t-b.reps[x].ts>=C.autoMs){b.status='settled';b.res=b.reps[x].r;b.auto=true;b.settledTs=b.reps[x].ts+C.autoMs}}}
const payFor=b=>({right:win(b.amt,b.a,b.b),wrong:b.amt});
/* s28 Tally = the partner's tallyJS: M[from][to] gross (both directions kept), lost / won = gross sums, net = won - lost; settle lines net each pair.
   A pool with payouts counts like the partner's buildEntries pool: each loser (got back less than the buy-in) pays each winner in proportion. */
const round2=x=>Math.round(x*100)/100;
const poolNets=b=>b.parts.map(p=>[p,((b.back&&b.back[p])||0)-b.amt]);
function poolEntries(b){if(!b.back)return[];const nets=poolNets(b),debt=nets.filter(x=>x[1]<0).map(x=>[x[0],-x[1]]),cred=nets.filter(x=>x[1]>0),tot=cred.reduce((a,c)=>a+c[1],0)||1,out=[];
  debt.forEach(([d,dv])=>cred.forEach(([c,cv])=>out.push({from:d,to:c,amount:round2(dv*cv/tot)})));return out}
/* settle-up lines on a pool card (partner b27Greedy): the biggest loser owes the biggest winner, repeat */
function greedy(nets){const d=nets.filter(x=>x[1]<0).map(x=>[x[0],-x[1]]),c=nets.filter(x=>x[1]>0).map(x=>[x[0],x[1]]),out=[];const srt=a=>a.sort((p,q)=>q[1]-p[1]||String(p[0]).localeCompare(String(q[0])));
  while(d.length&&c.length){srt(d);srt(c);const m=Math.min(d[0][1],c[0][1]);out.push({from:d[0][0],to:c[0][0],num:m});d[0][1]-=m;c[0][1]-=m;if(!d[0][1])d.shift();if(!c[0][1])c.shift()}return out}
function tally(bets){const pair={},per={},M={},lost={},won={};let openN=0,openC=0,waitN=0;const P=m=>per[m]||(per[m]={net:0,bets:0});
  const ent=(f,t,c)=>{if(!c||f===t)return;M[f]=M[f]||{};M[f][t]=round2((M[f][t]||0)+c);lost[f]=round2((lost[f]||0)+c);won[t]=round2((won[t]||0)+c);P(f).net=round2(P(f).net-c);P(t).net=round2(P(t).net+c);
    const k=[f,t].sort().join('|');pair[k]=pair[k]||{x:k.split('|')[0],y:k.split('|')[1],net:0};pair[k].net=round2(pair[k].net+(t===pair[k].x?c:-c))};
  for(const b of bets){
    if(b.kind==='pool'){if(b.status!=='open')continue;if(!b.back){openN++;openC+=b.amt*b.parts.length;continue}b.parts.forEach(p=>P(p).bets++);poolEntries(b).forEach(x=>ent(x.from,x.to,x.amount));continue}
    if(b.status==='pending'){waitN++;continue}
    if(b.status==='open'||b.status==='reported'||b.status==='disputed'){openN++;openC+=b.amt;continue}
    if(b.status!=='settled')continue;P(b.by).bets++;P(b.acc).bets++;if(b.res==='p')continue;
    const p=payFor(b),w=b.res==='b'?b.by:b.acc,l=b.res==='b'?b.acc:b.by,c=b.res==='b'?p.right:p.wrong;ent(l,w,c)}
  const owes=[];Object.values(pair).forEach(p=>{if(p.net>0)owes.push({from:p.y,to:p.x,num:p.net});else if(p.net<0)owes.push({from:p.x,to:p.y,num:-p.net})});
  return{owes,per,openN,openC,waitN,M,lost,won}}
/* ---------- host ---------- */
const owners=()=>(H&&H.owners())||[];
const own=mid=>owners().find(o=>o.mid===mid)||{mid,name:'Manager',emoji:''};
const nm=mid=>own(mid).name;
/* s28 (Paul): team name on top / first, the manager's real name under it (cards, tally); sentences keep the real name */
const tmH=mid=>{const o=own(mid);return o.team_name&&o.team_name!==o.name?`<span class="tn2 tnin"><b class="tnt">${esc(o.team_name)}</b><small class="tnr">${esc(o.name)}</small></span>`:`<b>${esc(o.name)}</b>`};
const mids=()=>owners().map(o=>o.mid);
const meMid=()=>H&&H.me&&H.me();
const compute=()=>reduce(S.logs,mids(),Date.now());
const rid=()=>{const a=new Uint8Array(7);(window.crypto||window.msCrypto).getRandomValues(a);return'p'+Array.from(a,b=>('0'+b.toString(16)).slice(-2)).join('')};
const day=ms=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(ms));
function render(force){if(!H)return;if(!force){const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)&&a.closest&&a.closest('#main'))return}H.render()}
/* ---------- network (own keys only) ---------- */
async function poll(manual){
  if(!H||H.demo){return}
  const ids=mids();if(!ids.length)return;
  const res=await Promise.all(ids.map(async mid=>{try{return{mid,txt:await Store.get(KEY(mid))}}catch(e){return{mid,err:1}}}));
  let bad=0;res.forEach(r=>{if(r.err){bad++}else{S.logs[r.mid]=parseLog(r.txt);S.got[r.mid]=true}});
  S.stale=bad;if(!bad)heal();
  if(bad===0){S.fails=0;S.state='ok'}else{S.fails=Math.min(S.fails+1,5);if(bad===ids.length&&S.state==='init')S.state='error';else if(S.state==='init')S.state='ok'}
  const sig=JSON.stringify(S.logs)+'|'+S.state+'|'+S.stale;const changed=sig!==S.sig;S.sig=sig;
  schedule();
  if(changed||manual){if(H.active())render();else if(H.rerender){const nb=badge();if(nb!==S.nb){S.nb=nb;const a=document.activeElement;if(!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)))H.rerender()}}}
}
function schedule(){clearTimeout(S.timer);S.timer=null;if(document.hidden||!H||H.demo)return;
  const base=(H.active()?C.pollOpenMs:C.pollMs)*Math.pow(2,S.fails),d=Math.min(base,240000)*(0.85+Math.random()*0.3);S.timer=setTimeout(()=>poll(false),d)}
/* a second device of mine may have overwritten my log between my write and my read-back; look again a moment later and, if any of my events is gone, put it back (events are idempotent by id) */
let healing=false;
async function heal(){const me=meMid();if(!me||healing||!SENT.size||(H&&H.demo))return;healing=true;
  try{const cur=parseLog(await Store.get(KEY(me)));const have=new Set(cur.map(e=>e.u));const miss=[...SENT.values()].filter(e=>!have.has(e.u));
    if(miss.length){await append(miss);if(H&&H.active())render()}}catch(e){}finally{healing=false}}
/* append events to MY OWN log only: read, append what is missing, write, read back to verify, retry once more if a second device of mine got in between */
async function append(evs){if(window.LVIEW)throw new Error('view-only');const me=meMid();if(!me)throw new Error('nome');const key=KEY(me);
  for(let t=0;t<3;t++){
    const cur=parseLog(await Store.get(key));const have=new Set(cur.map(e=>e.u));const miss=evs.filter(e=>!have.has(e.u));
    if(!miss.length){S.logs[me]=cur;evs.forEach(e=>SENT.set(e.u,e));return cur}
    const next=cur.concat(miss);const txt=JSON.stringify({v:1,ev:next});if(next.length>C.maxEv||txt.length>C.maxBytes)throw new Error('full');
    await Store.set(key,txt);const back=parseLog(await Store.get(key));
    if(evs.every(e=>back.some(x=>x.u===e.u))){S.logs[me]=back;evs.forEach(e=>SENT.set(e.u,e));setTimeout(heal,1800);return back}}
  throw new Error('conflict')}
/* s25: every event written by this version carries v:25 (the version marker). A settle without it was written before s25 and keeps the s24 rules (see reduce). */
const mkEv=(k,o)=>Object.assign({k,u:rid(),ts:Date.now(),v:SV},o);
/* s25 (save race): after the write + read-back, wait a moment and re-read my log again; if any of my events is gone (another phone of mine wrote over it),
   put it back and check again. Only then is the save reported as done ("Placed!"); until then the message stays "Saving…". */
const sleepMs=ms=>new Promise(r=>setTimeout(r,ms));
async function confirmSaved(evs){const me=meMid(),key=KEY(me);
  for(let t=0;t<3;t++){await sleepMs(C.confirmMs);const cur=parseLog(await Store.get(key));const have=new Set(cur.map(e=>e.u));const miss=evs.filter(e=>!have.has(e.u));
    if(!miss.length){S.logs[me]=cur;return cur}await append(miss)}
  throw new Error('conflict')}
async function act(evs,okMsg){if(S.busy)return;if(!meMid()){S.msg='Open this page from your own manager link to bet.';S.bad=true;render(true);return}
  S.busy=true;S.msg='Saving…';S.bad=false;S.ask=null;render(true);
  try{await append(evs);await confirmSaved(evs);if(evs.some(e=>e.k==='s'||e.k==='fc')){const me=meMid(),b=compute().find(x=>x.id===evs[0].id);const k=b&&soundFor(b,me);if(k){S.lastSnd=[k,settleSound(k)];settlePop(k)}}S.msg=okMsg||'Saved.';S.bad=false;S.sig=JSON.stringify(S.logs)+'|'+S.state+'|'+S.stale;return true}
  catch(e){S.msg=e&&e.message==='full'?'Your bets log is full.':'Couldn’t save. Check your connection and tap the button again (it won’t double-post).';S.bad=true;return false}
  finally{S.busy=false;render(true)}}
/* ---------- form ---------- */
const others=()=>owners().filter(o=>o.mid!==meMid());
function formOK(){const me=meMid(),f=S.f;if(!me)return'Open this page from your own manager link to bet.';
  if(!f.open){const ids=others().map(o=>o.mid);if(!f.opps.length||!f.opps.every(m=>ids.includes(m)))return'Choose who you are betting against.'}
  if(!clean(f.text))return'Say what the bet is about.';
  if(!Number.isInteger(f.amt)||f.amt<C.min||f.amt>C.max)return f.amtCustom?(parseAmt(f.amtTxt).err||'Pick an amount.'):'Tap an amount or type your own (minimum '+C.min+').';
  if(!(f.odds&&f.odds[0]>=1&&f.odds[1]>=1))return'Pick the odds.';return''}
function lines(by,to,amt,a,b){const p={right:win(amt,a,b),wrong:amt};const tn=to==='*'?'whoever takes it':nm(to);
  return{top:nm(by)+' backs it: '+num(amt)+' '+oddsShort(a,b)+'.',win:'If '+nm(by)+' is right, '+tn+' owes '+nm(by)+' '+num(p.right)+'.',lose:'If '+tn+' is right, '+nm(by)+' owes '+(to==='*'?'them':nm(to))+' '+num(p.wrong)+'.',rounded:rounded(amt,a,b)}}
function liveHtml(){const f=S.f,me=meMid();if(!me||(!f.open&&!f.opps.length)||!f.amt||!f.odds)return'<span class="mut">Pick one or more opponents, an amount and the odds to see who owes what.</span>';
  const L=lines(me,f.open?'*':f.opps[0],f.amt,f.odds[0],f.odds[1]);
  return'<b>'+esc(L.top)+'</b>'+(!f.open&&f.opps.length>1?'<div class="mut b27-r">'+f.opps.length+' managers: one bet each, answered by each of them.</div>':'')+'<div class="b27-w">'+esc(L.win)+'</div><div class="b27-l">'+esc(L.lose)+'</div>'+(L.rounded?'<div class="mut b27-r">Rounded to a whole number.</div>':'')}
function summary(){const f=S.f,me=meMid();const o=f.open?'anyone':f.opps.length?f.opps.map(nm).join(', '):'…';const od=f.odds?oddsShort(f.odds[0],f.odds[1]).replace(/^at /,''):'?';const t=clean(f.text);
  const a=f.amt?num(f.amt):'?',cnt=f.open?a:f.opps.length>1?a+' each':f.opps.length===1?'1 bet of '+a:a;   /* partner b27CountTxt */
  return(me?nm(me):'You')+' vs '+o+' · '+cnt+' · '+od+(t?' · '+t:'')}
function shortName(n){n=String(n);const w=n.split(/\s+/).filter(Boolean),l=w[w.length-1];if(w.length>1&&l.length>=4&&l.length<=9)return l;if(n.length<=9)return n;if(w.length>1&&w[0].length<=9)return w[0];return n.slice(0,8)+'…'}
const tinyName=n=>{const t=shortName(n);return t.length<=7?t:t.slice(0,4)};
function syncDom(){const m=document.getElementById('main');if(!m||!document.getElementById('b27Form'))return;const f=S.f,oth=others();
  m.querySelectorAll('[data-lb=opp]').forEach(b=>b.setAttribute('aria-pressed',String(!f.open&&f.opps.includes(b.dataset.mid))));
  const any=m.querySelector('[data-lb=anyone]');if(any)any.setAttribute('aria-pressed',String(f.open));
  const sc=document.getElementById('b27SelCnt');if(sc)sc.textContent=f.open?'Open to anyone':f.opps.length?f.opps.length+' selected':'None selected';
  m.querySelectorAll('[data-lb=amt]').forEach(b=>b.setAttribute('aria-pressed',String(!f.amtCustom&&+b.dataset.v===f.amt)));
  const ab=m.querySelector('[data-lb=amtcustom]');if(ab)ab.setAttribute('aria-pressed',String(f.amtCustom));
  const aw=document.getElementById('b27Aw');if(aw)aw.hidden=!f.amtCustom;const ae=document.getElementById('b27Ae');if(ae)ae.textContent=f.amtErr;
  m.querySelectorAll('[data-lb=odds]').forEach(b=>{const[a,c]=b.dataset.v.split('-').map(Number);b.setAttribute('aria-pressed',String(!f.custom&&f.odds&&f.odds[0]===a&&f.odds[1]===c))});
  const cb=m.querySelector('[data-lb=oddscustom]');if(cb)cb.setAttribute('aria-pressed',String(f.custom));
  const cw=document.getElementById('b27Cw');if(cw)cw.hidden=!f.custom;const ce=document.getElementById('b27Ce');if(ce)ce.textContent=f.oddsErr;
  const live=document.getElementById('b27Live');if(live)live.innerHTML=liveHtml();const sum=document.getElementById('b27Sum');if(sum)sum.textContent=summary();autoSoon();
  const err=formOK();const pb=document.getElementById('b27Place');if(pb){pb.disabled=!!err||S.busy;pb.setAttribute('aria-disabled',String(!!err))}
  const hint=document.getElementById('b27Hint');if(hint)hint.textContent=err&&(f.opps.length||f.open||f.text||f.amt)?err:''}
const sync=()=>{try{syncDom()}catch(e){}};
/* ---------- view ---------- */
const STX={pending:['Waiting','open'],open:['Open','open'],reported:['Result reported','open'],disputed:['Disagreement','unparsed'],settled:['Settled','settled'],declined:['Declined','unparsed'],withdrawn:['Withdrawn','unparsed']};
function resultLine(b){if(b.status!=='settled')return'';const p=payFor(b);const d=(b.auto?' (settled automatically: no reply for 2 days)':'')+(b.src&&!(b.fixes||[]).some(x=>x.st==='confirmed')?' · from the final score: '+b.src.sc:'');
  if(b.res==='p')return'Wash: nobody owes anything'+d;
  return b.res==='b'?nm(b.by)+' won ('+nm(b.acc)+' owes '+num(p.right)+')'+d:nm(b.acc)+' won ('+nm(b.by)+' owes '+num(p.wrong)+')'+d}
const rLab=(b,r)=>r==='p'?'Wash':nm(r==='b'?b.by:b.acc)+' won';
const tm=ms=>LTIME.stamp(ms);   /* Nov 3, 7:00 PM WIB: viewer's zone, labelled */
const FXST={pending:'waiting for the other side',confirmed:'confirmed',declined:'declined',withdrawn:'withdrawn',replaced:'replaced by a newer request',countered:'answered with a different result'};
function fixHtml(b,me,btn,ask){let h='';const party=me&&(b.by===me||b.acc===me),F=b.fix;
  if(b.fixes.length)h+=`<div class="b27-hist" data-fixhist="${esc(b.id)}"><div class="b27-q">Result changes</div><ol>${b.fixes.map(x=>`<li class="fx-${esc(x.st)}"><b>${esc(nm(x.by))}</b> asked to change <b>${esc(rLab(b,x.from))}</b> → <b>${esc(rLab(b,x.to))}</b> <span class="mut">(${esc(tm(x.ts))})</span>: ${esc(x.st==='confirmed'?'confirmed by '+nm(x.cby):x.st==='declined'?'declined by '+nm(x.cby):x.st==='countered'?nm(x.cby)+' asked for a different result':FXST[x.st])}${x.endTs?` <span class="mut">(${esc(tm(x.endTs))})</span>`:''}</li>`).join('')}</ol></div>`;
  if(!party)return h+(F?`<div class="note">${esc(nm(F.by))} asked to change the result to <b>${esc(rLab(b,F.to))}</b>. It changes only if ${esc(nm(F.by===b.by?b.acc:b.by))} confirms.</div>`:'');
  if(F&&F.by===me)return h+`<div class="note" style="margin-top:4px">You asked to change the result to <b>${esc(rLab(b,F.to))}</b>. Waiting for ${esc(nm(F.by===b.by?b.acc:b.by))} to confirm. Nothing changes until then.</div><div class="b27-act">${btn('fixwd','↩ Withdraw my request','sec','',F.fx)}</div>`;
  if(F)return h+`<div class="note" style="margin-top:4px">${esc(nm(F.by))} asks to change the result from <b>${esc(rLab(b,F.from))}</b> to <b>${esc(rLab(b,F.to))}</b>.</div><div class="b27-act">${btn('fixok','✅ Confirm: '+rLab(b,F.to),'pri','',F.fx)}${btn('fixno','✖ Keep '+rLab(b,F.from),'sec','',F.fx)}</div>`;
  if(S.fixOpen===b.id)return h+`<div class="b27-act" data-fixpick="${esc(b.id)}"><span class="note">Correct result? The other side must confirm.</span>${['b','o','p'].filter(r=>r!==b.res).map(r=>btn('fixreq',rLab(b,r),'sec',r)).join('')}${btn('fixcancel','Cancel')}</div>`;
  return h+`<div class="b27-act">${btn('fixopen','✏️ Fix result')}</div>`}
/* s28c: the per-bet button copies only the bet as text (no link) and shows 'Copied' (leaguehome.js cpText / LCPBTN, same button as Games) */
const betText=b=>{const other=b.acc||b.to;return (b.kind==='pool'?'Pool':'Bet')+' #'+b.n+': '+String(b.text||'')+'\n'+nm(b.by)+' vs '+(b.to==='*'&&!b.acc?'anyone who takes it':(b.parts&&b.kind==='pool'?b.parts.map(nm).join(', '):nm(other)))+' · '+num(b.amt)+(b.kind==='pool'?'':' · '+oddsLabel(b.a,b.b))};
const linkBtn=(b,w)=>window.LCPBTN?window.LCPBTN(betText(b),w):'';
function card(b,me){const L=lines(b.by,b.acc||b.to,b.amt,b.a,b.b);const st=b.status==='settled'&&b.res==='p'?['Wash','wash']:STX[b.status];const party=me&&(b.by===me||b.acc===me);
  const other=b.acc||b.to;const vs=b.to==='*'&&!b.acc?'anyone who takes it':nm(other);
  let h=`<div class="card b27-c" data-bet="${esc(b.id)}"><div class="s24hd"><b>Bet #${b.n}</b> <span class="st ${st[1]}">${esc(st[0])}</span> <span class="mut" style="font-size:12px">${esc(day(b.ts))}</span>${b.g&&CUR.filter(x=>x.g===b.g).length>1?` <span class="mut" style="font-size:12px">· 1 of ${CUR.filter(x=>x.g===b.g).length} placed together</span>`:''}${linkBtn(b,'bet')}</div>
   <div class="b27-t${esc(S.more[b.id]?' open':'')}" id="b27T-${esc(b.id)}">${esc(b.text)}</div><button type="button" class="b27-more" data-lb="more" data-id="${esc(b.id)}" aria-controls="b27T-${esc(b.id)}" aria-expanded="${esc(String(!!S.more[b.id]))}"${S.more[b.id]?'':' hidden'}>${S.more[b.id]?'less':'more'}</button><div class="b27-m">${tmH(b.by)} vs ${b.to==='*'&&!b.acc?`<b>${esc(vs)}</b>`:tmH(other)} · <b>${esc(num(b.amt))}</b> · ${esc(oddsLabel(b.a,b.b))}</div>
   <div class="b27-w">${esc(L.win)}</div><div class="b27-l">${esc(L.lose)}</div>${L.rounded?'<div class="mut b27-r">Rounded to a whole number.</div>':''}`;
  if(!clampQ){clampQ=true;requestAnimationFrame(clampFix)}
  const rl=resultLine(b);if(rl)h+=`<div class="note" style="margin-top:4px"><b>Result:</b> ${esc(rl)}${b.fixes&&b.fixes.some(x=>x.st==='confirmed')?' <span class="st settled">Corrected</span>':''}</div>`;
  h+='<div class="b27-sp" aria-hidden="true"></div>';
  h+=stampHtml(b);   /* s25: 'Placed … · Settled …' in the viewer's zone, top of the pinned-bottom block */   /* s25: pushes notes, buttons and reactions to the bottom so they line up across a row */
  const ask=(k,r)=>S.ask&&S.ask.id===b.id&&S.ask.w===k+(r||'');
  const btn=(k,label,extra,r,fx)=>`<button type="button" class="btn ${extra||'sec'} b27-b" data-lb="${k}" data-id="${esc(b.id)}"${r?` data-r="${esc(r)}"`:''}${fx?` data-fx="${esc(fx)}"`:''}${S.busy?' disabled':''}>${ask(k,r)?'Tap again to confirm':esc(label)}</button>`;
  if(b.status==='pending'){
    if(me&&me!==b.by&&(b.to==='*'||b.to===me))h+=`<div class="note" style="margin-top:4px">${b.to==='*'?esc(nm(b.by))+' is open to anyone: take it?':esc(nm(b.by))+' is asking you.'}</div><div class="b27-act">${btn('accept','✅ Accept','pri')}${b.to===me?btn('decline','✖ Decline'):''}</div>`;
    else if(me===b.by)h+=`<div class="note" style="margin-top:4px">Waiting for ${b.to==='*'?'someone to take it':esc(nm(b.to))+' to answer'}.</div><div class="b27-act">${btn('betedit','✏️ Edit')}${btn('withdraw',undoable(b,me)?'↩ Undo this bet (30 s)':'↩ Withdraw this bet')}</div>${(()=>{const gu=grpUndo(b.g,me);return gu.length>1&&gu.slice().sort((p,q)=>q.n-p.n)[0].id===b.id?`<div class="b27-act"><button type="button" class="btn sec b27-b" data-lb="undogroup" data-g="${esc(b.g)}"${S.busy?' disabled':''}>↩ Undo all ${gu.length} bets placed together (30 s)</button></div>`:''})()}`;
    else h+=`<div class="note" style="margin-top:4px">Waiting for ${b.to==='*'?'someone to take it':esc(nm(b.to))+' to answer'}.</div>`}
  if(b.status==='reported'||b.status==='disputed'){const lb={b:nm(b.by)+' won',o:nm(b.acc)+' won',p:'Wash'};const said=Object.entries(b.reps).map(([m,x])=>esc(nm(m))+' said <b>'+esc(lb[x.r])+'</b>').join(', ');
    h+=`<div class="note b27-legacy" style="margin-top:4px">Earlier answer${Object.keys(b.reps).length>1?'s':''} (before the new rule): ${said}.${b.status==='reported'?' Without a result from '+esc(nm(b.by))+' it settles by itself 2 days after that answer.':''}</div>`}
  if(LIVE(b)&&party&&me!==b.by)h+=`<div class="note b27-onlyc" style="margin-top:6px">Only ${esc(nm(b.by))} (who placed it) can enter the result.</div>`;
  h+=autoHtml(b,me,btn,ask);
  const PR=S.prop[b.id];if(LIVE(b)&&me&&me===b.by&&!(PR&&PR.st==='final'&&!S.autoFix[b.id])){
    const labels={b:nm(b.by)+' won',o:nm(b.acc)+' won',p:'Wash'};
    h+=`<div class="b27-act"><span class="note">Who won?</span>${['b','o','p'].map(r=>btn('settle',labels[r],'sec',r)).join('')}</div>`}
  if(b.status==='settled')h+=fixHtml(b,me,btn,ask);
  return h+rxHtml(b,me)+'</div>'}
/* s25 bet time stamps: placed = the place event's ts (b.ts); settled = the settle event's ts (b.settledTs; auto-settle = report ts + autoMs).
   'Placed Nov 2, 8:00 AM WIB · Settled Nov 3, 9:15 PM WIB'; the year only when it is not the viewer's current year; either part left out if missing. */
function stampDate(ms,now){const d=new Date(ms);if(isNaN(d))return'';const y=n=>new Intl.DateTimeFormat('en-US',{year:'numeric'}).format(new Date(n));
  const o={month:'short',day:'numeric'};if(y(ms)!==y(now==null?Date.now():now))o.year='numeric';return new Intl.DateTimeFormat('en-US',o).format(d)}
function stampTime(ms){const S5=window.S25;return S5&&S5.localTime?S5.localTime(ms):LTIME.time(ms)}
function stampText(b,now){const p=[];if(b&&b.ts!=null&&!isNaN(+b.ts))p.push('Placed '+stampDate(+b.ts,now)+', '+stampTime(+b.ts));
  if(b&&b.status==='settled'&&b.settledTs!=null&&!isNaN(+b.settledTs))p.push('Settled '+stampDate(+b.settledTs,now)+', '+stampTime(+b.settledTs));return p.join(' · ')}
function stampHtml(b){const t=stampText(b);return t?`<div class="b27-stamp">${esc(t)}</div>`:''}
/* ---------- s24 list filters: Person (Me / Everyone / each manager) x Status (All / Waiting on me / Open / Settled / Wash) ----------
   kept per device per league in localStorage fbn.x.<league>.betf as {p,s,q}; p = 'all' | 'me' | position 1-8 in the league (never a manager id); q = search terms
   (bet text + manager names, case-insensitive, live); also in the URL as #bets/f=<p>-<s> or #bets/f=<p>-<s>/q=<terms> */
const FS={all:'Any status',open:'Open',settled:'Settled',wash:'Wash',waiting:'Waiting on me'};
const fKey=()=>'fbn.x.'+(H&&H.id)+'.betf';
const fOk=(p,s)=>/^(all|me|[1-8])$/.test(p)&&s in FS;
const qClean=q=>clean(q,60);
function fLoad(){if(S.fl)return;S.fl=1;S.fp=S.fp||'all';S.fs=S.fs||'all';S.fq=S.fq||'';try{const v=JSON.parse(localStorage.getItem(fKey())||'null');if(v&&fOk(v.p,v.s)){S.fp=v.p;S.fs=v.s;S.fq=qClean(v.q||'')}}catch(e){}}
function fSave(){try{if(S.fp==='all'&&S.fs==='all'&&!S.fq)localStorage.removeItem(fKey());else localStorage.setItem(fKey(),JSON.stringify(S.fq?{p:S.fp,s:S.fs,q:S.fq}:{p:S.fp,s:S.fs}))}catch(e){}}
function fSet(p,s,quiet,q){if(!fOk(p,s))return false;S.fl=1;S.fp=p;S.fs=s;if(q!==undefined)S.fq=qClean(q);fSave();if(!quiet&&H&&H.onFilter)H.onFilter();return true}
const fPm=me=>S.fp==='me'?me:S.fp==='all'?null:((owners()[+S.fp-1]||{}).mid||null);
const fEff=me=>({p:(S.fp==='me'&&!me)?'all':S.fp,s:(S.fs==='waiting'&&!me)?'all':S.fs});   /* a watcher has no "me": those choices fall back */
function waitsOn(b,me){if(!me)return false;if(b.kind==='pool')return b.status==='open'&&!b.back&&b.by!==me&&b.parts.includes(me);const party=b.by===me||b.acc===me;
  if(b.status==='pending')return b.by!==me&&(b.to===me||b.to==='*');
  if(b.status==='reported')return party&&!b.reps[me];
  if(b.status==='disputed')return party;
  if(b.status==='settled')return party&&!!b.fix&&b.fix.by!==me;return false}
function fMatch(b,me){fLoad();const e=fEff(me);
  if(e.p!=='all'){const pm=e.p==='me'?me:fPm(me);if(!pm||!(b.by===pm||b.acc===pm||(b.status==='pending'&&b.to===pm)||(b.kind==='pool'&&b.parts.includes(pm))))return false}
  if(S.fq){const q=S.fq.toLowerCase(),hay=[b.text,nm(b.by),b.acc?nm(b.acc):'',b.to&&b.to!=='*'?nm(b.to):'',...(b.parts||[]).map(nm)].join(' ').toLowerCase();if(!q.split(/\s+/).every(w=>hay.includes(w)))return false}
  if(b.kind==='pool'){if(e.s==='waiting')return waitsOn(b,me);if(e.s==='open')return b.status==='open'&&!b.back;if(e.s==='settled')return b.status==='open'&&!!b.back;return e.s!=='wash'}
  if(e.s==='waiting')return waitsOn(b,me);if(e.s==='open')return['pending','open','reported','disputed'].includes(b.status);
  if(e.s==='settled')return b.status==='settled';if(e.s==='wash')return b.status==='settled'&&b.res==='p';return true}
const fActive=me=>{fLoad();const e=fEff(me);return e.p!=='all'||e.s!=='all'||!!S.fq};
function fEmpty(me){return 'No bets match this filter.'}
function fBar(me,bets){fLoad();const e=fEff(me),oth=owners(),wn=me?bets.filter(b=>waitsOn(b,me)).length:0;
  const po=`<option value="all"${e.p==='all'?' selected':''}>Everyone</option>`+(me?`<option value="me"${S.fp==='me'?' selected':''}>Me</option>`:'')+oth.map((o,i)=>`<option value="${i+1}"${S.fp===String(i+1)?' selected':''}>${esc(bRNm(o)?o.team_name+' · '+bRNm(o):(o.team_name||o.name))}</option>`).join('');
  const so=Object.keys(FS).filter(k=>k!=='waiting'||me).map(k=>`<option value="${k}"${e.s===k?' selected':''}>${esc(FS[k])}${k==='waiting'&&wn?' ('+wn+')':''}</option>`).join('');
  const lost=!me&&(S.fp==='me'||S.fs==='waiting')?'<div class="note" id="b27FltNote">“Me” and “Waiting on me” need your own manager link, so this shows everyone.</div>':'';
  return`<div class="card s24fb b27-flt" id="b27Flt" role="search" aria-label="Filter bets"><div class="b27-fr"><select id="b27FP" aria-label="Person">${po}</select><select id="b27FS" aria-label="Status">${so}</select><input id="b27FQ" type="search" class="b27-fq" placeholder="search terms…" aria-label="Search bets" autocomplete="off" maxlength="60" enterkeyhint="search" value="${esc(S.fq)}"></div>${lost}</div>`}
function fHashOut(){fLoad();return S.fp==='all'&&S.fs==='all'&&!S.fq?'':'f='+S.fp+'-'+S.fs+(S.fq?'/q='+encodeURIComponent(S.fq):'')}
function fFromHash(f,q){const m=/^(all|me|[1-8])-(all|waiting|open|settled|wash)$/.exec(String(f||''));if(m)fSet(m[1],m[2],true,q==null?'':q)}
function reveal(id){const me=meMid(),b=compute().find(x=>x.id===id);if(!b||!fActive(me)||fMatch(b,me))return false;fSet('all','all',true,'');return true}
let CUR=[];const UNDO_MS=30000;
const undoable=(b,me)=>!!me&&(b.kind==='pool'?b.status==='open':b.status==='pending')&&b.by===me&&Date.now()-b.ts<UNDO_MS;
const grpUndo=(g,me)=>g?CUR.filter(x=>x.g===g&&undoable(x,me)):[];
const nmHtml=mid=>{const o0=own(mid),o=Object.assign({},o0,{name:o0.team_name||o0.name}),sh=shortName(o.name);return`<span class="oqn${sh!==o.name?' hs':''}" data-em="${esc(o.emoji||'')}" data-e1="${esc(first(o.emoji))}"><span class="f">${esc(o.name)}</span>${sh!==o.name?`<span class="s">${esc(sh)}</span>`:''}</span>`};
const first=e=>{e=String(e||'');try{return new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(e)[Symbol.iterator]().next().value.segment}catch(_){return Array.from(e)[0]||''}};
/* s25k: the owes grid and the net list show each manager's TEAM NICKNAME in caps (display only; from the league data, "Test " stripped; full name in the tooltip) */
const nick=o=>{o=o||{};const t=String(o.team_name||o.team||'').replace(/^\s*Test\s+/i,'').trim();return (t||String(o.name||'Manager').replace(/^\s*Test\s+/i,'').trim()).toUpperCase()};
/* ---------- s28: the partner's Bets page (vB27 / b27PoolForm / b27PoolCard / vTally), on the League bet store ---------- */
/* s28b: chips = TEAM name on top (.tl), the real name under it (.tnr); real name hidden when it equals the team name (same rule as RNm() in leaguehome.js), 'Test ' stripped in league-d.js (test league only); the Tally keeps its own 'Test ' strip */
const bTst=x=>String(x==null?'':x).replace(/^\s*Test\s+/i,'').trim(),bRNm=(o,st)=>{const f=st?bTst:(x=>String(x==null?'':x).trim()),t=f(o&&o.team_name),r=f(o&&o.name);return t&&r&&t!==r?r:''};
const chip=(o,k,on)=>`<button type="button" class="b27-chip op" data-lb="${k}" data-mid="${esc(o.mid)}" aria-label="${esc(o.team_name?o.team_name+' ('+o.name+')':o.name)}" aria-pressed="${on}"><span class="ck" aria-hidden="true">✓</span><span class="em" aria-hidden="true">${esc(o.emoji||'')}</span><span class="nm" aria-hidden="true"><span class="tl"><span class="f">${esc(o.team_name||o.name)}</span><span class="sh">${esc(shortName(o.team_name||o.name))}</span><span class="xs">${esc(tinyName(o.team_name||o.name))}</span></span>${bRNm(o)?`<small class="tnr">${esc(bRNm(o))}</small>`:''}</span></button>`;
const kindTabs=()=>`<div class="tabs b27-kind" role="group" aria-label="Bet type" style="margin:8px 0"><button type="button" class="${S.kind!=='pool'?'on':''}" aria-pressed="${S.kind!=='pool'}" data-lb="kind" data-v="bet" id="b27KindBet">${esc(POOL_TXT.toggleBet)}</button><button type="button" class="${S.kind==='pool'?'on':''}" aria-pressed="${S.kind==='pool'}" data-lb="kind" data-v="pool" id="b27KindPool">${esc(POOL_TXT.toggle)}</button></div>`;
function formHtml(me){const f=S.f,oth=others();const err=formOK();
  return`<div class="card b27-form" id="b27Form"><b>New bet</b> <span class="note">· you are <b>${esc(nm(me))}</b></span>${qbHint()}${S.edited?`<div class="note b27-edhint" role="status" id="b27EdHint">✏️ Filled in from Bet #${esc(S.edited)} (withdrawn). Change it, then place it again.</div>`:kindTabs()}
   <div class="b27-q">1. Who are you betting against? <span class="note">Tap one or more. Several = one bet each.</span></div><div class="b27-opps" role="group" aria-label="Opponents" style="--n:${oth.length}">${oth.map(o=>chip(o,'opp',!f.open&&f.opps.includes(o.mid))).join('')}</div>
   <div class="b27-selbar"><button type="button" class="b27-sm" data-lb="anyone" aria-pressed="${f.open}">🌍 Anyone</button><button type="button" class="b27-sm" data-lb="oppall">Select all</button><button type="button" class="b27-sm" data-lb="oppclear">Clear</button><span class="cnt" id="b27SelCnt" aria-live="polite">${f.open?'Open to anyone':f.opps.length?f.opps.length+' selected':'None selected'}</span></div>
   <div class="b27-q"><label for="b27Text">2. What’s the bet? <span class="note">I say…</span></label></div><input id="b27Text" class="sb-in b27-in" maxlength="${C.maxText}" autocomplete="off" enterkeyhint="go" placeholder="e.g. Kansas -4 beats Duke" value="${esc(f.text)}">
   <div class="b27-q">3. Amount <span class="note">(minimum ${C.min})</span></div><div class="b27-amts" role="group" aria-label="Amount">${C.amounts.map(a=>`<button type="button" class="b27-amt" data-lb="amt" data-v="${a}" aria-pressed="${!f.amtCustom&&a===f.amt}">${a}</button>`).join('')}<button type="button" class="b27-amt cu" data-lb="amtcustom" aria-pressed="${f.amtCustom}">Custom</button></div>
   <div id="b27Aw" class="b27-cw"${f.amtCustom?'':' hidden'}><label for="b27Ao" class="sr">Custom amount</label><input id="b27Ao" class="sb-in b27-in" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" placeholder="Whole number, ${C.min} to ${C.max}" value="${esc(f.amtTxt)}"><div id="b27Ae" class="b27-bad-t" role="alert">${esc(f.amtErr)}</div></div>
   <div class="b27-q">4. Odds <span class="note">(if you’re right, they owe amount × first ÷ second)</span></div><div class="b27-chips" role="group" aria-label="Odds">${C.odds.map(([a,b])=>`<button type="button" class="b27-chip" data-lb="odds" data-v="${a}-${b}" aria-pressed="${!f.custom&&!!f.odds&&f.odds[0]===a&&f.odds[1]===b}">${a===1&&b===1?'Even':a+'-'+b}</button>`).join('')}<button type="button" class="b27-chip" data-lb="oddscustom" aria-pressed="${f.custom}">Custom…</button></div>
   <div id="b27Cw" class="b27-cw"${f.custom?'':' hidden'}><label for="b27Co" class="sr">Custom odds</label><input id="b27Co" class="sb-in b27-in" inputmode="text" autocomplete="off" maxlength="9" placeholder="e.g. 7-2 or 10-1" value="${esc(f.customTxt)}"><div id="b27Ce" class="b27-bad-t" role="alert">${esc(f.oddsErr)}</div></div>
   <div class="b27-livebox" id="b27Live" aria-live="polite">${liveHtml()}</div><div class="b27-sum" id="b27Sum">${esc(summary())}</div><div id="b27AutoN">${autoNoteForm()}</div><div class="b27-bad-t" id="b27Hint"></div>
   <button type="button" id="b27Place" class="btn b27-big" data-lb="place"${err?' disabled aria-disabled="true"':''}>Place bet</button></div>`}
/* ----- pool form: 1 terms, 2 who's in, 3 buy-in (live pot line), 4 payouts by place (amounts only; optional) ----- */
const poolParts=()=>{const me=meMid();return owners().map(o=>o.mid).filter(m=>m===me||S.p.pp.includes(m))};
function poolCheck(){const e={},parts=poolParts(),p=S.p;
  if(!clean(p.text))e.terms=PT('eTerms');if(parts.length<2)e.people=PT('ePeople');
  let amt=null;const bt=String(p.entry==null?'':p.entry).trim();
  if(!bt)e.buy=PT('eBuy');else{amt=poolNum(bt);if(amt===null||amt<C.min){e.buy=amt===null?PT('eBuy'):PT('eBuyMin',{min:C.min});amt=null}}
  const pot=amt!==null&&parts.length>=2?amt*parts.length:null;
  const vals=p.places.map(x=>String(x==null?'':x).trim());let places=null,sum=0,bad=false;
  vals.forEach(v=>{if(!v)return;const n=poolNum(v);if(n===null)bad=true;else sum+=n});
  if(bad)e.pay=PT('ePlaceNum');else if(vals.some(Boolean)){places=vals.map(v=>v?poolNum(v):0);while(places.length&&!places[places.length-1])places.pop();
    if(pot!==null&&sum!==pot)e.pay=PT('ePlaceSum',{sum:num(sum),pot:num(pot),diff:num(Math.abs(pot-sum)),way:sum<pot?PT('short'):PT('over')})}
  return{e,parts,amt,pot,sum,places:places&&places.length?places:null}}
const firstErr=c=>c.e.terms||c.e.people||c.e.buy||c.e.pay||'';
const potLine=c=>c.pot!==null?PT('potLine',{n:c.parts.length,buy:num(c.amt),pot:num(c.pot)}):PT('potWait');
const sumLine=c=>(c.pot===null||!S.p.places.some(x=>String(x).trim()))?PT('payOpt'):PT('sumLine',{sum:num(c.sum),pot:num(c.pot)})+(c.sum===c.pot?' ✓':'');
function poolPaint(){const c=poolCheck(),sh=S.p.showErr||{},set=(id,t)=>{const el=document.getElementById(id);if(el&&el.textContent!==t)el.textContent=t};
  set('s26eTerms',sh.terms&&c.e.terms?c.e.terms:'');set('s26ePeople',sh.people&&c.e.people?c.e.people:'');set('s26eBuy',(sh.buy||String(S.p.entry).trim())&&c.e.buy?c.e.buy:'');
  set('s26ePay',c.e.pay||'');set('s26Pot',potLine(c));set('s26Sum',sumLine(c));
  const se=document.getElementById('s26Sum');if(se)se.classList.toggle('ok',c.pot!==null&&c.sum===c.pot&&S.p.places.some(x=>String(x).trim()));
  [['b27Text','terms'],['b27En','buy']].forEach(([id,k])=>{const el=document.getElementById(id);if(el&&S.kind==='pool'){const on=!!(c.e[k]&&(sh[k]||(k==='buy'&&String(S.p.entry).trim())));el.classList.toggle('b27-errbox',on);el.setAttribute('aria-invalid',String(on))}});
  document.querySelectorAll('.s26pi').forEach(el=>el.classList.toggle('b27-errbox',!!c.e.pay));
  document.querySelectorAll('[data-lb=pp]').forEach(b=>b.setAttribute('aria-pressed',String(S.p.pp.includes(b.dataset.mid))));
  const sc=document.getElementById('b27SelCnt');if(sc&&S.kind==='pool')sc.textContent=S.p.pp.length?S.p.pp.length+' selected':'None selected';return c}
const placeRows=()=>S.p.places.map((v,i)=>`<div class="s26pr"><label for="s26p${i}" class="s26pl">${esc(placeName(i))}</label><input id="s26p${i}" class="sb-in s26pi" data-place="${i}" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(v)}">${i>=2?`<button type="button" class="s26px" data-lb="delplace" data-i="${i}" aria-label="Remove ${esc(placeName(i))}">×</button>`:'<span class="s26px0"></span>'}</div>`).join('');
function poolFormHtml(me){const oth=others(),p=S.p;setTimeout(()=>{try{poolPaint()}catch(e){}},0);
  return`<div class="card b27-form" id="b27Form" data-kind="pool"><b>New bet</b> <span class="note">· you are <b>${esc(nm(me))}</b></span>${kindTabs()}
   <div class="s26st"><label for="b27Text" class="b27-lb"><span class="s26n">1</span>${esc(PT('s1'))}</label><textarea id="b27Text" class="sb-in b27-in" rows="2" maxlength="${C.maxText}" placeholder="${esc(PT('termsPh'))}" aria-describedby="s26eTerms">${esc(p.text)}</textarea><div id="s26eTerms" class="s26err" role="alert"></div></div>
   <div class="s26st"><div class="b27-lb" id="s26lPeople" tabindex="-1"><span class="s26n">2</span>${esc(PT('s2'))} <span class="note">${esc(POOL_TXT.youIn)}</span></div><div class="b27-opps" role="group" aria-labelledby="s26lPeople" style="--n:${oth.length}">${oth.map(o=>chip(o,'pp',p.pp.includes(o.mid))).join('')}</div>
   <div class="b27-selbar"><button type="button" class="b27-sm" data-lb="ppall">Select all</button><button type="button" class="b27-sm" data-lb="ppclear">Clear</button><span class="cnt" id="b27SelCnt" aria-live="polite">${p.pp.length?p.pp.length+' selected':'None selected'}</span></div>
   <div id="s26ePeople" class="s26err" role="alert"></div></div>
   <div class="s26st"><label for="b27En" class="b27-lb"><span class="s26n">3</span>${esc(PT('s3'))}</label><input id="b27En" class="sb-in b27-in s26buy" inputmode="decimal" autocomplete="off" placeholder="${esc(PT('buyPh'))}" value="${esc(p.entry)}" aria-describedby="s26Pot s26eBuy"><div id="s26Pot" class="s26pot" aria-live="polite">${esc(potLine(poolCheck()))}</div><div id="s26eBuy" class="s26err" role="alert"></div></div>
   <div class="s26st"><div class="b27-lb"><span class="s26n">4</span>${esc(PT('s4'))}</div><div class="note">${esc(PT('helpPl'))}</div>${placeRows()}<button type="button" class="b27-sm s26add" data-lb="addplace"${p.places.length>=10?' disabled':''}>${esc(PT('addPlace'))}</button><div id="s26Sum" class="s26sum" aria-live="polite">${esc(sumLine(poolCheck()))}</div><div id="s26ePay" class="s26err" role="alert"></div></div>
   <button type="button" id="b27Place" class="btn b27-big" data-lb="poolplace">${esc(POOL_TXT.build)}</button></div>`}
function poolResultLines(parts,amt,back){if(!back)return[PT('open')];const nets=parts.map(p=>[p,back[p]-amt]);
  return nets.map(([p,v])=>PT('row',{name:nm(p),got:num(back[p]),net:signed(v)})).concat(greedy(nets).map(x=>PT('settleUp',{from:nm(x.from),to:nm(x.to),n:num(x.num)})))}
function poolConfirmHtml(){const c=poolCheck();if(firstErr(c)||!meMid())return'';
  return`<div class="card b27-confirm" id="b27Confirm" data-kind="pool"><b>${esc(POOL_TXT.confirmTitle)}</b><div class="s26terms">${esc(clean(S.p.text))}</div><div class="b27-sum">${esc(PT('sum',{names:c.parts.map(nm).join(', '),buy:num(c.amt),tot:num(c.amt*c.parts.length)}))}</div>${c.places?`<div class="b27-m">${esc(PT('payLine',{x:c.places.map((a,i)=>placeName(i)+' '+num(a)).join(' · ')}))}</div>`:''}<div id="b27Live">${poolResultLines(c.parts,c.amt,null).map(l=>`<div class="b27-w">${esc(l)}</div>`).join('')}</div>
   <div class="b27-act"><button type="button" class="btn b27-big" data-lb="poolconfirm"${S.busy?' disabled':''}>${S.busy?'Saving…':esc(POOL_TXT.go)}</button><button type="button" class="btn sec b27-big" data-lb="pooledit"${S.busy?' disabled':''}>${esc(POOL_TXT.change)}</button></div></div>`}
/* partner s26kModal: the confirm step sits in a dialog over the page; tap outside or Esc = ← Change */
const modal=c=>c?`<div class="s26k-bd" data-lb="modalbd"><div class="s26k-m" role="dialog" aria-modal="true" aria-label="Check it, then confirm">${c}</div></div>`:'';
/* ----- pool card + settle (builder only): by place (pick who finished where) or, with no places, name:amount ----- */
const pkey=n=>String(n).toLowerCase().replace(/[^a-z0-9]+/g,'');
function poolKeys(){const ow=owners(),m={};ow.forEach(o=>{const w=String(o.name).split(/\s+/).filter(Boolean);m[o.mid]=pkey(w[w.length-1]||o.name)});const c={};Object.values(m).forEach(k=>c[k]=(c[k]||0)+1);ow.forEach(o=>{if(c[m[o.mid]]>1)m[o.mid]=pkey(o.name)});return m}
function poolParse(b,txt){const sz=b.amt*b.parts.length;if(!String(txt||'').trim())return{ok:true,back:null};const keys=poolKeys(),ow=owners(),back={};
  for(const raw of String(txt).split(/[,;\n]+/)){const x=raw.trim();if(!x)continue;const i=x.search(/[:=]/);if(i<1)return{ok:false,err:PT('eFmt')};
    const k=pkey(x.slice(0,i)),vv=x.slice(i+1).trim(),hit=ow.filter(o=>keys[o.mid]===k||pkey(o.name)===k||pkey(String(o.name).split(/\s+/)[0])===k);
    if(hit.length!==1)return{ok:false,err:PT('eUnknown',{x:x.slice(0,i).trim(),keys:ow.map(o=>keys[o.mid]).join(', ')})};
    const who=hit[0].mid;if(!b.parts.includes(who))return{ok:false,err:PT('eNotIn',{x:nm(who)})};if(Object.prototype.hasOwnProperty.call(back,who))return{ok:false,err:PT('eDup',{x:nm(who)})};
    const v=poolNum(vv);if(v===null)return{ok:false,err:PT('eBadPay')};back[who]=v}
  b.parts.forEach(p=>{if(!(p in back))back[p]=0});const tot=b.parts.reduce((a,p)=>a+back[p],0);if(tot!==sz)return{ok:false,err:PT('eSum',{sum:num(tot),total:num(sz)})};return{ok:true,back}}
const poolCanSettle=(b,me)=>b.status==='open'&&!b.back&&!!me&&me===b.by;
function poolCard(b,me){const st=b.status,done=st==='open'&&!!b.back,stTxt=st==='void'?POOL_TXT.stVoid:b.back?POOL_TXT.stDone:POOL_TXT.stOpen,ask=S.ask&&S.ask.id===b.id&&S.ask.w==='pool';
  let h=`<div class="card b27-c b27-pool" data-bet="${esc(b.id)}" data-kind="pool"><div class="s24hd"><b>${esc(POOL_TXT.word)} #${b.n}</b> <span class="st ${st==='void'?'unparsed':done?'settled':'open'}">${esc(stTxt)}</span> <span class="mut" style="font-size:12px">${esc(day(b.ts))}</span> <span class="mut" style="font-size:12px">· ${esc(PT('who',{n:b.parts.length}))}</span>${linkBtn(b,'pool')}</div>
   <div class="b27-t">${esc(b.text)}</div><div class="b27-m">${esc(PT('line',{buy:num(b.amt),tot:num(b.amt*b.parts.length)}))}</div><div class="b27-m">${esc(PT('with',{names:b.parts.map(nm).join(', ')}))}</div>`;
  if(b.places)h+=`<div class="b27-m">${esc(PT('payLine',{x:b.places.map((a,i)=>placeName(i)+' '+num(a)).join(' · ')}))}</div>`;
  if(st==='open'&&!b.back)h+=`<div class="note" style="margin-top:6px">${esc(POOL_TXT.noPay)}</div>`;
  if(done)h+=`<div class="note" style="margin-top:6px"><b>${esc(POOL_TXT.result)}:</b></div>`+poolResultLines(b.parts,b.amt,b.back).map((l,i)=>`<div class="${i>=b.parts.length?'b27-l':'b27-w'}" style="margin-top:2px">${esc(l)}</div>`).join('');
  h+='<div class="b27-sp" aria-hidden="true"></div>'+stampHtml(b);
  if(poolCanSettle(b,me)&&b.places){const sel=S.placeWho[b.id]||(S.placeWho[b.id]=[]);
    h+=`<div class="s26set"><div class="b27-lb">${esc(PT('pickWho'))}</div>${b.places.map((a,i)=>`<div class="s26pr"><label for="s26w_${esc(b.id)}_${i}" class="s26pl">${esc(placeName(i))} <span class="mut">${esc(num(a))}</span></label><select id="s26w_${esc(b.id)}_${i}" class="sb-in s26ps" data-pw="${esc(b.id)}" data-i="${i}"><option value="">${esc(PT('pickOne'))}</option>${b.parts.map(p=>`<option value="${esc(p)}"${sel[i]===p?' selected':''}>${esc(nm(p))}</option>`).join('')}</select></div>`).join('')}
     ${S.poolErr[b.id]?`<div class="b27-bad-t" role="alert">${esc(S.poolErr[b.id])}</div>`:''}<div class="b27-act"><button type="button" class="btn sec b27-b" data-lb="placego" data-id="${esc(b.id)}"${S.busy?' disabled':''}>${esc(ask?POOL_TXT.again:POOL_TXT.save)}</button></div></div>`}
  else if(poolCanSettle(b,me))h+=`<div class="b27-cw"><label for="pb_${esc(b.id)}" class="sr">${esc(POOL_TXT.fPay)}</label><textarea id="pb_${esc(b.id)}" class="sb-in b27-in" data-pt="${esc(b.id)}" rows="2" autocomplete="off" placeholder="${esc(POOL_TXT.fPay)}">${esc(S.poolTxt[b.id]||'')}</textarea></div>${S.poolErr[b.id]?`<div class="b27-bad-t" role="alert">${esc(S.poolErr[b.id])}</div>`:''}
     <div class="b27-act"><button type="button" class="btn sec b27-b" data-lb="poolgo" data-id="${esc(b.id)}"${S.busy?' disabled':''}>${esc(ask?POOL_TXT.again:POOL_TXT.save)}</button></div>`;
  if(st==='open'&&me&&me===b.by){if(undoable(b,me))h+=`<div class="b27-act"><button type="button" class="btn sec b27-b" data-lb="poolvoid" data-id="${esc(b.id)}"${S.busy?' disabled':''}>${esc(POOL_TXT.undo)}</button></div>`;
    else if(!done)h+=`<div class="b27-act"><button type="button" class="btn sec b27-b" data-lb="poolvoid" data-id="${esc(b.id)}"${S.busy?' disabled':''}>${esc(POOL_TXT.cancel)}</button></div>`}
  return h+rxHtml(b,me)+'</div>'}
async function poolConfirm(){if(S.busy)return;const c=poolCheck(),e=firstErr(c);if(e){S.msg=e;S.bad=true;S.p.confirm=false;render(true);return}
  const sig='pool|'+c.parts.join('|')+'|'+c.amt+'|'+JSON.stringify(c.places)+'|'+clean(S.p.text);
  if(!S.pid||S.pid.sig!==sig)S.pid={sig,id:rid(),u:rid()};   /* same ids for the same pool, so a retry after a failed save never double-posts */
  const ev=Object.assign({k:'pl',u:S.pid.u,ts:Date.now(),v:SV,id:S.pid.id,parts:c.parts,amt:c.amt,text:clean(S.p.text)},c.places?{places:c.places}:{});
  const ok=await act([ev],'');
  if(ok){const b=compute().find(x=>x.id===ev.id);S.msg=PT('placed',{n:b?b.n:''});S.bad=false;S.p={text:'',pp:[],entry:'',places:['',''],showErr:{},confirm:false};S.pid=null;render(true);placedFx([ev.id])}
  else{if(S.bad&&!/full/.test(S.msg))S.msg=PT('cantSave');S.p.confirm=true;render(true)}}
function poolSettle(b,back){const me=meMid();if(!me||b.by!==me){S.msg=POOL_TXT.only;S.bad=true;render(true);return}
  if(!(S.ask&&S.ask.id===b.id&&S.ask.w==='pool')){S.poolErr[b.id]='';S.ask={id:b.id,w:'pool'};render(true);return}
  act([mkEv('pb',{id:b.id,back})],PT('saved')).then(ok=>{if(ok){S.poolTxt[b.id]='';S.placeWho[b.id]=[]}})}
/* ----- Tally (partner vTally): person table (only people with bets or amounts), then Who Owes Who (all 8, gross, rows owe columns), then netted settle lines ----- */
const OB_LABELS={form:'\u270F\uFE0F Write it Up',tally:'\u{1F4B0} Tally'};
function obSeg(){const v=S.ob==='tally'?'tally':'form',sg=k=>`<button type="button" class="${v===k?'on':''}" aria-pressed="${v===k}" data-lb="obview" data-v="${k}" id="b27Ob_${k}">${OB_LABELS[k]}</button>`;
  return `<div class="tabs ob-seg" role="group" aria-label="Bets" id="b27Seg">${sg('form')}${sg('tally')}</div>`}
function tallyHtml(T){const ow=owners(),per=m=>T.per[m]||{net:0,bets:0},Lo=m=>T.lost[m]||0,Wo=m=>T.won[m]||0,M=(a,b)=>(T.M[a]&&T.M[a][b])||0;
  const ids=ow.filter(o=>per(o.mid).bets>0||Lo(o.mid)||Wo(o.mid));
  let h=`<div class="card" id="b27Tally"><b>🧮 Tally · 2026-27</b><div class="note">From the 2026-27 shared ledger only. Rows owe columns.</div></div>`;
  if(!ids.length)h+='<div class="card note" id="b27TallyEmpty" data-tally-empty>No 2026-27 bets with amounts yet.</div>';
  else h+=`<div class="card sc"><table id="b27People" data-tally="people" aria-label="Tally per person"><tr><th>Person</th><th class="n">Lost</th><th class="n">Won</th><th class="n">Net +/-</th><th class="n">Bets</th><th class="n">Fines</th></tr>${ids.slice().sort((a,b)=>per(b.mid).net-per(a.mid).net).map(o=>{const n=per(o.mid).net;return`<tr data-mid="${esc(o.mid)}"><td title="${esc(o.name)}"><b class="tnt">${esc(nick(o))}</b>${bRNm(o,1)?`<small class="tnr">${esc(bRNm(o,1))}</small>`:''}</td><td class="n">${num(Lo(o.mid))}</td><td class="n">${num(Wo(o.mid))}</td><td class="n"><b class="${n>0?'good':n<0?'bad':''}">${n>0?'+':n<0?'-':''}${num(Math.abs(n))}</b></td><td class="n">${per(o.mid).bets}</td><td class="n"><span class="mut">0</span></td></tr>`}).join('')}</table></div>`;
  h+=`<h2 id="b27Owes">Who Owes Who</h2><div class="swipe">↔ Swipe sideways to see every column</div><div class="card sc"><table class="mx" id="b27Matrix" data-tally="owes" aria-label="Who owes who"><tr><th>owes ↓ / to →</th>${ow.map(o=>`<th title="${esc(o.name)}">${esc(nick(o))}</th>`).join('')}</tr>${ow.map(r=>`<tr data-mid="${esc(r.mid)}"><td title="${esc(r.name)}"><b>${esc(nick(r))}</b></td>${ow.map(c=>{const v=M(r.mid,c.mid);return r.mid===c.mid?'<td class="z">·</td>':v?`<td>${num(v)}</td>`:'<td class="z">0</td>'}).join('')}</tr>`).join('')}</table></div>`;
  const Ls=[];ow.forEach((a,x)=>ow.slice(x+1).forEach(b=>{const d=round2(M(a.mid,b.mid)-M(b.mid,a.mid));if(d>0)Ls.push([a,b,d]);else if(d<0)Ls.push([b,a,-d])}));
  if(Ls.length)h+=`<div class="card" id="b27Settle" data-tally-settle>${Ls.map(([a,b,d])=>`<div class="tset">${esc(nick(a))} owes ${esc(nick(b))} ${num(d)}</div>`).join('')}</div>`;
  return h}
function copyText(t,ok){const fall=()=>{try{const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const r=document.execCommand&&document.execCommand('copy');ta.remove();if(r){ok();return}}catch(e){}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText&&window.isSecureContext){navigator.clipboard.writeText(t).then(ok,fall);return}}catch(e){}fall()}
/* ----- the page (partner vB27 order): Write it Up / Tally + Copy link, message, New bet (or the watcher card), Bets (n) + mute, filter row, cards, the intro card with the live line last ----- */
function view(){if(!H)return'';
  if(H.demo)return'<div class="card" id="b27Demo"><b>💵 Bets</b><div class="note">Bets are switched off in the demo, so nothing here can touch a real league.</div></div>';
  const me=meMid(),bets=compute().sort((a,b)=>b.n-a.n),T=tally(bets);CUR=bets;markSeen();clearTimeout(S.undoT);{const left=bets.filter(b=>undoable(b,me)).map(b=>UNDO_MS-(Date.now()-b.ts));if(left.length)S.undoT=setTimeout(()=>{if(H&&H.active()){const a=document.activeElement;if(!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)))render(true)}},Math.max(300,Math.min(...left)+250))}
  const top=S.state==='ok'?(S.stale?`<span class="bad" id="b27Off">● offline: showing the last saved bets. Retrying…</span>`:'<span class="good">● live</span> · everyone in this league sees the same bets')
    :S.state==='error'?`<span class="bad" id="b27Off">● can’t reach the bets right now. Retrying… <button type="button" class="btn sec b27-b" data-lb="retry" id="b27Retry">Try now</button></span>`:'';
  const intro=`<div class="card b27-intro" id="b27Intro"><div class="note b27-note" id="b27Note">${esc(DISCLAIMER)}</div><div class="note" style="margin-top:6px">This page just <b>records</b> who bet what and who owes whom.</div><div class="note b27-top" id="b27Head" style="margin-top:6px"><span id="b27Top">${top}</span></div></div>`;
  const seg=`<div class="s26w-row" id="b27SegRow">${obSeg()}</div>`;
  if(S.ob==='tally'&&S.state!=='init')return seg+tallyHtml(T);
  let h=seg;
  if(S.msg)h+=`<div class="card ${S.bad?'b27-bad':'b27-ok'}" role="status" id="b27Msg">${esc(S.msg)}${(()=>{const gu=me&&S.undoG?grpUndo(S.undoG,me):[];return gu.length>1?`<div class="b27-act"><button type="button" class="btn sec b27-b" data-lb="undogroup" data-g="${esc(S.undoG)}"${S.busy?' disabled':''}>↩ Undo all ${gu.length} bets (30 s)</button></div>`:''})()}</div>`;
  if(!me)h+=`<div class="card" id="b27Watch"><b>👀 Watching only</b><div class="note">You can read every bet here. To place or answer a bet, open this page from your own manager link (the League site button in the draft room).</div><p style="margin:8px 0 0"><a class="btn b27-b" id="b27Room" href="${esc(H.roomHref())}">Open the draft room</a></p></div>`;
  else if(S.kind==='pool'&&!S.edited){const cf=S.p.confirm?poolConfirmHtml():'';if(S.p.confirm&&!cf)S.p.confirm=false;h+=cf?modal(cf):poolFormHtml(me)}
  else if(S.f.confirm){const e=formOK(),t=clean(S.f.text);h+=modal(`<div class="card b27-confirm" id="b27Confirm"><b>Check it, then confirm</b>${t?`<div class="s26terms">${esc(t)}</div>`:''}<div class="b27-sum">${esc(summary())}</div>${readAsHtml()}<div id="b27Live">${liveHtml()}</div><div class="b27-act"><button type="button" class="btn b27-big" data-lb="confirm"${S.busy||e?' disabled':''}>${S.busy?'Saving…':'✅ Yes, place it'}</button><button type="button" class="btn sec b27-big" data-lb="edit"${S.busy?' disabled':''}>← Change</button></div></div>`)}
  else h+=formHtml(me);
  /* still loading the bets: the shared loader instead of an empty list */
  if(S.state==='init'&&window.LLOADER)return h+LLOADER()+intro;
  const fa=fActive(me),FL=fa?bets.filter(b=>fMatch(b,me)):bets;
  h+=`<h2 id="b27ListH">Bets (<span id="b27FCount">${fa?num(FL.length)+' of '+num(bets.length):num(bets.length)}</span>)${sndBtn()}</h2>`;
  if(bets.length)h+=fBar(me,bets);
  h+=FL.length?'<div class="b27-grid" id="b27Grid">'+FL.slice(0,60).map(b=>b.kind==='pool'?poolCard(b,me):card(b,me)).join('')+'</div>'
    :bets.length?`<div class="card note s24fe" id="b27FEmpty">${fEmpty(me)}</div>`:`<div class="card note" id="b27Empty">No bets yet. Be the first.</div>`;
  if(FL.length>60)h+='<p class="note">Showing the latest 60.</p>';
  return h+intro}
/* ---------- s25: read the bet text + proposed result from the final score (spec: /workspace/league-site-work/s25-autosettle-spec.md) ----------
   readBet(text) -> claim {t:'win'|'margin'|'total', a, b (ESPN team ids, a = the team the claim is about), l (number), op:'gt'|'ge'|'line', s:'o'|'u'} or null (unclear: stays manual).
   The claim is saved in the bet's own place event (field c). After the final, the creator sees the score and a proposed result: Confirm (writes the normal settle event,
   creator only) or Fix (the normal Who won? buttons). Nothing is ever written without a tap; no feed / an old feed / no final = manual as before. */
const AS={feed:'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',ttl:10*60000,timeoutMs:10000,days:7,early:3*3600e3};
let TIDX=null;
function teamIdx(){if(TIDX)return TIDX;const T=((window.TEAMS_DATA||{}).teams)||[];const by=new Map(),ab=new Map();const nz=s=>String(s||'').toLowerCase().replace(/[’`]/g,"'").replace(/\s+/g,' ').trim();
  T.forEach(t=>{[t[1],t[2]].forEach(n=>{const k=nz(n);if(k.length<3)return;const s=by.get(k)||new Set();s.add(String(t[0]));by.set(k,s)});if(t[3]&&/^[A-Z][A-Z&-]{1,5}$/.test(t[3])){const s=ab.get(t[3])||new Set();s.add(String(t[0]));ab.set(t[3],s)}});
  const names=[...by.entries()].sort((x,y)=>y[0].length-x[0].length);const nm={};T.forEach(t=>{nm[String(t[0])]=t[2]||t[1]});TIDX={names,ab,nm};return TIDX}
const tName=id=>teamIdx().nm[id]||'?';
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function readBet(text){try{const X=teamIdx();let s=' '+String(text||'').replace(/[’`]/g,"'").replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'')+' ';const ids=[];
  const put=(re,set)=>{s=s.replace(re,(m,p1)=>{if(set.size!==1){ids.push(null);return ' @'+(ids.length)+' '}ids.push([...set][0]);return ' @'+ids.length+' '})};
  for(const[ab,set]of X.ab)put(new RegExp('(?<![A-Za-z0-9])('+reEsc(ab)+')(?![A-Za-z0-9])','g'),set);
  for(const[n,set]of X.names)put(new RegExp('(?<![a-z0-9@])('+reEsc(n)+')(?![a-z0-9])','gi'),set);
  if(ids.length!==2||ids.includes(null)||ids[0]===ids[1])return null;
  {const ord=[];s.replace(/ @(\d) /g,(m,k)=>{ord.push(+k);return m});const o2=ord.map(k=>ids[k-1]);s=s.replace(/ @(\d) /g,(m,k)=>' @'+(ord.indexOf(+k)+1)+' ');ids.splice(0,2,o2[0],o2[1])}
  const t=s.toLowerCase().replace(/\s+/g,' ').trim().replace(/^the /,''),A=ids[0],B=ids[1],N='(\\d{1,3}(?:\\.5)?)',VS='(?:vs\\.?|v\\.?|versus|against|and|at|@|-)';let m;
  if(m=new RegExp('^@1 (?:beats?|defeats?|tops?|over|to beat|will beat|wins? (?:over|against|vs\\.?|v\\.?))(?: the)? @2$').exec(t))return{t:'win',a:A,b:B};
  if(m=new RegExp('^@1 (?:loses to|falls to|to lose to)(?: the)? @2$').exec(t))return{t:'win',a:B,b:A};
  if(m=new RegExp('^@1 -'+N+' (?:vs\\.?|v\\.?|over|against|at|@|beats?|defeats?|tops?|covers? (?:vs\\.?|against)) @2(?: \\+\\d{1,3}(?:\\.5)?)?$').exec(t))return{t:'margin',a:A,b:B,l:+m[1],op:'line'};
  if(m=new RegExp('^@1 (?:beats?|defeats?|wins? (?:over|against|vs\\.?)) @2 by more than '+N+'(?: points?)?$').exec(t))return{t:'margin',a:A,b:B,l:+m[1],op:'gt'};
  if(m=new RegExp('^@1 (?:beats?|defeats?|wins? (?:over|against|vs\\.?)) @2 by (\\d{1,3})(?: points?)? or more(?: points?)?$').exec(t))return{t:'margin',a:A,b:B,l:+m[1],op:'ge'};
  if(m=new RegExp('^(over|under) '+N+'(?: points?| total)?[,:]? @1 '+VS+' @2$').exec(t))return{t:'total',a:A,b:B,l:+m[2],s:m[1][0]};
  if(m=new RegExp('^@1 '+VS+' @2[,:]? (over|under) '+N+'(?: points?| total)?$').exec(t))return{t:'total',a:A,b:B,l:+m[2],s:m[1][0]};
  return null}catch(e){return null}}
function vClaim(c){if(!c||typeof c!=='object')return undefined;const tid=v=>typeof v==='string'&&/^\d{1,8}$/.test(v);if(!tid(c.a)||!tid(c.b)||c.a===c.b)return undefined;
  if(c.t==='win')return{t:'win',a:c.a,b:c.b};const l=Number(c.l);if(!isFinite(l)||l<0||l>400||Math.round(l*2)!==l*2)return undefined;
  if(c.t==='margin'&&['gt','ge','line'].includes(c.op))return{t:'margin',a:c.a,b:c.b,l,op:c.op};if(c.t==='total'&&(c.s==='o'||c.s==='u'))return{t:'total',a:c.a,b:c.b,l,s:c.s};return undefined}
function claimText(c){if(!c)return'';const A=tName(c.a),B=tName(c.b);
  if(c.t==='win')return A+' beats '+B;
  if(c.t==='margin')return c.op==='gt'?A+' beats '+B+' by more than '+String(c.l)+' points':c.op==='ge'?A+' beats '+B+' by '+String(c.l)+' or more points':A+' beats '+B+' by more than '+String(c.l)+' points'+(Number.isInteger(c.l)?' (exactly '+String(c.l)+' = wash)':'');
  return(c.s==='o'?'Over ':'Under ')+String(c.l)+' total points in '+A+' vs '+B+(Number.isInteger(c.l)?' (exactly '+String(c.l)+' = wash)':'')}
/* the claim against a final score: 'b' = the creator was right, 'o' = wrong, 'p' = wash */
function judge(c,sa,sb){if(c.t==='win')return sa>sb?'b':'o';
  if(c.t==='margin'){const m=sa-sb;if(c.op==='ge')return m>=c.l?'b':'o';if(c.op==='gt')return m>c.l?'b':'o';return m>c.l?'b':m===c.l?'p':'o'}
  const tot=sa+sb;if(tot===c.l)return'p';return(c.s==='o'?tot>c.l:tot<c.l)?'b':'o'}
const etDay=ms=>(S25.etDay(ms)||'').replace(/-/g,'');   /* ESPN ?dates= = the US Eastern game day (S25.etDay, shared s25d file), never the viewer's day; display uses LTIME */
const FEEDC={};   /* day -> {at, ev} (memory only) */
async function feedDay(d){const c=FEEDC[d];if(c&&Date.now()-c.at<AS.ttl)return c.ev;
  const ctl=typeof AbortController!=='undefined'?new AbortController():null,tm=ctl?setTimeout(()=>ctl.abort(),AS.timeoutMs):null;
  try{const r=await fetch(AS.feed+'?dates='+d+'&groups=50&limit=400',{credentials:'omit',cache:'no-store',signal:ctl?ctl.signal:undefined});if(!r.ok)throw new Error('http');const j=await r.json();if(!j||!Array.isArray(j.events))throw new Error('bad');
    const ev=j.events.map(e=>{try{const c=(e.competitions||[])[0],cs=c.competitors;if(!Array.isArray(cs)||cs.length!==2)return null;const st=((c.status||e.status||{}).type)||{};
      return{id:String(e.id),start:Date.parse(e.date||c.date),fin:st.name==='STATUS_FINAL'&&st.completed!==false,t:cs.map(x=>({id:String((x.team||{}).id),sc:Number(x.score)}))}}catch(_){return null}}).filter(Boolean);
    FEEDC[d]={at:Date.now(),ev};return ev}finally{if(tm)clearTimeout(tm)}}
/* S.prop[betId] = {st:'final',r,sa,sb,g} | {st:'wait'} (no final yet) | {st:'none'} (no such game found) | {st:'down'} (feed missing / failed); refreshed at most every 10 min */
async function propose(b){const P=S.prop[b.id];if(P&&(P.busy||Date.now()-P.at<AS.ttl))return;S.prop[b.id]=Object.assign({},P||{st:'look'},{busy:true});
  let out={st:'none'};
  try{const now=Date.now();let found=null;
    for(let i=0;i<AS.days;i++){const t=b.ts-AS.early+i*864e5;if(t>now+864e5)break;const ev=await feedDay(etDay(t));
      const g=ev.find(e=>e.start>=b.ts-AS.early&&e.t.some(x=>x.id===b.c.a)&&e.t.some(x=>x.id===b.c.b));if(g){found=g;break}}
    if(found){if(!found.fin)out={st:'wait'};else{const sa=found.t.find(x=>x.id===b.c.a).sc,sb=found.t.find(x=>x.id===b.c.b).sc;
      out=isFinite(sa)&&isFinite(sb)?{st:'final',r:judge(b.c,sa,sb),sa,sb,g:found.id}:{st:'down'}}}}
  catch(e){out={st:'down'}}
  S.prop[b.id]=Object.assign(out,{at:Date.now(),busy:false});if(H&&H.active())render()}
function scoreText(b,P){return tName(b.c.a)+' '+P.sa+', '+tName(b.c.b)+' '+P.sb}
function autoHtml(b,me,btn,ask){if(!b.c)return'';const rk=x=>{try{return window.LRANK?LRANK.badge(x):''}catch(e){return''}};const read=`<div class="note b27-read">Read as: ${rk(b.c.a)}${rk(b.c.b)}${esc(claimText(b.c))}</div>`+((b.status==='pending'||LIVE(b))&&autoGame(b.c,false)?autoNoteHtml():'');if(!LIVE(b))return read;
  const P=S.prop[b.id];const cr=me&&me===b.by;if(cr&&(!P||(!P.busy&&Date.now()-P.at>=AS.ttl)))setTimeout(()=>propose(b),0);
  if(!P||P.st==='look')return read+`<div class="note b27-prop">Checking the final score…</div>`;
  if(P.st==='wait')return read+`<div class="note b27-prop">No final score yet. ${cr?'Settle it by hand any time, or come back after the game.':''}</div>`;
  if(P.st==='none'||P.st==='down')return read+`<div class="note b27-prop">${P.st==='down'?'Scores can’t be read right now':'No matching game found yet'}: settle it by hand.</div>`;
  const lab={b:nm(b.by)+' won',o:nm(b.acc)+' won',p:'Wash'}[P.r];
  let h=read+`<div class="card b27-propc" id="b27Prop-${esc(b.id)}"><div><b>Final:</b> ${esc(scoreText(b,P))}</div><div>Proposed result: <b>${esc(lab)}</b></div>`;
  if(cr&&!S.autoFix[b.id])h+=`<div class="b27-act">${btn('autook','✅ Confirm','pri',P.r)}${btn('autofix','✏️ Fix')}</div><div class="note">Nothing is settled until you confirm.</div>`;
  else if(!cr)h+=`<div class="note">Only ${esc(nm(b.by))} (who placed it) can confirm or fix this.</div>`;
  return h+'</div>'}
/* ---------- s25: settle sounds (win / loss / wash) + mute toggle ----------
   The sounds are the shared WebAudio synth in js/shared-s25.js (S25.synth, copied unchanged from the partner site). A window.FBN_SETTLE_SOUNDS override
   ({win: <url or function>, ...}) still wins if present. Mute is kept per device (localStorage fbn.x.sndmute = '1'); the shared file has no mute logic.
   Plays only after a user gesture on this page (navigator.userActivation) and never when the device asks for reduced motion. */
const SND_KEY='fbn.x.sndmute';let sndCtx=null;
const sndMuted=()=>{try{return localStorage.getItem(SND_KEY)==='1'}catch(e){return false}};
function settleSound(kind){try{if(sndMuted())return'muted';if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return'reduced';
  if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return'nogesture';const src=(window.FBN_SETTLE_SOUNDS||{})[kind];if(!src){const X=window.S25;if(!X||typeof X.synth!=='function'||!X.SOUND||!X.SOUND[kind])return'none';const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return'none';
    sndCtx=sndCtx||new AC();if(sndCtx.state==='suspended')sndCtx.resume().catch(()=>{});X.synth(sndCtx,kind);return'played'}
  if(typeof src==='function'){src();return'played'}const a=new Audio(src);a.play().catch(()=>{});return'played'}catch(e){return'err'}}
function soundFor(b,me){if(!me||b.status!=='settled'||(me!==b.by&&me!==b.acc))return null;if(b.res==='p')return'wash';return(b.res==='b')===(me===b.by)?'win':'loss'}
const sndBtn=()=>{const m=sndMuted();return` <button type="button" class="s25mute" data-lb="sndtoggle" id="b27Snd" aria-pressed="${m}" aria-label="Settle sounds ${m?'off':'on'}" title="Settle sounds ${m?'off':'on'}">${m?'🔇':'🔊'}</button>`};
/* ---------- s25: settle pop-up (win / loss / wash), ~2 s, with the sound; tap or Esc closes ----------
   The memes are the shared SVGs + captions in js/shared-s25.js (S25.MEMES / S25.MEME_MS), shown as an <img> data URL (never as markup).
   A window.FBN_SETTLE_MEMES override wins if present; if the shared file did not load, a plain text card shows. */
const POPTXT={win:['🏆','You won this one!'],loss:['😬','You lost this one. Pushups time.'],wash:['🤝','Wash: nobody owes anything.']};
/* s25: meme pop-ups are shelved (owner decision, same on the partner site). One switch: with POPUPS=false no pop-up or meme ever shows; settle sounds + mute are unaffected. */
const POPUPS=false;
function settlePop(kind){if(!POPUPS)return;try{const old=document.getElementById('b27Pop');if(old)old.remove();const X=window.S25,SM=X&&X.MEMES&&X.MEMES[kind];
  let M=(window.FBN_SETTLE_MEMES||{})[kind],T=POPTXT[kind];if(!T)return;
  if(!M&&SM&&typeof SM.svg==='string'&&typeof SM.cap==='string'){M={src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(SM.svg),alt:SM.cap};T=[T[0],SM.cap]}
  const ms=X&&+X.MEME_MS>0&&+X.MEME_MS<=5000?+X.MEME_MS:2000;
  const d=document.createElement('div');d.id='b27Pop';d.className='b27-pop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label',T[1]);d.tabIndex=-1;d.dataset.kind=kind;
  d.innerHTML=`<div class="b27-popc">${M&&M.src?`<img src="${esc(M.src)}" alt="${esc(M.alt||T[1])}">`:`<div class="b27-popi" aria-hidden="true">${T[0]}</div>`}<div class="b27-popt">${esc(T[1])}</div><div class="note">Tap to close</div></div>`;
  const close=()=>{clearTimeout(tm);document.removeEventListener('keydown',key,true);d.remove()};const key=e=>{if(e.key==='Escape')close()};const tm=setTimeout(close,ms);
  d.addEventListener('click',close);document.addEventListener('keydown',key,true);document.body.appendChild(d);try{d.focus({preventScroll:true})}catch(_){}}catch(e){}}
/* ---------- s25: reactions under each bet (👍 👎 🤪 🔥 😂 🍆): tap = add / remove mine + show who; long-press = show who; watchers: counts + who only ---------- */
const RX=['👍','👎','🤪','🔥','😂','🍆'];
const rxWho=(b,e)=>Object.entries(b.rx&&b.rx[e]||{}).filter(([m,on])=>on).map(([m])=>m);
/* s25c: the reaction row is the shared S25.renderReactions (js/shared-s25.js): used emojis only, with counts, a 😀+ picker, read-only for watchers.
   The page only leaves a mount point; mountRx() fills it after every render. Saved as the same {k:'rx',id,e,on} events as before. */
function rxHtml(b,me){return `<div class="b27-rx" data-rxm="${esc(b.id)}" aria-label="Reactions to Bet #${esc(b.n)}"></div>`}
function mountRx(){const X=window.S25;if(!X||typeof X.renderReactions!=='function')return;const me=meMid(),bs=compute();
  document.querySelectorAll('[data-rxm]').forEach(el=>{const b=bs.find(x=>x.id===el.getAttribute('data-rxm'));if(!b)return;const counts={},mine=[];
    RX.forEach(e=>{const w=rxWho(b,e);if(w.length)counts[e]=w.map(nm);if(me&&w.includes(me))mine.push(e)});
    X.renderReactions(el,counts,mine,(e,on)=>rxSet(b.id,e,on),{readOnly:!me||!!(H&&H.demo),emojis:RX});el.setAttribute('aria-label','Reactions to Bet #'+b.n)})}
async function rxSet(id,e,on){const me=meMid();if(!me||!RX.includes(e))return;const b=compute().find(x=>x.id===id);if(!b)return;
  const ev=mkEv('rx',{id,e,on:!!on});(S.logs[me]=S.logs[me]||[]).push(ev);render(true);   /* shown at once; the save below confirms it */
  try{await append([ev]);await confirmSaved([ev])}catch(x){S.msg='Couldn’t save that reaction. Try again.';S.bad=true;try{S.logs[me]=parseLog(await Store.get(KEY(me)))}catch(_){}}render(true)}
async function rxTap(el,showOnly){const id=el.dataset.id,e=el.dataset.e,me=meMid();if(!RX.includes(e)||!me||showOnly)return;const b=compute().find(x=>x.id===id);if(b)rxSet(id,e,!rxWho(b,e).includes(me))}
/* s25c bet-placed effect: shared S25.pickPlaced (swish unless muted, ~1 s confetti unless reduced motion, a short flash). Called only after the confirmed save. */
function placedFx(ids){try{const X=window.S25;if(!X||typeof X.pickPlaced!=='function')return null;const card=ids.map(i=>document.querySelector('[data-bet="'+i+'"]')).find(Boolean);if(!card)return null;
  if(!sndMuted()&&!(navigator.userActivation&&!navigator.userActivation.hasBeenActive)){const AC=window.AudioContext||window.webkitAudioContext;if(AC){sndCtx=sndCtx||new AC();if(sndCtx.state==='suspended')sndCtx.resume().catch(()=>{});X.ctx=sndCtx}}
  if(!card.id)card.id='b27C-'+ids[0];const out=X.pickPlaced(card,{muted:sndMuted()});
  document.querySelectorAll('.s25-fxlayer[data-for="'+card.id+'"] .s25-badge').forEach(x=>{x.textContent="Bet's in! 🏀"});S.lastFx=out;return out}catch(e){return null}}
/* ---------- s25: long bet text is clamped to 3 lines; a 'more' button (shown only when the text is cut) expands it, 'less' folds it again ---------- */
let clampQ=false;
function clampFix(){clampQ=false;document.querySelectorAll('.b27-c .b27-t').forEach(t=>{const b=t.nextElementSibling;if(!b||!b.classList.contains('b27-more'))return;if(t.classList.contains('open')){b.hidden=false;return}const h=t.clientHeight;t.classList.add('open');const full=t.clientHeight;t.classList.remove('open');b.hidden=!(full>h+1)})}   /* measured unclamped (scrollHeight is not reliable under line-clamp) */
let clampRT=0;window.addEventListener('resize',()=>{clearTimeout(clampRT);clampRT=setTimeout(clampFix,150)});
/* ---------- events ---------- */
const ACT={
  kind:el=>{const k=el.dataset.v==='pool'?'pool':'bet';if(S.kind===k)return;S.kind=k;S.msg='';S.f.confirm=false;S.p.confirm=false;render(true)},
  pp:el=>{const m=el.dataset.mid,k=S.p.pp.indexOf(m);if(k>=0)S.p.pp.splice(k,1);else S.p.pp.push(m);poolPaint()},
  ppall:()=>{S.p.pp=others().map(o=>o.mid);poolPaint()},
  ppclear:()=>{S.p.pp=[];poolPaint()},
  addplace:()=>{if(S.p.places.length<10)S.p.places.push('');render(true);const x=document.getElementById('s26p'+(S.p.places.length-1));if(x)try{x.focus({preventScroll:false})}catch(e){}},
  delplace:el=>{S.p.places.splice(+el.dataset.i,1);render(true)},
  poolplace:()=>{if(!meMid())return;const c=poolCheck();if(firstErr(c)){S.msg='';S.p.showErr={terms:1,people:1,buy:1,pay:1};render(true);poolPaint();const x=document.getElementById(c.e.terms?'b27Text':c.e.people?'s26lPeople':c.e.buy?'b27En':'s26p0');if(x){try{x.scrollIntoView({block:'center'})}catch(_){}try{x.focus({preventScroll:true})}catch(_){}}return}S.msg='';S.p.confirm=true;render(true)},
  pooledit:()=>{S.p.confirm=false;render(true)},
  poolconfirm:()=>poolConfirm(),
  modalbd:(el,e)=>{if(e.target!==el||S.busy)return;S.f.confirm=false;S.p.confirm=false;render(true)},
  placego:el=>{const id=el.dataset.id,b=compute().find(x=>x.id===id);if(!b||!b.places)return;const sel=S.placeWho[id]||[];
    if(b.places.some((a,i)=>!sel[i])){S.poolErr[id]=PT('ePickAll');S.ask=null;render(true);return}
    const back={};b.places.forEach((a,i)=>{back[sel[i]]=(back[sel[i]]||0)+a});b.parts.forEach(p=>{if(!(p in back))back[p]=0});poolSettle(b,back)},
  poolgo:el=>{const id=el.dataset.id,b=compute().find(x=>x.id===id);if(!b)return;const r=poolParse(b,S.poolTxt[id]||'');if(!r.ok||!r.back){S.poolErr[id]=r.ok?PT('eEmptyPay'):r.err;S.ask=null;render(true);return}poolSettle(b,r.back)},
  poolvoid:el=>{const b=compute().find(x=>x.id===el.dataset.id),me=meMid();if(!b||!me||b.by!==me||b.status!=='open')return;act([mkEv('w',{id:b.id})],'Saved.')},
  obview:el=>{const v=el.dataset.v==='tally'?'tally':'form';if(S.ob===v)return;S.ob=v;render(true);window.scrollTo(0,0)},   /* partner obView(): a sub-tab tap opens it at the top */
  opp:el=>{const f=S.f,m=el.dataset.mid;f.open=false;const k=f.opps.indexOf(m);if(k>=0)f.opps.splice(k,1);else{f.opps.push(m);const o=others().map(x=>x.mid);f.opps.sort((x,y)=>o.indexOf(x)-o.indexOf(y))}sync()},
  anyone:()=>{S.f.open=!S.f.open;if(S.f.open)S.f.opps=[];sync()},
  oppall:()=>{S.f.open=false;S.f.opps=others().map(o=>o.mid);sync()},
  oppclear:()=>{S.f.open=false;S.f.opps=[];sync()},
  amt:el=>{const v=+el.dataset.v,f=S.f;f.amtCustom=false;f.amtErr='';f.amt=C.amounts.includes(v)?v:null;sync()},
  amtcustom:()=>{const f=S.f;f.amtCustom=true;applyAmt(f.amtTxt,true);sync();const i=document.getElementById('b27Ao');if(i)i.focus({preventScroll:true})},
  odds:el=>{const[a,b]=el.dataset.v.split('-').map(Number),f=S.f;f.custom=false;f.oddsErr='';f.odds=[a,b];sync()},
  oddscustom:()=>{const f=S.f;f.custom=true;applyOdds(f.customTxt,true);sync();const i=document.getElementById('b27Co');if(i)i.focus({preventScroll:true})},
  place:()=>{const e=formOK();if(e){S.msg=e;S.bad=true;render(true);return}S.msg='';S.f.confirm=true;render(true)},
  edit:()=>{S.f.confirm=false;render(true)},
  confirm:()=>confirmPlace(),
  rx:el=>rxTap(el,false),
  more:el=>{const id=el.dataset.id;if(S.more[id])delete S.more[id];else S.more[id]=true;render(true);const b=document.querySelector('[data-lb=more][data-id="'+CSS.escape(id)+'"]');if(b)try{b.focus({preventScroll:true})}catch(_){}},
  sndtoggle:()=>{try{if(sndMuted())localStorage.removeItem(SND_KEY);else localStorage.setItem(SND_KEY,'1')}catch(e){}render(true)},
  autook:el=>{const id=el.dataset.id,b=compute().find(x=>x.id===id),me=meMid(),P=S.prop[id];
    if(!b||!me||b.by!==me||!LIVE(b)||!P||P.st!=='final'||P.r!==el.dataset.r){S.ask=null;S.msg=b&&b.by!==me?'Only the manager who placed this bet can confirm its result.':'That result can’t be confirmed any more.';S.bad=true;render(true);return}
    const w='autook'+P.r;if(S.ask&&S.ask.id===id&&S.ask.w===w){act([mkEv('s',{id,r:P.r,src:{g:P.g,sc:scoreText(b,P)}})],'Settled from the final score. Saved.')}else{S.ask={id,w};render(true)}},
  autofix:el=>{const id=el.dataset.id,b=compute().find(x=>x.id===id);if(!b||b.by!==meMid())return;S.autoFix[id]=1;S.ask=null;render(true)},
  accept:el=>doBet(el,'a','Accepted. The bet is on.'),
  decline:el=>doBet(el,'d','Declined.'),
  withdraw:el=>doBet(el,'w','Withdrawn.'),
  settle:el=>{const id=el.dataset.id,r=el.dataset.r,w='settle'+r;const b=compute().find(x=>x.id===id),me=meMid();
    /* s25: creator only (the button is not even drawn for anyone else; reduce() ignores a result from anyone else too) */
    if(!b||!me||b.by!==me||!LIVE(b)){S.ask=null;S.msg=b&&!LIVE(b)?'This bet is already settled.':'Only the manager who placed this bet can settle it.';S.bad=true;render(true);return}
    if(S.ask&&S.ask.id===id&&S.ask.w===w){doBet(el,'s','Saved.',{r})}else{S.ask={id,w};render(true)}},
  qbtoggle:el=>{const g=el.dataset.g||null;S.q.g=(!g||S.q.g===g)?null:g;S.q.msg='';redraw();if(S.q.g)setTimeout(()=>{try{const b=document.querySelector('.qb-pick [data-lb=qbpick]');if(b)b.focus({preventScroll:true})}catch(_){}},20)},
  qbamt:el=>{S.q.amt=+el.dataset.v===10?10:5;redraw()},
  qbvs:el=>{S.q.vs=el.dataset.mid;S.q.msg='';redraw()},
  qbpick:el=>qbPickGo(el),
  undogroup:el=>{const me=meMid(),gu=grpUndo(el.dataset.g,me);if(!gu.length)return;S.undoG=null;act(gu.map(b=>mkEv('w',{id:b.id})),'Undone: '+gu.length+' bets withdrawn.')},
  retry:()=>poll(true),
  fltreset:()=>{fSet('all','all',false,'');render(true)},
  betedit:el=>editBet(el),
  fixopen:el=>{S.fixOpen=el.dataset.id;S.ask=null;render(true)},
  fixcancel:()=>{S.fixOpen=null;S.ask=null;render(true)},
  fixreq:el=>{const id=el.dataset.id,r=el.dataset.r,w='fixreq'+r;if(S.ask&&S.ask.id===id&&S.ask.w===w){S.fixOpen=null;doBet(el,'fr','Asked. The result changes only when the other side confirms.',{r,fx:rid()})}else{S.ask={id,w};render(true)}},
  fixok:el=>{const id=el.dataset.id;if(S.ask&&S.ask.id===id&&S.ask.w==='fixok'){doBet(el,'fc','Confirmed. The result is updated.',{fx:el.dataset.fx})}else{S.ask={id,w:'fixok'};render(true)}},
  fixno:el=>doBet(el,'fd','Declined. The result stays as it was.',{fx:el.dataset.fx}),
  fixwd:el=>doBet(el,'fd','Request withdrawn.',{fx:el.dataset.fx}),
  startform:()=>{const i=document.getElementById('b27Text');if(i){i.scrollIntoView({block:'center'});i.focus({preventScroll:true})}}};
function doBet(el,k,msg,extra){const id=el.dataset.id,b=compute().find(x=>x.id===id);if(!b)return;
  if(k==='s'&&b.by!==meMid()){S.msg='Only the manager who placed this bet can settle it.';S.bad=true;render(true);return false}
  /* only what this manager is allowed to do is even offered, and reduce() ignores anything else */
  return act([mkEv(k,Object.assign({id},extra||{}))],msg)}
/* Edit a pending bet I placed: withdraw it (the normal w event in my own log), then open the New bet form filled with its fields. If the other side answered first, the withdraw does not count and we say so. */
/* s24b: fresh read of every manager's log (textdb GET) before Edit decides, so an answer that landed since the last poll is seen */
async function freshLogs(){const ids=mids();const res=await Promise.all(ids.map(async mid=>{try{return{mid,txt:await Store.get(KEY(mid))}}catch(e){return{mid,err:1}}}));
  if(res.some(r=>r.err))return false;res.forEach(r=>{S.logs[r.mid]=parseLog(r.txt);S.got[r.mid]=true});return true}
const TOO_LATE='Too late to edit, this bet was already answered.';
async function editBet(el){const me=meMid(),id=el.dataset.id,b0=compute().find(x=>x.id===id);if(!b0||b0.by!==me||b0.status!=='pending')return;
  if(S.busy)return;S.busy=true;let fresh=false;try{fresh=await freshLogs()}finally{S.busy=false}
  if(!fresh){S.msg='Couldn’t check this bet right now. Try Edit again in a moment.';S.bad=true;render(true);return}
  const b=compute().find(x=>x.id===id);if(!b||b.status!=='pending'||b.by!==me){S.msg=TOO_LATE;S.bad=true;render(true);return}
  const ok=await act([mkEv('w',{id})],'Withdrawn for editing. Change what you need and place it again.');if(!ok)return;
  const now=compute().find(x=>x.id===id);if(!now||now.status!=='withdrawn'){S.msg=TOO_LATE;S.bad=true;render(true);return}
  const amtStd=C.amounts.includes(b.amt),oddStd=C.odds.some(([x,y])=>x===b.a&&y===b.b);
  S.f={opps:b.to==='*'?[]:[b.to],open:b.to==='*',text:b.text,amt:b.amt,amtCustom:!amtStd,amtTxt:amtStd?'':String(b.amt),amtErr:'',odds:[b.a,b.b],custom:!oddStd,customTxt:oddStd?'':b.a+'-'+b.b,oddsErr:'',confirm:false};S.fid=null;S.qb='';S.edited=b.n;render(true);
  setTimeout(()=>{try{const f=document.getElementById('b27Form');if(f)f.scrollIntoView({block:'start'})}catch(_){}},30)}
function applyAmt(t,quiet){const f=S.f;f.amtTxt=t;const r=parseAmt(t);if(r.ok){f.amt=r.n;f.amtErr=''}else{f.amt=null;f.amtErr=quiet&&!String(t||'').trim()?'':r.err}}
function applyOdds(t,quiet){const f=S.f;f.customTxt=t;const r=parseOdds(t);if(r.ok){f.odds=[r.a,r.b];f.oddsErr=''}else{f.odds=null;f.oddsErr=quiet&&!t?'':r.err}}
/* s28g: 'This will be auto-settled after completion.' = the existing auto-settle path applies: readBet() reads a clear claim (team, spread or total) AND the League schedule
   (H.games()) has a game between those two teams (not final yet for the form; any for a live placed card). Same readBet/propose logic, no new parser. */
const AUTO_NOTE='This will be auto-settled after completion.';
function autoGame(c,upcoming){if(!c)return null;return((H&&H.games&&H.games())||[]).find(g=>g&&g.home&&g.away&&(!upcoming||g.status!=='final')&&[String(g.home.id),String(g.away.id)].includes(String(c.a))&&[String(g.home.id),String(g.away.id)].includes(String(c.b)))||null}
const autoNoteHtml=()=>`<div class="s29-auto" data-s29-auto="1">${AUTO_NOTE}</div>`;   /* = STOOPIDS s29d S29D-AUTO markup/class */
let AUTOT=0;function autoSoon(){clearTimeout(AUTOT);AUTOT=setTimeout(()=>{const e=document.getElementById('b27AutoN');if(e)e.innerHTML=autoNoteForm()},250)}   /* = STOOPIDS s29AutoSoon: live while typing, 250 ms debounce */
function autoNoteForm(){try{return autoGame(readBet(clean(S.f.text)),true)?autoNoteHtml():''}catch(e){return''}}
function readAsHtml(){const c=readBet(clean(S.f.text));return c?`<div class="note b27-readas" id="b27ReadAs">We read this as: <b>${esc(claimText(c))}</b>. After the final we’ll show you the score and a proposed result to confirm. Not right? Tap ← Change.</div>${autoGame(c,true)?autoNoteHtml():''}`:`<div class="note b27-readas" id="b27ReadAs">We can’t read this one automatically, so you’ll settle it by hand.</div>`}
async function confirmPlace(){if(S.busy)return;const e=formOK();if(e){S.msg=e;S.bad=true;S.f.confirm=false;render(true);return}
  const f=S.f,targets=f.open?['*']:f.opps.slice();
  /* ids are remembered for this exact form content, so tapping again after a failed save re-sends the SAME events (the log skips ones that already landed) */
  const sig=targets.join(',')+'|'+clean(f.text)+'|'+f.amt+'|'+f.odds.join('-');
  if(!S.fid||S.fid.sig!==sig)S.fid={sig,g:targets.length>1?rid():undefined,evs:targets.map(t=>({id:rid(),u:rid(),to:t}))};
  const ts=Date.now();
  const evs=S.fid.evs.map((x,i)=>Object.assign({k:'p',u:x.u,ts:ts+i,v:SV,id:x.id,to:x.to,amt:f.amt,a:f.odds[0],b:f.odds[1],text:clean(f.text)},S.fid.g?{g:S.fid.g}:{},(()=>{const c=readBet(clean(f.text));return c?{c}:{}})()));
  const ok=await act(evs,'');
  if(ok){const ns=S.fid.evs.map(x=>(compute().find(b=>b.id===x.id)||{}).n).filter(Boolean);S.msg='Placed! Bet #'+ns.join(', #')+(f.open?' is open to anyone.':targets.length>1?' ('+targets.length+' managers, '+num(f.amt)+' each) '+(targets.length>1?'are':'is')+' waiting for an answer.':' is waiting for '+nm(targets[0])+' to accept.')+' You can undo it for 30 seconds.';S.bad=false}
  if(ok){const pids=S.fid.evs.map(x=>x.id);S.edited=null;S.undoG=S.fid.g||null;S.f={opps:[],open:false,text:'',amt:null,amtCustom:false,amtTxt:'',amtErr:'',odds:[1,1],custom:false,customTxt:'',oddsErr:'',confirm:false};S.fid=null;render(true);placedFx(pids)}else{S.f.confirm=true;render(true)}}
/* "new" mark on the Bets tab: the highest bet number this device has looked at is kept in localStorage (fbn.x.<league>.betseen); a higher number now = something new */
/* s28g new-bets badge: count of bets placed (b.ts) after this device's last look (localStorage fbn.betsSeen.<league> = ms), not my own; first load sets it to now (0);
   opening Bets sets it to now. Local only: no server write, no extra fetch (uses the loaded bets). League view mode (league-d.js) only guards fbn.me./fbn.cm., so this key works there too. */
const seenKey=()=>'fbn.betsSeen.'+(H&&H.id);
const maxN=()=>compute().reduce((m,b)=>Math.max(m,b.n),0);
function markSeen(){try{if(H&&!H.demo&&S.state==='ok'&&!S.stale)localStorage.setItem(seenKey(),String(Date.now()))}catch(e){}}
function badge(){try{if(!H||H.demo||S.state!=='ok'||S.stale)return 0;const raw=localStorage.getItem(seenKey());if(raw==null){markSeen();return 0}const t=parseInt(raw,10)||0,me=meMid();return compute().filter(b=>b&&(b.ts||0)>t&&b.by!==me).length}catch(e){return 0}}
/* ---------- Quick bet (the pill on a Games card; s22) ----------
   Shown only when the two teams belong to DIFFERENT managers of this league, the game has not started, and this device has a manager link (watchers get no button).
   The picker lists the sides of up to three bet types: Winner (always, even odds), Spread / Over-under ONLY when the game data really carries a posted line (g.line = {fav,sp,ou}); the schedule feeds carry no lines, so today it is Winner only.
   Tapping a side only PREFILLS the New bet form (opponent, text, pushups, Even odds) and switches to the Bets tab. Nothing is saved until Place bet and then Yes, place it. The other manager still has to accept. */
const qbOwn=s=>{const n=s&&s.owners&&s.owners[0];const o=n==null?null:owners().find(x=>x.name===n);return o?o.mid:null};
const qbNm=(s,ctx)=>String((ctx&&ctx.name?ctx.name(s):'')||s.short||s.name||s.id);
function qbDate(g){try{if(g.start&&!isNaN(Date.parse(g.start)))return LTIME.dayDate(LTIME.dayKey(g.start));return /^\d{4}-\d{2}-\d{2}$/.test(g.day||'')?LTIME.dayDate(g.day):''}catch(e){return''}}   /* local date of the tip (Sat Nov 7) */
function qbOk(g){if(!H||H.demo||!g||g.status!=='scheduled'||!g.home||!g.away||!meMid())return false;
  const a=g.away.owners||[],h=g.home.owners||[];if(!a.length||!h.length||a.some(n=>h.includes(n)))return false;
  if(!qbOwn(g.away)||!qbOwn(g.home))return false;const t=Date.parse(g.start);if(!isNaN(t)&&t<=Date.now())return false;return true}
function qbOpts(g,ctx){const A=g.away,Hm=g.home,ln=(g.line&&typeof g.line==='object')?g.line:{},d=qbDate(g),o=[];const nm_=s=>qbNm(s,ctx);
  const fav=String(ln.fav)===String(A.id)?A:String(ln.fav)===String(Hm.id)?Hm:null,sp=Number(ln.sp);
  if(fav&&isFinite(sp)&&sp>0){const dog=fav===A?Hm:A;o.push({k:'sp',t:'Spread',s:[fav,dog].map(x=>{const y=x===fav?dog:fav,sx=x===fav?'-':'+',sy=y===fav?'-':'+';return{lab:nm_(x)+' '+sx+sp,team:x,txt:nm_(x)+' '+sx+sp+' vs '+nm_(y)+' '+sy+sp+', '+d}})})}
  o.push({k:'win',t:'Winner',s:[A,Hm].map(x=>{const y=x===A?Hm:A;return{lab:nm_(x),team:x,txt:nm_(x)+' beats '+nm_(y)+', '+d}})});
  const ou=Number(ln.ou);if(isFinite(ou)&&ou>0){const m=nm_(A)+' v '+nm_(Hm);o.push({k:'ou',t:'Over/under',s:[['Over','Under'],['Under','Over']].map(([x,y])=>({lab:x+' '+ou,team:null,txt:x+' '+ou+' vs '+y+' '+ou+', '+m+', '+d}))})}
  return o}
/* the button + (when open) the picker for one Games card. ctx.name(side) = the short team name the card shows. Returns '' when no button applies. */
function quickHtml(g,ctx){if(!qbOk(g))return'';const id=String(g.id),q=S.q,open=q.g===id;
  let h=`<div class="qbw"><button type="button" class="qb-btn" data-lb="qbtoggle" data-g="${esc(id)}" aria-expanded="${open}" aria-label="Quick bet: ${esc(qbNm(g.away,ctx))} vs ${esc(qbNm(g.home,ctx))}"><svg class="qb-bolt" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg> Quick bet</button></div>`;
  if(!open)return h;
  const ma=qbOwn(g.away),mh=qbOwn(g.home),me=meMid(),need=me!==ma&&me!==mh;
  h+=`<div class="qb-pick" role="group" aria-label="Quick bet picker" data-qbp="${esc(id)}">`;
  if(need)h+=`<div class="qb-r v"><span class="qb-l">I'm betting against</span><span class="qb-g w">${[ma,mh].map(m=>`<button type="button" data-lb="qbvs" data-mid="${esc(m)}" aria-pressed="${q.vs===m}">${esc(own(m).emoji||'')} ${esc(nm(m))}</button>`).join('')}</span></div>`;
  h+=`<div class="qb-r"><span class="qb-l">Pushups</span>${[5,10].map(a=>`<button type="button" data-lb="qbamt" data-v="${a}" aria-pressed="${q.amt===a}">${a}</button>`).join('')}<span class="note">more in the form</span></div>`;
  qbOpts(g,ctx).forEach(o=>{h+=`<div class="qb-r v"><span class="qb-l">${esc(o.t)}</span><span class="qb-g">${o.s.map((x,i)=>`<button type="button" class="qb-s" data-lb="qbpick" data-g="${esc(id)}" data-k="${o.k}" data-i="${i}" title="${esc(x.txt)}">${esc(x.lab)}</button>`).join('')}</span></div>`});
  if(q.msg)h+=`<div class="qb-m" role="alert">${esc(q.msg)}</div>`;
  return h+`<div class="qb-r"><button type="button" class="qb-x" data-lb="qbtoggle" data-g="">Close</button><span class="note">Nothing is placed yet: the form opens filled in. The other manager still has to accept.</span></div></div>`}
const qbHint=()=>S.qb&&S.qb===S.f.text&&!S.f.confirm?'<div class="qb-hint note" role="status" id="qbHint">⚡ Quick bet filled in — check and place it.</div>':'';
let QCTX=null;
const gameById=id=>((H&&H.games&&H.games())||[]).find(x=>String(x.id)===String(id));
const redraw=()=>{if(H&&H.rerender)H.rerender();else H.render()};
function qbPickGo(el){const g=gameById(el.dataset.g);if(!g||!qbOk(g))return;const o=qbOpts(g,QCTX).find(x=>x.k===el.dataset.k),x=o&&o.s[+el.dataset.i];if(!x)return;
  const ma=qbOwn(g.away),mh=qbOwn(g.home),me=meMid();let opp=me===ma?mh:me===mh?ma:S.q.vs;
  if(!opp||opp===me||(opp!==ma&&opp!==mh)){S.q.msg='Tap who you are betting against first.';redraw();return}
  const t=clean(x.txt);S.f={opps:[opp],open:false,text:t,amt:S.q.amt,amtCustom:false,amtTxt:'',amtErr:'',odds:[1,1],custom:false,customTxt:'',oddsErr:'',confirm:false};S.fid=null;S.qb=t;S.msg='';S.bad=false;
  S.q.g=null;S.q.msg='';if(H.goBets)H.goBets();
  setTimeout(()=>{try{const f=document.getElementById('b27Form');if(f){f.scrollIntoView({block:'start'});const b=document.getElementById('b27Place');if(b&&!b.disabled)b.focus({preventScroll:true})}}catch(_){}},30)}
function bind(){
  document.addEventListener('contextmenu',e=>{const el=e.target.closest&&e.target.closest('[data-lb=rx]');if(el&&document.getElementById('main')&&document.getElementById('main').contains(el)){e.preventDefault();rxTap(el,true)}});
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-lb]');if(!el||!H||!document.getElementById('main')||!document.getElementById('main').contains(el))return;const f=ACT[el.dataset.lb];if(f){e.preventDefault();f(el,e)}});
  document.addEventListener('change',e=>{const t=e.target;if(!t||!H)return;if(t.dataset&&t.dataset.pw){(S.placeWho[t.dataset.pw]=S.placeWho[t.dataset.pw]||[])[+t.dataset.i]=t.value;S.poolErr[t.dataset.pw]='';S.ask=null;return}if(t.id==='b27FP'||t.id==='b27FS'){fLoad();const p=t.id==='b27FP'?t.value:S.fp,s=t.id==='b27FS'?t.value:S.fs;if(fSet(p,s)){render(true);setTimeout(()=>{const x=document.getElementById(t.id);if(x)x.focus({preventScroll:true})},0)}}});
  document.addEventListener('input',e=>{const t=e.target;if(t&&t.id==='b27FQ'&&H){fLoad();const v=t.value,c=t.selectionStart;if(fSet(S.fp,S.fs,false,v)){render(true);const x=document.getElementById('b27FQ');if(x){x.value=v;x.focus({preventScroll:true});try{x.setSelectionRange(c,c)}catch(_){}}}return}if(!t||!H)return;if(t.dataset&&t.dataset.place!=null){S.p.places[+t.dataset.place]=t.value;poolPaint();return}if(t.dataset&&t.dataset.pt){S.poolTxt[t.dataset.pt]=t.value;S.poolErr[t.dataset.pt]='';S.ask=null;return}if(!t.id)return;
    if(S.kind==='pool'&&!S.edited&&t.id==='b27Text'){S.p.text=t.value;poolPaint();return}if(t.id==='b27En'){S.p.entry=t.value;poolPaint();return}
    if(t.id==='b27Text'){S.f.text=t.value;sync()}else if(t.id==='b27Ao'){applyAmt(t.value);sync()}else if(t.id==='b27Co'){applyOdds(t.value);sync()}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.q.g&&H&&document.getElementById('main')&&!(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))){const g=S.q.g;S.q.g=null;redraw();setTimeout(()=>{try{const b=document.querySelector('.qb-btn[data-g="'+g+'"]');if(b)b.focus({preventScroll:true})}catch(_){}},20);return}if(e.key==='Escape'&&H&&document.querySelector('.s26k-m')&&!S.busy){e.preventDefault();S.f.confirm=false;S.p.confirm=false;render(true);return}
    if(e.key==='Enter'&&e.target&&/^b27(Text|Ao|Co)$/.test(e.target.id)&&!(S.kind==='pool'&&!S.edited)){e.preventDefault();ACT.place()}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.started)poll(false)});
  window.addEventListener('online',()=>{if(S.started)poll(true)})}
function init(h){H=h;if(!S.started){S.started=true;bind()}}
function start(){if(!H||H.demo)return;poll(false)}
let modalWas=false;
function afterRender(){try{mountRx()}catch(e){}try{const m=document.querySelector('.s26k-m');document.body.classList.toggle('s26k-lock',!!m);if(m&&!modalWas){const b=m.querySelector('.b27-act .btn');if(b)b.focus({preventScroll:true})}modalWas=!!m}catch(e){}}
window.LBETS={after:afterRender,_t:{propose,S,stampText,poolEntries,poolCheck,poolParse,greedy,POOL_TXT,DISCLAIMER,placedFx,mountRx,clampFix,RX,settlePop,readBet,claimText,judge,autoGame,AUTO_NOTE,settleSound,soundFor,sndMuted},init,start,view,badge,poll,reduce,tally,parseLog,win,filterHash:()=>{try{return fHashOut()}catch(e){return''}},setFilterHash:(f,q)=>{try{fFromHash(f,q)}catch(e){}},reveal:id=>{try{return reveal(id)}catch(e){return false}},quickHtml:(g,ctx)=>{QCTX=ctx||null;try{return quickHtml(g,ctx)}catch(e){return''}},_state:S};
})();
