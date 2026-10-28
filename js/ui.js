/* Shared UI helpers (DOM). Pure logic lives in core.js, storage in store.js. */
(function(){
const U={};
U.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
U.$=id=>document.getElementById(id);
U.sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LS='fbn.';
U.lsGet=k=>{try{return localStorage.getItem(LS+k)}catch(e){return null}};
U.lsSet=(k,v)=>{try{if(v==null)localStorage.removeItem(LS+k);else localStorage.setItem(LS+k,v)}catch(e){}};
U.lsJSON=(k,d)=>{try{const v=JSON.parse(U.lsGet(k));return v==null?d:v}catch(e){return d}};
U.tz=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch(e){return'UTC'}};
/* all links are built from the current page's folder, so the site works under any repo sub-folder */
U.pageUrl=function(page,params,frag){const u=new URL(page,location.href);u.search='';u.hash='';Object.keys(params||{}).forEach(k=>{if(params[k]!=null&&params[k]!=='')u.searchParams.set(k,params[k])});
  if(frag){const f=new URLSearchParams();Object.keys(frag).forEach(k=>{if(frag[k]!=null&&frag[k]!=='')f.set(k,frag[k])});u.hash=f.toString()}return u.toString()};
/* secrets live in the URL fragment (never sent to a server, not in the Referer); read them once, then strip the fragment from the address bar and history */
U.takeFragment=function(){const f=new URLSearchParams((location.hash||'').replace(/^#/,''));if(location.hash){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}return f};
U.qs=()=>new URLSearchParams(location.search);
/* identity: per device, per league. {mid, k(secret for the private manager link)} */
U.getMe=id=>U.lsJSON('me.'+id,null);
U.setMe=(id,v)=>U.lsSet('me.'+id,v?JSON.stringify(v):null);
U.myLeagues=()=>U.lsJSON('leagues',[]);
U.rememberLeague=function(id,name,role){const a=U.myLeagues().filter(x=>x.id!==id);a.unshift({id,name,role,ts:Date.now()});U.lsSet('leagues',JSON.stringify(a.slice(0,12)))};
/* avatar: photo, else emoji, else initial on a colour */
U.avatar=function(m,px){px=px||32;const a=FBN.avatarSpec(m);const st='width:'+px+'px;height:'+px+'px;font-size:'+Math.round(px*.5)+'px;background:'+a.color;
  if(a.kind==='photo')return '<span class="av" style="'+st+'"><img src="'+U.esc(a.src)+'" alt=""></span>';
  return '<span class="av" style="'+st+'" aria-hidden="true">'+U.esc(a.text)+'</span>'};
let toastT=null;
U.toast=function(msg,ms){let t=U.$('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast hide';t.setAttribute('role','status');document.body.appendChild(t)}
  t.textContent=msg;t.classList.remove('hide');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.add('hide'),ms||3800)};
U.openSheet=function(html){let w=U.$('sheetwrap');if(!w){w=document.createElement('div');w.id='sheetwrap';document.body.appendChild(w)}w.innerHTML='<div class="sheetbg" data-a="sheetbg"><div class="sheet">'+html+'</div></div>'};
U.closeSheet=()=>{const w=U.$('sheetwrap');if(w)w.innerHTML=''};
U.copy=async function(text,msg){try{await navigator.clipboard.writeText(text);U.toast(msg||'Copied')}catch(e){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');U.toast(msg||'Copied')}catch(e2){U.toast('Copy failed — press and hold the text to copy it')}ta.remove()}};
U.canShare=()=>typeof navigator.share==='function';
U.share=async function(data){if(U.canShare()){try{await navigator.share(data);return true}catch(e){if(e&&e.name==='AbortError')return false}}await U.copy((data.text?data.text+'\n':'')+(data.url||''),'Share is not available here — copied instead');return false};
U.qrSvg=function(text){try{const q=qrcode(0,'M');q.addData(text);q.make();return q.createSvgTag({scalable:true,margin:0})}catch(e){return'<span style="color:#000;font-size:12px;line-height:1.2">QR unavailable</span>'}};
U.download=function(name,text,type){const b=new Blob([text],{type:type||'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
/* standard header + footer build tag with "Reload latest" */
U.header=function(opts){opts=opts||{};return '<div class="top"><img class="logo" src="icons/icon-192.png" alt=""><a class="brand" href="'+U.esc(U.pageUrl('index.html'))+'">'+U.esc(FBN_NAME)+(opts.sub?'<small>'+U.esc(opts.sub)+'</small>':'')+'</a>'+(opts.below?'':'<div class="hr">'+(opts.right||'')+'</div>')+'</div>'+(opts.below?'<div class="toprow">'+(opts.right||'')+'</div>':'')};
U.buildTag=()=>'<div id="buildtag"><span>Build <b>'+U.esc(FBN_BUILD)+'</b></span><a href="#" data-a="reloadlatest">Reload latest</a></div>';
U.reloadLatest=async function(){U.toast('Fetching the latest version…',4000);
  try{if('serviceWorker' in navigator){for(const r of await navigator.serviceWorker.getRegistrations())if(r.scope===new URL('./',location.href).toString())await r.unregister()}}catch(e){}
  try{if(window.caches){for(const k of await caches.keys())if(k.startsWith('fbnc-'))await caches.delete(k)}}catch(e){}
  const u=new URL(location.href);u.searchParams.set('_r',Date.now().toString(36));location.replace(u.toString())};
U.registerSW=function(){if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{})};
/* tiny delegated click handler: <button data-a="name"> -> ACT[name](el,event) */
U.bind=function(ACT){document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el)return;const f=ACT[el.dataset.a];if(f)f(el,e)});
  ACT.reloadpage=ACT.reloadpage||(()=>location.reload());ACT.sheetbg=ACT.sheetbg||((el,e)=>{if(e.target===el)U.closeSheet()});ACT.reloadlatest=ACT.reloadlatest||((el,e)=>{e.preventDefault();U.reloadLatest()})};
/* team chips (ESPN logo hot-linked, colour chip when it fails) */
function hex2rgb(h){h=(h||'').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');if(!/^[0-9a-f]{6}$/i.test(h))return null;return[0,2,4].map(i=>parseInt(h.substr(i,2),16))}
function lum(rgb){const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(rgb[0])+.7152*f(rgb[1])+.0722*f(rgb[2])}
U.textOn=hex=>{const r=hex2rgb(hex);if(!r)return'#fff';const L=lum(r);return(1.05)/(L+.05)>(L+.05)/.05?'#fff':'#111'};
U.chip=function(TEAMS,tid,opt){opt=opt||{};const t=TEAMS[tid]||{};const bg='#'+((t.color||'').replace('#','')||'3a4256');const alt='#'+((t.alt||'').replace('#','')||'ffffff');
  const logo=t.logo?'<img src="'+U.esc(t.logo)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="nologo"></span>';
  const label=opt.abbr?(t.abbr||t.short):(t.short||t.name||tid);
  return '<span class="chip'+(opt.big?' big':'')+(opt.sm?' sm':'')+'" title="'+U.esc(t.name||tid)+'" style="background:'+bg+';color:'+U.textOn(bg)+';border-color:'+alt+'">'+logo+U.esc(label)+'</span>'};
U.fmtClock=ms=>{ms=Math.max(0,Math.ceil(ms/1000));return Math.floor(ms/60)+':'+String(ms%60).padStart(2,'0')};
/* team pool from assets/teams.js */
U.loadTeams=function(){const D=window.TEAMS_DATA||{teams:[],meta:{}};const TEAMS={},POOL=[];D.teams.forEach(r=>{TEAMS[r[0]]={espn_id:r[0],name:r[1],short:r[2],abbr:r[3],color:r[4],alt:r[5],logo:r[6],mascot:r[7]};POOL.push(r[0])});
  POOL.sort((a,b)=>TEAMS[a].short.localeCompare(TEAMS[b].short));return{TEAMS,POOL,POOLSET:new Set(POOL),META:D.meta||{}}};
/* logo that fails to load -> plain colour chip (no inline handler, so a strict CSP can be used) */
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.closest&&t.closest('.chip')){const s=document.createElement('span');s.className='nologo';t.replaceWith(s)}},true);
window.UI=U;
})();
/* final rosters, shared by the room and the recap page */
UI.rosters=function(st,mgrs,T){const F=FBN;const rs=F.rosters(st,mgrs);return rs.map(r=>{const stt=F.rosterStats(r.picks,T.META);
  return '<div class="card roster" data-mid="'+UI.esc(r.mgr.mid)+'"><div class="row nw">'+UI.avatar(r.mgr,42)+'<div class="grow"><b>'+UI.esc(r.mgr.name)+'</b><div class="small mut">'+UI.esc(r.mgr.team)+'</div></div><div class="small mut" style="text-align:right">'+r.picks.length+' team'+(r.picks.length===1?'':'s')+(stt.avgRank!=null?'<br>avg rank '+stt.avgRank:'')+'</div></div>'
   +'<div class="rost">'+(r.picks.map(p=>UI.chip(T.TEAMS,p.tid)).join('')||'<span class="small mut">No picks</span>')+'</div></div>'}).join('')};
