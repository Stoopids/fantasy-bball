/* League site "Bets" tab: friendly bets between the league's 8 managers, paid in PUSHUPS (not a stake unit). Modeled on the reference standings site’s Bets tab
   (pick opponents, say what the bet is, amount, odds, confirm, who owes who, net per manager, bet cards) with one deliberate difference: the other
   manager has to ACCEPT a bet (or decline it), and a result stands when both sides agree.
   DATA (all keys are this league's own, namespaced like every other key: fbn1-<league>-bets-<mid>):
     each manager owns ONE key, fbn1-<id>-bets-<mid>, holding an append-only log {v:1,ev:[...]} of that manager's own events. Nobody ever writes to
     another manager's key, so two managers writing at the same time cannot overwrite each other. A manager's own two devices are covered by
     read - append - write - read back (verify) - retry, and every event has a unique id (u) so a retry never double-posts.
     events:  p = propose {id,to:<mid>|'*'(anyone),amt,a,b,text,g}   a = accept {id}   d = decline {id}   w = withdraw {id}   s = report the result {id,r:b|o|p}
     b = the proposer was right, o = the other manager was right, p = wash (nobody owes anything)
   Everyone reads all 8 logs and computes the same bets with reduce(): an event only counts if it sits in the log of the manager who is allowed to do it
   (only the proposer proposes / withdraws, only the target accepts / declines, only the two sides report), so a forged event in someone else's log is ignored.
   Result rule: one side reports, the other agrees (settled) or reports something else (disputed, either side can fix its answer); a lone report settles by itself after 48 h.
   Who am I: the manager link already on this device (UI.getMe + the salted hash in the manager's claim); no identity = read only (spectator).
   Text is cleaned (control chars, e-mails and phone numbers hidden), capped (140 chars, 400 events / 60 KB per manager), escaped on output.
   A failed read keeps the last good bets on screen with a small "offline" note; reads and writes retry with back-off. No server. */
