/* Power rankings for the Draft recap page (and anything else that has the league's managers and rosters).
   One call:  FBNPower.mount(containerEl, {id, done, managers, state, teams})
     id        league code (only used to build nothing: kept for symmetry)
     done      true once the draft is complete (nothing is rendered before that)
     managers  [{mid,name,team,emoji,photo,...}]  the league's 8 managers (recap.js: d.managers)
     state     the derived draft state (recap.js: d.state; rosters come from state.roster, else state.real, else state.picks: [{owner,tid}])
     teams     assets/teams.js team table {tid:{short,name,...}} (recap.js: T.TEAMS)
   It appends one <section id="powerrank"> to containerEl, loads data/power-rankings.json itself and shows:
     - the 8 ranked cards (grade A+ to D, 4-sentence recap, one-tap 10-sentence Deep dive with the school list) only when EVERY manager matches a row
       by manager or team name AND by exactly the same set of schools; anything less (another draft, one school different, a redraft changed a roster)
       shows the plain empty state "Power rankings appear after the draft is analysed". Nothing is ever made up.
     - no inline scripts or handlers (own delegated listeners), every value escaped, CSS in css/power.css (scoped to #powerrank), fills its container. */
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const disp=n=>{n=String(n==null?'':n);const t=n.replace(/^Test\s+(?=\S)/,'');return(!t.trim()||/^test$/i.test(t.trim()))?n:t};
const GCLS={'A+':'g-Ap','A':'g-A','A-':'g-A','B+':'g-B','B':'g-B','B-':'g-B','C+':'g-C','C':'g-C','C-':'g-C','D+':'g-D','D':'g-D','D-':'g-D','F':'g-D'};
const norm=s=>disp(String(s||'')).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sk=v=>String(v==null?'':v).toLowerCase().replace(/&/g,'and').replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]+/g,'');
function sentences(t){const out=[];let cur='';String(t||'').split(/(?<=[.!?])\s+/).forEach(p=>{cur=cur?cur+' '+p:p;if(!/\b(St|Mt|Ft|vs|No|Dr)\.$/.test(cur)){out.push(cur);cur=''}});if(cur)out.push(cur);return out}
function paras(t,per){const s=sentences(t),o=[];for(let i=0;i<s.length;i+=per)o.push(s.slice(i,i+per).join(' '));return o}
/* rosters by manager from the final state */
function rosterOf(state,mid){const list=(state&&(state.roster||state.real||state.picks))||[];return list.filter(p=>p&&(p.owner===mid||p.managerId===mid||p.mid===mid)).map(p=>String(p.tid))}
function sameSchools(tids,teams,row){if(!Array.isArray(row.schools))return false;const want=row.schools.map(sk);if(!tids.length||tids.length!==want.length)return false;
  for(const t of tids){const x=teams[t]||{};let i=want.indexOf(sk(x.short));if(i<0)i=want.indexOf(sk(x.name));if(i<0)return false;want.splice(i,1)}return true}
function match(rows,o){const MG=o.managers||[];if(!Array.isArray(rows)||!rows.length||MG.length!==8)return null;const used=new Set(),out=[];
  for(const m of MG){const nm=norm(m.name),tm=norm(m.team),tids=rosterOf(o.state,m.mid);const i=rows.findIndex((r,k)=>!used.has(k)&&r&&(norm(r.manager)===nm||norm(r.team)===tm)&&sameSchools(tids,o.teams||{},r));if(i<0)return null;used.add(i);out.push(Object.assign({},rows[i],{_m:m}))}
  return out.sort((a,b)=>a.rank-b.rank)}
