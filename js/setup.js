/* Commissioner setup wizard: one question per screen, progress bar, Back/Next, summary, then create. */
(function(){
const {esc,$}=UI;const F=FBN;const TZ=UI.tz();
const POOL=UI.loadTeams().POOL.length;
const SS='fbn.wizard';
const blank=()=>({name:'',mgrName:'',teamName:'',managers:F.MANAGERS,type:'snake',whenMode:'now',startAt:null,startMode:'manual',orderMode:'random',clockSecs:60,rounds:8,autoPick:true,pass:'',tz:TZ});
let W=blank(),step='you',fromConfirm=false,errors={},created=null,busy=false;
try{const s=JSON.parse(sessionStorage.getItem(SS)||'null');if(s&&s.W){W=Object.assign(blank(),s.W);W.pass='';W.managers=F.MANAGERS;step=F.WIZARD.indexOf(s.step)>=0?s.step:'you'}}catch(e){}
const save=()=>{try{const w=Object.assign({},W);delete w.pass;sessionStorage.setItem(SS,JSON.stringify({W:w,step}))}catch(e){}};
const steps=()=>F.stepsFor(W);
const settingsOf=()=>({name:W.name,mgrName:W.mgrName,teamName:W.teamName,managers:W.managers,rounds:W.rounds,type:W.type,startAt:W.whenMode==='pick'?W.startAt:null,startMode:W.whenMode==='pick'?W.startMode:'manual',orderMode:W.orderMode,clockSecs:W.clockSecs,autoPick:W.autoPick,pass:W.pass,tz:TZ});
const vopts=()=>({poolSize:POOL,now:Date.now()});
const maxR=()=>F.maxRounds(W.managers,POOL);
function progress(){const st=steps();const i=st.indexOf(step);const pct=Math.round((i+1)/st.length*100);
  return `<div class="prog"><div class="bar"><i style="width:${pct}%"></i></div><div class="lbl"><span id="stepno">Step ${i+1} of ${st.length}</span><span>${step==='confirm'?'Almost done':''}</span></div></div>`}
function nav(next){const st=steps();const i=st.indexOf(step);const back=i>0||fromConfirm;
  return `<div class="wnav">${i>0?'<button class="btn" data-a="back" id="back">Back</button>':'<a class="btn" href="index.html" id="back">Cancel</a>'}<button class="btn pri" data-a="next" id="next">${next||(fromConfirm?'Done':'Next')}</button></div>`}
const err=k=>`<div class="err" id="err" role="alert">${esc(errors[k]||'')}</div>`;
function opt(group,val,cur,title,help){return `<button type="button" class="opt${cur===val?' on':''}" data-a="pick" data-g="${group}" data-v="${val}" aria-pressed="${cur===val}"><b>${title}</b><span>${help}</span></button>`}
function exampleBoard(type){const g=F.boardGrid(8,3,type);return `<table class="board-ex" aria-label="Example with 8 managers"><tr><th></th>${[1,2,3,4,5,6,7,8].map(i=>'<th>M'+i+'</th>').join('')}</tr>${g.map((r,ri)=>'<tr><th>R'+(ri+1)+'</th>'+r.map(n=>'<td>'+n+'</td>').join('')+'</tr>').join('')}</table>`}
function tzBlock(){if(W.startAt==null)return '';const l=F.startsLine(W.startAt,TZ,TZ);return `<div class="tzline" id="tzline"><b>${esc(l.you)}</b><br><span class="mut">${esc(l.utc)} · stored as UTC. Every manager sees the time in their own zone. Your zone: ${esc(F.tzCity(TZ))}.</span></div>`}
const VIEWS={
 you(){return `<h1 class="q">Name your league</h1><p class="sub">Everyone will see these. You can change them later.</p>
  <label class="f" for="f_name">League name</label><input type="text" id="f_name" maxlength="40" autocomplete="off" placeholder="Friday Night Hoops" value="${esc(W.name)}">${err('name')}
  <div class="row nw" style="margin-top:12px;align-items:flex-start"><div class="grow"><label class="f" for="f_mgr">Your name</label><input type="text" id="f_mgr" maxlength="30" autocomplete="off" value="${esc(W.mgrName)}">${err('mgrName')}</div>
  <div class="grow"><label class="f" for="f_team">Your team name</label><input type="text" id="f_team" maxlength="30" autocomplete="off" value="${esc(W.teamName)}">${err('teamName')}</div></div>
  <p class="hint">You are the commissioner and also manager #1. <b id="fixed8">Every league has 8 managers</b>: you and 7 more. You can add a team photo after the league is created.</p>`},
 type(){return `<h1 class="q">Draft style</h1><p class="sub">The order managers pick in, round after round.</p><div class="opts">
  ${opt('type','snake',W.type,'Snake (recommended)','The order flips every round. Pick 1st in round 1, and you pick last in round 2.')}
  ${opt('type','linear',W.type,'Linear','The same order every round. Pick 1st each time.')}</div>
  <div class="small mut">Example with 8 managers, pick numbers by round:</div><div id="ex">${exampleBoard(W.type)}</div>${err('type')}`},
 when(){return `<h1 class="q">Draft day and time</h1><p class="sub">Pick a time when most people are free, or skip the date and start whenever everyone is in.</p><div class="opts">
  ${opt('whenMode','pick',W.whenMode,'Pick a date and time','Everyone sees the time in their own time zone.')}
  ${opt('whenMode','now',W.whenMode,'Start now — I’ll press Start','No set time. The room opens right away and nothing happens until you tap Start.')}</div>
  ${W.whenMode==='pick'?`<label class="f" for="f_when">Draft date and time (your time, ${esc(F.tzCity(TZ))})</label><input type="datetime-local" id="f_when" value="${W.startAt!=null?F.localInputValue(W.startAt,TZ):''}">${tzBlock()}${err('startAt')}`:''}`},
 start(){return `<h1 class="q">How should the draft start?</h1><p class="sub">At the set time, the room can wait for you or start itself.</p><div class="opts">
  ${opt('startMode','manual',W.startMode,'I’ll start it when everyone is here','Nothing happens until you tap Start. The room is open before the time so people can join.')}
  ${opt('startMode','auto',W.startMode,'Start on its own at the set time','Anyone who is not there is auto-picked, so the draft keeps moving.')}</div>${err('startMode')}`},
 order(){return `<h1 class="q">Who picks first?</h1><p class="sub">You can change the order any time before the draft starts.</p><div class="opts">
  ${opt('orderMode','random',W.orderMode,'Random (recommended)','We shuffle the order when the draft starts, so late joiners are included. You can also spin a wheel for it in the lobby.')}
  ${opt('orderMode','manual',W.orderMode,'I’ll set the exact order','Drag managers into place (or use the arrows) once people have joined. A Randomize button is always there.')}</div>${err('orderMode')}`},
 clock(){const opts=[[30,'30 sec'],[60,'60 sec'],[90,'90 sec'],[120,'2 min'],[180,'3 min'],[0,'No clock']];
  return `<h1 class="q">Time to pick</h1><p class="sub">How long each manager has per turn. 60 seconds works for most groups; choose longer if people are new.</p>
  <div class="chips" role="group" aria-label="Pick clock">${opts.map(o=>`<button type="button" class="chipb${W.clockSecs===o[0]?' on':''}" data-a="pick" data-g="clockSecs" data-v="${o[0]}" aria-pressed="${W.clockSecs===o[0]}">${o[1]}</button>`).join('')}</div>${err('clockSecs')}`},
 rounds(){const mx=maxR();if(W.rounds>mx)W.rounds=mx;return `<h1 class="q">Teams per manager</h1><p class="sub">Also the number of rounds. Everyone ends with the same number of teams.</p>
  <div class="stepper"><button data-a="dec" data-g="rounds" aria-label="One fewer">−</button><output id="val" aria-live="polite">${W.rounds}</output><button data-a="inc" data-g="rounds" aria-label="One more">+</button></div>
  <p class="hint" style="text-align:center" id="rline">${W.managers} managers × ${W.rounds} rounds = <b>${W.managers*W.rounds}</b> teams drafted (${POOL} teams available, max ${mx} rounds for ${W.managers} managers).</p>${err('rounds')}
  <p class="hint">One draft covers both the full season and the tournament.</p>`},
 missed(){return `<h1 class="q">If someone runs out of time</h1><p class="sub">What should happen when the pick clock reaches zero?</p><div class="opts">
  ${opt('autoPick','true',String(W.autoPick),'Auto-pick for them (recommended)','We pick from their queue first, then the best-ranked team left.')}
  ${opt('autoPick','false',String(W.autoPick),'Wait for them','The clock goes red but nothing is picked. You can pause, or pick for them.')}</div>${err('autoPick')}`},
 confirm(){const s=settingsOf();const v=F.validateSettings(s,vopts());const when=s.startAt!=null?F.startsLine(s.startAt,TZ,TZ):null;
  const row=(k,val,st)=>`<div class="sumrow"><div class="grow"><div class="k">${k}</div><div class="v">${val}</div></div>${st?`<button class="ed" data-a="edit" data-s="${st}" aria-label="Edit ${k}">Edit</button>`:''}</div>`;
  const clk=s.clockSecs?(s.clockSecs>=120?s.clockSecs/60+' min':s.clockSecs+' sec'):'No clock';
  return `<h1 class="q">Check it over</h1><p class="sub">Nothing is created until you tap the button.</p><div class="card" id="summary" style="padding:4px 14px">
   ${row('League',esc(s.name)+'<div class="mut small" style="font-weight:600">You: '+esc(s.mgrName)+' · '+esc(s.teamName)+'</div>','you')}
   ${row('Managers','8 managers <span class="mut small" style="font-weight:600">(fixed, you and 7 more)</span>','')}${row('Draft style',s.type==='snake'?'Snake':'Linear','type')}
   ${row('Draft time',when?esc(when.you)+'<div class="mut small" style="font-weight:600">'+esc(when.utc)+' · others see their own time</div>':'Start now — you press Start','when')}
   ${when?row('Start',s.startMode==='auto'?'Starts on its own':'You press Start','start'):''}
   ${row('Who picks first',s.orderMode==='random'?'Random at the start':'You set the order','order')}${row('Pick clock',clk,'clock')}
   ${row('Teams per manager',s.rounds+' ('+s.managers*s.rounds+' picks in total)','rounds')}${row('If time runs out',s.autoPick?'Auto-pick for them':'Wait for them','missed')}</div>
  ${v.ok?'':'<div class="err" id="err">'+esc(Object.values(v.errors)[0])+'</div>'}<div id="createerr" class="err" role="alert"></div>`}
};
function render(){const app=$('app');$('top').innerHTML=UI.header({sub:'Create a league',right:''});
  if(created){app.innerHTML=linksView();return}
  const body=VIEWS[step]();
  app.innerHTML=progress()+'<div id="body">'+body+'</div>'+(step==='confirm'?`<div class="wnav"><button class="btn" data-a="back" id="back">Back</button><button class="btn pri" data-a="create" id="create">Create league</button></div>`:nav())+UI.buildTag();
  save();const first=app.querySelector('input:not([type=password])')||app.querySelector('input');if(first&&step!=='when'&&step!=='confirm'&&matchMedia('(pointer:fine)').matches)first.focus()}
function readInputs(){const g=id=>{const e=$(id);return e?e.value:null};
  if(step==='you'){W.name=g('f_name')||'';W.mgrName=g('f_mgr')||'';W.teamName=g('f_team')||''}
  if(step==='when'&&$('f_when')){const v=g('f_when');W.startAt=v?F.parseLocalInput(v,TZ):null}
}
function go(to){step=to;errors={};render();window.scrollTo(0,0)}
function next(){readInputs();if(step==='when'&&W.whenMode==='now'){W.startAt=null;W.startMode='manual'}
  const v=F.validateStep(step,settingsOf(),vopts());if(step==='when'&&W.whenMode==='pick'&&W.startAt==null){v.ok=false;v.errors=Object.assign({},v.errors,{startAt:'Pick a date and time, or choose “Start now”.'})}
  if(!v.ok){errors=v.errors;render();const e=$('err');if(e)e.scrollIntoView({block:'center'});return}
  if(fromConfirm){fromConfirm=false;return go('confirm')}
  const st=steps();go(st[Math.min(st.length-1,st.indexOf(step)+1)])}
function back(){readInputs();const st=steps();if(fromConfirm){fromConfirm=false;return go('confirm')}go(st[Math.max(0,st.indexOf(step)-1)])}
const ACT={
 next,back,
 pick(el){readInputs();const g=el.dataset.g;let v=el.dataset.v;if(g==='clockSecs')v=+v;if(g==='autoPick')v=v==='true';W[g]=v;
  if(g==='whenMode'){if(v==='now'){W.startAt=null;W.startMode='manual'}else if(W.startAt==null){const d=new Date(Date.now()+26*3600e3);const p=F.localInputValue(d.getTime(),TZ).slice(0,11)+'20:00';W.startAt=F.parseLocalInput(p,TZ)}}
  errors={};render()},
 inc(el){readInputs();const g=el.dataset.g;W[g]=Math.min(maxR(),W[g]+1);bump(g)},
 dec(el){readInputs();const g=el.dataset.g;W[g]=Math.max(F.LIMITS.roundsMin,W[g]-1);bump(g)},
 edit(el){fromConfirm=true;go(el.dataset.s)},
 create:doCreate,
 copy(el){UI.copy(el.dataset.u,'Copied')},share:shareLink,copyreminder(){UI.copy(reminder(),'Reminder message copied')},sharereminder(){UI.share({title:W.name,text:reminder()})},
 qr(){const u=created.links.invite;UI.openSheet(`<h2>Invite QR</h2><div style="text-align:center;margin:10px 0"><div class="qr">${UI.qrSvg(u)}</div></div><div class="small mut" style="text-align:center">Scan with a phone camera to open the join page.</div><button class="btn block" style="margin-top:12px" data-a="sheetbg">Close</button>`)},
 noop(){}
};
function bump(g){$('val').textContent=W[g];const rl=$('rline');if(rl)rl.innerHTML=`${W.managers} managers × ${W.rounds} rounds = <b>${W.managers*W.rounds}</b> teams drafted (${POOL} teams available, max ${maxR()} rounds for ${W.managers} managers).`;save()}
function shareLink(el){const k=el.dataset.k;UI.share({title:W.name,text:k==='invite'?'Join '+W.name+' (draft invite)':W.name,url:created.links[k]})}
function reminder(){return F.reminderText({name:created.settings.name,startAt:created.settings.startAt,timeLink:created.links.time,inviteLink:created.links.invite,rounds:created.settings.rounds,type:created.settings.type,clockSecs:created.settings.clockSecs})}
document.addEventListener('input',e=>{if(e.target.id==='f_when'){const v=e.target.value;W.startAt=v?F.parseLocalInput(v,TZ):null;const t=$('tzline');const html=W.startAt!=null?tzBlock():'';if(t){if(html)t.outerHTML=html;else t.remove()}else if(html)e.target.insertAdjacentHTML('afterend',html);save()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&step!=='confirm'){e.preventDefault();next()}});
UI.bind(ACT);
/* ---------- create ---------- */
async function doCreate(){if(busy)return;readInputs();const s=settingsOf();const v=F.validateSettings(s,vopts());const ce=$('createerr');
  if(!v.ok){ce.textContent=Object.values(v.errors)[0];return}
  busy=true;$('create').disabled=true;$('create').textContent='Creating…';
  try{const K0=F.makeLeagueId();const id=K0;const Kz=F.Keys(id);const mid=F.hexId(12),secret=F.newSecret();
    const ns=F.normalizeSettings(s);ns.tz=TZ;const meta=F.defaultMeta(id,Object.assign({name:s.name},ns),mid);meta.name=F.clean(s.name);meta.settings=ns;
    const cmSecret=F.newSecret();const pass=await F.makePass(cmSecret);meta.pass=pass;
    let ok=false;for(let a=0;a<3&&!ok;a++){await Store.set(Kz.meta,meta);await UI.sleep(300);const chk=F.parseJ(await Store.get(Kz.meta));ok=!!(chk&&chk.id===id&&chk.pass&&chk.pass.hash===pass.hash)}
    if(!ok)throw new Error('The league could not be saved. Check your connection and try again.');
    const sh=await F.mgrHash(mid,secret);const io={read:k=>Store.get(k),write:(k,o)=>Store.set(k,o),sleep:UI.sleep,url:(i,g)=>Kz.slot(i,g)};
    const j=await F.joinLeague(io,{meta:F.normalizeMeta(meta),mid,name:s.mgrName,team:s.teamName,sh,w:'cm'});
    if(!j.ok)throw new Error(j.msg||'Could not claim your manager slot.');
    await Store.set(Kz.mgr(mid),F.makeProfile({mid,name:s.mgrName,team:s.teamName,pv:0}));
    UI.setMe(id,{mid,k:secret});UI.lsSet('cm.'+id,cmSecret);UI.rememberLeague(id,meta.name,'commissioner');sessionStorage.removeItem(SS);
    const L={invite:UI.pageUrl('join.html',{l:id}),room:UI.pageUrl('room.html',{l:id}),watch:UI.pageUrl('room.html',{l:id,watch:1}),mine:UI.pageUrl('room.html',{l:id},{as:mid,k:secret}),commish:UI.pageUrl('room.html',{l:id},{cm:cmSecret}),
      time:UI.pageUrl('time.html',{t:ns.startAt||'',n:meta.name})};
    created={id,mid,secret,cmSecret,settings:Object.assign({name:meta.name},ns),links:L};render();window.scrollTo(0,0)
  }catch(e){ce.textContent=String(e.message||e);$('create').disabled=false;$('create').textContent='Create league'}finally{busy=false}}
/* s23 (item 8): a mailto: draft with every link (no address is asked for or stored) */
function mailLinks(c){const L=c.links,nm=c.settings.name||'Draft';const body=['Links for '+nm+' (league code '+F.formatCode(c.id)+')','','Invite link (share): '+L.invite,'Draft room link (share): '+L.room,'Spectator link (read-only): '+L.watch,'','Your manager link (PRIVATE, do not share): '+L.mine,'Commissioner link (PRIVATE, keep it to yourself): '+L.commish,'','The commissioner link cannot be recovered if every copy is lost.'].join('\r\n');
  return 'mailto:?subject='+encodeURIComponent(nm+' draft links')+'&body='+encodeURIComponent(body)}
function linksView(){const c=created,L=c.links,s=c.settings;const when=s.startAt!=null?F.startsLine(s.startAt,TZ,TZ):null;
  const lk=(k,title,tag,why,extra)=>`<div class="lnk" id="lnk_${k}"><h3>${title} ${tag}</h3><div class="why">${why}</div><a class="url" href="${esc(L[k])}" target="_blank" rel="noopener">${esc(L[k].indexOf('#')>0?L[k].split('#')[0]+'#••••••••••••••••':L[k])}</a><div class="row"><button class="btn sm" data-a="copy" data-u="${esc(L[k])}">Copy</button><button class="btn sm" data-a="share" data-k="${k}">Share</button>${extra||''}</div></div>`;
  return `<div class="prog"><div class="bar"><i style="width:100%"></i></div><div class="lbl"><span>League created</span><span></span></div></div>
  <h1 class="q" id="made">${esc(s.name)} is ready</h1>
  <div class="card"><div class="k mut small">League code</div><div class="code" id="code">${esc(F.formatCode(c.id))}</div><div class="hint">Managers can also type this code on the home page. Keep the code private: anyone with it can read the league.</div>
  ${when?`<div class="hint" style="margin-top:8px"><b style="color:var(--tx)">${esc(when.you)}</b> · ${esc(when.utc)}</div>`:''}</div>
  <div class="note" id="saveNote"><b>Save these links now.</b> They are stored on this phone only. The commissioner link cannot be recovered: if every copy is lost, nobody can get the commissioner tools back.</div>
  <a class="btn pri block" id="emailme" href="${esc(mailLinks(c))}">Email me these links</a><div class="hint" style="margin:6px 0 12px">Opens your email app with every link filled in. Send it to yourself. Nothing is stored or sent by this site.</div>
  <div class="card">${lk('invite','Invite link','<span class="tag ok">SHARE</span>','Send this to your managers. It opens the join page with the code filled in.','<button class="btn sm" data-a="qr">Show QR</button>')}
  ${lk('room','Draft room link','<span class="tag ok">SHARE</span>','Where everyone drafts. People who already joined open this one.')}
  ${lk('watch','Spectator link','<span class="tag mut">READ-ONLY</span>','Friends and family can watch live. They cannot pick or chat.')}
  ${lk('mine','Your manager link','<span class="tag pri">PRIVATE</span>','Opens your team on another phone. Do not share it.')}
  ${lk('commish','Commissioner link','<span class="tag pri">PRIVATE</span>','Gives the commissioner tools (start, pause, undo, order) on the phone that opens it. Keep it to yourself: anyone who has it controls the draft. The secret sits after the # so it is never sent to a server.')}</div>
  <div class="card"><h3>Invite reminder</h3><div class="hint" style="margin:0 0 8px">A ready-to-send message for your group chat: league name, draft time in UTC, a link that shows each person’s local time, and the invite link.</div>
   <textarea id="rem" readonly rows="6" style="font-size:16px">${esc(reminder())}</textarea><div class="row" style="margin-top:8px"><button class="btn sm pri" data-a="copyreminder">Copy reminder message</button>${UI.canShare()?'<button class="btn sm" data-a="sharereminder">Share…</button>':''}</div></div>
  <div class="row" style="margin:6px 0 14px"><a class="btn pri grow" id="toRoom" href="${esc(L.mine)}">Open my league</a><a class="btn grow" id="toPhoto" href="${esc(UI.pageUrl('join.html',{l:c.id,edit:1}))}">Add team photo</a></div>${UI.buildTag()}`}
UI.registerSW();render();
})();