(function(){
const C={amounts:[5,10,25,50,100],min:5,max:1000,odds:[[1,1],[2,1],[3,1],[4,1],[5,1]],maxOdds:100,maxText:140,maxEv:400,maxBytes:60000,pollMs:60000,pollOpenMs:15000,autoMs:48*3600e3,undo:true};
const pu=n=>n+' pushup'+(n===1?'':'s');
const num=n=>Math.round(n).toLocaleString('en-US');
const signed=n=>(n>0?'+':'')+num(n);
const idOk=v=>typeof v==='string'&&/^[a-z0-9]{6,24}$/.test(v);
const midOk=v=>typeof v==='string'&&/^[0-9a-f]{8,32}$/.test(v);
let H=null;const SENT=new Map();   /* events this device wrote, kept so a lost update (two devices of mine writing at the same instant) is healed on the next look */
const S={logs:{},got:{},state:'init',fails:0,timer:null,busy:false,msg:'',bad:false,started:false,sig:'',ask:null,me:null,stale:0,
  f:{opps:[],open:false,text:'',amt:null,amtCustom:false,amtTxt:'',amtErr:'',odds:[1,1],custom:false,customTxt:'',oddsErr:'',confirm:false},fid:null};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY=mid=>FBN.Keys(H.id).base+'-bets-'+mid;
/* ---------- pure helpers ---------- */
function clean(t,max){t=String(t==null?'':t).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g,' ').replace(/\s+/g,' ').trim();
  t=t.replace(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi,'[hidden]');t=t.replace(/\+?\(?\d[\d\s().\-]{6,}\d/g,m=>m.replace(/\D/g,'').length>=8?'[hidden]':m);
  const a=Array.from(t);return(a.length>(max||C.maxText)?a.slice(0,max||C.maxText).join(''):t).trim()}
function parseAmt(t){const s=String(t==null?'':t).trim();if(!s)return{ok:false,err:'Type a number of pushups ('+C.min+' to '+C.max+').'};if(/^-/.test(s))return{ok:false,err:'Minimum is '+C.min+' pushups.'};
  if(!/^\d{1,6}$/.test(s))return{ok:false,err:'Whole numbers only, like 25.'};const n=parseInt(s,10);if(n<C.min)return{ok:false,err:'Minimum is '+C.min+' pushups.'};if(n>C.max)return{ok:false,err:'Maximum is '+C.max+' pushups.'};return{ok:true,n}}
function parseOdds(t){const s=String(t==null?'':t).trim().replace(/\s+/g,'');if(!s)return{ok:false,err:'Type odds like 7-2 or 10-1.'};const m=s.match(/^(\d{1,4})[-\/:](\d{1,4})$/);
  if(!m)return{ok:false,err:'Use two whole numbers like 7-2, 7/2 or 7:2.'};const a=parseInt(m[1],10),b=parseInt(m[2],10);if(a<1||b<1)return{ok:false,err:'Both numbers must be at least 1.'};
  if(a>C.maxOdds||b>C.maxOdds)return{ok:false,err:'Both numbers must be '+C.maxOdds+' or less.'};return{ok:true,a,b}}
const win=(amt,a,b)=>Math.max(1,Math.floor((amt*a*2+b)/(2*b)));      /* amt x a/b rounded half up, whole number, never below 1 */
const rounded=(amt,a,b)=>(amt*a)%b!==0;
const oddsLabel=(a,b)=>a===1&&b===1?'Even (1-1)':a+'-'+b;
const oddsShort=(a,b)=>a===1&&b===1?'at even odds':'at '+a+'-'+b;
function vEv(e){if(!e||typeof e!=='object')return null;const ts=Number(e.ts);if(!isFinite(ts)||ts<1e12||ts>4e12||!idOk(e.u)||!idOk(e.id))return null;
  if(e.k==='p'){const amt=Number(e.amt),a=Number(e.a),b=Number(e.b);if(!(e.to==='*'||midOk(e.to))||!Number.isInteger(amt)||amt<C.min||amt>C.max||!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a>C.maxOdds||b>C.maxOdds||typeof e.text!=='string')return null;
    const text=clean(e.text);if(!text)return null;return{k:'p',u:e.u,ts,id:e.id,to:e.to,amt,a,b,text,g:idOk(e.g)?e.g:undefined}}
  if(e.k==='a'||e.k==='d'||e.k==='w')return{k:e.k,u:e.u,ts,id:e.id};
  if(e.k==='s'&&(e.r==='b'||e.r==='o'||e.r==='p'))return{k:'s',u:e.u,ts,id:e.id,r:e.r};return null}
function parseLog(txt){try{if(!txt||!String(txt).trim())return[];let d=JSON.parse(txt);if(typeof d==='string')d=JSON.parse(d);const ev=d&&Array.isArray(d.ev)?d.ev:[];return ev.slice(0,C.maxEv).map(vEv).filter(Boolean)}catch(e){return[]}}
/* logs: {mid:[events]}  mids: the league's managers. Every event is checked against WHO wrote it (= whose log it is in). */
function reduce(logs,mids,now){const set=new Set(mids),all=[];
  mids.forEach(mid=>{(logs[mid]||[]).forEach((e,i)=>all.push({e,mid,i}))});
  const pt={};all.forEach(x=>{if(x.e.k==='p'&&!(x.e.id in pt))pt[x.e.id]=x.e.ts});
  all.forEach(x=>{x.t=x.e.k==='p'?x.e.ts:Math.max(x.e.ts,(pt[x.e.id]||0)+1)});   /* a slow clock on one phone must not put an answer before the question */
  all.sort((x,y)=>x.t-y.t||(x.mid<y.mid?-1:x.mid>y.mid?1:0)||x.i-y.i);
  const bets=new Map(),seen=new Set();let n=0;
  for(const{e,mid}of all){if(seen.has(mid+'|'+e.u))continue;seen.add(mid+'|'+e.u);
    if(e.k==='p'){if(bets.has(e.id)||(e.to!=='*'&&(!set.has(e.to)||e.to===mid)))continue;
      bets.set(e.id,{id:e.id,n:++n,by:mid,to:e.to,amt:e.amt,a:e.a,b:e.b,text:e.text,g:e.g,ts:e.ts,status:'pending',acc:null,reps:{},res:null,auto:false});continue}
    const b=bets.get(e.id);if(!b)continue;
    if(e.k==='a'){if(b.status!=='pending'||mid===b.by||(b.to!=='*'&&b.to!==mid))continue;b.status='open';b.acc=mid;b.accTs=e.ts}
    else if(e.k==='d'){if(b.status!=='pending'||b.to!==mid)continue;b.status='declined'}
    else if(e.k==='w'){if(b.status!=='pending'||mid!==b.by)continue;b.status='withdrawn'}
    else if(e.k==='s'){if(!(b.status==='open'||b.status==='reported'||b.status==='disputed')||(mid!==b.by&&mid!==b.acc))continue;
      b.reps[mid]={r:e.r,ts:e.ts};const o=mid===b.by?b.acc:b.by,ro=b.reps[o];
      if(ro&&ro.r===e.r){b.status='settled';b.res=e.r;b.settledTs=e.ts}else if(ro)b.status='disputed';else b.status='reported'}}
  const out=[...bets.values()];
  out.forEach(b=>{if(b.status==='reported'){const x=Object.keys(b.reps)[0];if(now-b.reps[x].ts>=C.autoMs){b.status='settled';b.res=b.reps[x].r;b.auto=true}}});
  return out}
const payFor=b=>({right:win(b.amt,b.a,b.b),wrong:b.amt});
function tally(bets){const pair={},per={};let openN=0,openC=0,waitN=0;const P=m=>per[m]||(per[m]={net:0,bets:0});
  for(const b of bets){if(b.status==='pending'){waitN++;continue}
    if(b.status==='open'||b.status==='reported'||b.status==='disputed'){openN++;openC+=b.amt;continue}
    if(b.status!=='settled')continue;P(b.by).bets++;P(b.acc).bets++;if(b.res==='p')continue;
    const p=payFor(b),w=b.res==='b'?b.by:b.acc,l=b.res==='b'?b.acc:b.by,c=b.res==='b'?p.right:p.wrong;P(w).net+=c;P(l).net-=c;
    const k=[w,l].sort().join('|');pair[k]=pair[k]||{x:k.split('|')[0],y:k.split('|')[1],net:0};pair[k].net+=(w===pair[k].x?c:-c)}
  const owes=[];Object.values(pair).forEach(p=>{if(p.net>0)owes.push({from:p.y,to:p.x,num:p.net});else if(p.net<0)owes.push({from:p.x,to:p.y,num:-p.net})});
  return{owes,per,openN,openC,waitN}}
/* ---------- host ---------- */
const owners=()=>(H&&H.owners())||[];
const own=mid=>owners().find(o=>o.mid===mid)||{mid,name:'Manager',emoji:''};
const nm=mid=>own(mid).name;
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
  if(changed||manual){if(H.active())render()}
}
function schedule(){clearTimeout(S.timer);S.timer=null;if(document.hidden||!H||H.demo)return;
  const base=(H.active()?C.pollOpenMs:C.pollMs)*Math.pow(2,S.fails),d=Math.min(base,240000)*(0.85+Math.random()*0.3);S.timer=setTimeout(()=>poll(false),d)}
/* a second device of mine may have overwritten my log between my write and my read-back; look again a moment later and, if any of my events is gone, put it back (events are idempotent by id) */
let healing=false;
async function heal(){const me=meMid();if(!me||healing||!SENT.size||(H&&H.demo))return;healing=true;
  try{const cur=parseLog(await Store.get(KEY(me)));const have=new Set(cur.map(e=>e.u));const miss=[...SENT.values()].filter(e=>!have.has(e.u));
    if(miss.length){await append(miss);if(H&&H.active())render()}}catch(e){}finally{healing=false}}
/* append events to MY OWN log only: read, append what is missing, write, read back to verify, retry once more if a second device of mine got in between */
async function append(evs){const me=meMid();if(!me)throw new Error('nome');const key=KEY(me);
  for(let t=0;t<3;t++){
    const cur=parseLog(await Store.get(key));const have=new Set(cur.map(e=>e.u));const miss=evs.filter(e=>!have.has(e.u));
    if(!miss.length){S.logs[me]=cur;evs.forEach(e=>SENT.set(e.u,e));return cur}
    const next=cur.concat(miss);const txt=JSON.stringify({v:1,ev:next});if(next.length>C.maxEv||txt.length>C.maxBytes)throw new Error('full');
    await Store.set(key,txt);const back=parseLog(await Store.get(key));
    if(evs.every(e=>back.some(x=>x.u===e.u))){S.logs[me]=back;evs.forEach(e=>SENT.set(e.u,e));setTimeout(heal,1800);return back}}
  throw new Error('conflict')}
const mkEv=(k,o)=>Object.assign({k,u:rid(),ts:Date.now()},o);
async function act(evs,okMsg){if(S.busy)return;if(!meMid()){S.msg='Open this page from your own manager link to bet.';S.bad=true;render(true);return}
  S.busy=true;S.msg='Saving…';S.bad=false;S.ask=null;render(true);
  try{await append(evs);S.msg=okMsg||'Saved.';S.bad=false;S.sig=JSON.stringify(S.logs)+'|'+S.state+'|'+S.stale;return true}
  catch(e){S.msg=e&&e.message==='full'?'Your bets log is full.':'Couldn’t save. Check your connection and tap the button again (it won’t double-post).';S.bad=true;return false}
  finally{S.busy=false;render(true)}}
/* ---------- form ---------- */
const others=()=>owners().filter(o=>o.mid!==meMid());
function formOK(){const me=meMid(),f=S.f;if(!me)return'Open this page from your own manager link to bet.';
  if(!f.open){const ids=others().map(o=>o.mid);if(!f.opps.length||!f.opps.every(m=>ids.includes(m)))return'Choose who you are betting against (or tap Anyone).'}
  if(!clean(f.text))return'Say what the bet is about.';
  if(!Number.isInteger(f.amt)||f.amt<C.min||f.amt>C.max)return f.amtCustom?(parseAmt(f.amtTxt).err||'Pick a number of pushups.'):'Tap a number of pushups or type your own (minimum '+C.min+').';
  if(!(f.odds&&f.odds[0]>=1&&f.odds[1]>=1))return'Pick the odds.';return''}
function lines(by,to,amt,a,b){const p={right:win(amt,a,b),wrong:amt};const tn=to==='*'?'whoever takes it':nm(to);
  return{top:nm(by)+' backs it: '+pu(amt)+' '+oddsShort(a,b)+'.',win:'If '+nm(by)+' is right, '+tn+' owes '+nm(by)+' '+pu(p.right)+'.',lose:'If '+tn+' is right, '+nm(by)+' owes '+(to==='*'?'them':nm(to))+' '+pu(p.wrong)+'.',rounded:rounded(amt,a,b)}}
function liveHtml(){const f=S.f,me=meMid();if(!me||(!f.open&&!f.opps.length)||!f.amt||!f.odds)return'<span class="mut">Pick who, a number of pushups and the odds to see who owes what.</span>';
  const L=lines(me,f.open?'*':f.opps[0],f.amt,f.odds[0],f.odds[1]);
  return'<b>'+esc(L.top)+'</b>'+(!f.open&&f.opps.length>1?'<div class="mut b27-r">'+f.opps.length+' managers: each gets its own bet, answered by each of them.</div>':'')+'<div class="b27-w">'+esc(L.win)+'</div><div class="b27-l">'+esc(L.lose)+'</div>'+(L.rounded?'<div class="mut b27-r">Rounded to a whole number.</div>':'')}
function summary(){const f=S.f,me=meMid();const o=f.open?'anyone':f.opps.length?f.opps.map(nm).join(', '):'…';const od=f.odds?oddsShort(f.odds[0],f.odds[1]).replace(/^at /,''):'?';const t=clean(f.text);
  return(me?nm(me):'You')+' vs '+o+' · '+(f.amt?pu(f.amt):'?')+' · '+od+(t?' · '+t:'')}
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
  const live=document.getElementById('b27Live');if(live)live.innerHTML=liveHtml();const sum=document.getElementById('b27Sum');if(sum)sum.textContent=summary();
  const err=formOK();const pb=document.getElementById('b27Place');if(pb){pb.disabled=!!err||S.busy;pb.setAttribute('aria-disabled',String(!!err))}
  const hint=document.getElementById('b27Hint');if(hint)hint.textContent=err&&(f.opps.length||f.open||f.text||f.amt)?err:''}
