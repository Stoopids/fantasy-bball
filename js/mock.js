/* s24 mock drafts ("practice leagues"). FBNMock.create makes a normal league through the same keys and the same room (room.html), with meta.mock=true, its own random id
   and the settings copied from the real league (read once, never written). Bots are seats marked away (meta.over[mid]={away:true,bot:true}), so the room's auto-pick picks for them.
   Exactly 8 seats. Solo = you + 7 bots, starts at once. With others = share the link; the commissioner can fill the empty seats with bots.
   Nothing here writes a key of another league, and nothing touches fbn.leagues ("Your leagues"): mocks go to fbn.mocks (last 5). The page part runs only on mock.html. */
(function(){const F=FBN;
const BOT_TEAMS=['Circuit Dunkers','Robo Rebounders','Byte Buckets','Pixel Hoopers','Auto Ballers','Bit Blazers','Gear Guards','Chip Shooters'];
const botName=n=>'Bot '+n+' (CPU)';
/* the settings a mock copies: draft style, rounds, pick clock, warnings. Start is always "now", order random, auto-pick on, 8 seats. */
function mockSettings(src,clock){const s=F.normalizeSettings(Object.assign({},F.DEFAULTS,src||{}));
  const c=(clock!=null&&F.CLOCKS.indexOf(+clock)>=0)?+clock:(F.CLOCKS.indexOf(+s.clockSecs)>=0?+s.clockSecs:60);
  return F.normalizeSettings({managers:F.MANAGERS,rounds:s.rounds,type:s.type,startAt:null,startMode:'manual',orderMode:'random',clockSecs:c,autoPick:true,warn15:src&&src.warn15===false?false:true})}
async function botSeat(K,i,gen,n){const mid=F.hexId(12);const sh=await F.mgrHash(mid,F.newSecret());/* the bot's secret is thrown away: nobody can act as a bot except the auto-pick and the commissioner */
  return{mid,claim:F.makeClaim({mid,i,gen,name:botName(n),team:BOT_TEAMS[(n-1)%BOT_TEAMS.length],sh,w:'bot'}),prof:F.makeProfile({mid,name:botName(n),team:BOT_TEAMS[(n-1)%BOT_TEAMS.length],emoji:'🤖',pv:0})}}
/* o: {parent, parentName, settings, solo, mgrName, teamName, clockSecs} -> {id, mid, secret, cmSecret} */
async function create(o){o=o||{};const id=F.makeMockId();const K=F.Keys(id);const mid=F.hexId(12),secret=F.newSecret(),cmSecret=F.newSecret();
  const parent=o.parent?F.parseCode(o.parent):null;if(parent&&parent===id)throw new Error('id clash');
  const name=(F.clean(o.parentName)?'Practice: '+F.clean(o.parentName):'Mock draft').slice(0,40);
  const ns=mockSettings(o.settings,o.clockSecs);ns.tz=UI.tz();
  const meta=F.defaultMeta(id,Object.assign({name},ns),mid);meta.name=F.clean(name);meta.settings=ns;meta.mock=true;meta.solo=!!o.solo;meta.parent=parent||null;
  meta.pass=await F.makePass(cmSecret);
  const me=F.clean(o.mgrName)||'You',team=F.clean(o.teamName)||'My practice team';
  /* a brand-new random id: nobody else can know it yet, so seat 1 and the bot seats are written straight away (no join race to win) */
  const sh=await F.mgrHash(mid,secret);
  await Store.set(K.slot(1,0),F.makeClaim({mid,i:1,gen:0,name:me,team,sh,w:'cm'}));await Store.set(K.mgr(mid),F.makeProfile({mid,name:me,team,pv:0}));
  if(o.solo){const bots=[];for(let i=2;i<=F.MANAGERS;i++)bots.push(await botSeat(K,i,0,i-1));
    await Promise.all(bots.map(b=>Promise.all([Store.set(K.slot(b.claim.i,0),b.claim),Store.set(K.mgr(b.mid),b.prof)])));
    bots.forEach(b=>{meta.over[b.mid]={away:true,bot:true}})}
  let ok=false;for(let a=0;a<3&&!ok;a++){await Store.set(K.meta,meta);await UI.sleep(250);const chk=F.parseJ(await Store.get(K.meta));ok=!!(chk&&chk.id===id&&chk.mock===true&&chk.pass&&chk.pass.hash===meta.pass.hash)}
  if(!ok)throw new Error('The mock draft could not be saved. Check your connection and try again.');
  UI.setMe(id,{mid,k:secret});UI.lsSet('cm.'+id,cmSecret);UI.rememberMock({id,name:meta.name,parent:parent||'',solo:!!o.solo,ts:Date.now()});
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
/* ===================== mock.html page ===================== */
const app=document.getElementById('mockapp');if(!app)return;
const {esc,$}=UI;const P=UI.qs();const from=F.parseCode(P.get('from')||'');
let parentMeta=null,parentMe=null,mode='solo',clock=null,busy=false,loadErr='';
const CL=[[30,'30 sec'],[60,'60 sec'],[90,'90 sec'],[0,'No clock']];
function settingsText(s){return [s.type==='snake'?'Snake':'Linear',F.MANAGERS+' teams',s.rounds+' rounds',s.clockSecs?s.clockSecs+' sec per pick':'no pick clock'].join(' · ')}
function recentHTML(){const a=UI.myMocks();if(!a.length)return'';
  return `<div class="card" id="recentmocks"><h3>My recent mocks</h3><div class="small mut" style="margin-bottom:6px">The last ${UI.MOCK_KEEP} on this device.</div>${a.map(x=>`<a class="mrow" href="${esc(UI.pageUrl(x.grade?'recap.html':'room.html',{l:x.id}))}" data-id="${esc(x.id)}"><div class="grow" style="min-width:0"><div class="nm">${esc(x.name||'Mock draft')}</div><div class="tm2">${esc(fmtDay(x.ts))}${x.solo?' · solo vs bots':' · with others'}</div></div>${x.grade?`<span class="rcgrade sm">${esc(x.grade)}</span>`:'<span class="btn sm">Open</span>'}</a>`).join('')}</div>`}
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
function fmtDay(ts){const d=new Date(+ts||0);return isFinite(d)&&+ts?MON[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear():''}
function render(){const s=mockSettings(parentMeta?parentMeta.settings:null,clock);if(clock==null)clock=s.clockSecs;
  const src=parentMeta?`Same settings as <b>${esc(parentMeta.name)}</b>: ${esc(settingsText(s))}.`:`Standard settings: ${esc(settingsText(s))}.`;
  const opt=(v,t,h)=>`<button type="button" class="opt${esc(mode===v?' on':'')}" data-a="mode" data-v="${esc(v)}" id="mode_${esc(v)}" aria-pressed="${esc(mode===v)}"><b>${t}</b><span>${h}</span></button>`;
  app.innerHTML=UI.practiceBanner('A practice league with its own code. It never changes a real league.')+`<h1 class="q" id="mockh">${parentMeta?'Practice this draft':'Try a mock draft'}</h1>
  <p class="sub" id="mocksrc">${src}${loadErr?' <span class="mut">'+esc(loadErr)+'</span>':''}</p>
  <div class="opts">${opt('solo','Solo: you + 7 bots','Starts right away. Bots pick in a second or two.')}${opt('group','With others','Share a link with friends. Bots fill any empty seats.')}</div>
  <div class="small mut" style="margin:10px 0 4px">Pick clock for you</div><div class="chips" role="group" aria-label="Pick clock">${CL.map(c=>`<button type="button" class="chipb${esc(clock===c[0]?' on':'')}" data-a="clock" data-v="${esc(c[0])}" aria-pressed="${esc(clock===c[0])}">${esc(c[1])}</button>`).join('')}</div>
  <div class="row nw" style="margin-top:12px;align-items:flex-start"><div class="grow"><label class="f" for="m_name">Your name</label><input type="text" id="m_name" maxlength="30" autocomplete="off" value="${esc(parentMe?parentMe.name:(UI.lsGet('mockname')||''))}" placeholder="You"></div>
  <div class="grow"><label class="f" for="m_team">Team name</label><input type="text" id="m_team" maxlength="30" autocomplete="off" value="${esc(parentMe?parentMe.team:(UI.lsGet('mockteam')||''))}" placeholder="My practice team"></div></div>
  <div class="err" id="mockerr" role="alert"></div>
  <button class="btn pri block" data-a="go" id="startmock" style="margin-top:12px">${mode==='solo'?'Start mock draft':'Create mock and invite'}</button>
  <div class="hint" style="margin:8px 0 12px">Grades at the end compare you with the bots${mode==='group'?' and the people who joined':''}. The device keeps your last ${UI.MOCK_KEEP} mocks.</div>
  ${recentHTML()}<a class="btn block" id="mockback" href="${esc(from?UI.roomHref(from):UI.pageUrl('index.html'))}">${from?'Back to my league':'Back to home'}</a>`+UI.buildTag()}
const ACT={mode:el=>{read();mode=el.dataset.v==='group'?'group':'solo';render()},clock:el=>{read();clock=+el.dataset.v;render()},go:()=>go()};
let nm='',tm='';function read(){const a=$('m_name'),b=$('m_team');if(a)nm=a.value;if(b)tm=b.value}
async function go(){if(busy)return;read();busy=true;const b=$('startmock');b.disabled=true;b.textContent='Setting up…';
  try{if(F.clean(nm))UI.lsSet('mockname',F.clean(nm).slice(0,30));if(F.clean(tm))UI.lsSet('mockteam',F.clean(tm).slice(0,30));
    const r=await create({parent:parentMeta?from:null,parentName:parentMeta?parentMeta.name:'',settings:parentMeta?parentMeta.settings:null,solo:mode==='solo',mgrName:nm,teamName:tm,clockSecs:clock});
    location.href=UI.pageUrl('room.html',{l:r.id})}
  catch(e){$('mockerr').textContent=String(e.message||e);b.disabled=false;b.textContent='Try again'}finally{busy=false}}
UI.bind(ACT);document.getElementById('top').innerHTML=UI.header({sub:'Mock draft'});
(async function(){if(from){app.innerHTML='<div class="card mut">Loading your league settings…</div>';
  try{const d=F.parseJ(await Store.get(F.Keys(from).meta));if(F.exists(d)&&!d.mock){parentMeta=F.normalizeMeta(d);const me=UI.getMe(from);
      if(me&&me.mid){try{const p=F.parseProfile(await Store.get(F.Keys(from).mgr(me.mid)));if(p)parentMe={name:p.name,team:p.team}}catch(e){}}}
    else if(F.exists(d)&&d.mock&&d.parent){location.replace(UI.pageUrl('mock.html',{from:F.parseCode(d.parent)||''}));return}
    else loadErr='(That league was not found, so standard settings are used.)'}catch(e){loadErr='(Could not load your league, so standard settings are used.)'}}
  render()})();
UI.registerSW();
})();
