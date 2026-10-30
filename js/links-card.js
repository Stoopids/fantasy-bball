/* s25 shared "Save these links" card: Share / Copy all / Download file / Email. Used by setup.js and room.js; League may call it too (see LINKS-HOOK.md).
   Everything is built on this device from links already here. Nothing is sent to any server and secrets are never logged.
   LinksCard.html(c) -> markup; c={id,name,links:{invite,room,watch,mine?,commish?}}. LinksCard.mount(c,onUsed) arms the buttons (one card at a time). */
(function(){const U=window.UI,F=window.FBN;const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let CUR=null,ON=null;
function text(c){const L=c.links,nm=c.name||'Draft';const a=['Links for '+nm+' (league code '+F.formatCode(c.id)+')'];if(c.startAt!=null&&isFinite(+c.startAt)&&F.fmtLong)a.push('Draft starts: '+F.fmtLong(+c.startAt,U.tz())+' (your time)');a.push('','Invite link (share): '+L.invite,'Draft room link (share): '+L.room,'Spectator link (read-only): '+L.watch);
  if(L.mine||L.commish)a.push('');if(L.mine)a.push('Your manager link (PRIVATE, do not share): '+L.mine);if(L.commish)a.push('Commissioner link (PRIVATE, keep it to yourself): '+L.commish);
  if(L.commish)a.push('','The commissioner link cannot be recovered if every copy is lost.');return a.join('\r\n')}
function mailto(c){return 'mailto:?subject='+encodeURIComponent((c.name||'Draft')+' draft links')+'&body='+encodeURIComponent(text(c))}
function fileName(c){return (String(c.name||'league').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'league')+'-links.txt'}
function html(c){const sh=U.canShare();
  /* s25-full: the invite link gets its own share row (no secrets: only the join link) */
  const inv=c.links&&c.links.invite?`<div class="lcinv" id="lc_inv"><div class="small mut" style="margin:0 0 6px">Send the invite to your managers:</div>${U.shareRow({url:c.links.invite,text:'Join '+(c.name||'the draft')+' (draft invite)',subject:(c.name||'Draft')+' draft invite',id:'lc_sr',shareLabel:'Send invite link'})}</div>`:'';
  return inv+`<div class="lcard" id="lcard"><div class="small mut" style="margin:10px 0 6px">Keep a copy of every link, private ones included (for you only):</div><div class="lcbtns">
  ${sh?'<button type="button" class="btn pri" data-lc="share" id="lc_share">Share</button>':''}
  <button type="button" class="btn${sh?'':' pri'}" data-lc="copy" id="lc_copy">Copy all</button>
  <button type="button" class="btn" data-lc="download" id="lc_download">Download file</button>
  <a class="btn" data-lc="email" id="lc_email" href="${esc(mailto(c))}">Email</a></div>
  <div class="hint" id="lc_status" role="status" style="margin-top:6px">Pick one to keep a copy of every link. Nothing is stored or sent by this site.</div></div>`}
function used(how){const st=document.getElementById('lc_status');if(st)st.textContent=how;if(ON)ON(how)}
async function act(k,el,e){const c=CUR;if(!c)return;
  if(k==='share'){if(!U.canShare()){await U.copy(text(c),'Copied');return used('Copied all links')}
    try{await navigator.share({title:(c.name||'Draft')+' draft links',text:text(c)});used('Shared')}catch(err){if(!(err&&err.name==='AbortError')){await U.copy(text(c),'Share is not available here — copied instead');used('Copied all links')}}return}
  if(k==='copy'){await U.copy(text(c),'Copied');return used('Copied all links')}
  if(k==='download'){const b=new Blob([text(c)+'\r\n'],{type:'text/plain;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=fileName(c);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);return used('Downloaded '+fileName(c))}
  if(k==='email'){return used('Opened your email app')}}
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-lc]');if(!el)return;if(el.dataset.lc!=='email')e.preventDefault();act(el.dataset.lc,el,e)});
/* rebuild from what this device already holds (localStorage); private links only when their secret is here */
function fromDevice(id,name,startAt){const me=U.getMe(id),cm=U.lsGet('cm.'+id);const L={invite:U.pageUrl('join.html',{l:id}),room:U.pageUrl('room.html',{l:id}),watch:U.pageUrl('room.html',{l:id,watch:1})};
  if(me&&me.mid&&me.k)L.mine=U.pageUrl('room.html',{l:id},{as:me.mid,k:me.k});if(cm)L.commish=U.pageUrl('room.html',{l:id},{cm});return{id,name,startAt:startAt==null?null:startAt,links:L}}
window.LinksCard={html,text,mailto,fileName,fromDevice,mount(c,onUsed){CUR=c;ON=onUsed||null}};
})();