const sync=()=>{try{syncDom()}catch(e){}};
/* ---------- view ---------- */
const STX={pending:['Waiting','open'],open:['Open','open'],reported:['Result reported','open'],disputed:['Disagreement','unparsed'],settled:['Settled','settled'],declined:['Declined','unparsed'],withdrawn:['Withdrawn','unparsed']};
function resultLine(b){if(b.status!=='settled')return'';const p=payFor(b);const d=b.auto?' (settled automatically: no reply for 2 days)':'';
  if(b.res==='p')return'Wash: nobody owes anything'+d;
  return b.res==='b'?nm(b.by)+' won ('+nm(b.acc)+' owes '+pu(p.right)+')'+d:nm(b.acc)+' won ('+nm(b.by)+' owes '+pu(p.wrong)+')'+d}
function card(b,me){const L=lines(b.by,b.acc||b.to,b.amt,b.a,b.b);const st=STX[b.status];const party=me&&(b.by===me||b.acc===me);
  const other=b.acc||b.to;const vs=b.to==='*'&&!b.acc?'anyone who takes it':nm(other);
  let h=`<div class="card b27-c" data-bet="${esc(b.id)}"><div><b>Bet #${b.n}</b> <span class="st ${st[1]}">${esc(st[0])}</span> <span class="mut" style="font-size:12px">${esc(day(b.ts))}</span></div>
   <div class="b27-t">${esc(b.text)}</div><div class="b27-m"><b>${esc(nm(b.by))}</b> vs <b>${esc(vs)}</b> · <b>${esc(pu(b.amt))}</b> · ${esc(oddsLabel(b.a,b.b))}</div>
   <div class="b27-w">${esc(L.win)}</div><div class="b27-l">${esc(L.lose)}</div>${L.rounded?'<div class="mut b27-r">Rounded to a whole number.</div>':''}`;
  const rl=resultLine(b);if(rl)h+=`<div class="note" style="margin-top:4px"><b>Result:</b> ${esc(rl)}</div>`;
  const ask=(k,r)=>S.ask&&S.ask.id===b.id&&S.ask.w===k+(r||'');
  const btn=(k,label,extra,r)=>`<button type="button" class="btn ${extra||'sec'} b27-b" data-lb="${k}" data-id="${esc(b.id)}"${r?` data-r="${r}"`:''}${S.busy?' disabled':''}>${ask(k,r)?'Tap again to confirm':label}</button>`;
  if(b.status==='pending'){
    if(me&&me!==b.by&&(b.to==='*'||b.to===me))h+=`<div class="note" style="margin-top:4px">${b.to==='*'?esc(nm(b.by))+' is open to anyone: take it?':esc(nm(b.by))+' is asking you.'}</div><div class="b27-act">${btn('accept','✅ Accept','pri')}${b.to===me?btn('decline','✖ Decline'):''}</div>`;
    else if(me===b.by)h+=`<div class="note" style="margin-top:4px">Waiting for ${b.to==='*'?'someone to take it':esc(nm(b.to))+' to answer'}.</div><div class="b27-act">${btn('withdraw','↩ Withdraw this bet')}</div>`;
    else h+=`<div class="note" style="margin-top:4px">Waiting for ${b.to==='*'?'someone to take it':esc(nm(b.to))+' to answer'}.</div>`}
  if((b.status==='open'||b.status==='reported'||b.status==='disputed')&&party){
    const o=me===b.by?b.acc:b.by,ro=b.reps[o],rm=b.reps[me];
    const labels={b:nm(b.by)+' won',o:nm(b.acc)+' won',p:'Wash'};
    if(b.status==='reported'&&ro)h+=`<div class="note" style="margin-top:4px">${esc(nm(o))} says: <b>${esc(labels[ro.r])}</b>. Agree or answer differently. Without a reply it settles by itself after 2 days.</div>`;
    else if(b.status==='reported'&&rm)h+=`<div class="note" style="margin-top:4px">You said: <b>${esc(labels[rm.r])}</b>. Waiting for ${esc(nm(o))} to agree (it settles by itself after 2 days).</div>`;
    else if(b.status==='disputed')h+=`<div class="note" style="margin-top:4px">${esc(nm(b.by))} says <b>${esc(labels[b.reps[b.by].r])}</b>, ${esc(nm(b.acc))} says <b>${esc(labels[b.reps[b.acc].r])}</b>. Talk it over, then either of you can change the answer.</div>`;
    h+=`<div class="b27-act"><span class="note">Who won?</span>${['b','o','p'].map(r=>btn('settle',(ro&&ro.r===r&&b.status==='reported'?'👍 Agree: ':'')+labels[r],ro&&ro.r===r&&b.status==='reported'?'pri':'sec',r)).join('')}</div>`}
  return h+'</div>'}
