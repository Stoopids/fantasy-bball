/* Fantasy BBALL NCAA Full Season and NCAA Tournament — core logic (pure, no DOM, no network).
   Loaded in the browser as the global FBN and in Node tests via require().  Everything here is unit-tested (tests/test_core.js). */
(function(root){
'use strict';
const F={};
const clone=o=>JSON.parse(JSON.stringify(o));F.clone=clone;
/* ============================ constants ============================ */
F.CLOCKS=[30,60,90,120,180,0];                       /* 0 = no clock */
F.DEFAULTS={managers:8,rounds:8,type:'snake',startAt:null,startMode:'manual',orderMode:'random',clockSecs:60,autoPick:true,warn15:true};
F.LIMITS={mgrMin:4,mgrMax:12,roundsMin:1,roundsMax:15,nameMin:2,nameMax:40,personMax:30};
F.PHOTO={maxBytes:25*1024,edges:[256,224,192,160,128,96],qualities:[0.82,0.7,0.58,0.46,0.36],hardStoreBytes:40*1024};
F.KEY_PREFIX='fbn1-';
/* ============================ ids, codes, keys ============================ */
const B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ';                 /* Crockford: no I L O U */
function cryptoBytes(n){const a=new Uint8Array(n);(root.crypto||globalThis.crypto).getRandomValues(a);return a}
F.cryptoBytes=cryptoBytes;
function b32of(bytes){let bits=0,val=0,out='';for(const b of bytes){val=(val<<8)|b;bits+=8;while(bits>=5){out+=B32[(val>>>(bits-5))&31];bits-=5}}if(bits>0)out+=B32[(val<<(5-bits))&31];return out}
F.makeLeagueId=function(rb){rb=rb||cryptoBytes;return b32of(rb(10))};          /* 10 bytes = 80 bits = 16 chars */
F.formatCode=id=>String(id).toUpperCase().replace(/(.{4})(?=.)/g,'$1-');
F.parseCode=function(s){s=String(s||'').toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/[IL]/g,'1').replace(/O/g,'0');
  if(s.length!==16)return null;for(const c of s)if(B32.indexOf(c)<0)return null;return s};
F.hexId=function(n,rb){rb=rb||cryptoBytes;return Array.from(rb(Math.ceil(n/2)),x=>x.toString(16).padStart(2,'0')).join('').slice(0,n)};
F.slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'')||'x';
F.Keys=function(id){const K=F.KEY_PREFIX+String(id).toLowerCase();return{
  base:K,meta:K+'-meta',chat:K+'-chat',slot:(i,gen)=>K+'-s'+i+'-g'+(gen||0),mgr:mid=>K+'-m-'+mid,pick:(e,n)=>K+'-e'+e+'-p'+n,
  pref:mid=>K+'-u-'+mid,pres:mid=>K+'-pr-'+mid,spin:(e,g,n)=>K+'-e'+e+'-g'+g+'-s'+n}};
/* ============================ settings + wizard validation ============================ */
const isInt=v=>typeof v==='number'&&isFinite(v)&&Math.floor(v)===v;
const clean=s=>String(s==null?'':s).replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim();
F.clean=clean;
F.maxRounds=(managers,poolSize)=>Math.max(0,Math.min(F.LIMITS.roundsMax,Math.floor((poolSize||0)/Math.max(1,managers))));
/* returns {ok, errors:{field:msg}} ; o={poolSize, now, needPass} */
F.validateSettings=function(s,o){o=o||{};const e={};const L=F.LIMITS;const now=o.now||Date.now();
  const nm=clean(s.name);if(nm.length<L.nameMin)e.name='Give your league a name (at least '+L.nameMin+' letters).';else if(nm.length>L.nameMax)e.name='Keep the league name under '+(L.nameMax+1)+' characters.';
  if(s.mgrName!==undefined||o.needPerson){const m=clean(s.mgrName);if(!m)e.mgrName='Enter your name.';else if(m.length>L.personMax)e.mgrName='Keep your name under '+(L.personMax+1)+' characters.';
    const t=clean(s.teamName);if(!t)e.teamName='Enter a team name.';else if(t.length>L.personMax)e.teamName='Keep the team name under '+(L.personMax+1)+' characters.'}
  if(!isInt(s.managers)||s.managers<L.mgrMin||s.managers>L.mgrMax)e.managers='Choose between '+L.mgrMin+' and '+L.mgrMax+' managers.';
  if(['snake','linear'].indexOf(s.type)<0)e.type='Choose snake or linear.';
  if(s.startAt!=null){if(!isInt(s.startAt)||s.startAt<=0)e.startAt='That date and time is not valid.';else if(s.startAt<now+60000)e.startAt='Pick a time in the future.'}
  if(['manual','auto'].indexOf(s.startMode)<0)e.startMode='Choose how the draft starts.';
  else if(s.startMode==='auto'&&s.startAt==null)e.startMode='Auto-start needs a draft date and time.';
  if(['random','manual'].indexOf(s.orderMode)<0)e.orderMode='Choose who picks first.';
  if(F.CLOCKS.indexOf(s.clockSecs)<0)e.clockSecs='Choose one of the clock options.';
  if(!isInt(s.rounds)||s.rounds<L.roundsMin||s.rounds>L.roundsMax)e.rounds='Teams per manager must be between '+L.roundsMin+' and '+L.roundsMax+'.';
  else if(o.poolSize&&isInt(s.managers)&&s.managers*s.rounds>o.poolSize)e.rounds='Not enough teams: '+s.managers+' managers × '+s.rounds+' rounds = '+(s.managers*s.rounds)+', but only '+o.poolSize+' teams are available. Lower it to '+F.maxRounds(s.managers,o.poolSize)+' or fewer.';
  if(typeof s.autoPick!=='boolean')e.autoPick='Choose what happens when time runs out.';
  return{ok:!Object.keys(e).length,errors:e}};
F.WIZARD=['you','managers','type','when','start','order','clock','rounds','missed','confirm'];
/* the start-mode screen only exists when a date is set */
F.stepsFor=s=>F.WIZARD.filter(k=>k!=='start'||s.startAt!=null);
F.STEP_FIELDS={you:['name','mgrName','teamName'],managers:['managers'],type:['type'],when:['startAt'],start:['startMode'],order:['orderMode'],clock:['clockSecs'],rounds:['rounds'],missed:['autoPick'],confirm:[]};
F.validateStep=function(step,s,o){o=o||{};const full=F.validateSettings(Object.assign({mgrName:s.mgrName||'',teamName:s.teamName||''},s),o);
  const f=F.STEP_FIELDS[step]||[];const errors={};f.forEach(k=>{if(full.errors[k])errors[k]=full.errors[k]});
  if(step==='confirm')return full;return{ok:!Object.keys(errors).length,errors}};