function avatar(m,px,dd){dd=dd||disp;try{if(window.UI&&UI.avatar)return UI.avatar(Object.assign({},m,{name:dd(m.name),team:dd(m.team)}),px)}catch(e){}return ''}
/* school name -> ESPN team page (outbound link, no images). Uses Draft Room's FBN.espnUrl(id) when present; a school without a numeric id in the team table is plain text. */
const espnUrl=id=>(window.FBN&&FBN.espnUrl)?FBN.espnUrl(id==null?null:String(id)):(/^\d{1,8}$/.test(String(id==null?'':id))?'https://www.espn.com/mens-college-basketball/team/_/id/'+id:null);
function hexOk(c){c=String(c==null?'':c).replace(/^#/,'');return/^[0-9a-f]{6}$/i.test(c)?'#'+c:null}
function textOn(bg){const n=parseInt(bg.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;return(r*299+g*587+b*114)/1000>150?'#111':'#fff'}
function schoolLink(teams,name,cls){const k=sk(name);let t=null;for(const id in teams){const x=teams[id]||{};if(sk(x.short)===k||sk(x.name)===k){t=x;break}}
  const u=t&&espnUrl(t.espn_id!=null?t.espn_id:t.id);const chip=/pchip/.test(cls);const bg=chip&&t&&hexOk(t.color),alt=chip&&t&&hexOk(t.alt);
  const sty=bg?` style="background:${bg};color:${textOn(bg)};border-color:${alt||bg}"`:'';const full=esc((t&&t.name)||name);const inner=chip?`<span class="cn">${esc(name)}</span>`:esc(name);
  return u?`<a class="${cls}${chip?' school-chip':''}" href="${esc(u)}" target="_blank" rel="noopener noreferrer" title="Open ${full} on ESPN"${sty}>${inner}</a>`:`<span class="${cls}${chip?' school-chip':''} nolink" title="${full}"${sty}>${inner}</span>`}
function view(rows,st,teams){
  if(rows==='loading'){const b='<span class="bl-b"><i>🏀</i><s></s></span>';return '<div id="prwait"><div class="bl" role="status" aria-live="polite"><div class="bl-row" aria-hidden="true">'+b+b+b+'</div><div class="bl-t">Loading the power rankings…</div></div></div>'}  /* s24: shared ball loader (same markup as LLOADER in leaguehome.js; CSS copy in css/power.css) */
  if(!rows||!rows.length)return '<div class="card" id="prempty"><b>Power rankings appear after the draft is analysed</b><div class="note">They are written from each manager\'s real roster, so nothing is shown until all 8 managers have a full roster to analyse. Nothing is made up.</div></div>';
  const test=rows.some(r=>!r.generated&&/^Test\s/.test(r._m.name)),gen=rows.some(r=>r.generated);
  let h=`<p class="note" style="margin:6px 2px">Pre-season ranking of the eight rosters by the strength of their schools. Tap a manager for the short recap, then <b>Deep dive</b> for the full version.${gen?' <span class="pill" id="prnote">Analysis built from this league’s rosters</span>':test?' <span class="pill warn" id="prnote">Test league · example analysis</span>':''}</p><ol class="prl">`;
  rows.forEach((r,i)=>{const open=!!st.open[i],deep=!!st.deep[i];const m=r._m;const gc=GCLS[r.grade]||'g-C';const dd=r.generated?(x=>String(x==null?'':x)):disp;  /* generated rows (any real league) show names exactly as written; only the shipped example text (the Test league) is shown without its "Test " prefix */
    h+=`<li><article class="card pr${open?' open':''}"><h3><button type="button" class="plb" id="prb${i}" data-pa="open" data-i="${i}" aria-expanded="${open}" aria-controls="prp${i}" aria-label="${esc('#'+r.rank+' '+dd(m.team)+', '+dd(m.name)+', grade '+r.grade+', average power rank '+r.avgPowerRank+'. '+(open?'Hide':'Show')+' recap')}">
      <span class="prk">${esc(r.rank)}</span><span class="pav">${avatar(m,40,dd)}</span><span class="pwho"><b>${esc(dd(m.team))}</b><small>${esc(dd(m.name))}</small></span><span class="pgr ${gc}">${esc(r.grade)}</span><span class="pchev" aria-hidden="true"></span>
      <span class="pmeta">Avg power rank <b>${esc(r.avgPowerRank)}</b> <span>· ${esc(r.rankedSchools)} of ${esc((r.schools||[]).length)} ranked</span></span></button></h3>
      <div class="pchips school-grid" role="list" aria-label="Schools">${(r.schools||[]).map((s,j)=>`<span role="listitem" class="pcw">${schoolLink(teams,s,'pchip k'+(j%8))}</span>`).join('')}</div>
      <div class="ppan" id="prp${i}"${open?'':' hidden'}><div class="ptag">Recap</div><p class="plead">${esc(r.short)}</p>
        <button type="button" class="btn deepbtn" id="prd${i}" data-pa="deep" data-i="${i}" aria-expanded="${deep}" aria-controls="prdp${i}"><span>${deep?'Hide deep dive':'Deep dive'}</span><span class="pchev" aria-hidden="true"></span></button>
        <div class="pdeep" id="prdp${i}"${deep?'':' hidden'}><div class="ptag">Deep dive</div>${paras(r.recap,4).map(p=>`<p>${esc(p)}</p>`).join('')}
        ${r.schoolData&&r.schoolData.length?`<div class="psec">The ${r.schoolData.length} schools</div><ul class="sch">${r.schoolData.map(d=>`<li><div><b>${schoolLink(teams,d.school,'tl')}</b><span> · ${esc(d.conference||'')}${d.lastRecord?' · '+esc(d.lastRecord):''}</span></div><span class="r">Pick ${esc(d.pick)} · Power ${d.powerRank==null?'n/a':'#'+esc(d.powerRank)} · Seed ${d.projectedSeed==null?'n/a':esc(d.projectedSeed)}</span></li>`).join('')}</ul>`:''}</div></div></article></li>`});
  return h+'</ol>'}
/* the generator lives in js/power-gen.js, loaded on demand (same folder, CSP 'self') so recap.html only needs the one script tag for this module */
let genP=null;function loadGen(){if(window.FBNPowerGen)return Promise.resolve();if(genP)return genP;
  genP=new Promise(res=>{const sc=document.createElement('script');sc.src='js/power-gen.js?b='+encodeURIComponent(window.FBN_BUILD||'');sc.onload=()=>res();sc.onerror=()=>res();document.head.appendChild(sc)});return genP}
function analyse(o){return loadGen().then(()=>{if(!window.FBNPowerGen)return null;let rows=null;try{rows=FBNPowerGen.generate({managers:o.managers,state:o.state,teams:o.teams,meta:o.meta})}catch(e){rows=null}
  if(!rows)return null;const by={};(o.managers||[]).forEach(m=>{by[m.mid]=m});return rows.map(r=>Object.assign({},r,{_m:by[r._mid]||{name:r.manager,team:r.team,mid:r._mid}}))})}
/* resolve(o[,rows]) -> Promise of the 8 ranked rows for this league: the shipped file text when ALL 8 managers (by name) and their exact school sets match, otherwise rows generated from the
   league's own rosters (js/power-gen.js); null only when there is nothing to analyse. rows (optional) = the already-fetched data/power-rankings.json array. Every row has _m (the manager). */
function resolve(o,rows){if(!o||!o.done)return Promise.resolve(null);const m=match(rows,o);if(m)return Promise.resolve(m);return analyse(o)}
function mount(host,o){
  if(!host||!o||!o.done)return null;
  const old=host.querySelector('#powerrank');if(old)old.remove();
  const sec=document.createElement('section');sec.id='powerrank';sec.setAttribute('aria-label','Power rankings');host.appendChild(sec);
  const st={rows:'loading',open:{},deep:{}};
  const paint=(focusId)=>{sec.innerHTML='<h2 class="ph">⚡ Power rankings</h2>'+view(st.rows,st,o.teams||{});if(focusId){const b=sec.querySelector('#'+focusId);if(b)b.focus()}};
  sec.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-pa]');if(!b||!sec.contains(b))return;const i=+b.dataset.i;
    if(b.dataset.pa==='open'){st.open[i]=!st.open[i];if(!st.open[i])st.deep[i]=false;paint('prb'+i)}else{st.deep[i]=!st.deep[i];paint('prd'+i)}});
  paint();
  let u='data/power-rankings.json?b='+encodeURIComponent(window.FBN_BUILD||'');
  fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()}).catch(()=>null).then(rows=>{const m=match(rows,o);if(m){st.rows=m;paint();return}
    return analyse(o).then(g=>{st.rows=g;paint()})}).catch(()=>{st.rows=null;paint()});
  return sec}
window.FBNPower={mount,match,resolve,sentences,analyse,_norm:norm};
})();