const nmHtml=mid=>{const o=own(mid),sh=shortName(o.name);return`<span class="oqn${sh!==o.name?' hs':''}" data-em="${esc(o.emoji||'')}" data-e1="${esc(first(o.emoji))}"><span class="f">${esc(o.name)}</span>${sh!==o.name?`<span class="s">${esc(sh)}</span>`:''}</span>`};
const first=e=>{e=String(e||'');try{return new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(e)[Symbol.iterator]().next().value.segment}catch(_){return Array.from(e)[0]||''}};
function owesHtml(T){const ppl=Object.entries(T.per).sort((a,b)=>b[1].net-a[1].net||nm(a[0]).localeCompare(nm(b[0])));
  let h='<h2 id="b27Owes">Who owes who <span class="note">(settled bets only)</span></h2>';
  if(!ppl.length)return h+'<div class="card"><div class="note" id="b27NoOwe">Nothing settled yet. Settled bets show up here, in pushups.</div></div>';
  const ow=owners(),cell={},rt={},ct={};ow.forEach(o=>{cell[o.mid]={};rt[o.mid]=0;ct[o.mid]=0});
  T.owes.forEach(o=>{if(cell[o.from]&&o.to in cell){cell[o.from][o.to]=o.num;rt[o.from]+=o.num;ct[o.to]+=o.num}});
  const em=o=>o.emoji?esc(o.emoji)+' ':'';
  h+=`<div class="swipe oqw">↔ Swipe sideways to see every column</div><div class="card sc"><table class="mx oqm" id="b27Matrix" aria-label="Who owes who, in pushups"><thead><tr><th>owes ↓ / to →</th>${ow.map(o=>`<th data-n="${esc(o.name)}">${esc(o.name)}</th>`).join('')}<th class="t">Total owes</th></tr></thead><tbody>${ow.map(r=>`<tr><td class="rn"><b>${em(r)}${esc(r.name)}</b></td>${ow.map(c=>c.mid===r.mid?'<td class="z dg">·</td>':cell[r.mid][c.mid]?`<td class="c">${num(cell[r.mid][c.mid])}</td>`:'<td class="z c">0</td>').join('')}<td class="t">${num(rt[r.mid])}</td></tr>`).join('')}</tbody><tfoot><tr><td class="rn">Total won</td>${ow.map(c=>`<td>${num(ct[c.mid])}</td>`).join('')}<td class="t"></td></tr></tfoot></table></div><div class="card" id="b27Board">`;
  const mx=Math.max(1,...ppl.map(([m,p])=>Math.abs(p.net)));
  h+=`<div class="b27-q">Net pushups per manager <span class="note">(+ is owed to them, − is what they owe)</span></div><div class="oqc" role="list" aria-label="Net pushups per manager">${ppl.map(([m,p])=>{const w=p.net?Math.max(.03,Math.abs(p.net)/mx):0;return`<div class="cr" role="listitem"><span class="cn">${nmHtml(m)}</span><span class="ct"><i class="cb ${p.net>0?'pos':'neg'}" style="--w:${w.toFixed(3)}"></i></span><b class="cv ${p.net>0?'good':p.net<0?'bad':''}">${signed(p.net)}</b></div>`}).join('')}</div>`;
  return h}
