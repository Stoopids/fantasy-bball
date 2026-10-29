/* Join flow: invite link -> team profile (name, team, photo) -> claims a manager slot. No accounts. */
(function(){
const {esc,$}=UI;const F=FBN;const TZ=UI.tz();
const P=UI.qs();let id=F.parseCode(P.get('l')||P.get('c')||'');const editMode=P.get('edit')==='1';
let meta=null,claims={},profs={},me=null,busy=false;
const form={name:'',team:'',emoji:'',photo:'',photoInfo:'',pv:0};
const crop={img:null,zoom:1,px:0,py:0,drag:null};
const top=right=>{$('top').innerHTML=UI.header({sub:'Join a league',right:right||''})};
function shell(html){top();$('app').innerHTML=html+UI.buildTag()}
function codeForm(msg){shell(`<h1>Join a league</h1><p class="sub">Type the league code you were sent, or use the invite link.</p>
 <div class="card"><label class="f" for="code">League code</label><input type="text" id="code" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX" style="font:800 20px ui-monospace,Menlo,monospace;letter-spacing:.05em;text-transform:uppercase">
 <div class="err" id="cerr" role="alert">${esc(msg||'')}</div><button class="btn pri block" data-a="gocode" style="margin-top:8px">Continue</button></div>
 <div class="card"><div class="small mut">Starting your own league instead?</div><a class="btn block" id="newleague" href="setup.html" style="margin-top:8px">Create a new league</a></div>`)}
async function loadAll(){const K=F.Keys(id);const raw=await Store.get(K.meta);const d=F.parseJ(raw);if(!F.exists(d))return false;meta=F.normalizeMeta(d);
  await Promise.all(Array.from({length:meta.settings.managers},(_,k)=>k+1).map(async i=>{claims[i]=F.parseClaim(await Store.get(K.slot(i,meta.slotGen[i]||0)).catch(()=>''))}));return true}
const joined=()=>F.joinedList(meta,claims);
function leagueCard(){const s=meta.settings;const j=joined();let when='';if(s.startAt!=null){const l=F.startsLine(s.startAt,TZ,s.tz);when=`<div style="margin-top:6px"><b style="color:var(--acc)">${esc(l.you)}</b><div class="small mut">${esc(l.utc)}${l.commish?' · '+esc(l.commish):''}</div></div>`}else when='<div class="small mut" style="margin-top:6px">No fixed time: the commissioner starts the draft when everyone is in.</div>';
  return `<div class="card" id="lcard"><div class="small mut">You are invited to</div><h2 style="margin:2px 0 2px">${esc(meta.name)}</h2><div class="small mut">${j.length} of ${s.managers} managers joined · ${s.rounds} teams each · ${s.type==='snake'?'snake':'linear'} draft · ${s.clockSecs?s.clockSecs+' sec per pick':'no pick clock'}</div>${when}</div>`}
function view(){
  const j=joined();const mine=me&&j.find(c=>c.mid===me.mid);
  if(mine&&!editMode)return done(mine,false);
  if(!mine&&meta.status!=='lobby')return closedView();
  if(!mine&&F.freeSlots(meta,claims).length===0)return fullView();
  formView(mine)}
function closedView(){shell(`${leagueCard()}<div class="card"><h2>The draft has started</h2><p class="small mut">New managers cannot join once the draft is under way. You can still watch it live as a spectator.</p>
  <a class="btn pri block" id="watch" href="${esc(UI.pageUrl('room.html',{l:id,watch:1}))}">Watch as a spectator</a><a class="btn block" style="margin-top:8px" id="already" href="${esc(UI.pageUrl('room.html',{l:id}))}">I’m already in this league</a></div>`)}
function fullView(){shell(`${leagueCard()}<div class="card"><h2>This league is full</h2><p class="small mut">All ${meta.settings.managers} spots are taken. Ask the commissioner to free one up, or watch as a spectator.</p>
  <a class="btn pri block" id="watch" href="${esc(UI.pageUrl('room.html',{l:id,watch:1}))}">Watch as a spectator</a><a class="btn block" style="margin-top:8px" id="already" href="${esc(UI.pageUrl('room.html',{l:id}))}">I’m already in this league</a></div>`)}
function done(c,fresh,note){const PB=meta.mock?UI.practiceBanner('This is a mock draft, not a real league.'):'';const L=UI.pageUrl('room.html',{l:id}),own=me&&me.k?UI.pageUrl('room.html',{l:id},{as:c.mid,k:me.k}):'';
  shell(`${PB}${leagueCard()}<div class="card" id="joined"><div class="row nw">${UI.avatar(Object.assign({},c,{photo:form.photo||(profs[c.mid]||{}).photo,emoji:form.emoji||(profs[c.mid]||{}).emoji}),52)}<div class="grow"><h2 style="margin:0">${fresh?'You’re in!':'You’re already in'}</h2><div class="small mut">${esc(c.name)} · ${esc(c.team)}</div></div></div>
  ${note?`<div class="note">${esc(note)}</div>`:''}<a class="btn pri block" id="toRoom" href="${esc(L)}" style="margin-top:12px">Open the draft room</a>
  <button class="btn block" style="margin-top:8px" data-a="editme">Edit my profile</button></div>
  ${meta.mock?'':(meta.status==='lobby'?`<div class="card" id="practicecard"><h3>Practice this draft</h3><div class="small mut">Run a mock draft with this league's settings against bots, or invite leaguemates to practice together. It never changes this league.</div><a class="btn block" style="margin-top:8px" id="practicethis" href="${esc(UI.pageUrl('mock.html',{from:id}))}">Practice this draft</a></div>`:'')}
  ${own?`<div class="card"><h3>Your private manager link</h3><div class="hint" style="margin:0 0 6px">Open this on another phone to come back as ${esc(c.name)}. Anyone who has it can act as you — don’t share it.</div><div class="urlbox">${esc(own.split('#')[0])}#••••••••••••••••</div><div class="row"><button class="btn sm" data-a="copy" data-u="${esc(own)}">Copy my link</button><button class="btn sm" data-a="share" data-u="${esc(own)}">Share</button></div></div>`:''}
  <div class="note">There are no accounts. Your phone remembers who you are. Anyone with the league link can read the league, so don’t put private details in your profile.</div>`)}
function emojiRow(){return `<div class="emojis" role="group" aria-label="Emoji avatar">${F.EMOJIS.map(e=>`<button type="button" data-a="emoji" data-e="${e}" class="${form.emoji===e?'on':''}" aria-label="${e}">${e}</button>`).join('')}</div>`}
function formView(mine){const edit=!!mine;const av=F.avatarSpec(form);
  shell(`${leagueCard()}<div class="card" id="jform"><h2 style="margin:0 0 10px">${edit?'Edit your profile':'Your team'}</h2>
  <div class="stack">
   <div><label class="f" for="f_team">Team name</label><input type="text" id="f_team" maxlength="30" autocomplete="off" placeholder="Baseline Bandits" value="${esc(form.team)}"></div>
   <div><label class="f" for="f_name">Your name</label><input type="text" id="f_name" maxlength="30" autocomplete="off" placeholder="First name or nickname" value="${esc(form.name)}"></div>
   <div><label class="f">Team photo <span class="mut" style="font-weight:600">(optional)</span></label>
    <div class="photo-prev"><div class="crop" id="cropbox" aria-label="Photo crop preview"><canvas id="cv" width="264" height="264"></canvas></div>
     <div class="grow"><label class="btn block" for="f_photo" id="pickphoto">${form.photo||crop.img?'Choose another':'Choose a photo'}</label><input type="file" id="f_photo" accept="image/*" class="hide">
      <div class="hint" id="pinfo">${esc(form.photoInfo||'Square crop. Resized on your phone to a small picture.')}</div><div class="err" id="photoerr" role="alert"></div>
      <div id="zoomrow" class="${crop.img?'':'hide'}"><label class="small mut" for="zoom">Zoom</label><input type="range" id="zoom" min="1" max="3" step="0.02" value="${crop.zoom}" style="width:100%"></div>
      ${form.photo?'<button type="button" class="link" data-a="rmphoto" style="margin-top:4px">Remove photo</button>':''}</div></div>
    <div class="small mut" style="margin-top:8px">No photo? Pick an emoji, or we use your initial:</div>${emojiRow()}</div>
  </div><div class="hint" id="privnote" style="margin-top:8px">Your name, team name and photo are saved in a shared online store. Anyone who has the league link can read them. Use a photo you are happy for the group to see.</div><div class="err" id="err" role="alert"></div>
  <button class="btn pri block" id="joinbtn" data-a="${edit?'saveme':'join'}" style="margin-top:8px">${edit?'Save changes':'Join league'}</button></div>`);drawCrop()}
/* ---------- photo: crop to square, resize, compress under the cap ---------- */
function drawCrop(){const cv=$('cv');if(!cv)return;const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);
  if(crop.img){const w=crop.img.width,h=crop.img.height;const r=F.cropRect(w,h,crop.zoom,crop.px,crop.py);x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);x.drawImage(crop.img,r.sx,r.sy,r.side,r.side,0,0,cv.width,cv.height);return}
  if(form.photo){const im=new Image();im.onload=()=>{x.drawImage(im,0,0,cv.width,cv.height)};im.src=form.photo;return}
  const a=F.avatarSpec(form);x.fillStyle=a.color;x.fillRect(0,0,cv.width,cv.height);x.fillStyle='#111';x.font='900 120px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(a.text||'?',cv.width/2,cv.height/2+6)}
async function loadImage(file){if(window.createImageBitmap){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){}}
  return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>rej(new Error('That file is not an image we can read.'));im.src=u})}
const webpOk=(()=>{try{return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp')===0}catch(e){return false}})();
function encoder(){return async(edge,q)=>{const c=document.createElement('canvas');c.width=c.height=edge;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,edge,edge);
  const r=F.cropRect(crop.img.width,crop.img.height,crop.zoom,crop.px,crop.py);x.drawImage(crop.img,r.sx,r.sy,r.side,r.side,0,0,edge,edge);return c.toDataURL(webpOk?'image/webp':'image/jpeg',q)}}
let encT=null;
async function recompress(){if(!crop.img)return;const res=await F.fitPhoto(encoder());
  if(!res){form.photo='';form.photoInfo='Could not shrink that photo enough. Try a different one.';$('pinfo')&&($('pinfo').textContent=form.photoInfo);return}
  form.photo=res.dataUrl;form.photoInfo='Ready: '+res.edge+'×'+res.edge+' px, '+(res.bytes/1024).toFixed(1)+' KB ('+(webpOk?'WebP':'JPEG')+')';const pi=$('pinfo');if(pi)pi.textContent=form.photoInfo}
function scheduleRecompress(){clearTimeout(encT);encT=setTimeout(recompress,200)}
function readForm(){const t=$('f_team'),n=$('f_name');if(t)form.team=t.value;if(n)form.name=n.value;if(form.name||form.team)drawCropSoon()}
function drawCropSoon(){if(!crop.img&&!form.photo)drawCrop()}
document.addEventListener('change',async e=>{if(e.target.id==='f_photo'){const f=e.target.files&&e.target.files[0];if(!f)return;readForm();
  try{$('photoerr').textContent='';crop.img=await loadImage(f);crop.zoom=1;crop.px=crop.py=0;$('zoomrow').classList.remove('hide');$('zoom').value=1;drawCrop();$('pinfo').textContent='Shrinking…';await recompress();$('pickphoto').textContent='Choose another'}catch(err){$('photoerr').textContent=String(err.message||err);$('pinfo').textContent='Square crop. Resized on your phone to a small picture.'}}
  if(e.target.id==='zoom'){crop.zoom=+e.target.value;drawCrop();scheduleRecompress()}});
document.addEventListener('input',e=>{if(e.target.id==='zoom'){crop.zoom=+e.target.value;drawCrop();scheduleRecompress()}if(e.target.id==='f_name'||e.target.id==='f_team'){readForm()}});
/* drag to pan inside the square */
document.addEventListener('pointerdown',e=>{const b=e.target.closest('#cropbox');if(!b||!crop.img)return;crop.drag={x:e.clientX,y:e.clientY,px:crop.px,py:crop.py};b.setPointerCapture(e.pointerId)});
document.addEventListener('pointermove',e=>{if(!crop.drag)return;const b=$('cropbox');const w=b.clientWidth;crop.px=Math.max(-1,Math.min(1,crop.drag.px-(e.clientX-crop.drag.x)/w*2));crop.py=Math.max(-1,Math.min(1,crop.drag.py-(e.clientY-crop.drag.y)/w*2));drawCrop()});
document.addEventListener('pointerup',()=>{if(crop.drag){crop.drag=null;scheduleRecompress()}});
/* ---------- actions ---------- */
const ACT={
 async gocode(){const v=$('code').value;const c=F.parseCode(v);if(!c){$('cerr').textContent='That code is not the right length or has characters we do not use. It has 16 letters and numbers.';return}
   id=c;await start()},
 emoji(el){readForm();form.emoji=form.emoji===el.dataset.e?'':el.dataset.e;if(!crop.img&&!form.photo){}document.querySelectorAll('.emojis button').forEach(b=>b.classList.toggle('on',b.dataset.e===form.emoji));drawCrop()},
 rmphoto(){readForm();crop.img=null;form.photo='';form.photoInfo='';formView(me&&joined().find(c=>c.mid===me.mid))},
 editme(){const c=joined().find(c=>c.mid===me.mid);const p=profs[c.mid]||{};form.name=(meta.over[c.mid]&&meta.over[c.mid].name)||p.name||c.name;form.team=(meta.over[c.mid]&&meta.over[c.mid].team)||p.team||c.team;form.emoji=p.emoji||'';form.photo=p.photo||'';form.pv=p.pv||0;formView(c)},
 copy(el){UI.copy(el.dataset.u,'Copied')},share(el){UI.share({title:meta.name,text:'My private link for '+meta.name,url:el.dataset.u})},
 join,saveme
};
function validate(){const n=F.clean(form.name),t=F.clean(form.team);if(!t)return'Enter a team name.';if(!n)return'Enter your name.';if(n.length>30||t.length>30)return'Keep names under 31 characters.';return''}
async function join(){if(busy)return;readForm();const ev=validate();const er=$('err');if(ev){er.textContent=ev;return}
  busy=true;$('joinbtn').disabled=true;$('joinbtn').textContent='Joining…';
  try{await loadAll();if(meta.status!=='lobby')return view();
    const K=F.Keys(id);const taken=joined().map(c=>(meta.over[c.mid]&&meta.over[c.mid].name)||c.name);
    const name=F.uniqueName(form.name,taken);const team=F.uniqueName(form.team,joined().map(c=>(meta.over[c.mid]&&meta.over[c.mid].team)||c.team));
    const mid=F.hexId(12),secret=F.newSecret(),sh=await F.mgrHash(mid,secret);
    await Store.set(K.mgr(mid),F.makeProfile({mid,name,team,emoji:form.emoji,photo:form.photo,pv:0}));
    const io={read:k=>Store.get(k),write:(k,o)=>Store.set(k,o),sleep:UI.sleep,url:(i,g)=>K.slot(i,g)};
    const r=await F.joinLeague(io,{meta,mid,name,team,sh});
    if(!r.ok){if(r.full){await loadAll();return view()}$('err').textContent=r.msg||'Could not join. Try again.';return}
    me={mid,k:secret};UI.setMe(id,me);if(meta.mock)UI.rememberMock({id,name:meta.name,parent:meta.parent||'',solo:false});else UI.rememberLeague(id,meta.name,'manager');await loadAll();profs[mid]={mid,name,team,emoji:form.emoji,photo:form.photo};
    const notes=[];if(name!==F.clean(form.name))notes.push('Someone already had that name, so you are “'+name+'”. The commissioner can rename you.');if(team!==F.clean(form.team))notes.push('Team name adjusted to “'+team+'” because it was taken.');
    done(r.claim,true,notes.join(' '))
  }catch(e){const er2=$('err');if(er2)er2.textContent='Could not reach the server. Check your connection and try again.'}finally{busy=false;const jb=$('joinbtn');if(jb){jb.disabled=false;jb.textContent='Join league'}}}
async function saveme(){if(busy)return;readForm();const ev=validate();if(ev){$('err').textContent=ev;return}busy=true;$('joinbtn').disabled=true;
  try{const K=F.Keys(id);const others=joined().filter(c=>c.mid!==me.mid).map(c=>c.name);const name=F.uniqueName(form.name,others);
    await Store.set(K.mgr(me.mid),F.makeProfile({mid:me.mid,name,team:form.team,emoji:form.emoji,photo:form.photo,pv:form.pv}));await loadAll();
    const c=joined().find(c=>c.mid===me.mid);profs[me.mid]={mid:me.mid,name,team:form.team,emoji:form.emoji,photo:form.photo};
    history.replaceState(null,'',UI.pageUrl('join.html',{l:id}));UI.toast('Profile saved');
    const P2=Object.assign({},c,{name,team:F.clean(form.team)});done(P2,false,name!==F.clean(form.name)?'Name adjusted to “'+name+'” because it was taken.':'')}
  catch(e){$('err').textContent='Could not save. Check your connection and try again.';$('joinbtn').disabled=false}finally{busy=false}}
UI.bind(ACT);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='code')ACT.gocode()});
async function start(){if(!id)return codeForm();me=UI.getMe(id);
  shell('<div class="card mut">Loading the league…</div>');
  try{if(!(await loadAll()))return codeForm('No league found with that code. Check it and try again.');
    if(me){const c0=joined().find(c=>c.mid===me.mid);if(c0&&!(await F.checkMgrSecret(c0,me.k))){me=null}}
    if(me){const c=joined().find(c=>c.mid===me.mid);if(c){try{const p=F.parseProfile(await Store.get(F.Keys(id).mgr(c.mid)));if(p)profs[c.mid]=p}catch(e){}if(editMode){const pp=profs[c.mid]||{};form.name=(meta.over[c.mid]&&meta.over[c.mid].name)||pp.name||c.name;form.team=(meta.over[c.mid]&&meta.over[c.mid].team)||pp.team||c.team;form.emoji=pp.emoji||'';form.photo=pp.photo||'';form.pv=pp.pv||0}}}
    view()}
  catch(e){shell('<div class="card"><h2>Can’t reach the server</h2><p class="small mut">Check your connection and try again.</p><button class="btn pri" data-a="reloadpage">Retry</button></div>')}}
UI.registerSW();start();
})();
