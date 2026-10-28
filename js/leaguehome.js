/* League site: standings (Full Season / NCAA Tournament), team cards, games. Only after the draft is complete.
   Data: data/scores.json and data/tournament.json (static files, format in data/FORMAT.md). Scoring: js/scoring.js. */
(function(){const F=FBN,U=UI,esc=U.esc,S=FBNScore;const id=F.parseCode(U.qs().get('l')||'')||'';const T=U.loadTeams();
const DEMO=U.qs().get('demo')==='1';const DATA=DEMO?'data/demo/':'data/';
const topEl=document.getElementById('top');topEl.innerHTML=U.header({sub:DEMO?'League · DEMO':'League'});if(DEMO){const bh=document.createElement('div');bh.innerHTML='<div class="demobar" id="demobar" role="note"><b>DEMO</b> · invented games and scores. These are not real results and not this league’s standings. <a href="'+esc(U.pageUrl('league.html',{l:id}))+'">Leave the demo</a></div>';topEl.after(bh.firstChild)}const app=document.getElementById('app');app.id='lapp';
const home=()=>id?U.siteButtons(id,'lsbtns','site')+`<div class="row" style="width:100%"><a class="btn grow" id="back_room" href="${esc(U.roomHref(id))}">Draft room</a></div>`:'<a class="btn" href="index.html">Home</a>';
if(!id){app.innerHTML='<div class="card"><h2>No league</h2><p class="mut">Open this page from your league link.</p><a class="btn" href="index.html">Home</a></div>';return}
app.innerHTML='<div class="card mut" id="loading">Loading the league…</div>';
const V={tab:'standings',mode:'season',gmode:'results',gmid:'',gkind:'',more:60};let D=null,SC=null,TN=null,errS='',errT='',own={},MG=[],SEA=[],TOU=[];
const hashSet=()=>{const h=(location.hash||'').replace('#','').split('/');if(['standings','teams','games','redraft'].includes(h[0]))V.tab=h[0];if(h[1]==='tournament')V.mode='tourney';else if(h[1]==='season')V.mode='season'};
const hashPut=()=>{try{history.replaceState(null,'','#'+V.tab+(V.tab==='standings'?'/'+(V.mode==='tourney'?'tournament':'season'):''))}catch(e){}};
async function getJ(p){const r=await fetch(p+'?b='+encodeURIComponent(window.FBN_BUILD||''));if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
const nm=mid=>{const m=MG.find(x=>x.mid===mid);return m?m.name:''};
const tname=tid=>(T.TEAMS[tid]&&T.TEAMS[tid].short)||tid;
const plural=(n,a,b)=>n+' '+(n===1?a:b);
const num=n=>String(n);
function compute(){const g=SC?SC.games:[];SEA=S.fullSeason(g,own,MG);TOU=S.tournament(g,TN?TN.field:{},own,MG,TN&&TN.points)}
/* ---------- shared bits ---------- */
function sampleNote(){return DEMO?'<div class="note" id="samplenote"><b>DEMO data.</b> Invented games and scores, to show how standings will look. Not real results.</div>':''}
const noGames=()=>!(SC&&SC.games&&SC.games.length)&&!(TN&&Object.keys(TN.field||{}).length);
function dataNote(){let h='';if(errS)h+=`<div class="card" id="nodata"><b>No scores yet.</b><p class="mut small" style="margin:4px 0 0">The scores file could not be loaded (${esc(errS)}), so everyone shows zero. A maintainer can refresh it; see the README.</p></div>`;return h}
const asOf=()=>{const a=(SC&&SC.as_of)||(TN&&TN.as_of);return a?`<div class="tiny mut" id="asof">Scores as of ${esc(a)}</div>`:''};
let CM=false,HERO_CUSTOM=null;
function head(){const m=D.meta,st=D.state;const ro=(st.roster||st.picks).length;
  const ctl=CM?`<div class="heroctl" id="heroctl"><button class="btn sm" data-a="herochange" id="herochange">Change photo</button>${HERO_CUSTOM?'<button class="btn sm" data-a="heroreset" id="heroreset">Reset to default</button>':''}<input type="file" id="herofile" accept="image/jpeg,image/png,image/webp,image/*" hidden></div>`:'';
  return `<header class="lhdr"><div class="hero" id="hero" role="img" aria-label="College basketball banner"></div>${ctl}<div class="titlebar" id="lhead"><div class="tiny mut lab">${st.endedEarly?'DRAFT ENDED EARLY':'DRAFT COMPLETE'}</div><h1 id="ltitle">${esc(m.name)}</h1><div class="small mut">${plural(MG.length,'manager','managers')} · ${plural(ro,'school','schools')} ${m.redraft&&m.redraft.phase==='live'?'on rosters':'drafted'}</div></div></header>`}
const roomHref=()=>U.roomHref(id),recapHref=()=>U.pageUrl('recap.html',{l:id}),redraftHref=()=>U.pageUrl('redraft.html',{l:id});
function redraftTab(){const r=D.meta.redraft,live=r&&r.phase==='live';const done=live&&D.state.status==='complete';const cd=F.redraftCountdown(Date.now(),U.tz());const can=!DEMO&&!D.meta.endedEarly&&(r||cd.state!=='future');
  const line=D.meta.endedEarly?'The first draft ended early, so there is no redraft.':!r?(cd.state==='future'?'Opens '+F.REDRAFT.asOfLabel+' · '+cd.text+'.':'The redraft is ready to open. The commissioner starts it.'):r.phase==='open'?'The redraft is open: owners can choose their drops now.':done?'The redraft is complete.':'The redraft is under way.';
  const btn=DEMO?'':can?`<a class="btn pri block endbig" id="redraftlink" href="${esc(redraftHref())}">${live?'Open the redraft':'Go to the redraft page'}</a>`:`<button class="btn block endbig" id="redraftlink" disabled aria-disabled="true">${D.meta.endedEarly?'Not available':'Opens '+esc(F.REDRAFT.asOfLabel)}</button><a class="btn block" id="redraftpreview" href="${esc(redraftHref())}" style="margin-top:8px">Preview the rules and standings</a>`;
  return `<div class="card" id="redraftcard"><h3 style="margin:0 0 4px">Redraft · ${esc(F.REDRAFT.asOfLabel)}</h3><p class="small mut" style="margin:0 0 10px" id="rdline">${esc(line)}</p><ol class="small nextlist"><li>The pick order follows the standings as of ${esc(F.REDRAFT.asOfLabel)}. Best record picks first (snake).</li><li>The owner in last place chooses where to pick. Same win percentage? The owner with fewer wins ranks lower.</li><li>Each owner may drop up to 2 teams first. Dropped teams go back into the pool.</li></ol><div style="margin-top:12px">${btn}</div></div>`}
function tabs(){const T4=[['standings','🏆','Standings','Ranks'],['teams','🏀','Teams','Teams'],['games','📅','Games','Games'],['redraft','🔄','Redraft','Jan 20']];
  return `<nav class="lnav" id="ltabs" aria-label="League site">${T4.map(([k,ic,l,sh])=>`<button data-a="tab" data-v="${k}" class="${V.tab===k?'on':''}" aria-label="${esc(l)}"><span class="ni">${ic}</span><span class="nl f">${esc(l)}</span><span class="nl s">${esc(sh)}</span></button>`).join('')}<a class="nd" id="tab_recap" href="${esc(recapHref())}"><span class="ni">📋</span><span class="nl f">Draft recap</span><span class="nl s">Recap</span></a><a class="nd" id="tab_room" href="${esc(roomHref())}"><span class="ni">🧩</span><span class="nl f">Draft room</span><span class="nl s">Draft</span></a></nav>`}
/* ---------- standings ---------- */
function emptyState(){return `<div class="card" id="emptystate"><h3 style="margin:0 0 4px">Standings start when the season starts</h3><p class="mut small" style="margin:0 0 8px">The draft is done and the teams are set. Wins and points will show up here once games are played and the scores are loaded. Nothing below is made up.</p>${errS?`<p class="small mut">The scores file could not be loaded (${esc(errS)}).</p>`:''}<div class="row"><a class="btn" href="${esc(U.pageUrl('recap.html',{l:id}))}">Draft recap</a> <button class="btn" data-a="tab" data-v="teams">See the teams</button></div><p class="tiny mut" style="margin:10px 0 0">Want to see how it will look? <a href="${esc(U.pageUrl('league.html',{l:id,demo:1}))}" id="demolink">Open the demo</a> (invented scores, clearly marked DEMO).</p></div>`}
function standings(){if(!DEMO&&noGames())return emptyState();const tm=V.mode==='tourney';const list=tm?TOU:SEA;
  let h=`<div class="seg" id="lmode"><button data-a="mode" data-v="season" class="${!tm?'on':''}">Full Season</button><button data-a="mode" data-v="tourney" class="${tm?'on':''}">NCAA Tournament</button></div>`;
  if(tm){const any=TN&&Object.keys(TN.field||{}).length||(SC&&SC.games.some(g=>g.kind==='ncaa'));
    if(!any)return h+`<div class="card" id="notourney"><b>The tournament has not started.</b><p class="mut small" style="margin:4px 0 0">${errT?'The tournament file could not be loaded ('+esc(errT)+'). ':''}Standings appear here once the field is set. Schools earn points for making the field, winning games, reaching the Final Four and winning the title, plus a bonus for each upset by seed.</p></div>`+asOf();
    h+=`<p class="small mut" style="margin:6px 0">Points: make the field ${S.POINTS.entry}, play-in win ${S.POINTS.playin_win}, each win ${S.POINTS.win}, upset by seed +${S.POINTS.upset} (the worse seed beats the better seed), Final Four +${S.POINTS.final4}, champion +${S.POINTS.champ}${list.locked?`, missing the field ${S.POINTS.missed}`:''}. Ties: more upsets, then more wins.</p>`}
  else h+=`<p class="small mut" style="margin:6px 0">Wins by your schools in regular-season and conference tournament games. Ties: win %, then point difference.</p>`;
  h+='<div id="stlist">'+list.map(r=>{const you=false;const big=tm?r.score:r.wins;const lab=tm?'pts':(r.wins===1?'win':'wins');
    const sub=tm?`${plural(r.wins,'win','wins')} · ${plural(r.upsets,'upset','upsets')}`:`${r.wins}-${r.losses}${r.gp?` · ${Math.round(r.pct*100)}%`:''}`;
    const mg=MG.find(x=>x.mid===r.mid)||{mid:r.mid,name:r.name};
    const det=tm?tourneyDetail(r):seasonDetail(r);
    const maxv=Math.max(1,...list.map(x=>tm?x.score:x.wins));const pct=Math.max(0,Math.min(100,Math.round((tm?r.score:r.wins)/maxv*100)));
    const mine=(D.state.roster||D.state.picks).filter(p=>p.owner===r.mid);
    const chips=mine.map(p=>{const t=r.teams&&r.teams[p.tid];const rec=tm?(t?(t.pts>0?'+':'')+t.pts+' pts':'0 pts'):(t?t.w+'-'+t.l:'0-0');return `<span class="cc" data-tid="${esc(p.tid)}">${U.chip(T.TEAMS,p.tid,{sm:1})}<small class="cr">${esc(rec)}</small></span>`}).join('');
    return `<details class="card strow oc" data-mid="${esc(r.mid)}"><summary class="lb"><span class="rank"><span class="place${r.place===1?' first':''}">${r.place}${r.tied?'<small>=</small>':''}</span></span><span class="who">${U.avatar(mg,34)}<span class="wn"><b class="nm">${esc(r.name)}</b><small class="tn">${esc(mg.team||'')}</small><small class="sub">${sub}</small></span></span><span class="pts score"><b>${num(big)}</b><small>${lab}</small></span><span class="bar"><i style="width:${esc(String(pct))}%"></i></span><span class="chips">${chips}</span></summary><div class="det">${det}</div></details>`}).join('')+'</div>';
  if(tm){const up=S.upsets(SC?SC.games:[],own);const mine=up.filter(u=>u.owner);
    h+=`<div class="card" id="uplist"><h3>Upsets by your schools</h3>${mine.length?mine.slice(0,12).map(u=>`<div class="up"><span class="seedtag">${u.winner.seed} over ${u.loser.seed}</span> ${U.chip(T.TEAMS,u.winner.id,{sm:1})} <span class="small mut">beat</span> ${U.chip(T.TEAMS,u.loser.id,{sm:1})} <span class="small mut">${esc(S.roundShort?S.roundShort(u.game.round):u.game.round)} · ${esc(nm(u.owner))}</span></div>`).join(''):'<p class="mut small" style="margin:4px 0 0">No upsets by your schools yet.</p>'}</div>`}
  return h+asOf()}
function seasonDetail(r){if(!r.teamList.length)return '<span class="small mut">No finished games yet.</span>';
  return r.teamList.map(t=>`<div class="tl">${U.chip(T.TEAMS,t.tid,{sm:1})}<span class="small mut">${t.w}-${t.l}</span></div>`).join('')}
function tourneyDetail(r){if(!r.events.length)return '<span class="small mut">No points yet.</span>';
  const by={};r.events.forEach(e=>{(by[e.tid]=by[e.tid]||[]).push(e)});
  return Object.keys(by).map(tid=>{const ev=by[tid],tot=ev.reduce((a,e)=>a+e.pts,0);return `<div class="tl2"><div class="tl">${U.chip(T.TEAMS,tid,{sm:1})}<b class="small" style="margin-left:auto">${tot>0?'+':''}${tot}</b></div><div class="tiny mut evs">${ev.map(e=>esc(e.label)+' ('+(e.pts>0?'+':'')+e.pts+')').join(' · ')}</div></div>`}).join('')}
/* ---------- team cards ---------- */
function status(tid){const q=S.teamTourney(tid,SC?SC.games:[],TN?TN.field:{});if(q.state==='none')return '';const sd=q.seed!=null?'Seed '+q.seed+' · ':'';
  return q.state==='champ'?sd+'National champion':q.state==='out'?sd+'Out in '+q.round:sd+'Still playing ('+q.round+')'}
function teams(){const order=(D.state.order||[]).map(mid=>MG.find(x=>x.mid===mid)).filter(Boolean);
  return `<p class="small mut" style="margin:6px 0">Each card shows a manager's schools with their record this season and where they stand in the NCAA tournament.</p><div class="tgrid">`+order.map(mg=>{const picks=(D.state.roster||D.state.picks).filter(p=>p.owner===mg.mid);const sr=SEA.find(x=>x.mid===mg.mid),tr=TOU.find(x=>x.mid===mg.mid);
    return `<div class="card tcard" data-mid="${esc(mg.mid)}"><div class="row nw">${U.avatar(mg,48)}<div class="grow"><b style="font-size:17px">${esc(mg.team||'Team')}</b><div class="small mut">${esc(mg.name)}</div></div><div class="small" style="text-align:right"><b>${sr?sr.wins+'-'+sr.losses:'0-0'}</b><div class="tiny mut">${tr?tr.score:0} tourney pts</div></div></div>
    <div class="schools">${picks.map(p=>{const t=sr&&sr.teams[p.tid];const rec=t?t.w+'-'+t.l:'0-0';const st=status(p.tid);
      return `<div class="school" data-tid="${esc(p.tid)}">${U.chip(T.TEAMS,p.tid)}<span class="small mut rec">${rec}</span>${st?`<span class="tiny stt">${esc(st)}</span>`:''}</div>`}).join('')||'<span class="small mut">No schools</span>'}</div></div>`}).join('')+'</div>'}
/* ---------- games ---------- */
const dayLabel=d=>{try{const x=new Date(d+'T12:00:00');return x.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}catch(e){return d}};
const timeLabel=g=>{if(!g.start)return '';try{const x=new Date(g.start);if(isNaN(x))return '';return x.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch(e){return ''}};
function side(s,g,win){const o=own[String(s.id)];return `<div class="gs${win?' w':''}">${s.seed!=null&&g.kind==='ncaa'?`<span class="sd">${s.seed}</span>`:''}${U.chip(T.TEAMS,s.id,{sm:1})}${o?`<span class="tiny own">${esc(nm(o))}</span>`:''}<span class="sc">${s.score==null?'':s.score}</span></div>`}
function gameRow(g){const f=S.isFinal(g);const w=f?S.winnerSide(g):null;const tag=g.kind==='ncaa'?'NCAA · '+g.round:g.kind==='conf'?(g.round?'Conference tournament · '+g.round:'Conference'):'';
  return `<div class="game card" data-gid="${esc(g.id)}">${tag?`<div class="tiny mut gt">${esc(tag)}${f&&S.isUpset(g)?' <span class="upb">Upset</span>':''}</div>`:''}${side(g.home,g,w===g.home)}${side(g.away,g,w===g.away)}${!f?`<div class="tiny mut">${esc(timeLabel(g)||dayLabel(g.day))}</div>`:''}</div>`}
function games(){if(errS)return `<div class="card" id="nogames"><b>No games yet.</b><p class="mut small" style="margin:4px 0 0">The scores file could not be loaded (${esc(errS)}). A maintainer can refresh it; see the README.</p></div>`;
  const v=S.gamesView(SC.games,own,{mid:V.gmid,kind:V.gkind==='ncaa'?'ncaa':V.gkind==='season'?'season':''});const list=V.gmode==='results'?v.results:v.upcoming;
  let h=`<div class="seg" id="gmode"><button data-a="gmode" data-v="results" class="${V.gmode==='results'?'on':''}">Results (${v.results.length})</button><button data-a="gmode" data-v="upcoming" class="${V.gmode==='upcoming'?'on':''}">Upcoming (${v.upcoming.length})</button></div>
  <div class="row gfil"><select id="gmid" data-a="gmid" aria-label="Manager"><option value="">All managers</option>${MG.map(m=>`<option value="${esc(m.mid)}"${V.gmid===m.mid?' selected':''}>${esc(m.name)}</option>`).join('')}</select><select id="gkind" data-a="gkind" aria-label="Type"><option value="">All games</option><option value="season"${V.gkind==='season'?' selected':''}>Season</option><option value="ncaa"${V.gkind==='ncaa'?' selected':''}>NCAA tournament</option></select></div>`;
  if(!list.length)return h+`<div class="card" id="gempty"><p class="mut" style="margin:0">${V.gmode==='results'?'No finished games for these schools yet.':'No upcoming games for these schools.'}</p></div>`;
  let day='';h+='<div id="glist">';list.slice(0,V.more).forEach(g=>{const d=g.day||'';if(d!==day){day=d;h+=`<div class="dayh">${esc(dayLabel(d))}</div>`}h+=gameRow(g)});h+='</div>';
  if(list.length>V.more)h+=`<button class="btn block" data-a="more">Show more (${list.length-V.more} left)</button>`;return h+asOf()}
/* ---------- render ---------- */
function syncDemo(){const d=document.getElementById('demobar');document.documentElement.style.setProperty('--demoh',(d?d.offsetHeight:0)+'px')}
window.addEventListener('resize',syncDemo);
function chatBar(){return `<a class="chatbar" id="chatbar" data-a="chatopen" href="${esc(roomHref())}"><span class="cl">💬 Chat</span><span class="cp" id="chatpres"></span><span class="cm" id="chatlast">Open the draft room chat</span><span class="cb" id="chatbadge" hidden></span></a>`}
function render(){const body=V.tab==='standings'?standings():V.tab==='teams'?teams():V.tab==='redraft'?redraftTab():games();
  app.innerHTML=head()+sampleNote()+tabs()+'<main id="lmain">'+(V.tab==='standings'||V.tab==='teams'?dataNote():'')+'<div id="lbody">'+body+'</div><div class="row" style="margin-top:14px">'+home()+'</div></main>'+chatBar()+U.buildTag();paintHero();paintChat();syncDemo()}
/* ---------- banner photo (default file; commissioner may change it; own small key, cached, never polled) ---------- */
function paintHero(){const el=document.getElementById('hero');if(el)U.heroApply(el,HERO_CUSTOM||F.HERO.file)}
async function loadHero(force){HERO_CUSTOM=DEMO?null:await U.heroLoad(id,force)}
function readImage(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();im.onload=()=>{URL.revokeObjectURL(url);res(im)};im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('That file is not a picture we can open.'))};im.src=url})}
/* cover-crop to 16:5 at the given width, as JPEG */
const heroEncoder=im=>async(edge,q)=>{const w=edge,h=Math.round(edge*5/16);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const sc=Math.max(w/im.width,h/im.height);const dw=im.width*sc,dh=im.height*sc;x.fillStyle='#10131a';x.fillRect(0,0,w,h);x.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);return c.toDataURL('image/jpeg',q)};
async function heroWrite(rec){/* write, wait, read back, retry once: same write-verify pattern as the other small keys */
  for(let a=0;a<2;a++){try{await Store.set(F.Keys(id).hero,rec===null?'':rec)}catch(e){if(a)return false;continue}await U.sleep(500);try{const chk=F.parseHero(await Store.get(F.Keys(id).hero));if(rec===null?!chk:(chk&&chk.url===rec.url))return true}catch(e){return true}}return false}