function formHtml(me){const f=S.f,oth=others();const err=formOK();
  return`<div class="card b27-form" id="b27Form"><b>New bet</b> <span class="note">· you are <b>${esc(nm(me))}</b></span>
   <div class="b27-q">1. Who are you betting against? <span class="note">Tap one or more, or Anyone. Each one answers on their own.</span></div>
   <div class="b27-opps" role="group" aria-label="Opponents" style="--n:${oth.length}">${oth.map(o=>`<button type="button" class="b27-chip op" data-lb="opp" data-mid="${esc(o.mid)}" aria-label="${esc(o.name)}" aria-pressed="${!f.open&&f.opps.includes(o.mid)}"><span class="ck" aria-hidden="true">✓</span><span class="em" aria-hidden="true">${esc(o.emoji||'')}</span><span class="nm" aria-hidden="true"><span class="f">${esc(o.name)}</span><span class="sh">${esc(shortName(o.name))}</span><span class="xs">${esc(tinyName(o.name))}</span></span></button>`).join('')}</div>
   <div class="b27-selbar"><button type="button" class="b27-sm" data-lb="anyone" aria-pressed="${f.open}">🌍 Anyone</button><button type="button" class="b27-sm" data-lb="oppall">Select all</button><button type="button" class="b27-sm" data-lb="oppclear">Clear</button><span class="cnt" id="b27SelCnt" aria-live="polite">${f.open?'Open to anyone':f.opps.length?f.opps.length+' selected':'None selected'}</span></div>
   <div class="b27-q"><label for="b27Text">2. What’s the bet? <span class="note">I say…</span></label></div><input id="b27Text" class="sb-in b27-in" maxlength="${C.maxText}" autocomplete="off" enterkeyhint="go" placeholder="e.g. Kansas beats Duke" value="${esc(f.text)}">
   <div class="b27-q">3. How many pushups? <span class="note">(minimum ${C.min})</span></div><div class="b27-amts" role="group" aria-label="Pushups">${C.amounts.map(a=>`<button type="button" class="b27-amt" data-lb="amt" data-v="${a}" aria-pressed="${!f.amtCustom&&a===f.amt}">${a}</button>`).join('')}<button type="button" class="b27-amt cu" data-lb="amtcustom" aria-pressed="${f.amtCustom}">Custom</button></div>
   <div id="b27Aw" class="b27-cw"${f.amtCustom?'':' hidden'}><label for="b27Ao" class="sr">Custom number of pushups</label><input id="b27Ao" class="sb-in b27-in" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" placeholder="Whole number, ${C.min} to ${C.max}" value="${esc(f.amtTxt)}"><div id="b27Ae" class="b27-bad-t" role="alert">${esc(f.amtErr)}</div></div>
   <div class="b27-q">4. Odds <span class="note">(if you’re right, they owe pushups × first ÷ second)</span></div><div class="b27-chips" role="group" aria-label="Odds">${C.odds.map(([a,b])=>`<button type="button" class="b27-chip" data-lb="odds" data-v="${a}-${b}" aria-pressed="${!f.custom&&!!f.odds&&f.odds[0]===a&&f.odds[1]===b}">${a===1&&b===1?'Even':a+'-'+b}</button>`).join('')}<button type="button" class="b27-chip" data-lb="oddscustom" aria-pressed="${f.custom}">Custom…</button></div>
   <div id="b27Cw" class="b27-cw"${f.custom?'':' hidden'}><label for="b27Co" class="sr">Custom odds</label><input id="b27Co" class="sb-in b27-in" inputmode="text" autocomplete="off" maxlength="9" placeholder="e.g. 7-2 or 10-1" value="${esc(f.customTxt)}"><div id="b27Ce" class="b27-bad-t" role="alert">${esc(f.oddsErr)}</div></div>
   <div class="b27-livebox" id="b27Live" aria-live="polite">${liveHtml()}</div><div class="b27-sum" id="b27Sum">${esc(summary())}</div><div class="b27-bad-t" id="b27Hint"></div>
   <button type="button" id="b27Place" class="btn b27-big" data-lb="place"${err?' disabled aria-disabled="true"':''}>Place bet</button></div>`}
