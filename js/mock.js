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
/* s26mo2: 'Any' seat: one crypto byte, 256 % 8 = 0 so each of 1-8 has exactly 32/256 = 1/8 (no modulo bias) */
function drawSeat(rb){const b=(rb||(n=>crypto.getRandomValues(new Uint8Array(n))))(1)[0];return 1+(b%F.MANAGERS)}
/* s26mo4: tm = the bot's team text (its personality label); 'auto' = derive it from the mock id + bot id (group mocks) */
async function botSeat(K,i,gen,n,tm){const mid=F.hexId(12);const team=tm==='auto'&&window.FBNBots?FBNBots.label(FBNBots.forBot(K.id||'',mid))+' bot':(tm||BOT_TEAMS[(n-1)%BOT_TEAMS.length]);const sh=await F.mgrHash(mid,F.newSecret());/* the bot's secret is thrown away: nobody can act as a bot except the auto-pick and the commissioner */
  return{mid,claim:F.makeClaim({mid,i,gen,name:botName(n),team,sh,w:'bot'}),prof:F.makeProfile({mid,name:botName(n),team,emoji:'🤖',pv:0})}}
/* o: {parent, parentName, settings, solo, mgrName, teamName, clockSecs} -> {id, mid, secret, cmSecret} */
async function create(o){o=o||{};const id=F.makeMockId();const K=F.Keys(id);const mid=F.hexId(12),secret=F.newSecret(),cmSecret=F.newSecret();
  const parent=o.parent?F.parseCode(o.parent):null;if(parent&&parent===id)throw new Error('id clash');
  const name=(F.clean(o.parentName)?'Practice: '+F.clean(o.parentName):'Mock draft').slice(0,40);
  const ns=mockSettings(o.settings,o.clockSecs,o.type);
  /* s26mo: seat 1-8 or 0 = any (random). s26mo4: bot style replaced by personalities dealt per mock (js/mock-bots.js) */
  const want=(+o.seat>=1&&+o.seat<=F.MANAGERS)?+o.seat:0;const seat=want||drawSeat();ns.tz=UI.tz();
  const meta=F.defaultMeta(id,Object.assign({name},ns),mid);meta.name=F.clean(name);meta.settings=ns;meta.mock=true;meta.solo=!!o.solo;meta.parent=parent||null;
  meta.pass=await F.makePass(cmSecret);meta.mockOpts={seat:want,bots:'pers4'};
  const me=F.clean(o.mgrName)||'You',team=F.clean(o.teamName)||'My practice team';
  /* a brand-new random id: nobody else can know it yet, so seat 1 and the bot seats are written straight away (no join race to win) */
  const sh=await F.mgrHash(mid,secret);
  await Store.set(K.slot(1,0),F.makeClaim({mid,i:1,gen:0,name:me,team,sh,w:'cm'}));await Store.set(K.mgr(mid),F.makeProfile({mid,name:me,team,pv:0}));
  if(o.solo){const bots=[];for(let i=2;i<=F.MANAGERS;i++)bots.push(await botSeat(K,i,0,i-1,'auto'));
    /* s26mo4: deal the personalities (6 distinct + 1 repeat, seeded by the mock id) and show each as the bot's team text */
    const dealt=FBNBots.deal(id,bots.map(b=>b.mid));meta.mockOpts.dealt=dealt;bots.forEach(b=>{const t=FBNBots.label(dealt[b.mid])+' bot';b.claim.team=t;b.prof.team=t});
    await Promise.all(bots.map(b=>Promise.all([Store.set(K.slot(b.claim.i,0),b.claim),Store.set(K.mgr(b.mid),b.prof)])));
    bots.forEach(b=>{meta.over[b.mid]={away:true,bot:true}});
    /* s26mo: the draft order is fixed here with you in your seat (chosen, or drawn at random for Any), so no wheel spin is needed and mStart keeps it */
    const ord=bots.map(b=>b.mid);ord.splice(seat-1,0,mid);meta.order=ord;meta.orderSet=true;meta.mockOpts.seatUsed=seat}
  let ok=false;for(let a=0;a<3&&!ok;a++){await Store.set(K.meta,meta);await UI.sleep(250);const chk=F.parseJ(await Store.get(K.meta));ok=!!(chk&&chk.id===id&&chk.mock===true&&chk.pass&&chk.pass.hash===meta.pass.hash)}
  if(!ok)throw new Error('The mock draft could not be saved. Check your connection and try again.');
  UI.setMe(id,{mid,k:secret});UI.lsSet('mockopts.'+id,JSON.stringify({v:4,me:mid}));UI.lsSet('cm.'+id,cmSecret);UI.rememberMock({id,name:meta.name,parent:parent||'',solo:!!o.solo,ts:Date.now()});
  return{id,mid,secret,cmSecret}}
