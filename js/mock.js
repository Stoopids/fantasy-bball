/* s24 mock drafts ("practice leagues"). FBNMock.create makes a normal league through the same keys and the same room (room.html), with meta.mock=true, its own random id
   and the settings copied from the real league (read once, never written). Bots are seats marked away (meta.over[mid]={away:true,bot:true}), so the room's auto-pick picks for them.
   Exactly 8 seats. Solo = you + 7 bots, starts at once. With others = share the link; the commissioner can fill the empty seats with bots.
   Nothing here writes a key of another league, and nothing touches fbn.leagues ("Your leagues"): mocks go to fbn.mocks (last 5). The page part runs only on mock.html. */
(function(){const F=FBN;
const BOT_TEAMS=['Circuit Dunkers','Robo Rebounders','Byte Buckets','Pixel Hoopers','Auto Ballers','Bit Blazers','Gear Guards','Chip Shooters'];
const botName=n=>'Bot '+n+' (CPU)';
/* the settings a mock copies: draft style, rounds, pick clock, warnings. Start is always "now", order random, auto-pick on, 8 seats. */
function mockSettings(src,clock,type){const s=F.normalizeSettings(Object.assign({},F.DEFAULTS,src||{}));
  const c=(clock!=null&&F.CLOCKS.indexOf(+clock)>=0)?+clock:(F.CLOCKS.indexOf(+s.clockSecs)>=0?+s.clockSecs:60);
  return F.normalizeSettings({managers:F.MANAGERS,rounds:s.rounds,type:(type==='snake'||type==='linear')?type:s.type,startAt:null,startMode:'manual',orderMode:'random',clockSecs:c,autoPick:true,warn15:src&&src.warn15===false?false:true})}
async function botSeat(K,i,gen,n){const mid=F.hexId(12);const sh=await F.mgrHash(mid,F.newSecret());/* the bot's secret is thrown away: nobody can act as a bot except the auto-pick and the commissioner */
  return{mid,claim:F.makeClaim({mid,i,gen,name:botName(n),team:BOT_TEAMS[(n-1)%BOT_TEAMS.length],sh,w:'bot'}),prof:F.makeProfile({mid,name:botName(n),team:BOT_TEAMS[(n-1)%BOT_TEAMS.length],emoji:'🤖',pv:0})}}
/* o: {parent, parentName, settings, solo, mgrName, teamName, clockSecs} -> {id, mid, secret, cmSecret} */
async function create(o){o=o||{};const id=F.makeMockId();const K=F.Keys(id);const mid=F.hexId(12),secret=F.newSecret(),cmSecret=F.newSecret();
  const parent=o.parent?F.parseCode(o.parent):null;if(parent&&parent===id)throw new Error('id clash');
  const name=(F.clean(o.parentName)?'Practice: '+F.clean(o.parentName):'Mock draft').slice(0,40);
  const ns=mockSettings(o.settings,o.clockSecs,o.type);
  /* s26mo: seat 1-8 or 0 = any (random); bot style 'best' | 'random' */
  const want=(+o.seat>=1&&+o.seat<=F.MANAGERS)?+o.seat:0;const seat=want||1+Math.floor(Math.random()*F.MANAGERS);const botStyle=o.botStyle==='random'?'random':'best';ns.tz=UI.tz();
  const meta=F.defaultMeta(id,Object.assign({name},ns),mid);meta.name=F.clean(name);meta.settings=ns;meta.mock=true;meta.solo=!!o.solo;meta.parent=parent||null;
  meta.pass=await F.makePass(cmSecret);meta.mockOpts={seat:want,botStyle};
  const me=F.clean(o.mgrName)||'You',team=F.clean(o.teamName)||'My practice team';
  /* a brand-new random id: nobody else can know it yet, so seat 1 and the bot seats are written straight away (no join race to win) */
  const sh=await F.mgrHash(mid,secret);
  await Store.set(K.slot(1,0),F.makeClaim({mid,i:1,gen:0,name:me,team,sh,w:'cm'}));await Store.set(K.mgr(mid),F.makeProfile({mid,name:me,team,pv:0}));
  if(o.solo){const bots=[];for(let i=2;i<=F.MANAGERS;i++)bots.push(await botSeat(K,i,0,i-1));
    await Promise.all(bots.map(b=>Promise.all([Store.set(K.slot(b.claim.i,0),b.claim),Store.set(K.mgr(b.mid),b.prof)])));
    bots.forEach(b=>{meta.over[b.mid]={away:true,bot:true}});
    /* s26mo: the draft order is fixed here with you in your seat (chosen, or drawn at random for Any), so no wheel spin is needed and mStart keeps it */
    const ord=bots.map(b=>b.mid);ord.splice(seat-1,0,mid);meta.order=ord;meta.orderSet=true;meta.mockOpts.seatUsed=seat}
  let ok=false;for(let a=0;a<3&&!ok;a++){await Store.set(K.meta,meta);await UI.sleep(250);const chk=F.parseJ(await Store.get(K.meta));ok=!!(chk&&chk.id===id&&chk.mock===true&&chk.pass&&chk.pass.hash===meta.pass.hash)}
  if(!ok)throw new Error('The mock draft could not be saved. Check your connection and try again.');
  UI.setMe(id,{mid,k:secret});UI.lsSet('mockopts.'+id,JSON.stringify({botStyle,me:mid}));UI.lsSet('cm.'+id,cmSecret);UI.rememberMock({id,name:meta.name,parent:parent||'',solo:!!o.solo,ts:Date.now()});
  return{id,mid,secret,cmSecret}}
/* with others: give every open seat to a bot. First write wins per seat (the same claim check as joining), so a person joining at the same moment keeps their seat.
   Returns the bot mids that got a seat; the caller marks them away + bot in meta. */
async function fillBots(meta){const K=F.Keys(meta.id);const N=meta.settings.managers;const claims={};
  await Promise.all(Array.from({length:N},(_,k)=>k+1).map(async i=>{claims[i]=F.parseClaim(await Store.get(K.slot(i,meta.slotGen[i]||0)).catch(()=>''))}));
  const free=F.freeSlots(meta,claims);const got=[];const io={read:k=>Store.get(k),write:(k,v)=>Store.set(k,v),sleep:UI.sleep};
  const used=Object.values(meta.over||{}).filter(x=>x&&x.bot).length;let n=used;
  for(const i of free){n++;const gen=meta.slotGen[i]||0;const b=await botSeat(K,i,gen,n);
    const r=await F.claimKey(io,{url:K.slot(i,gen),mine:b.claim,parse:F.parseClaim,same:(a,c)=>a.mid===c.mid,held:a=>a.i===i&&a.gen===gen,wait:400});
    if(r.ok){await Store.set(K.mgr(b.mid),b.prof);got.push(b.mid)}else n--}
  return got}
window.FBNMock={create,fillBots,mockSettings,botName};
/* s26mo: bot draft style 'random' on a mock: a bot (any seat that is not you) takes a random team still available instead of the best-ranked one; its queue is empty anyway.
   Only on room.html of a mock this device created (the creator's page runs the bots); nothing changes for real leagues. */
{const orig=F.autoChoice;F.autoChoice=function(st,owner,poolArr,rng,prank){try{const dm=window.DR2_meta&&window.DR2_meta();const l=UI.qs().get('l');
  if(dm&&dm.mock&&l){const o=F.parseJ(UI.lsGet('mockopts.'+l)||'');if(o&&o.botStyle==='random'&&owner!==o.me)return orig(st,owner,poolArr,rng,null)}}catch(e){}return orig(st,owner,poolArr,rng,prank)}}
/* ===================== mock.html page ===================== */
const app=document.getElementById('mockapp');if(!app)return;
const {esc,$}=UI;const P=UI.qs();const from=F.parseCode(P.get('from')||'');
let parentMeta=null,parentMe=null,mode='solo',clock=null,busy=false,loadErr='';
/* s26mo options; a query string can preset them: ?seat=1-8|any&order=snake|straight&clock=30|60|90|120|180|0&bots=best|random */
let seat=0,otype=null,botStyle='best';{const q=+P.get('seat');if(q>=1&&q<=8)seat=q;const o=P.get('order');if(o==='snake')otype='snake';if(o==='straight'||o==='linear')otype='linear';const c=P.get('clock');if(c!=null&&c!==''&&F.CLOCKS.indexOf(+c)>=0)clock=+c;if(P.get('bots')==='random')botStyle='random'}
const CL=F.CLOCKS.map(v=>[v,v===0?'No clock':v>=120?(v/60)+' min':v+' sec']);
function settingsText(s){return [s.type==='snake'?'Snake':'Linear',F.MANAGERS+' teams',s.rounds+' rounds',s.clockSecs?s.clockSecs+' sec per pick':'no pick clock'].join(' · ')}
function recentHTML(){const a=UI.myMocks();if(!a.length)return'';
  return `<div class="card" id="recentmocks"><h3>My recent mocks</h3><div class="small mut" style="margin-bottom:6px">The last ${UI.MOCK_KEEP} on this device.</div>${a.map(x=>`<a class="mrow" href="${esc(UI.pageUrl(x.grade?'recap.html':'room.html',{l:x.id}))}" data-id="${esc(x.id)}"><div class="grow" style="min-width:0"><div class="nm">${esc(x.name||'Mock draft')}</div><div class="tm2">${esc(fmtDay(x.ts))}${x.solo?' · solo vs bots':' · with others'}</div></div>${x.grade?`<span class="rcgrade sm">${esc(x.grade)}</span>`:'<span class="btn sm">Open</span>'}</a>`).join('')}</div>`}
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
function fmtDay(ts){const d=new Date(+ts||0);return isFinite(d)&&+ts?MON[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear():''}
function render(){const s=mockSettings(parentMeta?parentMeta.settings:null,clock,otype);if(clock==null)clock=s.clockSecs;if(otype==null)otype=s.type;
  const src=parentMeta?`Same settings as <b>${esc(parentMeta.name)}</b>: ${esc(settingsText(s))}.`:`Standard settings: ${esc(settingsText(s))}.`;
  const opt=(v,t,h)=>`<button type="button" class="opt${esc(mode===v?' on':'')}" data-a="mode" data-v="${esc(v)}" id="mode_${esc(v)}" aria-pressed="${esc(mode===v)}"><b>${t}</b><span>${h}</span></button>`;
  app.innerHTML=UI.practiceBanner('A practice league with its own code. It never changes a real league.')+`<h1 class="q" id="mockh">${parentMeta?'Practice this draft':'Try a mock draft'}</h1>
  <p class="sub" id="mocksrc">${src}${loadErr?' <span class="mut">'+esc(loadErr)+'</span>':''}</p>
  <div class="opts">${opt('solo','Solo: you + 7 bots','Starts right away. Bots pick in a second or two.')}${opt('group','With others','Share a link with friends. Bots fill any empty seats.')}</div>
  <div class="mopts" id="mockopts"><div class="grow mopt"><label class="f" for="m_seat">Your draft seat</label><select id="m_seat" class="msel"${mode==='solo'?'':' disabled'}>${[[0,'Any (random)']].concat([1,2,3,4,5,6,7,8].map(i=>[i,'Seat '+i])).map(c=>`<option value="${esc(c[0])}"${String(mode==='solo'?seat:0)===String(c[0])?' selected':''}>${esc(c[1])}</option>`).join('')}</select></div><div class="grow mopt"><label class="f" for="m_order">Order</label><select id="m_order" class="msel">${[['snake','Snake (reverses each round)'],['linear','Straight (1-8 every round)']].map(c=>`<option value="${esc(c[0])}"${String(otype)===String(c[0])?' selected':''}>${esc(c[1])}</option>`).join('')}</select></div><div class="grow mopt"><label class="f" for="m_clock">Pick clock for you</label><select id="m_clock" class="msel">${CL.map(c=>`<option value="${esc(c[0])}"${String(clock)===String(c[0])?' selected':''}>${esc(c[1])}</option>`).join('')}</select></div><div class="grow mopt"><label class="f" for="m_bots">Bot draft style</label><select id="m_bots" class="msel">${[['best','Best available'],['random','Random']].map(c=>`<option value="${esc(c[0])}"${String(botStyle)===String(c[0])?' selected':''}>${esc(c[1])}</option>`).join('')}</select></div></div>${mode==='solo'?'':'<div class="small mut">With others, seats are set by the wheel spin in the room.</div>'}
  <div class="row nw" style="margin-top:12px;align-items:flex-start"><div class="grow"><label class="f" for="m_name">Your name</label><input type="text" id="m_name" maxlength="30" autocomplete="off" value="${esc(parentMe?parentMe.name:(UI.lsGet('mockname')||''))}" placeholder="You"></div>
  <div class="grow"><label class="f" for="m_team">Team name</label><input type="text" id="m_team" maxlength="30" autocomplete="off" value="${esc(parentMe?parentMe.team:(UI.lsGet('mockteam')||''))}" placeholder="My practice team"></div></div>
  <div class="err" id="mockerr" role="alert"></div>
  <button class="btn pri block" data-a="go" id="startmock" style="margin-top:12px">${mode==='solo'?'Start mock draft':'Create mock and invite'}</button>
  <div class="hint" style="margin:8px 0 12px">Grades at the end compare you with the bots${mode==='group'?' and the people who joined':''}. The device keeps your last ${UI.MOCK_KEEP} mocks.</div>
  ${recentHTML()}<a class="btn block" id="mockback" href="${esc(from?UI.roomHref(from):UI.pageUrl('index.html'))}">${from?'Back to my league':'Back to home'}</a>`+UI.buildTag()}
const ACT={mode:el=>{read();mode=el.dataset.v==='group'?'group':'solo';render()},clock:el=>{read();clock=+el.dataset.v;render()},go:()=>go()};
let nm='',tm='';function read(){const a=$('m_name'),b=$('m_team');if(a)nm=a.value;if(b)tm=b.value;const v=id=>($(id)||{}).value;if($('m_seat')&&!$('m_seat').disabled)seat=+v('m_seat')||0;if(v('m_order'))otype=v('m_order');if(v('m_clock')!=null)clock=+v('m_clock');if(v('m_bots'))botStyle=v('m_bots')}
async function go(){if(busy)return;read();busy=true;const b=$('startmock');b.disabled=true;b.textContent='Setting up…';
  try{if(F.clean(nm))UI.lsSet('mockname',F.clean(nm).slice(0,30));if(F.clean(tm))UI.lsSet('mockteam',F.clean(tm).slice(0,30));
    const r=await create({parent:parentMeta?from:null,parentName:parentMeta?parentMeta.name:'',settings:parentMeta?parentMeta.settings:null,solo:mode==='solo',mgrName:nm,teamName:tm,clockSecs:clock,type:otype,seat:mode==='solo'?seat:0,botStyle});
    location.href=UI.pageUrl('room.html',{l:r.id})}
  catch(e){$('mockerr').textContent=String(e.message||e);b.disabled=false;b.textContent='Try again'}finally{busy=false}}
UI.bind(ACT);app.addEventListener('change',e=>{if(e.target&&e.target.classList.contains('msel'))read()});document.getElementById('top').innerHTML=UI.header({sub:'Mock draft'});
(async function(){if(from){app.innerHTML='<div class="card mut">Loading your league settings…</div>';
  try{const d=F.parseJ(await Store.get(F.Keys(from).meta));if(F.exists(d)&&!d.mock){parentMeta=F.normalizeMeta(d);const me=UI.getMe(from);
      if(me&&me.mid){try{const p=F.parseProfile(await Store.get(F.Keys(from).mgr(me.mid)));if(p)parentMe={name:p.name,team:p.team}}catch(e){}}}
    else if(F.exists(d)&&d.mock&&d.parent){location.replace(UI.pageUrl('mock.html',{from:F.parseCode(d.parent)||''}));return}
    else loadErr='(That league was not found, so standard settings are used.)'}catch(e){loadErr='(Could not load your league, so standard settings are used.)'}}
  render()})();
UI.registerSW();
})();