F.normalizeSettings=function(s){const d=F.DEFAULTS;return{managers:isInt(+s.managers)?+s.managers:d.managers,rounds:isInt(+s.rounds)?+s.rounds:d.rounds,type:s.type==='linear'?'linear':'snake',
  startAt:s.startAt!=null&&isFinite(+s.startAt)?Math.round(+s.startAt):null,startMode:s.startMode==='auto'&&s.startAt!=null?'auto':'manual',orderMode:s.orderMode==='manual'?'manual':'random',
  clockSecs:F.CLOCKS.indexOf(+s.clockSecs)>=0?+s.clockSecs:d.clockSecs,autoPick:s.autoPick!==false,warn15:s.warn15!==false,tz:typeof s.tz==='string'?s.tz.slice(0,60):'UTC'}};
/* ============================ pick order: snake / linear ============================ */
F.slotAt=function(order,n,type,rounds){const L=order.length;if(!L||n<1||n>L*rounds)return null;const r=Math.floor((n-1)/L),i=(n-1)%L;
  const col=(type==='snake'&&r%2)?L-1-i:i;return{n,round:r+1,col,owner:order[col]}};
F.pickSeq=function(order,rounds,type){const out=[];for(let n=1;n<=order.length*rounds;n++)out.push(F.slotAt(order,n,type,rounds));return out};
F.totalPicks=(order,rounds)=>order.length*rounds;
/* grid[round][col] = pick number, for the board and the "example" preview */
F.boardGrid=function(L,rounds,type){const g=[];for(let r=0;r<rounds;r++){const row=[];for(let c=0;c<L;c++)row.push(r*L+((type==='snake'&&r%2)?L-1-c:c)+1);g.push(row)}return g};
F.permutationOf=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.indexOf(x)>=0);
F.shuffled=function(a,rng){a=a.slice();rng=rng||Math.random;for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
F.mulberry=function(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
F.hash32=function(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0};
F.moveItem=function(arr,mid,dir){const a=arr.slice(),i=a.indexOf(mid),j=i+dir;if(i<0||j<0||j>=a.length)return null;[a[i],a[j]]=[a[j],a[i]];return a};
F.moveTo=function(arr,mid,idx){const a=arr.slice(),i=a.indexOf(mid);if(i<0||idx<0||idx>=a.length)return null;a.splice(i,1);a.splice(idx,0,mid);return a};
/* ============================ time zones ============================ */
function parts(ms,tz){const f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const o={};f.formatToParts(new Date(ms)).forEach(p=>{o[p.type]=p.value});return{y:+o.year,mo:+o.month,d:+o.day,h:+o.hour%24,mi:+o.minute,s:+o.second}}
F.tzOffsetMin=function(ms,tz){const p=parts(ms,tz);return Math.round((Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi,p.s)-Math.floor(ms/1000)*1000)/60000)};
/* wall-clock time in zone tz -> UTC ms (handles DST by iterating) */
F.zonedToUtc=function(y,mo,d,h,mi,tz){let guess=Date.UTC(y,mo-1,d,h,mi);for(let k=0;k<3;k++){const off=F.tzOffsetMin(guess,tz);const g2=Date.UTC(y,mo-1,d,h,mi)-off*60000;if(g2===guess)break;guess=g2}return guess};
F.parseLocalInput=function(str,tz){const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(str||''));if(!m)return null;const v=F.zonedToUtc(+m[1],+m[2],+m[3],+m[4],+m[5],tz);return isFinite(v)?v:null};
F.localInputValue=function(ms,tz){const p=parts(ms,tz);const z=n=>String(n).padStart(2,'0');return p.y+'-'+z(p.mo)+'-'+z(p.d)+'T'+z(p.h)+':'+z(p.mi)};
F.offsetLabel=function(ms,tz){const m=F.tzOffsetMin(ms,tz);const s=m<0?'-':'+';const a=Math.abs(m);const h=Math.floor(a/60),mm=a%60;return 'UTC'+s+h+(mm?':'+String(mm).padStart(2,'0'):'')};
F.fmtWhen=function(ms,tz,o){o=o||{};return new Intl.DateTimeFormat(o.locale||'en-US',{timeZone:tz,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(ms)).replace(',',',')};
F.fmtUtc=function(ms){const d=new Date(ms);const z=n=>String(n).padStart(2,'0');return d.toUTCString().slice(0,16)+', '+z(d.getUTCHours())+':'+z(d.getUTCMinutes())+' UTC'};
/* "Starts Sat, Oct 31, 8:00 PM your time (UTC+7)" ; commissioner zone line is added when it differs */
F.startsLine=function(ms,viewerTz,commishTz){const own='Starts '+F.fmtWhen(ms,viewerTz)+' your time ('+F.offsetLabel(ms,viewerTz)+')';
  if(commishTz&&commishTz!==viewerTz&&F.tzOffsetMin(ms,commishTz)!==F.tzOffsetMin(ms,viewerTz))return{you:own,commish:'Commissioner’s time: '+F.fmtWhen(ms,commishTz)+' ('+F.tzCity(commishTz)+', '+F.offsetLabel(ms,commishTz)+')',utc:F.fmtUtc(ms)};
  return{you:own,commish:commishTz?'Commissioner’s zone: '+F.tzCity(commishTz)+' ('+F.offsetLabel(ms,commishTz)+')':'',utc:F.fmtUtc(ms)}};
F.tzCity=tz=>String(tz||'UTC').split('/').pop().replace(/_/g,' ');
F.countdownText=function(ms){ms=Math.max(0,ms);const s=Math.floor(ms/1000);const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sec=s%60;
  if(d>0)return d+'d '+h+'h';if(h>0)return h+'h '+String(m).padStart(2,'0')+'m';if(m>0)return m+'m '+String(sec).padStart(2,'0')+'s';return sec+'s'};
F.reminderText=function(o){/* plain text for a group chat */
  const lines=[o.name+' — draft invite','',(o.startAt?'Draft time: '+F.fmtUtc(o.startAt)+'\nSee it in your own time zone: '+o.timeLink:'Draft time: to be announced (the commissioner will start it when everyone is here)'),
   'Join here: '+o.inviteLink,'','Pick '+o.rounds+' teams each, '+(o.type==='snake'?'snake':'linear')+' order, '+(o.clockSecs?o.clockSecs+' seconds per pick.':'no pick clock.')];return lines.join('\n')};
/* ============================ photos (client-side size cap) ============================ */
F.photoBytes=function(url){const m=/^data:image\/(jpeg|webp|png);base64,([A-Za-z0-9+/]+=*)$/.exec(String(url||''));if(!m)return -1;const b=m[2];return Math.floor(b.length*3/4)-(b.endsWith('==')?2:b.endsWith('=')?1:0)};
F.photoOk=(url,max)=>{const b=F.photoBytes(url);return b>0&&b<=(max||F.PHOTO.hardStoreBytes)};
/* encode(edge,quality) -> Promise<dataURL>. Tries 256px at falling quality, then smaller edges; returns the first <= cap */
F.fitPhoto=async function(encode,o){o=o||{};const cap=o.maxBytes||F.PHOTO.maxBytes;const edges=o.edges||F.PHOTO.edges,qs=o.qualities||F.PHOTO.qualities;let tries=0;
  for(const e of edges)for(const q of qs){tries++;const u=await encode(e,q);const b=F.photoBytes(u);if(b>0&&b<=cap)return{dataUrl:u,edge:e,quality:q,bytes:b,tries};}
  return null};
/* square crop of a w×h source: zoom>=1, pan in [-1,1] -> source rect */
F.cropRect=function(w,h,zoom,px,py){zoom=Math.max(1,zoom||1);const side=Math.min(w,h)/zoom;const mx=(w-side)/2,my=(h-side)/2;
  return{sx:mx+Math.max(-1,Math.min(1,px||0))*mx,sy:my+Math.max(-1,Math.min(1,py||0))*my,side}};
const AV_COLORS=['#f59e0b','#38bdf8','#34d399','#f472b6','#a78bfa','#fb7185','#2dd4bf','#facc15','#60a5fa','#f97316','#4ade80','#c084fc'];
F.EMOJIS=['🏀','🔥','⭐','🦅','🐻','🐯','🐺','🦁','🐉','🚀','⚡','🎯'];
F.avatarSpec=function(m){m=m||{};const nm=clean(m.name||m.team||'?');const c=AV_COLORS[F.hash32(nm.toLowerCase())%AV_COLORS.length];
  if(m.photo&&F.photoOk(m.photo))return{kind:'photo',src:m.photo,color:c};if(m.emoji)return{kind:'emoji',text:m.emoji,color:c};return{kind:'initial',text:(nm[0]||'?').toUpperCase(),color:c}};
/* ============================ managers: names, profiles, claims ============================ */
F.uniqueName=function(name,taken){name=clean(name);const set=new Set((taken||[]).map(x=>clean(x).toLowerCase()));if(!set.has(name.toLowerCase()))return name;
  for(let i=2;i<100;i++){const c=name.slice(0,F.LIMITS.personMax-4)+' ('+i+')';if(!set.has(c.toLowerCase()))return c}return name+' '+F.hexId(3)};
F.parseJ=function(txt){if(!txt||!String(txt).trim())return null;try{let d=JSON.parse(txt);if(typeof d==='string')d=JSON.parse(d);return d}catch(e){return null}};
F.makeProfile=function(o){return{mid:o.mid,name:clean(o.name).slice(0,F.LIMITS.personMax),team:clean(o.team).slice(0,F.LIMITS.personMax),emoji:o.emoji||'',photo:o.photo&&F.photoOk(o.photo)?o.photo:'',pv:(o.pv||0)+1,ts:o.ts||Date.now()}};
F.parseProfile=function(txt){const d=F.parseJ(txt);if(!d||typeof d!=='object'||typeof d.mid!=='string')return null;
  return{mid:d.mid,name:clean(d.name).slice(0,F.LIMITS.personMax),team:clean(d.team).slice(0,F.LIMITS.personMax),emoji:typeof d.emoji==='string'?d.emoji.slice(0,8):'',photo:d.photo&&F.photoOk(d.photo)?d.photo:'',pv:+d.pv||0,ts:+d.ts||0}};
F.makeClaim=function(o){return{mid:o.mid,i:o.i,gen:o.gen||0,name:clean(o.name).slice(0,F.LIMITS.personMax),team:clean(o.team).slice(0,F.LIMITS.personMax),sh:o.sh||'',ts:o.ts||Date.now(),w:o.w||''}};
F.parseClaim=function(txt){const d=F.parseJ(txt);if(!d||typeof d!=='object'||typeof d.mid!=='string'||!/^[0-9a-f]{8,32}$/.test(d.mid)||!(+d.i>0))return null;
  return{mid:d.mid,i:+d.i,gen:+d.gen||0,name:clean(d.name),team:clean(d.team),sh:typeof d.sh==='string'?d.sh:'',ts:+d.ts||0,w:d.w||''}};
/* raw: {i: claim|null}. Valid = right slot index, right generation, slot number within the league size. A manager who appears in two slots keeps the lowest. */
F.joinedList=function(meta,claims){const N=meta.settings.managers;const seen=new Set();const out=[];
  for(let i=1;i<=N;i++){const c=claims[i];if(!c||c.i!==i||c.gen!==(meta.slotGen[i]||0))continue;if(seen.has(c.mid))continue;seen.add(c.mid);out.push(c)}return out};
F.freeSlots=function(meta,claims){const N=meta.settings.managers;const used=new Set(F.joinedList(meta,claims).map(c=>c.i));const o=[];for(let i=1;i<=N;i++)if(!used.has(i))o.push(i);return o};
/* the manager objects the UI uses: claim + profile + commissioner overrides */
F.managersView=function(meta,claims,profiles){return F.joinedList(meta,claims).map(c=>{const p=profiles[c.mid]||{};const ov=meta.over[c.mid]||{};
  return{mid:c.mid,i:c.i,name:ov.name||p.name||c.name||'Manager',team:ov.team||p.team||c.team||'Team',emoji:p.emoji||'',photo:p.photo||'',away:!!ov.away,left:!!ov.left,cm:meta.cm===c.mid}})};
/* generic first-write-wins claim of ONE key; io:{read,write,sleep}. valid(existing)->true when the slot is really held by someone else */
F.claimKey=async function(io,o){const NOCONN="Can't reach the server. Check your connection and try again.";
  for(let attempt=0;attempt<3;attempt++){let ex;try{ex=o.parse(await io.read(o.url))}catch(e){return{ok:false,msg:NOCONN}}
    if(ex&&o.same(ex,o.mine))break;
    if(ex&&o.held(ex))return{ok:false,taken:true,by:ex};
    try{await io.write(o.url,o.mine)}catch(e){if(attempt===2)return{ok:false,msg:'Save failed. Try again.'};await io.sleep(300);continue}
    await io.sleep(o.wait==null?600:o.wait);let chk=null;try{chk=o.parse(await io.read(o.url))}catch(e){return{ok:true,unverified:true}}
    if(chk&&o.same(chk,o.mine))return{ok:true};if(chk&&o.held(chk))return{ok:false,taken:true,by:chk}}
  return{ok:true}};
/* join: try free slots in order until one sticks. io:{read,write,sleep,url(i,gen)}. returns {ok,slot,claim} | {ok:false,full:true} */
F.joinLeague=async function(io,o){const meta=o.meta;const tried=new Set();
  for(let round=0;round<F.LIMITS.mgrMax+2;round++){
    const claims={};await Promise.all(Array.from({length:meta.settings.managers},(_,k)=>k+1).map(async i=>{claims[i]=F.parseClaim(await io.read(io.url(i,meta.slotGen[i]||0)).catch(()=>''))}));
    const free=F.freeSlots(meta,claims).filter(i=>!tried.has(i));if(!free.length)return{ok:false,full:true};
    const i=free[0];tried.add(i);const mine=F.makeClaim({mid:o.mid,i,gen:meta.slotGen[i]||0,name:o.name,team:o.team,sh:o.sh,w:o.w,ts:o.now?o.now():Date.now()});
    const r=await F.claimKey(io,{url:io.url(i,mine.gen),mine,parse:F.parseClaim,same:(a,b)=>a.mid===b.mid,held:a=>a.i===i&&a.gen===mine.gen,wait:o.wait});
    if(r.ok)return{ok:true,slot:i,claim:mine};if(!r.taken)return r}
  return{ok:false,full:true}};
/* ============================ meta (the commissioner-owned document) ============================ */
F.defaultMeta=function(id,s,cm){return{v:1,version:0,id,name:clean(s.name),created:Date.now(),settings:F.normalizeSettings(s),cm:cm||null,pass:null,status:'lobby',epoch:1,order:[],orderSet:false,
  spin:null,spinGen:0,respins:[],paused:false,pausedLeft:null,startedAt:null,resumeAt:null,voided:[],slotGen:{},over:{},endedEarly:false,endedAt:null,notes:false,updated:new Date().toISOString()}};
F.normalizeMeta=function(d){const base=F.defaultMeta('',F.DEFAULTS,null);const m=Object.assign(base,(d&&typeof d==='object'&&!Array.isArray(d))?d:{});
  m.settings=F.normalizeSettings(Object.assign({},F.DEFAULTS,m.settings||{}));m.name=clean(m.name)||'League';
  if(['lobby','live','complete'].indexOf(m.status)<0)m.status='lobby';
  m.epoch=Math.max(1,+m.epoch||1);m.version=+m.version||0;m.paused=!!m.paused;m.endedEarly=!!m.endedEarly;m.orderSet=!!m.orderSet;
  if(!Array.isArray(m.order))m.order=[];m.order=m.order.map(String);if(!Array.isArray(m.voided))m.voided=[];m.voided=m.voided.slice(-300);
  if(!m.slotGen||typeof m.slotGen!=='object')m.slotGen={};if(!m.over||typeof m.over!=='object')m.over={};
  if(!(m.pass&&typeof m.pass.salt==='string'&&typeof m.pass.hash==='string'))m.pass=null;
  m.spinGen=Math.max(0,+m.spinGen||0);if(!Array.isArray(m.respins))m.respins=[];m.respins=m.respins.slice(-20);
  if(!(m.spin&&typeof m.spin==='object'&&+m.spin.gen>0&&Array.isArray(m.spin.players)))m.spin=null;else m.spin={gen:+m.spin.gen,players:m.spin.players.map(String),done:!!m.spin.done};
  return m};
F.exists=d=>!!(d&&typeof d==='object'&&d.v&&d.settings&&d.id);
/* the order that would be used right now: the commissioner's saved order (kept in sync with who has joined) or join order */
F.effectiveOrder=function(meta,joinedMids){const j=joinedMids.slice();if(!meta.orderSet)return j;const o=meta.order.filter(x=>j.indexOf(x)>=0);j.forEach(x=>{if(o.indexOf(x)<0)o.push(x)});return o};
/* ---- commissioner actions (pure functions on meta; return {state}|{error}|{noop}) ---- */
F.mStart=function(m,joined,now,seedStr,poolSize){if(m.status!=='lobby')return{error:'The draft already started.'};
  if(joined.length<2)return{error:'At least 2 managers must join before the draft can start.'};
  const s=m.settings;if(joined.length*s.rounds>(poolSize||1e9))return{error:'Not enough teams for that many managers and rounds.'};
  const n=clone(m);let order=F.effectiveOrder(m,joined);
  if(!m.orderSet&&s.orderMode==='random')order=F.shuffled(order,F.mulberry(F.hash32(seedStr||m.id)));      /* deterministic: two phones starting at once get the same order */
  n.order=order;n.orderSet=true;n.status='live';n.paused=false;n.pausedLeft=null;n.startedAt=now;n.resumeAt=now;return{state:n}};
F.mPause=function(m,st,pause,now){if(m.status!=='live'||st.status==='complete')return{error:'Draft is not live.'};const n=clone(m);
  if(pause){if(n.paused)return{error:'Already paused.'};n.paused=true;n.pausedLeft=st.deadline?Math.max(0,st.deadline-now):null}
  else{if(!n.paused)return{error:'Not paused.'};n.paused=false;const c=n.settings.clockSecs;n.resumeAt=c&&n.pausedLeft!=null?now-(c*1000-n.pausedLeft):now;n.pausedLeft=null}return{state:n}};
F.mUndo=function(m,st,expect,now){if(m.status==='complete'||st.status==='complete')return{error:'The draft is complete and locked.'};if(!st.picks.length)return{error:'Nothing to undo.'};const last=st.picks[st.picks.length-1];
  /* compare-and-set: the pick the commissioner was looking at must still be the last pick (number and id) */
  const eN=expect&&typeof expect==='object'?expect.n:expect,eId=expect&&typeof expect==='object'?expect.id:null;
  if(eN==null||last.n!==eN||(eId!=null&&last.id!==eId))return{error:'The board changed — a new pick landed or the pick you saw is gone. Look again before undoing.'};const n=clone(m);n.voided.push(last.id);n.status='live';n.resumeAt=now;
  if(n.paused)n.pausedLeft=n.settings.clockSecs?n.settings.clockSecs*1000:null;return{state:n,undone:last}};
F.mClock=function(m,secs,now){if(F.CLOCKS.indexOf(+secs)<0)return{error:'Not a valid clock option.'};const n=clone(m);n.settings.clockSecs=+secs;n.resumeAt=now;if(n.paused)n.pausedLeft=n.settings.clockSecs?n.settings.clockSecs*1000:null;return{state:n}};
F.mFlags=function(m,f){const n=clone(m);if('warn15' in f)n.settings.warn15=!!f.warn15;if('autoPick' in f)n.settings.autoPick=!!f.autoPick;if('notes' in f)n.notes=!!f.notes;return{state:n}};
/* edit league settings: only before the draft starts (clock/auto flags have their own live actions) */
F.mSettings=function(m,patch,joined,poolSize,now){const joinedCount=joined.length;if(m.status!=='lobby')return{error:'Locked: the draft has started.'};
  const n=clone(m);const s=Object.assign({},n.settings,patch);if(patch.name!=null)n.name=clean(patch.name);
  const v=F.validateSettings(Object.assign({name:n.name},s),{poolSize,now:now||Date.now()});
  const e=Object.assign({},v.errors);if(patch.startAt==null&&'startAt' in patch)delete e.startAt;if(!('startAt' in patch)&&n.settings.startAt!=null&&n.settings.startAt<(now||Date.now()))delete e.startAt;
  if(Object.keys(e).length)return{error:e[Object.keys(e)[0]],errors:e};
  if(s.managers<joinedCount)return{error:'Already '+joinedCount+' managers have joined. Remove someone first to go lower.'};
  const high=joined.filter(c=>c.i>s.managers)[0];if(high)return{error:'A manager is sitting in spot '+high.i+'. Remove them (or raise the number) first.'};
  n.settings=F.normalizeSettings(s);return{state:n}};
F.mSetOrder=function(m,joined,newOrder){if(m.status!=='lobby')return{error:'Order is locked once the draft starts.'};if(!F.permutationOf(newOrder,joined))return{error:'That order does not match the managers who joined.'};const n=clone(m);n.order=newOrder.slice();n.orderSet=true;return{state:n}};
F.mMove=function(m,joined,mid,dir){if(m.status!=='lobby')return{error:'Order is locked once the draft starts.'};const o=F.moveItem(F.effectiveOrder(m,joined),mid,dir);if(!o)return{error:'cannot move'};return F.mSetOrder(m,joined,o)};
F.mRandomize=function(m,joined,rng){if(m.status!=='lobby')return{error:'Order is locked once the draft starts.'};return F.mSetOrder(m,joined,F.shuffled(joined,rng))};
F.mAway=function(m,mid,away){const n=clone(m);n.over[mid]=Object.assign({},n.over[mid],{away:!!away});return{state:n}};
F.mRename=function(m,mid,patch,takenNames){const n=clone(m);const o=Object.assign({},n.over[mid]);
  if(patch.name!=null){const nm=clean(patch.name).slice(0,F.LIMITS.personMax);if(!nm)return{error:'Name cannot be empty.'};o.name=F.uniqueName(nm,takenNames||[])}
  if(patch.team!=null){const t=clean(patch.team).slice(0,F.LIMITS.personMax);if(!t)return{error:'Team name cannot be empty.'};o.team=t}n.over[mid]=o;return{state:n}};
/* remove: before the draft the slot is freed (generation bump) and the order forgets them; during the draft they stay in the order but are marked left+away (their picks are made by auto-pick) */
F.mRemove=function(m,mid,slotIndex){if(m.status==='complete')return{error:'The draft is complete and locked.'};const n=clone(m);
  if(m.status==='lobby'){if(slotIndex==null)return{error:'Unknown manager.'};n.slotGen[slotIndex]=(n.slotGen[slotIndex]||0)+1;n.order=n.order.filter(x=>x!==mid);delete n.over[mid];return{state:n,freed:true}}
  n.over[mid]=Object.assign({},n.over[mid],{left:true,away:true});return{state:n,freed:false}};
F.mEnd=function(m,now){if(m.status!=='live')return{error:'Only a live draft can be ended early.'};const n=clone(m);n.status='complete';n.endedEarly=true;n.endedAt=now;n.paused=false;n.pausedLeft=null;return{state:n}};
F.mReset=function(m){if(m.status==='complete')return{error:'The draft is complete and locked.'};const n=F.defaultMeta(m.id,m.settings,m.cm);n.name=m.name;n.created=m.created;n.pass=m.pass;n.version=m.version;n.epoch=m.epoch+1;n.slotGen=clone(m.slotGen);n.over=clone(m.over);
  Object.keys(n.over).forEach(k=>{delete n.over[k].left});n.notes=m.notes;return{state:n}};
/* ---- commissioner + manager secrets ----
   The commissioner secret is random (128 bits), lives only in the commissioner link's URL fragment and on the commissioner's devices; meta.pass holds only {salt, hash(salt:secret)}.
   A manager's secret is random too; the claim holds hash(mid:secret). Neither can be derived from public data, and a copied hash unlocks nothing.
   This is a client-side lock for a friends' league: someone who writes the public store by hand can still change data (README, known limits). */
F.randHex=(n)=>F.hexId(n);
F.sha256Hex=async function(str){const c=root.crypto||globalThis.crypto;if(!c||!c.subtle)throw new Error('nosubtle');const b=await c.subtle.digest('SHA-256',new TextEncoder().encode(str));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')};
F.makePass=async function(pass,salt){salt=salt||F.hexId(16);return{salt,hash:await F.sha256Hex(salt+':'+String(pass))}};
F.checkPass=async function(meta,pass){if(!meta||!meta.pass)return false;try{return(await F.sha256Hex(meta.pass.salt+':'+String(pass)))===meta.pass.hash}catch(e){return false}};
F.newSecret=()=>F.hexId(32);
F.mgrHash=(mid,k)=>F.sha256Hex('fbn1-mgr:'+mid+':'+k);
F.checkMgrSecret=async function(claim,k){if(!claim||!k)return false;if(!claim.sh)return false;try{return claim.sh===await F.mgrHash(claim.mid,k)}catch(e){return false}};
/* pull a secret out of a pasted link or code: ...#cm=<32 hex>, ...#as=<mid>&k=<32 hex>, or the bare 32 hex characters */
F.extractSecret=function(text,key){text=String(text||'').trim();let m;if(key==='cm'){m=/[#&?]cm=([0-9a-f]{32})\b/i.exec(text)}else if(key==='k'){m=/[#&?]k=([0-9a-f]{32})\b/i.exec(text)}if(m)return m[1].toLowerCase();return /^[0-9a-f]{32}$/i.test(text)?text.toLowerCase():''};
F.extractMgr=function(text){text=String(text||'');const a=/[#&?]as=([0-9a-f]{8,32})\b/i.exec(text);const k=F.extractSecret(text,'k');return a&&k?{mid:a[1].toLowerCase(),k}:null};
/* ============================ picks: entries, replay, derived state ============================ */
F.makeEntry=function(n,owner,tid,o){o=o||{};const by=o.by||'owner';return{id:o.id||((by==='auto')?('a'+o.epoch+'-'+n+'-'+tid):(Math.random().toString(36).slice(2,10)+n)),n,owner,tid:String(tid),ts:o.now,by,w:o.writer||'?',e:o.epoch,prev:o.prev==null?undefined:String(o.prev)}};
F.parseEntry=function(txt){const d=F.parseJ(txt);if(d&&typeof d==='object'&&typeof d.id==='string'&&+d.n>0&&typeof d.owner==='string'&&d.tid!=null){d.tid=String(d.tid);d.n=+d.n;return d}return null};
F.entryProblem=function(meta,e,n,taken,pool,prevId){if(!e)return'empty';if(meta.voided.indexOf(e.id)>=0)return'voided';if(e.n!==n)return'wrong-slot';if(e.e!=null&&+e.e!==meta.epoch)return'old-epoch';
  const sl=F.slotAt(meta.order,n,meta.settings.type,meta.settings.rounds);if(!sl)return'beyond';if(e.owner!==sl.owner)return'wrong-owner';if(prevId!=null&&e.prev!=null&&e.prev!==prevId)return'stale-chain';if(pool&&!pool.has(e.tid))return'not-in-pool';if(taken[e.tid])return'duplicate-team';return null};
F.replay=function(meta,entries,pool){const picks=[],taken={},rejected=[];const tot=F.totalPicks(meta.order,meta.settings.rounds);
  for(let n=1;n<=tot;n++){const e=entries[n];if(!e)break;const why=F.entryProblem(meta,e,n,taken,pool,picks.length?picks[picks.length-1].id:'');if(why){if(why!=='voided'&&why!=='old-epoch'&&why!=='stale-chain')rejected.push({n,entry:e,why});break}
    const sl=F.slotAt(meta.order,n,meta.settings.type,meta.settings.rounds);picks.push({n,round:sl.round,owner:e.owner,tid:e.tid,ts:e.ts,id:e.id,auto:e.by==='auto'||undefined,by:e.by});taken[e.tid]=1}
  return{picks,rejected}};
F.deadlineOf=function(meta,picks){const c=meta.settings.clockSecs;if(meta.status!=='live'||meta.paused||!c)return null;if(picks.length>=F.totalPicks(meta.order,meta.settings.rounds))return null;
  const base=Math.max(picks.length?(+picks[picks.length-1].ts||0):(+meta.startedAt||0),+meta.resumeAt||0);return base?base+c*1000:null};
/* state: the shape the UI reads. prefs: {mid:{auto,queue}} */
F.deriveState=function(meta,entries,prefs,pool){const r=meta.status==='lobby'?{picks:[],rejected:[]}:F.replay(meta,entries,pool);const s=meta.settings;const tot=F.totalPicks(meta.order,s.rounds);
  const st={meta,order:meta.order.slice(),picks:r.picks,rejected:r.rejected,type:s.type,rounds:s.rounds,clockSecs:s.clockSecs,warn15:s.warn15,autoPick:s.autoPick,paused:meta.paused,pausedLeft:meta.pausedLeft,epoch:meta.epoch,total:tot,
    away:{},auto:{},queues:{}};
  Object.keys(meta.over).forEach(k=>{if(meta.over[k].away)st.away[k]=true});
  Object.keys(prefs||{}).forEach(o=>{const p=prefs[o]||{};st.auto[o]=!!p.auto;st.queues[o]=Array.isArray(p.queue)?p.queue.map(String):[]});
  st.status=meta.status==='complete'?'complete':(meta.status==='live'&&tot>0&&r.picks.length>=tot)?'complete':meta.status;st.deadline=F.deadlineOf(meta,r.picks);st.endedEarly=!!meta.endedEarly;return st};
F.onClock=st=>st.status==='live'?F.slotAt(st.order,st.picks.length+1,st.type,st.rounds):null;
F.takenMap=st=>{const m={};st.picks.forEach(p=>m[p.tid]=p);return m};
F.ownerCount=(st,o)=>st.picks.filter(p=>p.owner===o).length;
F.picksAway=function(st,owner){if(st.status!=='live')return null;const cur=st.picks.length+1;for(let n=cur;n<=st.total;n++){if(F.slotAt(st.order,n,st.type,st.rounds).owner===owner)return n-cur}return null};
F.nextPickNo=(st,o)=>{const a=F.picksAway(st,o);return a==null?null:st.picks.length+1+a};
F.validatePick=function(st,owner,tid,opt){opt=opt||{};if(st.status!=='live')return{error:'The draft is not live right now.'};if(st.paused)return{error:'The draft is paused.'};
  const s=F.onClock(st);if(!s)return{error:'No pick is on the clock.'};if(opt.pool&&!opt.pool.has(String(tid)))return{error:'That team is not on the list of teams.'};
  const t=F.takenMap(st)[tid];if(t)return{error:'That team was already taken (pick #'+t.n+').',taken:t};if(owner!==s.owner)return{error:'It is pick #'+s.n+' for someone else.',turn:true};return{ok:true,slot:s}};
/* why should the auto-picker act now?  'auto' (manager's own switch), 'away' (commissioner marked them away), 'expired' (clock out and the league auto-picks) */
F.autoReason=function(st,now,graceMs){const s=F.onClock(st);if(!s||st.paused)return null;if(st.away[s.owner])return'away';if(st.auto[s.owner])return'auto';
  if(st.autoPick&&st.clockSecs&&st.deadline&&now>st.deadline+(graceMs||0))return'expired';return null};
/* queue first, then best power rank, then a seeded random pick. prank(tid)->rank>0 or 0 */
F.autoChoice=function(st,owner,poolArr,rng,prank){const taken=F.takenMap(st);const q=(st.queues&&st.queues[owner])||[];
  for(const t of q)if(!taken[t]&&poolArr.indexOf(String(t))>=0)return{tid:String(t),from:'queue'};
  const avail=poolArr.filter(t=>!taken[t]);if(!avail.length)return null;
  if(prank){const pr=avail.filter(t=>prank(t)>0).sort((a,b)=>prank(a)-prank(b)||(a<b?-1:1));if(pr.length)return{tid:pr[0],from:'power'}}
  rng=rng||Math.random;const s=avail.slice().sort();return{tid:s[Math.floor(rng()*s.length)],from:'random'}};
F.claimOutcome=(slotEntry,mine,meta)=>{if(!slotEntry||(meta&&meta.voided.indexOf(slotEntry.id)>=0))return'missing';return slotEntry.id===mine.id?'landed':'beaten'};
F.slotWritable=(meta,existing,n,taken,pool,prevId)=>!existing||F.entryProblem(meta,existing,n,taken||{},pool,prevId)!==null;
F.submitSlot=async function(io,o){const NOCONN="Can't reach the draft server. Check your connection and try again.";
  for(let attempt=0;attempt<3;attempt++){let ex;try{ex=F.parseEntry(await io.read(o.url))}catch(e){return{ok:false,msg:NOCONN}}
    if(ex&&ex.id===o.entry.id)break;
    if(!F.slotWritable(o.meta,ex,o.n,o.taken,o.pool,o.prevId)){io.adopt(o.n,ex);return{ok:false,beaten:true,by:ex}}
    try{await io.write(o.url,o.entry)}catch(e){if(attempt===2)return{ok:false,msg:'Save failed (server hiccup). Nothing was changed — try again.'};await io.sleep(400);continue}
    io.adopt(o.n,o.entry);if(o.fast)return{ok:true,pick:o.entry,unverified:true};
    await io.sleep(600);let chk=null;try{chk=F.parseEntry(await io.read(o.url))}catch(e){return{ok:true,pick:o.entry,unverified:true}}
    const out=F.claimOutcome(chk,o.entry,o.meta);
    if(out==='landed'){io.later(async()=>{await io.sleep(1800);try{const c2=F.parseEntry(await io.read(o.url));if(F.claimOutcome(c2,o.entry,o.meta)!=='landed'){io.adopt(o.n,c2);io.alert(o.n,o.entry)}}catch(e){}});return{ok:true,pick:o.entry}}
    if(out==='beaten'){io.adopt(o.n,chk);return{ok:false,beaten:true,by:chk}}}
  return{ok:false,msg:'Could not confirm your pick landed. Check the board before trying again.'}};
/* ============================ chat ============================ */
F.CHAT_CAP=100;
F.REACTS=['👍','😂','🔥','👏','😮'];
F.safeId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(s);
/* chat is a public document anyone can write: keep only well-formed messages, whitelisted reactions and plain ids (these end up in HTML attributes) */
F.normChat=d=>{const c=(d&&typeof d==='object'&&!Array.isArray(d))?d:{};const raw=Array.isArray(c.msgs)?c.msgs:[];const msgs=[];
  raw.forEach(m=>{if(!m||typeof m!=='object'||!F.safeId(m.id)||typeof m.text!=='string')return;const r={};
    if(m.r&&typeof m.r==='object'&&!Array.isArray(m.r))F.REACTS.forEach(e=>{const a=m.r[e];if(Array.isArray(a)){const ids=a.filter(F.safeId).slice(0,60);if(ids.length)r[e]=ids}});
    msgs.push({id:m.id,ts:isFinite(+m.ts)?+m.ts:0,who:F.safeId(m.who)?m.who:'',text:m.text.slice(0,280),r})});
  return{version:+c.version||0,msgs}};
F.addMsg=(c,msg)=>{const n=clone(c);n.msgs.push(msg);if(n.msgs.length>F.CHAT_CAP)n.msgs=n.msgs.slice(-F.CHAT_CAP);return n};
F.toggleReact=(c,id,emoji,who)=>{if(F.REACTS.indexOf(emoji)<0||!F.safeId(id)||!F.safeId(who))return{error:'not allowed'};const n=clone(c);const m=n.msgs.find(x=>x.id===id);if(!m)return{error:'message gone'};m.r=m.r||{};const a=(m.r[emoji]=m.r[emoji]||[]);const i=a.indexOf(who);if(i>=0)a.splice(i,1);else a.push(who);if(!a.length)delete m.r[emoji];return{state:n}};
F.mergeChat=(remote,pending)=>{const c=F.normChat(clone(remote));const have=new Set(c.msgs.map(m=>m.id));pending.forEach(m=>{if(!have.has(m.id))c.msgs.push(m)});c.msgs.sort((a,b)=>(a.ts||0)-(b.ts||0));if(c.msgs.length>F.CHAT_CAP)c.msgs=c.msgs.slice(-F.CHAT_CAP);return c};
/* ============================ server time ============================ */
F.offsetFromDate=function(dateHdr,t0,t1){const d=Date.parse(dateHdr);if(!isFinite(d))return null;return Math.round(d+500-(t0+t1)/2)};
F.sane=o=>typeof o==='number'&&isFinite(o)&&Math.abs(o)<=24*3600*1000;
/* ============================ presence ============================ */
F.PRES={beatMs:45000,onlineMs:110000};
F.parsePresence=function(txt){const d=F.parseJ(txt);const t=d&&Number(d.t);return isFinite(t)&&t>0?{t}:null};
F.agoText=ms=>{const m=Math.floor(ms/60000);if(m<1)return'just now';if(m<60)return m+'m ago';const h=Math.floor(m/60);if(h<24)return h+'h ago';if(h<48)return'yesterday';return Math.floor(h/24)+'d ago'};
F.presenceView=function(recs,now,me,mids){const on=[],off=[];(mids||[]).forEach(o=>{const r=recs[o];if(!r&&o!==me)return;const t=r?Math.min(r.t,now):now;const age=Math.max(0,now-t);
  if(o===me||age<=F.PRES.onlineMs)on.push({mid:o,age});else off.push({mid:o,age,text:F.agoText(age)})});off.sort((a,b)=>a.age-b.age);return{online:on,away:off}};
/* ============================ spin wheel ============================ */
F.randInt=function(max,rb){rb=rb||cryptoBytes;max=Math.floor(max);if(!(max>0)||max>4294967296)throw new Error('bad max');if(max===1)return 0;const lim=Math.floor(4294967296/max)*max;
  for(let g=0;g<1000;g++){const b=rb(4);const x=((b[0]*16777216)+(b[1]<<16)+(b[2]<<8)+b[3])>>>0;if(x<lim)return x%max}throw new Error('rng stuck')};
F.hexOf=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
F.remainingPlayers=(players,winners)=>players.filter(p=>winners.indexOf(p)<0);
F.makeSpin=function(meta,winners,now,rb){rb=rb||cryptoBytes;const rem=F.remainingPlayers(meta.spin.players,winners);const n=winners.length+1;const idx=F.randInt(rem.length,rb);const nonce=F.hexOf(rb(8));
  return{id:'g'+meta.spin.gen+'s'+n+'-'+nonce.slice(0,8),gen:meta.spin.gen,n,idx,winner:rem[idx],nonce,ts:now,of:rem.length}};
F.parseSpin=function(txt){const d=F.parseJ(txt);if(d&&typeof d.id==='string'&&+d.n>0&&+d.gen>0&&Number.isInteger(d.idx)&&typeof d.winner==='string'){d.n=+d.n;d.gen=+d.gen;return d}return null};
F.spinValid=function(meta,winners,r){if(!meta.spin||!r)return false;const rem=F.remainingPlayers(meta.spin.players,winners);return r.gen===meta.spin.gen&&r.n===winners.length+1&&r.idx>=0&&r.idx<rem.length&&rem[r.idx]===r.winner};
F.spinReplay=function(meta,recs){if(!meta.spin)return{winners:[],recs:[],done:false,total:0};const players=meta.spin.players,winners=[],ok=[];
  for(let n=1;n<=players.length;n++){const r=recs[n];if(!r||!F.spinValid(meta,winners,r))break;winners.push(r.winner);ok.push(r)}return{winners,recs:ok,done:winners.length===players.length,total:players.length}};
F.wheelTarget=function(len,idx,nonce){const seg=360/len;const b=parseInt(String(nonce).slice(0,4),16)||0;const turns=4+(b%3);const jit=(((b>>2)%71)/70-.5)*seg*0.6;return 360*turns-((idx+.5)*seg+jit)};
F.mSpinStart=function(m,joined){if(m.status!=='lobby')return{error:'The draft already started.'};const n=clone(m);n.spinGen=m.spinGen+1;n.spin={gen:n.spinGen,players:F.effectiveOrder(m,joined)};return{state:n}};
F.mSpinApply=function(m,winners,joined,now){if(m.status!=='lobby')return{error:'The draft already started.'};if(!m.spin)return{error:'No spin to apply.'};if(winners.length!==m.spin.players.length)return{error:'The spin is not finished.'};
  if(!F.permutationOf(winners,joined))return{error:'Someone joined or left during the spin — spin again.'};const n=clone(m);n.order=winners.slice();n.orderSet=true;n.spin.done=true;n.respins.push({gen:m.spin.gen,ts:now,kind:'spin'});return{state:n}};
/* ============================ team list: sort / group / search / watchlist ============================ */
F.TIERS=[{k:'elite',label:'Elite',max:12,note:'power rank 1–12'},{k:'solid',label:'Solid',max:30,note:'13–30'},{k:'sleeper',label:'Sleeper',max:Infinity,note:'31+ (ranked)'},{k:'longshot',label:'Unranked',note:'no power rank'}];
F.tierOf=p=>{if(!p)return F.TIERS[3];for(const t of F.TIERS)if(t.max!=null&&p<=t.max&&t.k!=='longshot')return t;return F.TIERS[2]};
F.seedNum=m=>{const s=m&&m.s;return(s==null||!isFinite(+s))?null:+s};
F.recParse=r=>{const x=/^(\d+)-(\d+)$/.exec(r||'');if(!x)return null;const w=+x[1],l=+x[2];return(w+l)?{w,l,pct:w/(w+l)}:null};
F.searchMatch=(t,m,q)=>{q=(q||'').trim().toLowerCase();if(!q)return true;return[t.name,t.short,t.abbr,t.mascot,m&&m.c].filter(Boolean).join(' ').toLowerCase().indexOf(q)>=0};
F.TMODES=[['power','Power rank'],['alpha','A–Z'],['conf','Conference'],['seed','Proj. seed'],['record','Last season'],['tiers','Tiers']];
F.teamView=function(o){const TEAMS=o.teams,META=o.meta||{},pool=o.pool,taken=o.taken||{},watch=o.watch||new Set(),q=o.q||'',mode=o.mode||'power';
  const nm=t=>TEAMS[t].short||TEAMS[t].name;const alpha=(a,b)=>nm(a).localeCompare(nm(b));const P=t=>(META[t]&&META[t].p)||0;
  const ids=pool.filter(t=>{if(!TEAMS[t])return false;if(o.hideDrafted&&taken[t])return false;if(o.onlyWatch&&!watch.has(t))return false;if(o.onlyQueue&&(o.queue||[]).indexOf(t)<0)return false;return F.searchMatch(TEAMS[t],META[t],q)});
  const cmps={power:(a,b)=>(P(a)||9999)-(P(b)||9999)||alpha(a,b),alpha,
   seed:(a,b)=>{const x=F.seedNum(META[a]),y=F.seedNum(META[b]);return(x==null?99:x)-(y==null?99:y)||(P(a)||9999)-(P(b)||9999)||alpha(a,b)},
   record:(a,b)=>{const x=F.recParse(META[a]&&META[a].r),y=F.recParse(META[b]&&META[b].r);return(y?y.pct:-1)-(x?x.pct:-1)||(y?y.w:-1)-(x?x.w:-1)||alpha(a,b)},
   conf:(a,b)=>(P(a)||9999)-(P(b)||9999)||alpha(a,b),tiers:(a,b)=>(P(a)||9999)-(P(b)||9999)||alpha(a,b)};
  const cmp=cmps[mode]||cmps.power;const stars=ids.filter(t=>watch.has(t)).sort(cmp),rest=ids.filter(t=>!watch.has(t)).sort(cmp);const groups=[];
  if(mode==='conf'||mode==='tiers'||mode==='seed'){if(stars.length)groups.push({key:'watch',label:'⭐ My Picks',tids:stars});const map=new Map();
    rest.forEach(t=>{let k,l,note='';if(mode==='conf'){k=(META[t]&&META[t].c)||'~—';l=(META[t]&&META[t].c)||'Conference unknown'}
      else if(mode==='tiers'){const ti=F.tierOf(P(t));k=ti.k;l=ti.label;note=ti.note}else{const s=F.seedNum(META[t]);k=s==null?'~—':String(s).padStart(4,'0');l=s==null?'No projected seed':'Seed '+s}
      if(!map.has(k))map.set(k,{key:k,label:l,note,tids:[]});map.get(k).tids.push(t)});
    let gs=Array.from(map.values());if(mode==='tiers'){const ord=F.TIERS.map(x=>x.k);gs.sort((a,b)=>ord.indexOf(a.key)-ord.indexOf(b.key))}else gs.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);gs.forEach(g=>groups.push(g))}
  else{const all=stars.concat(rest);if(all.length)groups.push({key:'all',label:'',tids:all,flat:true})}return groups};
F.watchToggle=(arr,tid)=>{const a=(arr||[]).slice();const i=a.indexOf(String(tid));if(i>=0)a.splice(i,1);else a.push(String(tid));return a};
F.rowValue=(mode,t,META)=>{const m=META[t]||{};if(mode==='power'||mode==='tiers')return m.p?'#'+m.p:'—';if(mode==='seed'){const s=F.seedNum(m);return s==null?'—':'S'+s}if(mode==='record')return m.r||'—';if(mode==='conf')return m.c||'—';return m.p?'#'+m.p:'—'};
/* ============================ export + recap ============================ */
const csvCell=v=>{v=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};F.csvCell=csvCell;
F.rosters=function(st,mgrs){return st.order.map(mid=>{const m=mgrs.find(x=>x.mid===mid)||{mid,name:'Manager',team:'Team'};return{mgr:m,picks:st.picks.filter(p=>p.owner===mid)}})};
F.toCSV=function(st,mgrs,teams,meta){const rows=[['pick','round','manager','team_name','school','conference','power_rank','auto_pick']];
  st.picks.forEach(p=>{const m=mgrs.find(x=>x.mid===p.owner)||{};const t=teams[p.tid]||{};const mt=(meta&&meta[p.tid])||{};rows.push([p.n,p.round,m.name||'',m.team||'',t.name||p.tid,mt.c||'',mt.p||'',p.auto?'yes':'no'])});
  return rows.map(r=>r.map(csvCell).join(',')).join('\n')+'\n'};
F.toJSONExport=function(st,mgrs,teams,meta,leagueMeta){return{league:leagueMeta.name,id:leagueMeta.id,status:st.status,endedEarly:!!st.endedEarly,settings:leagueMeta.settings,order:st.order,
  managers:mgrs.map(m=>({id:m.mid,name:m.name,team:m.team})),picks:st.picks.map(p=>({n:p.n,round:p.round,managerId:p.owner,teamId:p.tid,school:(teams[p.tid]||{}).name||p.tid,auto:!!p.auto,ts:p.ts})),exportedAt:new Date().toISOString()}};
F.pickNote=function(n,rank){if(!rank)return null;const d=n-rank;if(d>=10)return'value';if(d<=-10)return'reach';return null};
F.rosterStats=function(picks,META){let sum=0,c=0,best=null;picks.forEach(p=>{const r=(META[p.tid]||{}).p;if(r){sum+=r;c++;if(!best||r<best.r)best={r,tid:p.tid}}});return{n:picks.length,avgRank:c?Math.round(sum/c*10)/10:null,best,ranked:c}};
if(typeof module!=='undefined'&&module.exports)module.exports=F;else root.FBN=F;
})(typeof window!=='undefined'?window:globalThis);
