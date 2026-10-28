/* Redraft page (January 20, 2027): rules, standings as of that date, each owner's optional drops, the last-place owner's pick position, and the commissioner's Start.
   Pure logic lives in core.js (F.redraft*, F.validateDrops, F.mRedraftOpen / F.mRedraftStart). The draft itself then runs in the normal draft room (room.html).
   Authorisation is the same friendly lock as the room: the owner's own secret (saved on the phone or in the link fragment) for drops, the commissioner secret for Open / Start. */
(function(){const F=FBN,U=UI,esc=U.esc,S=FBNScore,R=F.REDRAFT;const id=F.parseCode(U.qs().get('l')||'')||'';const T=U.loadTeams();
const topEl=document.getElementById('top');topEl.innerHTML=U.header({sub:'Redraft'});const app=document.getElementById('app');app.id='rapp';
const roomUrl=()=>U.pageUrl('room.html',{l:id}),leagueUrl=()=>U.pageUrl('league.html',{l:id});
if(!id){app.innerHTML='<div class="card"><h2>No league</h2><p class="mut">Open this page from your league link.</p><a class="btn" href="index.html">Home</a></div>';return}
app.innerHTML='<div class="card mut" id="loading">Loading the redraft…</div>';
const K=F.Keys(id);let D=null,MG=[],SC=null,own={},FORMS={},CM=false,ME='',errS='',SEL=null,POS=null,busy=false;
const nm=mid=>{const m=MG.find(x=>x.mid===mid);return m?m.name:'Former manager'};const mgOf=mid=>MG.find(x=>x.mid===mid)||{mid,name:'Former manager',team:''};
const tn=tid=>(T.TEAMS[tid]&&(T.TEAMS[tid].short||T.TEAMS[tid].name))||tid;
const plural=(n,a,b)=>n+' '+(n===1?a:b);
async function getJ(p){const r=await fetch(p+'?b='+encodeURIComponent(window.FBN_BUILD||''));if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
const meta=()=>D.meta,rd=()=>D.meta.redraft;
/* ---------- who am I (same secrets the room uses) ---------- */
async function auth(){CM=false;ME='';const m=D.meta;const fr=U.takeFragment();const cmF=F.extractSecret(fr.get('cm')||'','cm');const asF=fr.get('as')||'',kF=fr.get('k')||'';
  if(cmF&&await F.checkPass(m,cmF)){U.lsSet('cm.'+id,cmF)}
  if(asF&&kF){const c=F.joinedList(m,D.claims).find(c=>c.mid===asF);if(c&&await F.checkMgrSecret(c,kF)){U.setMe(id,{mid:asF,k:kF})}}
  const tok=U.lsGet('cm.'+id)||'';CM=!!(tok&&await F.checkPass(m,tok));
  const me=U.getMe(id);if(me&&me.mid){const c=F.joinedList(m,D.claims).find(c=>c.mid===me.mid);if(c&&await F.checkMgrSecret(c,me.k)&&MG.some(x=>x.mid===me.mid&&!x.left))ME=me.mid}}
async function readForms(){const r=D.meta.redraft;FORMS={};if(!r)return;await Promise.all(MG.map(async mg=>{try{const f=F.parseRedraftForm(await Store.get(K.rd(mg.mid)));if(f&&f.mid===mg.mid&&f.rid===r.rid)FORMS[mg.mid]=f}catch(e){}}))}
async function load(){D=await FBNLeague.load(id,{pool:T.POOL});if(!D.meta)return false;MG=D.managers;const st=D.state;
  if(!F.redraftLive(D.meta)&&st&&st.status==='complete')own=S.ownerMap(st.real||st.picks);
  await auth();await readForms();return true}
async function loadScores(){try{const j=await getJ('data/scores.json');const e=S.validateScores(j);if(e)throw new Error(e);SC=(j.sample)?null:j}catch(e){errS=e.message||String(e);SC=null}}
/* standings as of January 20, 2027 from the season games (same wins as the league page), ranked by the redraft rule */
function liveRows(){const g=F.gamesUpTo(SC?SC.games:[],R.asOf);const sea=S.fullSeason(g,own,MG);return F.redraftStandings(sea.map(r=>({mid:r.mid,wins:r.wins,losses:r.losses,diff:r.diff,idx:MG.findIndex(m=>m.mid===r.mid)})))}
function frozenRows(){const r=rd();/* the saved list is already in order */return r.stand.map((mid,i)=>{const x=r.rows.find(y=>y.mid===mid)||{w:0,l:0};const gp=x.w+x.l;return{mid,wins:x.w,losses:x.l,gp,pct:gp?x.w/gp:0,place:i+1,tieBroken:false}})}
/* ---------- cards ---------- */
function rulesCard(){return `<div class="card" id="rdrules"><h3 style="margin:0 0 6px">How the redraft works</h3><ol class="small" style="margin:0;padding-left:20px;line-height:1.5">
<li>Pick order follows the league standings as of <b>${esc(R.asOfLabel)}</b>. The best record picks first. It is a snake: the order reverses every round.</li>
<li>The owner in <b>last place</b> chooses where to pick (any position). If they do not choose, they pick last.</li>
<li>Standings use win percentage. If two owners are tied, the one with <b>fewer wins</b> ranks lower.</li>
<li>Each owner may <b>drop up to 2 teams</b> first. Dropping is optional. Dropped teams go back into the pool. You draft one team for each team you dropped.</li></ol></div>`}
function standingsCard(rows,frozen){const lastMid=rows.length?rows[rows.length-1].mid:'';
  return `<div class="card" id="rdstand"><h3 style="margin:0 0 4px">Standings as of ${esc(R.asOfLabel)}</h3><div class="tiny mut" style="margin-bottom:6px">${frozen?'Saved by the commissioner. This is the order for the redraft.':'Preview from the scores loaded so far. It becomes final when the commissioner opens the redraft.'}</div>`+
  rows.map(r=>{const mg=mgOf(r.mid);const gp=(r.gp!=null?r.gp:r.wins+r.losses);return `<div class="row nw strow2" data-mid="${esc(r.mid)}" style="padding:6px 0;border-top:1px solid var(--line,#2a3140)"><span class="place" style="min-width:22px"><b>${r.place}</b></span>${U.avatar(mg,32)}<span class="grow"><b>${esc(mg.name)}</b> <span class="small mut">${esc(mg.team||'')}</span>${r.mid===lastMid&&rows.length>1?' <span class="tiny" style="color:var(--acc)">last place · chooses where to pick</span>':''}</span><span class="small"><b>${r.wins}-${r.losses}</b>${gp?` · ${Math.round(r.pct*100)}%`:''}${r.tieBroken?' <span class="tiny mut" title="tie broken by fewer wins">tie</span>':''}</span></div>`}).join('')+'</div>'}
function orderCard(rows){const stand=rows.map(r=>r.mid);const lastMid=stand[stand.length-1];const f=FORMS[lastMid];const pos=f&&f.pos?f.pos:null;const o=F.redraftOrder(stand,pos);
  return `<div class="card" id="rdorder"><h3 style="margin:0 0 4px">Draft order</h3><div class="tiny mut" style="margin-bottom:6px">${pos?esc(nm(lastMid))+' (last place) chose to pick #'+pos+'.':esc(nm(lastMid))+' (last place) has not chosen yet; they pick last unless they choose.'}</div><ol class="small" style="margin:0;padding-left:22px;line-height:1.6">${o.map(m=>`<li data-mid="${esc(m)}"><b>${esc(nm(m))}</b> <span class="mut">${esc(mgOf(m).team||'')}</span></li>`).join('')}</ol></div>`}
function dropsLine(mid){const f=FORMS[mid];if(!f)return '<span class="mut">no answer yet (keeps every team)</span>';return f.drops.length?'dropping '+f.drops.map(t=>esc(tn(t))).join(' and '):'keeping every team'}
function statusCard(rows){return `<div class="card" id="rdstatus"><h3 style="margin:0 0 4px">Who has answered</h3><div class="tiny mut" style="margin-bottom:6px">No answer means the owner keeps all their teams.</div>`+MG.map(mg=>`<div class="small" data-mid="${esc(mg.mid)}" style="padding:3px 0"><b>${esc(mg.name)}</b> · ${dropsLine(mg.mid)}</div>`).join('')+'</div>'}
function ownerCard(rows){const r=rd();const me=ME;if(!me)return `<div class="card" id="rdowner"><h3 style="margin:0 0 4px">Your drops</h3><p class="small mut" style="margin:0">To choose your drops, open this page from your own manager link (the one you used to join), or open the draft room once on this phone. Spectators can look but not change anything.</p></div>`;
  const roster=D.state.real.filter(p=>p.owner===me).map(p=>p.tid);const f=FORMS[me];if(SEL===null)SEL=new Set(f?f.drops:[]);const stand=rows.map(x=>x.mid);const isLast=stand[stand.length-1]===me&&stand.length>1;if(POS===null)POS=f&&f.pos?f.pos:0;
  let h=`<div class="card" id="rdowner"><h3 style="margin:0 0 4px">Your drops, ${esc(nm(me))}</h3><p class="small mut" style="margin:0 0 8px">Tick up to 2 teams to drop. You do not have to drop anyone. You draft one team back for each team you drop.</p>`+roster.map(t=>`<label class="row nw" style="padding:6px 0;min-height:44px;cursor:pointer"><input type="checkbox" class="dropchk" data-t="${esc(t)}" ${SEL.has(t)?'checked':''} style="width:22px;height:22px;margin-right:8px"> ${U.chip(T.TEAMS,t)}</label>`).join('');
  if(isLast)h+=`<div style="margin-top:10px"><label class="small" for="rdpos"><b>You are in last place, so you choose where to pick.</b></label><select id="rdpos" style="width:100%;margin-top:4px"><option value="0" ${!POS?'selected':''}>No choice (pick last)</option>${stand.map((_,i)=>`<option value="${i+1}" ${POS===i+1?'selected':''}>Pick #${i+1}${i===0?' (first)':''}</option>`).join('')}</select></div>`;
  h+=`<div class="row" style="margin-top:12px"><button class="btn pri grow" data-a="savedrops" id="savedrops" ${busy?'disabled':''}>Save my choices</button><button class="btn grow" data-a="keepall" id="keepall" ${busy?'disabled':''}>Keep all my teams</button></div><div class="small mut" id="rdsaved" style="margin-top:6px">${f?'Saved: '+dropsLine(me)+(isLast&&f.pos?' · you pick #'+f.pos:''):'Nothing saved yet.'}</div></div>`;return h}
function commCard(rows,open){if(!CM)return '';
  if(!open)return `<div class="card" id="rdcomm"><h3 style="margin:0 0 4px">Commissioner</h3><p class="small mut" style="margin:0 0 8px">Opening the redraft saves the standings above and lets owners choose their drops.${Date.now()<Date.parse(R.asOf+'T00:00:00Z')?' It is before '+esc(R.asOfLabel)+', so these standings are not final. You can open it again later to refresh them.':''}</p><button class="btn pri block" data-a="open" id="openbtn" ${busy?'disabled':''}>Open the redraft</button></div>`;
  const answered=MG.filter(m=>FORMS[m.mid]).length;const total=MG.reduce((t,m)=>t+(FORMS[m.mid]?FORMS[m.mid].drops.length:0),0);
  return `<div class="card" id="rdcomm"><h3 style="margin:0 0 4px">Commissioner</h3><p class="small mut" style="margin:0 0 8px">${answered} of ${MG.length} owners have answered · ${plural(total,'team','teams')} to redraft. Start whenever you are ready; owners who have not answered keep all their teams.</p><div class="row"><button class="btn pri grow" data-a="start" id="startbtn" ${busy||!total?'disabled':''}>Start the redraft</button><button class="btn grow" data-a="open" id="refreshbtn" ${busy?'disabled':''}>Refresh standings</button></div>${total?'':'<div class="tiny mut" style="margin-top:6px">Start unlocks when at least one owner drops a team.</div>'}</div>`}
function liveCard(){const r=rd();const done=D.state.status==='complete';const dropped=MG.map(m=>({m,d:(r.drops[m.mid]||[])})).filter(x=>x.d.length);
  return `<div class="card" id="rdlive"><div class="small mut">${done?'REDRAFT COMPLETE':'REDRAFT IN PROGRESS'}</div><h3 style="margin:2px 0 6px">${done?'The redraft is finished':'The redraft is under way'}</h3><div class="small mut" style="margin-bottom:8px">Based on the standings as of ${esc(R.asOfLabel)}. ${dropped.length?'Dropped teams: '+dropped.map(x=>esc(x.m.name)+' ('+x.d.map(t=>esc(tn(t))).join(', ')+')').join('; ')+'.':''}</div><div class="row"><a class="btn pri grow" id="torooom" href="${esc(roomUrl())}">${done?'Open the draft room':'Go to the draft room'}</a><a class="btn grow" href="${esc(leagueUrl())}">League site</a></div></div>`}
function render(){const m=meta(),st=D.state;const back=`<div class="row" style="margin-top:10px"><a class="btn" href="${esc(leagueUrl())}">League site</a> <a class="btn" href="${esc(roomUrl())}">Draft room</a></div>`;
  if(F.redraftLive(m)){app.innerHTML=`<div class="card" id="rdhead"><div class="small mut">REDRAFT · ${esc(R.asOfLabel)}</div><h2 style="margin:2px 0">${esc(m.name)}</h2></div>`+liveCard()+rulesCard()+standingsCard(frozenRows(),true)+orderCard(frozenRows())+U.buildTag();return}
  const head=`<div class="card" id="rdhead"><div class="small mut">REDRAFT · ${esc(R.asOfLabel)}</div><h2 style="margin:2px 0">${esc(m.name)}</h2><div class="small mut">${plural(MG.length,'manager','managers')}</div></div>`;
  if(m.status!=='complete'||!st||st.status!=='complete'||m.endedEarly){app.innerHTML=head+`<div class="card" id="rdnot"><b>The redraft opens after the first draft is complete.</b><p class="small mut" style="margin:4px 0 0">${m.endedEarly?'The first draft ended early, so there is no full set of rosters to redraft.':'Come back when every roster is full.'}</p>${back}</div>`+rulesCard()+U.buildTag();return}
  const open=!!(m.redraft&&m.redraft.phase==='open');const rows=open?frozenRows():liveRows();
  let h=head+(errS&&!open?`<div class="card" id="nodata"><b>No scores yet.</b><p class="mut small" style="margin:4px 0 0">Everyone shows 0-0, so the preview follows seat order. The scores file could not be loaded (${esc(errS)}).</p></div>`:'')+rulesCard();
  if(!open&&!CM)h+=`<div class="card" id="rdwait"><b>The commissioner has not opened the redraft yet.</b><p class="small mut" style="margin:4px 0 0">When they do, you can choose your drops here.</p></div>`;
  h+=standingsCard(rows,open)+orderCard(rows);if(open){h+=ownerCard(rows)+statusCard(rows)}h+=commCard(rows,open)+back+U.buildTag();app.innerHTML=h}
/* ---------- meta write: re-read, apply, post, verify (same pattern as the room) ---------- */
async function mutate(fn,verify){for(let a=0;a<3;a++){let raw;try{raw=await Store.get(K.meta)}catch(e){return{ok:false,msg:"Can't reach the server. Check your connection and try again."}}
  const cur=F.normalizeMeta(F.parseJ(raw));const r=fn(cur);if(r.error)return{ok:false,msg:r.error};const ns=r.state;ns.version=(cur.version||0)+1;ns.updated=new Date().toISOString();
  try{await Store.set(K.meta,ns)}catch(e){return{ok:false,msg:'Save failed (server hiccup). Nothing was changed — try again.'}}
  await U.sleep(650);try{const chk=F.normalizeMeta(F.parseJ(await Store.get(K.meta)));if(verify(chk,ns))return{ok:true}}catch(e){return{ok:true,unverified:true}}}
  return{ok:false,msg:'Someone else saved at the same moment and your change did not stick. Look at the screen and try again.'}}
const sigOf=()=>JSON.stringify([D.meta.redraft,D.meta.epoch,D.meta.status,Object.keys(FORMS).sort().map(k=>FORMS[k].ts+':'+FORMS[k].v),CM,ME]);
async function refresh(){await load();render()}
const need=(who)=>{if(who==='cm'&&!CM){U.toast('Commissioner tools are locked. Open your commissioner link first.',4500);return false}if(who==='me'&&!ME){U.toast('Open your own manager link to change your drops.',4500);return false}return true};
async function doOpen(){if(!need('cm')||busy)return;busy=true;render();try{await load();await loadScores();const rows=liveRows();const st=D.state;
  const r=await mutate(cur=>cur.epoch!==D.meta.epoch?{error:'The league changed while this page was open. Reload and look again.'}:F.mRedraftOpen(cur,st,{rows,now:Date.now()}),(chk,ns)=>!!chk.redraft&&chk.redraft.rid===ns.redraft.rid&&chk.redraft.phase==='open');
  if(r.ok)U.toast('Redraft opened. Owners can choose their drops now.',4000);else U.toast(r.msg,6000)}finally{busy=false;await refresh()}}
function askStart(){if(!need('cm')||busy)return;U.openSheet('<h2>Start the redraft?</h2><p class="small mut">Owners who have not answered keep all their teams. Once it starts, the drops are final and this cannot be undone.</p><div class="row" style="margin-top:12px"><button class="btn pri grow" data-a="startyes" id="startyes">Start the redraft</button><button class="btn grow" data-a="sheetbg" id="startno">Cancel</button></div>')}
async function doStart(){U.closeSheet();if(!need('cm')||busy)return;busy=true;render();
  try{await load();const st=D.state;const r=await mutate(cur=>{if(cur.epoch!==D.meta.epoch)return{error:'The league changed while this page was open. Reload and look again.'};return F.mRedraftStart(cur,st,FORMS,{now:Date.now(),poolSize:T.POOL.length})},(chk,ns)=>chk.epoch===ns.epoch&&F.redraftLive(chk));
  if(r.ok)U.toast('The redraft has started.',4000);else U.toast(r.msg,6000)}finally{busy=false;await refresh()}}
async function saveForm(drops,pos){if(!need('me')||busy)return;busy=true;try{const raw=await Store.get(K.meta);const cur=F.normalizeMeta(F.parseJ(raw));if(!cur.redraft||cur.redraft.phase!=='open'){U.toast(cur.redraft?'The redraft has already started.':'The commissioner has not opened the redraft.',5000);return}
    const roster=D.state.real.filter(p=>p.owner===ME).map(p=>p.tid);const v=F.validateDrops(roster,drops);if(v.error){U.toast(v.error,5000);return}
    const f=F.makeRedraftForm({mid:ME,rid:cur.redraft.rid,drops:v.drops,pos,v:(FORMS[ME]&&FORMS[ME].v)||0});await Store.set(K.rd(ME),f);await U.sleep(400);const chk=F.parseRedraftForm(await Store.get(K.rd(ME)));
    if(chk&&chk.ts===f.ts){U.toast(v.drops.length?'Saved. You are dropping '+plural(v.drops.length,'team','teams')+'.':'Saved. You keep all your teams.',4000);SEL=new Set(f.drops);POS=f.pos||0}else U.toast('Could not confirm the save. Try again.',5000)}
  catch(e){U.toast("Can't reach the server. Try again.",5000)}finally{busy=false;await refresh()}}
const ACT={open:()=>doOpen(),start:()=>askStart(),startyes:()=>doStart(),sheetbg:(el,e)=>{if(e.target===el)U.closeSheet()},
  savedrops:()=>{const sel=document.getElementById('rdpos');const pos=sel&&+sel.value>0?+sel.value:null;saveForm(Array.from(SEL||[]),pos)},
  keepall:()=>{SEL=new Set();const sel=document.getElementById('rdpos');const pos=sel&&+sel.value>0?+sel.value:null;saveForm([],pos)}};
document.addEventListener('change',e=>{const el=e.target;if(el.classList&&el.classList.contains('dropchk')){const t=el.dataset.t;if(!SEL)SEL=new Set();if(el.checked){if(SEL.size>=R.maxDrops){el.checked=false;U.toast('You can drop at most '+R.maxDrops+' teams.',3500);return}SEL.add(t)}else SEL.delete(t)}
  else if(el.id==='rdpos')POS=+el.value||0});
U.bind(ACT);U.registerSW();
load().then(async ok=>{if(!ok){app.innerHTML='<div class="card" id="nf"><h2>League not found</h2><p class="mut">Check the link.</p><a class="btn" href="index.html">Home</a></div>';return}
  await loadScores();render();app.setAttribute('data-ready','1');
  let sig=sigOf();setInterval(async()=>{if(document.hidden||busy)return;try{await load();const n=sigOf();if(n!==sig){sig=n;render()}}catch(e){}},20000)}).catch(e=>{app.innerHTML='<div class="card bad">Could not load the redraft: '+esc(e.message||e)+'</div>'});
})();