function view(){
  if(!H)return'';
  if(H.demo)return'<div class="card" id="b27Demo"><b>💪 Bets</b><div class="note">Bets are switched off in the demo, so nothing here can touch a real league.</div></div>';
  const me=meMid(),bets=compute().sort((a,b)=>b.n-a.n),T=tally(bets);
  const top=S.state==='ok'?(S.stale?`<span class="bad" id="b27Off">● offline: showing the last saved bets. Retrying…</span>`:'<span class="good">● live</span> · everyone in this league sees the same bets')
    :S.state==='error'?`<span class="bad" id="b27Off">● can’t reach the bets right now. Retrying… <button type="button" class="btn sec b27-b" data-lb="retry" id="b27Retry">Try now</button></span>`:'Connecting…';
  let h=`<div class="card" id="b27Head"><b>💪 Bets</b><div class="note b27-note" id="b27Note">Bets here are just for fun, a challenge between friends, and are always paid in <b>pushups</b>.</div><div class="note" style="margin-top:6px">This page just <b>records</b> who bet what and who owes whom. The other manager has to accept a bet, and a result counts when both sides agree.</div><div class="note" id="b27Top" style="margin-top:6px">${top}</div></div>`;
  if(S.msg)h+=`<div class="card ${S.bad?'b27-bad':'b27-ok'}" role="status" id="b27Msg">${esc(S.msg)}</div>`;
  const mine=me?bets.filter(b=>b.status==='pending'&&b.by!==me&&(b.to==='*'||b.to===me)):[];
  if(!me)h+=`<div class="card" id="b27Watch"><b>👀 Watching only</b><div class="note">You can read every bet here. To place or answer a bet, open this page from your own manager link (the League site button in the draft room).</div><p style="margin:8px 0 0"><a class="btn b27-b" id="b27Room" href="${esc(H.roomHref())}">Open the draft room</a></p></div>`;
  if(mine.length)h+=`<h2 id="b27ForYou">Waiting for your answer (${mine.length})</h2>`+mine.map(b=>card(b,me)).join('');
  if(me){if(S.f.confirm){const e=formOK();h+=`<div class="card b27-confirm" id="b27Confirm"><b>Check it, then confirm</b><div class="b27-sum">${esc(summary())}</div><div id="b27Live">${liveHtml()}</div><div class="b27-act"><button type="button" class="btn b27-big" data-lb="confirm"${S.busy||e?' disabled':''}>${S.busy?'Saving…':'✅ Yes, place it'}</button><button type="button" class="btn sec b27-big" data-lb="edit"${S.busy?' disabled':''}>← Change</button></div></div>`}else h+=formHtml(me)}
  h+=owesHtml(T);
  h+=`<div class="note" style="margin-top:6px" id="b27OpenNote">Still open: ${T.openN} bet${T.openN===1?'':'s'}, ${pu(T.openC)} in total.${T.waitN?` Waiting for an answer: ${T.waitN}.`:''}</div>`;
  const rest=bets.filter(b=>!mine.includes(b));
  h+=`<h2>Bets (${bets.length})</h2>`+(rest.length?rest.slice(0,60).map(b=>card(b,me)).join(''):(bets.length?'':`<div class="card note" id="b27Empty"><b>No bets yet.</b> ${me?'Be the first: <button type="button" class="btn sec b27-b" data-lb="startform" id="b27Start">Start a bet</button>':'Managers can place bets from their own manager link.'}</div>`));
  if(rest.length>60)h+='<p class="note">Showing the latest 60.</p>';
  return h}
