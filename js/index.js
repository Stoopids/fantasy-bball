(function(){const F=FBN,U=UI,esc=U.esc;
const ls=U.myLeagues();
const mineOk=ls.filter(l=>l&&typeof l.id==='string'&&F.parseCode(l.id));const lead=mineOk[0];
const site=lead?`<a class="btn pri block" id="sitebtn" href="${esc(U.pageUrl('league.html',{l:F.parseCode(lead.id)}))}">League site · ${esc(lead.name||'League')}</a>`:'';
const rows=ls.map(l=>`<a class="mrow" href="${esc(U.pageUrl('room.html',{l:l.id}))}" data-id="${esc(l.id)}"><div class="grow" style="min-width:0"><div class="nm">${esc(l.name||'League')}</div><div class="tm2">${esc(F.formatCode(l.id))} · ${esc(l.role||'manager')}</div></div><span class="btn sm">Open</span></a>`).join('');
document.getElementById('top').innerHTML=U.header({});
document.getElementById('app').innerHTML=`<div class="hero" id="landing"><div class="ball">🏀</div><h1>${esc(FBN_NAME)}</h1><p class="mut">Run a friends fantasy draft of NCAA basketball teams. Set up a league in a minute, invite your managers with a link, and draft live from your phones. One draft covers the full season and the tournament.</p>
${site}<a class="btn pri block" id="create" href="setup.html">Create a league</a>
<form id="codeform" class="card" autocomplete="off"><label class="f" for="code">Have a league code?</label><div class="row nw"><input id="code" type="text" placeholder="e.g. 7K3M-9QXA-…" autocapitalize="characters" spellcheck="false"><button class="btn" type="submit">Join</button></div><div class="err" id="codeerr" role="alert"></div></form>
${ls.length?`<div class="card" id="mine"><h3>Your leagues on this device</h3>${rows}</div>`:''}
<a class="btn block" id="helplink" href="help.html">How to run a league (help)</a>
<div class="card small mut"><b>How it works.</b> No accounts. Your league lives behind a long private link; anyone who has the link can read it. The commissioner and manager links hold secrets that stop other players from acting as you, but this is a friendly lock for a friends league, not real security.</div>
</div>`+U.buildTag();
document.getElementById('codeform').addEventListener('submit',e=>{e.preventDefault();const id=F.parseCode(document.getElementById('code').value);if(!id){document.getElementById('codeerr').textContent='That does not look like a league code. Paste the invite link or the full code.';return}location.href=U.pageUrl('join.html',{l:id})});
U.bind({});U.registerSW();
})();
