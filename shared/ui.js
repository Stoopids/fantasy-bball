/* shared/ui.js v1.5.0: ONE table of input limits and shared wording, loaded by BOTH sites.
   Edit here only, copy to the other repo by hand, and run scripts/check_shared.sh.
   Each site keeps its old values as fallbacks, so the pages still work if this file fails to load. */
(function(g){var LIMITS={team:15,stoopName:12,leagueName:24,chat:200,betText:140,paste:300,payouts:120,stake:20,item:40,odds:9};
var STRINGS={maxLen:'Keep it to {n} characters or fewer.',nameTooLong:'Keep the name to {n} characters or fewer.',teamTooLong:'Keep the team name to {n} characters or fewer.',checkedNow:'checked just now',online:'Who\u2019s online'};
function t(k,n){var s=STRINGS[k];return s==null?'':String(s).replace('{n}',n)}
g.SHARED_UI={version:'1.5.0',LIMITS:LIMITS,STRINGS:STRINGS,t:t};})(typeof window!=='undefined'?window:globalThis);

/* ---- shared modules (step 4). Source of truth: stoopids/stoopids shared/; copy to fantasy-bball and run scripts/check_shared.sh ---- */
/* sortCmp(a,b,kind,dir): kind 's' = text A-Z (case-insensitive), 'r' = rank (null/'–' always last), 'n' = number. Used by the All teams table on both sites. */
(function(g){if(!g.SHARED_UI)return;g.SHARED_UI.sortCmp=function(a,b,kind,d){if(kind==='r'){var an=a==null,bn=b==null;if(an||bn)return an-bn;return d*(a-b)}if(kind==='s')return d*String(a||'').localeCompare(String(b||''),undefined,{sensitivity:'base'});return d*((a||0)-(b||0))}})(typeof window!=='undefined'?window:globalThis);
/* Length guard: when typing or pasting hits an input's maxlength, show a short note (wording from STRINGS.maxLen). Browser only. */
/*<MAXLEN-GUARD>*/(function(){if(typeof document==="undefined"||typeof window==="undefined"||window.__mlg)return;window.__mlg=1;
function note(m){let n=document.getElementById('mlnote');if(!n){n=document.createElement('div');n.id='mlnote';n.setAttribute('role','status');n.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:#111827;color:#fff;border:1px solid #FFD400;padding:8px 14px;border-radius:999px;z-index:99999;font-size:13px;font-weight:700;pointer-events:none;max-width:90vw;text-align:center';document.body.appendChild(n)}n.textContent=(window.SHARED_UI?SHARED_UI.t('maxLen',m):'Keep it to '+m+' characters or fewer.');n.hidden=false;clearTimeout(n._t);n._t=setTimeout(()=>{n.hidden=true},3000)}
const ok=el=>el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA')&&el.maxLength>0&&el.type!=='password';
document.addEventListener('input',e=>{const el=e.target;if(!ok(el))return;const m=el.maxLength,t=el.value.trim();if(t.length>m){el.value=t.slice(0,m);note(m)}},true);
document.addEventListener('paste',e=>{const el=e.target;if(!ok(el))return;let d='';try{d=e.clipboardData.getData('text')||''}catch(_){}const s=el.selectionStart||0,f=el.selectionEnd||0;if((el.value.slice(0,s)+d+el.value.slice(f)).trim().length>el.maxLength)note(el.maxLength)},true);
document.addEventListener('keydown',e=>{const el=e.target;if(!ok(el)||e.key.length!==1||e.ctrlKey||e.metaKey)return;if(el.value.length>=el.maxLength&&el.selectionStart===el.selectionEnd)note(el.maxLength)},true)})();/*</MAXLEN-GUARD>*/

/* Who's online strip: on = [name HTML], off = [[name HTML, ms since last seen or Infinity]], ago(ms) -> 'x min ago'. Returns the strip's inner HTML (same on both sites). */
(function(g){if(!g.SHARED_UI)return;var U=g.SHARED_UI;
U.onlineStrip=function(on,off,ago){return '<span class="onl-h">Who\u2019s online</span>'+on.map(function(n){return '<span class="onl-p on" title="Online now"><i class="pd"></i>'+n+'</span>'}).join('')+off.map(function(x){return '<span class="onl-p"><i class="pd off"></i>'+x[0]+' <small>'+(x[1]===Infinity?'not seen yet':ago(x[1]))+'</small></span>'}).join('')};
/* Online dot on a Standings card: toggles .isonl and the small dot after the name (no layout shift). */
U.markOnline=function(c,yes){c.classList.toggle('isonl',!!yes);var w=c.querySelector('.who');if(!w)return;var b=w.querySelector('.onlb');if(yes&&!b){b=document.createElement('span');b.className='onlb';b.title='Online now';(w.querySelector('b')||w).appendChild(b)}else if(!yes&&b)b.remove()};
/* 'checked just now' after a manual Refresh: ts = click time (0 = never). */
U.checkedText=function(ts,now){if(!ts)return '';var a=(now||Date.now())-ts;return ' \u00b7 checked '+(a<6e4?'just now':Math.round(a/6e4)+' min ago')};
})(typeof window!=='undefined'?window:globalThis);
