/* DR2 s25-full: Rules view module. v2: the room exposes a read-only meta view as window.DR2_meta() (one DR2 hook line in room.js);
   this file adds the 📋 Rules buttons itself (lobby card top-right; header row while live) and handles their clicks.
   Old note: DR2Rules.html(M) -> markup; DR2Rules.show(M) opens it in the sheet (real and mock, lobby and live).
   Every line is taken from what core.js / room.js do; per-league values are read live from meta (M.settings). Escaped: nothing from meta is inserted raw. */
(function(){const F=window.FBN,U=window.UI;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
/* dates as 'Month Day, Year' */
function when(ms,tz){let t='';try{t=new Intl.DateTimeFormat('en-US',{timeZone:tz||undefined,hour:'numeric',minute:'2-digit'}).format(new Date(ms))}catch(e){}
  const z=F.offsetLabel?F.offsetLabel(ms,tz||'UTC'):'';return day(ms,tz)+(t?' at '+t:'')+' your time'+(z?' ('+z+')':'')}
function day(ms,tz){try{return new Intl.DateTimeFormat('en-US',{timeZone:tz||undefined,month:'long',day:'numeric',year:'numeric'}).format(new Date(ms))}catch(e){return ''}}
function html(M){const st=(M&&M.settings)||F.DEFAULTS;const nM=(st.managers>=1&&st.managers<=24&&Math.floor(+st.managers)===+st.managers)?+st.managers:8,R=+st.rounds||0,clk=+st.clockSecs||0,snake=st.type!=='linear';const tz=U&&U.tz?U.tz():undefined;
  const sec=(n,h,b)=>`<section class="r2sec" id="r2_${n}"><h3><span class="r2n">${n}.</span> ${h}</h3>${b}</section>`;
  const start=st.startMode==='auto'&&st.startAt!=null?`The draft starts by itself on <b id="r2_start">${esc(when(+st.startAt,tz))}</b>, once all ${nM} managers have joined.`
    :`<span id="r2_start">The commissioner presses Start</span>${st.startAt!=null?` (planned for ${esc(day(+st.startAt,tz))})`:''}.`;
  return `<div class="r2page" id="rulespage2"><div class="r2head"><div><b>📋 Rules</b><small>${esc(M&&M.name||'Draft')}</small></div><button type="button" class="btn sm" data-dr2="close">Close</button></div>`
  +sec(1,'Managers',`<p>This league has exactly <b id="r2_mgrs">${nM}</b> managers.</p>`)
  +sec(2,'Start',`<p>${start}</p>`)
  +sec(3,'Draft order',`<p id="r2_type">${snake?'Snake draft: the order reverses every round.':'Linear draft: the same order every round.'}</p>${(st.orderMode||'random')==='random'?`<p id="r2_spin">The order wheel is spun once. It is spun again only if the first spin doesn't complete.</p>`:''}`)
  +sec(4,'Rounds',`<p>Each manager drafts <b id="r2_rounds">${R}</b> teams (${nM*R} picks in total).</p>`)
  +sec(5,'Pick clock',`<p>${clk?`Each pick has <b id="r2_clock">${clk} seconds</b>.`:`<b id="r2_clock">No pick clock</b> in this league.`} When the clock runs out we always pick for you, and that covers only that one pick.</p>`)
  +sec(6,'Making a pick',`<p>On your turn, tap a team to draft it. A confirm pop-up opens; nothing is picked until you confirm.</p><p>To queue a team, use its <b>Q+</b> button only.</p>`)
  +sec(7,'Autopick',`<p>With Autopick ON, we pick right away at your turn: your queue first, then the best power-ranked team left.</p><p id="r2_random">If no ranked teams are left, a random team is picked.</p>${M&&M.mock?'<p id="r2_bots">In a mock draft, bots pick fast (about 1-2 seconds).</p>':''}<p>After an Undo, the slot waits for the clock.</p><p>Auto-pick and auto-start run while at least one phone or computer has the room open.</p>`)
  +sec(8,'Scoring',`<p id="r2_score">Games played before your league's draft count. Scoring starts from the beginning of the season.</p>`)
  +`</div>`}
function show(M){U.openSheet(html(M));const bg=document.querySelector('#sheetwrap .sheetbg');if(bg)bg.classList.add('r2bg')}
const BTN=id=>'<button type="button" class="btn sm rulesbtn" data-dr2="rules" id="'+(id==='rulesbtn_hdr'?'rulesbtn_hdr':'rulesbtn_lobby')+'" aria-label="Rules">📋 Rules</button>';
function meta(){try{return window.DR2_meta?window.DR2_meta():null}catch(e){return null}}
function ensure(){const M=meta();if(!M)return;const lc=document.getElementById('lobbycard');if(lc&&!document.getElementById('rulesbtn_lobby'))lc.insertAdjacentHTML('afterbegin',BTN('rulesbtn_lobby'));
  const tr=document.querySelector('#top .toprow');const h=document.getElementById('rulesbtn_hdr');if(tr&&!h)tr.insertAdjacentHTML('beforeend',BTN('rulesbtn_hdr'))}/* PM: the header Rules button shows before, during and after the draft (room.js renders it; this is the fallback) */
function arm(){new MutationObserver(ensure).observe(document.body,{childList:true,subtree:true});ensure()}
if(typeof document!=='undefined'){document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-dr2]');if(!el)return;e.preventDefault();e.stopPropagation();
    if(el.dataset.dr2==='rules'){const M=meta();if(M)show(M)}else if(el.dataset.dr2==='close')U.closeSheet()},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arm);else arm()}
window.DR2Rules={html,show,day,when};
})();