async function heroChange(file){if(!F.heroWritable(CM)){U.toast('Only the commissioner can change the photo.',4500);return}
  try{if(!/^image\//.test(file.type||'')){U.toast('Choose a picture file.',4000);return}const im=await readImage(file);const fit=await F.fitHero(heroEncoder(im));if(!fit){U.toast('That picture is too big even after shrinking. Try another.',5000);return}
    if(!F.heroOk(fit.dataUrl)){U.toast('That picture cannot be used. Try another.',5000);return}
    const rec=F.makeHero(fit.dataUrl);if(await heroWrite(rec)){HERO_CUSTOM=fit.dataUrl;U.heroRemember(id,fit.dataUrl);U.toast('Photo changed.',3500);render()}else U.toast('Could not save the photo. Try again.',5000)}
  catch(e){U.toast(e&&e.message?e.message:'Could not use that picture.',5000)}}
async function heroReset(){if(!F.heroWritable(CM)){U.toast('Only the commissioner can change the photo.',4500);return}
  if(await heroWrite(null)){HERO_CUSTOM=null;U.heroRemember(id,null);U.toast('Back to the default photo.',3500);render()}else U.toast('Could not reset the photo. Try again.',5000)}
/* ---------- chat bar: last message + who is around (read-only; the chat itself lives in the draft room) ---------- */
let CHAT={n:0,last:null},PRES=[];
async function loadChat(){if(DEMO)return;try{const c=F.normChat(F.parseJ(await Store.get(F.Keys(id).chat)));CHAT.n=c.msgs.length;CHAT.last=c.msgs.length?c.msgs[c.msgs.length-1]:null}catch(e){}
  try{const now=Date.now();const rs=await Promise.all(MG.map(async m=>{try{const p=F.parsePresence(await Store.get(F.Keys(id).pres(m.mid)));return p&&now-p.t<=F.PRES.onlineMs?m.name:null}catch(e){return null}}));PRES=rs.filter(Boolean)}catch(e){}}
function paintChat(){const last=document.getElementById('chatlast'),pr=document.getElementById('chatpres'),bd=document.getElementById('chatbadge');if(!last)return;
  if(pr)pr.textContent=PRES.length?'🟢 '+PRES.slice(0,3).join(', ')+(PRES.length>3?' +'+(PRES.length-3):''):'';
  if(CHAT.last){const w=MG.find(m=>m.mid===CHAT.last.who);last.textContent=(w?w.name:'Someone')+': '+CHAT.last.text}
  if(bd){const seen=+(U.lsGet('lchat.'+id)||0);const un=Math.max(0,CHAT.n-seen);bd.hidden=!un;bd.textContent=un>9?'9+':String(un)}}
const ACT={herochange:()=>{const f=document.getElementById('herofile');if(f&&CM)f.click()},heroreset:()=>heroReset(),chatopen:()=>{U.lsSet('x.'+id+'.tab','chat');U.lsSet('lchat.'+id,String(CHAT.n))},tab:el=>{V.tab=el.dataset.v;hashPut();render();window.scrollTo(0,0)},mode:el=>{V.mode=el.dataset.v;hashPut();render()},gmode:el=>{V.gmode=el.dataset.v;V.more=60;render()},more:()=>{V.more+=60;render()}};
document.addEventListener('change',e=>{const el=e.target;if(el.id==='herofile'){const f=el.files&&el.files[0];el.value='';if(f)heroChange(f);return}if(el.id==='gmid'){V.gmid=el.value;V.more=60;render()}else if(el.id==='gkind'){V.gkind=el.value;V.more=60;render()}});
U.bind(ACT);U.registerSW();
function placeholder(m,st){app.innerHTML=`<div class="card" id="lhome"><h2>League site</h2><p class="mut" id="avail">Available after the draft.</p><p class="small mut">${st&&m.status!=='lobby'?`The draft is in progress: ${st.picks.length} of ${st.total} picks made. `:''}Standings, team cards and scores will appear here when the draft is complete.</p>${home()}</div>`+U.buildTag()}
FBNLeague.load(id,{pool:T.POOL}).then(async d=>{D=d;if(!d.meta){app.innerHTML='<div class="card" id="nf"><h2>League not found</h2><p class="mut">Check the link.</p><a class="btn" href="index.html">Home</a></div>';return}
  const st=d.state,m=d.meta;if(m.status==='lobby'||!st||st.status!=='complete'){placeholder(m,m.status==='lobby'?null:st);return}
  MG=d.managers;own=S.ownerMap(st.roster||st.picks);document.body.classList.add('lsite');
  if(/[#&]cm=/.test(location.hash)){const fr=U.takeFragment();const cmF=F.extractSecret(fr.get('cm')||'','cm');if(cmF&&await F.checkPass(m,cmF)){U.lsSet('cm.'+id,cmF);U.rememberLeague(id,m.name,'commissioner')}}
  CM=!DEMO&&await U.isCommish(m);await loadHero(false);
  await Promise.all([getJ(DATA+'scores.json').then(j=>{const e=S.validateScores(j);if(e)throw new Error(e);if(j.sample&&!DEMO){SC=null;return}SC=j}).catch(e=>{errS=e.message||String(e);SC=null}),getJ(DATA+'tournament.json').then(j=>{const e=S.validateTournament(j);if(e)throw new Error(e);if(j.sample&&!DEMO){TN=null;return}TN=j}).catch(e=>{errT=e.message||String(e);TN=null})]);
  compute();hashSet();render();loadChat().then(paintChat);setInterval(()=>{if(!document.hidden)loadChat().then(paintChat)},30000);window.addEventListener('hashchange',()=>{hashSet();render()});app.setAttribute('data-ready','1')}).catch(e=>{app.innerHTML='<div class="card bad">Could not load the league: '+esc(e.message||e)+'</div>'});
})();