/* with others: give every open seat to a bot. First write wins per seat (the same claim check as joining), so a person joining at the same moment keeps their seat.
   Returns the bot mids that got a seat; the caller marks them away + bot in meta. */
async function fillBots(meta){const K=F.Keys(meta.id);const N=meta.settings.managers;const claims={};
  await Promise.all(Array.from({length:N},(_,k)=>k+1).map(async i=>{claims[i]=F.parseClaim(await Store.get(K.slot(i,meta.slotGen[i]||0)).catch(()=>''))}));
  const free=F.freeSlots(meta,claims);const got=[];const io={read:k=>Store.get(k),write:(k,v)=>Store.set(k,v),sleep:UI.sleep};
  const used=Object.values(meta.over||{}).filter(x=>x&&x.bot).length;let n=used;
  for(const i of free){n++;const gen=meta.slotGen[i]||0;const b=await botSeat(Object.assign({id:meta.id},K),i,gen,n,'auto');
    const r=await F.claimKey(io,{url:K.slot(i,gen),mine:b.claim,parse:F.parseClaim,same:(a,c)=>a.mid===c.mid,held:a=>a.i===i&&a.gen===gen,wait:400});
    if(r.ok){await Store.set(K.mgr(b.mid),b.prof);got.push(b.mid)}else n--}
  return got}
window.FBNMock={create,fillBots,mockSettings,botName,drawSeat};
/* s26mo: bot draft style 'random' on a mock: a bot (any seat that is not you) takes a random team still available instead of the best-ranked one; its queue is empty anyway.
   Only on room.html of a mock this device created (the creator's page runs the bots); nothing changes for real leagues. */
{const orig=F.autoChoice;F.autoChoice=function(st,owner,poolArr,rng,prank){try{const dm=window.DR2_meta&&window.DR2_meta();const l=UI.qs().get('l');
  if(dm&&dm.mock&&l){const o=F.parseJ(UI.lsGet('mockopts.'+l)||'');if(o&&o.botStyle==='random'&&owner!==o.me){/* s26mo2: seeded per mock AND per pick: the room's rng is seeded by pick number, mixed here with the mock id, so different mocks differ while a reload/resume of one mock repeats the same pick */
    const r0=rng?Math.floor(rng()*4294967296):0;return orig(st,owner,poolArr,F.mulberry((F.hash32('mockbot:'+l)^r0)>>>0),null)}
    /* s26c14 (QA BUG-1): v4 is also read from the shared meta (mockOpts.bots==='pers4'), so joined devices of a group mock run the same seeded personality; one pick per slot is still enforced by the slot key + verify. *//* s26mo4: personality bots (new mocks only: mockopts v4). Queue first as before (bots have none), then the bot's personality inside the guard window */
    if(((o&&o.v===4)||(st.meta&&st.meta.mockOpts&&st.meta.mockOpts.bots==='pers4'))&&(!o||owner!==o.me)&&window.FBNBots&&st.meta&&st.meta.over&&st.meta.over[owner]&&st.meta.over[owner].bot){const q=(st.queues&&st.queues[owner])||[];const taken=F.takenMap(st);
      if(!q.some(t=>!taken[t]&&poolArr.indexOf(String(t))>=0)){const avail=poolArr.filter(t=>!taken[t]);if(avail.length){const mo=st.meta.mockOpts||{};
        const key=FBNBots.forBot(l,owner,mo.dealt);const r0=rng?Math.floor(rng()*4294967296):0;const N=(st.order&&st.order.length)||F.MANAGERS;
        const c=FBNBots.choose({key,avail,meta:(window.TEAMS_DATA||{}).meta||{},round:Math.floor(st.picks.length/N)+1,mine:st.picks.filter(p=>p.owner===owner).map(p=>p.tid),rng:F.mulberry((F.hash32('mockbot4:'+l+':'+owner)^r0)>>>0),mockId:l,mid:owner});
        if(c)return{tid:c.tid,from:'bot:'+key}}}}}}catch(e){}/* s26c14: auto-pick for people ranks by KenPom (room.js); bots without a personality use the 50/50 blended rank (F.blendRank) */try{if(st.meta&&st.meta.over&&st.meta.over[owner]&&st.meta.over[owner].bot){const MT=(window.TEAMS_DATA||{}).meta||{};const BR=F.blendRank(MT,0.5);prank=t=>BR[t]||0}}catch(e){}return orig(st,owner,poolArr,rng,prank)}}
