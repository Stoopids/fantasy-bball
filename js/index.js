(function(){const F=FBN,U=UI,esc=U.esc;
/* s24 unified resume (draft room + League site): the home-screen app always launches here. On the FIRST page of an app session only (sessionStorage fbn.launched,
   shared with league.html), reopen whichever was used last, within 14 days: the draft room / recap tab (fbn.lastnav) or the League site tab (fbn.lastsite, League-owned writer).
   Never a mock (the league is checked; offline, this device is trusted), never identity in the hash. Every later visit to Home stays on Home, so there is no loop. */
const RL=U.firstPage&&U.isStandalone()?U.lastPlace():null;
if(RL){document.getElementById('app').innerHTML='<div class="card mut" id="relaunching" role="status">Opening your league…</div>';
  /* s24c: U.lastPlace() already refused mock ids LOCALLY (MK prefix, the kind field, this device's mock lists), so a 503 or offline never opens a mock.
     The store only confirms: a league it says is a mock or deleted is forgotten. If the store fails, the local decision stands. */
  (async()=>{let ok=!U.isMockId(RL.id);let gone=false;if(ok){try{const d=F.parseJ(await Store.get(F.Keys(RL.id).meta,3500));if(d===null||!F.exists(d)||d.mock){ok=false;gone=true}}catch(e){}}
    if(ok){location.replace(RL.url);return}if(RL.kind==='league')U.lsSet('lastsite',null);else U.lsSet('lastnav',null);
    const R2=U.lastPlace();if(R2&&R2.id!==RL.id&&!U.isMockId(R2.id)){location.replace(R2.url);return}home()})();return}
home();
function home(){
const ls=U.myLeagues();
const mineOk=ls.filter(l=>l&&typeof l.id==='string'&&F.parseCode(l.id));const lead=mineOk[0];
const site=lead?`<a class="btn pri block" id="sitebtn" href="${esc(U.pageUrl('league.html',{l:F.parseCode(lead.id)}))}">League site · ${esc(lead.name||'League')}</a>`:'';
const rows=ls.map(l=>`<a class="mrow" href="${esc(U.pageUrl('room.html',{l:l.id}))}" data-id="${esc(l.id)}"><div class="grow" style="min-width:0"><div class="nm">${esc(l.name||'League')}</div><div class="tm2">${esc(F.formatCode(l.id))} · ${esc(l.role||'manager')}</div></div><span class="btn sm">Open</span></a>`).join('');
document.getElementById('top').innerHTML=U.header({});
document.getElementById('app').innerHTML=`<div class="landing" id="landing"><div class="ball">🏀</div><h1>${esc(FBN_NAME)}</h1><p class="mut">Run a friends fantasy draft of NCAA basketball teams. Set up a league in a minute, invite your managers with a link, and draft live from your phones. One draft covers the full season and the tournament.</p>
${site}<a class="btn pri block" id="create" href="setup.html">Create a league</a><a class="btn block" id="trymock" href="mock.html">Try a mock draft</a><div class="small mut" id="trymocknote" style="margin:-4px 0 10px;text-align:center">Practice against 7 bots. No league needed.</div>
<form id="codeform" class="card" autocomplete="off"><label class="f" for="code">Have a league code?</label><div class="row nw"><input id="code" type="text" placeholder="e.g. 7K3M-9QXA-…" autocapitalize="characters" spellcheck="false"><button class="btn" type="submit">Join</button></div><div class="err" id="codeerr" role="alert"></div></form>
${ls.length?`<div class="card" id="mine"><h3>Your leagues on this device</h3>${rows}</div>`:''}
<a class="btn block" id="helplink" href="help.html">How to run a league (help)</a>
<div class="card small mut"><b>How it works.</b> No accounts. Your league lives behind a long private link; anyone who has the link can read it. The commissioner and manager links hold secrets that stop other players from acting as you, but this is a friendly lock for a friends league, not real security.</div>
</div>`+U.buildTag();
document.getElementById('codeform').addEventListener('submit',e=>{e.preventDefault();const id=F.parseCode(document.getElementById('code').value);if(!id){document.getElementById('codeerr').textContent='That does not look like a league code. Paste the invite link or the full code.';return}location.href=U.pageUrl('join.html',{l:id})});
U.bind({});U.registerSW();
}
})();