/* ---------- events ---------- */
const ACT={
  opp:el=>{const f=S.f,m=el.dataset.mid;f.open=false;const k=f.opps.indexOf(m);if(k>=0)f.opps.splice(k,1);else{f.opps.push(m);const o=others().map(x=>x.mid);f.opps.sort((x,y)=>o.indexOf(x)-o.indexOf(y))}sync()},
  anyone:()=>{S.f.open=!S.f.open;if(S.f.open)S.f.opps=[];sync()},
  oppall:()=>{S.f.open=false;S.f.opps=others().map(o=>o.mid);sync()},
  oppclear:()=>{S.f.open=false;S.f.opps=[];sync()},
  amt:el=>{const v=+el.dataset.v,f=S.f;f.amtCustom=false;f.amtErr='';f.amt=C.amounts.includes(v)?v:null;sync()},
  amtcustom:()=>{const f=S.f;f.amtCustom=true;applyAmt(f.amtTxt,true);sync();const i=document.getElementById('b27Ao');if(i)i.focus()},
  odds:el=>{const[a,b]=el.dataset.v.split('-').map(Number),f=S.f;f.custom=false;f.oddsErr='';f.odds=[a,b];sync()},
  oddscustom:()=>{const f=S.f;f.custom=true;applyOdds(f.customTxt,true);sync();const i=document.getElementById('b27Co');if(i)i.focus()},
  place:()=>{const e=formOK();if(e){S.msg=e;S.bad=true;render(true);return}S.msg='';S.f.confirm=true;render(true)},
  edit:()=>{S.f.confirm=false;render(true)},
  confirm:()=>confirmPlace(),
  accept:el=>doBet(el,'a','Accepted. The bet is on.'),
  decline:el=>doBet(el,'d','Declined.'),
  withdraw:el=>doBet(el,'w','Withdrawn.'),
  settle:el=>{const id=el.dataset.id,r=el.dataset.r,w='settle'+r;if(S.ask&&S.ask.id===id&&S.ask.w===w){doBet(el,'s','Saved. A result counts once both sides agree.',{r})}else{S.ask={id,w};render(true)}},
  retry:()=>poll(true),
  startform:()=>{const i=document.getElementById('b27Text');if(i){i.scrollIntoView({block:'center'});i.focus()}}};