/* s26mo4: NET ranks for the Value hunter, fetched only on the room page of a mock this device created (real leagues never have a mockopts key) */
try{const l=UI.qs().get('l');const o=l&&F.parseJ(UI.lsGet('mockopts.'+l)||'');if(((o&&o.v===4)||(l&&UI.isMockId&&UI.isMockId(l)))&&window.FBNBots&&!document.getElementById('mockapp'))fetch('data/net.json').then(r=>r.json()).then(FBNBots.setNet).catch(()=>{})}catch(e){}
/* ===================== mock.html page ===================== */
const app=document.getElementById('mockapp');if(!app)return;
const {esc,$}=UI;const P=UI.qs();const from=F.parseCode(P.get('from')||'');
let parentMeta=null,parentMe=null,mode='solo',clock=null,busy=false,loadErr='';
/* s26mo options; a query string can preset them: ?seat=1-8|any&order=snake|straight&clock=30|60|90|120|180|0&bots=best|random */
/* s26mo4: Your name / Team name sit behind a 'Customize' link when this is true (NCAA confirmed: on). false = the fields always show (the s26c8a look). */
const MOCK_CUSTOMIZE_LINK=true;let custOpen=false;
let seat=0,otype=null;{const q=+P.get('seat');if(q>=1&&q<=8)seat=q;const o=P.get('order');if(o==='snake')otype='snake';if(o==='straight'||o==='linear')otype='linear';const c=P.get('clock');if(c!=null&&c!==''&&F.CLOCKS.indexOf(+c)>=0)clock=+c}
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
  <div class="mopts" id="mockopts"><div class="grow mopt"><label class="f" for="m_seat">Your draft seat</label><select id="m_seat" class="msel"${mode==='solo'?'':' disabled'}>${[[0,'Any (random)']].concat([1,2,3,4,5,6,7,8].map(i=>[i,'Seat '+i])).map(c=>`<option value="${esc(c[0])}"${String(mode==='solo'?seat:0)===String(c[0])?' selected':''}>${esc(c[1])}</option>`).join('')}</select></div><div class="grow mopt"><label class="f" for="m_order">Order</label><select id="m_order" class="msel">${[['snake','Snake (reverses each round)'],['linear','Straight (1-8 every round)']].map(c=>`<option value="${esc(c[0])}"${String(otype)===String(c[0])?' selected':''}>${esc(c[1])}</option>`).join('')}</select></div><div class="grow mopt"><label class="f" for="m_clock">Pick clock for you</label><select id="m_clock" class="msel">${CL.map(c=>`<option value="${esc(c[0])}"${String(clock)===String(c[0])?' selected':''}>${esc(c[1])}</option>`).join('')}</select></div></div><div class="small mut" id="botnote">Each bot gets its own draft style, dealt at random: ${esc(FBNBots.PERSONALITIES.map(p=>p.label).join(', '))}.</div>${mode==='solo'?'':'<div class="small mut">With others, seats are set by the wheel spin in the room.</div>'}
  ${MOCK_CUSTOMIZE_LINK&&!custOpen?'<button type="button" class="linkbtn" data-a="cust" id="mockcust" aria-expanded="false" style="margin-top:10px;background:none;border:0;padding:6px 0;color:var(--acc);text-decoration:underline;cursor:pointer;font:inherit;min-height:44px">Customize your name and team</button>':''}<div class="row nw" id="mocknames" style="margin-top:12px;align-items:flex-start${MOCK_CUSTOMIZE_LINK&&!custOpen?';display:none':''}"${MOCK_CUSTOMIZE_LINK&&!custOpen?' hidden':''}><div class="grow"><label class="f" for="m_name">Your name</label><input type="text" id="m_name" maxlength="30" autocomplete="off" value="${esc(nm||(parentMe?parentMe.name:(UI.lsGet('mockname')||'')))}" placeholder="You"></div>
  <div class="grow"><label class="f" for="m_team">Team name</label><input type="text" id="m_team" maxlength="30" autocomplete="off" value="${esc(tm||(parentMe?parentMe.team:(UI.lsGet('mockteam')||'')))}" placeholder="My practice team"></div></div>
  <div class="err" id="mockerr" role="alert"></div>
  <button class="btn pri block" data-a="go" id="startmock" style="margin-top:12px">${mode==='solo'?'Start mock draft':'Create mock and invite'}</button>
  <div class="hint" style="margin:8px 0 12px">Grades at the end compare you with the bots${mode==='group'?' and the people who joined':''}. The device keeps your last ${UI.MOCK_KEEP} mocks.</div>
  ${recentHTML()}<a class="btn block" id="mockback" href="${esc(from?UI.roomHref(from):UI.pageUrl('index.html'))}">${esc(from?UI.goLeagueLabel(parentMeta&&parentMeta.name)/* DR2 */:'Back to home')}</a>`+UI.buildTag();try{UI.dr2NewTab('#mockback')}catch(e){}/* DR2 */}
const ACT={mode:el=>{read();mode=el.dataset.v==='group'?'group':'solo';render()},clock:el=>{read();clock=+el.dataset.v;render()},go:()=>go(),cust:()=>{read();custOpen=true;render();const a=$('m_name');if(a)a.focus()}};
let nm='',tm='';function read(){const a=$('m_name'),b=$('m_team');if(a)nm=a.value;if(b)tm=b.value;const v=id=>($(id)||{}).value;if($('m_seat')&&!$('m_seat').disabled)seat=+v('m_seat')||0;if(v('m_order'))otype=v('m_order');if(v('m_clock')!=null)clock=+v('m_clock')}
async function go(){if(busy)return;read();busy=true;const b=$('startmock');b.disabled=true;b.textContent='Setting up…';
  try{if(F.clean(nm))UI.lsSet('mockname',F.clean(nm).slice(0,30));if(F.clean(tm))UI.lsSet('mockteam',F.clean(tm).slice(0,30));
    const r=await create({parent:parentMeta?from:null,parentName:parentMeta?parentMeta.name:'',settings:parentMeta?parentMeta.settings:null,solo:mode==='solo',mgrName:nm,teamName:tm,clockSecs:clock,type:otype,seat:mode==='solo'?seat:0});
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