function doBet(el,k,msg,extra){const id=el.dataset.id,b=compute().find(x=>x.id===id);if(!b)return;
  /* only what this manager is allowed to do is even offered, and reduce() ignores anything else */
  return act([mkEv(k,Object.assign({id},extra||{}))],msg)}
function applyAmt(t,quiet){const f=S.f;f.amtTxt=t;const r=parseAmt(t);if(r.ok){f.amt=r.n;f.amtErr=''}else{f.amt=null;f.amtErr=quiet&&!String(t||'').trim()?'':r.err}}
function applyOdds(t,quiet){const f=S.f;f.customTxt=t;const r=parseOdds(t);if(r.ok){f.odds=[r.a,r.b];f.oddsErr=''}else{f.odds=null;f.oddsErr=quiet&&!t?'':r.err}}
async function confirmPlace(){if(S.busy)return;const e=formOK();if(e){S.msg=e;S.bad=true;S.f.confirm=false;render(true);return}
  const f=S.f,targets=f.open?['*']:f.opps.slice();
  /* ids are remembered for this exact form content, so tapping again after a failed save re-sends the SAME events (the log skips ones that already landed) */
  const sig=targets.join(',')+'|'+clean(f.text)+'|'+f.amt+'|'+f.odds.join('-');
  if(!S.fid||S.fid.sig!==sig)S.fid={sig,g:targets.length>1?rid():undefined,evs:targets.map(t=>({id:rid(),u:rid(),to:t}))};
  const ts=Date.now();
  const evs=S.fid.evs.map((x,i)=>Object.assign({k:'p',u:x.u,ts:ts+i,id:x.id,to:x.to,amt:f.amt,a:f.odds[0],b:f.odds[1],text:clean(f.text)},S.fid.g?{g:S.fid.g}:{}));
  const ok=await act(evs,'Placed! '+(f.open?'Anyone can take it now.':(targets.length>1?targets.length+' bets sent.':nm(targets[0])+' can accept it now.'))+' You can withdraw it until it is answered.');
  if(ok){S.f={opps:[],open:false,text:'',amt:null,amtCustom:false,amtTxt:'',amtErr:'',odds:[1,1],custom:false,customTxt:'',oddsErr:'',confirm:false};S.fid=null;render(true)}else{S.f.confirm=true;render(true)}}
function bind(){
  document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-lb]');if(!el||!H||!document.getElementById('main')||!document.getElementById('main').contains(el))return;const f=ACT[el.dataset.lb];if(f){e.preventDefault();f(el,e)}});
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.id||!H)return;if(t.id==='b27Text'){S.f.text=t.value;sync()}else if(t.id==='b27Ao'){applyAmt(t.value);sync()}else if(t.id==='b27Co'){applyOdds(t.value);sync()}});
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&/^b27(Text|Ao|Co)$/.test(e.target.id)){e.preventDefault();ACT.place()}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.started)poll(false)});
  window.addEventListener('online',()=>{if(S.started)poll(true)})}
function init(h){H=h;if(!S.started){S.started=true;bind()}}
function start(){if(!H||H.demo)return;poll(false)}
window.LBETS={init,start,view,poll,reduce,tally,parseLog,win,_state:S};
})();
